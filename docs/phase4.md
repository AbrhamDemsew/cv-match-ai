# Phase 4 Building Manual: Python Core and PDF Extraction

This manual provides instructions for building, installing, testing, and maintaining the **Phase 4 Python Core package (`cvmatch_core`)** within the **CVMatch AI** monorepo.

---

## 1. Overview and Architecture

`packages/python_core/` is an independent, reusable Python package that encapsulates:
- PDF byte-level validation (signature, size, page count, encryption, text availability).
- Page-by-page PDF text extraction using PyMuPDF.
- Clean text normalization (whitespace, line endings, character integrity).
- Structured Pydantic v2 data models for extraction outcomes.
- Predictable, secure exception hierarchy.

### Package Boundaries
- **Zero Appwrite dependencies:** The core package does not import or know about Appwrite SDKs or databases.
- **Zero Gemini/AI dependencies:** No prompt logic or LLM calls exist in this package; extraction is purely algorithmic and local.
- **Zero browser/React dependencies:** Clean separation of concern from `web/`.
- **Zero OCR in Phase 4:** Scanned or image-only documents return a structured `NO_TEXT` status rather than synthetic hallucinations.

---

## 2. Directory Structure

```text
packages/python_core/
├── pyproject.toml              # Project configuration, dependencies, and tools
├── README.md                   # Package overview and quickstart
├── cvmatch_core/
│   ├── __init__.py             # Package version
│   ├── config.py               # Configurable thresholds (ExtractionConfig)
│   ├── exceptions.py           # Secure exception hierarchy
│   ├── models/
│   │   ├── __init__.py
│   │   └── extraction.py       # Pydantic v2 models (ExtractionResult, PageResult)
│   └── pdf/
│       ├── __init__.py
│       ├── validator.py        # Raw byte validation
│       ├── extractor.py        # Orchestrated extraction pipeline
│       └── normalizer.py       # Deterministic text normalization
└── tests/
    ├── conftest.py             # Synthetic in-memory PDF fixtures (no real PII)
    ├── test_extraction_models.py # Pydantic schema validation tests
    ├── test_pdf_extractor.py   # Page count, formatting, and safety tests
    ├── test_pdf_validator.py   # Byte limits, format, and corruption tests
    └── test_text_normalizer.py # Whitespace, newline, and content preservation tests
```

---

## 3. Prerequisites

- **Operating System:** Linux (Ubuntu 24.04 LTS / 22.04 LTS tested), macOS, or Windows
- **Python:** 3.12 or newer
- **Virtual Environment:** Recommended at repo root (`.venv/`)

---

## 4. Setup and Installation

### Step 1: Initialize Virtual Environment
From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Step 2: Install `cvmatch-core` in Editable Mode
Install the package with all development and test tooling:

```bash
pip install -e "packages/python_core[dev]"
```

*Note: For networks where IPv6 is not routed, pip may require IPv4 resolution.*

---

## 5. Running Tests and Quality Checks

### Run Automated Tests with Pytest
```bash
.venv/bin/pytest packages/python_core/tests -v --cov=cvmatch_core
```

Expected result: 56 tests passing with >90% statement coverage.

### Run Code Formatting and Linting
```bash
# Check code style and formatting rules
.venv/bin/ruff check packages/python_core

# Format code automatically
.venv/bin/ruff format packages/python_core
```

---

## 6. How to Use `cvmatch_core`

### Validating a PDF
```python
from cvmatch_core.config import DEFAULT_CONFIG
from cvmatch_core.exceptions import CVMatchCoreError
from cvmatch_core.pdf.validator import validate_pdf_bytes

pdf_bytes = b"%PDF-1.4..."

try:
    validate_pdf_bytes(pdf_bytes, config=DEFAULT_CONFIG)
    print("PDF passed validation checks.")
except CVMatchCoreError as err:
    # User-safe message (does not expose file paths or stack traces)
    print(f"Validation rejected: {err.message}")
```

### Extracting Text
```python
from cvmatch_core.models.extraction import ExtractionStatus
from cvmatch_core.pdf.extractor import extract_pdf

pdf_bytes = b"%PDF-1.4..."

result = extract_pdf(pdf_bytes, original_filename="candidate_resume.pdf")

if result.status == ExtractionStatus.SUCCESS:
    print(f"Processed {result.page_count} pages.")
    print(f"Total characters: {result.char_count}")
    print(f"Extracted text:\n{result.full_text}")
elif result.status == ExtractionStatus.NO_TEXT:
    print("Notice: Document contains no extractable text (likely scanned).")
else:
    print(f"Extraction failed: {result.error_message}")
```

---

## 7. Configuration Limits

Configurable via `cvmatch_core.config.ExtractionConfig`:

| Setting | Default | Description |
|---|---|---|
| `max_file_size_bytes` | `10 * 1024 * 1024` (10 MB) | Maximum permitted file upload size |
| `max_pages` | `20` | Maximum page count allowed per document |
| `min_text_chars_per_page` | `20` | Minimum characters to mark page `has_text=True` |
| `min_total_text_chars` | `50` | Minimum document characters to consider text readable |

---

## 8. Integration with Phase 5 (Appwrite Python Function)

In Phase 5, the Appwrite `analyze-cv` function will vendor or import `cvmatch_core`:
1. The function fetches the raw PDF bytes from the private Appwrite Storage bucket.
2. The function invokes `extract_pdf(data, original_filename=...)`.
3. If `result.status == ExtractionStatus.SUCCESS`, `result.full_text` is passed to the Gemini structured profile extractor.
4. If `result.status == ExtractionStatus.NO_TEXT`, the function updates the resume status to `failed` and records a user-friendly error without spending AI quota.
