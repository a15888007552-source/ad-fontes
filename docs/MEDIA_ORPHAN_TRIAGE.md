# MEDIA ORPHAN TRIAGE

- Input suspected orphans: **1** / **74,766 bytes (73.01 KiB)**
- No media file was deleted, moved, compressed, renamed, or re-encoded.
- probable_unused is a review label only; source_original and generated_derivative are not deletion approvals.

## Classification totals

| Classification | Files | Bytes |
|---|---:|---:|
| confirmed_referenced | 0 | 0 (0 B) |
| probable_dynamic_reference | 0 | 0 (0 B) |
| source_original | 0 | 0 (0 B) |
| generated_derivative | 0 | 0 (0 B) |
| probable_unused | 0 | 0 (0 B) |
| unknown | 1 | 74,766 (73.01 KiB) |

## By module

| Module | Orphans | Bytes | High-confidence probable_unused bytes | Dynamic rescue bytes |
|---|---:|---:|---:|---:|
| global | 1 | 74,766 | 0 | 0 |

## High-confidence probable_unused

- Count: **0**
- Bytes: **0 (0 B)**
- The list is sorted by bytes. These are candidates for human review, not automatic cleanup.

| # | Path | Bytes | Module | Reason |
|---:|---|---:|---|---|
| — | — | 0 | — | none |

## Source originals and generated derivatives

- source_original: **0** / **0 bytes (0 B)**
- generated_derivative: **0** / **0 bytes (0 B)**
- probable_dynamic_reference rescues: **0** / **0 bytes (0 B)**
- Exact second-pass static references: **0** / **0 bytes**

## Variant families

- Families involving suspected orphans: **0**
- Referenced web/display/thumb siblings are recorded explicitly; unreferenced members remain review items.

| Family key | Members | Referenced members | Bytes |
|---|---:|---:|---:|
| — | 0 | 0 | 0 |

## Priority directories by potential storage action

The first rows are probable_unused release candidates. generated_derivative rows are pipeline-review candidates only; they are not deletion approvals.

| # | Basis | Directory | Orphans | Bytes | probable_unused bytes | generated_derivative bytes |
|---:|---|---|---:|---:|---:|---:|
| — | — | — | 0 | 0 | 0 | 0 |

## Special directories

| Directory | Orphans | Bytes | Dynamic | Source original bytes | Generated derivative bytes | High-confidence probable_unused bytes |
|---|---:|---:|---:|---:|---:|---:|
| assets/photos | 0 | 0 | 0 | 0 | 0 | 0 |
| modules/shaanxi-history/assets | 0 | 0 | 0 | 0 | 0 | 0 |
| modules/qinhan/assets | 0 | 0 | 0 | 0 | 0 | 0 |
| modules/xian-museum/assets | 0 | 0 | 0 | 0 | 0 | 0 |
| modules/shaanxi-archaeology-museum/assets | 0 | 0 | 0 | 0 | 0 | 0 |
| modules/europa/assets | 0 | 0 | 0 | 0 | 0 | 0 |
| modules/baoji/assets | 0 | 0 | 0 | 0 | 0 | 0 |

### Suitable to keep in website repository

- none detected

### Web/display-only candidates

- none detected

### Originals-out-of-repository candidates

- none detected

### Needs later manual confirmation

- none detected

## Guardrails

- Input is the suspected_orphan set from data/media-inventory.json; all six classifications sum to that exact set and byte total.
- Dynamic checks cover JS template literals, simple string concatenation, Python formatted strings, manifest-like JSON, HTML data-* values, CSS url(), and code/data stem context.
- No PDF content, image pixels, EXIF, OCR, network resource, or media payload was read.
- Re-run with python scripts/triage_media_orphans.py; --validate checks generated artifacts without rewriting them.
