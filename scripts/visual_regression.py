#!/usr/bin/env python3
"""Capture deterministic first-pass visual-regression artifacts.

The initial Infrastructure v1 contract is artifact capture, not an automatic
pixel gate.  A baseline directory can be supplied later to enable a small,
explicit pixel comparison after a human has reviewed the captured images.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urljoin


ROUTES = {
    "homepage": ("/", "body"),
    "europa": ("/modules/europa/", "#v-alm .card"),
    "museum-atlas": ("/modules/museum-atlas/", ".museum-card"),
}
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 1000},
    "mobile": {"width": 390, "height": 844},
}
STABILIZE_CSS = """
*, *::before, *::after {
  animation-delay: 0s !important;
  animation-duration: 0s !important;
  animation-iteration-count: 1 !important;
  transition: none !important;
  caret-color: transparent !important;
}
html { scroll-behavior: auto !important; }
"""

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/visual-regression"))
    parser.add_argument("--baseline-dir", type=Path, help="optional reviewed PNG baselines to compare")
    parser.add_argument("--diff-dir", type=Path, help="optional directory for pixel diff images")
    parser.add_argument("--max-diff-percent", type=float, default=0.5)
    parser.add_argument("--timeout", type=int, default=30_000)
    return parser


def target_name(route_name: str, viewport_name: str) -> str:
    return f"{route_name}-{viewport_name}.png"


def compare_with_baseline(current: Path, baseline: Path, diff_path: Path | None, max_percent: float) -> dict[str, Any]:
    try:
        from PIL import Image, ImageChops
    except Exception as error:
        raise RuntimeError(f"Pillow is required only for --baseline-dir comparisons: {error}") from error
    if not baseline.exists():
        return {"status": "FAIL", "reason": f"missing baseline: {baseline.name}"}
    current_image = Image.open(current).convert("RGBA")
    baseline_image = Image.open(baseline).convert("RGBA")
    if current_image.size != baseline_image.size:
        return {
            "status": "FAIL",
            "reason": f"image size changed: current={current_image.size}, baseline={baseline_image.size}",
        }
    difference = ImageChops.difference(current_image, baseline_image)
    rgb_difference = difference.convert("RGB")
    tolerance = rgb_difference.point(lambda value: 255 if value > 8 else 0)
    mask = tolerance.convert("L").point(lambda value: 255 if value else 0)
    changed_pixels = sum(1 for pixel in mask.getdata() if pixel)
    total_pixels = max(1, mask.width * mask.height)
    diff_percent = changed_pixels / total_pixels * 100
    if diff_path and changed_pixels:
        diff_path.parent.mkdir(parents=True, exist_ok=True)
        difference.save(diff_path)
    return {
        "status": "PASS" if diff_percent <= max_percent else "FAIL",
        "changed_pixels": changed_pixels,
        "total_pixels": total_pixels,
        "diff_percent": round(diff_percent, 4),
        "max_diff_percent": max_percent,
        "diff": str(diff_path) if diff_path and changed_pixels else None,
    }


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    output_dir = args.output_dir.resolve()
    baseline_dir = args.baseline_dir.resolve() if args.baseline_dir else None
    diff_dir = args.diff_dir.resolve() if args.diff_dir else None
    output_dir.mkdir(parents=True, exist_ok=True)
    report: dict[str, Any] = {
        "schema_version": 1,
        "base_url": args.base_url.rstrip("/") + "/",
        "viewports": VIEWPORTS,
        "captures": [],
        "comparisons": [],
        "errors": [],
        "status": "PASS",
        "mode": "compare" if baseline_dir else "capture",
    }

    try:
        from playwright.sync_api import sync_playwright
    except Exception as error:
        report["status"] = "FAIL"
        report["errors"].append(f"Playwright import failed: {error}")
        (output_dir / "visual-regression.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Visual regression capture: FAIL (Playwright import failed)", file=sys.stderr)
        return 1

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            for viewport_name, viewport in VIEWPORTS.items():
                context = browser.new_context(viewport=viewport, device_scale_factor=1)
                context.set_default_timeout(args.timeout)
                page = context.new_page()
                page.emulate_media(reduced_motion="reduce")
                page_errors: list[str] = []
                console_errors: list[str] = []
                page.on("pageerror", lambda error: page_errors.append(str(error)))
                page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
                for route_name, (route, selector) in ROUTES.items():
                    capture: dict[str, Any] = {
                        "route": route_name,
                        "viewport": viewport_name,
                        "url": urljoin(args.base_url.rstrip("/") + "/", route.lstrip("/")),
                    }
                    try:
                        page_errors.clear()
                        console_errors.clear()
                        response = page.goto(capture["url"], wait_until="domcontentloaded", timeout=args.timeout)
                        if response is None or response.status != 200:
                            status = response.status if response is not None else None
                            raise AssertionError(f"expected HTTP 200, got {status}")
                        page.wait_for_timeout(700)
                        page.add_style_tag(content=STABILIZE_CSS)
                        page.locator(selector).first.wait_for(state="visible", timeout=args.timeout)
                        page.wait_for_timeout(300)
                        target = output_dir / target_name(route_name, viewport_name)
                        page.screenshot(path=str(target), type="png")
                        capture["path"] = str(target)
                        if page_errors or console_errors:
                            raise AssertionError(
                                f"browser errors after capture: pageerror={page_errors[:1]}, console.error={console_errors[:1]}"
                            )
                        if baseline_dir:
                            comparison = compare_with_baseline(
                                target,
                                baseline_dir / target.name,
                                diff_dir / target.name if diff_dir else None,
                                args.max_diff_percent,
                            )
                            comparison.update({"route": route_name, "viewport": viewport_name})
                            report["comparisons"].append(comparison)
                            if comparison["status"] == "FAIL":
                                raise AssertionError(comparison.get("reason", "pixel difference exceeds threshold"))
                        capture["status"] = "PASS"
                        report["captures"].append(capture)
                    except Exception as error:
                        capture["status"] = "FAIL"
                        capture["error"] = str(error)
                        capture["pageerrors"] = page_errors[:10]
                        capture["console_errors"] = console_errors[:10]
                        report["captures"].append(capture)
                        report["errors"].append(f"{route_name}/{viewport_name}: {error}")
                context.close()
            browser.close()
    except Exception as error:
        report["status"] = "FAIL"
        report["errors"].append(f"browser setup/run failed: {error}")

    if report["errors"]:
        report["status"] = "FAIL"
    (output_dir / "visual-regression.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Visual regression capture: {report['status']} ({len(report['captures'])} captures, {len(report['errors'])} errors)")
    for error in report["errors"]:
        print(f"ERROR: {error}")
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
