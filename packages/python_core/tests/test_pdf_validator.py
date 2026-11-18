"""Tests for cvmatch_core.pdf.validator."""

import pytest

from cvmatch_core.config import ExtractionConfig
from cvmatch_core.exceptions import (
    EmptyDocumentError,
    EncryptedPDFError,
    FileTooLargeError,
    InvalidPDFError,
    NoExtractableTextError,
    TooManyPagesError,
    UnsupportedFileFormatError,
)
from cvmatch_core.pdf.validator import validate_pdf_bytes


class TestValidPDF:
    def test_valid_text_pdf_passes(self, simple_pdf):
        validate_pdf_bytes(simple_pdf)

    def test_valid_multipage_pdf_passes(self, multipage_pdf):
        validate_pdf_bytes(multipage_pdf)


class TestEmptyFile:
    def test_empty_bytes_raises(self, empty_bytes):
        with pytest.raises(EmptyDocumentError):
            validate_pdf_bytes(empty_bytes)


class TestInvalidPDF:
    def test_non_pdf_bytes_raises_unsupported(self, invalid_pdf_bytes):
        with pytest.raises(UnsupportedFileFormatError):
            validate_pdf_bytes(invalid_pdf_bytes)

    def test_pdf_signature_but_corrupt_raises_invalid(self):
        corrupt = (
            b"%PDF-1.4\nCorrupted binary payload that cannot be parsed as valid PDF."
        )
        with pytest.raises(InvalidPDFError):
            validate_pdf_bytes(corrupt)


class TestFileSize:
    def test_oversized_bytes_raises_file_too_large(self, oversized_pdf_bytes):
        with pytest.raises(FileTooLargeError):
            validate_pdf_bytes(oversized_pdf_bytes)

    def test_custom_file_size_limit(self, simple_pdf):
        custom_config = ExtractionConfig(max_file_size_bytes=5 * 1024 * 1024)
        validate_pdf_bytes(simple_pdf, config=custom_config)


class TestPageCount:
    def test_too_many_pages_raises(self, many_page_pdf):
        with pytest.raises(TooManyPagesError):
            validate_pdf_bytes(many_page_pdf)

    def test_custom_page_limit_enforced(self, multipage_pdf):
        strict_config = ExtractionConfig(max_pages=2)
        with pytest.raises(TooManyPagesError):
            validate_pdf_bytes(multipage_pdf, config=strict_config)


class TestEncryption:
    def test_encrypted_pdf_raises(self, encrypted_pdf):
        with pytest.raises(EncryptedPDFError):
            validate_pdf_bytes(encrypted_pdf)


class TestNoText:
    def test_image_only_pdf_raises_no_text_when_checked(self, image_only_pdf):
        with pytest.raises(NoExtractableTextError):
            validate_pdf_bytes(image_only_pdf, check_extractable_text=True)

    def test_image_only_passes_when_text_check_disabled(self, image_only_pdf):
        validate_pdf_bytes(image_only_pdf, check_extractable_text=False)
