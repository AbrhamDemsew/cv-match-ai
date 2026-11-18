"""Tests for cvmatch_core.pdf.extractor."""

from cvmatch_core.models.extraction import ExtractionStatus
from cvmatch_core.pdf.extractor import extract_pdf


class TestSuccessfulExtraction:
    def test_simple_pdf_returns_success(self, simple_pdf):
        result = extract_pdf(simple_pdf)
        assert result.status == ExtractionStatus.SUCCESS
        assert result.char_count > 0
        assert "Python" in result.full_text

    def test_multipage_pdf_page_count(self, multipage_pdf):
        result = extract_pdf(multipage_pdf)
        assert result.status == ExtractionStatus.SUCCESS
        assert result.page_count == 3
        assert len(result.pages) == 3

    def test_original_filename_preserved(self, simple_pdf):
        result = extract_pdf(simple_pdf, original_filename="test_resume.pdf")
        assert result.original_filename == "test_resume.pdf"

    def test_all_pages_have_sequential_page_numbers(self, multipage_pdf):
        result = extract_pdf(multipage_pdf)
        page_numbers = [p.page_number for p in result.pages]
        assert page_numbers == [1, 2, 3]

    def test_technical_content_preserved(self, technical_content_pdf):
        result = extract_pdf(technical_content_pdf)
        assert result.status == ExtractionStatus.SUCCESS
        text = result.full_text
        assert "@" in text
        assert "https://" in text
        assert "2019" in text
        assert "3.12" in text

    def test_char_count_matches_page_sum(self, simple_pdf):
        result = extract_pdf(simple_pdf)
        expected = sum(p.char_count for p in result.pages)
        assert result.char_count == expected


class TestNoTextPDF:
    def test_image_only_returns_no_text_status(self, image_only_pdf):
        result = extract_pdf(image_only_pdf)
        assert result.status == ExtractionStatus.NO_TEXT
        assert result.error_message is not None
        assert result.full_text == ""
        assert result.char_count == 0

    def test_no_text_result_has_page_count(self, image_only_pdf):
        result = extract_pdf(image_only_pdf)
        assert result.page_count >= 1


class TestInvalidInput:
    def test_empty_bytes_returns_failed(self, empty_bytes):
        result = extract_pdf(empty_bytes)
        assert result.status == ExtractionStatus.FAILED
        assert result.error_message is not None

    def test_invalid_bytes_returns_failed(self, invalid_pdf_bytes):
        result = extract_pdf(invalid_pdf_bytes)
        assert result.status == ExtractionStatus.FAILED
        assert result.error_message is not None

    def test_encrypted_pdf_returns_failed(self, encrypted_pdf):
        result = extract_pdf(encrypted_pdf)
        assert result.status == ExtractionStatus.FAILED
        assert result.error_message is not None


class TestWhitespaceHandling:
    def test_pdf_with_extra_whitespace_extracts_successfully(self, pdf_with_whitespace):
        result = extract_pdf(pdf_with_whitespace)
        assert result.status == ExtractionStatus.SUCCESS

    def test_whitespace_pdf_has_normalized_text(self, pdf_with_whitespace):
        result = extract_pdf(pdf_with_whitespace)
        assert "\n\n\n" not in result.full_text


class TestErrorMessageSafety:
    def test_failed_result_error_does_not_expose_file_path(self, empty_bytes):
        result = extract_pdf(empty_bytes)
        assert "/" not in (result.error_message or "")
        assert "\\" not in (result.error_message or "")

    def test_failed_result_error_does_not_expose_stack_trace(self, invalid_pdf_bytes):
        result = extract_pdf(invalid_pdf_bytes)
        msg = result.error_message or ""
        assert "Traceback" not in msg
        assert "Exception" not in msg
