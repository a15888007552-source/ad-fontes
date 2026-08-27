"""Round-2 screenshot capture: all museum pages at desktop + mobile for visual review.

Saves to artifacts/round2-shots/ with per-page per-viewport PNGs.
"""

import asyncio
import os
from pathlib import Path

BASE = "http://127.0.0.1:8765"
OUT = Path("artifacts/round2-shots")
OUT.mkdir(parents=True, exist_ok=True)

PAGES = {
    "atlas-top": "/modules/museum-atlas/index.html",
    "atlas-shaanxi": "/modules/museum-atlas/index.html?province=shaanxi",
    "atlas-henan": "/modules/museum-atlas/index.html?province=henan",
    "beilin": "/modules/beilin/index.html",
    "shaanxi-archaeology": "/modules/shaanxi-archaeology-museum/index.html",
    "qinhan": "/modules/qinhan/index.html",
    "baoji": "/modules/baoji/index.html",
    "shaanxi-history": "/modules/shaanxi-history/index.html",
    "xian-museum": "/modules/xian-museum/index.html",
    "guobo": "/guobo-museum/index.html",
}

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobile": {"width": 390, "height": 844},
}

SCROLL_JS = """
() => {
  const doc = document.scrollingElement || document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  for (let i = 0; i < 8; i++) {
    window.scrollTo(0, Math.min(max, window.innerHeight * (i + 0.8)));
  }
}
"""


async def main():
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for name, path in PAGES.items():
            for vp_name, vp in VIEWPORTS.items():
                ctx = await browser.new_context(viewport=vp)
                page = await ctx.new_page()
                try:
                    await page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
                    await page.wait_for_timeout(2500)
                    await page.evaluate(SCROLL_JS)
                    await page.wait_for_timeout(1200)
                    out_path = OUT / f"{name}-{vp_name}.png"
                    await page.screenshot(path=str(out_path), full_page=True)
                    print(f"OK {name:20s} {vp_name:7s} -> {out_path}")
                except Exception as e:
                    print(f"FAIL {name}: {e}")
                finally:
                    await ctx.close()
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
