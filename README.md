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

The project includes a simple build script that concatenates modular source files into a single
Tampermonkey userscript located in `dist/discord-exporter.user.js`. The `dist` folder is ignored by
Git to ensure artifacts are not persisted.

You can run the build manually with:

```bash
npm install            # install dev dependencies (eslint, husky, semgrep, etc.)
npm run build          # generate the userscript in dist/
```

### Git Hooks and Quality Gates

Husky is used to install a `pre-commit` hook that automatically:

1. Executes the build script and prevents committing any files under `dist/`.
2. Runs ESLint (optionally via lint-staged) on changed files.
3. Executes any additional security scans (ESLint, `npm audit`, etc.).

Install the hooks with:

```bash
npm run prepare        # sets up husky hooks
```

Commit early and often; the hook will run on each commit and block unsafe or unbuilt changes.

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
