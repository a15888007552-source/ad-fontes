#!/usr/bin/env python3
"""Read-only browser smoke for the Shaanxi History Museum visual system."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8789")
    parser.add_argument("--output", type=Path, default=Path("artifacts/pr36-visual-review/shaanxi-history-smoke.json"))
    parser.add_argument("--screenshots-dir", type=Path, default=Path("artifacts/pr36-visual-review"))
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/") + "/modules/shaanxi-history/index.html?opening=0"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.screenshots_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "status": "FAIL",
        "baseUrl": base_url,
        "pageLoaded": False,
        "consoleErrors": [],
        "consoleWarnings": [],
        "pageErrors": [],
        "http404": [],
        "cards": 0,
        "desktop": {},
        "mobile": {},
        "screenshots": {},
        "diagnostics": [],
    }

    try:
        from playwright.sync_api import sync_playwright
    except Exception as error:
        report["diagnostics"].append(f"Playwright import failed: {error}")
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        return 1

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            page = context.new_page()
            page.on("console", lambda message: report["consoleErrors"].append(message.text) if message.type == "error" else report["consoleWarnings"].append(message.text) if message.type == "warning" else None)
            page.on("pageerror", lambda error: report["pageErrors"].append(str(error)))
            page.on("response", lambda response: report["http404"].append(response.url) if response.status == 404 else None)

            response = page.goto(base_url, wait_until="domcontentloaded", timeout=60000)
            if response is None or response.status >= 400:
                raise AssertionError(f"page status is {response.status if response else 'unknown'}")
            report["pageLoaded"] = True
            page.wait_for_timeout(2400)
            page.locator("#object-grid .object-card").first.wait_for(state="attached", timeout=30000)
            report["cards"] = page.locator("#object-grid .object-card").count()
            if report["cards"] < 8:
                raise AssertionError(f"expected at least 8 rendered cards, got {report['cards']}")

            page.evaluate("window.scrollTo(0, document.querySelector('#museum').offsetTop)")
            page.wait_for_timeout(350)
            museum_shot = args.screenshots_dir / "museum-desktop.png"
            page.screenshot(path=str(museum_shot))
            page.evaluate("window.scrollTo(0, document.querySelector('#collection').offsetTop)")
            page.wait_for_timeout(350)
            collection_shot = args.screenshots_dir / "collection-desktop.png"
            page.screenshot(path=str(collection_shot))

            desktop_cards = page.locator("#object-grid .object-card").evaluate_all(
                """cards => cards.slice(0, 8).map(card => {
                  const image = card.querySelector('.card-image').getBoundingClientRect();
                  const body = card.querySelector('.card-body').getBoundingClientRect();
                  return {card: card.getBoundingClientRect().height, image: {width: image.width, height: image.height}, body: {width: body.width, height: body.height}};
                })"""
            )
            heights = [card["card"] for card in desktop_cards]
            image_widths = [card["image"]["width"] for card in desktop_cards]
            image_heights = [card["image"]["height"] for card in desktop_cards]
            axis = page.evaluate(
                """() => {
                  const rect = selector => document.querySelector(selector).getBoundingClientRect().left;
                  return {label: rect('#museum > .museum > .section-label'), title: rect('#museum .section-title-row'), facts: rect('#museum .museum-facts')};
                }"""
            )
            theme = page.locator("#collection").evaluate(
                """node => {
                  const style = getComputedStyle(node);
                  return {gold: style.getPropertyValue('--gold').trim(), red: style.getPropertyValue('--red').trim(), paper: style.getPropertyValue('--paper').trim(), ink: style.getPropertyValue('--ink').trim()};
                }"""
            )
            report["desktop"] = {
                "cardCountChecked": len(desktop_cards),
                "cardHeightSpread": max(heights) - min(heights),
                "imageWidthSpread": max(image_widths) - min(image_widths),
                "imageHeightSpread": max(image_heights) - min(image_heights),
                "aboutAxis": axis,
                "aboutAxisAligned": max(axis.values()) - min(axis.values()) <= 2,
                "theme": theme,
            }

            page.set_viewport_size({"width": 390, "height": 844})
            page.wait_for_timeout(650)
            page.evaluate("window.scrollTo(0, document.querySelector('#collection').offsetTop)")
            page.wait_for_timeout(350)
            mobile_shot = args.screenshots_dir / "collection-mobile.png"
            page.screenshot(path=str(mobile_shot))
            overflow = page.evaluate(
                """() => ({scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, bodyScrollWidth: document.body.scrollWidth})"""
            )
            text_overflow = page.locator(".card-title").evaluate_all(
                """nodes => nodes.filter(node => {
                  const rect = node.getBoundingClientRect();
                  const style = getComputedStyle(node);
                  return rect.width > 0 && rect.height > 0 && node.scrollWidth > node.clientWidth + 1 && style.textOverflow !== 'ellipsis';
                }).map(node => ({className: node.className || '', text: (node.textContent || '').trim().slice(0, 80), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth}))"""
            )
            button = page.locator("#object-grid .object-card").first
            button_box = button.bounding_box()
            button.click(trial=True)
            report["mobile"] = {
                "overflow": overflow,
                "horizontalOverflow": max(overflow["scrollWidth"], overflow["bodyScrollWidth"]) - overflow["clientWidth"],
                "textOverflowCount": len(text_overflow),
                "textOverflowDetails": text_overflow[:20],
                "firstCardClickable": bool(button_box and button_box["width"] > 0 and button_box["height"] > 0),
            }
            report["screenshots"] = {
                "museumDesktop": str(museum_shot),
                "collectionDesktop": str(collection_shot),
                "collectionMobile": str(mobile_shot),
            }

            if report["consoleErrors"] or report["pageErrors"] or report["http404"]:
                raise AssertionError("new console/page errors or HTTP 404 responses detected")
            if not report["desktop"]["aboutAxisAligned"]:
                raise AssertionError(f"About Museum axis mismatch: {axis}")
            if report["desktop"]["cardHeightSpread"] > 2:
                raise AssertionError(f"desktop card height spread is {report['desktop']['cardHeightSpread']}")
            if report["desktop"]["imageWidthSpread"] > 2 or report["desktop"]["imageHeightSpread"] > 2:
                raise AssertionError("desktop image frames are not unified")
            if report["mobile"]["horizontalOverflow"] > 0 or report["mobile"]["textOverflowCount"]:
                raise AssertionError("mobile collection overflow or text clipping detected")
            report["status"] = "PASS"
            browser.close()
    except Exception as error:
        report["diagnostics"].append(str(error))

    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
