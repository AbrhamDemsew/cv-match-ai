"""Unit tests for data module (mocked Appwrite SDK)."""

from unittest.mock import MagicMock, patch

import pytest
from appwrite.exception import AppwriteException
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
    AccessDeniedError,
    JobNotFoundError,
    ResumeNotFoundError,
)


def test_make_clients() -> None:
    u_client = make_user_client("jwt_123", "https://endpoint/v1", "proj_123")
    assert u_client is not None

    s_client = make_server_client("key_secret", "https://endpoint/v1", "proj_123")
    assert s_client is not None


@patch("src.data.Databases")
def test_get_resume_success(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db.get_document.return_value = {
        "$id": "res_1",
        "user_id": "user_123",
        "storage_file_id": "file_abc",
    }
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    doc = get_resume(mock_client, "cvmatch", "res_1", "user_123")
    assert doc["$id"] == "res_1"
    assert doc["storage_file_id"] == "file_abc"


@patch("src.data.Databases")
def test_get_resume_ownership_mismatch(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db.get_document.return_value = {
        "$id": "res_1",
        "user_id": "other_user",
    }
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    with pytest.raises(ResumeNotFoundError):
        get_resume(mock_client, "cvmatch", "res_1", "user_123")


@patch("src.data.Databases")
def test_get_resume_not_found(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db.get_document.side_effect = AppwriteException(
        "Not found", 404, "document_not_found"
    )
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    with pytest.raises(ResumeNotFoundError):
        get_resume(mock_client, "cvmatch", "res_1", "user_123")


@patch("src.data.Databases")
def test_get_resume_access_denied(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db.get_document.side_effect = AppwriteException(
        "Denied", 401, "general_unauthorized_scope"
    )
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    with pytest.raises(AccessDeniedError):
        get_resume(mock_client, "cvmatch", "res_1", "user_123")


@patch("src.data.Storage")
def test_download_resume_pdf_success(mock_storage_cls: MagicMock) -> None:
    mock_storage = MagicMock()
    mock_storage.get_file_download.return_value = b"%PDF-1.4 test bytes"
    mock_storage_cls.return_value = mock_storage

    mock_client = MagicMock()
    data = download_resume_pdf(mock_client, "resumes", "file_123")
    assert data.startswith(b"%PDF-")


@patch("src.data.Storage")
def test_download_resume_pdf_not_found(mock_storage_cls: MagicMock) -> None:
    mock_storage = MagicMock()
    mock_storage.get_file_download.side_effect = AppwriteException("Not found", 404)
    mock_storage_cls.return_value = mock_storage

    mock_client = MagicMock()
    with pytest.raises(ResumeNotFoundError):
        download_resume_pdf(mock_client, "resumes", "file_123")


@patch("src.data.Databases")
def test_get_job_success(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db.get_document.return_value = {
        "$id": "job_1",
        "user_id": "user_123",
        "title": "Engineer",
    }
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    doc = get_job(mock_client, "cvmatch", "job_1", "user_123")
    assert doc["title"] == "Engineer"


@patch("src.data.Databases")
def test_get_job_ownership_mismatch(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db.get_document.return_value = {
        "$id": "job_1",
        "user_id": "other_user",
        "title": "Engineer",
    }
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    with pytest.raises(JobNotFoundError):
        get_job(mock_client, "cvmatch", "job_1", "user_123")


@patch("src.data.Databases")
def test_get_job_requirements_success(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db.list_documents.return_value = {
        "documents": [
            {"$id": "req_1", "description": "Python"},
            {"$id": "req_2", "description": "SQL"},
        ]
    }
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    reqs = get_job_requirements(mock_client, "cvmatch", "job_1")
    assert len(reqs) == 2
    assert reqs[0]["$id"] == "req_1"


@patch("src.data.Databases")
def test_update_resume_extraction_status(mock_db_cls: MagicMock) -> None:
    mock_db = MagicMock()
    mock_db_cls.return_value = mock_db

    mock_client = MagicMock()
    update_resume_extraction_status(mock_client, "cvmatch", "res_1", 2, "completed")
    mock_db.update_document.assert_called_once()
