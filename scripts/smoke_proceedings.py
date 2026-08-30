"""Evidence-bounded proceedings checks for a caller-owned Playwright page.

This module never launches a browser, creates a context, installs dependencies,
or reads private content. Source fixtures come from the phase-B data files and
are checked against the immutable phase-A manifest before browser assertions.
"""

import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import time
from urllib.parse import urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "modules" / "proceedings"
VIEWS = ("overview", "keynote", "all", "schedule", "photos", "themes")
EXPECTED_COUNTS = {
    "total": 219, "keynote": 8, "formal": 132, "poster": 79,
    "slides": 188, "photos": 401, "abstracts": 211,
    "presentations": 140, "summary": 121, "contextNote": 98,
    "photoStream": 401, "uniqueLocalImages": 589, "slideDecks": 10,
    "scheduleDisplayGroups": 36, "sourceBylineRecords": 219,
}
FIXTURE_IDS = ("t000", "t001", "t008", "t023", "t140", "t219")


def _semantic_hash(value):
    # The manifest uses JSON.stringify of recursively sorted object keys.
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _space(value):
    return re.sub(r"\s+", " ", str(value)).strip()


def load_fixtures():
    """Read actual source records; reject changed data instead of blessing it."""
    def read(relative):
        return json.loads((MODULE / relative).read_text(encoding="utf-8"))

    manifest = read("baseline.manifest.json")
    corpus = manifest["corpus"]
    assert manifest["schemaVersion"] == 1, "Unsupported preservation manifest"
    assert corpus["counts"] == EXPECTED_COUNTS, "Original corpus counts changed"
    bundle = {name: read(f"data/{name}.json") for name in (
        "conference", "presentations", "posters", "sessions", "speakers", "media"
    )}
    conference = bundle["conference"]
    assert conference["schemaVersion"] == 1
    all_records = bundle["presentations"] + bundle["posters"]
    by_id = {record["id"]: record for record in all_records}
    assert len(all_records) == len(by_id) == EXPECTED_COUNTS["total"]
    assert len(bundle["presentations"]) == EXPECTED_COUNTS["presentations"]
    assert all(record["session_type"] in ("keynote", "formal") for record in bundle["presentations"])
    assert len(bundle["posters"]) == EXPECTED_COUNTS["poster"]
    assert all(record["session_type"] == "poster" for record in bundle["posters"])
    assert conference["recordOrder"] == [record["id"] for record in corpus["records"]]
    talks = [by_id[record_id] for record_id in conference["recordOrder"]]
    for expected in corpus["records"]:
        record = by_id[expected["id"]]
        assert _semantic_hash(record) == expected["semanticSha256"], f"Source record changed: {record['id']}"

    metadata = conference["metadata"]
    assert metadata["conference"] == corpus["conference"]
    assembled = {**metadata, "talks": talks, "photo_stream": bundle["media"]["photo_stream"]}
    assert _semantic_hash(assembled) == corpus["siteDataSha256"], "Original conference/source corpus changed"
    assert _semantic_hash(bundle["media"]["images"]) == corpus["imagesSha256"], "Original image mapping changed"
    assert len(bundle["media"]["photo_stream"]) == EXPECTED_COUNTS["photoStream"]
    image_paths = corpus["imagePaths"]
    assert len(image_paths) == len(set(image_paths)) == EXPECTED_COUNTS["uniqueLocalImages"]
    assert sorted(bundle["media"]["images"]) == image_paths
    for relative in image_paths:
        path = PurePosixPath(relative)
        assert path.parts[0] == "assets" and ".." not in path.parts and "\\" not in relative
        assert bundle["media"]["images"][relative] == relative

    expected_sessions = [
        {"id": "session-" + group["memberIds"][0], "recordIds": group["memberIds"]}
        for group in corpus["scheduleDisplayGroups"]
    ]
    assert bundle["sessions"] == {
        "kind": "calendar-display-groups", "label": "日程分组", "items": expected_sessions,
    }, "Session references must retain original display groups"
    assert bundle["speakers"] == {
        "kind": "source-byline-records", "label": "原署名记录",
        "items": [{"id": "speaker-" + record["id"], "recordIds": [record["id"]]} for record in talks],
    }, "Speaker references must retain original byline records"
    name_to_id = {record["name"]: record["id"] for record in talks}
    assert len(name_to_id) == EXPECTED_COUNTS["sourceBylineRecords"]
    assert "t194" not in by_id
    assert corpus["unscheduledRecordIds"] == ["t219"]
    assert not any(by_id["t219"].get(field) for field in ("day", "period", "room"))
    assert not any("t219" in group["recordIds"] for group in expected_sessions)
    assert all(record_id in by_id for record_id in FIXTURE_IDS)
    assert by_id["t000"].get("summary") and by_id["t000"].get("slides")
    assert not by_id["t001"].get("summary") and by_id["t001"].get("context_note")
    assert {query: len(ids) for query, ids in corpus["fixedSearchResults"].items()} == {
        "杨燕迪": 12, "达尔豪斯": 17, "歌剧": 66, "库尔塔格": 1,
    }
    return {"corpus": corpus, "bundle": bundle, "talks": talks, "by_id": by_id, "name_to_id": name_to_id}


