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

While GitHub plan restrictions may prevent enforced branch protection, the
combination of:

- pre-commit hooks,
- frequent commits ("commit early, commit often"),
- workflow gating on `main`

keeps quality high.  Developers are encouraged to open pull requests early and
review changes as they go.

## Export handling

The generated `dist/discord-exporter.user.js` file is *not* checked into source
control; `dist/` is listed in `.gitignore` and hooks will error if build
artifacts are staged.


> Note: as the script grows, additional static (SAST) or dynamic (DAST) tools
> can be slotted into the pre-commit hook and CI workflow. Semgrep rules or an
> OWASP ZAP scan could be added when the codebase begins interacting with
> external services.
