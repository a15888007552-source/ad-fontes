# Shaanxi Archaeology Museum R2 runtime

## Scope

- Module: `shaanxi-archaeology-museum`
- Active media base: `https://ad-fontes-media.gusgumee777.workers.dev`
- Frozen local/upload set: 1,061 files / 103,024,634 bytes
- Local copies: retained; no media was deleted, moved, or re-encoded
- Object keys: unchanged repo-relative paths under `modules/shaanxi-archaeology-museum/`

## Runtime routing

- `shared/js/media-url.js` remains the common resolver.
- `modules/shaanxi-archaeology-museum/media-url.js` is the module wrapper.
- HTML static media and loaded CSS media use the Worker URL directly.
- `photo-catalog.js` routes card `src`, `srcset`, selected photos, artifact main images, and dialog thumbnails through the wrapper.
- `assets/editorial/provenance-trails.js` routes only this module's six provenance images through the wrapper; Qin-Han and other module branches remain unchanged.
- Logical `assets/...` paths in the embedded artifact data remain unchanged and are resolved at runtime.
- Review/contact-sheet inventory entries are not runtime references in this module (`0` runtime files; 11 review plan entries remain available for tooling/metadata).

## Verification

The generated verification record is [shaanxi-archaeology-r2-runtime-verification.json](../data/shaanxi-archaeology-r2-runtime-verification.json).

- Static runtime media: 10 files / 26 references
- Dynamic data media paths: 734
- Dynamic runtime sinks: 6
- Provenance media routed: 6 / 6
- Runtime plan coverage: 742 files / 76,888,137 bytes
- Direct local runtime references: 0
- Old `r2.dev` runtime references: 0
- Resolver checks: PASS, including complete URLs, `data:`, `blob:`, query/hash preservation, module-prefix handling, and no double prefix
- Local retained media: 1,061 / 103,024,634 bytes
- Binary media changes: 0

The preceding Worker object verification recorded HTTP `1061/1061`, Content-Length `1061/1061`, 40/40 SHA-256 samples, 40/40 Content-Type samples, 40/40 Cache-Control samples, and a missing-object response of `404`. The current offline runtime validator preserves that evidence without re-uploading or re-requesting the full object set.

Terminal Worker access was recorded as `BLOCKED` for this run because the local terminal path remains subject to the previously observed TLS/connection limitation. Browser smoke is `SKIPPED`: physical memory was 86.2% used with 2,144 MB free, so no new Chrome context was launched under the safe-launch rule. This is not represented as a browser PASS.

## Regression boundary

- No other module runtime was changed.
- No Worker source or R2 object was changed.
- No local media URL was left as a direct runtime request for this module.
- `scripts/validate_shaanxi_archaeology_runtime.py` performs the offline checks and writes the verification JSON.
