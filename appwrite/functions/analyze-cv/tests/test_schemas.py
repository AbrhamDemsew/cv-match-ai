"""Unit tests for schemas module."""

import pytest
from pydantic import ValidationError
from src.schemas import (
    AnalysisRequest,
    CategoryScore,
    GeminiAnalysisOutput,
    RequirementMatchResult,
    ScoringBreakdown,
)


def test_analysis_request_camel_case() -> None:
    req = AnalysisRequest.model_validate({"resumeId": "res_123", "jobId": "job_456"})
    assert req.resume_id == "res_123"
    assert req.job_id == "job_456"


def test_analysis_request_snake_case() -> None:
    req = AnalysisRequest.model_validate({"resume_id": "res_123", "job_id": "job_456"})
    assert req.resume_id == "res_123"
    assert req.job_id == "job_456"


def test_analysis_request_missing_fields() -> None:
    with pytest.raises(ValidationError):
        AnalysisRequest.model_validate({"resumeId": "res_123"})


def test_analysis_request_empty_strings() -> None:
    with pytest.raises(ValidationError):
        AnalysisRequest.model_validate({"resumeId": "", "jobId": "job_123"})


def test_gemini_analysis_output_roundtrip() -> None:
    payload = {
        "cv_profile": {
            "professional_summary": "Senior Software Engineer with 8 years of experience.",
            "skills": [
                {
                    "name": "Python",
                    "evidence": "8 years of Python experience",
                    "section": "Skills",
                    "page": 1,
                }
            ],
            "work_experience": [
                {
                    "title": "Senior Engineer",
                    "company": "Tech Corp",
                    "start_date": "2020",
                    "end_date": "Present",
                    "responsibilities": ["Lead backend team"],
                    "achievements": ["Improved throughput by 40%"],
                }
            ],
            "education": [
                {
                    "degree": "B.Sc. Computer Science",
                    "institution": "State University",
                    "year": "2016",
                }
            ],
            "certifications": ["GCP Professional Cloud Architect"],
            "projects": [
                {
                    "name": "Data Pipeline",
                    "description": "Real-time ETL",
                    "technologies": ["Python", "Apache Beam"],
                }
            ],
        },
        "requirement_matches": [
            {
                "requirement_id": "req_1",
                "status": "matched",
                "match_score": 1.0,
                "evidence": "8 years Python experience",
                "source_section": "Skills",
                "source_page": 1,
                "explanation": "Extensive documented Python experience.",
            }
        ],
        "strengths": ["Strong Python background", "Cloud certification"],
        "improvement_areas": ["Docker experience not explicitly listed"],
        "recommendations": [
            {
                "category": "skills",
                "priority": 1,
                "title": "Highlight Docker Experience",
                "description": "Add containerization tools to skills section if applicable.",
                "suggested_action": "Add Docker to technical skills list.",
            }
        ],
        "ats_signals": {
            "contact_section_present": True,
            "date_format_consistent": True,
            "has_standard_section_headings": True,
            "complex_layout_detected": False,
            "keyword_alignment_score": 0.85,
        },
    }

    output = GeminiAnalysisOutput.model_validate(payload)
    assert output.cv_profile.professional_summary.startswith("Senior Software Engineer")
    assert len(output.cv_profile.skills) == 1
    assert output.cv_profile.skills[0].name == "Python"
    assert len(output.requirement_matches) == 1
    assert output.requirement_matches[0].status == "matched"
    assert output.ats_signals.keyword_alignment_score == 0.85

    # Test serialization to JSON and reload
    json_str = output.model_dump_json()
    reloaded = GeminiAnalysisOutput.model_validate_json(json_str)
    assert reloaded.cv_profile.skills[0].name == "Python"


def test_invalid_match_status_rejected() -> None:
    with pytest.raises(ValidationError):
        RequirementMatchResult.model_validate(
            {
                "requirement_id": "req_1",
                "status": "invalid_status",
                "explanation": "Test",
            }
        )


def test_scoring_breakdown_validation() -> None:
    score = ScoringBreakdown(
        overall_score=85.5,
        ats_score=90.0,
        requirement_coverage=0.8,
        category_scores=[
            CategoryScore(
                category="required_technical_skills",
                weight=30.0,
                achieved=25.0,
                max_possible=30.0,
            )
        ],
        scoring_version="1.0",
        matched_count=4,
        partially_matched_count=1,
        not_demonstrated_count=1,
        explicitly_missing_count=0,
    )
    assert score.overall_score == 85.5
    assert score.ats_score == 90.0
    assert len(score.category_scores) == 1
