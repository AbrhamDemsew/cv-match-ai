"""Exception hierarchy for cvmatch_core."""


class CVMatchCoreError(Exception):
    """Base exception for all cvmatch_core errors."""

    def __init__(self, message: str, detail: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.detail = detail  # Internal diagnostics — never exposed to end users


class InvalidPDFError(CVMatchCoreError):
    """File is not a valid PDF document or is corrupted."""


class UnsupportedFileFormatError(CVMatchCoreError):
    """File format is not supported (e.g. not a PDF)."""


class FileTooLargeError(CVMatchCoreError):
    """File exceeds the maximum allowed size."""


class TooManyPagesError(CVMatchCoreError):
    """PDF exceeds the maximum allowed page count."""


class EncryptedPDFError(CVMatchCoreError):
    """PDF is password-protected or encrypted."""


class EmptyDocumentError(CVMatchCoreError):
    """PDF file is empty or contains no pages."""


class NoExtractableTextError(CVMatchCoreError):
    """PDF contains no extractable text (e.g. scanned/image-only PDF)."""


class PDFProcessingError(CVMatchCoreError):
    """Unexpected failure during PDF processing."""
