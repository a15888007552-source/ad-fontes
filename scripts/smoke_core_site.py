#!/usr/bin/env python3
"""Smoke-test the two core public journeys with Python Playwright.

This intentionally complements, rather than replaces, the existing Museum
Atlas browser smoke.  Europa requires sign-in, so the Europa assertion checks
that an anonymous visitor sees the login gate with a real bounding box and
that the search box stays hidden behind it.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit


ROUTES = {
    "homepage": "/",
    "europa": "/modules/europa/",
    "museum-atlas": "/modules/museum-atlas/",
}

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    parser.add_argument("--output", type=Path, default=Path("artifacts/core-site-smoke.json"))
    parser.add_argument("--timeout", type=int, default=30_000)
    return parser


def visible_box(locator: Any, label: str, timeout: int) -> dict[str, Any]:
    locator.wait_for(state="visible", timeout=timeout)
    box = locator.bounding_box()
    if not box or box["width"] <= 1 or box["height"] <= 1:
        raise AssertionError(f"{label} has no usable visible bounding box: {box}")
    return {key: round(float(value), 2) for key, value in box.items()}


def local_url(base_url: str, route: str) -> str:
    return urljoin(base_url.rstrip("/") + "/", route.lstrip("/"))


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    output = args.output
    report: dict[str, Any] = {
        "schema_version": 1,
        "base_url": args.base_url.rstrip("/") + "/",
        "routes": {},
        "errors": [],
        "status": "PASS",
    }

    try:
        from playwright.sync_api import sync_playwright
    except Exception as error:
        report["status"] = "FAIL"
        report["errors"].append(f"Playwright import failed: {error}")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Core site smoke: FAIL (Playwright import failed)", file=sys.stderr)
        return 1

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            for route_name, route in ROUTES.items():
                page = context.new_page()
                page_errors: list[str] = []
                console_errors: list[str] = []
                failed_local_responses: list[str] = []

                def on_page_error(error: Any) -> None:
                    page_errors.append(str(error))

                def on_console(message: Any) -> None:
                    if message.type == "error":
                        console_errors.append(message.text)

                def on_response(response: Any) -> None:
                    parsed = urlsplit(response.url)
                    base = urlsplit(args.base_url)
                    if parsed.netloc == base.netloc and response.status >= 400:
                        failed_local_responses.append(f"{response.status} {response.url}")

                page.on("pageerror", on_page_error)
                page.on("console", on_console)
                page.on("response", on_response)
                url = local_url(args.base_url, route)
                route_report: dict[str, Any] = {"url": url}
                try:
                    response = page.goto(url, wait_until="domcontentloaded", timeout=args.timeout)
                    if response is None:
                        raise AssertionError("navigation returned no response")
                    route_report["http_status"] = response.status
                    if response.status != 200:
                        raise AssertionError(f"expected HTTP 200, got {response.status}")
                    page.wait_for_timeout(700)
                    title = page.title().strip()
                    if not title:
                        raise AssertionError("page title is empty")
                    route_report["title"] = title

                    if route_name == "europa":
                        # Europa requires sign-in; an anonymous visitor must see the login gate,
                        # not the search box.
                        notice = page.locator(".auth-gate-notice")
                        route_report["auth_gate_box"] = visible_box(notice, "Europa login gate", args.timeout)
                        if page.locator("#q").is_visible():
                            raise AssertionError("Europa search is visible to an anonymous visitor")

                    if page_errors:
                        raise AssertionError(f"pageerror: {page_errors[0]}")
                    if console_errors:
                        raise AssertionError(f"console.error: {console_errors[0]}")
                    if failed_local_responses:
                        raise AssertionError(f"same-origin HTTP failure: {failed_local_responses[0]}")
                    route_report["status"] = "PASS"
                except Exception as error:
                    route_report["status"] = "FAIL"
                    route_report["error"] = str(error)
                    report["errors"].append(f"{route_name}: {error}")
                finally:
                    route_report["pageerrors"] = page_errors
                    route_report["console_errors"] = console_errors
                    route_report["failed_local_responses"] = failed_local_responses
                    report["routes"][route_name] = route_report
                    page.close()
            context.close()
            browser.close()
    except Exception as error:
        report["status"] = "FAIL"
        report["errors"].append(f"browser setup/run failed: {error}")

    if report["errors"]:
        report["status"] = "FAIL"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Core site smoke: {report['status']} ({len(report['errors'])} errors)")
    for error in report["errors"]:
        print(f"ERROR: {error}")
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
