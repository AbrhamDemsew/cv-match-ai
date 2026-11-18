"""
Configurable limits and defaults for PDF processing.

Override via environment variables or by passing a custom ExtractionConfig
instance to validation and extraction functions.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ExtractionConfig:
    max_file_size_bytes: int = 10 * 1024 * 1024  # 10 MB
    max_pages: int = 20
    min_text_chars_per_page: int = 20  # chars needed to count page as "has text"
    min_total_text_chars: int = 50  # document-wide minimum extractable text chars


DEFAULT_CONFIG = ExtractionConfig()
