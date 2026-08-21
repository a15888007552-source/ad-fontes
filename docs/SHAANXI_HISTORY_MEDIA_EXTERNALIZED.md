# Shaanxi History externalized media

- Status: **PASS**
- Frozen manifest: **807 files / 385,001,226 bytes**
- Active Worker public base: `https://ad-fontes-media.gusgumee777.workers.dev`
- Worker HTTP: **807/807**
- Content-Length: **807/807**
- SHA256 GET samples: **30/30** (`photos=10`, `card-covers=15`, `supplement=5`)
- Cache-Control samples: **30/30**
- Local frozen copies present: **0**
- Remaining Shaanxi History local media: **7 files / 5,817,325 bytes**
- Current plan Shaanxi externalizable media: **0 files / 0 bytes**
- Direct local runtime requests for frozen media: **0**
- Runtime old `r2.dev` references: **0**

## Deletion record

- Deleted from the current Git tree: **807 files / 385,001,226 bytes**.
- Binary additions: **0**.
- Binary modifications: **0**.
- Binary deletions: **807**.
- The R2/Worker objects were not deleted or modified.
- This change only shrinks the current Git tree and checkout. The old binary blobs remain in Git history.
- A history purge will be considered only after all modules have completed media migration.

## Runtime and smoke checks

- `data/shaanxi-history-externalized-media.json` is the permanent freeze source for the deleted objects.
- `assets/...` data literals remain allowed because `assetFor()` and `shaanxiHistoryMediaUrl()` resolve them to the Worker.
- Terminal HTTP smoke: **PENDING** (0 resources checked).
- Browser smoke: **SKIPPED** (not launched: physical memory usage 80.0% was above the 75% safety threshold)

Recommended Worker cache policy already verified on sampled responses:

```text
public, max-age=86400, stale-while-revalidate=604800
```
