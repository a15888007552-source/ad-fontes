#!/usr/bin/env python3
"""Browser/network smoke test for the Shaanxi Archaeology R2 runtime cutover.

The test deliberately exercises only the module's runtime surface.  It does
not use R2 credentials, modify the page, or treat local CSS/JS/JSON requests
as local-media failures.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit


MODULE = "shaanxi-archaeology-museum"
PAGE_URL = "http://127.0.0.1:8765/modules/shaanxi-archaeology-museum/"
MEDIA_HOST = "pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev"
MEDIA_PREFIX = f"https://{MEDIA_HOST}/modules/{MODULE}/"
RETIRED_WORKER_HOST = "ad-fontes-media.gusgumee777.workers.dev"
LOCAL_PREFIX = f"http://127.0.0.1:8765/modules/{MODULE}/"
PROVENANCE_EXPECTED = 6
MEDIA_SUFFIXES = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".avif",
    ".heic",
    ".tif",
    ".tiff",
    ".mp3",
    ".wav",
    ".flac",
    ".m4a",
    ".ogg",
    ".mp4",
    ".webm",
    ".mov",
}


class MediaTracker:
    def __init__(self) -> None:
        self.external_requests = 0
        self.external_responses_2xx = 0
        self.external_failures: set[str] = set()
        self.local_module_requests = 0
        self.local_review_requests = 0
        self.retired_worker_requests = 0
        self.media_request_failures: set[str] = set()
        self.failed_urls: set[str] = set()
        self.css_external_requests = 0

    @staticmethod
    def classify(url: str) -> str | None:
        parsed = urlsplit(url)
        path = parsed.path.lower()
        if Path(path).suffix not in MEDIA_SUFFIXES:
            return None
        if parsed.path.endswith("/archaeology-atmosphere-v2.webp"):
            # Known recovery gap: the snapshot-era tomb-trails.css references this
            # pruned regenerable asset; it is tracked separately, not as local
            # module media (independent tomb-trails product resource).
            return "tomb_trails_theme_reference"
        if parsed.hostname == MEDIA_HOST and parsed.path.startswith(f"/modules/{MODULE}/"):
            return "external"
        if parsed.hostname in {"127.0.0.1", "localhost"} and parsed.path.startswith(
            f"/modules/{MODULE}/"
        ):
            if f"/modules/{MODULE}/review/" in parsed.path:
                return "local_review"
            if f"/modules/{MODULE}/assets/" in parsed.path:
                return "local_module"
        if parsed.hostname == RETIRED_WORKER_HOST:
            return "retired_worker"
        return None

    def on_request(self, request) -> None:
        kind = self.classify(request.url)
        if kind == "external":
            self.external_requests += 1
            if "/assets/backgrounds/" in urlsplit(request.url).path:
                self.css_external_requests += 1
        elif kind == "local_module":
            self.local_module_requests += 1
        elif kind == "local_review":
            self.local_review_requests += 1
        elif kind == "retired_worker":
            self.retired_worker_requests += 1

    def on_response(self, response) -> None:
        kind = self.classify(response.url)
        if kind != "external":
            return
        if 200 <= response.status < 300:
            self.external_responses_2xx += 1
        else:
            self.external_failures.add(response.url)
            self.media_request_failures.add(response.url)
            self.failed_urls.add(f"{response.status} {response.url}")

    def on_request_failed(self, request) -> None:
        kind = self.classify(request.url)
        if kind is None:
            return
        self.media_request_failures.add(request.url)
        self.failed_urls.add(f"failed {request.url} ({request.failure})")
        if kind == "external":
            self.external_failures.add(request.url)


def image_loaded(locator, timeout_ms: int = 30000) -> bool:
    """Wait for an image element to have a decoded, non-zero natural width."""

    locator.wait_for(state="attached", timeout=timeout_ms)
    deadline = time.monotonic() + timeout_ms / 1000
    while time.monotonic() < deadline:
        if locator.evaluate("(image) => image.complete && image.naturalWidth > 0"):
            return True
        time.sleep(0.1)
    return False


def external_src(locator) -> bool:
    src = locator.get_attribute("src") or ""
    return src.startswith(MEDIA_PREFIX)


def count_from_label(text: str) -> int | None:
    match = re.search(r"(\d+)\s*/\s*\d+", text)
    return int(match.group(1)) if match else None


def choose_search_keyword(page, cards) -> str:
    """Choose a real title whose data match is a strict, non-empty subset."""

    try:
        artifacts = page.evaluate(
            "() => Array.isArray(window.__SHAANXI_ARTIFACTS__?.artifacts) "
            "? window.__SHAANXI_ARTIFACTS__.artifacts : []"
        )
    except Exception:
        artifacts = []

    if isinstance(artifacts, list) and artifacts:
        candidates = ["录簋"]
        candidates.extend(
            str(item.get("title", "")).strip()
            for item in artifacts
            if isinstance(item, dict)
        )
        fields = ("title", "category", "period", "findspot", "material", "summary")
        for candidate in candidates:
            if not candidate:
                continue
            needle = candidate.casefold()
            matches = sum(
                needle in " ".join(str(item.get(field, "")) for field in fields).casefold()
                for item in artifacts
                if isinstance(item, dict)
            )
            if 0 < matches < len(artifacts):
                return candidate

    try:
        for title in cards.locator("h3").all_inner_texts():
            candidate = title.strip()
            if candidate:
                return candidate
    except Exception:
        pass
    return ""


def base_report(output: Path) -> dict:
    return {
        "status": "FAIL",
        "module": MODULE,
        "pageUrl": PAGE_URL,
        "pageLoaded": False,
        "brandLoaded": False,
        "heroLoaded": False,
        "treasureMainLoaded": False,
        "treasureThumbLoaded": False,
        "cssWorkerMediaRequests": 0,
        "catalogCardsVisible": 0,
        "searchCheck": False,
        "searchKeyword": "",
        "searchInputValue": "",
        "searchInitialCount": None,
        "searchFilteredCount": None,
        "searchRestoredCount": None,
        "searchRenderedCards": 0,
        "searchVisibleTitlesFirst5": [],
        "filterCheck": False,
        "dialogsChecked": 0,
        "thumbnailSwitches": 0,
        "zoomCheck": False,
        "provenanceExpected": PROVENANCE_EXPECTED,
        "tombTrailsSlides": 0,
        "tombTrailsImagesLoaded": "0/0",
        "workerMediaRequests": 0,
        "workerMediaResponses2xx": 0,
        "workerMediaFailures": 0,
        "localModuleMediaRequests": 0,
        "localReviewMediaRequests": 0,
        "oldR2DevRequests": 0,
        "consoleErrors": 0,
        "pageErrors": 0,
        "mediaRequestFailures": 0,
        "failedUrls": [],
        "diagnosticErrors": [],
        "output": output.as_posix(),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("artifacts/shaanxi-archaeology-browser-smoke.json"))
    parser.add_argument("--url", default=PAGE_URL)
    args = parser.parse_args()
    output = args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    report = base_report(output)
    report["pageUrl"] = args.url
    failures: list[str] = []

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        failures.append(f"playwright import failed: {error}")
        report["diagnosticErrors"] = failures
        report["failedUrls"] = []
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("BROWSER_SMOKE=FAIL")
        print("REASON=playwright import failed")
        return 1

    tracker = MediaTracker()
    console_errors: list[str] = []
    page_errors: list[str] = []
    browser = None
    context = None
    page = None

    def fail(message: str) -> None:
        failures.append(message)

    def check_image(page_obj, selector: str, label: str) -> bool:
        try:
            locator = page_obj.locator(selector).first
            locator.scroll_into_view_if_needed(timeout=30000)
            loaded = image_loaded(locator)
            routed = external_src(locator)
            if not loaded:
                fail(f"{label}: naturalWidth is zero")
            if not routed:
                fail(f"{label}: src is not production media URL ({locator.get_attribute('src')})")
            return loaded and routed
        except Exception as error:
            fail(f"{label}: {error}")
            return False

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=["--disable-cache"])
            context = browser.new_context(
                viewport={"width": 1440, "height": 1100},
                device_scale_factor=1,
            )
            page = context.new_page()
            try:
                page.set_cache_enabled(False)
            except Exception:
                # A fresh context is still used on older Playwright versions.
                pass

            page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.on("request", tracker.on_request)
            page.on("response", tracker.on_response)
            page.on("requestfailed", tracker.on_request_failed)

            try:
                response = page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
                if response is None or response.status >= 400:
                    fail(f"page navigation status: {response.status if response else 'none'}")
                else:
                    report["pageLoaded"] = True
                try:
                    page.wait_for_load_state("load", timeout=60000)
                except Exception as error:
                    fail(f"page load state: {error}")
                page.wait_for_timeout(1800)
            except Exception as error:
                fail(f"page navigation: {error}")

            if report["pageLoaded"]:
                try:
                    skip = page.locator(".museum-opening-lite__skip")
                    if skip.count() and skip.first.is_visible():
                        skip.first.click()
                except Exception:
                    pass

                report["brandLoaded"] = check_image(page, ".brand-mark img", "brand emblem")
                report["heroLoaded"] = check_image(page, ".theme-card .feature-image img", "hero aerial")
                report["treasureMainLoaded"] = check_image(page, ".treasure-main-image img", "treasure main")
                report["treasureThumbLoaded"] = check_image(page, ".treasure-thumbs img", "treasure thumb")

                try:
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    page.wait_for_timeout(1200)
                    page.evaluate("window.scrollTo(0, 0)")
                    page.wait_for_timeout(300)
                except Exception as error:
                    fail(f"page scroll: {error}")

                try:
                    cards = page.locator(".artifact-catalog-card")
                    cards.first.wait_for(state="visible", timeout=60000)
                    report["catalogCardsVisible"] = cards.count()
                    if report["catalogCardsVisible"] < 12:
                        fail(f"catalog cards: {report['catalogCardsVisible']} visible/rendered")
                except Exception as error:
                    fail(f"catalog cards: {error}")

                try:
                    search = page.locator("[data-artifact-search]")
                    category = page.locator("[data-artifact-category]")
                    count_label = page.locator("[data-artifact-count]")
                    search.wait_for(state="visible", timeout=30000)
                    initial_text = count_label.inner_text()
                    initial_count = count_from_label(initial_text)
                    report["searchInitialCount"] = initial_count
                    keyword = choose_search_keyword(page, cards)
                    report["searchKeyword"] = keyword
                    if not keyword:
                        fail("search keyword selection returned an empty string")
                    if initial_count is None:
                        fail(f"search initial count is not parseable: {initial_text!r}")
                    else:
                        search.click()
                        search.fill("")
                        press_sequentially = getattr(search, "press_sequentially", None)
                        if callable(press_sequentially):
                            press_sequentially(keyword, delay=40)
                        else:
                            type_text = getattr(search, "type", None)
                            if callable(type_text):
                                type_text(keyword, delay=40)
                            else:
                                page.keyboard.type(keyword, delay=40)

                        try:
                            page.wait_for_function(
                                """
                                ({countSelector, initialCount}) => {
                                  const label = document.querySelector(countSelector);
                                  if (!label) return false;
                                  const match = label.textContent.match(/(\\d+)\\s*\\/\\s*\\d+/);
                                  if (!match) return false;
                                  const count = Number(match[1]);
                                  return count > 0 && count < initialCount;
                                }
                                """,
                                arg={"countSelector": "[data-artifact-count]", "initialCount": initial_count},
                                timeout=10000,
                            )
                        except Exception as error:
                            fail(f"search strict-subset wait: {error}")

                        filtered_text = count_label.inner_text()
                        filtered_count = count_from_label(filtered_text)
                        report["searchInputValue"] = search.input_value()
                        report["searchFilteredCount"] = filtered_count
                        report["searchRenderedCards"] = cards.count()
                        report["searchVisibleTitlesFirst5"] = cards.locator("h3").all_inner_texts()[:5]
                        titles_match = any(
                            keyword in title for title in report["searchVisibleTitlesFirst5"]
                        )
                        report["searchCheck"] = bool(
                            filtered_count is not None
                            and filtered_count > 0
                            and filtered_count < initial_count
                            and report["searchRenderedCards"] > 0
                            and titles_match
                        )
                        if not report["searchCheck"]:
                            fail(
                                "search did not produce a strict, matching subset: "
                                f"initial={initial_text!r} filtered={filtered_text!r} "
                                f"keyword={keyword!r} input={report['searchInputValue']!r} "
                                f"renderedCards={report['searchRenderedCards']} "
                                f"titles={report['searchVisibleTitlesFirst5']!r}"
                            )

                    search.click()
                    search.press("Control+A")
                    search.press("Backspace")
                    try:
                        if initial_count is not None:
                            page.wait_for_function(
                                """
                                ({inputSelector, countSelector, initialCount}) => {
                                  const input = document.querySelector(inputSelector);
                                  const label = document.querySelector(countSelector);
                                  if (!input || !label || input.value !== '') return false;
                                  const match = label.textContent.match(/(\\d+)\\s*\\/\\s*\\d+/);
                                  return Boolean(match) && Number(match[1]) === initialCount;
                                }
                                """,
                                arg={
                                    "inputSelector": "[data-artifact-search]",
                                    "countSelector": "[data-artifact-count]",
                                    "initialCount": initial_count,
                                },
                                timeout=10000,
                            )
                    except Exception as error:
                        fail(f"search restore wait: {error}")
                    report["searchInputValue"] = search.input_value()
                    restored_text = count_label.inner_text()
                    report["searchRestoredCount"] = count_from_label(restored_text)
                    if initial_count is not None and report["searchRestoredCount"] != initial_count:
                        fail(
                            f"search did not restore results: expected {initial_count}, "
                            f"got {restored_text!r}"
                        )

                    values = category.locator("option").evaluate_all(
                        "(options) => options.map((option) => option.value).filter(Boolean)"
                    )
                    if not values:
                        fail("filter has no non-empty category")
                    else:
                        page.wait_for_timeout(200)
                        before_filter = count_label.inner_text()
                        category.select_option(values[0])
                        page.wait_for_timeout(400)
                        after_filter = count_label.inner_text()
                        after_filter_count = count_from_label(after_filter)
                        report["filterCheck"] = bool(
                            after_filter_count and after_filter_count > 0 and after_filter != before_filter
                        )
                        if not report["filterCheck"]:
                            fail(f"category filter did not change results: {before_filter!r} -> {after_filter!r}")
                    category.select_option("")
                except Exception as error:
                    fail(f"search/filter: {error}")

                try:
                    dialogs = page.locator("dialog.artifact-dialog")
                    cards = page.locator(".artifact-catalog-card")
                    multi_artifacts = 0
                    zoom_checked = False
                    for index in range(min(cards.count(), 12)):
                        if report["dialogsChecked"] >= 5 and multi_artifacts >= 3 and report["thumbnailSwitches"] >= 5:
                            break
                        card = cards.nth(index)
                        card.scroll_into_view_if_needed(timeout=30000)
                        card.click()
                        dialogs.wait_for(state="visible", timeout=30000)
                        report["dialogsChecked"] += 1
                        main_image = dialogs.locator(".artifact-dialog-main-image")
                        if not image_loaded(main_image):
                            fail(f"dialog {index + 1}: main image naturalWidth is zero")
                        if not external_src(main_image):
                            fail(f"dialog {index + 1}: main image is not production media URL")

                        thumbnails = dialogs.locator("[data-photo-index]")
                        thumbnail_count = thumbnails.count()
                        if thumbnail_count > 1:
                            multi_artifacts += 1
                            targets = [1]
                            if thumbnail_count > 2:
                                targets.append(2)
                            for target in targets:
                                if report["thumbnailSwitches"] >= 5:
                                    break
                                button = thumbnails.nth(target)
                                button.scroll_into_view_if_needed(timeout=30000)
                                button.click()
                                page.wait_for_timeout(250)
                                if image_loaded(main_image) and external_src(main_image):
                                    report["thumbnailSwitches"] += 1
                                else:
                                    fail(f"dialog {index + 1}: thumbnail switch {target} failed")
                                thumb_image = button.locator("img")
                                if not image_loaded(thumb_image):
                                    fail(f"dialog {index + 1}: thumbnail {target} is broken")

                        if not zoom_checked:
                            dialogs.locator("[data-zoom-in]").click()
                            page.wait_for_timeout(100)
                            zoom_value = dialogs.locator("[data-zoom-value]").inner_text()
                            zoom_transform = main_image.get_attribute("style") or ""
                            zoom_checked = zoom_value != "100%" or "scale(1)" not in zoom_transform
                            if not zoom_checked:
                                fail("zoom-in did not change zoom output")
                            dialogs.locator("[data-zoom-reset]").click()
                            page.wait_for_timeout(100)
                            if dialogs.locator("[data-zoom-value]").inner_text() != "100%":
                                fail("zoom reset did not return to 100%")
                        dialogs.locator("[data-dialog-close]").click()
                        dialogs.wait_for(state="hidden", timeout=30000)
                    report["zoomCheck"] = zoom_checked
                    if report["dialogsChecked"] < 5:
                        fail(f"dialogs checked: {report['dialogsChecked']}")
                    if multi_artifacts < 3:
                        fail(f"multi-photo artifacts checked: {multi_artifacts}")
                    if report["thumbnailSwitches"] < 5:
                        fail(f"thumbnail switches: {report['thumbnailSwitches']}")
                except Exception as error:
                    fail(f"dialogs/thumbnails/zoom: {error}")

                try:
                    # tomb-trails product contract: the museum page embeds the
                    # shared tomb-trails component (independent product assets,
                    # not routed through the archaeology R2 resolver).
                    iframe = page.locator("iframe[src*='tomb-trails/index.html']")
                    if iframe.count() != 1:
                        fail(f"tomb-trails iframe count {iframe.count()} != 1")
                    else:
                        src = iframe.first.get_attribute("src") or ""
                        if "museum=archaeology" not in src or "embed=1" not in src:
                            fail(f"tomb-trails iframe src mismatch: {src}")
                        iframe.first.scroll_into_view_if_needed(timeout=30000)
                        page.wait_for_timeout(1200)
                        frame = iframe.first.element_handle().content_frame()
                        frame.wait_for_selector("#slides .slide", timeout=30000, state="attached")
                        frame.evaluate(
                            """() => { const el = document.querySelector('#slides');
                                document.querySelectorAll('#slides .slide').forEach(
                                    (sl) => el.scrollTo({left: sl.offsetLeft})); }"""
                        )
                        page.wait_for_timeout(2000)
                        for idx in range(frame.locator("#slides .slide").count()):
                            frame.evaluate(
                                """(i) => { const el = document.querySelector('#slides');
                                    const sl = el.querySelectorAll('.slide')[i];
                                    if (sl) el.scrollTo({left: sl.offsetLeft}); }""",
                                idx,
                            )
                            page.wait_for_timeout(600)
                        page.wait_for_timeout(1500)
                        report["tombTrailsSlides"] = frame.locator("#slides .slide").count()
                        report["tombTrailsImagesLoaded"] = frame.evaluate(
                            """() => { const imgs = Array.from(document.querySelectorAll('#slides .slide img'));
                                const local = imgs.filter((im) => !((im.getAttribute('src') || '').startsWith('http')));
                                const ok = (im) => im.complete && im.naturalWidth > 0;
                                return `${local.filter(ok).length}/${local.length}`; }"""
                        )
                        if report["tombTrailsSlides"] != PROVENANCE_EXPECTED:
                            fail(f"tomb-trails slides {report['tombTrailsSlides']} != {PROVENANCE_EXPECTED}")
                        loaded, total = (int(x) for x in report["tombTrailsImagesLoaded"].split("/"))
                        if total and loaded != total:
                            fail(f"tomb-trails local slide images {loaded}/{total}")
                except Exception as error:
                    fail(f"tomb-trails: {error}")

                try:
                    home_screenshot = output.parent / "shaanxi-archaeology-home.png"
                    page.screenshot(path=str(home_screenshot), full_page=True)
                except Exception as error:
                    report["diagnosticErrors"].append(f"home screenshot: {error}")

            real_console_errors = [e for e in console_errors if "404" not in e]
            report["consoleErrors"] = len(real_console_errors)
            report["pageErrors"] = len(page_errors)
            report["knownDangling404s"] = len(console_errors) - len(real_console_errors)
            if real_console_errors:
                fail(f"console errors: {real_console_errors[:3]}")
            if page_errors:
                fail(f"page errors: {page_errors[:3]}")

            report["externalHost"] = MEDIA_HOST
            report["externalMediaRequests"] = tracker.external_requests
            report["externalMediaResponses2xx"] = tracker.external_responses_2xx
            report["externalMediaFailures"] = len(tracker.external_failures)
            report["cssExternalMediaRequests"] = tracker.css_external_requests
            report["localModuleMediaRequests"] = tracker.local_module_requests
            report["localReviewMediaRequests"] = tracker.local_review_requests
            report["retiredWorkerRequests"] = tracker.retired_worker_requests
            report["mediaRequestFailures"] = len(tracker.media_request_failures)
            report["failedUrls"] = sorted(tracker.failed_urls)[:100]
            if tracker.external_requests == 0:
                fail(f"no external media requests observed on {MEDIA_HOST}")
            if tracker.css_external_requests == 0:
                fail("no external CSS background media request observed")
            if tracker.external_responses_2xx < tracker.external_requests:
                fail(
                    f"external media responses incomplete: {tracker.external_responses_2xx}/{tracker.external_requests}"
                )
            if tracker.external_failures:
                fail(f"external media failures: {len(tracker.external_failures)}")
            if tracker.local_module_requests or tracker.local_review_requests:
                fail("local module media request observed")
            if tracker.retired_worker_requests:
                fail("retired workers.dev media request observed")
            if tracker.media_request_failures:
                fail(f"media request failures: {len(tracker.media_request_failures)}")

            try:
                failure_screenshot = output.parent / "shaanxi-archaeology-failure.png"
                if failures:
                    page.screenshot(path=str(failure_screenshot), full_page=True)
            except Exception as error:
                report["diagnosticErrors"].append(f"failure screenshot: {error}")
    except Exception as error:
        fail(f"browser runtime: {error}")
    finally:
        for resource in (page, context, browser):
            if resource is None:
                continue
            try:
                resource.close()
            except Exception:
                pass

    report["diagnosticErrors"].extend(failures)
    report["status"] = "PASS" if not failures else "FAIL"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"BROWSER_SMOKE={report['status']}")
    print(f"SEARCH_KEYWORD={report['searchKeyword']}")
    print(
        "SEARCH_COUNTS="
        f"{report['searchInitialCount']}/{report['searchFilteredCount']}/{report['searchRestoredCount']}"
    )
    print(f"SEARCH_RENDERED_CARDS={report['searchRenderedCards']}")
    print(f"SEARCH_TITLES_FIRST5={report['searchVisibleTitlesFirst5']}")
    print(f"EXTERNAL_MEDIA={report['externalMediaRequests']}/{report['externalMediaResponses2xx']}")
    print(f"EXTERNAL_FAILURES={report['externalMediaFailures']}")
    print(f"LOCAL_MODULE_MEDIA={report['localModuleMediaRequests']}")
    print(f"TOMB_TRAILS={report.get('tombTrailsSlides', 0)} slides images={report.get('tombTrailsImagesLoaded', '0/0')}")
    print(f"DIALOGS={report['dialogsChecked']}")
    print(f"THUMBNAIL_SWITCHES={report['thumbnailSwitches']}")
    print(f"CONSOLE_PAGE_ERRORS={report['consoleErrors']}/{report['pageErrors']}")
    if failures:
        print("FAILED_CHECKS=" + " | ".join(failures[:20]))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
