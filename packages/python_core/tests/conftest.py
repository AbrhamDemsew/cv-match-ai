"""
Shared pytest fixtures for cvmatch_core tests.

All PDF fixtures are generated programmatically in-memory.
No real CVs or personal information are used.
Test data contains no real names, personal contact details, or private documents.
"""

from __future__ import annotations

import io

import pymupdf
import pytest


def _make_text_pdf(pages: list[str]) -> bytes:
    """Create an in-memory PDF with text inserted on successive pages."""
    buf = io.BytesIO()
    doc = pymupdf.open()
    for text in pages:
        page = doc.new_page()
        page.insert_text((50, 100), text, fontsize=12)
    doc.save(buf)
    doc.close()
    return buf.getvalue()


@pytest.fixture
def simple_pdf() -> bytes:
    """Single-page text-based PDF fixture."""
    return _make_text_pdf(
        [
            "Senior Software Engineer with 5+ years of experience in Python, "
            "Cloud systems, and APIs."
        ]
    )


@pytest.fixture
def multipage_pdf() -> bytes:
    """Three-page PDF fixture with synthetic resume-like sections."""
    pages = [
        "Work Experience\nSoftware Engineer at Example Corp (2020-2024)\n"
        "Built scalable APIs.",
        "Education\nB.Sc. Computer Science, 2019\nGrade: 3.8 GPA",
        "Skills\nPython, TypeScript, React, PostgreSQL, Docker",
    ]
    return _make_text_pdf(pages)


@pytest.fixture
def empty_bytes() -> bytes:
    """Empty byte string fixture."""
    return b""


@pytest.fixture
def invalid_pdf_bytes() -> bytes:
    """Arbitrary non-PDF bytes fixture."""
    return b"This is not a PDF file at all."


@pytest.fixture
def pdf_with_whitespace() -> bytes:
    """PDF with excessive horizontal and vertical whitespace."""
    return _make_text_pdf(
        [
            "  Extra   spaces  everywhere across multiple paragraphs.  "
            "\n\n\n\n\nToo   many   blank   lines in this document.  "
        ]
    )


@pytest.fixture
def oversized_pdf_bytes() -> bytes:
    """Bytes starting with PDF signature that exceed the 10 MB limit."""
    return b"%PDF-" + b"x" * (10 * 1024 * 1024 + 1)


@pytest.fixture
def many_page_pdf() -> bytes:
    """PDF with 21 pages to test maximum page limit enforcement."""
    pages = [
        f"Page {i} content with sufficient extractable text for testing."
        for i in range(1, 22)
    ]
    return _make_text_pdf(pages)


@pytest.fixture
def encrypted_pdf() -> bytes:
    """Password-protected PDF fixture."""
    buf = io.BytesIO()
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Protected confidential content", fontsize=12)
    doc.save(buf, encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="testpassword")
    doc.close()
    return buf.getvalue()


@pytest.fixture
def image_only_pdf() -> bytes:
    """PDF with a blank page and no extractable text."""
    buf = io.BytesIO()
    doc = pymupdf.open()
    doc.new_page()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


@pytest.fixture
def technical_content_pdf() -> bytes:
    """PDF with technical terms, dates, numbers, emails, and URLs."""
    content = (
        "Contact: engineer.sample@example.com | https://github.com/example/cv\n"
        "Experience: 2019-01-15 to 2024-03-31\n"
        "Skills: Python 3.12, React 18.x, Node.js v22.18, TypeScript 5.4\n"
        "Metrics: 98.5% test coverage | Latency: <50ms p99"
    )
    return _make_text_pdf([content])
