#!/usr/bin/env python3
"""One final research-site smoke; no browser installation and no deployment.

The CLI owns one Chromium process and an optional in-process loopback server.
run_site_smoke(browser, base_url, output) also accepts a caller-owned browser.
Contexts run sequentially and never use saved profiles or private passwords.
"""

from __future__ import annotations

import argparse
from contextlib import contextmanager, nullcontext
import ctypes
from datetime import datetime, timezone
import importlib
import json
import os
from pathlib import Path
import platform
import sys
from urllib.parse import urljoin, urlsplit

from serve_site import ROOT, preview_server
from smoke_europa_routes_browser import INIT, run_europa_smoke
from smoke_secondary_modules import run_secondary_smoke


PUBLIC_BASE = "https://a15888007552-source.github.io/ad-fontes/"
DESKTOP = {"width": 1440, "height": 1000}
MOBILE = {"width": 390, "height": 844}


def windows_memory():
    if os.name != "nt":
        return {"platform": platform.system(), "guard": "not applicable outside Windows"}

    class MemoryStatus(ctypes.Structure):
        _fields_ = [("length", ctypes.c_ulong), ("memoryLoad", ctypes.c_ulong)] + [
            (field, ctypes.c_ulonglong) for field in (
                "totalPhys", "availPhys", "totalPageFile", "availPageFile",
                "totalVirtual", "availVirtual", "availExtendedVirtual"
            )
        ]

    status = MemoryStatus()
    status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        raise OSError("Cannot verify physical memory before browser launch")
    return {"platform": "Windows", "percent": status.memoryLoad, "totalBytes": status.totalPhys, "availableBytes": status.availPhys}


def normalized_path(path):
    path = path.removesuffix("index.html")
    return path.rstrip("/") + "/"


def console_error_kind(text, source_url, origin, intentional_paths):
    """Do not confuse a tested document 404 with an application console.error."""
    network_message = text.startswith("Failed to load resource:")
    same_origin = bool(source_url) and urlsplit(source_url).netloc == urlsplit(origin).netloc and urlsplit(source_url).scheme == urlsplit(origin).scheme
    if network_message and same_origin and "404" in text and urlsplit(source_url).path in intentional_paths:
        return "expected-document-404"
    if network_message and source_url and not same_origin:
        return "external-network"
    if network_message and same_origin and "net::ERR_ABORTED" in text:
        return "navigation-aborted-request"
    return "unexpected-console-error"


