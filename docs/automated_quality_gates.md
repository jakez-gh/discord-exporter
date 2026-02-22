# Automated Quality Gates

This document describes the automated quality checks that run for every
commit and pull request in the `discord-exporter` repository.  All of the
tools are stored in version control so a fresh clone on another Windows
device will immediately have the same gates.

## Git hooks (local enforcement)

- Implemented with **Husky** (`.husky/pre-commit`).
- Triggered on every `git commit`.
- Steps performed:
  1. Run `npm run build` to regenerate `dist/discord-exporter.user.js`.
  2. Fail if any files under `dist/` are staged (build artifacts must not be
     committed).
  3. Execute ESLint against staged `.js` files (`lint-staged`).
  4. (Placeholder for additional security scanners).

The `package.json` `prepare` script installs the hooks; after cloning run

```bash
npm install
npm run prepare
```

on Windows (PowerShell) the same commands work.

## GitHub Actions pipeline
Located at `.github/workflows/node-ci.yml` – this workflow is persisted in the
repo and runs on every `push` or `pull_request` against the `main` branch.

### Jobs
1. **lint** – checks formatting and static analysis
   - Sets up Node.js 20.x
   - Installs dev dependencies with `npm ci`
   - Runs `eslint` (errors break the job)
   - Performs `npm audit` for dependency vulnerabilities
2. **build** – makes sure the export still compiles
   - Depends on `lint` success
   - Installs dependencies again and runs `npm run build`
   - Includes a harmless DAST placeholder message
3. **security** – optional scans
   - Depends on `lint`; executes secret scan with [Gitleaks](https://github.com/gitleaks/gitleaks-action)
   - Runs dependency review action on pull requests
   - These steps `continue-on-error` so they don't block merges, but their results
     are reported in the `comment-results` job.
4. **quality-gate** – overall gate
   - Depends on `lint`, `build`, and `security`
   - Fails the workflow if either `lint` or `build` failed, effectively blocking
     merges to `main` via branch protection or GitHub UI.
   - Prints a summary of job outcomes.
5. **comment-results** – PR feedback
   - Runs only for pull requests
   - Leaves a comment on the PR with checkmarks for lint, build, and security
     scan results (security warnings do not block the merge).

### Additional features
- Workflows are portable; they live in Git under `.github/workflows` so any
  machine cloning the repo will have identical checks automatically.
- You can enable CodeQL, Dependabot or other GitHub‑level security offerings
  by adding or editing YAML files in the same directory.

## Additional custom gates

A couple of extra checks have been folded in from other projects and are
persisted here:

* **Inventory completeness & correctness** – the inventory rules script
  (`tests/tools/inventory_rules.py`) inspects every visible folder, confirming
  that `inventory.md` exists, describes the folder, lists each file/folder with
  a unique, sufficiently long description, and contains no extraneous entries.
  A companion requirements document (`docs/inventory_requirements.md`) containing
  the project’s inventory philosophy must also exist; the gate checks for it on
  every run.  This behaviour was inspired by the comprehensive gate in the
  `autoplay` repository (see
  https://github.com/jakez-gh/autoplay/blob/main/tests/tools/inventory_quality_gate.py)
  but covers the expanded requirements described in
  `docs/inventory_guidelines.md` (also committed).

* **Header verification** – every supported file (`.js`, `.md`) is scanned by
  `tests/tools/header_check.py` to ensure its first few lines contain a
  natural‑language description and a semantic version string (e.g. `1.2.3`).
  This encourages explicit versioning and descriptive headers across the
  codebase.

* **Quality‑gates documentation** – ensures this very document exists and
  actually *describes what should and should not be contained within it*.
  This gate was created specifically for this repository in response to a
  request, but it’s documented here so it travels with the repo.

## Ensuring persistence
To guarantee the gates survive a fresh clone:

- All configuration files are committed (`.husky/`, `.eslintrc.json`,
  `.eslintignore`, `docs/automated_quality_gates.md`, workflow YAMLs, etc.)
- The build script and `package.json` are versioned
- Developers must run `npm ci` and `npm run prepare` after cloning to install
  Node dependencies and Husky hooks.
- No state is stored outside the repository (e.g. no local-only hooks or
  secret tokens); everything required is in source control.

> **Tip:** if you add new quality checks (e.g. semgrep, prettier, Python
> linters), remember to update this document and commit any config files.
