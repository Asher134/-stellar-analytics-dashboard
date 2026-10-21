# Release Notes Process

Maintainer guide for generating, reviewing, and publishing release notes for the Stellar Analytics Dashboard.

<!-- release-notes-docs: preview, dry-run, issue-labels, changelog -->

---

## Overview

Release notes are generated from [conventional commit](https://www.conventionalcommits.org/) history using `scripts/generate-release-notes.mjs`. GitHub **issue labels** do not feed the generator directly; they guide how work is titled and committed so the CHANGELOG sections stay accurate (see [Issue labels and commit history](#issue-labels-and-commit-history)).

```
issue labels (guidance)  →  conventional commits on main
                                    ↓
                    generate-release-notes.mjs
                                    ↓
                         CHANGELOG.md / GitHub Release body
```

Routine releases should not require hand-editing `CHANGELOG.md` when commit messages are correct.

---

## Issue labels and commit history

Labels from [`contributor-issue-taxonomy.md`](./contributor-issue-taxonomy.md) tell maintainers how a change should appear in history. Map them to conventional commit **types** (and scopes) before merge:

| Issue signal | Prefer commit type | CHANGELOG section |
|--------------|--------------------|-------------------|
| Title / type `feat:` or feature work | `feat` | ✨ Features |
| Title / type `fix:` or bug | `fix` | 🐛 Bug Fixes |
| Area / type `docs` | `docs` | 📝 Documentation |
| Area / type `ci:` or `devops / ci` | `ci` | 👷 CI |
| Shared library work (`shared:`) | `feat` / `fix` / `refactor` with scope `shared` | matching type section |
| Performance work | `perf` | ⚡ Performance |

Area labels (`frontend`, `api`, `indexer`, `shared`, `docs`, `devops / ci`) should become the commit **scope** when practical, for example `feat(api): …` or `ci(e2e): …`.

Workflow labels (`needs-triage`, `priority:*`, `Stellar Wave`, `wontfix`) are for triage only and never appear in release notes.

When reviewing a PR, confirm the squash/merge commit type matches the issue type and that the description will read well in the CHANGELOG.

---

## Commit message format

Every commit merged to `main` must follow the conventional commit format enforced by commitlint:

```
<type>(<scope>): <description>

[optional body]

[optional footer: BREAKING CHANGE: ...]
```

### Types and their CHANGELOG sections

| Type | Section |
|------|---------|
| `feat` | ✨ Features |
| `fix` | 🐛 Bug Fixes |
| `perf` | ⚡ Performance |
| `refactor` | ♻️ Refactoring |
| `docs` | 📝 Documentation |
| `test` | 🧪 Tests |
| `chore` | 🔧 Chores |
| `ci` | 👷 CI |
| `build` | 📦 Build |
| `style` | 💄 Style |
| `revert` | ⏪ Reverts |

### Breaking changes

Add `!` after the type, or include a `BREAKING CHANGE:` footer. These always appear at the top of the release notes under **⚠️ Breaking Changes**:

```
feat(api)!: remove deprecated /v1/stats endpoint

BREAKING CHANGE: Clients using /v1/stats must migrate to /graphql query stats{}
```

---

## Preview and dry-run

Use these before writing `CHANGELOG.md` or cutting a GitHub Release.

| Command | Effect |
|---------|--------|
| `pnpm release:notes:preview` | Runs with `--dry-run`: prints Markdown to stdout, does **not** write files |
| `node scripts/generate-release-notes.mjs --dry-run` | Same dry-run behaviour |
| `node scripts/generate-release-notes.mjs --output stdout` | Prints to stdout only (no CHANGELOG write) |
| `pnpm release:notes -- --version <semver>` | Writes/prepends the entry to `CHANGELOG.md` |

```bash
# Preview commits since the last tag (safe; no file changes)
pnpm release:notes:preview

# Preview an explicit range
node scripts/generate-release-notes.mjs --dry-run --from v1.2.0 --to HEAD --version 1.3.0

# Write CHANGELOG.md for a specific version (after preview looks correct)
pnpm release:notes -- --version 1.3.0

# Diff between two tags and write
pnpm release:notes -- --from v1.2.0 --to v1.3.0 --version 1.3.0
```

Dry-run output is the source of truth for GitHub Release bodies—paste it or pass it via `--notes-file` (see below).

---

## Release workflow

### 1. Prepare a release

```bash
# Update version in root package.json
npm version minor   # or patch / major

# This creates a commit and a local tag:
#   chore(release): v1.3.0
#   tag: v1.3.0
```

### 2. Generate and review notes

```bash
pnpm release:notes:preview
pnpm release:notes -- --version 1.3.0   # when preview is approved
git add CHANGELOG.md
git commit -m "docs(changelog): add v1.3.0 release notes"
```

### 3. Push the tag

```bash
git push origin main --follow-tags
```

### 4. Create a GitHub Release

```bash
gh release create v1.3.0 \
  --title "v1.3.0" \
  --notes-file <(node scripts/generate-release-notes.mjs --dry-run --output stdout)
```

Or in the GitHub UI: create the release from the tag and paste the dry-run / preview Markdown into the body.

---

## CHANGELOG guidance

`CHANGELOG.md` is an append-at-top file. Each entry has the structure:

```markdown
## [1.3.0] – 2026-07-26

### ⚠️ Breaking Changes

- **api**: remove deprecated /v1/stats endpoint (`abc12345`)
  > Clients using /v1/stats must migrate to /graphql query stats{}

### ✨ Features

- **frontend**: add performance alert toasts (`def67890`)
- **api**: performance alerting service for GraphQL and HTTP (`fed43210`)

### 🐛 Bug Fixes

- **indexer**: fix DLQ threshold not resetting after drain (`bcd89012`)

---
```

Maintainer checklist before publishing:

- Preview/dry-run output matches the intended user-facing changes.
- Breaking changes are explicit (`!` or `BREAKING CHANGE:` footer).
- Scopes reflect area labels (`api`, `frontend`, `indexer`, …).
- Non-conventional commits are skipped by the script (they do not fail generation)—fix those commits in history if they should appear.

---

## Maintainer verification

- [ ] `pnpm release:notes:preview` (or `--dry-run`) prints a correctly formatted Markdown entry to stdout.
- [ ] `pnpm release:notes -- --version <semver>` prepends the entry to `CHANGELOG.md`.
- [ ] Issue type/area labels were reflected in merged conventional commits.
- [ ] Breaking changes appear in a dedicated top section.
- [ ] GitHub Release body matches the dry-run output.

---

## See Also

- [Contributing Guide](../CONTRIBUTING.md) – commit message requirements and PR process
- [Contributor issue taxonomy](./contributor-issue-taxonomy.md) – issue labels and types
- [Versioning](./versioning.md) – semver and CHANGELOG section ownership
- `scripts/generate-release-notes.mjs` – script source with inline documentation
