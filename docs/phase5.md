# Phase 5 Building Manual — Gemini Integration and Appwrite Function

**Project:** CVMatch AI  
**Phase:** 5 — Gemini Integration and Appwrite Function  
**Function Name:** `analyze-cv`  
**Function ID:** `6afb06d2000dc82cad3e`  
**Status:** Implemented and Tested  
**Prerequisites:** Phase 1–3 Appwrite Data Foundation, Phase 4 Python Core

---

## 1. Executive Summary

Phase 5 implements the trusted backend analysis engine for **CVMatch AI**. It bridges the private document storage and data models from Phase 3 with the independent PDF extraction engine from Phase 4, using Google Gemini 2.0 (`google-genai` SDK) to evaluate candidate qualifications against structured job requirements, followed by deterministic scoring and ATS assessment in Python.

Key architectural boundaries:
- **Zero Frontend Secrets:** No Gemini API keys or privileged Appwrite keys are visible to client applications.
- **Strict User Authentication:** User identity is extracted from verified runtime headers (`x-appwrite-user-id`, `x-appwrite-user-jwt`). A client-supplied `userId` is never trusted.
- **Resource Ownership Verification:** Every resume, job, and requirement is checked for ownership before any document or AI processing takes place.
- **Deterministic Scoring:** AI models classify evidence; Python calculates all scores, weight redistributions, and coverage metrics deterministically.
- **Row-Level Security:** All output records (`analyses`, `requirement_matches`, `recommendations`) are written with explicit owner-scoped permissions.
- **Safe Error Boundary:** All errors return safe, non-sensitive enum codes (`ACCESS_DENIED`, `RESUME_NOT_FOUND`, `JOB_NOT_FOUND`, `INVALID_FILE`, `PDF_TEXT_NOT_FOUND`, `AI_RATE_LIMIT`, `AI_PROVIDER_ERROR`, `ANALYSIS_VALIDATION_ERROR`, `INTERNAL_ERROR`). No internal file paths, stack traces, or document contents are ever leaked.

---

## 2. Function Architecture

The `analyze-cv` function is structured as a modular package under `appwrite/functions/analyze-cv/src/`:

```text
appwrite/functions/analyze-cv/src/
├── main.py           # Orchestrator handling context, dispatch, and global error boundaries
├── config.py         # Type-safe configuration loader with environment variable validation
├── auth.py           # Caller identity extraction from x-appwrite-user-id and x-appwrite-user-jwt
├── data.py           # User-scoped and server-scoped Appwrite SDK clients, ownership checks
├── schemas.py        # Pydantic v2 validation models for requests, Gemini outputs, and scoring
├── gemini.py         # google-genai client wrapper with prompt injection defense and retries
├── scoring.py        # Deterministic scoring, category alias mapping, and weight redistribution
├── ats.py            # Objective ATS readability, layout, and keyword alignment evaluation
├── persistence.py    # Database row creation and updates with owner permissions
└── exceptions.py     # Safe domain exception hierarchy
```

### Execution Lifecycle

```text
[Client Request: resumeId, jobId]
         │
         ▼
[1. Request Parsing & Validation] (Pydantic AnalysisRequest)
         │
         ▼
[2. Caller Identity Verification] (x-appwrite-user-id + x-appwrite-user-jwt)
         │
         ▼
[3. Metadata Ownership Checks] (resumes & jobs user_id == caller_user_id)
         │
         ▼
[4. Download Private PDF] (Server Client -> Storage bucket 'resumes')
         │
         ▼
[5. PDF Text Extraction] (cvmatch_core -> ExtractionResult)
         │ (Status == NO_TEXT? -> Fail 422 PDF_TEXT_NOT_FOUND)
         ▼
[6. Initial Analyses Row Created] (Status: 'processing')
         │
         ▼
[7. Gemini AI Evaluation] (google-genai + structured JSON schema)
         │ (Extracts skills, experience, requirement matches, recommendations)
         ▼
[8. Deterministic Python Scoring] (Normalize match scores, category weights, ATS)
         │
         ▼
[9. Persistence with Row Security] (analyses: completed, matches, recommendations)
         │
         ▼
[200 OK: analysisId, status: completed]
```

---

## 3. Data Model & Appwrite Setup

Phase 5 requires three new tables in the `cvmatch` database:

### 3.1 Table: `analyses`

| Column | Type | Required | Constraints / Values |
|---|---|---|---|
| `user_id` | String | Yes | Size: 36 |
| `resume_id` | String | Yes | Size: 36 |
| `job_id` | String | Yes | Size: 36 |
| `status` | Enum | Yes | `queued`, `processing`, `completed`, `failed` |
| `compatibility_score` | Float | No | Min: 0.0, Max: 100.0 |
| `ats_score` | Float | No | Min: 0.0, Max: 100.0 |
| `requirement_coverage` | Float | No | Min: 0.0, Max: 1.0 |
| `scoring_version` | String | Yes | Size: 20, Default: `"1.0"` |
| `model_id` | String | No | Size: 100 |
| `error_code` | String | No | Size: 60 |
| `completed_at` | String | No | Size: 32 (ISO 8601) |

- **Row Security:** Enabled.
- **Table Permissions:** `Create` to role `Users`.
- **Row Permissions:** `read("user:{user_id}")`, `update("user:{user_id}")`, `delete("user:{user_id}")`.
- **Indexes:** `user_id` (key, ASC), `resume_id` (key, ASC), `job_id` (key, ASC), `status` (key, ASC).

