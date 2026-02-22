#!/usr/bin/env python3
"""
Enhanced inventory quality gates.

Checks performed for each visible directory:

* `inventory.md` (case insensitive) exists.
* The file contains a short description of the current folder (at least
  10 words) immediately following the header.
* Every file and subdirectory in the folder is mentioned in the inventory
  with a bullet or table row, and each entry includes a description of at
  least 4 words.
* No inventory entries refer to non-existent items.
* Descriptions for each entry are unique within that inventory.

Optional sections may appear (`in_scope`, `out_scope`, `notes`) but are not
required; they may be used to clarify or shelve information about entries.

Inspired by the extensive inventory system in the `autoplay` project
(see https://github.com/jakez-gh/autoplay/ for examples).

Usage:
    python tests/tools/inventory_rules.py [rootdir]

Exit codes:
    0 = all gates pass
    1 = one or more failures
    2 = unexpected error
"""
import os
import re
import sys
from pathlib import Path

IGNORE_DIRS = {".git", "node_modules", "dist", "build", "__pycache__"}
MIN_FOLDER_DESC_WORDS = 10
MIN_ITEM_DESC_WORDS = 4


def is_inventory_file(path: Path) -> bool:
    return path.name.lower() == "inventory.md"


def parse_inventory(path: Path) -> tuple[str, dict[str,str]]:
    """Return (folder_desc, items) where items[name]=description."""
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    folder_desc = ""
    seen_header = False
    for line in lines:
        if line.strip().startswith("#"):
            seen_header = True
            continue
        if seen_header and line.strip():
            folder_desc = line.strip()
            break

    items = {}
    # bullet entries: - name: description
    bullet_re = re.compile(r"^-\s+`?([^`:\s]+)`?\s*:\s*(.+)$")
    # table rows: | `name` | desc | ...
    table_re = re.compile(r"\|\s*`([^`]+)`\s*\|\s*([^|]+)\|")

    for line in lines:
        m = bullet_re.match(line.strip())
        if m:
            name, desc = m.groups()
            items[name] = desc.strip()
            continue
        m = table_re.search(line)
        if m:
            name, desc = m.groups()
            items[name] = desc.strip()
    return folder_desc, items


def check_directory(dirpath: Path, errors: list):
    inv_file = None
    for child in dirpath.iterdir():
        if is_inventory_file(child):
            inv_file = child
            break
    if inv_file is None:
        errors.append(f"Missing inventory.md in {dirpath}")
        return

    folder_desc, items = parse_inventory(inv_file)
    if len(folder_desc.split()) < MIN_FOLDER_DESC_WORDS:
        errors.append(f"Folder description too short in {inv_file}")

    actual = {p.name for p in dirpath.iterdir() if p.name not in IGNORE_DIRS and not p.name.startswith('.')}
    # directories also included

    # check documented vs actual
    missing = actual - set(items.keys())
    extra = set(items.keys()) - actual
    for m in sorted(missing):
        errors.append(f"{inv_file}: missing entry for '{m}'")
    for e in sorted(extra):
        errors.append(f"{inv_file}: documented '{e}' but not present")

    # check item descriptions
    seen_desc = set()
    for name, desc in items.items():
        words = desc.split()
        if len(words) < MIN_ITEM_DESC_WORDS:
            errors.append(f"{inv_file}: description for '{name}' too short")
        if desc in seen_desc:
            errors.append(f"{inv_file}: duplicate description for '{name}'")
        seen_desc.add(desc)


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(os.getcwd())
    if not root.exists():
        print(f"Root does not exist: {root}")
        return 2

    errors = []
    for dirpath, dirnames, filenames in os.walk(root):
        # skip ignored directories
        parts = Path(dirpath).parts
        if any(p in IGNORE_DIRS for p in parts):
            continue
        check_directory(Path(dirpath), errors)

    if errors:
        print("\n=== INVENTORY RULES FAILURES ===\n")
        for e in errors:
            print(e)
        return 1
    print("✅ All inventory rules passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
