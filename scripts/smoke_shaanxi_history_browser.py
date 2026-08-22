#!/usr/bin/env python3
"""Browser/network smoke test for the Shaanxi History externalized-media runtime.

Every externalized media request must resolve through the current R2 public
host; the retired workers.dev host must never be contacted.  The module
legitimately retains a handful of local media files, so local module requests
are only a failure when they target a path in the frozen externalized-media
manifest.  Provenance trail images are scrolled into view individually
because they lazy-load.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit


MODULE = "shaanxi-history"
PAGE_URL = "http://127.0.0.1:8765/modules/shaanxi-history/"
MEDIA_HOST = "pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev"
RETIRED_WORKER_HOST = "ad-fontes-media.gusgumee777.workers.dev"
FROZEN_MANIFEST_PATH = Path("data/shaanxi-history-externalized-media.json")
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
    def __init__(self, frozen_paths: set[str]) -> None:
        self.frozen_paths = frozen_paths
        self.external_requests = 0
        self.external_failures: set[str] = set()
        self.local_frozen_requests: set[str] = set()
        self.local_retained_requests = 0
        self.retired_worker_requests: set[str] = set()
        self.media_request_failures: set[str] = set()
        self.failed_urls: set[str] = set()

    def classify(self, url: str) -> str | None:
        parsed = urlsplit(url)
        path = parsed.path.lower()
        if Path(path).suffix not in MEDIA_SUFFIXES:
            return None
        if parsed.hostname == MEDIA_HOST and parsed.path.startswith(f"/modules/{MODULE}/"):
            return "external"
        if parsed.hostname in {"127.0.0.1", "localhost"} and parsed.path.startswith(f"/modules/{MODULE}/"):
            if parsed.path.lstrip("/") in self.frozen_paths:
                return "local_frozen"
            return "local_retained"
        if parsed.hostname == RETIRED_WORKER_HOST:
            return "retired_worker"
        return None

    def on_request(self, request) -> None:
        kind = self.classify(request.url)
        if kind == "external":
            self.external_requests += 1
        elif kind == "local_frozen":
            self.local_frozen_requests.add(request.url)
        elif kind == "local_retained":
            self.local_retained_requests += 1
        elif kind == "retired_worker":
            self.retired_worker_requests.add(request.url)

    def on_response(self, response) -> None:
        kind = self.classify(response.url)
        if kind is None or 200 <= response.status < 400:
            return
        self.failed_urls.add(f"{response.status} {response.url}")
        self.media_request_failures.add(response.url)
        if kind == "external":
            self.external_failures.add(response.url)

    def on_request_failed(self, request) -> None:
        if self.classify(request.url) is None:
            return
        self.failed_urls.add(f"failed {request.url} ({request.failure})")
        self.media_request_failures.add(request.url)
        if self.classify(request.url) == "external":
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
    return src.startswith(f"https://{MEDIA_HOST}/modules/{MODULE}/")


def load_frozen_paths(repo_root: Path) -> set[str]:
    manifest = json.loads((repo_root / FROZEN_MANIFEST_PATH).read_text(encoding="utf-8"))
    return {str(item["path"]) for item in manifest["entries"]}


def fail(failures: list[str], message: str) -> None:
    failures.append(message)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=PAGE_URL)
    parser.add_argument("--output", type=Path, default=Path("artifacts/shaanxi-history-browser-smoke.json"))
    args = parser.parse_args()

    repo_root = Path.cwd()
    frozen_paths = load_frozen_paths(repo_root)
    tracker = MediaTracker(frozen_paths)
    console_errors: list[str] = []
    page_errors: list[str] = []
    failures: list[str] = []
    report: dict = {"status": "FAIL", "module": MODULE, "pageUrl": args.url}

    page = context = browser = None
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            page = context.new_page()
            page.on("request", tracker.on_request)
            page.on("response", tracker.on_response)
            page.on("requestfailed", tracker.on_request_failed)
            page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            page.on("pageerror", lambda error: page_errors.append(str(error)))

            response = page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
            if response is None or response.status >= 400:
                fail(failures, f"page load failed with status {response.status if response else 'unknown'}")
            page.locator("body").wait_for(state="visible", timeout=30000)
            report["pageLoad"] = response is not None and response.status < 400

            all_images = page.locator("img")
            image_count = all_images.count()
            for index in range(image_count):
                try:
                    all_images.nth(index).scroll_into_view_if_needed(timeout=5000)
                    page.wait_for_timeout(60)
                except Exception:
                    continue
            page.wait_for_timeout(2500)
            states = page.evaluate(
                """() => Array.from(document.images)
                    .filter((im) => {
                        const source = im.currentSrc || im.src;
                        return source && source !== location.href;
                    })
                    .map((im) => ({
                        src: im.currentSrc || im.src,
                        complete: im.complete,
                        width: im.naturalWidth
                    }))"""
            )
            broken = [item for item in states if item["complete"] and item["width"] == 0]
            report["documentImages"] = len(states)
            report["brokenImages"] = len(broken)
            if broken:
                fail(failures, f"broken rendered images: {broken[:3]}")

            provenance = page.locator("#provenance-trails")
            provenance.wait_for(state="attached", timeout=30000)
            provenance.scroll_into_view_if_needed(timeout=30000)
            page.wait_for_timeout(700)
            prov_images = provenance.locator("img")
            prov_count = prov_images.count()
            prov_external = 0
            prov_loaded = 0
            for index in range(prov_count):
                image = prov_images.nth(index)
                image.scroll_into_view_if_needed(timeout=30000)
                if image_loaded(image):
                    prov_loaded += 1
                if external_src(image):
                    prov_external += 1
            report["provenanceImages"] = prov_count
            report["provenanceExternalResolved"] = prov_external
            report["provenanceLoaded"] = prov_loaded
            if prov_count != PROVENANCE_EXPECTED:
                fail(failures, f"provenance expected {PROVENANCE_EXPECTED}, found {prov_count}")
            if prov_external != PROVENANCE_EXPECTED:
                fail(failures, "provenance images are not all on the current external base")
            if prov_loaded != PROVENANCE_EXPECTED:
                fail(failures, f"provenance images not all loaded: {prov_loaded}/{prov_count}")

            report["consoleErrors"] = len(console_errors)
            report["pageErrors"] = len(page_errors)
            if console_errors:
                fail(failures, f"console errors: {console_errors[:3]}")
            if page_errors:
                fail(failures, f"page errors: {page_errors[:3]}")

            report["externalMediaRequests"] = tracker.external_requests
            report["externalMediaFailures"] = len(tracker.external_failures)
            report["localFrozenMediaRequests"] = len(tracker.local_frozen_requests)
            report["localRetainedMediaRequests"] = tracker.local_retained_requests
            report["retiredWorkerRequests"] = len(tracker.retired_worker_requests)
            report["mediaRequestFailures"] = len(tracker.media_request_failures)
            report["failedUrls"] = sorted(tracker.failed_urls)[:100]
            if tracker.external_requests == 0:
                fail(failures, f"no external media requests observed on {MEDIA_HOST}")
            if tracker.external_failures:
                fail(failures, f"external media failures: {len(tracker.external_failures)}")
            if tracker.local_frozen_requests:
                fail(failures, f"local requests for externalized media: {sorted(tracker.local_frozen_requests)[:3]}")
            if tracker.retired_worker_requests:
                fail(failures, "retired workers.dev media request observed")
            if tracker.media_request_failures:
                fail(failures, f"media request failures: {len(tracker.media_request_failures)}")

            try:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(args.output.parent / "shaanxi-history-home.png"), full_page=True)
            except Exception as error:
                report["diagnostics"] = f"home screenshot: {error}"
    except Exception as error:
        fail(failures, f"browser runtime: {error}")
    finally:
        for resource in (page, context, browser):
            if resource is None:
                continue
            try:
                resource.close()
            except Exception:
                pass

    report["diagnostics"] = report.get("diagnostics", [])
    report["diagnostics"].extend(failures)
    report["status"] = "PASS" if not failures else "FAIL"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"SHAANXI_HISTORY_BROWSER_SMOKE={report['status']}")
    print(f"PAGE_LOAD={report.get('pageLoad')}")
    print(f"EXTERNAL_MEDIA={report['externalMediaRequests'] if 'externalMediaRequests' in report else 0}")
    print(f"EXTERNAL_FAILURES={report.get('externalMediaFailures', 0)}")
    print(f"LOCAL_FROZEN_MEDIA={len(tracker.local_frozen_requests)}")
    print(f"LOCAL_RETAINED_MEDIA={report.get('localRetainedMediaRequests', 0)}")
    print(f"RETIRED_WORKER={len(tracker.retired_worker_requests)}")
    print(f"PROVENANCE={report.get('provenanceExternalResolved', 0)}/{report.get('provenanceLoaded', 0)} (expected {PROVENANCE_EXPECTED})")
    print(f"BROKEN_IMAGES={report.get('brokenImages', 'n/a')}")
    print(f"CONSOLE_PAGE_ERRORS={report.get('consoleErrors', 0)}/{report.get('pageErrors', 0)}")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
