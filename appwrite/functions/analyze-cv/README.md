# analyze-cv — Appwrite Python Function

Server-side Python function powering **CVMatch AI**'s core analysis engine.

## Overview

The `analyze-cv` function coordinates the end-to-end analysis workflow:
1. Validates the calling user's verified identity and short-lived session JWT from execution context headers (`x-appwrite-user-id`, `x-appwrite-user-jwt`).
2. Reads CV and job metadata from Appwrite TablesDB and validates ownership.
3. Retrieves the private CV PDF from Appwrite Storage (`resumes` bucket) using server-side storage access.
4. Validates the PDF and extracts structured text using `cvmatch_core` (PyMuPDF).
5. Invokes Google Gemini API with structured JSON output enforcement (Pydantic v2).
6. Executes deterministic scoring and ATS evaluation in Python (scores are never computed by AI).
7. Persists `analyses`, `requirement_matches`, and `recommendations` records with strict owner-scoped permissions.
8. Returns a safe result containing the generated `analysisId`.

## Runtime Requirements

- **Runtime:** Python 3.12 (`python-3.12`)
- **Appwrite Cloud:** Works with Appwrite Cloud Functions runtime (1.4+)
- **AI Provider:** Google Gemini API (`gemini-2.0-flash` default)

## Directory Structure

```text
analyze-cv/
├── .env.example              # Server environment variables template
├── requirements.txt          # Python dependencies
├── README.md                 # This file
├── src/
│   ├── __init__.py
│   ├── main.py               # Function entrypoint orchestrator
│   ├── config.py             # Environment configuration loader
│   ├── auth.py               # Caller identity and JWT extractor
│   ├── data.py               # Appwrite database and storage operations
│   ├── schemas.py            # Pydantic v2 validation models
│   ├── gemini.py             # Google GenAI client with prompt-injection defense
│   ├── scoring.py            # Deterministic compatibility scoring
│   ├── ats.py                # ATS readability and formatting evaluator
│   ├── persistence.py        # Appwrite row persistence with owner permissions
│   └── exceptions.py         # Safe error hierarchy
├── vendor/                   # Vendored local packages (cvmatch_core)
└── tests/                    # Comprehensive unit tests (mocked offline)
    ├── test_config.py
    ├── test_auth.py
    ├── test_schemas.py
    ├── test_scoring.py
    ├── test_ats.py
    ├── test_gemini.py
    ├── test_data.py
    ├── test_persistence.py
    └── test_main.py
```

## Environment Variables

Configure these in the Appwrite Console under **Function Settings → Variables & Secrets**:

| Variable | Description | Example |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key from Google AI Studio | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini model identifier | `gemini-2.0-flash` |
| `APPWRITE_API_KEY` | Server API key (scopes: `databases.read/write`, `storage.read`) | `standard_...` |
| `APPWRITE_DATABASE_ID` | Appwrite Database ID | `cvmatch` |
| `APPWRITE_RESUMES_BUCKET_ID` | Private Resumes Bucket ID | `resumes` |

*Note: `APPWRITE_FUNCTION_API_ENDPOINT` and `APPWRITE_FUNCTION_PROJECT_ID` are injected automatically by the Appwrite Function runtime.*

## Local Testing

```bash
# From repository root with .venv active
PYTHONPATH=appwrite/functions/analyze-cv .venv/bin/pytest appwrite/functions/analyze-cv/tests/ -v
```

All 59 unit tests run offline without connecting to live cloud services or incurring Gemini API charges.
