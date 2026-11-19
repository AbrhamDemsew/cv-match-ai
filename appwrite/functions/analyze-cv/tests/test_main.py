"""Integration-style unit tests for analyze-cv main function handler (all external systems mocked)."""

from unittest.mock import MagicMock, patch

from cvmatch_core.models.extraction import ExtractionResult, ExtractionStatus
from src.auth import CallerIdentity
from src.exceptions import (
    AccessDeniedError,
    AIRateLimitError,
    AnalysisValidationError,
    JobNotFoundError,
    ResumeNotFoundError,
)
from src.main import main
from src.schemas import (
    ATSSignals,
    CVProfile,
    CVSkill,
    GeminiAnalysisOutput,
    RecommendationItem,
    RequirementMatchResult,
)


class MockContext:
    def __init__(self, body=None, headers=None) -> None:
        self.req = MagicMock()
        self.req.body = body
        self.req.headers = headers or {
            "x-appwrite-user-id": "user_test_123",
            "x-appwrite-user-jwt": "jwt_test_token",
        }
        self.res = MagicMock()
        self.res.json = MagicMock(
            side_effect=lambda data, status=200: {"data": data, "status": status}
        )
        self.log = MagicMock()
        self.error = MagicMock()


SAMPLE_AI_OUTPUT = GeminiAnalysisOutput(
    cv_profile=CVProfile(
        professional_summary="Senior Engineer",
        skills=[
            CVSkill(
                name="Python", evidence="5 years experience", section="Skills", page=1
            )
        ],
    ),
    requirement_matches=[
        RequirementMatchResult(
            requirement_id="req_1",
            status="matched",
            match_score=1.0,
            evidence="5 years experience",
            source_section="Skills",
            source_page=1,
            explanation="Strong match",
        )
    ],
    strengths=["Python proficiency"],
    improvement_areas=["None"],
    recommendations=[
        RecommendationItem(
            category="skills",
            priority=1,
            title="Expand projects",
            description="Add project metrics",
        )
    ],
    ats_signals=ATSSignals(),
)


@patch("src.main.update_resume_extraction_status")
@patch("src.main.update_analysis_completed")
@patch("src.main.save_recommendations")
@patch("src.main.save_requirement_matches")
@patch("src.main.analyze_cv_with_gemini")
@patch("src.main.create_analysis_record")
@patch("src.main.extract_pdf")
@patch("src.main.download_resume_pdf")
@patch("src.main.get_job_requirements")
@patch("src.main.get_job")
@patch("src.main.get_resume")
@patch("src.main.verify_caller_identity")
@patch("src.main.load_config")
def test_main_happy_path(
    mock_load_cfg: MagicMock,
    mock_verify_auth: MagicMock,
    mock_get_resume: MagicMock,
    mock_get_job: MagicMock,
    mock_get_reqs: MagicMock,
    mock_download_pdf: MagicMock,
    mock_extract_pdf: MagicMock,
    mock_create_analysis: MagicMock,
    mock_ai: MagicMock,
    mock_save_matches: MagicMock,
    mock_save_recs: MagicMock,
    mock_update_completed: MagicMock,
    mock_update_resume: MagicMock,
) -> None:
    mock_verify_auth.return_value = CallerIdentity(
        user_id="user_test_123", user_jwt="jwt_test_token"
    )
    # Setup mocks
    cfg = MagicMock()
    cfg.appwrite_endpoint = "https://endpoint/v1"
    cfg.appwrite_project_id = "project_1"
    cfg.appwrite_api_key = "key_secret"
    cfg.gemini_api_key = "gemini_secret"
    cfg.gemini_model = "gemini-2.0-flash"
    cfg.database_id = "cvmatch"
    cfg.resumes_bucket_id = "resumes"
    cfg.scoring_version = "1.0"
    mock_load_cfg.return_value = cfg

    mock_get_resume.return_value = {
        "$id": "res_1",
        "user_id": "user_test_123",
        "storage_file_id": "file_123",
        "original_filename": "resume.pdf",
    }
    mock_get_job.return_value = {
        "$id": "job_1",
        "user_id": "user_test_123",
        "title": "Senior Python Engineer",
        "description": "Job description text",
        "responsibilities": "Build systems",
    }
    mock_get_reqs.return_value = [
        {"$id": "req_1", "category": "required_skill", "description": "Python"}
    ]
    mock_download_pdf.return_value = b"%PDF-1.4 sample content"
    mock_extract_pdf.return_value = ExtractionResult(
        status=ExtractionStatus.SUCCESS,
        page_count=2,
        full_text="John Doe Senior Python Engineer with 5 years experience.",
        char_count=60,
    )
    mock_create_analysis.return_value = "analysis_generated_id_123"
    mock_ai.return_value = SAMPLE_AI_OUTPUT

    context = MockContext(body={"resumeId": "res_1", "jobId": "job_1"})
    response = main(context)

    assert response["status"] == 200
    assert response["data"]["analysisId"] == "analysis_generated_id_123"
    assert response["data"]["status"] == "completed"

    mock_create_analysis.assert_called_once()
    mock_save_matches.assert_called_once()
    mock_save_recs.assert_called_once()
    mock_update_completed.assert_called_once()
    mock_update_resume.assert_called_once()


