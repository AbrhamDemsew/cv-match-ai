"""
PDF text extraction using PyMuPDF.

Extract text page by page, normalize whitespace and line endings,
and return a structured ExtractionResult.

No OCR is performed. Scanned or image-only PDFs without extractable text
return status=NO_TEXT with a clear, safe user-facing message.
No external AI or network services are called.
"""

from __future__ import annotations

import pymupdf

from cvmatch_core.config import DEFAULT_CONFIG, ExtractionConfig
from cvmatch_core.exceptions import CVMatchCoreError
from cvmatch_core.models.extraction import (
    ExtractionResult,
    ExtractionStatus,
    PageResult,
)
from cvmatch_core.pdf.normalizer import normalize_text
from cvmatch_core.pdf.validator import validate_pdf_bytes


def extract_pdf(
    data: bytes,
    *,
    original_filename: str | None = None,
    config: ExtractionConfig = DEFAULT_CONFIG,
) -> ExtractionResult:
    """
    Validate and extract text from PDF bytes.

    Performs full validation first, then extracts text page by page.
    Returns an ExtractionResult regardless of outcome so callers can inspect
    `result.status` and `result.error_message` predictably without needing
    broad exception handlers.

    Args:
        data: Raw PDF file bytes.
        original_filename: Optional display-only filename stored in metadata.
            Never treated as a filesystem path or ID.
        config: ExtractionConfig instance specifying limits and thresholds.

    Returns:
        ExtractionResult with status SUCCESS, NO_TEXT, or FAILED.
    """
    # 1. Validate file format, size, structure, encryption, and page count
    try:
        validate_pdf_bytes(data, config=config, check_extractable_text=False)
    except CVMatchCoreError as exc:
        return ExtractionResult(
            status=ExtractionStatus.FAILED,
            original_filename=original_filename,
            error_message=exc.message,
        )
    except Exception:
        return ExtractionResult(
            status=ExtractionStatus.FAILED,
            original_filename=original_filename,
            error_message="An unexpected error occurred while reading the PDF.",
        )

    # 2. Extract text page by page
    pages: list[PageResult] = []
    warnings: list[str] = []

    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception:
        return ExtractionResult(
            status=ExtractionStatus.FAILED,
            original_filename=original_filename,
            error_message="The PDF could not be opened. It may be corrupted.",
        )

    try:
        page_count = doc.page_count
        for i, page in enumerate(doc, start=1):
            try:
                raw_text = page.get_text("text")
                normalized = normalize_text(raw_text)
                char_count = len(normalized)
                has_text = char_count >= config.min_text_chars_per_page
                pages.append(
                    PageResult(
                        page_number=i,
                        text=normalized,
                        char_count=char_count,
                        has_text=has_text,
                    )
                )
            except Exception:
                warnings.append(f"Page {i}: text extraction failed and was skipped.")
                pages.append(
                    PageResult(
                        page_number=i,
                        text="",
                        char_count=0,
                        has_text=False,
                    )
                )
    except Exception:
        return ExtractionResult(
            status=ExtractionStatus.FAILED,
            original_filename=original_filename,
            error_message="The PDF could not be processed. It may be corrupted.",
        )
    finally:
        doc.close()

    # 3. Concatenate and normalize full document text
    page_texts = [p.text for p in pages if p.text]
    full_text = "\n\n".join(page_texts)
    full_text = normalize_text(full_text)
    total_chars = sum(p.char_count for p in pages)

    # 4. Check whether document contains enough extractable text
    if total_chars < config.min_total_text_chars:
        return ExtractionResult(
            status=ExtractionStatus.NO_TEXT,
            original_filename=original_filename,
            page_count=page_count,
            pages=pages,
            full_text="",
            char_count=0,
            warnings=warnings,
            error_message=(
                "No readable text was found in this PDF. "
                "It may be a scanned image. "
                "Please upload a text-based PDF."
            ),
        )

    return ExtractionResult(
        status=ExtractionStatus.SUCCESS,
        original_filename=original_filename,
        page_count=page_count,
        pages=pages,
        full_text=full_text,
        char_count=total_chars,
        warnings=warnings,
    )
