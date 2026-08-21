# Qin-Han media externalized

- Status: **PASS**
- Current tree reduction: **1,099 local media files / 199,500,311 bytes removed**
- Frozen recovery manifest: `data/qinhan-externalized-media.json` (1,099 files / 199,500,311 bytes)
- Active Worker runtime remains: `https://ad-fontes-media.gusgumee777.workers.dev`
- Runtime coverage: **1,099/1,099**; direct local runtime requests **0**; old `r2.dev` references **0**
- Provenance Worker routing: **4/4**; local provenance requests **0**
- Historical upload evidence: **PASS**, 1,099 files / 199,500,311 bytes; HTTP 1,099; Content-Length 1,099; SHA256 samples 40; Cache-Control samples 40
- Historical runtime evidence: routing **PASS**, browser smoke **PASS**; terminal Worker status was **BLOCKED**
- Post-delete browser smoke: **SKIPPED**; console errors **0**; media failures **0**; local media network requests **0**
- Post-delete audit: **5,449 files / 783,543,452 bytes**; current externalizable plan **3,433 files / 462,569,919 bytes**
- Binary changes: additions **0**, modifications **0**, deletions **1099**

The local Qin-Han copies were removed only after the frozen manifest, local size/SHA-256 checks, historical Worker evidence, and runtime routing checks passed. The R2/Worker objects were not modified, the Worker and Qin-Han runtime URLs were not changed, and no other module was processed.

`scripts/validate_qinhan_r2.py` remains the pre-delete/runtime-stage validator because it expects local Qin-Han media to exist. Use `scripts/validate_qinhan_externalized.py --validate` for the post-delete state.

This reduces the **current tree** only. Git history still retains the old media blobs; this task does not rewrite Git history. The frozen manifest is the recovery reference for any future local restoration.
