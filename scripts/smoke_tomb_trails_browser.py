#!/usr/bin/env python3
"""Browser smoke for the seven-museum tomb-trails product.

Covers: seven museum host pages (iframe wiring, renderable slide contract,
repository-owned images fully loaded, no legacy provenance component, no
HTTP 404s), the standalone tomb-trails page (tabs, slides, controls,
keyboard), desktop blank-space regression, mobile checks, and validated
visual-review screenshots. Every accepted screenshot must pass four hard
checks: section visible, iframe loaded, first slide present, and an
elementFromPoint occlusion proof at the iframe's visible center — taken
after dismissing each host page's opening overlay the way a user would.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765/"
HOSTS = [
    ("qinhan", "modules/qinhan/", "qinhan", 4),
    ("xian-museum", "modules/xian-museum/", "xian", 5),
    ("shaanxi-history", "modules/shaanxi-history/", "history", 6),
    ("shaanxi-archaeology-museum", "modules/shaanxi-archaeology-museum/", "archaeology", 6),
    ("baoji", "modules/baoji/", "baoji", 8),
    ("beilin", "modules/beilin/", "beilin", 4),
    ("shangqiu-museum", "modules/shangqiu-museum/", "shangqiu", 5),
]
OPENING_SKIP_SELECTORS = ("#opening-skip", ".opening-skip", ".museum-opening-lite__skip")
OPENING_CONTAINER_SELECTORS = ("#opening", "#opening-screen", ".museum-opening-lite")


def fail(failures: list[str], message: str) -> None:
    failures.append(message)


def dismiss_opening(page) -> list[str]:
    """Perform the normal user 'skip intro' action when an opening UI exists."""
    dismissed: list[str] = []
    for selector in OPENING_SKIP_SELECTORS:
        try:
            button = page.locator(selector)
            deadline = time.monotonic() + 8
            clicked = False
            while time.monotonic() < deadline:
                if button.count() and button.first.is_visible():
                    button.first.click(force=True, timeout=2000)
                    clicked = True
                    break
                page.wait_for_timeout(300)
            if clicked:
                dismissed.append(selector)
        except Exception:
            continue
    for selector in OPENING_CONTAINER_SELECTORS:
        try:
            page.locator(selector).first.wait_for(state="hidden", timeout=6000)
        except Exception:
            continue
    return dismissed


def slide_metrics(frame) -> dict:
    return frame.evaluate(
        """() => {
            const slides = Array.from(document.querySelectorAll('#slides .slide'));
            let renderable = 0, localTotal = 0, localLoaded = 0, fallbacks = 0, broken = 0;
            for (const slide of slides) {
                const img = slide.querySelector('.site-image img');
                const pending = slide.querySelector('.site-image.image-pending');
                const imgOk = img && img.complete && img.naturalWidth > 0;
                if (img && !imgOk && !pending) broken += 1;
                if (imgOk || (pending && !img)) renderable += 1;
                if (pending) fallbacks += 1;
                if (img) {
                    const src = img.getAttribute('src') || '';
                    if (!src.startsWith('http')) { localTotal += 1; if (imgOk) localLoaded += 1; }
                }
            }
            return {slides: slides.length, renderable, localTotal, localLoaded, fallbacks, broken};
        }"""
    )


def scroll_to_section(page, iframe_locator) -> None:
    """Bring the tomb-trails section toward the viewport.

    Host pages differ: some scroll the window, several use an inner scroll
    container (window.scrollTo is a no-op there), so Playwright's
    scroll_into_view_if_needed drives the real container and an explicit
    window scroll is kept as a fallback. Geometry + occlusion are asserted
    by the caller before any screenshot is accepted.
    """
    try:
        iframe_locator.scroll_into_view_if_needed(timeout=15000)
    except Exception:
        pass
    page.evaluate(
        """() => {
            const section = document.querySelector('.museum-tomb-trails');
            if (!section) return;
            const top = section.getBoundingClientRect().top + window.scrollY;
            if (document.documentElement.scrollHeight > window.innerHeight) {
                window.scrollTo({top: Math.max(0, top - 40), behavior: 'instant'});
            }
        }"""
    )


def reframe(page, iframe_locator) -> None:
    """Re-frame right before capture: host pages may reset their inner
    scroll container after programmatic scrolls."""
    try:
        iframe_locator.scroll_into_view_if_needed(timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(900)


def occlusion_free(page) -> dict:
    """elementFromPoint proof: the iframe's visible center must hit the
    iframe itself, not an opening overlay / dialog / hero / fixed layer."""
    return page.evaluate(
        """() => {
            const frame = document.querySelector('.museum-tomb-trails iframe');
            if (!frame) return {ok: false, reason: 'no-iframe'};
            const r = frame.getBoundingClientRect();
            const vh = window.innerHeight, vw = window.innerWidth;
            const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, vh);
            const left = Math.max(r.left, 0), right = Math.min(r.right, vw);
            if (bottom <= top || right <= left) return {ok: false, reason: 'iframe-not-in-viewport'};
            const cx = Math.round((left + right) / 2), cy = Math.round((top + bottom) / 2);
            const el = document.elementFromPoint(cx, cy);
            const hit = el === frame;
            const label = el ? (el.id || String(el.className).slice(0, 60) || el.tagName) : 'nothing';
            return {ok: hit, reason: hit ? 'ok' : `occluded-by:${label}`, point: [cx, cy]};
        }"""
    )


def section_in_viewport(page) -> dict:
    return page.evaluate(
        """() => {
            const vh = window.innerHeight, vw = window.innerWidth;
            const section = document.querySelector('.museum-tomb-trails');
            const frame = section ? section.querySelector('iframe') : null;
            if (!section || !frame) return {ok: false, reason: 'missing'};
            const sr = section.getBoundingClientRect();
            const fr = frame.getBoundingClientRect();
            const sectionVisible = sr.top < vh && sr.bottom > 0 && sr.width > 0;
            const frameVisible = fr.top < vh && fr.bottom > 0 && fr.width >= vw * 0.9;
            return {
                ok: sectionVisible && frameVisible,
                reason: sectionVisible ? (frameVisible ? 'ok' : 'frame-not-in-viewport') : 'section-not-in-viewport',
                sectionTop: Math.round(sr.top), sectionBottom: Math.round(sr.bottom),
                frameTop: Math.round(fr.top), frameHeight: Math.round(fr.height)
            };
        }"""
    )


def first_slide_in_viewport(frame) -> bool:
    return frame.evaluate(
        """() => {
            const slide = document.querySelector('#slides .slide');
            if (!slide) return false;
            const r = slide.getBoundingClientRect();
            const vh = window.innerHeight;
            return r.top < vh && r.bottom > 0 && r.width > 0;
        }"""
    )


def pending_slide_in_viewport(frame) -> bool:
    return frame.evaluate(
        """() => {
            const pending = document.querySelector('#slides .site-image.image-pending');
            if (!pending) return false;
            const r = pending.getBoundingClientRect();
            return r.top < window.innerHeight && r.bottom > 0 && r.width > 0;
        }"""
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=BASE)
    parser.add_argument("--output", type=Path, default=Path("artifacts/tomb-trails-browser-smoke.json"))
    parser.add_argument("--review-dir", type=Path, default=Path("artifacts/tomb-trails-review"))
    args = parser.parse_args()
    base = args.base_url.rstrip("/") + "/"
    args.review_dir.mkdir(parents=True, exist_ok=True)

    report: dict = {"status": "FAIL", "hosts": {}, "standalone": {}, "mobile": {}, "openingOverlaysDismissed": []}
    failures: list[str] = []
    console_errors: list[str] = []
    page_errors: list[str] = []
    http_404s: list[str] = []
    external_fallbacks_total = 0
    visual_valid = 0
    occlusion_free_count = 0
    visual_expected = 14
    fallback_valid: str = "N/A"

    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        # ---- seven museum host pages, desktop ----
        context = browser.new_context(viewport={"width": 1440, "height": 1100})
        page = context.new_page()
        page.on("response", lambda r: http_404s.append(f"desktop:{r.url}") if r.status == 404 else None)
        page.on("console", lambda m: console_errors.append(f"host:{m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(f"host:{e}"))
        for name, path, museum, expected_slides in HOSTS:
            entry: dict = {}
            resp = page.goto(base + path, wait_until="domcontentloaded", timeout=60000)
            entry["pageLoad"] = resp is not None and resp.status < 400
            if not entry["pageLoad"]:
                fail(failures, f"{name}: host page load failed")
                report["hosts"][name] = entry
                continue

            dismissed = dismiss_opening(page)
            if dismissed:
                report["openingOverlaysDismissed"] = sorted(
                    set(report["openingOverlaysDismissed"]) | {f"{name}:{d}" for d in dismissed}
                )

            iframes = page.locator("iframe[src*='tomb-trails/index.html']")
            entry["tombTrailsIframes"] = iframes.count()
            if entry["tombTrailsIframes"] != 1:
                fail(failures, f"{name}: tomb-trails iframe count {entry['tombTrailsIframes']} != 1")
                report["hosts"][name] = entry
                continue
            src = iframes.first.get_attribute("src") or ""
            entry["iframeSrc"] = src
            if f"museum={museum}" not in src or "embed=1" not in src:
                fail(failures, f"{name}: iframe src missing museum={museum} or embed=1: {src}")
            entry["hostCssLoaded"] = page.locator("link[href*='tomb-trails/host.css']").count() == 1
            entry["oldProvenanceScript"] = page.locator("script[src*='provenance-trails.js']").count()
            entry["oldProvenanceVisible"] = page.locator("#provenance-trails, .provenance-trails").count()
            if entry["oldProvenanceScript"] or entry["oldProvenanceVisible"]:
                fail(failures, f"{name}: legacy provenance component still present")

            scroll_to_section(page, iframes.first)
            page.wait_for_timeout(1800)
            frame = iframes.first.element_handle().content_frame()
            frame.wait_for_selector("#slides .slide", timeout=30000, state="attached")
            frame.evaluate(
                """() => { const el = document.querySelector('#slides');
                    document.querySelectorAll('#slides .slide').forEach(
                        (sl) => el.scrollTo({left: sl.offsetLeft})); el.scrollTo({left: 0}); }"""
            )
            page.wait_for_timeout(2000)
            slide_total = frame.locator("#slides .slide").count()
            for idx in range(slide_total):
                frame.evaluate(
                    """(i) => { const el = document.querySelector('#slides');
                        const sl = el.querySelectorAll('.slide')[i];
                        if (sl) el.scrollTo({left: sl.offsetLeft}); }""",
                    idx,
                )
                page.wait_for_timeout(350)
            page.wait_for_timeout(1500)
            # settle: wait (bounded) until no image is left mid-load
            for _ in range(16):
                metrics = slide_metrics(frame)
                if metrics["broken"] == 0:
                    break
                page.wait_for_timeout(1000)
            else:
                metrics = slide_metrics(frame)
            entry.update(
                slides=metrics["slides"],
                renderableSlides=metrics["renderable"],
                localImages=f"{metrics['localLoaded']}/{metrics['localTotal']}",
                externalFallbacks=metrics["fallbacks"],
                brokenImgs=metrics["broken"],
            )
            external_fallbacks_total += metrics["fallbacks"]
            if metrics["slides"] != expected_slides:
                fail(failures, f"{name}: slides {metrics['slides']} != {expected_slides}")
            if metrics["renderable"] != expected_slides:
                fail(failures, f"{name}: renderable slides {metrics['renderable']} != {expected_slides}")
            if metrics["localTotal"] and metrics["localLoaded"] != metrics["localTotal"]:
                fail(failures, f"{name}: repository images {metrics['localLoaded']}/{metrics['localTotal']}")
            if metrics["broken"]:
                fail(failures, f"{name}: {metrics['broken']} broken img elements remain")

            legacy = frame.locator(".pt-grid, .pt-card--lead").count()
            entry["legacyGridStructures"] = legacy
            if legacy:
                fail(failures, f"{name}: legacy .pt-grid/.pt-card--lead present")

            geo_metrics = page.evaluate(
                """() => {
                    const host = document.querySelector('.museum-tomb-trails');
                    const frame = host ? host.querySelector('iframe') : null;
                    if (!host || !frame) return null;
                    return {
                        iframeWidth: frame.getBoundingClientRect().width,
                        containerWidth: host.getBoundingClientRect().width,
                        hostScrollWidth: document.documentElement.scrollWidth,
                        hostClientWidth: document.documentElement.clientWidth
                    };
                }"""
            )
            if geo_metrics:
                ratio = geo_metrics["iframeWidth"] / geo_metrics["containerWidth"] if geo_metrics["containerWidth"] else 0
                entry["iframeWidthRatio"] = round(ratio, 4)
                entry["hostOverflow"] = geo_metrics["hostScrollWidth"] - geo_metrics["hostClientWidth"]
                if ratio < 0.95:
                    fail(failures, f"{name}: iframe width ratio {ratio:.3f} < 0.95")
                if entry["hostOverflow"] > 2:
                    fail(failures, f"{name}: host horizontal overflow {entry['hostOverflow']}px")
                frame_overflow = frame.evaluate(
                    "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
                )
                entry["iframeInnerOverflow"] = frame_overflow
                if frame_overflow > 2:
                    fail(failures, f"{name}: iframe inner horizontal overflow {frame_overflow}px")

            # screenshot: section element capture with four hard checks
            reframe(page, iframes.first)
            geo = section_in_viewport(page)
            slide_visible = first_slide_in_viewport(frame)
            occ = occlusion_free(page)
            entry["screenshotGeometry"] = geo
            entry["occlusion"] = occ
            if geo and geo.get("ok") and slide_visible and occ.get("ok"):
                page.locator(".museum-tomb-trails").screenshot(path=str(args.review_dir / f"{name}-desktop.png"))
                visual_valid += 1
                occlusion_free_count += 1
                entry["desktopValid"] = True
            else:
                entry["desktopValid"] = False
                fail(
                    failures,
                    f"{name}: desktop screenshot invalid (geo={geo} slideVisible={slide_visible} occ={occ})",
                )

            # fallback acceptance shot: qinhan only, when fallbacks occurred
            if metrics["fallbacks"] and name == "qinhan":
                frame.evaluate(
                    """() => { const el = document.querySelector('#slides');
                        const pend = document.querySelector('#slides .site-image.image-pending');
                        const slide = pend ? pend.closest('.slide') : null;
                        if (slide) el.scrollTo({left: slide.offsetLeft}); }"""
                )
                page.wait_for_timeout(900)
                reframe(page, iframes.first)
                occ_fb = occlusion_free(page)
                pending_visible = pending_slide_in_viewport(frame)
                if occ_fb.get("ok") and pending_visible:
                    page.locator(".museum-tomb-trails").screenshot(
                        path=str(args.review_dir / "qinhan-fallback-desktop.png")
                    )
                    fallback_valid = "YES"
                else:
                    fallback_valid = "NO"
                    fail(failures, f"qinhan fallback screenshot invalid (occ={occ_fb} pendingVisible={pending_visible})")
            report["hosts"][name] = entry

        # ---- standalone tomb-trails page ----
        standalone: dict = {}
        resp = page.goto(base + "modules/tomb-trails/", wait_until="domcontentloaded", timeout=60000)
        standalone["pageLoad"] = resp is not None and resp.status < 400
        page.wait_for_selector("#slides .slide", timeout=30000)
        standalone["museumTabs"] = page.locator(".museum-tab").count()
        standalone["slides"] = page.locator("#slides .slide").count()
        standalone["prevButton"] = page.locator("#prev").count()
        standalone["nextButton"] = page.locator("#next").count()
        if standalone["museumTabs"] != 8:
            fail(failures, f"standalone: museum tabs {standalone['museumTabs']} != 8")
        if standalone["slides"] != 38:
            fail(failures, f"standalone: slides {standalone['slides']} != 38")
        if not standalone["prevButton"] or not standalone["nextButton"]:
            fail(failures, "standalone: prev/next controls missing")
        position_before = page.locator("#position").inner_text()
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(900)
        position_after = page.locator("#position").inner_text()
        standalone["keyboardNavigation"] = position_before != position_after
        if position_before == position_after:
            fail(failures, "standalone: keyboard arrow navigation not working")
        report["standalone"] = standalone
        context.close()

        # ---- mobile checks ----
        mobile_context = browser.new_context(viewport={"width": 390, "height": 844})
        mpage = mobile_context.new_page()
        mpage.on("response", lambda r: http_404s.append(f"mobile:{r.url}") if r.status == 404 else None)
        mpage.on("console", lambda m: console_errors.append(f"mobile:{m.text}") if m.type == "error" else None)
        mpage.on("pageerror", lambda e: page_errors.append(f"mobile:{e}"))
        for name, path, museum, expected_slides in HOSTS:
            entry: dict = {}
            resp = mpage.goto(base + path, wait_until="domcontentloaded", timeout=60000)
            entry["pageLoad"] = resp is not None and resp.status < 400
            dismissed = dismiss_opening(mpage)
            if dismissed:
                report["openingOverlaysDismissed"] = sorted(
                    set(report["openingOverlaysDismissed"]) | {f"mobile:{name}:{d}" for d in dismissed}
                )
            iframe = mpage.locator("iframe[src*='tomb-trails/index.html']").first
            iframe.wait_for(state="visible", timeout=30000)
            scroll_to_section(mpage, iframe)
            mpage.wait_for_timeout(1500)
            entry["iframeVisible"] = iframe.is_visible()
            entry["hostOverflow"] = mpage.evaluate(
                "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
            )
            if entry["hostOverflow"] > 2:
                fail(failures, f"mobile {name}: host horizontal overflow {entry['hostOverflow']}px")
            frame = iframe.element_handle().content_frame()
            frame.wait_for_selector("#slides .slide", timeout=30000, state="attached")
            entry["slides"] = frame.locator("#slides .slide").count()
            entry["frameOverflow"] = frame.evaluate(
                "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
            )
            if entry["frameOverflow"] > 2:
                fail(failures, f"mobile {name}: iframe inner overflow {entry['frameOverflow']}px")
            entry["slidesScrollable"] = frame.evaluate(
                "() => { const el = document.querySelector('#slides'); return el ? el.scrollWidth > el.clientWidth : false; }"
            )
            reframe(mpage, iframe)
            geo = section_in_viewport(mpage)
            slide_visible = first_slide_in_viewport(frame)
            occ = occlusion_free(mpage)
            entry["screenshotGeometry"] = geo
            entry["occlusion"] = occ
            if geo and geo.get("ok") and slide_visible and occ.get("ok"):
                mpage.locator(".museum-tomb-trails").screenshot(path=str(args.review_dir / f"{name}-mobile.png"))
                visual_valid += 1
                occlusion_free_count += 1
                entry["mobileValid"] = True
            else:
                entry["mobileValid"] = False
                fail(failures, f"mobile {name}: screenshot invalid (geo={geo} occ={occ})")
            report["mobile"][name] = entry
        mobile_context.close()
        browser.close()

    report["http404s"] = http_404s[:10]
    if http_404s:
        fail(failures, f"HTTP 404 resources: {http_404s[:3]}")
    if console_errors:
        fail(failures, f"console errors: {console_errors[:3]}")
    if page_errors:
        fail(failures, f"page errors: {page_errors[:3]}")
    report["consoleErrors"] = len(console_errors)
    report["pageErrors"] = len(page_errors)
    report["externalImageFallbacks"] = external_fallbacks_total
    report["visualReviewValid"] = f"{visual_valid}/{visual_expected}"
    report["screenshotOcclusionFree"] = f"{occlusion_free_count}/{visual_expected}"
    report["fallbackScreenshotValid"] = fallback_valid
    if visual_valid != visual_expected:
        fail(failures, f"visual review screenshots valid {visual_valid}/{visual_expected}")
    if occlusion_free_count != visual_expected:
        fail(failures, f"occlusion-free screenshots {occlusion_free_count}/{visual_expected}")
    if external_fallbacks_total > 0 and fallback_valid != "YES":
        fail(failures, f"fallback screenshot valid = {fallback_valid}")
    report["failures"] = failures[:20]
    report["status"] = "PASS" if not failures else "FAIL"

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"TOMB_TRAILS_BROWSER_SMOKE={report['status']}")
    total_renderable = sum(e.get("renderableSlides", 0) for e in report["hosts"].values())
    print(f"RENDERABLE_SLIDES={total_renderable}/38")
    for name, entry in report["hosts"].items():
        print(f"HOST {name}: iframe={entry.get('tombTrailsIframes')} slides={entry.get('slides')} renderable={entry.get('renderableSlides')} local={entry.get('localImages')} fallbacks={entry.get('externalFallbacks')} broken={entry.get('brokenImgs')} desktopValid={entry.get('desktopValid')}")
    s = report["standalone"]
    print(f"STANDALONE: tabs={s.get('museumTabs')} slides={s.get('slides')} keyboard={s.get('keyboardNavigation')}")
    for name, entry in report["mobile"].items():
        print(f"MOBILE {name}: visible={entry.get('iframeVisible')} overflow={entry.get('hostOverflow')}/{entry.get('frameOverflow')} valid={entry.get('mobileValid')}")
    print(f"OPENING_DISMISSED={report['openingOverlaysDismissed']}")
    print(f"EXTERNAL_IMAGE_FALLBACKS={external_fallbacks_total}")
    print(f"VISUAL_REVIEW_VALID={visual_valid}/{visual_expected}")
    print(f"SCREENSHOT_OCCLUSION_FREE={occlusion_free_count}/{visual_expected}")
    print(f"FALLBACK_SCREENSHOT_VALID={fallback_valid}")
    print(f"HTTP_404={len(http_404s)}")
    print(f"CONSOLE_PAGE_ERRORS={report['consoleErrors']}/{report['pageErrors']}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
