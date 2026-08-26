"""Browser audit for museum pages: console errors, failed/broken media, layout overflow.

Checks every museum page at desktop and mobile viewports, scrolling through each page
to trigger lazy loads, then reports:

- console errors / page exceptions
- failed HTTP responses (>= 400) and failed requests
- img elements that never reached naturalWidth > 0 (broken or unloaded lazies)
- horizontal overflow (scrollWidth > clientWidth)
- zero-sized images (rendered with 0 box)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit

BASE = "http://127.0.0.1:8765"

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
    "tomb-beilin": "/modules/tomb-trails/index.html?museum=beilin&embed=1",
    "tomb-archaeology": "/modules/tomb-trails/index.html?museum=archaeology&embed=1",
    "tomb-qinhan": "/modules/tomb-trails/index.html?museum=qinhan&embed=1",
    "tomb-baoji": "/modules/tomb-trails/index.html?museum=baoji&embed=1",
    "tomb-history": "/modules/tomb-trails/index.html?museum=history&embed=1",
    "tomb-xian": "/modules/tomb-trails/index.html?museum=xian&embed=1",
}

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobile": {"width": 390, "height": 844},
}

SCROLL_JS = """
async (steps) => {
  const doc = document.scrollingElement || document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  for (let i = 0; i < steps; i++) {
    window.scrollTo(0, Math.min(max, window.innerHeight * (i + 0.8)));
    await new Promise(r => setTimeout(r, 180));
  }
}
"""

IMG_AUDIT_JS = """
() => {
  const isHidden = (el) => {
    for (let n = el; n; n = n.parentElement) {
      if (n.hidden) return true;
      const dlg = n.closest ? null : null;
      if (n.tagName === 'DIALOG' && !n.open) return true;
      const style = getComputedStyle(n);
      if (style.display === 'none' || style.visibility === 'hidden') return true;
      if (n.tagName === 'DETAILS' && !n.open) return true;
    }
    return false;
  };
  const broken = [];
  const zeroBox = [];
  const lazyPending = [];
  for (const img of document.querySelectorAll('img')) {
    const src = (img.getAttribute('src') || '').trim();
    if (!src) continue;  // placeholder filled on demand (dialogs, lightboxes)
    if (isHidden(img)) continue;
    const box = img.getBoundingClientRect();
    const loaded = img.complete && img.naturalWidth > 0;
    if (img.complete && img.naturalWidth === 0) {
      broken.push({ src: img.currentSrc || img.src, alt: img.alt || '' });
    }
    if (loaded && box.width < 1 && box.height < 1) {
      zeroBox.push({ src: img.currentSrc || img.src, box: [Math.round(box.width), Math.round(box.height)] });
    }
  }
  for (const img of document.querySelectorAll('img[loading="lazy"]')) {
    if (isHidden(img)) continue;
    if (!(img.complete && img.naturalWidth > 0)) {
      lazyPending.push({ src: img.currentSrc || img.src, offsetTop: Math.round(img.offsetTop) });
    }
  }
  return { broken, zeroBox, lazyPending };
}
"""

SCROLL_CONTAINERS_JS = """
() => {
  const targets = [];
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if ((s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowY === 'auto' || s.overflowY === 'scroll')
        && el.scrollWidth > el.clientWidth + 4) {
      targets.push(el);
    }
  }
  return targets.map(el => ({ top: el.getBoundingClientRect().top + window.scrollY, height: el.clientHeight }));
}
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("artifacts/audit-pages.json"))
    parser.add_argument("--only", nargs="*", default=None, help="page names to audit")
    args = parser.parse_args()

    report = {"baseUrl": BASE, "pages": {}}
    exit_code = 0
    try:
        from playwright.sync_api import sync_playwright
    except Exception as error:
        print(f"Playwright import failed: {error}")
        return 1

    targets = {name: path for name, path in PAGES.items() if not args.only or name in args.only}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        for name, path in targets.items():
            for vp_name, vp in VIEWPORTS.items():
                page_report = {
                    "path": path,
                    "status": None,
                    "consoleErrors": [],
                    "pageErrors": [],
                    "failedResponses": [],
                    "failedRequests": [],
                    "brokenImages": [],
                    "zeroBoxImages": [],
                    "lazyNotLoaded": [],
                    "overflow": None,
                    "widths": None,
                    "imgCount": 0,
                }
                context = browser.new_context(viewport=vp)
                page = context.new_page()

                def on_console(message, pr=page_report):
                    if message.type == "error":
                        text = message.text
                        if len(text) > 300:
                            text = text[:300] + "..."
                        pr["consoleErrors"].append(text)

                def on_pageerror(error, pr=page_report):
                    pr["pageErrors"].append(str(error)[:300])

                def on_response(response, pr=page_report):
                    if response.status >= 400:
                        pr["failedResponses"].append(f"{response.status} {response.url}")

                def on_requestfailed(request, pr=page_report):
                    pr["failedRequests"].append(f"{request.url} ({request.failure})")

                page.on("console", on_console)
                page.on("pageerror", on_pageerror)
                page.on("response", on_response)
                page.on("requestfailed", on_requestfailed)

                try:
                    response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
                    page_report["status"] = response.status if response else None
                    page.wait_for_timeout(2500)
                    # scroll through the page in passes to trigger intersection lazies
                    for _ in range(3):
                        page.evaluate(SCROLL_JS, 10)
                        page.wait_for_timeout(600)
                    # scroll any inner horizontal/vertical scrollers (tomb-trails slider, galleries)
                    containers = page.evaluate(SCROLL_CONTAINERS_JS)
                    for c in containers:
                        page.evaluate(
                            """(pos) => {
                              const el = document.elementFromPoint(window.innerWidth - 20, pos.top + 40);
                              const scroller = el && el.closest('*') || null;
                              const all = [...document.querySelectorAll('*')];
                              const target = all.find(x => Math.abs(x.getBoundingClientRect().top + window.scrollY - pos.top) < 2
                                                           && (x.scrollWidth > x.clientWidth + 4 || x.scrollHeight > x.clientHeight + 4));
                              if (target) {
                                window.scrollTo(0, Math.max(0, pos.top - 80));
                                target.scrollLeft = target.scrollWidth;
                                target.dispatchEvent(new Event('scroll'));
                              }
                            }""",
                            c,
                        )
                        page.wait_for_timeout(400)
                        page.evaluate(
                            """(pos) => {
                              const all = [...document.querySelectorAll('*')];
                              const target = all.find(x => Math.abs(x.getBoundingClientRect().top + window.scrollY - pos.top) < 2
                                                           && (x.scrollWidth > x.clientWidth + 4 || x.scrollHeight > x.clientHeight + 4));
                              if (target) { target.scrollLeft = 0; target.dispatchEvent(new Event('scroll')); }
                            }""",
                            c,
                        )
                        page.wait_for_timeout(400)
                    page.evaluate(SCROLL_JS, 10)
                    page.wait_for_timeout(1500)
                    img_audit = page.evaluate(IMG_AUDIT_JS)
                    page_report["brokenImages"] = img_audit["broken"][:30]
                    page_report["zeroBoxImages"] = img_audit["zeroBox"][:30]
                    page_report["lazyNotLoaded"] = img_audit["lazyPending"][:30]
                    page_report["imgCount"] = page.evaluate("document.querySelectorAll('img').length")
                    widths = page.evaluate(
                        """() => {
                          const doc = document.scrollingElement || document.documentElement;
                          return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, scrollHeight: doc.scrollHeight };
                        }"""
                    )
                    page_report["widths"] = widths
                    page_report["overflow"] = widths["scrollWidth"] > widths["clientWidth"] + 1
                except Exception as error:
                    page_report["pageErrors"].append(f"AUDIT-ERROR {str(error)[:300]}")
                finally:
                    context.close()

                overflow_note = (
                    f"OVERFLOW {widths['scrollWidth'] - widths['clientWidth']}px"
                    if page_report["overflow"]
                    else "ok"
                )
                problems = (
                    len(page_report["consoleErrors"])
                    + len(page_report["pageErrors"])
                    + len(page_report["failedResponses"])
                    + len(page_report["failedRequests"])
                    + len(page_report["brokenImages"])
                    + len(page_report["zeroBoxImages"])
                    + (1 if page_report["overflow"] else 0)
                )
                flag = "FAIL" if problems else "OK"
                if problems:
                    exit_code = 1
                print(f"{flag:4s} {name:20s} {vp_name:7s} imgs={page_report['imgCount']:4d} "
                      f"console={len(page_report['consoleErrors'])} pageerr={len(page_report['pageErrors'])} "
                      f"httpfail={len(page_report['failedResponses'])} reqfail={len(page_report['failedRequests'])} "
                      f"broken={len(page_report['brokenImages'])} zerobox={len(page_report['zeroBoxImages'])} "
                      f"lazyPending={len(page_report['lazyNotLoaded'])} {overflow_note}")
                report["pages"][f"{name}-{vp_name}"] = page_report

        browser.close()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"report written to {args.output}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
