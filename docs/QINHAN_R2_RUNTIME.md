# Qin-Han R2 runtime

- Status: **BLOCKED**
- Active Worker public base: `https://ad-fontes-media.gusgumee777.workers.dev`
- Frozen plan: **1,099 files / 199,500,311 bytes**
- Local Qin-Han media retained: **1,099 files / 199,500,311 bytes**
- Static Worker media references: **5 files / 9 occurrences**
- Dynamic archive media fields: **1,096 values / 1,096 unique files**
- Provenance Qin-Han media: **4 files**; Worker-resolved **4/4**; local requests **0**
- Runtime routing: **PASS** (static + dynamic archive + provenance resolver)
- Runtime coverage: **1,099/1,099 unique files**
- Worker HTTP: **0/1,099**
- Content-Length: **0/1,099**
- Worker object failures observed: **0**; unverified because terminal network was skipped/blocked: **1,099**
- SHA256 GET samples: **0/40**
- Cache-Control samples: **0/40**
- Direct local runtime requests for planned media: **0**
- Runtime old `r2.dev` references: **0**
- Double module prefix / `file://` / Windows absolute paths: **0 / 0 / 0**
- Preloads: **2**; `fetchpriority=high`: **1**
- Terminal HTTP smoke: **PASS** (9 resources checked)
- Terminal Worker revalidation: **BLOCKED** (Python single URL HTTP 403; curl.exe single URL exit 28; terminal network path to workers.dev unavailable)
- Browser smoke: **PASS** (Chrome/Playwright: provenance 4/4 Worker HTTP 200; representative runtime regression passed; terminal Worker revalidation remains blocked); console **0 errors / 0 warnings**; provenance **4/4**; media failures **0**
- Historical upload verification baseline: **PASS** — 1,099 files / 199,500,311 bytes; HTTP 1,099; Content-Length 1,099; SHA256 samples 40; Cache-Control samples 40
- Binary media changes: **0**
- Verification blockers: **Worker HTTP verified 0 != 1099; Worker Content-Length verified 0 != 1099; SHA256 samples verified 0 != 40; SHA256 sample family missing: photos; SHA256 sample family missing: processed-crop; SHA256 sample family missing: processed-full; SHA256 sample family missing: external; Cache-Control samples verified 0 != 40**

`archive.json` keeps its original `assets/...` values. The runtime boundary is
`qinhanMediaUrl()`, which delegates to the shared vendor-neutral resolver and
maps those values to the unchanged `modules/qinhan/...` Worker object keys.
