"""Unit tests for persistence module (mocked Appwrite SDK)."""

from unittest.mock import MagicMock, patch

from src.persistence import (
    create_analysis_record,
    save_recommendations,
    save_requirement_matches,
    update_analysis_completed,
    update_analysis_failed,
)
from src.schemas import (
    CategoryScore,
    RecommendationItem,
    RequirementMatchResult,
    ScoringBreakdown,
)


@patch("src.persistence.Databases")
def test_create_analysis_record(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    analysis_id = create_analysis_record(
        mock_client,
        "cvmatch",
        "user_123",
        "res_1",
        "job_1",
    )
    assert analysis_id is not None
    mock_db.create_document.assert_called_once()
    call_args = mock_db.create_document.call_args[1]
    assert call_args["data"]["status"] == "processing"
    assert call_args["data"]["user_id"] == "user_123"


@patch("src.persistence.Databases")
def test_update_analysis_completed(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db_cls.return_value = mock_db

    breakdown = ScoringBreakdown(
        overall_score=85.0,
        ats_score=90.0,
        requirement_coverage=0.8,
        category_scores=[
            CategoryScore(
                category="skills", weight=30.0, achieved=25.0, max_possible=30.0
            )
        ],
        matched_count=4,
    )

    mock_client = MagicMock()
    update_analysis_completed(
        mock_client,
        "cvmatch",
        "analysis_123",
        "user_123",
        breakdown,
        "gemini-2.0-flash",
    )
    mock_db.update_document.assert_called_once()
    call_args = mock_db.update_document.call_args[1]
    assert call_args["data"]["status"] == "completed"
    assert call_args["data"]["compatibility_score"] == 85.0
    assert call_args["data"]["model_id"] == "gemini-2.0-flash"


@patch("src.persistence.Databases")
def test_update_analysis_failed(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    update_analysis_failed(
        mock_client,
        "cvmatch",
        "analysis_123",
        "user_123",
        "AI_RATE_LIMIT",
    )
    mock_db.update_document.assert_called_once()
    call_args = mock_db.update_document.call_args[1]
    assert call_args["data"]["status"] == "failed"
    assert call_args["data"]["error_code"] == "AI_RATE_LIMIT"


@patch("src.persistence.Databases")
def test_save_requirement_matches(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db_cls.return_value = mock_db

    matches = [
        RequirementMatchResult(
            requirement_id="req_1",
            status="matched",
            evidence="Python skills",
            source_section="Skills",
            source_page=1,
            explanation="Matches",
        ),
        RequirementMatchResult(
            requirement_id="req_2",
            status="not_demonstrated",
            explanation="No evidence",
        ),
    ]

    mock_client = MagicMock()
    save_requirement_matches(
        mock_client, "cvmatch", "analysis_123", "user_123", matches
    )
    assert mock_db.create_document.call_count == 2


@patch("src.persistence.Databases")
def test_save_recommendations(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db_cls.return_value = mock_db

    recs = [
        RecommendationItem(
            category="skills",
            priority=1,
            title="Add Docker",
            description="Detail container experience",
            suggested_action="Add Docker to tools",
        )
    ]

    mock_client = MagicMock()
    save_recommendations(mock_client, "cvmatch", "analysis_123", "user_123", recs)
    mock_db.create_document.assert_called_once()
    call_args = mock_db.create_document.call_args[1]
    assert call_args["data"]["title"] == "Add Docker"
