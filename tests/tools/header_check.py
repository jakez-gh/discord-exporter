#!/usr/bin/env python3
"""
Check for file headers containing a description and semantic version.

Scans supported file formats (.js, .md) inside the repository and ensures the
first non-blank lines include both:

* a short description (at least 4 words)
* a semantic version string (e.g. 1.2.3)

The script is meant as an automated quality gate; failing files are reported
with the reason.

Usage:
    python tests/tools/header_check.py [rootdir]

Exit codes:
    0 = all headers satisfactory
    1 = one or more problems found
    2 = unexpected error
"""
import os
import re
import sys
from pathlib import Path

SEMVER_RE = re.compile(r"\b\d+\.\d+\.\d+\b")


def check_file(path: Path, errors: list):
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        errors.append(f"{path}: empty file")
        return

    header = " ".join(lines[:5])  # first few lines
    # description: at least 4 words
    if len(header.split()) < 4:
        errors.append(f"{path}: header too short for description")
    if not SEMVER_RE.search(header):
        errors.append(f"{path}: no semantic version found in header")


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(os.getcwd())
    if not root.exists():
        print(f"Root does not exist: {root}")
        return 2

    errors = []
    for ext in ("*.js", "*.md"):
        for file in root.rglob(ext):
            # skip node_modules, dist, .git
            if any(p in file.parts for p in ("node_modules", "dist", ".git")):
                continue
            check_file(file, errors)
    if errors:
        print("\n=== HEADER CHECK ERRORS ===\n")
        for e in errors:
            print(e)
        return 1
    print("✅ All headers contain description and version")
    return 0


if __name__ == "__main__":
    sys.exit(main())