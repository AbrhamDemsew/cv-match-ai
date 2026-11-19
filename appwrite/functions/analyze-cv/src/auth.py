"""
Caller authentication and identity extraction for analyze-cv Appwrite Function.

Extracts caller identity from execution headers and verifies the session JWT
independently through Appwrite's authenticated Account API.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from appwrite.client import Client
from appwrite.exception import AppwriteException
from appwrite.services.account import Account

from src.exceptions import AccessDeniedError

logger = logging.getLogger("analyze_cv.auth")


@dataclass(frozen=True)
class CallerIdentity:
    """Verified identity of the authenticated user invoking the function."""

    user_id: str
    user_jwt: str


def extract_caller_identity(headers: Mapping[str, Any]) -> CallerIdentity:
    """
    Extract authenticated caller user ID and JWT from execution headers.

    Appwrite injects 'x-appwrite-user-id' and 'x-appwrite-user-jwt' into the
    execution context headers for authenticated client requests.

    Args:
        headers: Request headers mapping from execution context.

    Returns:
        CallerIdentity containing user ID and JWT.

    Raises:
        AccessDeniedError: If either header is missing, empty, or whitespace.
    """
    normalized = {
        str(k).lower(): str(v).strip() for k, v in headers.items() if v is not None
    }

    user_id = normalized.get("x-appwrite-user-id", "")
    user_jwt = normalized.get("x-appwrite-user-jwt", "")

    if not user_id or not user_jwt:
        raise AccessDeniedError(
            "Authentication required. Execution context missing verified user identity or JWT."
        )

    return CallerIdentity(user_id=user_id, user_jwt=user_jwt)


def verify_caller_identity(
    headers: Mapping[str, Any],
    user_client: Client,
) -> CallerIdentity:
    """
    Extract caller identity and independently verify the session JWT via Account API.

    Validates that:
    1. Headers contain non-empty user ID and JWT.
    2. The JWT is valid and not expired by calling Account(user_client).get().
    3. The account ID returned by Appwrite strictly matches x-appwrite-user-id.

    Args:
        headers: Request headers from execution context.
        user_client: Appwrite Client configured with the caller's JWT.

    Returns:
        CallerIdentity verified against Appwrite Auth.

    Raises:
        AccessDeniedError: If headers are missing, JWT is invalid or expired,
            or the token's authenticated user ID does not match the execution user ID.
    """
    identity = extract_caller_identity(headers)

    account_service = Account(user_client)
    try:
        account_data = account_service.get()
    except AppwriteException as exc:
        logger.warning(
            "Session JWT verification failed via Account API: %s (code %s)",
            exc.message,
            exc.code,
        )
        raise AccessDeniedError("Invalid or expired session token.") from exc
    except Exception as exc:
        logger.error(
            "Unexpected error during Account API identity verification: %s", exc
        )
        raise AccessDeniedError(
            "Authentication verification could not be completed."
        ) from exc

    verified_user_id = account_data.get("$id") or account_data.get("id")
    if not verified_user_id or verified_user_id != identity.user_id:
        logger.warning(
            "Identity mismatch: token subject (%s) does not match execution user (%s).",
            verified_user_id,
            identity.user_id,
        )
        raise AccessDeniedError(
            "Authentication identity mismatch. Session token does not match user identity."
        )

    return identity
