# Discord Exporter Tampermonkey Script

This repository contains a Tampermonkey user script that can download Discord chats and will eventually expand to encompass various Discord automations.

## Features

- Export Discord chat histories to local files.
- Designed as a Tampermonkey script running in the browser.

## Getting Started

1. Install Tampermonkey in your browser.
2. Add the script from `discord-exporter.js` as a new user script.
3. Run it on Discord to capture conversations.

## Development

The project includes a simple build script (`build.js`) that concatenates modular source
files into a single Tampermonkey userscript located in `dist/discord-exporter.user.js`.
The `dist` folder is ignored by Git so build outputs are never persisted.

### Inventory strategy

Each visible directory must contain an `inventory.md` file; see
`docs/inventory_guidelines.md` for writing rules.  The guidelines require a
folder description and a bullet/table entry for every sibling file and
subdirectory, with optional `in_scope`, `out_scope`, and `notes` sections.

The CI pipeline runs `tests/tools/inventory_rules.py` (a superset of the earlier
simple gate) on every commit/PR.  It enforces:

* presence of inventory.md in every folder
* sufficient folder and item descriptions
* one-to-one correspondence between filesystem and inventory
* uniqueness of each item description

### Semantic versioning & headers

The exported userscript version is drawn from `package.json` every time you
run `build.bat`.  Bump the `version` field there to advance the release.

Every supported source file should also include a header section (first few
lines) containing both a short description and a semantic version string
(`x.y.z`).  The CI job will run `tests/tools/header_check.py` to verify this
across `.js` and `.md` files.

A second gate (`tests/tools/version_gate.py`) ensures that the version never
steps backwards compared with the previous build (as recorded in the existing
`dist` file or via git tags).  If the version is equal to the previous one the
patch number is automatically incremented and the export rebuilt.

### Initialising a new repository

After cloning the repository run the Windows batch helper to prepare your
environment:

```bat
install.bat   REM installs dependencies and sets up git hooks
```

Other helpful commands (all shipped as `.bat` scripts to document intent and
provide comments) include:

```
build.bat            REM generate the userscript
lint.bat             REM run ESLint over the source
inventory_check.bat  REM verify docs/INVENTORY.md matches filesystem
check_gates_doc.bat  REM verify automated_quality_gates.md content
```

### Git Hooks and Quality Gates

Husky implements a pre‑commit hook that does the following:

1. Runs the build script and blocks any staged files in `dist/`.
2. Executes ESLint on staged JavaScript (via `lint-staged`).
3. Runs the inventory and gates‑doc validation scripts.

We track work using the MCP **todoagent**; avoid paper TODOs or ad‑hoc lists and
create/update tasks through that agent instead.  Commit early and often – the
hook will prevent unsafe or incomplete changes.

### CI/CD

A GitHub Actions pipeline (`.github/workflows/node-ci.yml`) executes on every push
or pull request against `main`. It includes jobs for linting, building, security
scans, a blocking quality gate, and PR comment summarisation.  Additional
workflows handle Dependabot updates and CodeQL analysis (see `.github/workflows`).

## CI/CD

A GitHub Actions workflow (`.github/workflows/node-ci.yml`) executes on every push or pull
request against `main`. It performs:

- Checkout of code
- Node.js setup and dependency install
- Linting with ESLint
- Security audit via `npm audit`
- **SAST** using Semgrep
- Placeholder for DAST (not applicable but can be added in future)
- Runs the build script to ensure the exported userscript compiles correctly
