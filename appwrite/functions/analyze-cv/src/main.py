"""
analyze-cv Appwrite Function Entrypoint.

Coordinates the end-to-end CV analysis workflow:
1. Validates authenticated caller and session JWT.
2. Retrieves and verifies ownership of the private CV and job.
3. Downloads the PDF and extracts text using cvmatch_core.
4. Invokes Google Gemini with structured Pydantic output.
5. Deterministically calculates scores and ATS indicators.
6. Persists analysis results, requirement matches, and recommendations.
7. Enforces per-row owner security and returns safe status codes.
"""

from __future__ import annotations

import logging
import os
import sys
from typing import Any

# Ensure vendored dependencies are available in search path
_vendor_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "vendor"))
if os.path.isdir(_vendor_path) and _vendor_path not in sys.path:
    sys.path.insert(0, _vendor_path)

from cvmatch_core.exceptions import CVMatchCoreError
from cvmatch_core.models.extraction import ExtractionStatus
from cvmatch_core.pdf.extractor import extract_pdf

from src.auth import extract_caller_identity, verify_caller_identity
from src.config import Config, load_config
from src.data import (
    download_resume_pdf,
    get_job,
    get_job_requirements,
    get_resume,
    make_server_client,
    make_user_client,
    update_resume_extraction_status,
)
from src.exceptions import (
    AnalysisFunctionError,
    InvalidFileError,
    PdfTextNotFoundError,
)
from src.gemini import analyze_cv_with_gemini
from src.persistence import (
    create_analysis_record,
    save_recommendations,
    save_requirement_matches,
    update_analysis_completed,
    update_analysis_failed,
)
from src.schemas import AnalysisRequest
from src.scoring import calculate_scoring_breakdown

logger = logging.getLogger("analyze_cv")


def _parse_request(body: Any) -> AnalysisRequest:
    """Parse and validate input request payload."""
    if isinstance(body, dict):
        return AnalysisRequest.model_validate(body)
    if isinstance(body, str):
        return AnalysisRequest.model_validate_json(body)
    if isinstance(body, (bytes, bytearray)):
        return AnalysisRequest.model_validate_json(body.decode("utf-8"))
    raise ValueError("Request body must be a valid JSON object or string.")


