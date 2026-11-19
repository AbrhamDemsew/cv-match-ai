"""
Deterministic scoring engine for CVMatch AI.

Calculates CV-to-job compatibility score, category breakdowns, and requirement coverage.
AI interprets and classifies evidence; Python calculates all scores deterministically.
Never uses protected personal characteristics or claims hiring probability.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from src.ats import calculate_ats_score
from src.schemas import (
    ATSSignals,
    CategoryScore,
    MatchStatus,
    RequirementMatchResult,
    ScoringBreakdown,
)

# Standard category base weights defined in instruction.md §8 (sum = 100.0)
DEFAULT_CATEGORY_WEIGHTS: dict[str, float] = {
    "required_technical_skills": 30.0,
    "relevant_experience": 20.0,
    "education_qualifications": 15.0,
    "relevant_projects": 15.0,
    "responsibilities_alignment": 10.0,
    "preferred_skills": 10.0,
}

# Category name normalization mapping from database values to standard categories
CATEGORY_ALIASES: dict[str, str] = {
    "required_skill": "required_technical_skills",
    "required_skills": "required_technical_skills",
    "required_technical_skills": "required_technical_skills",
    "technical_skills": "required_technical_skills",
    "experience": "relevant_experience",
    "relevant_experience": "relevant_experience",
    "work_experience": "relevant_experience",
    "education": "education_qualifications",
    "education_qualifications": "education_qualifications",
    "qualifications": "education_qualifications",
    "project": "relevant_projects",
    "projects": "relevant_projects",
    "relevant_projects": "relevant_projects",
    "responsibility": "responsibilities_alignment",
    "responsibilities": "responsibilities_alignment",
    "responsibilities_alignment": "responsibilities_alignment",
    "preferred_skill": "preferred_skills",
    "preferred_skills": "preferred_skills",
    "nice_to_have": "preferred_skills",
    "other": "relevant_projects",
}


def normalize_match_score(status: MatchStatus) -> float:
    """
    Authoritatively convert a MatchStatus to its documented numeric value.

    - matched: 1.0
    - partially_matched: 0.5
    - not_demonstrated: 0.0
    - explicitly_missing: 0.0
    """
    match status:
        case "matched":
            return 1.0
        case "partially_matched":
            return 0.5
        case "not_demonstrated" | "explicitly_missing":
            return 0.0
        case _:
            return 0.0


def resolve_category(raw_category: str | None) -> str:
    """Map arbitrary requirement category string to a standard category key."""
    if not raw_category:
        return "required_technical_skills"
    cleaned = raw_category.strip().lower().replace(" ", "_").replace("-", "_")
    return CATEGORY_ALIASES.get(cleaned, "required_technical_skills")


def calculate_scoring_breakdown(
    requirement_matches: Sequence[RequirementMatchResult],
    requirements_meta: Mapping[str, dict[str, Any]] | None = None,
    ats_signals: ATSSignals | None = None,
    has_usable_text: bool = True,
    char_count: int = 1000,
    page_count: int = 1,
    scoring_version: str = "1.0",
) -> ScoringBreakdown:
    """
    Compute reproducible, explainable scoring breakdown from requirement assessments.

    Args:
        requirement_matches: List of requirement evaluation results.
        requirements_meta: Optional mapping of requirement_id -> metadata (category, weight, importance).
        ats_signals: ATS signals detected from CV.
        has_usable_text: Whether CV text extraction succeeded with usable text.
        char_count: Extracted CV character count.
        page_count: Extracted CV page count.
        scoring_version: Version identifier for scoring algorithm.

    Returns:
        ScoringBreakdown containing overall_score, ats_score, coverage, and category breakdowns.
    """
    meta_lookup = requirements_meta or {}

    total_requirements = len(requirement_matches)
    if total_requirements == 0:
        ats_score = calculate_ats_score(
            ats_signals or ATSSignals(),
            has_usable_text=has_usable_text,
            char_count=char_count,
            page_count=page_count,
        )
        return ScoringBreakdown(
            overall_score=0.0,
            ats_score=ats_score,
            requirement_coverage=0.0,
            category_scores=[
                CategoryScore(
                    category=cat,
                    weight=w,
                    achieved=0.0,
                    max_possible=w,
                )
                for cat, w in DEFAULT_CATEGORY_WEIGHTS.items()
            ],
            scoring_version=scoring_version,
            matched_count=0,
            partially_matched_count=0,
            not_demonstrated_count=0,
            explicitly_missing_count=0,
            total_evaluable_weight=0.0,
            is_sparse_job=True,
            missing_categories=list(DEFAULT_CATEGORY_WEIGHTS.keys()),
        )

    # 1. Group matches and weights by standard category
    matched_count = 0
    partially_matched_count = 0
    not_demonstrated_count = 0
    explicitly_missing_count = 0

    category_buckets: dict[str, list[tuple[float, float]]] = {
        cat: [] for cat in DEFAULT_CATEGORY_WEIGHTS
    }

    for match in requirement_matches:
        # Enforce authoritative score
        authoritative_score = normalize_match_score(match.status)

        match match.status:
            case "matched":
                matched_count += 1
            case "partially_matched":
                partially_matched_count += 1
            case "not_demonstrated":
                not_demonstrated_count += 1
            case "explicitly_missing":
                explicitly_missing_count += 1

        req_meta = meta_lookup.get(match.requirement_id, {})
        raw_cat = req_meta.get("category", "required_technical_skills")
        category = resolve_category(raw_cat)

        # Requirement individual weight (defaults to 1.0, clamped between 0.1 and 10.0)
        raw_weight = req_meta.get("weight", 1.0)
        try:
            req_weight = max(0.1, min(10.0, float(raw_weight)))
        except (ValueError, TypeError):
            req_weight = 1.0

        if category not in category_buckets:
            category_buckets[category] = []
        category_buckets[category].append((authoritative_score, req_weight))

    # 2. Evaluate categories preserving original category base weights (instruction.md §8)
    # Missing categories are NOT redistributed to prevent artificial score inflation.
    # An absent category contributes 0 points toward the 100-point compatibility score.
    category_scores: list[CategoryScore] = []
    overall_score = 0.0
    active_categories: list[str] = []
    missing_categories: list[str] = []

    for cat, base_weight in DEFAULT_CATEGORY_WEIGHTS.items():
        items = category_buckets.get(cat, [])
        if items:
            active_categories.append(cat)
            total_item_weight = sum(w for _, w in items)
            earned_weighted = sum(score * w for score, w in items)

            category_ratio = (
                earned_weighted / total_item_weight if total_item_weight > 0 else 0.0
            )
            achieved = round(category_ratio * base_weight, 2)
            overall_score += achieved

            category_scores.append(
                CategoryScore(
                    category=cat,
                    weight=base_weight,
                    achieved=achieved,
                    max_possible=base_weight,
                )
            )
        else:
            missing_categories.append(cat)
            category_scores.append(
                CategoryScore(
                    category=cat,
                    weight=base_weight,
                    achieved=0.0,
                    max_possible=base_weight,
                )
            )

    overall_score = round(max(0.0, min(100.0, overall_score)), 1)
    total_evaluable_weight = round(
        sum(DEFAULT_CATEGORY_WEIGHTS[cat] for cat in active_categories), 1
    )
    is_sparse_job = len(active_categories) < 3 or total_evaluable_weight < 60.0

    # 3. Requirement coverage: proportion of defined requirements with evidence
    # (matched counts as 1.0, partially_matched counts as 0.5)
    # Maintained strictly separate from compatibility score.
    coverage = (
        matched_count * 1.0 + partially_matched_count * 0.5
    ) / total_requirements
    requirement_coverage = round(max(0.0, min(1.0, coverage)), 3)

    # 4. Deterministic ATS score
    ats_score = calculate_ats_score(
        ats_signals or ATSSignals(),
        has_usable_text=has_usable_text,
        char_count=char_count,
        page_count=page_count,
    )

    return ScoringBreakdown(
        overall_score=overall_score,
        ats_score=ats_score,
        requirement_coverage=requirement_coverage,
        category_scores=category_scores,
        scoring_version=scoring_version,
        matched_count=matched_count,
        partially_matched_count=partially_matched_count,
        not_demonstrated_count=not_demonstrated_count,
        explicitly_missing_count=explicitly_missing_count,
        total_evaluable_weight=total_evaluable_weight,
        is_sparse_job=is_sparse_job,
        missing_categories=missing_categories,
    )
