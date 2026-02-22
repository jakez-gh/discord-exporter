#!/usr/bin/env python3
"""
Version gate and bump script.

Ensures the semantic version in `package.json` never decreases relative to the
previous build.  The previous version is determined by looking at the existing
`dist/discord-exporter.user.js` header or the highest git tag matching
X.Y.Z.

If the current version is equal to the previous version, the script will bump
the patch number, update `package.json` accordingly, and rewrite the `dist`
file by invoking the build script.  This keeps the exported script version in
alignment with ongoing modifications.

Usage:
    python tests/tools/version_gate.py

Exit codes:
    0 = version is acceptable (possibly bumped)
    1 = version decreased compared to history
    2 = other error
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def parse_version(s: str):
    m = SEMVER_RE.match(s)
    if not m:
        raise ValueError(f"Invalid semver: {s}")
    return tuple(int(x) for x in m.groups())


def version_to_str(v):
    return f"{v[0]}.{v[1]}.{v[2]}"


def bump_patch(v):
    return (v[0], v[1], v[2] + 1)


def get_pkg_version():
    data = json.loads(Path("package.json").read_text(encoding="utf-8"))
    return parse_version(data["version"])


def set_pkg_version(v):
    path = Path("package.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    data["version"] = version_to_str(v)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def get_dist_version():
    p = Path("dist/discord-exporter.user.js")
    if not p.exists():
        return None
    txt = p.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"@version\s+([0-9]+\.[0-9]+\.[0-9]+)", txt)
    if m:
        return parse_version(m.group(1))
    return None


def get_highest_tag():
    try:
        tags = subprocess.check_output(["git", "tag"], text=True).splitlines()
    except Exception:
        return None
    versions = []
    for t in tags:
        try:
            versions.append(parse_version(t))
        except ValueError:
            continue
    return max(versions) if versions else None


def main():
    try:
        current = get_pkg_version()
    except Exception as e:
        print(f"Error reading package.json: {e}")
        return 2

    prev = get_dist_version()
    tagv = get_highest_tag()
    candidates = [v for v in (prev, tagv) if v is not None]
    if candidates:
        highest = max(candidates)
    else:
        highest = None

    if highest and current < highest:
        print(f"❌ package.json version {version_to_str(current)} is lower than previous {version_to_str(highest)}")
        return 1

    bumped = False
    if highest and current == highest:
        # bump patch
        newv = bump_patch(current)
        set_pkg_version(newv)
        print(f"🔼 version bumped from {version_to_str(current)} to {version_to_str(newv)}")
        current = newv
        bumped = True
        # rebuild output to reflect new version
        os.system("npm run build")

    if not highest:
        print("No previous version found; current is", version_to_str(current))

    if not bumped:
        print("Version is OK:", version_to_str(current))
    return 0


if __name__ == "__main__":
    sys.exit(main())