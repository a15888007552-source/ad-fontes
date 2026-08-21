# Shaanxi History media performance

- Active media base: `https://ad-fontes-media.gusgumee777.workers.dev`
- Object keys and media files: unchanged.

## Current URL/cache audit

- Relative runtime media goes through `assetFor()` and currently receives `?rev=20260817-polish1`.
- Before this optimization, HTML/CSS contained 10 hard-coded Worker media URL occurrences covering 7 unique resources; the 3 new preload declarations reuse those same unversioned paths, so no duplicate cache-busting URL is introduced.
- The static URLs are the brand emblem, opening desktop/mobile backgrounds, hero atmosphere, museum background, archive texture, and dialog underlay.
- Replacing an object under the same key can therefore leave an old static response in an edge/browser cache. Future same-key replacements should change one deployment revision in every HTML/CSS URL and matching preload; the object key itself must remain unchanged.

Recommended Worker response policy for immutable-by-revision media:

```text
public, max-age=86400, stale-while-revalidate=604800
```

## 首屏优化

- Critical images preloaded: **3**.
- The brand emblem is preloaded once.
- Desktop and mobile opening images use mutually exclusive `media` attributes at the same 760px breakpoint as the CSS, so only the viewport-appropriate opening image is eligible.
- The two opening-image preload declarations use `fetchpriority="high"`; only one matches a given viewport.
- No card/list media is preloaded.

## 非首屏图片

- Four dynamic image templates (object cards, gallery thumbnails, special cards, and treasure cards) retain `loading="lazy"` and now also use `decoding="async"`.
- The opening emblem remains non-lazy and is decoded asynchronously.
- The dialog's active main image remains non-lazy because it is interaction-driven and must appear when an item is opened.

## 验证记录

- Worker preload URL HTTP status: **3/3 200**.
- Worker preload Content-Length: **3/3 valid** (`55,484`, `397,868`, `342,824` bytes).
- Local HTTP smoke: **PASS**, 6/6 page/module resources returned 200.
- Runtime Worker references are present; runtime old `r2.dev` references: **0**.
- Browser smoke: **SKIPPED** because physical memory was **85.6%** (above the 75% safety threshold) and Chrome/Chromium/Edge were unavailable on PATH.
- Media inventory regression: **7,355 files / 1,368,044,989 bytes**, unchanged from PR #10.
- Media files deleted: **0**.
- Binary changes: **0**.
