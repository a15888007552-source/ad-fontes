"""Measure card/text/layout metrics for round-2 polish."""
import asyncio
import json
from pathlib import Path

BASE = "http://127.0.0.1:8765"
PAGES = {
    "atlas-shaanxi": "/modules/museum-atlas/index.html?province=shaanxi",
    "shaanxi-history": "/modules/shaanxi-history/index.html",
    "xian-museum": "/modules/xian-museum/index.html",
    "qinhan": "/modules/qinhan/index.html",
    "baoji": "/modules/baoji/index.html",
    "shaanxi-archaeology": "/modules/shaanxi-archaeology-museum/index.html",
    "beilin": "/modules/beilin/index.html",
    "guobo": "/guobo-museum/index.html",
}

async def measure(page, name):
    data = {}
    # Card grids: find common grids
    data["cards"] = await page.evaluate("""
() => {
  const grids = [...document.querySelectorAll('.museum-list, .object-grid, .archive-grid, .treasure-grid, .review-grid, .route-grid, .special-preview, .theme-grid, .catalog-grid, .artifact-grid, .object-grid, .archive-grid')];
  const out = [];
  for (const g of grids) {
    const cards = [...g.children].filter(n => n.nodeType===1);
    if (!cards.length) continue;
    const rects = cards.map(c => {
      const r = c.getBoundingClientRect();
      // find title-like element
      const title = c.querySelector('h3,h4,.card-title,.archive-card h3,.object-caption h3,.card-excerpt strong');
      let lines = null;
      if (title) {
        const cs = getComputedStyle(title);
        const lh = parseFloat(cs.lineHeight);
        const h = title.getBoundingClientRect().height;
        if (lh && h) lines = Math.round(h / lh);
      }
      const summary = c.querySelector('.card-lead,.card-summary,.card-excerpt p,.archive-card-summary,.treasure-note');
      let sLines = null;
      if (summary) {
        const cs = getComputedStyle(summary);
        const lh = parseFloat(cs.lineHeight);
        const h = summary.getBoundingClientRect().height;
        if (lh && h) sLines = Math.round(h / lh);
      }
      return {w: Math.round(r.width), h: Math.round(r.height), titleLines: lines, summaryLines: sLines, title: title ? title.textContent.trim().slice(0,40) : ''};
    });
    // also check subtitle wrapping
    out.push({grid: g.className.slice(0,60), count: cards.length, rects});
  }
  return out;
}
""")
    # headings that may wrap unnecessarily
    data["headings"] = await page.evaluate("""
() => {
  const heads = [...document.querySelectorAll('h1,h2')];
  return heads.slice(0,12).map(h => {
    const cs = getComputedStyle(h);
    const lh = parseFloat(cs.lineHeight);
    const rectH = h.getBoundingClientRect().height;
    const lines = lh ? Math.round(rectH / lh) : null;
    return {tag: h.tagName, text: h.textContent.trim().slice(0,50).replace(/\\s+/g,' '), lines, w: Math.round(h.getBoundingClientRect().width), fs: cs.fontSize};
  });
}
""")
    # color contrast: sample ink vs paper
    data["colors"] = await page.evaluate("""
() => {
  const cs = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return {
    bg: body.backgroundColor,
    color: body.color,
    vars: {
      paper: cs.getPropertyValue('--paper').trim(),
      ink: cs.getPropertyValue('--ink').trim(),
      muted: cs.getPropertyValue('--muted').trim(),
      surface: cs.getPropertyValue('--surface').trim() || cs.getPropertyValue('--paper-light').trim(),
      accent: cs.getPropertyValue('--accent').trim() || cs.getPropertyValue('--red').trim() || cs.getPropertyValue('--gold').trim(),
    }
  }
}
""")
    # special sections
    data["special"] = await page.evaluate("""
() => {
  const el = document.querySelector('#special, .special, .special-preview');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const preview = document.querySelector('.special-preview');
  let cards = null;
  if (preview) {
    cards = [...preview.children].map(c => ({w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height)}));
  }
  return {w: Math.round(r.width), h: Math.round(r.height), cards};
}
""")
    print(f"\n=== {name} ===")
    print(json.dumps(data, ensure_ascii=False, indent=2))
    return {name: data}

async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        all_data = {}
        for name, path in PAGES.items():
            ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
            page = await ctx.new_page()
            await page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(3000)
            # scroll to trigger lazy
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(800)
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(500)
            d = await measure(page, name)
            all_data.update(d)
            await ctx.close()
        await browser.close()
        Path("artifacts/round2-survey.json").write_text(json.dumps(all_data, ensure_ascii=False, indent=2), encoding="utf-8")
        print("\nwritten to artifacts/round2-survey.json")

if __name__ == "__main__":
    asyncio.run(main())