def _fresh_document(page, target):
    """One document load, including repeated direct routes on the same page."""
    if page.url.split("#", 1)[0] == target.split("#", 1)[0]:
        page.evaluate("target => history.replaceState(null, '', target)", target)
        response = page.reload(wait_until="domcontentloaded")
    else:
        response = page.goto(target, wait_until="domcontentloaded")
    assert response is not None and response.status == 200, f"Proceedings document did not load: {target}"
    return response


def _no_overflow(page, label):
    state = page.evaluate("""() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      panel: document.querySelector('#panel.open') ? {
        width: document.querySelector('#panel').clientWidth,
        content: document.querySelector('#panel').scrollWidth
      } : null
    })""")
    assert max(state["document"], state["body"]) <= state["viewport"] + 1, f"Horizontal overflow ({label}): {state}"
    if state["panel"]:
        assert state["panel"]["content"] <= state["panel"]["width"] + 1, f"Panel overflow ({label}): {state}"


def _assert_record(page, record):
    """Check full original fields, not only route headings or record counts."""
    panel = page.locator("#panel.open")
    panel.wait_for(state="visible")
    assert panel.locator(".panel-head h2").inner_text() == record["title"]
    assert panel.locator(".p-author").inner_text() == record["name"]
    assert panel.locator(".p-aff").inner_text() == record["affiliation"]
    for field, selector in (("thesis", ".p-thesis"), ("summary", ".p-summary"), ("abstract_full", ".p-abstract")):
        section = panel.locator(selector)
        if record.get(field):
            assert _space(section.inner_text()) == _space(record[field]), f"Changed {field}: {record['id']}"
        else:
            assert section.count() == 0, f"Invented {field}: {record['id']}"
    context = panel.locator(".p-context")
    if not record.get("summary") and record.get("context_note"):
        assert _space(context.inner_text()) == _space(record["context_note"])
    else:
        assert context.count() == 0
    expected_meta = []
    for field, label in (("day", "日期"), ("period", "时段"), ("room", "会场"),
                         ("chair", "主持"), ("group_theme", "分组"), ("seq", "序号")):
        if record.get(field):
            value = "6月" + record[field][3:] + "日" if field == "day" else record[field]
            expected_meta.append(_space(f"{label} {value}"))
    assert [_space(value) for value in panel.locator(".p-meta > span").all_inner_texts()] == expected_meta
    expected_images = record.get("slides", []) + [photo["file"] for photo in record.get("photos", [])]
    actual_images = panel.locator(".panel-body img").evaluate_all("nodes => nodes.map(node => node.getAttribute('src'))")
    assert actual_images == expected_images, f"Changed detail media/order: {record['id']}"


