# Local development

AD FONTES is a static site. No build step or package manager is required for
the normal site surface. From the repository root, start a local HTTP server:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8765/>. Serving over HTTP matters because several
modules load relative data files and browser security rules differ from a
`file://` page.

GitHub Codespaces uses the repository's `.devcontainer/devcontainer.json`.
It provides Python 3, Node.js 22, Git, and port forwarding for port 8765.
Playwright is intentionally installed only when browser QA is needed:

```bash
python -m pip install --upgrade playwright
python -m playwright install chromium
```

# Branch workflow

Do not work directly on `main`. Create a short-lived branch from the latest
`main`, then open a pull request:

```text
feature/*   new product or research-facing capability
fix/*       focused correction
content/*   reviewed historical/content change
codex/*     infrastructure or agent-assisted maintenance
```

Keep infrastructure work separate from historical-content edits. Do not
rewrite Git history or force-push `main`.

# QA

The existing module-specific checks remain authoritative for their contracts.
Run the smallest relevant set locally:

```bash
node --check scripts/qa.mjs
node scripts/qa.mjs
python scripts/repository_integrity.py --base-ref origin/main
python scripts/scholarly_integrity.py
python -m unittest discover -s tests -p "test_*.py" -v
```

The repository-integrity checker parses JSON, checks collection-scoped IDs,
checks literal HTML/CSS references, reports missing image `alt` attributes,
guards the retired media host, detects obvious production placeholders, and
checks only PR-changed files for the media-size limit. It intentionally does
not pretend to understand URLs assembled dynamically by JavaScript.

For browser smoke, use the existing Museum Atlas script together with the core
site smoke:

```bash
python scripts/smoke_core_site.py --output artifacts/core-site-smoke.json
python scripts/smoke_museum_atlas_browser.py --output artifacts/museum-atlas-browser-smoke.json
```

The core smoke covers the homepage, Europa, and Museum Atlas. Its Europa check
fills the real search input and requires a result to be visible with a usable
bounding box inside the viewport. It does not replace the existing Museum
Atlas smoke.

The first visual-regression pass captures deterministic PNG artifacts for the
homepage, Europa, and Museum Atlas at 1440×1000 and 390×844:

```bash
python scripts/visual_regression.py --output-dir artifacts/visual-regression
```

The `AD FONTES Infrastructure Integrity` workflow uploads these images so they
can be downloaded from GitHub Actions. A reviewed baseline can later be passed
to the same script with `--baseline-dir` (and optionally `--diff-dir`); the
comparison mode requires Pillow. Baselines are not auto-committed by CI.

# Media policy

Large source media should not be added to Git merely because it is available
locally. For web delivery, prefer WebP or AVIF after preserving the source and
its provenance in the appropriate research record. Larger media should use the
existing R2/media-externalization infrastructure when that route is already
defined for the module.

The repository size guard warns above 5 MB and fails above 20 MB, but only for
files added or modified by the current change. Existing historical files are
not retroactively made into failures, and Infrastructure v1 does not delete
media or rewrite history.

# Historical integrity

AI tools may assist with infrastructure, transformation, and validation.
AI-generated historical assertions are not accepted as evidence. Historical
claims require traceable sources and human review. The Scholarly Integrity
audit validates machine-readable structure when the repository actually
provides it; it does not decide whether a historical interpretation is true.

See [SCHOLARLY_INTEGRITY.md](SCHOLARLY_INTEGRITY.md) for the current field
inventory and the boundary between enforceable and `NOT YET ENFORCEABLE`
checks.
