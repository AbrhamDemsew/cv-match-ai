"""PDF processing sub-package: validation, extraction, and normalization."""

from cvmatch_core.pdf.extractor import extract_pdf
from cvmatch_core.pdf.normalizer import normalize_text
from cvmatch_core.pdf.validator import validate_pdf_bytes

__all__ = ["extract_pdf", "normalize_text", "validate_pdf_bytes"]
