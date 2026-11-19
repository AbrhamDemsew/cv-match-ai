"""Unit tests for deterministic scoring module."""

from src.schemas import RequirementMatchResult
from src.scoring import (
    calculate_scoring_breakdown,
    normalize_match_score,
    resolve_category,
)


def test_normalize_match_score() -> None:
    assert normalize_match_score("matched") == 1.0
    assert normalize_match_score("partially_matched") == 0.5
    assert normalize_match_score("not_demonstrated") == 0.0
    assert normalize_match_score("explicitly_missing") == 0.0


def test_resolve_category() -> None:
    assert resolve_category("required_skill") == "required_technical_skills"
    assert resolve_category("experience") == "relevant_experience"
    assert resolve_category("education") == "education_qualifications"
    assert resolve_category("projects") == "relevant_projects"
    assert resolve_category("responsibility") == "responsibilities_alignment"
    assert resolve_category("preferred_skill") == "preferred_skills"
    assert resolve_category("other") == "relevant_projects"
    assert resolve_category("") == "required_technical_skills"
    assert resolve_category(None) == "required_technical_skills"


def test_calculate_scoring_zero_requirements() -> None:
    result = calculate_scoring_breakdown([])
    assert result.overall_score == 0.0
    assert result.requirement_coverage == 0.0
    assert result.total_evaluable_weight == 0.0
    assert result.is_sparse_job is True
    assert len(result.missing_categories) == 6
    assert len(result.category_scores) == 6
    for cs in result.category_scores:
        assert cs.achieved == 0.0


def test_calculate_scoring_single_category_does_not_inflate() -> None:
    # 2 requirements in required_technical_skills (base weight 30.0), both matched
    matches = [
        RequirementMatchResult(
            requirement_id="r1",
            status="matched",
            explanation="Good",
        ),
        RequirementMatchResult(
            requirement_id="r2",
            status="matched",
            explanation="Good",
        ),
    ]
    meta = {
        "r1": {"category": "required_skill", "weight": 1.0},
        "r2": {"category": "required_skill", "weight": 1.0},
    }
    # Original base weight (30.0) is preserved. It does NOT scale to 100.0!
    result = calculate_scoring_breakdown(matches, meta)
    assert result.overall_score == 30.0
    assert result.requirement_coverage == 1.0
    assert result.total_evaluable_weight == 30.0
    assert result.is_sparse_job is True
    assert "required_technical_skills" not in result.missing_categories
    assert len(result.missing_categories) == 5

    skills_cs = next(
        cs
        for cs in result.category_scores
        if cs.category == "required_technical_skills"
    )
    assert skills_cs.achieved == 30.0
    assert skills_cs.max_possible == 30.0


def test_calculate_scoring_single_preferred_skill_does_not_inflate() -> None:
    # 1 requirement in preferred_skills (base weight 10.0), matched
    matches = [
        RequirementMatchResult(
            requirement_id="r1",
            status="matched",
            explanation="Matched preferred skill",
        ),
    ]
    meta = {
        "r1": {"category": "preferred_skill", "weight": 1.0},
    }
    # Candidate achieved 10.0 points out of 100. Score is NOT inflated to 100!
    result = calculate_scoring_breakdown(matches, meta)
    assert result.overall_score == 10.0
    assert result.total_evaluable_weight == 10.0
    assert result.is_sparse_job is True
    assert result.requirement_coverage == 1.0


def test_calculate_scoring_two_categories() -> None:
    # Skills (base 30.0) matched 100% -> 30.0
    # Experience (base 20.0) partially matched 50% -> 10.0
    matches = [
        RequirementMatchResult(
            requirement_id="r1",
            status="matched",
            explanation="Full skills match",
        ),
        RequirementMatchResult(
            requirement_id="r2",
            status="partially_matched",
            explanation="Partial experience match",
        ),
    ]
    meta = {
        "r1": {"category": "required_skill", "weight": 1.0},
        "r2": {"category": "experience", "weight": 1.0},
    }
    result = calculate_scoring_breakdown(matches, meta)
    # Total score: 30.0 + 10.0 = 40.0 (out of 100 possible points)
    assert result.overall_score == 40.0
    assert result.total_evaluable_weight == 50.0
    assert result.is_sparse_job is True
    assert result.requirement_coverage == 0.75
    assert len(result.missing_categories) == 4


def test_calculate_scoring_all_six_categories_perfect() -> None:
    # 1 requirement in each of the 6 standard categories, all matched
    categories = [
        ("r1", "required_technical_skills"),
        ("r2", "relevant_experience"),
        ("r3", "education_qualifications"),
        ("r4", "relevant_projects"),
        ("r5", "responsibilities_alignment"),
        ("r6", "preferred_skills"),
    ]
    matches = [
        RequirementMatchResult(requirement_id=rid, status="matched", explanation="")
        for rid, _ in categories
    ]
    meta = {rid: {"category": cat, "weight": 1.0} for rid, cat in categories}

    result = calculate_scoring_breakdown(matches, meta)
    assert result.overall_score == 100.0
    assert result.total_evaluable_weight == 100.0
    assert result.is_sparse_job is False
    assert len(result.missing_categories) == 0
    assert result.requirement_coverage == 1.0
    assert result.matched_count == 6


def test_calculate_scoring_partial_and_not_demonstrated() -> None:
    matches = [
        RequirementMatchResult(
            requirement_id="r1",
            status="matched",
            explanation="Matched",
        ),
        RequirementMatchResult(
            requirement_id="r2",
            status="partially_matched",
            explanation="Partial",
        ),
        RequirementMatchResult(
            requirement_id="r3",
            status="not_demonstrated",
            explanation="Missing",
        ),
        RequirementMatchResult(
            requirement_id="r4",
            status="explicitly_missing",
            explanation="Lacks",
        ),
    ]
    meta = {
        "r1": {"category": "required_skill", "weight": 1.0},
        "r2": {"category": "required_skill", "weight": 1.0},
        "r3": {"category": "required_skill", "weight": 1.0},
        "r4": {"category": "required_skill", "weight": 1.0},
    }
    result = calculate_scoring_breakdown(matches, meta)
    # Skills base weight is 30.0. Ratio: (1.0 + 0.5 + 0.0 + 0.0) / 4 = 0.375
    # Achieved = round(0.375 * 30.0, 2) = 11.25 -> overall 11.2 (round-half-to-even)
    assert result.overall_score == 11.2
    assert result.requirement_coverage == 0.375
    assert result.matched_count == 1
    assert result.partially_matched_count == 1
    assert result.not_demonstrated_count == 1
    assert result.explicitly_missing_count == 1
