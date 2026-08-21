# Shaanxi History Worker media migration

- Status: **PASS**
- Active media base: `https://ad-fontes-media.gusgumee777.workers.dev`
- Object keys: repo-relative paths under `modules/shaanxi-history/`
- Objects verified: **807/807**
- Total bytes verified: **385,001,226**
- Content-Length verified: **807/807**
- SHA256 GET samples: **30/30**
- Sample coverage: `photos=10`, `card-covers=15`, `supplement=5`
- Runtime legacy-host occurrences: **0**
- Local externalizable runtime requests: **0**
- Browser smoke: **SKIPPED** (not launched: physical memory usage 79.3% was above the 75% safety threshold; Chrome/Chromium/Edge executables were unavailable on PATH)
- Terminal HTTP smoke: **PASS** (6 local resources checked)

## Worker method smoke

| Request | Status |
| --- | ---: |
| GET existing object | 200 |
| HEAD existing object | 200 |
| GET nonexistent object | 404 |
| POST, no request body | 405 |
| PUT, no request body | 405 |
| DELETE, no request body | 405 |

The POST, PUT, and DELETE checks were status-only requests with no upload body. No R2 object was written or changed. Historical R2 verification records remain unchanged; this change only switches the Shaanxi History runtime entry to the Worker base. Local media files remain in place.