def _ready(page):
    page.wait_for_function("document.documentElement.dataset.proceedingsState === 'ready' && window.ProceedingsApp?.ready === true && !!window.ProceedingsReader")
    assert page.evaluate("() => window.ProceedingsReady") is True
    assert page.locator("main").get_attribute("aria-busy") == "false"
    modal_open = page.locator("#panel.open").count() != 0
    assert page.locator("header.topbar").evaluate("element => element.inert") == modal_open
    assert page.locator("nav.tabs").evaluate("element => element.inert") == modal_open


def _wait_view(page, view):
    page.wait_for_function("view => window.ProceedingsApp?.cur === view && document.querySelector('#view-' + view)?.classList.contains('active') && !document.querySelector('#panel.open') && location.hash === '#view=' + view", arg=view)
    assert page.locator(".view.active").count() == 1
    assert page.locator(f"#view-{view}").is_visible()


def _assert_view_source(page, view, fixtures):
    talks, bundle = fixtures["talks"], fixtures["bundle"]
    scope = page.locator(f"#view-{view}")
    if view == "overview":
        assert scope.locator(".lead").inner_text() == bundle["conference"]["metadata"]["overview_lead"]
        assert scope.locator(".stat .num").all_inner_texts() == ["219", "8", "132", "79", "188", "401"]
    elif view == "keynote":
        expected = [record for record in talks if record["session_type"] == "keynote"]
        assert scope.locator(".k-author").all_inner_texts() == [record["name"] for record in expected]
        assert scope.locator(".kcard h3").all_inner_texts() == [record["title"] for record in expected]
        assert scope.locator(".k-aff").all_inner_texts() == [record["affiliation"] for record in expected]
    elif view == "all":
        assert scope.locator(".c-author").all_inner_texts() == [record["name"] for record in talks]
        assert scope.locator(".card h3").all_inner_texts() == [record["title"] for record in talks]
        assert scope.locator(".c-aff").all_inner_texts() == [record["affiliation"] for record in talks]
    elif view == "schedule":
        expected = [fixtures["by_id"][record_id] for group in fixtures["corpus"]["scheduleDisplayGroups"] for record_id in group["memberIds"]]
        assert scope.locator(".st-name").all_inner_texts() == [record["name"] for record in expected]
        assert scope.locator(".st-title").all_inner_texts() == [record["title"] for record in expected]
        assert fixtures["by_id"]["t219"]["name"] not in scope.locator(".st-name").all_inner_texts()
    elif view == "photos":
        expected = [photo["file"] for photo in bundle["media"]["photo_stream"]]
        assert scope.locator("#pgrid img").evaluate_all("nodes => nodes.map(node => node.getAttribute('src'))") == expected
        assert scope.locator("#pcount").inner_text() == "共 401 张"
    elif view == "themes":
        counts = {}
        for record in talks:
            for category in record.get("categories", []):
                counts[category] = counts.get(category, 0) + 1
        categories = sorted(counts, key=lambda category: -counts[category])
        assert scope.locator(".tm-name").all_inner_texts() == categories
        assert scope.locator(".tm-count b").all_inner_texts() == [str(counts[category]) for category in categories]


