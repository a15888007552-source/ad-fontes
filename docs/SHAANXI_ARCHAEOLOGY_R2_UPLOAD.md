# Shaanxi Archaeology Museum R2 upload

## Result

- Status: `PASS_STORAGE_WORKER_BLOCKED`
- Module: `shaanxi-archaeology-museum`
- Planned local media: 1061 files / 103024634 bytes
- Local existence: 1061/1061
- Local size verification: 1061/1061
- Local SHA-256 verification: 1061/1061
- Local media retained: 1061 files / 103024634 bytes
- Deleted media: 0

## R2 S3 storage verification

- Bucket: `ad-fontes-media`
- Object key prefix: `modules/shaanxi-archaeology-museum/`
- Upload command result: PASS
- Uploaded according to the exact frozen plan: 1061 files
- Upload failures: 0
- S3 objects verified: 1061/1061
- S3 bytes verified: 103024634/103024634
- Missing objects in checked prefixes: 0
- Size mismatches: 0
- Extra objects in checked prefixes: 0
- Already-present count: not independently measured; the upload used an idempotent no-check-destination pass after destination preflight compatibility errors.

Forty objects were downloaded from S3 and compared with the local plan SHA-256 values. All 40 matched, with samples covering backgrounds, hero, brand emblem, photo thumbs, photo web variants, and contact sheets.

## Public Worker verification

- Active public base: `https://ad-fontes-media.gusgumee777.workers.dev`
- Terminal network status: `BLOCKED`
- Diagnostic: `curl.exe` exited with code 6 while resolving the `workers.dev` hostname.
- Worker HTTP, Content-Length, Content-Type, Cache-Control, and missing-object 404 checks: not counted as object failures because the terminal could not resolve the public endpoint.

The public Worker was not reported as `0/1061` failure. A future run with working terminal DNS/network should verify all 1061 public URLs, Content-Length, representative Content-Type and Cache-Control headers, plus a missing-object 404.

## Plan characteristics

- Dynamic-runtime files: 308
- Source-original files: 0
- Unknown files: 2
- Reference types: `manifest` 1053, `dynamic_runtime` 308, `other` 308, `css_url` 6, `js_literal` 6, `html_src` 4, `html_href` 1
- Main checked directories: `assets/backgrounds` (6), `assets/hero` (1), `assets/brand-emblem.png` (1), `assets/photos/thumbs` (521), `assets/photos/web` (521), and `review/contact-sheets` (11)

No HTML, CSS, JavaScript, runtime media URL, or other module was modified. No credentials were recorded. No binary file was added, modified, or deleted.
