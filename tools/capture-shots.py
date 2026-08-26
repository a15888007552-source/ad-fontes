import asyncio, os, sys
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8765"
OUT = r"C:\Users\GusGumee\ad-fontes-shots"
os.makedirs(OUT, exist_ok=True)

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

VIEWPORTS = {"desktop": {"width": 1440, "height": 900}}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for name, path in PAGES.items():
            for vp_name, vp in VIEWPORTS.items():
                ctx = await browser.new_context(viewport=vp, device_scale_factor=1)
                page = await ctx.new_page()
                try:
                    await page.goto(BASE + path, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_timeout(3500)
                    # scroll through page in steps to trigger lazy loads
                    for i in range(8):
                        await page.evaluate(f"window.scrollTo(0, {i * 1200})")
                        await page.wait_for_timeout(400)
                    await page.screenshot(path=os.path.join(OUT, f"{name}-{vp_name}-full.png"), full_page=True)
                    print(f"OK {name}-{vp_name}")
                except Exception as e:
                    print(f"FAIL {name}: {e}")
                await ctx.close()
        await browser.close()

asyncio.run(main())