def test_main_malformed_request_body() -> None:
    context = MockContext(body="not a json payload")
    response = main(context)
    assert response["status"] == 400
    assert response["data"]["error"] == "INTERNAL_ERROR"


def test_main_missing_jwt_access_denied() -> None:
    context = MockContext(
        body={"resumeId": "res_1", "jobId": "job_1"},
        headers={"x-appwrite-user-id": "user_123"},  # missing x-appwrite-user-jwt
    )
    response = main(context)
    assert response["status"] == 401
    assert response["data"]["error"] == "ACCESS_DENIED"


@patch("src.main.get_resume")
@patch("src.main.verify_caller_identity")
@patch("src.main.load_config")
def test_main_resume_not_found(
    mock_load_cfg: MagicMock,
    mock_verify_auth: MagicMock,
    mock_get_resume: MagicMock,
) -> None:
    mock_verify_auth.return_value = CallerIdentity("user_test_123", "jwt_token")
    mock_get_resume.side_effect = ResumeNotFoundError()
    context = MockContext(body={"resumeId": "res_not_found", "jobId": "job_1"})
    response = main(context)
    assert response["status"] == 404
    assert response["data"]["error"] == "RESUME_NOT_FOUND"


@patch("src.main.get_job")
@patch("src.main.get_resume")
@patch("src.main.verify_caller_identity")
@patch("src.main.load_config")
def test_main_job_not_found(
    mock_load_cfg: MagicMock,
    mock_verify_auth: MagicMock,
    mock_get_resume: MagicMock,
    mock_get_job: MagicMock,
) -> None:
    mock_verify_auth.return_value = CallerIdentity("user_test_123", "jwt_token")
    mock_get_resume.return_value = {"$id": "res_1", "storage_file_id": "file_1"}
    mock_get_job.side_effect = JobNotFoundError()
    context = MockContext(body={"resumeId": "res_1", "jobId": "job_not_found"})
    response = main(context)
    assert response["status"] == 404
    assert response["data"]["error"] == "JOB_NOT_FOUND"


def test_main_identity_verification_failed() -> None:
    with (
        patch("src.main.verify_caller_identity") as mock_verify_auth,
        patch("src.main.load_config"),
    ):
        mock_verify_auth.side_effect = AccessDeniedError("Mismatched identity")
        context = MockContext(body={"resumeId": "res_1", "jobId": "job_1"})
        response = main(context)
        assert response["status"] == 401
        assert response["data"]["error"] == "ACCESS_DENIED"


@patch("src.main.download_resume_pdf")
@patch("src.main.get_job_requirements")
@patch("src.main.get_job")
@patch("src.main.get_resume")
@patch("src.main.verify_caller_identity")
@patch("src.main.load_config")
@patch("src.main.extract_pdf")
def test_main_image_only_pdf_returns_pdf_text_not_found(
    mock_extract_pdf: MagicMock,
    mock_load_cfg: MagicMock,
    mock_verify_auth: MagicMock,
    mock_get_resume: MagicMock,
    mock_get_job: MagicMock,
    mock_get_reqs: MagicMock,
    mock_download_pdf: MagicMock,
) -> None:
    mock_verify_auth.return_value = CallerIdentity("user_test_123", "jwt_token")
    mock_get_resume.return_value = {"$id": "res_1", "storage_file_id": "file_1"}
    mock_get_job.return_value = {"$id": "job_1"}
    mock_get_reqs.return_value = []
    mock_download_pdf.return_value = b"%PDF-scanned"
    # PDF extraction detects image-only PDF
    mock_extract_pdf.return_value = ExtractionResult(
        status=ExtractionStatus.NO_TEXT,
        page_count=3,
        full_text="",
        char_count=0,
    )

    context = MockContext(body={"resumeId": "res_1", "jobId": "job_1"})
    response = main(context)
    assert response["status"] == 422
    assert response["data"]["error"] == "PDF_TEXT_NOT_FOUND"


