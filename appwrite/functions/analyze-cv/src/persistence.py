"""
Persistence layer for analyze-cv Function.

Writes analysis records, requirement matches, and recommendations to Appwrite TablesDB.
Enforces explicit per-row owner permissions for the authenticated caller.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from datetime import UTC, datetime

from appwrite.client import Client
from appwrite.id import ID
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.services.databases import Databases

from src.schemas import (
    RecommendationItem,
    RequirementMatchResult,
    ScoringBreakdown,
)
from src.scoring import normalize_match_score

logger = logging.getLogger("analyze_cv.persistence")


def _get_owner_permissions(user_id: str) -> list[str]:
    """Generate explicit owner-only row permissions matching Phase 3 security model."""
    user_role = Role.user(user_id)
    return [
        Permission.read(user_role),
        Permission.update(user_role),
        Permission.delete(user_role),
    ]


def create_analysis_record(
    client: Client,
    database_id: str,
    user_id: str,
    resume_id: str,
    job_id: str,
    scoring_version: str = "1.0",
) -> str:
    """
    Create initial analyses row with 'processing' status.

    Returns:
        Generated analysis record ID.
    """
    databases = Databases(client)
    analysis_id = ID.unique()
    permissions = _get_owner_permissions(user_id)

    databases.create_document(
        database_id,
        "analyses",
        analysis_id,
        data={
            "user_id": user_id,
            "resume_id": resume_id,
            "job_id": job_id,
            "status": "processing",
            "scoring_version": scoring_version,
        },
        permissions=permissions,
    )
    return analysis_id


def update_analysis_completed(
    client: Client,
    database_id: str,
    analysis_id: str,
    user_id: str,
    breakdown: ScoringBreakdown,
    model_id: str,
) -> None:
    """Update analyses record with final scores and 'completed' status."""
    databases = Databases(client)
    permissions = _get_owner_permissions(user_id)

    databases.update_document(
        database_id,
        "analyses",
        analysis_id,
        data={
            "status": "completed",
            "compatibility_score": breakdown.overall_score,
            "ats_score": breakdown.ats_score,
            "requirement_coverage": breakdown.requirement_coverage,
            "model_id": model_id,
            "completed_at": datetime.now(UTC).isoformat(),
        },
        permissions=permissions,
    )


def update_analysis_failed(
    client: Client,
    database_id: str,
    analysis_id: str,
    user_id: str,
    error_code: str,
) -> None:
    """Update analyses record with safe error code and 'failed' status."""
    databases = Databases(client)
    permissions = _get_owner_permissions(user_id)

    try:
        databases.update_document(
            database_id,
            "analyses",
            analysis_id,
            data={
                "status": "failed",
                "error_code": error_code,
                "completed_at": datetime.now(UTC).isoformat(),
            },
            permissions=permissions,
        )
    except Exception as exc:  # noqa: BLE001 - best effort cleanup
        logger.error("Failed to mark analysis %s as failed: %s", analysis_id, exc)


def save_requirement_matches(
    client: Client,
    database_id: str,
    analysis_id: str,
    user_id: str,
    matches: Sequence[RequirementMatchResult],
) -> None:
    """Persist structured requirement matches."""
    databases = Databases(client)
    permissions = _get_owner_permissions(user_id)

    for match in matches:
        match_id = ID.unique()
        score = normalize_match_score(match.status)

        data = {
            "analysis_id": analysis_id,
            "requirement_id": match.requirement_id,
            "status": match.status,
            "match_score": score,
            "evidence": (match.evidence or "")[:2000],
            "source_section": (match.source_section or "")[:200],
            "explanation": (match.explanation or "")[:1000],
        }
        if match.source_page is not None and match.source_page > 0:
            data["source_page"] = match.source_page

        databases.create_document(
            database_id,
            "requirement_matches",
            match_id,
            data=data,
            permissions=permissions,
        )


def save_recommendations(
    client: Client,
    database_id: str,
    analysis_id: str,
    user_id: str,
    recommendations: Sequence[RecommendationItem],
) -> None:
    """Persist actionable recommendations."""
    databases = Databases(client)
    permissions = _get_owner_permissions(user_id)

    for rec in recommendations:
        rec_id = ID.unique()
        databases.create_document(
            database_id,
            "recommendations",
            rec_id,
            data={
                "analysis_id": analysis_id,
                "category": rec.category[:60],
                "priority": rec.priority,
                "title": rec.title[:200],
                "description": rec.description[:2000],
                "suggested_action": (rec.suggested_action or "")[:1000],
            },
            permissions=permissions,
        )
