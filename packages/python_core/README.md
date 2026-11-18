# CVMatch Core (`cvmatch_core`)

Shared Python core package for **CVMatch AI**, responsible for PDF validation, text extraction, normalization, and structured extraction models.

## Architecture and Scope

The package is designed to be:
- **Standalone and decoupled:** Free of Appwrite, Google Gemini, React, or browser dependencies.
- **Predictable:** Returns structured Pydantic models with clear error states and warnings rather than uncaught crashes.
- **Safe:** Rejects non-PDF files, oversized documents (>10 MB), documents exceeding page limits (>20 pages), and encrypted/password-protected PDFs. No local paths or sensitive traces are exposed in error messages.
- **Privacy-first:** CV content is not permanently stored or logged.

This package serves as the extraction engine for the Phase 5 Appwrite Python Function and any future client applications.

## Package Structure

```text
packages/python_core/
├── pyproject.toml              # Build system, dependencies, tool configurations
├── README.md                   # This documentation
├── cvmatch_core/
│   ├── __init__.py             # Package version
│   ├── config.py               # Configurable limits (ExtractionConfig)
│   ├── exceptions.py           # Structured exception hierarchy
│   ├── models/
│   │   ├── __init__.py
│   │   └── extraction.py       # Pydantic models (ExtractionResult, PageResult, etc.)
│   └── pdf/
│       ├── __init__.py
│       ├── validator.py        # PDF byte-level validation
│       ├── extractor.py        # PyMuPDF text extraction pipeline
│       └── normalizer.py       # Whitespace and line-ending normalization
└── tests/
    ├── conftest.py             # Synthetic in-memory PDF fixtures
    ├── test_pdf_validator.py   # Validation test suite
    ├── test_pdf_extractor.py   # Extraction test suite
    ├── test_text_normalizer.py # Text normalization test suite
    └── test_extraction_models.py # Pydantic model validation tests
```

## Setup and Installation

### 1. Requirements
- Python 3.12 or newer.

### 2. Environment Setup
From the repository root:

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install package in editable mode with development dependencies
pip install -e "packages/python_core[dev]"
```

## Running Tests and Linting

```bash
# Run the complete test suite
pytest packages/python_core/tests -v

# Run linting with Ruff
ruff check packages/python_core

# Format check with Ruff
ruff format --check packages/python_core
```

## Usage Examples

### Validating PDF Bytes

```python
from cvmatch_core.config import DEFAULT_CONFIG
from cvmatch_core.pdf.validator import validate_pdf_bytes
from cvmatch_core.exceptions import CVMatchCoreError

with open("sample.pdf", "rb") as f:
    data = f.read()

try:
    validate_pdf_bytes(data, config=DEFAULT_CONFIG)
    print("PDF is valid.")
except CVMatchCoreError as err:
    print(f"Validation failed: {err.message}")
```

### Extracting PDF Text

```python
from cvmatch_core.pdf.extractor import extract_pdf
from cvmatch_core.models.extraction import ExtractionStatus

with open("sample.pdf", "rb") as f:
    data = f.read()

result = extract_pdf(data, original_filename="sample.pdf")

if result.status == ExtractionStatus.SUCCESS:
    print(f"Extracted {result.page_count} pages, {result.char_count} characters.")
    print("Full text preview:", result.full_text[:200])
elif result.status == ExtractionStatus.NO_TEXT:
    print("Scanned or image-only document:", result.error_message)
else:
    print(f"Extraction failed: {result.error_message}")
```

## Error Handling

All custom exceptions inherit from `CVMatchCoreError`:

| Exception | Cause |
|---|---|
| `EmptyDocumentError` | File is empty (0 bytes) or contains 0 pages |
| `UnsupportedFileFormatError` | File does not start with the `%PDF-` signature |
| `FileTooLargeError` | File size exceeds `max_file_size_bytes` (10 MB default) |
| `InvalidPDFError` | File is corrupted or cannot be parsed by PyMuPDF |
| `EncryptedPDFError` | PDF is encrypted or password-protected |
| `TooManyPagesError` | Page count exceeds `max_pages` (20 pages default) |
| `NoExtractableTextError` | PDF has no extractable text (e.g., scanned image) |
| `PDFProcessingError` | Unexpected processing failure during validation |

## Limitations

- **No OCR:** Scanned or image-only documents without an embedded text layer return `status=ExtractionStatus.NO_TEXT`. Optical Character Recognition is deferred to a future phase.
- **No External Services:** This package performs purely local document processing. AI analysis (Gemini) and storage (Appwrite) are integrated in Phase 5.
