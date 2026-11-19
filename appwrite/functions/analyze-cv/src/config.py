"""
Configuration loader and validator for analyze-cv Appwrite Function.

Reads and validates environment variables at startup.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    """Immutable runtime configuration."""

    gemini_api_key: str
    gemini_model: str
    appwrite_api_key: str
    appwrite_endpoint: str
    appwrite_project_id: str
    database_id: str
    resumes_bucket_id: str
    scoring_version: str = "1.0"


def load_config(env: Mapping[str, str] | None = None) -> Config:
    """
    Load and validate environment configuration.

    Args:
        env: Optional mapping of environment variables. Defaults to os.environ.

    Returns:
        Validated immutable Config instance.

    Raises:
        RuntimeError: If any required environment variable is missing or blank.
    """
    source = os.environ if env is None else env

    missing: list[str] = []

    gemini_api_key = source.get("GEMINI_API_KEY", "").strip()
    if not gemini_api_key:
        missing.append("GEMINI_API_KEY")

    gemini_model = source.get("GEMINI_MODEL", "gemini-2.0-flash").strip()
    if not gemini_model:
        gemini_model = "gemini-2.0-flash"

    appwrite_api_key = source.get("APPWRITE_API_KEY", "").strip()
    if not appwrite_api_key:
        missing.append("APPWRITE_API_KEY")

    # Appwrite runtime provides APPWRITE_FUNCTION_API_ENDPOINT or APPWRITE_FUNCTION_ENDPOINT
    endpoint = (
        source.get("APPWRITE_FUNCTION_API_ENDPOINT", "").strip()
        or source.get("APPWRITE_FUNCTION_ENDPOINT", "").strip()
        or source.get("APPWRITE_ENDPOINT", "").strip()
    )
    if not endpoint:
        missing.append("APPWRITE_FUNCTION_API_ENDPOINT")

    project_id = (
        source.get("APPWRITE_FUNCTION_PROJECT_ID", "").strip()
        or source.get("APPWRITE_PROJECT_ID", "").strip()
    )
    if not project_id:
        missing.append("APPWRITE_FUNCTION_PROJECT_ID")

    database_id = source.get("APPWRITE_DATABASE_ID", "cvmatch").strip() or "cvmatch"
    resumes_bucket_id = (
        source.get("APPWRITE_RESUMES_BUCKET_ID", "resumes").strip() or "resumes"
    )

    if missing:
        raise RuntimeError(
            f"Missing required environment variables for analyze-cv: {', '.join(sorted(missing))}"
        )

    return Config(
        gemini_api_key=gemini_api_key,
        gemini_model=gemini_model,
        appwrite_api_key=appwrite_api_key,
        appwrite_endpoint=endpoint,
        appwrite_project_id=project_id,
        database_id=database_id,
        resumes_bucket_id=resumes_bucket_id,
        scoring_version="1.0",
    )
