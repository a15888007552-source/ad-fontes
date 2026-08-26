import asyncio, os
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:8765"
OUT = r"C:\Users\GusGumee\ad-fontes-shots\viewport"
os.makedirs(OUT, exist_ok=True)

TARGETS = [
    ("atlas-top", "/modules/museum-atlas/index.html", 0),
    ("atlas-shaanxi", "/modules/museum-atlas/index.html?province=shaanxi", 0),
    ("atlas-cards", "/modules/museum-atlas/index.html?province=shaanxi", 1500),
    ("shaanxi-history-special", "/modules/shaanxi-history/index.html", 0),
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()
        for name, path, scroll in TARGETS:
            await page.goto(BASE + path, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(4000)
            if scroll:
                await page.evaluate(f"window.scrollTo(0, {scroll})")
                await page.wait_for_timeout(1500)
            await page.screenshot(path=os.path.join(OUT, f"{name}.png"))
            print(f"OK {name}")
        await browser.close()

asyncio.run(main())
