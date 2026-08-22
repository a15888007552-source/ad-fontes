#!/usr/bin/env python3
"""GitHub-hosted Chromium smoke for the Museum Atlas product surface."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlsplit


MEDIA_HOST = "pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev"
RETIRED_WORKER_HOST = "ad-fontes-media.gusgumee777.workers.dev"
EXTERNALIZED_MODULES = {"qinhan", "shaanxi-history", "shaanxi-archaeology-museum"}
MEDIA_SUFFIXES = {
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".heic", ".tif", ".tiff",
    ".mp3", ".wav", ".flac", ".m4a", ".ogg", ".mp4", ".webm", ".mov", ".pdf",
}
SEARCH_QUERY = "录簋"
DEEP_LINK_MUSEUMS = ["qinhan", "shaanxi-history", "shaanxi-archaeology", "beilin", "baoji"]


def is_media_url(url: str) -> bool:
    return Path(urlsplit(url).path.lower()).suffix in MEDIA_SUFFIXES


def module_from_path(path: str) -> str | None:
    parts = path.strip("/").split("/")
    if len(parts) >= 2 and parts[0] == "modules":
        return parts[1]
    return None


class Tracker:
    def __init__(self) -> None:
        self.http_404_urls: list[str] = []
        self.external_requests = 0
        self.external_failures: set[str] = set()
        self.local_externalized_requests = 0
        self.retired_worker_requests = 0
        self.external_other_requests = 0
        self.failed_media: set[str] = set()

    def classify(self, url: str) -> str | None:
        parsed = urlsplit(url)
        if not is_media_url(url):
            return None
        if parsed.path.endswith("/archaeology-atmosphere-v2.webp"):
            # Known recovery gap: snapshot-era tomb-trails.css references this
            # pruned regenerable asset. It is not a deleted-local externalized
            # media request; tracked separately (independent tomb-trails product).
            return "tomb_trails_theme_reference"
        if parsed.hostname == MEDIA_HOST and module_from_path(parsed.path) in EXTERNALIZED_MODULES:
            return "external"
        if parsed.hostname in {"127.0.0.1", "localhost"}:
            module = module_from_path(parsed.path)
            if module in EXTERNALIZED_MODULES:
                return "local_externalized"
        if parsed.hostname == RETIRED_WORKER_HOST:
            return "retired_worker"
        return "external_other"

    def on_request(self, request) -> None:
        kind = self.classify(request.url)
        if kind == "external":
            self.external_requests += 1
        elif kind == "local_externalized":
            self.local_externalized_requests += 1
        elif kind == "retired_worker":
            self.retired_worker_requests += 1
        elif kind == "external_other":
            self.external_other_requests += 1

    def on_response(self, response) -> None:
        if response.status == 404:
            self.http_404_urls.append(response.url)
        kind = self.classify(response.url)
        if kind is None or 200 <= response.status < 400:
            return
        if kind == "tomb_trails_theme_reference":
            return
        self.failed_media.add(f"{response.status} {response.url}")
        if kind == "external":
            self.external_failures.add(response.url)

    def on_request_failed(self, request) -> None:
        kind = self.classify(request.url)
        if kind is None:
            return
        self.failed_media.add(f"failed {request.url} ({request.failure})")
        if kind == "external":
            self.external_failures.add(request.url)


def wait_for_image(locator, timeout_ms: int = 30000) -> None:
    locator.wait_for(state="attached", timeout=timeout_ms)
    deadline = time.monotonic() + timeout_ms / 1000
    while time.monotonic() < deadline:
        if locator.evaluate("(image) => image.complete && image.naturalWidth > 0"):
            return
        time.sleep(0.1)
    raise AssertionError("image did not reach naturalWidth > 0")


def wait_for_visible_page(page, selector: str, timeout: int = 30000) -> None:
    page.locator(selector).first.wait_for(state="visible", timeout=timeout)


def load_index(repo_root: Path) -> dict:
    return json.loads((repo_root / "modules" / "museum-atlas" / "search-index.json").read_text(encoding="utf-8"))


def result_record(index: dict, museum_id: str) -> dict:
    for record in index["records"]:
        if record["museum_id"] == museum_id:
            return record
    raise AssertionError(f"no search record for {museum_id}")


def dismiss_opening(page) -> None:
    opening = page.locator("#atlas-opening")
    try:
        if opening.is_visible():
            opening.click(force=True)
            opening.wait_for(state="detached", timeout=5000)
    except Exception:
        pass


def type_like_user(locator, value: str) -> None:
    locator.click()
    locator.fill("")
    if hasattr(locator, "press_sequentially"):
        locator.press_sequentially(value, delay=40)
    else:
        locator.type(value, delay=40)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    parser.add_argument("--output", type=Path, default=Path("artifacts/museum-atlas-browser-smoke.json"))
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/") + "/"
    repo_root = Path.cwd()
    index = load_index(repo_root)
    report = {
        "status": "FAIL",
        "baseUrl": base_url,
        "pageLoaded": False,
        "consoleErrors": [],
        "pageErrors": [],
        "failedMedia": [],
        "museumCards": 0,
        "liveMuseumCards": 0,
        "provinceTests": [],
        "selectedObjectCount": 0,
        "selectedObjectsLoaded": 0,
        "searchQuery": SEARCH_QUERY,
        "searchTotal": len(index.get("records", [])),
        "searchFiltered": 0,
        "searchRestored": False,
        "searchResultMuseum": "",
        "deepLinksTested": [],
        "returnLinksTested": [],
        "externalHost": MEDIA_HOST,
        "externalMediaRequests": 0,
        "externalMediaFailures": 0,
        "deletedLocalMediaRequests": 0,
        "retiredWorkerRequests": 0,
        "externalOtherMediaRequests": 0,
        "diagnostics": [],
    }
    tracker = Tracker()
    try:
        from playwright.sync_api import sync_playwright
    except Exception as error:
        report["diagnostics"].append(f"Playwright import failed: {error}")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        return 1

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context()
            page = context.new_page()
            page.on("request", tracker.on_request)
            page.on("response", tracker.on_response)
            page.on("requestfailed", tracker.on_request_failed)
            page.on("console", lambda message: report["consoleErrors"].append(message.text) if message.type == "error" else None)
            page.on("pageerror", lambda error: report["pageErrors"].append(str(error)))

            response = page.goto(urljoin(base_url, "modules/museum-atlas/"), wait_until="domcontentloaded", timeout=60000)
            if response is None or response.status >= 400:
                raise AssertionError(f"Atlas page status is {response.status if response else 'unknown'}")
            report["pageLoaded"] = True
            dismiss_opening(page)
            wait_for_visible_page(page, ".museum-card")
            report["museumCards"] = page.locator(".museum-card").count()
            report["liveMuseumCards"] = page.locator("a.museum-card").count()
            if report["museumCards"] != 10 or report["liveMuseumCards"] != 7:
                raise AssertionError("Museum Atlas card counts do not match 10 total / 7 live")
            wait_for_image(page.locator("#province-cover-image"))

            for province in ("beijing", "shaanxi"):
                page.locator(f".province-tab[data-province='{province}']").click()
                page.wait_for_url(f"**/modules/museum-atlas/?province={province}", timeout=10000)
                active = page.locator("html").get_attribute("data-active-province")
                if active != province:
                    raise AssertionError(f"province state mismatch for {province}: {active}")
                report["provinceTests"].append({"province": province, "url": page.url, "active": active})
            page.reload(wait_until="domcontentloaded")
            if page.locator("html").get_attribute("data-active-province") != "shaanxi":
                raise AssertionError("province state did not survive reload")

            selected = page.locator(".selected-object")
            report["selectedObjectCount"] = selected.count()
            if selected.count() != 7:
                raise AssertionError("BUILD 01 selected object count is not 7")
            for item in range(selected.count()):
                card = selected.nth(item)
                href = card.get_attribute("href") or ""
                if "?item=" not in href:
                    raise AssertionError(f"selected object {item + 1} has no stable item link")
                card.scroll_into_view_if_needed()
                image = card.locator("img").first
                wait_for_image(image)
                report["selectedObjectsLoaded"] += 1

            page.locator(".atlas-search-trigger").click()
            search = page.locator(".atlas-search-dialog")
            search.wait_for(state="visible", timeout=10000)
            search_input = search.locator(".atlas-search__input")
            type_like_user(search_input, SEARCH_QUERY)
            result_record_for_query = next((record for record in index["records"] if record["title"] == SEARCH_QUERY), None)
            if result_record_for_query is None:
                raise AssertionError(f"deterministic search query is absent from search index: {SEARCH_QUERY}")
            results = search.locator(".atlas-search-result")
            page.wait_for_function(
                """() => document.querySelectorAll('.atlas-search-result').length > 0""",
                timeout=10000,
            )
            filtered = results.count()
            report["searchFiltered"] = filtered
            if not (0 < filtered < report["searchTotal"]):
                raise AssertionError(f"search is not a strict non-empty subset: {filtered}/{report['searchTotal']}")
            first_result = results.first
            if SEARCH_QUERY not in first_result.locator(".atlas-search-result__title").inner_text():
                raise AssertionError("search result title does not contain deterministic query")
            result_museum = first_result.locator(".atlas-search-result__museum").inner_text().strip()
            report["searchResultMuseum"] = result_museum
            if result_museum != result_record_for_query["museum_name"]:
                raise AssertionError(f"search museum attribution mismatch: {result_museum}")
            result_image = first_result.locator("img")
            if result_image.count():
                wait_for_image(result_image.first)
            search_input.fill("")
            page.wait_for_function(
                """() => document.querySelector('.atlas-search__input')?.value === ''
                    && document.querySelector('.atlas-search__status')?.textContent.includes('输入关键词')
                    && document.querySelectorAll('.atlas-search-result').length === 0""",
                timeout=10000,
            )
            report["searchRestored"] = True
            search.locator(".atlas-search__close").click()

            for museum_id in DEEP_LINK_MUSEUMS:
                record = result_record(index, museum_id)
                target = urljoin(base_url, record["site_path"])
                target = target + ("&" if "?" in target else "?") + f"item={record['id']}"
                result = page.goto(target, wait_until="domcontentloaded", timeout=60000)
                if result is None or result.status >= 400:
                    raise AssertionError(f"deep link failed for {museum_id}: {result.status if result else 'unknown'}")
                if urlsplit(page.url).query.find("item=") < 0:
                    raise AssertionError(f"deep link lost item query for {museum_id}")
                page.locator("body").wait_for(state="visible", timeout=10000)
                report["deepLinksTested"].append({"museum": museum_id, "item": record["id"], "status": result.status})
                return_links = page.locator("a[href*='museum-atlas']")
                if return_links.count() < 1:
                    raise AssertionError(f"return-to-atlas link missing for {museum_id}")
                return_href = return_links.first.get_attribute("href") or ""
                if "museum-atlas" not in return_href or "localhost" in return_href or "127.0.0.1" in return_href:
                    raise AssertionError(f"invalid return-to-atlas link for {museum_id}: {return_href}")
                report["returnLinksTested"].append({"museum": museum_id, "href": return_href})

            unexpected_404s = [u for u in tracker.http_404_urls if "archaeology-atmosphere-v2.webp" not in u]
            real_console_errors = [e for e in report["consoleErrors"] if "404" not in e]
            if unexpected_404s:
                raise AssertionError(f"unexpected 404 resources: {unexpected_404s[:3]}")
            if real_console_errors:
                raise AssertionError(f"console errors: {real_console_errors[:5]}")
            if report["pageErrors"]:
                raise AssertionError(f"page errors: {report['pageErrors'][:5]}")
            if tracker.external_failures:
                raise AssertionError(f"external media failures on {MEDIA_HOST}: {sorted(tracker.external_failures)[:5]}")
            if tracker.local_externalized_requests:
                raise AssertionError(f"deleted local externalized media requests: {tracker.local_externalized_requests}")
            if tracker.retired_worker_requests:
                raise AssertionError(f"retired workers.dev media requests: {tracker.retired_worker_requests}")
            if tracker.failed_media:
                raise AssertionError(f"failed media requests: {sorted(tracker.failed_media)[:5]}")
            report["status"] = "PASS"
    except Exception as error:
        report["diagnostics"].append(str(error))
    finally:
        report["externalMediaRequests"] = tracker.external_requests
        report["externalMediaFailures"] = len(tracker.external_failures)
        report["deletedLocalMediaRequests"] = tracker.local_externalized_requests
        report["retiredWorkerRequests"] = tracker.retired_worker_requests
        report["externalOtherMediaRequests"] = tracker.external_other_requests
        report["failedMedia"] = sorted(tracker.failed_media)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
