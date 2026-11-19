"""Unit tests for ATS evaluation module."""

from src.ats import calculate_ats_score
from src.schemas import ATSSignals


def test_calculate_ats_score_perfect() -> None:
    signals = ATSSignals(
        contact_section_present=True,
        date_format_consistent=True,
        has_standard_section_headings=True,
        complex_layout_detected=False,
        keyword_alignment_score=1.0,
    )
    score = calculate_ats_score(
        signals, has_usable_text=True, char_count=2000, page_count=2
    )
    assert score == 100.0


def test_calculate_ats_score_complex_layout_penalty() -> None:
    signals = ATSSignals(
        contact_section_present=True,
        date_format_consistent=True,
        has_standard_section_headings=True,
        complex_layout_detected=True,  # penalty: 5 pts instead of 20
        keyword_alignment_score=1.0,
    )
    score = calculate_ats_score(
        signals, has_usable_text=True, char_count=2000, page_count=2
    )
    assert score == 85.0


def test_calculate_ats_score_no_usable_text() -> None:
    signals = ATSSignals()
    score = calculate_ats_score(
        signals, has_usable_text=False, char_count=0, page_count=1
    )
    # Loses 15 text quality pts
    assert score < 100.0


def test_calculate_ats_score_poor_signals() -> None:
    signals = ATSSignals(
        contact_section_present=False,
        date_format_consistent=False,
        has_standard_section_headings=False,
        complex_layout_detected=True,
        keyword_alignment_score=0.0,
    )
    score = calculate_ats_score(
        signals, has_usable_text=True, char_count=500, page_count=1
    )
    # text: 15, layout: 5, total = 20
    assert score == 20.0
