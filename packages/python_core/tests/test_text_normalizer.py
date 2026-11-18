"""Tests for cvmatch_core.pdf.normalizer."""

from cvmatch_core.pdf.normalizer import normalize_text


class TestLineEndings:
    def test_crlf_normalized(self):
        assert normalize_text("line1\r\nline2") == "line1\nline2"

    def test_cr_normalized(self):
        assert normalize_text("line1\rline2") == "line1\nline2"

    def test_lf_unchanged(self):
        assert normalize_text("line1\nline2") == "line1\nline2"


class TestWhitespaceCleanup:
    def test_multiple_spaces_collapsed(self):
        assert normalize_text("hello   world") == "hello world"

    def test_tabs_collapsed(self):
        assert normalize_text("col1\t\tcol2") == "col1 col2"

    def test_leading_trailing_stripped(self):
        assert normalize_text("  hello  ") == "hello"

    def test_empty_string_returns_empty(self):
        assert normalize_text("") == ""

    def test_whitespace_only_returns_empty(self):
        assert normalize_text("   \n\t  ") == ""


class TestBlankLines:
    def test_triple_blank_line_collapsed(self):
        result = normalize_text("a\n\n\n\nb")
        assert "\n\n\n" not in result
        assert result == "a\n\nb"

    def test_double_blank_line_preserved(self):
        result = normalize_text("a\n\nb")
        assert result == "a\n\nb"


class TestContentPreservation:
    def test_email_preserved(self):
        text = "Contact: test.user@example.com"
        assert normalize_text(text) == text

    def test_url_preserved(self):
        text = "Portfolio: https://github.com/example/repo"
        assert normalize_text(text) == text

    def test_dates_preserved(self):
        text = "Employment: 2019-01-15 to 2024-03-31"
        assert normalize_text(text) == text

    def test_numbers_and_percent_preserved(self):
        text = "Coverage: 98.5% | Latency: <50ms"
        assert normalize_text(text) == text

    def test_technical_version_preserved(self):
        text = "Python 3.12, Node.js v22.18"
        assert normalize_text(text) == text

    def test_bullet_content_preserved(self):
        text = "• Led cross-functional team of 8 engineers"
        assert normalize_text(text) == text

    def test_heading_preserved(self):
        text = "WORK EXPERIENCE\nSoftware Engineer"
        assert normalize_text(text) == text
