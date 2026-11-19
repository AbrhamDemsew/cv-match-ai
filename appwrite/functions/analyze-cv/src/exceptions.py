"""
Safe exceptions for the analyze-cv Appwrite Function.

Maps internal pipeline failures to safe, non-sensitive error categories
and HTTP status codes defined in instruction.md §10.
"""

from __future__ import annotations


class AnalysisFunctionError(Exception):
    """Base class for all safe analyze-cv function errors."""

    error_code: str = "INTERNAL_ERROR"
    status_code: int = 500
    safe_message: str = "An unexpected error occurred during CV analysis."

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.safe_message)
        self.message = message or self.safe_message


class AccessDeniedError(AnalysisFunctionError):
    """Raised when authentication is missing, invalid, or permissions fail."""

    error_code = "ACCESS_DENIED"
    status_code = 401
    safe_message = "Authentication required or access denied."


class ResumeNotFoundError(AnalysisFunctionError):
    """Raised when the specified resume record cannot be found or is not owned by the caller."""

    error_code = "RESUME_NOT_FOUND"
    status_code = 404
    safe_message = "The requested CV was not found."


class JobNotFoundError(AnalysisFunctionError):
    """Raised when the specified job record cannot be found or is not owned by the caller."""

    error_code = "JOB_NOT_FOUND"
    status_code = 404
    safe_message = "The requested job was not found."


class InvalidFileError(AnalysisFunctionError):
    """Raised when the uploaded document fails PDF validation."""

    error_code = "INVALID_FILE"
    status_code = 422
    safe_message = "The uploaded file is not a valid, supported PDF document."


class PdfTextNotFoundError(AnalysisFunctionError):
    """Raised when the PDF is image-only, scanned, or contains no extractable text."""

    error_code = "PDF_TEXT_NOT_FOUND"
    status_code = 422
    safe_message = (
        "The uploaded PDF contains no extractable text. Scanned or image-only PDFs "
        "are not supported. Please upload a text-based PDF."
    )


class AIRateLimitError(AnalysisFunctionError):
    """Raised when the AI provider rate limit or quota is exhausted."""

    error_code = "AI_RATE_LIMIT"
    status_code = 429
    safe_message = (
        "AI analysis service is temporarily busy. Please try again in a few moments."
    )


class AIProviderError(AnalysisFunctionError):
    """Raised when the AI provider returns a server error or network failure."""

    error_code = "AI_PROVIDER_ERROR"
    status_code = 502
    safe_message = "AI service temporarily unavailable. Please try again later."


class AnalysisValidationError(AnalysisFunctionError):
    """Raised when AI structured output fails validation against required schemas."""

    error_code = "ANALYSIS_VALIDATION_ERROR"
    status_code = 502
    safe_message = "Analysis result could not be processed. Please retry the analysis."


class InternalError(AnalysisFunctionError):
    """Raised for unexpected server errors."""

    error_code = "INTERNAL_ERROR"
    status_code = 500
    safe_message = "An internal processing error occurred."