### 3.2 Table: `requirement_matches`

| Column | Type | Required | Constraints / Values |
|---|---|---|---|
| `analysis_id` | String | Yes | Size: 36 |
| `requirement_id` | String | Yes | Size: 36 |
| `status` | Enum | Yes | `matched`, `partially_matched`, `not_demonstrated`, `explicitly_missing` |
| `match_score` | Float | Yes | Values: `1.0`, `0.5`, `0.0` |
| `evidence` | String | No | Size: 2000 |
| `source_section` | String | No | Size: 200 |
| `source_page` | Integer | No | Min: 1 |
| `explanation` | String | No | Size: 1000 |

- **Row Security:** Enabled.
- **Table Permissions:** `Create` to role `Users`.
- **Row Permissions:** Inherited from analysis owner (`user:{user_id}`).
- **Indexes:** `analysis_id` (key, ASC), `requirement_id` (key, ASC).

### 3.3 Table: `recommendations`

| Column | Type | Required | Constraints / Values |
|---|---|---|---|
| `analysis_id` | String | Yes | Size: 36 |
| `category` | String | Yes | Size: 60 |
| `priority` | Integer | Yes | Range: 1–5 |
| `title` | String | Yes | Size: 200 |
| `description` | String | Yes | Size: 2000 |
| `suggested_action` | String | No | Size: 1000 |

- **Row Security:** Enabled.
- **Table Permissions:** `Create` to role `Users`.
- **Row Permissions:** Inherited from analysis owner (`user:{user_id}`).
- **Indexes:** `analysis_id` (key, ASC), `priority` (key, ASC).

---

## 4. Deterministic Scoring Methodology

The scoring engine implements the rules defined in `instruction.md` §8:

### 4.1 Match Status Values & Weights

Gemini assesses evidence and classifies each requirement into one of four states. Python then normalizes the score authoritatively:

| Status | Numeric Value | Meaning |
|---|---|---|
| `matched` | **1.0** | Explicit evidence in CV satisfies requirement |
| `partially_matched` | **0.5** | Related or partial evidence exists, but requirement not fully proven |
| `not_demonstrated` | **0.0** | CV contains insufficient evidence to confirm qualification |
| `explicitly_missing` | **0.0** | Candidate explicitly notes absence of qualification |

### 4.2 Standard Category Base Weights (Sum = 100)

1. **Required technical skills:** 30%
2. **Relevant experience:** 20%
3. **Education and qualifications:** 15%
4. **Relevant projects:** 15%
5. **Responsibilities alignment:** 10%
6. **Preferred skills:** 10%

### 4.3 Missing Category Policy (Non-Inflation Rule)

To prevent misleading score inflation on sparse job descriptions, category base weights are strictly preserved without redistribution:
- If a job does not define any requirements in a given category, that category contributes `0.0` points to the compatibility score.
- The compatibility score is calculated as the sum of points earned across present categories, bounded between `0.0` and `100.0`:
$$\text{Compatibility Score} = \sum_{c \in \text{Present Categories}} (\text{Average Match Score}_c \times \text{Base Weight}_c)$$
- To inform the frontend when a job description is incomplete, the engine computes diagnostic metadata:
  - `total_evaluable_weight`: Sum of base weights of categories with defined requirements.
  - `is_sparse_job`: Flagged as `True` if `total_evaluable_weight < 50.0`.
  - `missing_categories`: List of categories with no defined requirements.

### 4.4 Requirement Coverage

Requirement coverage is kept strictly separate from the compatibility score:
$$\text{Coverage} = \frac{\text{matched count} \times 1.0 + \text{partially matched count} \times 0.5}{\text{total requirements count}}$$

---

## 5. Security & Prompt-Injection Defense

1. **Untrusted Data Boundary:** Both CV text and job descriptions are marked as `DATA ONLY` within clear delimiters. The system prompt instructs Gemini to never follow instructions, commands, or prompts embedded within candidate text.
2. **Zero Knowledge Leakage:** Model is forbidden from outputting system prompts, developer instructions, or internal secrets.
3. **Safe User Messages:** Failures return safe, user-friendly messages without exposing database IDs, file paths, or stack traces.
4. **No CV Text in Logs:** Function logs omit raw candidate text, job descriptions, and personal identifiable information.

---

## 6. Verification & Test Suite

All 70 unit and integration tests run offline without external network or API dependencies:

- `test_config.py` (5 tests): Configuration loading and validation.
- `test_auth.py` (10 tests): Caller identity extraction, case-insensitivity, and Account API verification.
- `test_schemas.py` (7 tests): Pydantic validation and round-trip serialization.
- `test_scoring.py` (8 tests): Deterministic non-inflating scoring, sparse job flags, and boundaries.
- `test_ats.py` (4 tests): ATS readability and formatting scoring.
- `test_gemini.py` (11 tests): AI mock tests for rate limits, retries, errors, and explicit timeouts.
- `test_data.py` (11 tests): Appwrite data operations and ownership checks.
- `test_persistence.py` (5 tests): Appwrite row persistence with owner permissions.
- `test_main.py` (9 tests): End-to-end integration and error boundary handling.

Total tests passing: **70 function tests + 56 python_core tests = 126 tests**.
Ruff checks and formatting: **100% clean**.