class Evidence:
    def __init__(self, base_url, output, metadata=None):
        self.base_url = base_url.rstrip("/") + "/"
        self.origin = "{0.scheme}://{0.netloc}".format(urlsplit(self.base_url))
        self.prefix = urlsplit(self.base_url).path
        self.output = Path(output).resolve()
        self.output.mkdir(parents=True, exist_ok=True)
        self.phase = "setup"
        self.intentional_404s = set()
        self.seen_snapshots = set()
        self.report = {
            "schemaVersion": 1, "status": "RUNNING", "startedAt": datetime.now(timezone.utc).isoformat(),
            "baseUrl": self.base_url, "repository": str(ROOT), "metadata": metadata or {},
            "groups": [], "screenshots": [], "snapshots": [], "failures": [],
            "pageErrors": [], "consoleErrors": [], "expected404s": [],
            "unexpectedLocalHttpErrors": [], "localRequestFailures": [],
            "externalFailures": [], "imageFailures": [], "observationNotes": []
        }

    def fail(self, message, url=None):
        entry = {"phase": self.phase, "message": str(message), "url": url}
        if entry not in self.report["failures"]:
            self.report["failures"].append(entry)

    def local(self, url):
        return urlsplit(url).netloc == urlsplit(self.origin).netloc and urlsplit(url).scheme == urlsplit(self.origin).scheme

    def observe(self, page):
        def page_error(error):
            entry = {"phase": self.phase, "url": page.url, "error": str(error)}
            self.report["pageErrors"].append(entry)
            self.fail("Uncaught page error: " + str(error), page.url)

        def response(item):
            if item.status < 400:
                return
            entry = {"phase": self.phase, "url": item.url, "status": item.status, "type": item.request.resource_type}
            if self.local(item.url):
                if item.status == 404 and urlsplit(item.url).path in self.intentional_404s and item.request.resource_type == "document":
                    self.report["expected404s"].append(entry)
                else:
                    self.report["unexpectedLocalHttpErrors"].append(entry)
                    self.fail(f"Unexpected same-origin HTTP {item.status}", item.url)
            else:
                self.report["externalFailures"].append(entry)

        def request_failed(request):
            entry = {"phase": self.phase, "url": request.url, "type": request.resource_type, "error": request.failure}
            self.report["localRequestFailures" if self.local(request.url) else "externalFailures"].append(entry)
            # Navigating between records may legitimately cancel an in-flight
            # request. Keep it visible; missing/failed required assets are also
            # caught by explicit assertions, image checks and HTTP tracking.

        def request_started(request):
            if "/modules/busoni/payload.enc.json" in urlsplit(request.url).path:
                self.fail("Synthetic Busoni UI smoke unexpectedly requested the protected payload", request.url)

        def console_message(message):
            if message.type == "error":
                source = message.location.get("url", "")
                kind = console_error_kind(message.text, source, self.origin, self.intentional_404s)
                entry = {"phase": self.phase, "url": page.url, "text": message.text, "location": message.location, "classification": kind}
                self.report["consoleErrors"].append(entry)
                if kind == "unexpected-console-error":
                    self.fail("Unexpected console.error: " + message.text, source or page.url)
                elif kind == "external-network":
                    self.report["externalFailures"].append(entry)

        page.on("pageerror", page_error)
        page.on("response", response)
        page.on("requestfailed", request_failed)
        page.on("request", request_started)
        page.on("console", console_message)
        page.on("load", lambda: self.inspect(page))

    def inspect(self, page):
        try:
            snapshot = page.evaluate("""() => ({
              url: location.href, title: document.title,
              viewport: {width: innerWidth, height: innerHeight}, width: document.documentElement.scrollWidth,
              reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
              canonical: document.querySelector('link[rel=canonical]')?.href || null,
              missing: !!document.querySelector('#missing-path'), synthetic: !!document.querySelector('#synthetic-unlocked'),
              brokenImages: Array.from(document.images).filter(img => img.currentSrc && img.complete && !img.naturalWidth).map(img => img.currentSrc)
            })""")
        except Exception as error:
            self.report["observationNotes"].append({"phase": self.phase, "url": page.url, "note": "Snapshot unavailable during navigation: " + str(error)[:220]})
            return
        if snapshot["url"] == "about:blank" or snapshot["synthetic"]:
            return
        key = (snapshot["url"], snapshot["viewport"]["width"])
        if key not in self.seen_snapshots:
            self.report["snapshots"].append({"phase": self.phase, **snapshot})
            self.seen_snapshots.add(key)
        if snapshot["width"] > snapshot["viewport"]["width"] + 1:
            self.fail(f"Horizontal overflow: {snapshot['width']} > {snapshot['viewport']['width']}", snapshot["url"])
        if not snapshot["reducedMotion"]:
            self.fail("Reduced-motion preference not active in smoke context", snapshot["url"])
        for url in snapshot["brokenImages"]:
            entry = {"phase": self.phase, "page": snapshot["url"], "url": url, "sameOrigin": self.local(url)}
            if entry not in self.report["imageFailures"]:
                self.report["imageFailures"].append(entry)
            if self.local(url):
                self.fail("Broken same-origin image", url)
        path = urlsplit(snapshot["url"]).path
        if not snapshot["missing"] and path.startswith(self.prefix):
            relative = path[len(self.prefix):]
            # Only the explicitly requested surfaces, not unrelated museum pages.
            canonical_scope = relative in ("", "index.html", "modules/", "modules/index.html") or any(
                relative.startswith(f"modules/{module}/") for module in ("europa", "shao", "busoni", "philosophy", "theory", "proceedings")
            )
            if canonical_scope:
                expected = urljoin(PUBLIC_BASE, relative)
                canonical = snapshot["canonical"]
                if not canonical or urlsplit(canonical).netloc != urlsplit(PUBLIC_BASE).netloc or normalized_path(urlsplit(canonical).path) != normalized_path(urlsplit(expected).path):
                    self.fail(f"Missing or incorrect canonical: {canonical!r}; expected {expected}", snapshot["url"])

    def screenshot(self, page, name):
        self.inspect(page)
        path = self.output / (name + ".png")
        page.screenshot(path=str(path), full_page=False, animations="disabled")
        self.report["screenshots"].append({"name": name, "path": str(path), "url": page.url, "viewport": page.viewport_size})

    def group(self, name, callback):
        self.phase = name
        previous = len(self.report["failures"])
        try:
            details = callback()
            status = "PASS" if len(self.report["failures"]) == previous else "FAIL"
            self.report["groups"].append({"name": name, "status": status, "details": details})
        except Exception as error:
            self.fail(f"{type(error).__name__}: {error}")
            self.report["groups"].append({"name": name, "status": "FAIL", "error": f"{type(error).__name__}: {error}"})

    def finish(self):
        self.report["status"] = "FAIL" if self.report["failures"] else "PASS"
        self.report["finishedAt"] = datetime.now(timezone.utc).isoformat()
        path = self.output / "smoke-report.json"
        path.write_text(json.dumps(self.report, ensure_ascii=False, indent=2), encoding="utf-8")
        return self.report


