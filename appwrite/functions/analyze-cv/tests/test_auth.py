"""Unit tests for auth module."""

from unittest.mock import MagicMock, patch

import pytest
from appwrite.exception import AppwriteException
from src.auth import CallerIdentity, extract_caller_identity, verify_caller_identity
from src.exceptions import AccessDeniedError


def test_extract_caller_identity_valid() -> None:
    headers = {
        "x-appwrite-user-id": "user_abc123",
        "x-appwrite-user-jwt": "jwt_token_sample",
    }
    identity = extract_caller_identity(headers)
    assert isinstance(identity, CallerIdentity)
    assert identity.user_id == "user_abc123"
    assert identity.user_jwt == "jwt_token_sample"


def test_extract_caller_identity_case_insensitive() -> None:
    headers = {
        "X-Appwrite-User-Id": "user_abc123",
        "X-Appwrite-User-Jwt": "jwt_token_sample",
    }
    identity = extract_caller_identity(headers)
    assert identity.user_id == "user_abc123"
    assert identity.user_jwt == "jwt_token_sample"


def test_extract_caller_identity_missing_user_id() -> None:
    headers = {
        "x-appwrite-user-jwt": "jwt_token_sample",
    }
    with pytest.raises(AccessDeniedError):
        extract_caller_identity(headers)


def test_extract_caller_identity_missing_jwt() -> None:
    headers = {
        "x-appwrite-user-id": "user_abc123",
    }
    with pytest.raises(AccessDeniedError):
        extract_caller_identity(headers)


def test_extract_caller_identity_empty_values() -> None:
    headers = {
        "x-appwrite-user-id": "   ",
        "x-appwrite-user-jwt": "",
    }
    with pytest.raises(AccessDeniedError):
        extract_caller_identity(headers)


def test_extract_caller_identity_none_values() -> None:
    headers = {
        "x-appwrite-user-id": None,
        "x-appwrite-user-jwt": None,
    }
    with pytest.raises(AccessDeniedError):
        extract_caller_identity(headers)


@patch("src.auth.Account")
def test_verify_caller_identity_success(mock_account_cls: MagicMock) -> None:
    mock_account = MagicMock()
    mock_account.get.return_value = {"$id": "user_abc123", "email": "user@example.com"}
    mock_account_cls.return_value = mock_account

    headers = {
        "x-appwrite-user-id": "user_abc123",
        "x-appwrite-user-jwt": "valid_token",
    }
    mock_client = MagicMock()
    identity = verify_caller_identity(headers, mock_client)

    assert identity.user_id == "user_abc123"
    assert identity.user_jwt == "valid_token"
    mock_account.get.assert_called_once()


@patch("src.auth.Account")
def test_verify_caller_identity_mismatched_user_id(mock_account_cls: MagicMock) -> None:
    mock_account = MagicMock()
    # Token belongs to attacker_user, but header claims victim_user
    mock_account.get.return_value = {
        "$id": "attacker_user",
        "email": "attacker@example.com",
    }
    mock_account_cls.return_value = mock_account

    headers = {
        "x-appwrite-user-id": "victim_user",
        "x-appwrite-user-jwt": "attacker_token",
    }
    mock_client = MagicMock()
    with pytest.raises(AccessDeniedError) as exc_info:
        verify_caller_identity(headers, mock_client)
    assert "identity mismatch" in str(exc_info.value).lower()


@patch("src.auth.Account")
def test_verify_caller_identity_invalid_jwt(mock_account_cls: MagicMock) -> None:
    mock_account = MagicMock()
    mock_account.get.side_effect = AppwriteException(
        "Invalid token signature", 401, "user_jwt_invalid"
    )
    mock_account_cls.return_value = mock_account

    headers = {
        "x-appwrite-user-id": "user_123",
        "x-appwrite-user-jwt": "invalid_token",
    }
    mock_client = MagicMock()
    with pytest.raises(AccessDeniedError) as exc_info:
        verify_caller_identity(headers, mock_client)
    assert "invalid or expired" in str(exc_info.value).lower()


@patch("src.auth.Account")
def test_verify_caller_identity_expired_jwt(mock_account_cls: MagicMock) -> None:
    mock_account = MagicMock()
    mock_account.get.side_effect = AppwriteException(
        "Token expired", 401, "user_jwt_expired"
    )
    mock_account_cls.return_value = mock_account

    headers = {
        "x-appwrite-user-id": "user_123",
        "x-appwrite-user-jwt": "expired_token",
    }
    mock_client = MagicMock()
    with pytest.raises(AccessDeniedError) as exc_info:
        verify_caller_identity(headers, mock_client)
    assert "invalid or expired" in str(exc_info.value).lower()
