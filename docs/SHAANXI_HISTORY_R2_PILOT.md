# Shaanxi History R2 pilot

- Status: **PASS**
- Public base: `https://pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev`
- Planned and locally verified: **807 files / 385,001,226 bytes**
- R2 URL verification: **807/807**
- Content-Length verification: **807/807**
- Static references migrated: **511 files / 518 references**
- Dynamic references migrated through the module wrapper: **296 files / 296 references**
- Local externalizable runtime requests: **0**
- Deleted media files: **0**
- Binary changes: **0**

## Media groups

| Group | Files | Bytes |
| --- | ---: | ---: |
| `card-covers` | 296 | 54,209,094 |
| `photos` | 499 | 320,896,334 |
| `supplement` | 5 | 6,267,388 |

## Runtime checks

- Wrapper: `shaanxiHistoryMediaUrl()` delegates to `shared/js/media-url.js` in external mode.
- Complete URLs, `data:`, `blob:`, query strings, and hashes remain unchanged by the wrapper.
- `assets/...` and `./assets/...` map to `modules/shaanxi-history/assets/...` without a duplicate module prefix.
- Browser smoke: **SKIPPED** (not launched: physical memory usage 100.0% was above the 75% safety threshold)
- Terminal HTTP smoke: **PASS** (6 local resources checked)

This pilot keeps all local media files as rollback copies. It does not delete, move, compress, or upload media.
