# Shaanxi History Worker media pilot

- Status: **PASS**
- Active public base: `https://ad-fontes-media.gusgumee777.workers.dev`
- Planned and locally verified: **807 files / 385,001,226 bytes**
- Worker HTTP verification: **807/807**
- Content-Length verification: **807/807**
- SHA256 GET samples: **30/30** (`photos=10`, `card-covers=15`, `supplement=5`)
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
- Runtime legacy r2.dev references: **0**
- Worker method smoke: `GET existing=200`, `HEAD existing=200`, `GET missing=404`, `POST=405`, `PUT=405`, `DELETE=405`
- Browser smoke: **SKIPPED** (not launched: physical memory usage 79.3% was above the 75% safety threshold; Chrome/Chromium/Edge executables were unavailable on PATH)
- Terminal HTTP smoke: **PASS** (6 local resources checked)

The historical R2 verification records remain unchanged. This pilot keeps all local media files as rollback copies. It does not delete, move, compress, or upload media.
