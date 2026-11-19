"""
Appwrite data and storage access layer for analyze-cv Function.

Provides authenticated user-scoped reads and server-scoped operations.
Enforces explicit resource ownership verification for resumes and jobs.
"""

from __future__ import annotations

import logging
from typing import Any

from appwrite.client import Client
from appwrite.exception import AppwriteException
from appwrite.query import Query
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage

from src.exceptions import (
    AccessDeniedError,
    InternalError,
    JobNotFoundError,
    ResumeNotFoundError,
)

logger = logging.getLogger("analyze_cv.data")


def make_user_client(jwt: str, endpoint: str, project_id: str) -> Client:
    """Create an Appwrite Client scoped to the user session JWT."""
    client = Client()
    client.set_endpoint(endpoint)
    client.set_project(project_id)
    client.set_jwt(jwt)
    return client


def make_server_client(api_key: str, endpoint: str, project_id: str) -> Client:
    """Create an Appwrite Client using the privileged server API key."""
    client = Client()
    client.set_endpoint(endpoint)
    client.set_project(project_id)
    client.set_key(api_key)
    return client


def get_resume(
    client: Client,
    database_id: str,
    resume_id: str,
    expected_user_id: str,
) -> dict[str, Any]:
    """
    Fetch resume metadata and verify caller ownership.

    Raises:
        ResumeNotFoundError: If resume does not exist or user_id does not match caller.
        AccessDeniedError: If caller lacks permission to read the row.
    """
    databases = Databases(client)
    try:
        doc = databases.get_document(database_id, "resumes", resume_id)
    except AppwriteException as exc:
        if exc.code == 404:
            raise ResumeNotFoundError() from exc
        if exc.code in (401, 403):
            raise AccessDeniedError() from exc
        logger.error("Failed to read resume document %s: %s", resume_id, exc.message)
        raise InternalError("Database error reading resume.") from exc

    # Enforce explicit ownership check
    doc_user_id = doc.get("user_id")
    if doc_user_id != expected_user_id:
        logger.warning(
            "Resume ownership mismatch: document owner does not match caller."
        )
        raise ResumeNotFoundError()

    return doc


def download_resume_pdf(
    client: Client,
    bucket_id: str,
    file_id: str,
) -> bytes:
    """
    Download private PDF bytes from Appwrite Storage.

    Args:
        client: Storage-scoped client (typically server client with storage.read scope).
        bucket_id: Resumes bucket ID.
        file_id: Storage file ID.

    Returns:
        Raw PDF file bytes.

    Raises:
        ResumeNotFoundError: If file does not exist in storage.
        AccessDeniedError: If storage read is denied.
    """
    storage = Storage(client)
    try:
        content = storage.get_file_download(bucket_id, file_id)
        if isinstance(content, str):
            return content.encode("latin-1")
        return bytes(content)
    except AppwriteException as exc:
        if exc.code == 404:
            raise ResumeNotFoundError(
                "Private resume file not found in storage."
            ) from exc
        if exc.code in (401, 403):
            raise AccessDeniedError(
                "Access denied reading resume file from storage."
            ) from exc
        logger.error(
            "Failed to download file %s from bucket %s: %s",
            file_id,
            bucket_id,
            exc.message,
        )
        raise InternalError("Storage error retrieving PDF file.") from exc


def get_job(
    client: Client,
    database_id: str,
    job_id: str,
    expected_user_id: str,
) -> dict[str, Any]:
    """
    Fetch job opportunity metadata and verify caller ownership.

    Raises:
        JobNotFoundError: If job does not exist or user_id does not match caller.
        AccessDeniedError: If caller lacks permission to read the row.
    """
    databases = Databases(client)
    try:
        doc = databases.get_document(database_id, "jobs", job_id)
    except AppwriteException as exc:
        if exc.code == 404:
            raise JobNotFoundError() from exc
        if exc.code in (401, 403):
            raise AccessDeniedError() from exc
        logger.error("Failed to read job document %s: %s", job_id, exc.message)
        raise InternalError("Database error reading job.") from exc

    # Enforce explicit ownership check
    doc_user_id = doc.get("user_id")
    if doc_user_id != expected_user_id:
        logger.warning("Job ownership mismatch: document owner does not match caller.")
        raise JobNotFoundError()

    return doc


def get_job_requirements(
    client: Client,
    database_id: str,
    job_id: str,
) -> list[dict[str, Any]]:
    """
    Fetch structured requirements for a job.

    Returns:
        List of requirement document dicts.
    """
    databases = Databases(client)
    try:
        result = databases.list_documents(
            database_id,
            "job_requirements",
            queries=[
                Query.equal("job_id", job_id),
                Query.limit(100),
            ],
        )
        return result.get("documents", [])
    except AppwriteException as exc:
        logger.error(
            "Failed to list job requirements for job %s: %s", job_id, exc.message
        )
        raise InternalError("Database error retrieving job requirements.") from exc


def update_resume_extraction_status(
    client: Client,
    database_id: str,
    resume_id: str,
    page_count: int,
    extraction_status: str,
) -> None:
    """Update page count and extraction status on the resume record."""
    databases = Databases(client)
    try:
        databases.update_document(
            database_id,
            "resumes",
            resume_id,
            data={
                "page_count": page_count,
                "extraction_status": extraction_status,
            },
        )
    except AppwriteException as exc:
        # Non-fatal metadata update failure; log warning
        logger.warning("Failed to update resume extraction status: %s", exc)