class _Events:
    """Keep external network failures distinct; never suppress page errors."""
    def __init__(self, page, base_url):
        self.page = page
        self.origin = urlsplit(base_url)[:2]
        self.page_errors, self.local_http_errors, self.console_errors = [], [], []
        self.external_failures, self.local_request_failures = [], []
        self.listeners = {
            "pageerror": lambda error: self.page_errors.append(str(error)),
            "response": self.response,
            "console": self.console,
            "requestfailed": self.request_failed,
        }
        for event, callback in self.listeners.items():
            page.on(event, callback)

    def same_origin(self, url):
        return urlsplit(url)[:2] == self.origin

    def response(self, response):
        if response.status >= 400:
            target = self.local_http_errors if self.same_origin(response.url) else self.external_failures
            target.append({"url": response.url, "status": response.status})

    def console(self, message):
        if message.type != "error":
            return
        item = {"text": message.text, "url": message.location.get("url", "")}
        external = bool(urlsplit(item["url"]).netloc) and not self.same_origin(item["url"])
        if message.text.startswith("Failed to load resource:") and external:
            self.external_failures.append(item)
        elif message.text.startswith("Failed to load resource:") and "net::ERR_ABORTED" in message.text:
            self.local_request_failures.append(item)
        else:
            self.console_errors.append(item)

    def request_failed(self, request):
        target = self.local_request_failures if self.same_origin(request.url) else self.external_failures
        target.append({"url": request.url, "failure": request.failure})

    def assert_clean(self):
        assert not self.page_errors, f"Proceedings page errors: {self.page_errors}"
        assert not self.local_http_errors, f"Proceedings same-origin HTTP errors: {self.local_http_errors}"
        assert not self.console_errors, f"Proceedings console errors: {self.console_errors}"

    def close(self):
        for event, callback in self.listeners.items():
            self.page.remove_listener(event, callback)


def _pending_and_retry(page, module_url, fixtures, wait_route):
    """Hold real JSON requests, then test a recoverable HTTP-200 parse failure."""
    pattern = module_url + "data/*.json"
    held = []
    captured = []

    def hold(route):
        held.append(route)
        captured.append(route.request.url)

    page.route(pattern, hold)
    try:
        _fresh_document(page, module_url + "#poster=t219")
        deadline = time.monotonic() + 10
        while len(held) < 6 and time.monotonic() < deadline:
            page.wait_for_timeout(20)
        assert len(held) == len(captured) == 6, f"Expected six newly requested JSON files, got {captured}"
        expected_files = {"conference", "presentations", "posters", "sessions", "speakers", "media"}
        assert {Path(urlsplit(url).path).stem for url in captured} == expected_files
        assert page.locator("html").get_attribute("data-proceedings-state") == "loading"
        assert page.locator("main").get_attribute("aria-busy") == "true"
        assert page.locator("header.topbar").evaluate("element => element.inert")
        assert page.locator("nav.tabs").evaluate("element => element.inert")
        assert page.locator("#proceedings-data-notice").is_visible()
        assert page.locator("#panel.open").count() == 0
        assert page.locator(".view").evaluate_all("nodes => nodes.every(node => !node.textContent.trim())")
        page.evaluate("""() => {
          window.__proceedingsSmokeReadyResult = 'pending';
          window.ProceedingsReady.then(value => {window.__proceedingsSmokeReadyResult = value;});
          location.hash = '#presentation=t008';
        }""")
        assert page.evaluate("window.__proceedingsSmokeReadyResult") == "pending"
        while held:
            route = held.pop(0)
            name = Path(urlsplit(route.request.url).path).stem
            route.fulfill(status=200, content_type="application/json", body=json.dumps(fixtures["bundle"][name], ensure_ascii=False))
        _ready(page)
        wait_route("presentation", "t008")
        _assert_record(page, fixtures["by_id"]["t008"])
        assert page.evaluate("window.__proceedingsSmokeReadyEvents") == 1
    finally:
        page.unroute(pattern, hold)
        for route in held:
            route.abort()

    failed_file = module_url + "data/conference.json"

    def malformed(route):
        route.fulfill(status=200, content_type="application/json", body='{"intentionally_incomplete":')

    page.route(failed_file, malformed)
    try:
        _fresh_document(page, module_url + "#speaker=speaker-t219")
        page.wait_for_function("document.documentElement.dataset.proceedingsState === 'error'")
        assert page.evaluate("() => window.ProceedingsReady") is False
        retry = page.locator("#proceedings-data-retry")
        assert retry.is_visible() and retry.is_enabled()
        assert retry.evaluate("element => element === document.activeElement")
        assert page.locator("#panel.open").count() == 0
        assert page.locator("#view-all .card").count() == 0
        assert page.evaluate("window.__proceedingsSmokeReadyEvents") == 0
    finally:
        page.unroute(failed_file, malformed)
    retry.click()
    _ready(page)
    wait_route("speaker", "speaker-t219")
    assert page.evaluate("window.__proceedingsSmokeReadyEvents") == 1


