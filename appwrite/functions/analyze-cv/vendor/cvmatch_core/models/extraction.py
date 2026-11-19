"""
Pydantic v2 models for PDF extraction results.

These models represent the structured output of the PDF extraction pipeline.
CV profile schemas, job schemas, and analysis schemas belong to later phases.
"""

from __future__ import annotations

import enum
from typing import Annotated

from pydantic import BaseModel, Field


class ExtractionStatus(enum.StrEnum):
    SUCCESS = "success"
    NO_TEXT = "no_text"  # image-only / scanned PDF without extractable text
    FAILED = "failed"  # processing error or unrecoverable validation failure


class PageResult(BaseModel):
    """Extracted content and metadata for a single PDF page."""

    page_number: Annotated[int, Field(ge=1, description="1-based page number")]
    text: str = Field(default="", description="Normalized extracted text for this page")
    char_count: Annotated[
        int, Field(ge=0, description="Character count of page text")
    ] = 0
    has_text: bool = Field(
        default=False, description="Whether page contains readable text"
    )


class ExtractionResult(BaseModel):
    """
    Structured result of a PDF extraction attempt.

    This is the primary output model of cvmatch_core.pdf.extractor.
    It is consumed by the Phase 5 Appwrite Function to validate the
    extraction before passing text to Gemini.
    """

    status: ExtractionStatus
    original_filename: str | None = Field(
        default=None,
        max_length=255,
        description=(
            "Caller-supplied original filename; metadata only, not a filesystem path"
        ),
    )
    page_count: Annotated[
        int, Field(ge=0, description="Total number of pages processed")
    ] = 0
    pages: list[PageResult] = Field(
        default_factory=list,
        description="Per-page extraction results",
    )
    full_text: str = Field(
        default="",
        description="Concatenated normalized text from all pages",
    )
    char_count: Annotated[
        int, Field(ge=0, description="Total character count across all pages")
    ] = 0
    warnings: list[str] = Field(
        default_factory=list,
        description="Non-fatal issues or notices detected during extraction",
    )
    error_message: str | None = Field(
        default=None,
        description="Safe user-facing message when status is not SUCCESS",
    )

    def has_usable_text(self) -> bool:
        """Return True if the document has enough text for analysis."""
        return self.status == ExtractionStatus.SUCCESS and self.char_count > 0
