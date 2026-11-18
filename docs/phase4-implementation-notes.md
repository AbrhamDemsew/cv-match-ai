# Phase 4 Implementation Notes

## Summary
Phase 4 implements the shared Python core package (`cvmatch_core`) in `packages/python_core/`. It handles PDF validation, text extraction, text normalization, and Pydantic model serialization.

## Key Design Decisions

1. **Repository Layout and Vendoring Alignment:**
   - Per `instruction.md §4`, the package is placed at `packages/python_core/` with a flat layout (`packages/python_core/cvmatch_core/`).
   - This simplifies direct vendoring into the `appwrite/functions/analyze-cv` directory during Phase 5 deployment packaging without deep relative path rewrites.

2. **PyMuPDF Version Pinning (`>=1.24.0,<2.0.0`):**
   - PyMuPDF released a 2.x generation that bundles layout AI, ONNX Runtime, and NumPy.
   - For text extraction and CV analysis, PyMuPDF 1.24.x/1.28.x is significantly lighter (~25 MB vs ~70 MB+ wheel, zero heavy ML runtime dependencies), keeping container deployments fast and reliable for Appwrite Functions.

3. **Predictable Extraction API (`extract_pdf`):**
   - Instead of throwing raw exceptions on corrupted documents or image-only PDFs, `extract_pdf` catches internal processing failures and returns an `ExtractionResult` with explicit `ExtractionStatus` (`SUCCESS`, `NO_TEXT`, or `FAILED`).
   - Safe, user-facing error messages are populated without exposing underlying filesystem paths or stack traces.

4. **Independent Validation Utility (`validate_pdf_bytes`):**
   - A standalone validation fast-path that raises specific `CVMatchCoreError` subclasses when early rejection is desired before allocating extraction buffers.

5. **Text Normalization Rules (`normalize_text`):**
   - Unifies line endings (`\r\n` and `\r` to `\n`).
   - Collapses consecutive horizontal spaces and tabs to single spaces.
   - Normalizes excess blank lines (collapsing 3+ consecutive newlines to 2).
   - Carefully preserves bullet points (`•`, `-`), technical version strings (e.g., `Python 3.12`), URLs, email addresses, and date ranges.

6. **Privacy and Synthetic Test Data:**
   - No personal CV data or real contact information is used anywhere in the codebase or test suite.
   - All tests use programmatically generated in-memory PDF fixtures (`pymupdf.open()` + `insert_text()`).