def _check_all_images(page, module_url, fixtures):
    """Request each of the 589 original URLs once, disposing bodies serially."""
    for relative in fixtures["corpus"]["imagePaths"]:
        url = urljoin(module_url, relative)
        response = page.request.get(url)
        try:
            assert response.status == 200, f"Original image did not return HTTP 200: {url} ({response.status})"
            assert response.headers.get("content-type", "").lower().startswith("image/"), f"Original image returned non-image content: {url}"
            assert len(response.body()) > 0, f"Empty original image: {url}"
        finally:
            response.dispose()
    return len(fixtures["corpus"]["imagePaths"])


def _assert_reference_cards(page, fixtures, kind, record_id):
    references = fixtures["bundle"]["sessions" if kind == "session" else "speakers"]["items"]
    reference = next(item for item in references if item["id"] == record_id)
    expected = [fixtures["by_id"][item] for item in reference["recordIds"]]
    body = page.locator("#panel .panel-body")
    assert body.locator(".card").count() == len(expected)
    assert body.locator(".c-author").all_inner_texts() == [record["name"] for record in expected]
    assert body.locator(".card h3").all_inner_texts() == [record["title"] for record in expected]
    assert body.locator(".c-aff").all_inner_texts() == [record["affiliation"] for record in expected]
    for index, record in enumerate(expected):
        summary = body.locator(".card").nth(index).locator(".c-summary")
        expected_text = record.get("summary") or record.get("context_note")
        if expected_text:
            assert _space(summary.inner_text()) == _space(expected_text)
        else:
            assert summary.count() == 0
    if record_id == "speaker-t219":
        assert body.locator(".c-meta").count() == 0, "Unscheduled record acquired invented scheduling metadata"
        assert page.locator('#panel a[data-proceedings-route][href^="#session="]').count() == 0


def _assert_print(page, fixtures, kind, record_id):
    button = page.locator("#panel [data-print-record]")
    assert button.is_visible()
    page.evaluate("() => {window.__proceedingsSmokePrintCalls=0; window.print=()=>{window.__proceedingsSmokePrintCalls++;};}")
    button.click()
    assert page.evaluate("window.__proceedingsSmokePrintCalls") == 1, "Print control did not invoke print"
    page.emulate_media(media="print")
    try:
        assert page.locator("#panel").is_visible()
        assert not page.locator("header.topbar").is_visible()
        assert not page.locator("nav.tabs").is_visible()
        assert not button.is_visible()
        assert not page.locator("#panel .panel-head .close").is_visible()
        assert page.locator("#panel").evaluate("element => {const style=getComputedStyle(element);return style.position==='static' && style.maxHeight==='none' && !['auto','scroll'].includes(style.overflowY);}"), "Printed detail is clipped to the screen drawer"
        if kind in ("presentation", "poster"):
            _assert_record(page, fixtures["by_id"][record_id])
        else:
            _assert_reference_cards(page, fixtures, kind, record_id)
    finally:
        page.emulate_media(media="screen")


