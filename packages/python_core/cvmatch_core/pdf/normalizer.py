"""
Text normalization for extracted PDF content.

Rules:
- Normalize all line endings to \\n (converting \\r\\n and standalone \\r).
- Collapse runs of horizontal whitespace (spaces, tabs) within a line to a single space.
- Collapse runs of more than two consecutive blank lines to two blank lines.
- Preserve meaningful punctuation, numbers, dates, emails, URLs, and technical terms.
- Strip trailing and leading whitespace from each line.
- Strip leading and trailing whitespace from the full text.
"""

from __future__ import annotations

import re

# Match runs of horizontal whitespace (spaces and tabs) within a line
_HORIZONTAL_WHITESPACE = re.compile(r"[ \t]+")

# Match three or more consecutive newlines
_EXCESS_BLANK_LINES = re.compile(r"\n{3,}")


def normalize_text(text: str) -> str:
    """
    Normalize extracted PDF text.

    Returns the normalized string. If input is empty or whitespace-only,
    returns an empty string.
    """
    if not text or not text.strip():
        return ""

    # 1. Normalize line endings (\r\n and \r -> \n)
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")

    # 2. Process each line: collapse horizontal whitespace, strip each line
    lines = [
        _HORIZONTAL_WHITESPACE.sub(" ", line).strip() for line in normalized.split("\n")
    ]
    normalized = "\n".join(lines)

    # 3. Collapse excess blank lines (three or more newlines -> two newlines)
    normalized = _EXCESS_BLANK_LINES.sub("\n\n", normalized)

    # 4. Strip overall leading and trailing whitespace
    return normalized.strip()
