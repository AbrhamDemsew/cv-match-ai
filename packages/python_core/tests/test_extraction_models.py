"""Tests for cvmatch_core.models.extraction Pydantic models."""

import pytest
from pydantic import ValidationError

from cvmatch_core.models.extraction import (
    ExtractionResult,
    ExtractionStatus,
    PageResult,
)


class TestPageResult:
    def test_valid_page_result(self):
        page = PageResult(
            page_number=1, text="Sample text", char_count=11, has_text=True
        )
        assert page.page_number == 1
        assert page.text == "Sample text"
        assert page.char_count == 11
        assert page.has_text is True

    def test_page_number_must_be_positive(self):
        with pytest.raises(ValidationError):
            PageResult(page_number=0, text="")

    def test_char_count_cannot_be_negative(self):
        with pytest.raises(ValidationError):
            PageResult(page_number=1, char_count=-1)

    def test_default_values(self):
        page = PageResult(page_number=1)
        assert page.text == ""
        assert page.char_count == 0
        assert page.has_text is False


class TestExtractionResult:
    def test_success_result_has_usable_text(self):
        result = ExtractionResult(
            status=ExtractionStatus.SUCCESS,
            original_filename="cv.pdf",
            page_count=1,
            full_text="Sample CV content",
            char_count=17,
        )
        assert result.has_usable_text() is True
        assert result.original_filename == "cv.pdf"
        assert result.page_count == 1

    def test_failed_result_has_no_usable_text(self):
        result = ExtractionResult(
            status=ExtractionStatus.FAILED,
            error_message="Validation failed.",
        )
        assert result.has_usable_text() is False

    def test_no_text_result_has_no_usable_text(self):
        result = ExtractionResult(
            status=ExtractionStatus.NO_TEXT,
            page_count=1,
            error_message="No readable text found.",
        )
        assert result.has_usable_text() is False

    def test_char_count_cannot_be_negative(self):
        with pytest.raises(ValidationError):
            ExtractionResult(status=ExtractionStatus.SUCCESS, char_count=-1)

    def test_filename_max_length_enforced(self):
        with pytest.raises(ValidationError):
            ExtractionResult(
                status=ExtractionStatus.SUCCESS,
                original_filename="a" * 256,
            )

    def test_warnings_list_defaults_empty(self):
        result = ExtractionResult(status=ExtractionStatus.SUCCESS)
        assert result.warnings == []

    def test_serialization_to_dict(self):
        result = ExtractionResult(
            status=ExtractionStatus.SUCCESS,
            page_count=1,
            full_text="Example text",
            char_count=12,
        )
        data = result.model_dump()
        assert data["status"] == "success"
        assert data["page_count"] == 1
        assert data["full_text"] == "Example text"
        assert isinstance(data["warnings"], list)

    def test_pages_list_populated(self):
        pages = [PageResult(page_number=1, text="Text", char_count=4, has_text=True)]
        result = ExtractionResult(
            status=ExtractionStatus.SUCCESS,
            page_count=1,
            pages=pages,
            full_text="Text",
            char_count=4,
        )
        assert len(result.pages) == 1
        assert result.pages[0].page_number == 1
        assert result.pages[0].text == "Text"