def main(context: Any) -> Any:
    """
    Appwrite Function handler.

    Args:
        context: Appwrite runtime execution context containing req, res, log, error.
    """
    analysis_id: str | None = None
    caller_user_id: str | None = None
    server_client: Any = None
    config: Config | None = None

    try:
        # 1. Parse and validate input request payload
        try:
            req_body = getattr(context.req, "body", None)
            if req_body is None:
                req_body = getattr(context.req, "body_json", None)
            if req_body is None:
                req_body = getattr(context.req, "body_raw", None)

            analysis_request = _parse_request(req_body)
        except Exception as parse_err:  # noqa: BLE001 - parse boundary
            context.error(f"Malformed request body: {parse_err}")
            return context.res.json(
                {
                    "error": "INTERNAL_ERROR",
                    "message": "Invalid request payload. resumeId and jobId are required.",
                },
                400,
            )

        # 2. Extract and preliminary-check execution headers
        headers = getattr(context.req, "headers", {}) or {}
        preliminary_identity = extract_caller_identity(headers)

        # 3. Load runtime configuration
        config = load_config()

        # 4. Initialize clients
        user_client = make_user_client(
            preliminary_identity.user_jwt,
            config.appwrite_endpoint,
            config.appwrite_project_id,
        )
        server_client = make_server_client(
            config.appwrite_api_key,
            config.appwrite_endpoint,
            config.appwrite_project_id,
        )

        # Independently verify JWT session and subject alignment via Account API
        identity = verify_caller_identity(headers, user_client)
        caller_user_id = identity.user_id

        # 5. Fetch and ownership-verify resume metadata
        resume_doc = get_resume(
            user_client,
            config.database_id,
            analysis_request.resume_id,
            identity.user_id,
        )
        file_id = resume_doc.get("storage_file_id")
        if not file_id:
            raise InvalidFileError("Resume metadata is missing storage file reference.")

        # 6. Fetch and ownership-verify job opportunity
        job_doc = get_job(
            user_client,
            config.database_id,
            analysis_request.job_id,
            identity.user_id,
        )
        job_title = job_doc.get("title", "")
        job_description = job_doc.get("description", "")
        job_responsibilities = str(job_doc.get("responsibilities", ""))

        # 7. Fetch structured job requirements
        requirements = get_job_requirements(
            user_client,
            config.database_id,
            analysis_request.job_id,
        )

        # 8. Download private PDF bytes from Storage
        pdf_bytes = download_resume_pdf(
            server_client,
            config.resumes_bucket_id,
            file_id,
        )

        # 9. Extract and validate PDF text with cvmatch_core
        try:
            extraction = extract_pdf(
                pdf_bytes,
                original_filename=resume_doc.get("original_filename"),
            )
        except CVMatchCoreError as core_err:
            raise InvalidFileError(
                f"Document validation failed: {core_err.message}"
            ) from core_err
        except Exception as exc:
            context.error(f"Unexpected extraction error: {exc}")
            raise InvalidFileError("Failed to process PDF document.") from exc

        if extraction.status == ExtractionStatus.NO_TEXT:
            raise PdfTextNotFoundError()
        if (
            extraction.status != ExtractionStatus.SUCCESS
            or not extraction.has_usable_text()
        ):
            raise InvalidFileError(
                extraction.error_message or "Failed to extract text from PDF document."
            )

        # 10. Create initial analyses row with 'processing' status
        analysis_id = create_analysis_record(
            server_client,
            config.database_id,
            identity.user_id,
            analysis_request.resume_id,
            analysis_request.job_id,
            config.scoring_version,
        )

        # 11. Run structured AI analysis with Gemini
        ai_output = analyze_cv_with_gemini(
            cv_text=extraction.full_text,
            job_title=job_title,
            job_description=job_description,
            job_responsibilities=job_responsibilities,
            requirements=requirements,
            api_key=config.gemini_api_key,
            model_id=config.gemini_model,
        )

        # 12. Build requirement metadata map for deterministic scoring
        requirements_meta = {
            str(req.get("$id", req.get("id", ""))): req for req in requirements
        }

        # 13. Calculate deterministic scores in Python
        breakdown = calculate_scoring_breakdown(
            requirement_matches=ai_output.requirement_matches,
            requirements_meta=requirements_meta,
            ats_signals=ai_output.ats_signals,
            has_usable_text=True,
            char_count=extraction.char_count,
            page_count=extraction.page_count,
            scoring_version=config.scoring_version,
        )

        # 14. Persist matches and recommendations
        save_requirement_matches(
            server_client,
            config.database_id,
            analysis_id,
            identity.user_id,
            ai_output.requirement_matches,
        )

        save_recommendations(
            server_client,
            config.database_id,
            analysis_id,
            identity.user_id,
            ai_output.recommendations,
        )

        # 15. Update analyses record to 'completed'
        update_analysis_completed(
            server_client,
            config.database_id,
            analysis_id,
            identity.user_id,
            breakdown,
            config.gemini_model,
        )

        # 16. Update resume metadata (page count and status)
        update_resume_extraction_status(
            server_client,
            config.database_id,
            analysis_request.resume_id,
            extraction.page_count,
            "completed",
        )

        # 17. Return clean success response
        return context.res.json(
            {
                "analysisId": analysis_id,
                "status": "completed",
            },
            200,
        )

    except AnalysisFunctionError as fn_err:
        context.error(
            f"Analysis failed with safe error {fn_err.error_code}: {fn_err.message}"
        )
        if analysis_id and caller_user_id and server_client and config:
            update_analysis_failed(
                server_client,
                config.database_id,
                analysis_id,
                caller_user_id,
                fn_err.error_code,
            )
        return context.res.json(
            {
                "error": fn_err.error_code,
                "message": fn_err.message,
            },
            fn_err.status_code,
        )

    except Exception as unexpected:  # noqa: BLE001 - top-level cloud function error boundary
        context.error(f"Unhandled error in analyze-cv function: {unexpected}")
        if analysis_id and caller_user_id and server_client and config:
            update_analysis_failed(
                server_client,
                config.database_id,
                analysis_id,
                caller_user_id,
                "INTERNAL_ERROR",
            )
        return context.res.json(
            {
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred during CV analysis.",
            },
            500,
        )