@contextmanager
def fresh_page(browser, evidence, viewport=DESKTOP):
    context = browser.new_context(viewport=viewport, reduced_motion="reduce", locale="zh-CN")
    context.add_init_script(INIT)
    context.on("page", evidence.observe)
    try:
        page = context.new_page()
        page.set_default_timeout(15000)
        page.set_default_navigation_timeout(45000)
        yield page
    finally:
        context.close()


def primary_smoke(browser, evidence):
    from playwright.sync_api import expect

    checks = []
    with fresh_page(browser, evidence) as page:
        page.goto(evidence.base_url, wait_until="load")
        expect(page.locator("main")).to_have_count(1)
        expect(page.locator("a.mod")).to_have_count(7)
        page.keyboard.press("Tab")
        expect(page.locator(".skip-link")).to_be_focused()
        assert page.locator(".skip-link").evaluate("node => node.matches(':focus-visible') && getComputedStyle(node).outlineStyle !== 'none'"), "skip link lacks a visible keyboard outline"
        page.keyboard.press("Enter")
        expect(page.locator("#main-content")).to_be_focused()
        assert page.evaluate("getComputedStyle(document.documentElement).scrollBehavior") != "smooth"
        page.locator("[data-theme-toggle]").click()
        theme = page.locator("html").get_attribute("data-theme")
        assert theme in ("light", "dark")
        page.reload(wait_until="load")
        assert page.locator("html").get_attribute("data-theme") == theme
        page.evaluate("scrollTo(0,0)")
        evidence.screenshot(page, "home-desktop")
        checks.append("root: 7 entrances, skip/main/focus-visible, reduced motion, theme survives reload")

        page.goto(urljoin(evidence.base_url, "modules/"), wait_until="load")
        expect(page.locator(".catalog-card")).to_have_count(16)
        ids = page.locator(".catalog-card").evaluate_all("nodes => nodes.map(node => node.id)")
        assert len(set(ids)) == 16
        for link in page.locator(".catalog-route").all():
            href = link.get_attribute("href")
            assert href and page.request.get(urljoin(page.url, href)).status == 200, href
        page.keyboard.press("Tab")
        expect(page.locator(".skip-link")).to_be_focused()
        assert page.locator(".skip-link").evaluate("node => node.matches(':focus-visible') && getComputedStyle(node).outlineStyle !== 'none'"), "catalog skip link lacks visible keyboard focus"
        page.keyboard.press("Enter")
        expect(page.locator("#main-content")).to_be_focused()
        page.locator("[data-theme-toggle]").click()
        catalog_theme = page.locator("html").get_attribute("data-theme")
        assert catalog_theme in ("light", "dark")
        page.reload(wait_until="load")
        assert page.locator("html").get_attribute("data-theme") == catalog_theme
        page.evaluate("scrollTo(0,0)")
        evidence.screenshot(page, "catalog")
        checks.append("Finding Aid: 16 unique cards/HTTP200 entries, actual keyboard skip/main/focus and theme reload")

        missing = urljoin(evidence.base_url, "__smoke_missing__/record-not-found")
        unknown = evidence.origin + "/unknown-prefix/modules/modules/beilin/main.html"
        for target in (missing, unknown):
            evidence.intentional_404s.add(urlsplit(target).path)
            response = page.goto(target, wait_until="load")
            assert response and response.status == 404, f"Expected actual HTTP 404: {target}"
            expect(page.locator("#missing-path")).to_have_text(urlsplit(target).path)
            assert urlsplit(page.url).path == urlsplit(target).path, "ordinary 404 redirected"
            assert "noindex" in page.locator("meta[name=robots]").get_attribute("content")
            if target == missing:
                evidence.screenshot(page, "not-found")
        legacy = urljoin(evidence.base_url, "modules/modules/beilin/main.html?legacy-smoke=1")
        evidence.intentional_404s.add(urlsplit(legacy).path)
        page.goto(legacy, wait_until="domcontentloaded")
        page.wait_for_url("**/modules/beilin/index.html?legacy-smoke=1", wait_until="load")
        # The preserved physical alias can use its original /ad-fontes target
        # even when the preview was opened through the equivalent root mapping.
        assert normalized_path(urlsplit(page.url).path) in {
            normalized_path(urlsplit(urljoin(evidence.base_url, "modules/beilin/")).path),
            "/ad-fontes/modules/beilin/",
        }
        checks.append("generic/unknown-prefix paths remain HTTP 404; exact Beilin alias reaches the preserved entry")

    with fresh_page(browser, evidence, MOBILE) as page:
        page.goto(evidence.base_url, wait_until="load")
        expect(page.locator("a.mod")).to_have_count(7)
        page.keyboard.press("Tab")
        expect(page.locator(".skip-link")).to_be_focused()
        page.keyboard.press("Tab")
        expect(page.locator("[data-theme-toggle]")).to_be_focused()
        page.evaluate("document.activeElement.blur()")
        evidence.screenshot(page, "home-mobile")
        checks.append("390×844 root: keyboard navigation and no horizontal overflow")
    return checks