def _original_views_and_search(page, fixtures, go):
    go("#view=overview")
    assert page.locator("#topStat").inner_text() == "219 场 · 188 幻灯 · 401 照片"
    conference = fixtures["corpus"]["conference"]
    assert page.locator("#footNote").inner_text() == f"{conference['title']} · {conference['host']} · {conference['dates']}"
    assert page.locator("link[rel=canonical]").get_attribute("href") == "https://a15888007552-source.github.io/ad-fontes/modules/proceedings/"
    assert page.locator("#view-overview").inner_text().strip()
    for view in VIEWS[1:]:
        assert not page.locator(f"#view-{view}").inner_text().strip(), f"View rendered eagerly: {view}"
    for view in VIEWS:
        page.locator(f'#tabs button[data-tab="{view}"]').click()
        _wait_view(page, view)
        _assert_view_source(page, view, fixtures)
        _no_overflow(page, f"desktop {view}")

    for query, expected_ids in fixtures["corpus"]["fixedSearchResults"].items():
        page.locator("#search").fill(query)
        page.wait_for_function("query => window.ProceedingsApp?.filters.q === query && window.ProceedingsApp.cur === 'all'", arg=query)
        rendered_names = page.locator("#view-all .c-author").all_inner_texts()
        actual_ids = [fixtures["name_to_id"][name] for name in rendered_names]
        assert actual_ids == expected_ids, f"Changed original search results for {query}: {actual_ids}"
        assert page.locator("#view-all .card h3").all_inner_texts() == [fixtures["by_id"][record_id]["title"] for record_id in expected_ids]


def _history_and_close(page, go, wait_route):
    go("#view=all")
    # Open with a keyboard on the native title link, not an App method call.
    first = page.locator('#view-all a[data-proceedings-route][href="#presentation=t000"]').first
    first.focus()
    first.press("Enter")
    wait_route("presentation", "t000")
    page.keyboard.press("Escape")
    _wait_view(page, "all")
    assert page.locator("#panel.open").count() == 0
    assert page.evaluate("() => {const element=document.activeElement;return element && element!==document.body && !element.closest('#panel') && element.getClientRects().length>0;}"), "Closing detail left focus on hidden or unfocused content"

    first.click()
    wait_route("presentation", "t000")
    states = [("view", "all"), ("presentation", "t000")]
    for kind, record_id in (("speaker", "speaker-t000"), ("presentation", "t000"),
                            ("session", "session-t000"), ("presentation", "t001")):
        page.locator(f'#panel a[data-proceedings-route][href="#{kind}={record_id}"]').first.click()
        wait_route(kind, record_id)
        states.append((kind, record_id))
    for kind, record_id in reversed(states[:-1]):
        page.go_back()
        if kind == "view":
            _wait_view(page, record_id)
            assert page.locator("#panel.open").count() == 0
        else:
            wait_route(kind, record_id)
    for kind, record_id in states[1:]:
        page.go_forward()
        wait_route(kind, record_id)
    page.locator("#panel .panel-head .close").click()
    _wait_view(page, "all")
    assert page.locator("#panel.open").count() == 0


