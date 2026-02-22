# Test Categories and Common Failure Modes

This document lists the kinds of mistakes we've encountered during development
along with the corresponding test strategies.  When adding new functionality or
backfilling tests, use these categories as a checklist to ensure coverage.

## 1. Console / Logger Spies
- **Issue:** attempting to spy/restore `console.log` when it's already wrapped.
  - Happens when multiple tests wrap `console.log` without sandbox cleanup.
- **Mitigation:** use a Sinon sandbox in each test and restore it in
  `afterEach`.  Avoid global wrapping; reset in hooks.

## 2. DOM Environment Assumptions
- **Issue:** tests assume the DOM helper returns certain nodes; accessing
  `[0]` on undefined leads to TypeError.
- **Mitigation:** build realistic stubs and `before` hooks that fake
  `document.createElement`, `Blob`, `URL.createObjectURL`, etc.  Validate
  structures before indexing.

## 3. Progress Reporting & UI Interaction
- **Issue:** new features that report status (scroll progress, extraction
  progress) need a UI stub; forgetting to inject one results in undefined
  method calls.
- **Mitigation:** always supply a minimal `UI` object with the methods the
  module uses, and test that they are called with expected arguments.

## 4. Async/Build Output Side-Effects
- **Issue:** tests or hooks trigger build scripts (via `npm run build`) which
  modifies files and can leave unstaged changes.
- **Mitigation:** avoid running build inside tests; if pre-commit/build hooks
  need to run, ensure tests stop before they do, or stub out external commands.

## 5. Unique ID / Ordering Logic
- **Issue:** relying on `seenIds.size` vs. `seenOrder.length` caused off-by-one
  or stale counts when the DOM slides.
- **Mitigation:** keep a single source of truth (ordered array), update tests
  to refer to it, and add edge-cases (decreasing counts, mutation observer).

## 6. Style/Copy/Formatting
- **Issue:** dragging behavior and CSS interactions may trigger layout changes
  or resizing in tests; need to simulate `offsetWidth`/`offsetHeight`.
- **Mitigation:** stub element properties where necessary.

## 7. Git Hook & Linting Interference
- **Issue:** pre-commit hooks may modify files (`mdfix`, `build`) mid-test,
  causing tests to see inconsistent workspace state.
- **Mitigation:** write tests to avoid calling hooks; ensure workspace is clean
  before running.

---

For each new feature, cross-reference this list and add a matching test or
category entry if it introduces a new class of failure.
