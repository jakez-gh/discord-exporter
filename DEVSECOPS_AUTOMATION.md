# DevSecOps & Quality Controls

This project borrows the minimal tooling and guidance used across other repositories.
It emphasises quick feedback, security scanners and enforced hygiene before code
lands on `main`.

## Git hooks

- **Pre-commit**: implemented with [Husky](https://typicode.github.io/husky/).
  - Runs the build script so that a fresh `dist/` userscript is generated for each
    commit.
  - Prevents any files under `dist/` being staged.
  - Executes ESLint on staged JavaScript files (via `lint-staged`).
  - (Future scans may call semgrep, Bandit, etc.)

To install hooks locally run `npm run prepare` after pulling the repo.

## CI/CD

The GitHub Actions pipeline (`.github/workflows/node-ci.yml`) covers:

1. `npm ci` to install dev dependencies.
2. Linting (`eslint`) and `npm audit` for dependency vulnerabilities.
3. Build step to ensure the export concatenates correctly.
4. A placeholder for DAST – not applicable for a static userscript but left
   as a reminder.

## Branch protection & commit policy

For maximum safety we recommend enabling GitHub branch protection rules on the
`main` (and any future release) branch. Typical settings include:

- Require status checks to pass (the `lint`, `build` and `quality-gate` jobs)
- Require pull request reviews before merging
- Prevent force pushes and deletion

If your GitHub plan does not allow automatic enforcement, you can still adhere
manually: the workflow gating on `main` ensures that broken commits cannot be
merged without failing the quality gate and generating a warning comment.

Combine these protections with:

- pre-commit hooks configured in the repo
- frequent commits ("commit early, commit often")
- use of the MCP todoagent to track work and dependencies

and you achieve a robust, self‑documenting development process.

## Export handling

The generated `dist/discord-exporter.user.js` file is *not* checked into source
control; `dist/` is listed in `.gitignore` and hooks will error if build
artifacts are staged.

> Note: as the script grows, additional static (SAST) or dynamic (DAST) tools
> can be slotted into the pre-commit hook and CI workflow. Semgrep rules or an
> OWASP ZAP scan could be added when the codebase begins interacting with
> external services.
