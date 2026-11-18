"""
PDF validation.

All validation is performed on raw bytes.
- Never trusts the filename or caller-supplied MIME type.
- Avoids loading unnecessarily large files into memory.
- Does not execute embedded PDF scripts or external content.
- Does not expose internal error details, system paths, or traces to callers.
"""

from __future__ import annotations

import pymupdf

from cvmatch_core.config import DEFAULT_CONFIG, ExtractionConfig
from cvmatch_core.exceptions import (
    CVMatchCoreError,
    EmptyDocumentError,
    EncryptedPDFError,
    FileTooLargeError,
    InvalidPDFError,
    NoExtractableTextError,
    PDFProcessingError,
    TooManyPagesError,
    UnsupportedFileFormatError,
)

_PDF_SIGNATURE = b"%PDF-"


def validate_pdf_bytes(
    data: bytes,
    *,
    config: ExtractionConfig = DEFAULT_CONFIG,
    check_extractable_text: bool = True,
) -> None:
    """
    Validate raw PDF bytes against the project's acceptance rules.

    Raises a subclass of CVMatchCoreError on the first violation found.
    Returns None on success.

    Args:
        data: Raw file bytes to validate.
        config: ExtractionConfig instance specifying limits and thresholds.
        check_extractable_text: When True (default), reject PDFs with no
            extractable text. Set False when callers perform extraction
            themselves and handle empty text as a structured status.

    Raises:
        EmptyDocumentError: data is empty or PDF has 0 pages.
        FileTooLargeError: data exceeds config.max_file_size_bytes.
        UnsupportedFileFormatError: data does not begin with the %PDF- signature.
        InvalidPDFError: PyMuPDF cannot open or parse the document.
        EncryptedPDFError: PDF is password-protected or encrypted.
        TooManyPagesError: Page count exceeds config.max_pages.
        NoExtractableTextError: check_extractable_text=True and no readable text found.
        PDFProcessingError: Unexpected failure during validation.
    """
    if not data:
        raise EmptyDocumentError("The uploaded file is empty.")

    if len(data) > config.max_file_size_bytes:
        limit_mb = config.max_file_size_bytes // (1024 * 1024)
        raise FileTooLargeError(
            f"File exceeds the {limit_mb} MB limit. Please upload a smaller PDF."
        )

    if not data.startswith(_PDF_SIGNATURE):
        raise UnsupportedFileFormatError(
            "Only PDF files are supported. Please upload a valid PDF document."
        )

    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise InvalidPDFError(
            "The file could not be opened as a PDF. It may be corrupted.",
            detail=str(exc),
        ) from exc

    try:
        if doc.is_encrypted:
            raise EncryptedPDFError(
                "This PDF is password-protected and cannot be processed. "
                "Please upload an unlocked PDF."
            )

        page_count = doc.page_count
        if page_count == 0:
            raise EmptyDocumentError("The PDF contains no pages.")

        if page_count > config.max_pages:
            raise TooManyPagesError(
                f"The PDF has {page_count} pages, which exceeds the "
                f"{config.max_pages}-page limit. Please upload a shorter PDF."
            )

        if check_extractable_text:
            total_chars = sum(len(page.get_text("text").strip()) for page in doc)
            if total_chars < config.min_total_text_chars:
                raise NoExtractableTextError(
                    "No readable text was found in this PDF. "
                    "It may be a scanned image. "
                    "Please upload a text-based PDF."
                )
    except CVMatchCoreError:
        raise
    except Exception as exc:
        raise PDFProcessingError(
            "An unexpected error occurred while validating the PDF.",
            detail=str(exc),
        ) from exc
    finally:
        doc.close()
