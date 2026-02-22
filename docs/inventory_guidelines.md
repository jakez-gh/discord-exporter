# Inventory.md Guidelines

Each visible folder in the repository **must** contain an `inventory.md` file
(case-insensitive). Its purpose is dual:

1. Help human readers understand the role of the folder and its contents.
2. Provide a machine-readable source of truth for automated quality gates.

The file should adhere to the following conventions:

## Structure

```markdown
# <Folder name>

A concise description of the folder's purpose (at least 10 words).

- `file1.js`: Explanation of why this file exists and what it does.
- `subdir/`: Brief note about what lives in the subdirectory.

### in_scope
(Optional) Clarify what is considered in scope for this folder.

### out_scope
(Optional) Describe aspects deliberately excluded.

### notes
(Optional) Catch-all for additional comments or todo items.
```

- Every file and subdirectory present at the same level must appear as a
  bullet or table row with a description.  The description should be at least
  four words and be unique within the file.
- The description for the folder itself (the first paragraph after the header)
  must be at least ten words; this prevents placeholder or empty summaries.
- Use `in_scope`, `out_scope`, and `notes` sections where they help clarify the
  inventory entries; they are optional and not checked by automated gates but
  may improve human comprehension.
- Inventory entries must not document items that are not present in the folder.

## Examples
A simple `docs/inventory.md` for the root of this project:

```markdown
# Repository root

Contains the Tampermonkey exporter source, build tools, and CI configuration.

- `.github/`: GitHub actions and repository configuration.
- `build.js`: Node script that concatenates modules into the userscript.
- `core/`: Core helper modules used by the exporter.
- `discord-exporter.js`: The main userscript entry point.
- `package.json`: Defines dev dependencies and npm scripts.
- ...
```

Detailed examples may be found in the `autoplay` repository under its various
`INVENTORY.md` files.

## Enforcement
The CI pipeline runs `tests/tools/inventory_rules.py` which implements the
following checks:

* Every visible folder contains `inventory.md`.
* Folder descriptions are non‑trivial (min 10 words).
* All sibling files/folders are listed and described (min 4 words), with
  unique descriptions.
* No spurious entries appear.

Failures will block commits/PRs and are reported by the quality‑gate workflow.

Maintainers should update the inventory whenever files are added, moved,
renamed or removed. The `inventory_check.bat` helper provides a quick local
test.
