"""
Deterministic ATS (Applicant Tracking System) readiness evaluation.

Assesses document readability, structural formatting, and keyword alignment
without claiming to simulate any proprietary ATS product.
"""

from __future__ import annotations

from src.schemas import ATSSignals


def calculate_ats_score(
    signals: ATSSignals,
    has_usable_text: bool = True,
    char_count: int = 1000,
    page_count: int = 1,
) -> float:
    """
    Calculate deterministic ATS readiness score (0.0 to 100.0).

    Weights breakdown:
    - Text extraction quality (has usable text & reasonable length): 15 pts
    - Standard section headings: 20 pts
    - Clean layout (no complex multi-column/table parsing anomalies): 20 pts
    - Contact section present and readable: 15 pts
    - Date formatting consistency: 15 pts
    - Keyword alignment with job requirements: 15 pts

    Total: 100 points maximum.
    """
    score = 0.0

    # 1. Text extraction quality (15 pts)
    if has_usable_text and char_count >= 150 and page_count >= 1:
        score += 15.0
    elif has_usable_text:
        score += 7.5

    # 2. Standard section headings (20 pts)
    if signals.has_standard_section_headings:
        score += 20.0

    # 3. Clean layout / parsing friendliness (20 pts)
    if not signals.complex_layout_detected:
        score += 20.0
    else:
        score += 5.0  # partial credit if complex layout was detected

    # 4. Contact section present (15 pts)
    if signals.contact_section_present:
        score += 15.0

    # 5. Date formatting consistent (15 pts)
    if signals.date_format_consistent:
        score += 15.0

    # 6. Keyword alignment (15 pts)
    alignment = max(0.0, min(1.0, signals.keyword_alignment_score))
    score += alignment * 15.0

    return round(max(0.0, min(100.0, score)), 1)
