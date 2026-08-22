# Product regression guard

`scripts/product_guard.py` is the repository-wide product regression protector.

## Commands

```text
python scripts/product_guard.py verify                 # compare worktree against pinned baselines
python scripts/product_guard.py status                 # list pinned products
python scripts/product_guard.py pin <name> --user-approved <files...>
python scripts/product_guard.py changed-files --base origin/main --allow <path|dir/**>...
```

## Policy

- `pin` requires the explicit `--user-approved` flag. Only use it after the
  user has visually approved the product version. A passing test is not user
  approval; agents must never pin a baseline from their own judgement.
- `verify` only compares. It never updates expected hashes (no self-healing).
  A mismatch is always `PRODUCT_GUARD=FAIL` / exit 1.
- Baseline updates are always a separate, explicit, user-confirmed action:
  modify product → browser test → user visual confirmation → explicit user
  approval → update baseline.
- If a task intentionally modifies a protected product, the old baseline must
  make `verify` FAIL. Never re-pin automatically to make it pass.

## FINAL REGRESSION GATE

Every task must run the following in its final stage:

```text
python scripts/product_guard.py verify
node scripts/qa.mjs
git diff --check
git status --short
git diff --name-status origin/main...HEAD
python scripts/product_guard.py changed-files --base origin/main --allow <task allow list>
```

Any of the following means immediate STOP — no commit, no push, no PR, no merge:

- `PRODUCT_GUARD=FAIL`
- QA FAIL
- `UNAUTHORIZED_FILES > 0`
- protected file drift
- unexpected binary change

## INCIDENT RULE — 2026-08-22

A recovery / restore / rebase task must never validate only the requested
feature. It must also verify all previously approved product surfaces.

PR #21 restored newer Atlas functionality on top of an older provenance-trails
lineage and therefore silently removed the newer tomb-trails product.

A green CI result is insufficient when approved product surfaces are not
included in the regression contract.