@patch("src.main.update_analysis_failed")
@patch("src.main.analyze_cv_with_gemini")
@patch("src.main.create_analysis_record")
@patch("src.main.extract_pdf")
@patch("src.main.download_resume_pdf")
@patch("src.main.get_job_requirements")
@patch("src.main.get_job")
@patch("src.main.get_resume")
@patch("src.main.verify_caller_identity")
@patch("src.main.load_config")
def test_main_gemini_rate_limit_updates_analysis_to_failed(
    mock_load_cfg: MagicMock,
    mock_verify_auth: MagicMock,
    mock_get_resume: MagicMock,
    mock_get_job: MagicMock,
    mock_get_reqs: MagicMock,
    mock_download_pdf: MagicMock,
    mock_extract_pdf: MagicMock,
    mock_create_analysis: MagicMock,
    mock_ai: MagicMock,
    mock_update_failed: MagicMock,
) -> None:
    mock_verify_auth.return_value = CallerIdentity("user_test_123", "jwt_token")
    mock_get_resume.return_value = {"$id": "res_1", "storage_file_id": "file_1"}
    mock_get_job.return_value = {"$id": "job_1"}
    mock_get_reqs.return_value = []
    mock_download_pdf.return_value = b"%PDF"
    mock_extract_pdf.return_value = ExtractionResult(
        status=ExtractionStatus.SUCCESS,
        page_count=1,
        full_text="Valid resume content with plenty of text.",
        char_count=45,
    )
    mock_create_analysis.return_value = "analysis_to_fail"
    mock_ai.side_effect = AIRateLimitError()

    context = MockContext(body={"resumeId": "res_1", "jobId": "job_1"})
    response = main(context)

    assert response["status"] == 429
    assert response["data"]["error"] == "AI_RATE_LIMIT"
    mock_update_failed.assert_called_once()
    assert mock_update_failed.call_args[0][4] == "AI_RATE_LIMIT"


@patch("src.main.update_analysis_failed")
@patch("src.main.analyze_cv_with_gemini")
@patch("src.main.create_analysis_record")
@patch("src.main.extract_pdf")
@patch("src.main.download_resume_pdf")
@patch("src.main.get_job_requirements")
@patch("src.main.get_job")
@patch("src.main.get_resume")
@patch("src.main.verify_caller_identity")
@patch("src.main.load_config")
def test_main_validation_error_updates_analysis_to_failed(
    mock_load_cfg: MagicMock,
    mock_verify_auth: MagicMock,
    mock_get_resume: MagicMock,
    mock_get_job: MagicMock,
    mock_get_reqs: MagicMock,
    mock_download_pdf: MagicMock,
    mock_extract_pdf: MagicMock,
    mock_create_analysis: MagicMock,
    mock_ai: MagicMock,
    mock_update_failed: MagicMock,
) -> None:
    mock_verify_auth.return_value = CallerIdentity("user_test_123", "jwt_token")
    mock_get_resume.return_value = {"$id": "res_1", "storage_file_id": "file_1"}
    mock_get_job.return_value = {"$id": "job_1"}
    mock_get_reqs.return_value = []
    mock_download_pdf.return_value = b"%PDF"
    mock_extract_pdf.return_value = ExtractionResult(
        status=ExtractionStatus.SUCCESS,
        page_count=1,
        full_text="Valid resume content with plenty of text.",
        char_count=45,
    )
    mock_create_analysis.return_value = "analysis_to_fail"
    mock_ai.side_effect = AnalysisValidationError("Schema error")

    context = MockContext(body={"resumeId": "res_1", "jobId": "job_1"})
    response = main(context)

    assert response["status"] == 502
    assert response["data"]["error"] == "ANALYSIS_VALIDATION_ERROR"
    mock_update_failed.assert_called_once()
    assert mock_update_failed.call_args[0][4] == "ANALYSIS_VALIDATION_ERROR"
