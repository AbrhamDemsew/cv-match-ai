"""
Pydantic v2 schemas for the analyze-cv Appwrite Function.

Includes:
1. Input request model (AnalysisRequest)
2. Gemini structured output models (GeminiAnalysisOutput and sub-models)
3. Deterministic scoring output models (ScoringBreakdown, CategoryScore)
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

MatchStatus = Literal[
    "matched",
    "partially_matched",
    "not_demonstrated",
    "explicitly_missing",
]


class AnalysisRequest(BaseModel):
    """Payload sent by client to analyze-cv function."""

    model_config = ConfigDict(populate_by_name=True)

    resume_id: Annotated[
        str,
        Field(
            alias="resumeId",
            min_length=1,
            max_length=36,
            description="Appwrite resumes row ID",
        ),
    ]
    job_id: Annotated[
        str,
        Field(
            alias="jobId",
            min_length=1,
            max_length=36,
            description="Appwrite jobs row ID",
        ),
    ]


class CVSkill(BaseModel):
    """An individual skill identified in the CV with evidence."""

    name: str = Field(description="Name of the skill or technology")
    evidence: str | None = Field(
        default=None,
        description="Direct quote or supporting text from the CV",
    )
    section: str | None = Field(
        default=None,
        description="Section of the CV where the skill was found",
    )
    page: int | None = Field(
        default=None,
        ge=1,
        description="1-based page number where the skill was found",
    )


class CVWorkExperience(BaseModel):
    """A work history entry extracted from the CV."""

    title: str = Field(description="Job title or role")
    company: str | None = Field(
        default=None, description="Company or organization name"
    )
    start_date: str | None = Field(
        default=None, description="Start date as written in CV"
    )
    end_date: str | None = Field(default=None, description="End date as written in CV")
    responsibilities: list[str] = Field(
        default_factory=list,
        description="Key duties and responsibilities",
    )
    achievements: list[str] = Field(
        default_factory=list,
        description="Measurable achievements or key results",
    )


class CVEducation(BaseModel):
    """An educational credential extracted from the CV."""

    degree: str = Field(description="Degree, diploma, or certification name")
    institution: str | None = Field(default=None, description="Educational institution")
    year: str | None = Field(default=None, description="Year or date range completed")


class CVProject(BaseModel):
    """A project extracted from the CV."""

    name: str = Field(description="Project name or title")
    description: str | None = Field(
        default=None, description="Brief summary of the project"
    )
    technologies: list[str] = Field(
        default_factory=list,
        description="Technologies or tools used in the project",
    )


class CVProfile(BaseModel):
    """Structured CV profile extracted by Gemini."""

    professional_summary: str | None = Field(
        default=None,
        description="Executive or professional summary if present",
    )
    skills: list[CVSkill] = Field(
        default_factory=list,
        description="List of skills and technologies found in CV",
    )
    work_experience: list[CVWorkExperience] = Field(
        default_factory=list,
        description="Chronological or functional work experience",
    )
    education: list[CVEducation] = Field(
        default_factory=list,
        description="Educational qualifications",
    )
    certifications: list[str] = Field(
        default_factory=list,
        description="Professional certifications or licenses",
    )
    projects: list[CVProject] = Field(
        default_factory=list,
        description="Key projects demonstrated in CV",
    )


class RequirementMatchResult(BaseModel):
    """Assessment of one job requirement against evidence in the CV."""

    requirement_id: str = Field(
        description="Exact requirement ID matching the input job requirement",
    )
    status: MatchStatus = Field(
        description="Evidence status: matched, partially_matched, not_demonstrated, or explicitly_missing",
    )
    match_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Suggested match score; Python normalizes this authoritatively",
    )
    evidence: str | None = Field(
        default=None,
        description="Direct evidence quote or supporting excerpt from CV",
    )
    source_section: str | None = Field(
        default=None,
        description="CV section containing the evidence",
    )
    source_page: int | None = Field(
        default=None,
        ge=1,
        description="1-based page number of evidence",
    )
    explanation: str = Field(
        default="",
        description="Clear, concise rationale for the assigned status",
    )


class RecommendationItem(BaseModel):
    """Actionable, prioritized recommendation for improving alignment."""

    category: str = Field(
        description="Category: skills, experience, education, ats, wording, or projects",
    )
    priority: int = Field(
        ge=1,
        le=5,
        description="Priority order: 1 is highest priority",
    )
    title: str = Field(
        description="Short, specific recommendation headline",
    )
    description: str = Field(
        description="Detailed explanation with context",
    )
    suggested_action: str | None = Field(
        default=None,
        description="Concrete next step or rewording suggestion",
    )


class ATSSignals(BaseModel):
    """Document readability and ATS formatting signals observed in CV."""

    contact_section_present: bool = Field(
        default=True,
        description="Whether contact info section is detected and clearly structured",
    )
    date_format_consistent: bool = Field(
        default=True,
        description="Whether employment and education dates follow consistent format",
    )
    has_standard_section_headings: bool = Field(
        default=True,
        description="Whether standard headings like Experience, Skills, Education are used",
    )
    complex_layout_detected: bool = Field(
        default=False,
        description="Whether multi-column, table, or text-box parsing anomalies are suspected",
    )
    keyword_alignment_score: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Proportion of key job terms explicitly present in the CV text",
    )


class GeminiAnalysisOutput(BaseModel):
    """Full structured output expected from Gemini for CV + job analysis."""

    cv_profile: CVProfile = Field(
        description="Structured extraction of CV contents",
    )
    requirement_matches: list[RequirementMatchResult] = Field(
        default_factory=list,
        description="Assessment for each provided job requirement",
    )
    strengths: list[str] = Field(
        default_factory=list,
        description="Key alignment strengths identified in the CV",
    )
    improvement_areas: list[str] = Field(
        default_factory=list,
        description="Key gaps or opportunities for improvement",
    )
    recommendations: list[RecommendationItem] = Field(
        default_factory=list,
        description="Prioritized recommendations for tailoring and improving the CV",
    )
    ats_signals: ATSSignals = Field(
        default_factory=ATSSignals,
        description="ATS readability and structure signals",
    )


class CategoryScore(BaseModel):
    """Scoring component for a requirement category."""

    category: str
    weight: float = Field(ge=0.0, le=100.0)
    achieved: float = Field(ge=0.0, le=100.0)
    max_possible: float = Field(ge=0.0, le=100.0)


class ScoringBreakdown(BaseModel):
    """Comprehensive, deterministic scoring results calculated by Python."""

    overall_score: float = Field(ge=0.0, le=100.0)
    ats_score: float = Field(ge=0.0, le=100.0)
    requirement_coverage: float = Field(ge=0.0, le=1.0)
    category_scores: list[CategoryScore] = Field(default_factory=list)
    scoring_version: str = "1.0"
    matched_count: int = Field(default=0, ge=0)
    partially_matched_count: int = Field(default=0, ge=0)
    not_demonstrated_count: int = Field(default=0, ge=0)
    explicitly_missing_count: int = Field(default=0, ge=0)
    total_evaluable_weight: float = Field(
        default=100.0,
        ge=0.0,
        le=100.0,
        description="Sum of base weights for categories with defined requirements in this job",
    )
    is_sparse_job: bool = Field(
        default=False,
        description="Whether the job defines fewer than 3 categories or <60% evaluable weight",
    )
    missing_categories: list[str] = Field(
        default_factory=list,
        description="Standard categories absent from the job opportunity definition",
    )
