#!/usr/bin/env python3
"""Focused Europa smoke, reusable inside the site's single final browser run.

Import run_europa_smoke(page, base_url) to reuse an existing Playwright page.
The optional CLI starts one Chromium instance; it never installs a browser.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "modules" / "europa" / "data" / "research"
WORK_ID = "work:buso-doktor-faust"
PERSON_ID = "buso"
ARCHIVES = {
    "versions": ("version", "versions", "versionRefs"),
    "fontes": ("fontes", "sources", "sourceRefs"),
    "performances": ("performance", "performances", "performanceRefs"),
    "recordings": ("recording", "recordings", "recordingRefs"),
    "reception": ("reception", "receptions", "receptionRefs"),
}
INIT = """localStorage.setItem('annales_seen','1');sessionStorage.setItem('europa-opening-seen','1');"""


def run_europa_smoke(page, base_url: str, *, check_mobile: bool = True, clean_context: bool = True) -> dict:
    from playwright.sync_api import expect

    europa = urljoin(base_url.rstrip("/") + "/", "modules/europa/")
    origin = "{0.scheme}://{0.netloc}".format(urlsplit(europa))
    works = json.loads((DATA / "works.json").read_text(encoding="utf-8"))
    work = next(item for item in works if item["id"] == WORK_ID)
    checks: list[str] = []
    errors: list[str] = []
    missing: list[str] = []
    on_error = lambda error: errors.append(str(error))
    on_response = lambda response: missing.append(response.url) if response.status == 404 and response.url.startswith(origin + "/") else None
    page.on("pageerror", on_error)
    page.on("response", on_response)
    page.add_init_script(INIT)
    page.emulate_media(reduced_motion="reduce")
    page.set_viewport_size({"width": 1440, "height": 1000})

    def fragment() -> dict:
        return {key: value[0] for key, value in parse_qs(urlsplit(page.url).fragment).items()}

    def opened(kind: str, **params) -> None:
        expect(page.locator(f"#dlg[open][data-kind='{kind}']")).to_be_visible()
        page.wait_for_function("expected => Object.entries(expected).every(([k,v]) => new URLSearchParams(location.hash.slice(1)).get(k) === v)", arg=params)
        assert all(fragment().get(key) == value for key, value in params.items()), page.url

    def go(hash_value: str, kind: str, **params) -> None:
        target = europa + hash_value
        # A same-path goto with a different hash may not load a new document.
        # Direct-link/loading checks must actually fetch the research data;
        # button-driven history checks below remain normal UI navigations.
        if page.url.split("#", 1)[0] == europa:
            page.evaluate("target => history.replaceState(null, '', target)", target)
            page.reload(wait_until="domcontentloaded")
        else:
            page.goto(target, wait_until="domcontentloaded")
        opened(kind, **params)

    def no_overflow() -> None:
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "horizontal page overflow"

    try:
        go(f"#m={PERSON_ID}", "musician", m=PERSON_ID)
        expect(page.locator("#detail-title")).to_contain_text("布索尼")
        page.locator(f"[data-work-open='{WORK_ID}']").click()
        opened("work", work=WORK_ID)
        page.locator("[data-version-open]").click()
        opened("version", work=WORK_ID, archive="versions")
        page.locator("#version-lineage-back").click()
        opened("work", work=WORK_ID)
        page.locator("#work-archive-back").click()
        opened("musician", m=PERSON_ID)
        for kind, params in [("work", {"work": WORK_ID}), ("version", {"archive": "versions"}), ("work", {"work": WORK_ID}), ("musician", {"m": PERSON_ID})]:
            page.go_back(wait_until="domcontentloaded")
            opened(kind, **params)
        for kind, params in [("work", {"work": WORK_ID}), ("version", {"archive": "versions"}), ("work", {"work": WORK_ID}), ("musician", {"m": PERSON_ID})]:
            page.go_forward(wait_until="domcontentloaded")
            opened(kind, **params)
        checks.append("person → work → versions → work → person; Back/Forward")

        go(f"#work={WORK_ID}", "work", work=WORK_ID)
        page.reload(wait_until="domcontentloaded")
        opened("work", work=WORK_ID)
        assert "浮士德" in page.title()
        checks.append("direct work and refresh/title")

        for archive, (kind, collection, refs) in ARCHIVES.items():
            item_id = work[refs][0]
            go(f"#work={WORK_ID}&archive={archive}", kind, work=WORK_ID, archive=archive)
            page.reload(wait_until="domcontentloaded")
            opened(kind, archive=archive)
            go(f"#work={WORK_ID}&archive={archive}&item={item_id}", kind, archive=archive, item=item_id)
            target = page.locator(f"[data-archive-item='{item_id}']")
            expect(target).to_be_focused()
            box = target.bounding_box()
            assert box and box["y"] < 1000, f"{archive} item did not scroll into view"
            assert not target.evaluate("node => node.classList.contains('archive-item-target')"), "reduced-motion target must not animate"
            no_overflow()
            page.locator("#dx").click()
            opened("work", work=WORK_ID)
            assert "archive" not in fragment()
        checks.append("all five archives: direct/refresh/item/focus/scroll/reduced-motion/parent close")

        delayed: list[str] = []

        def delay_research(route) -> None:
            delayed.append(route.request.url)
            time.sleep(0.08)
            route.continue_()

        page.route("**/data/research/*.json", delay_research)
        try:
            go(f"#work={WORK_ID}&archive=reception", "reception", archive="reception")
            assert len(delayed) == 6, f"expected 6 delayed JSON requests, got {len(delayed)}"
        finally:
            page.unroute("**/data/research/*.json", delay_research)
        checks.append("deep link waits for asynchronous research JSON")

        held = []

        def hold_research(route) -> None:
            held.append(route)

        page.route("**/data/research/*.json", hold_research)
        try:
            go(f"#m={PERSON_ID}", "musician", m=PERSON_ID)
            expect(page.locator(".person-work-archive")).to_have_count(0)
            page.locator("#views button[data-v='musio']").click()
            expect(page.locator("#v-musio.on")).to_be_visible()
            assert fragment().get("v") == "musio"
            page.evaluate("location.hash = '#m=buso'")
            opened("musician", m=PERSON_ID)
            page.locator("#dnext").focus()
            for route in held:
                route.continue_()
            held.clear()
            expect(page.locator(f"[data-work-open='{WORK_ID}']")).to_be_visible()
            expect(page.locator("#dnext")).to_be_focused()
            assert fragment() == {"m": PERSON_ID}
        finally:
            for route in held:
                route.continue_()
            page.unroute("**/data/research/*.json", hold_research)
        checks.append("stalled research leaves person/views usable; late work index preserves person address and focus")

        page.locator("[data-locate='tl']").click()
        expect(page.locator("#v-tl.on")).to_be_visible()
        expect(page.locator(f".tlbar[data-m='{PERSON_ID}']")).to_have_class("tlbar is-selected")
        expect(page.locator("#dlg")).not_to_be_visible()
        checks.append("person → timeline waits for rendering and retains selection")

        go("#work=missing", "route-error", work="missing")
        expect(page.locator("#archive-route-error-title")).to_have_text("档案不存在")
        page.locator("#route-return").click()
        expect(page.locator("#dlg")).not_to_be_visible()
        go("#m=constructor", "route-error", m="constructor")
        expect(page.locator("#archive-route-error-title")).to_have_text("人物档案不存在")
        go(f"#work={WORK_ID}&archive=wrong", "work", work=WORK_ID)
        expect(page.locator(".archive-route-notice")).to_contain_text("类别不存在")
        assert "archive" not in fragment()
        go(f"#work={WORK_ID}&archive=versions&item=missing", "version", archive="versions")
        expect(page.locator(".archive-route-notice")).to_contain_text("没有该条目")
        assert "item" not in fragment()
        go("#work=work:seikilos-epitaph&archive=versions", "version", archive="versions")
        expect(page.locator(".archive-route-notice")).to_contain_text("尚未建立")
        checks.append("invalid work/archive/item and empty archive recover safely")

        go(f"#work={WORK_ID}&archive=fontes", "fontes", archive="fontes")
        page.context.grant_permissions(["clipboard-read", "clipboard-write"], origin=origin)
        page.locator(".archive-link-controls .archive-copy-link").click()
        expect(page.locator(".archive-copy-status")).to_have_text("链接已复制。")
        copied = page.evaluate("navigator.clipboard.readText()")
        assert parse_qs(urlsplit(copied).fragment) == {"work": [WORK_ID], "archive": ["fontes"]}
        if clean_context:
            context = page.context.browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
            try:
                context.add_init_script(INIT)
                clean = context.new_page()
                clean.goto(copied, wait_until="domcontentloaded")
                expect(clean.locator("#dlg[open][data-kind='fontes']")).to_be_visible()
                assert "浮士德" in clean.title()
            finally:
                context.close()
        checks.append("accessible copy feedback and copied URL opens in a clean context" if clean_context else "accessible copy feedback and copied URL")

        page.goto(europa + "#v=musio", wait_until="domcontentloaded")
        expect(page.locator("#v-musio.on")).to_be_visible()
        hero_url = page.locator(".musiohero").evaluate("node => getComputedStyle(node).backgroundImage")
        assert "musicology-hero.jpg" in hero_url
        assert page.request.get(urljoin(europa, "音乐学资源/musicology-hero.jpg")).status == 200
        checks.append("legacy musicology view and tracked hero returns 200")

        if check_mobile:
            page.set_viewport_size({"width": 390, "height": 844})
            go(f"#m={PERSON_ID}", "musician", m=PERSON_ID)
            go(f"#work={WORK_ID}", "work", work=WORK_ID)
            for archive, (kind, _, _) in ARCHIVES.items():
                go(f"#work={WORK_ID}&archive={archive}", kind, archive=archive)
                no_overflow()
                page.locator(".archive-link-controls .archive-copy-link").focus()
                expect(page.locator(".archive-link-controls .archive-copy-link")).to_be_focused()
            page.reload(wait_until="domcontentloaded")
            opened("reception", archive="reception")
            checks.append("390×844 person/work/five archives, refresh and keyboard copy focus")

        assert not errors, errors
        assert not missing, missing
        return {"checks": checks, "page_errors": errors, "local_404s": missing}
    finally:
        page.remove_listener("pageerror", on_error)
        page.remove_listener("response", on_response)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/")
    parser.add_argument("--executable-path", help="Use an already installed browser executable")
    args = parser.parse_args()
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, **({"executable_path": args.executable_path} if args.executable_path else {}))
        try:
            page = browser.new_page()
            print(json.dumps(run_europa_smoke(page, args.base_url), ensure_ascii=False, indent=2))
        finally:
            browser.close()


if __name__ == "__main__":
    main()