def europa_smoke(browser, evidence):
    from playwright.sync_api import expect

    with fresh_page(browser, evidence) as page:
        page.goto(urljoin(evidence.base_url, "modules/europa/"), wait_until="load")
        expect(page.locator("#v-alm.on .hero")).to_be_visible()
        evidence.inspect(page)
        result = run_europa_smoke(page, evidence.base_url, clean_context=False)
        copied_url = page.evaluate("navigator.clipboard.readText()")
        page.set_viewport_size(DESKTOP)
        for suffix, kind, name in (("", "work", "europa-work"), ("&archive=reception", "reception", "europa-reception")):
            page.goto(urljoin(evidence.base_url, "modules/europa/") + "#work=work:buso-doktor-faust" + suffix, wait_until="load")
            expect(page.locator(f"#dlg[open][data-kind='{kind}']")).to_be_visible()
            evidence.screenshot(page, name)
    # The clean-copy validation is sequential, not a second concurrent context.
    with fresh_page(browser, evidence) as page:
        page.goto(copied_url, wait_until="load")
        expect(page.locator("#dlg[open][data-kind='fontes']")).to_be_visible()
        assert "浮士德" in page.title()
        evidence.inspect(page)
    return {**result, "cleanContextCopiedLink": copied_url}


def secondary_smoke(browser, evidence, viewport):
    from playwright.sync_api import expect

    with fresh_page(browser, evidence, viewport) as page:
        if viewport == DESKTOP:
            page.goto(urljoin(evidence.base_url, "modules/busoni/"), wait_until="load")
            expect(page.locator("#finding-aid")).to_be_visible()
            evidence.screenshot(page, "busoni-finding-aid")
        result = run_secondary_smoke(page, evidence.base_url)
        evidence.inspect(page)
        # Explicitly revisit each secondary public reading surface after its
        # dynamic content settles; do not rely only on generic load callbacks.
        surfaces = (
            ("shao", "", "#remote-open"),
            ("busoni", "", "#finding-aid"),
            ("philosophy", "?q=术语#p18", "#p18"),
            ("theory", "#v=foundation&item=f-harmonics", "#f-harmonics"),
        )
        for module, suffix, selector in surfaces:
            page.goto(urljoin(evidence.base_url, f"modules/{module}/") + suffix, wait_until="load")
            expect(page.locator(selector)).to_be_visible()
            dimensions = page.evaluate("({viewport: innerWidth, document: document.documentElement.scrollWidth})")
            assert dimensions["viewport"] == viewport["width"], dimensions
            assert dimensions["document"] <= dimensions["viewport"] + 1, f"{module} overflow at {viewport['width']}: {dimensions}"
            if module == "busoni":
                expect(page.locator("#pwd")).to_be_visible()
                page.locator("#show-password").focus()
                page.keyboard.press("Space")
                assert page.locator("#pwd").get_attribute("type") == "text"
                page.keyboard.press("Space")
                assert page.locator("#pwd").get_attribute("type") == "password"
                assert page.locator("#show-password").evaluate("node => node.matches(':focus-visible') && getComputedStyle(node).outlineStyle !== 'none'")
            evidence.inspect(page)
        result.append(f"Explicit {viewport['width']}px Shao/Busoni/Philosophy/Theory overflow; Busoni public form keyboard focus and visibility")
        return result


