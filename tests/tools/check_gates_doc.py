#!/usr/bin/env python3
"""
Quality gate to ensure the automated_quality_gates.md document exists and
contains guidance on what should and should not be included.

Usage:
    python tests/tools/check_gates_doc.py

Exit codes:
    0 = document is present and contains required phrases
    1 = checks failed
    2 = other error
"""
import sys
from pathlib import Path

DOC_PATH = Path(__file__).parent.parent / "docs" / "automated_quality_gates.md"

REQUIRED_PHRASES = [
    "should be",    # indicates description of contents
    "should not be",  # negative guidance
]


def main():
    try:
        text = DOC_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"❌ {DOC_PATH} does not exist")
        return 1

    missing = [p for p in REQUIRED_PHRASES if p not in text]
    if missing:
        print("❌ automated_quality_gates.md is missing required guidance:")
        for p in missing:
            print(f"   - expected phrase: '{p}'")
        return 1

    print("✅ automated_quality_gates.md exists and contains required guidance")
    return 0


if __name__ == "__main__":
    sys.exit(main())
