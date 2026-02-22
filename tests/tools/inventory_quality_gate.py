#!/usr/bin/env python3
"""
Simple inventory completeness gate for this repository.

Verifies that each file or folder listed at the root of the project is
recorded in `docs/INVENTORY.md`.  Inspired by the comprehensive inventory
quality gate from the `autoplay` repository:
https://github.com/jakez-gh/autoplay/blob/main/tests/tools/inventory_quality_gate.py

Usage:
    python tests/tools/inventory_quality_gate.py

Exit codes:
    0 = all items documented
    1 = missing or extra entries found
    2 = error
"""
import os
import sys
from pathlib import Path

IGNORE = {".git", "node_modules", "dist", "build", ".github", "docs"}


def load_inventory(inventory_path: Path) -> set[str]:
    if not inventory_path.exists():
        raise FileNotFoundError("INVENTORY.md is missing")
    items = set()
    for line in inventory_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("-"):
            name = line[1:].strip()
            if name:
                items.add(name.rstrip("/"))
    return items


def get_actual_items(root: Path) -> set[str]:
    names = set()
    for entry in root.iterdir():
        if entry.name in IGNORE or entry.name.startswith("."):
            continue
        names.add(entry.name)
    return names


def main():
    root = Path(__file__).parent.parent.parent
    inventory = root / "docs" / "INVENTORY.md"
    try:
        documented = load_inventory(inventory)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return 2

    actual = get_actual_items(root)
    missing = actual - documented
    extra = documented - actual

    if missing or extra:
        print("\n=== INVENTORY GATE ===\n")
        for m in sorted(missing):
            print(f"❌ missing from INVENTORY.md: {m}")
        for e in sorted(extra):
            print(f"⚠️  listed but not found: {e}")
        return 1
    else:
        print("✅ INVENTORY.md is up to date with project root")
        return 0


if __name__ == "__main__":
    sys.exit(main())