def run_site_smoke(browser, base_url, output, *, proceedings=False, metadata=None):
    evidence = Evidence(base_url, output, metadata)
    evidence.report["browserVersion"] = browser.version
    evidence.group("root-catalog-404", lambda: primary_smoke(browser, evidence))
    evidence.group("europa-routes", lambda: europa_smoke(browser, evidence))
    evidence.group("secondary-desktop", lambda: secondary_smoke(browser, evidence, DESKTOP))
    evidence.group("secondary-mobile", lambda: secondary_smoke(browser, evidence, MOBILE))
    if proceedings:
        def proceedings_group():
            helper_path = ROOT / "scripts" / "smoke_proceedings.py"
            if not helper_path.is_file():
                raise RuntimeError("--proceedings requested but scripts/smoke_proceedings.py has not been supplied; no test is claimed")
            helper = importlib.import_module("smoke_proceedings")
            if not callable(getattr(helper, "run_proceedings_smoke", None)):
                raise RuntimeError("Proceedings helper does not export run_proceedings_smoke(page, base_url)")
            with fresh_page(browser, evidence) as page:
                result = helper.run_proceedings_smoke(page, evidence.base_url)
                evidence.screenshot(page, "proceedings")
                return result
        evidence.group("proceedings", proceedings_group)
    else:
        evidence.report["proceedings"] = "not requested; no proceedings browser coverage claimed"
    return evidence.finish()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path, help="Directory for smoke-report.json and key viewport screenshots")
    parser.add_argument("--base-url", help="Existing preview/site root; otherwise start a loopback in-process preview")
    parser.add_argument("--prefix", default="/ad-fontes", help="Prefix for the managed preview server")
    parser.add_argument("--executable-path", help="Use an already installed Chromium/Chrome executable")
    parser.add_argument("--proceedings", action="store_true", help="Run the separately supplied proceedings helper")
    parser.add_argument("--metadata", action="append", default=[], metavar="KEY=VALUE", help="Attach operator-provided provenance; may be repeated")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    report_path = args.output / "smoke-report.json"
    metadata = {}
    for value in args.metadata:
        if "=" not in value:
            parser.error("--metadata requires KEY=VALUE")
        key, text = value.split("=", 1)
        metadata[key] = text
    try:
        memory = windows_memory()
        if memory.get("percent", 0) >= 75:
            report = {"status": "BLOCKED", "reason": "Physical memory is at or above 75%; no new browser was launched", "memory": memory, "metadata": metadata}
            report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps(report, ensure_ascii=False))
            return 3
        from playwright.sync_api import sync_playwright
        with nullcontext(args.base_url) if args.base_url else preview_server(prefix=args.prefix) as base_url:
            with sync_playwright() as playwright:
                options = {"headless": True}
                if args.executable_path:
                    options["executable_path"] = args.executable_path
                browser = playwright.chromium.launch(**options)
                try:
                    report = run_site_smoke(browser, base_url, args.output, proceedings=args.proceedings, metadata={**metadata, "memoryBeforeLaunch": memory})
                finally:
                    browser.close()
        print(json.dumps({"status": report["status"], "report": str(report_path.resolve()), "failures": len(report["failures"]), "screenshots": len(report["screenshots"])}, ensure_ascii=False))
        return 0 if report["status"] == "PASS" else 1
    except Exception as error:
        report = {"status": "FAIL", "reason": f"{type(error).__name__}: {error}", "metadata": metadata, "browserTestsClaimed": False}
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