def run_proceedings_smoke(page, base_url):
    """Run the actual D/E reader against immutable source fixtures, without launch.

    Supply a synchronous Playwright Chromium Page from an isolated test context.
    The caller owns the context/browser and screenshots. This helper uses that
    one page throughout; copied links are reopened in fresh documents, not in
    the previous App instance. It returns structured evidence and raises on any
    assertion, page error, unexpected console error, or same-origin HTTP error.
    """
    fixtures = load_fixtures()
    module_url = urljoin(base_url.rstrip("/") + "/", "modules/proceedings/")
    events = _Events(page, module_url)
    passed, copied_links = [], []
    original_viewport = page.viewport_size

    def wait_route(kind, record_id):
        page.wait_for_function("""({kind,id}) => {
          const panel=document.querySelector('#panel.open');
          return panel?.dataset.routeKind===kind && panel?.dataset.routeId===id
            && location.hash==='#'+kind+'='+id && panel.contains(document.activeElement);
        }""", arg={"kind": kind, "id": record_id})
        assert page.locator("#panel").get_attribute("role") == "dialog"
        assert page.locator("#panel").get_attribute("aria-modal") == "true"
        assert page.locator("#panel").get_attribute("aria-hidden") == "false"
        assert page.locator("#overlay.open").is_visible()
        if kind in ("presentation", "poster"):
            _assert_record(page, fixtures["by_id"][record_id])
            assert fixtures["by_id"][record_id]["title"] in page.title()
        else:
            _assert_reference_cards(page, fixtures, kind, record_id)
            assert page.locator("#proceedings-panel-title").inner_text() in page.title()
        _no_overflow(page, f"{kind}={record_id}")

    def go(fragment):
        _fresh_document(page, module_url + fragment)
        _ready(page)
        kind, record_id = fragment[1:].split("=", 1)
        if kind == "view":
            _wait_view(page, record_id)
        else:
            wait_route(kind, record_id)

    def current_copy(fragment):
        return page.locator(f'#panel .panel-head .proceedings-entry-tools > button[data-copy-link="{fragment}"]')

    try:
        page.set_viewport_size({"width": 1440, "height": 1000})
        page.emulate_media(reduced_motion="reduce", media="screen")
        page.add_init_script("""if(location.pathname.includes('/modules/proceedings/')) {
          try {sessionStorage.setItem('proceedings-opening-seen','1');} catch (_) {}
          if (!window.__proceedingsSmokeObserverInstalled) {
            window.__proceedingsSmokeObserverInstalled = true;
            window.__proceedingsSmokeReadyEvents = 0;
            window.addEventListener('proceedings:ready', () => {window.__proceedingsSmokeReadyEvents++;});
          }
        }""")
        _original_views_and_search(page, fixtures, go)
        passed.append("Six original views, lazy first render, exact source/card/calendar/photo/theme outputs; fixed searches 12/17/66/1")
        _pending_and_retry(page, module_url, fixtures, wait_route)
        passed.append("Six truly pending JSON requests; newest requested route after data arrival; malformed HTTP-200 JSON failure and focused successful retry")

        origin = "{0.scheme}://{0.netloc}".format(urlsplit(module_url))
        page.context.grant_permissions(["clipboard-read", "clipboard-write"], origin=origin)
        route_cases = (("presentation", "t000"), ("poster", "t140"),
                       ("session", "session-t000"), ("speaker", "speaker-t000"))
        for kind, record_id in route_cases:
            fragment = f"#{kind}={record_id}"
            go(fragment)
            page.reload(wait_until="domcontentloaded")
            _ready(page)
            wait_route(kind, record_id)
            button = current_copy(fragment)
            button.focus()
            button.press("Enter")
            page.wait_for_function("document.querySelector('#proceedings-copy-status').textContent === '链接已复制。'")
            assert button.evaluate("element => element === document.activeElement && element.matches(':focus-visible')")
            copied = page.evaluate("() => navigator.clipboard.readText()")
            assert copied == module_url + fragment
            copied_links.append(copied)
            # Clear the old application by loading a different document first.
            # No route information is recovered from a prior App or history state.
            go("#view=overview")
            _fresh_document(page, copied)
            _ready(page)
            wait_route(kind, record_id)
        passed.append("All four stable route types: direct document, reload, exact real clipboard URL and copied-link fresh-document reopening")

        for record_id in FIXTURE_IDS:
            record = fixtures["by_id"][record_id]
            go(("#poster=" if record["session_type"] == "poster" else "#presentation=") + record_id)
        go("#speaker=speaker-t219")
        passed.append("Exact original names, titles, affiliations, full summaries/context/abstracts, metadata and media order for six source fixtures; unscheduled t219 preserved")

        go("#presentation=t000")
        page.evaluate("() => {Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('synthetic denied clipboard');}}});}")
        current_copy("#presentation=t000").click()
        fallback = page.locator("#proceedings-copy-value")
        fallback.wait_for(state="visible")
        assert fallback.input_value() == module_url + "#presentation=t000"
        assert fallback.evaluate("element => element === document.activeElement && element.readOnly && element.selectionStart===0 && element.selectionEnd===element.value.length")
        assert "未能自动复制" in page.locator("#proceedings-copy-status").inner_text()
        passed.append("Denied clipboard retains a focused, selected, readonly original URL")

        _history_and_close(page, go, wait_route)
        passed.append("Native keyboard/link navigation, five Back and five Forward transitions, Escape/button close and usable return focus")

        for fragment in ("#presentation=t194", "#poster=t000", "#presentation=t140",
                         "#session=session-t219", "#speaker=speaker-missing",
                         "#presentation=constructor", "#speaker=__proto__", "#presentation=%E0%A4%A"):
            _fresh_document(page, module_url + fragment)
            _ready(page)
            page.wait_for_function("document.querySelector('#proceedings-route-status')?.textContent.includes('未找到')")
            status = page.locator("#proceedings-route-status")
            assert status.is_visible() and status.get_attribute("role") == "status"
            assert status.evaluate("element => element === document.activeElement")
            assert page.locator("#panel.open").count() == 0
            assert not page.locator("header.topbar").evaluate("element => element.inert")
            status.locator('a[data-proceedings-route][href="#view=overview"]').click()
            _wait_view(page, "overview")
        passed.append("Missing, mismatched, inherited-name and malformed IDs recover through focused status plus working overview link")

        go("#presentation=t000")
        page.keyboard.press("Shift+Tab")
        assert page.locator("#panel").evaluate("element => element.contains(document.activeElement)")
        page.keyboard.press("Tab")
        assert page.locator("#panel .panel-head .close").evaluate("element => element === document.activeElement"), "Modal keyboard focus did not wrap to the first control"
        image = page.locator("#panel .gallery.slides img").first
        image.focus()
        image.press("Enter")
        page.locator("#lightbox.open").wait_for(state="visible")
        page.wait_for_function("document.querySelector('#lbImg').complete && document.querySelector('#lbImg').naturalWidth > 0")
        assert page.locator("#lbImg").get_attribute("src") == fixtures["by_id"]["t000"]["slides"][0]
        page.keyboard.press("ArrowRight")
        assert page.locator("#lbImg").get_attribute("src") == fixtures["by_id"]["t000"]["slides"][1]
        page.keyboard.press("Escape")
        assert page.locator("#lightbox.open").count() == 0
        assert page.locator("#panel.open").count() == 1
        assert image.evaluate("element => element === document.activeElement")
        passed.append("Original slide lightbox, next-image keyboard navigation and focus return without closing its source record")

        for kind, record_id in (("presentation", "t000"), ("speaker", "speaker-t219")):
            go(f"#{kind}={record_id}")
            _assert_print(page, fixtures, kind, record_id)
        passed.append("Actual print control wiring and unclipped print-media presentation/byline content with navigation hidden")

        page.set_viewport_size({"width": 390, "height": 844})
        for view in VIEWS:
            go("#view=" + view)
            _assert_view_source(page, view, fixtures)
            _no_overflow(page, "mobile " + view)
        for kind, record_id in route_cases:
            go(f"#{kind}={record_id}")
            _no_overflow(page, "mobile " + kind)
        passed.append("390x844 mobile: all six views and four route types preserve content without document/panel horizontal overflow")

        image_count = _check_all_images(page, module_url, fixtures)
        passed.append(f"All {image_count} immutable original image URLs return HTTP 200, image content type and nonempty bodies; responses disposed serially")
        page.set_viewport_size(original_viewport or {"width": 1440, "height": 1000})
        go("#presentation=t000")
        events.assert_clean()
        return {
            "passed": passed, "sourceRecordCount": len(fixtures["talks"]),
            "verifiedImageCount": image_count, "copiedLinks": copied_links,
            "pageErrors": events.page_errors, "sameOriginHttpErrors": events.local_http_errors,
            "consoleErrors": events.console_errors, "externalFailures": events.external_failures,
            "localRequestFailures": events.local_request_failures,
            "finalUrl": page.url,
        }
    finally:
        events.close()
        if not page.is_closed():
            page.emulate_media(media="screen")
            if original_viewport:
                page.set_viewport_size(original_viewport)
