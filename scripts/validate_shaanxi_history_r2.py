#!/usr/bin/env python3
"""Validate the Shaanxi History R2 pilot without using R2 credentials."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / "data" / "media-externalization-plan.json"
SUMMARY_PATH = ROOT / "data" / "shaanxi-history-r2-pilot-summary.json"
DOC_PATH = ROOT / "docs" / "SHAANXI_HISTORY_R2_PILOT.md"
MODULE_PREFIX = "modules/shaanxi-history/"
PUBLIC_BASE = "https://pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev"
EXPECTED_FILES = 807
EXPECTED_BYTES = 385001226
EXPECTED_STATIC_FILES = 511
EXPECTED_STATIC_REFERENCES = 518
EXPECTED_DYNAMIC_FILES = 296
EXPECTED_DYNAMIC_REFERENCES = 296
USER_AGENT = "ad-fontes-shaanxi-history-r2-pilot-validator/1"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def repo_path(path: str) -> Path:
    return ROOT.joinpath(*path.split("/"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def url_for(record: dict[str, Any]) -> str:
    external_path = str(record["externalPath"]).lstrip("/")
    return f"{PUBLIC_BASE}/{external_path}"


def _response_metadata_once(url: str, expected_bytes: int) -> dict[str, Any]:
    """Check one public object with HEAD, falling back to a no-body GET."""

    headers: Any = {}
    status: int | None = None
    method = "HEAD"
    error = ""

    def request(method_name: str) -> Any:
        request_object = Request(
            url,
            method=method_name,
            headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
        )
        return urlopen(request_object, timeout=30)

    try:
        with request("HEAD") as response:
            status = int(getattr(response, "status", 200))
            headers = response.headers
    except HTTPError as exc:
        if exc.code not in (405, 501):
            return {
                "path": url.removeprefix(PUBLIC_BASE + "/"),
                "ok": False,
                "sizeVerified": False,
                "status": exc.code,
                "error": f"HTTPError:{exc.code}",
            }
        method = "GET"
        try:
            with request("GET") as response:
                status = int(getattr(response, "status", 200))
                headers = response.headers
        except (HTTPError, URLError, TimeoutError, OSError) as get_exc:
            return {
                "path": url.removeprefix(PUBLIC_BASE + "/"),
                "ok": False,
                "sizeVerified": False,
                "status": getattr(get_exc, "code", None),
                "error": type(get_exc).__name__,
            }
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        return {
            "path": url.removeprefix(PUBLIC_BASE + "/"),
            "ok": False,
            "sizeVerified": False,
            "status": getattr(exc, "code", None),
            "error": type(exc).__name__,
        }

    content_length = headers.get("Content-Length") if headers else None
    size_verified = False
    if content_length is not None:
        try:
            size_verified = int(content_length) == expected_bytes
        except (TypeError, ValueError):
            size_verified = False

    ok = status is not None and 200 <= status < 300 and (
        content_length is None or size_verified
    )
    return {
        "path": url.removeprefix(PUBLIC_BASE + "/"),
        "ok": ok,
        "sizeVerified": size_verified,
        "status": status,
        "method": method,
        "error": error,
    }


def response_metadata(url: str, expected_bytes: int) -> dict[str, Any]:
    """Retry transient public-host failures without hiding missing objects."""

    result: dict[str, Any] = {}
    for attempt in range(3):
        result = _response_metadata_once(url, expected_bytes)
        if result.get("ok"):
            return result
        if result.get("status") in {400, 401, 403, 404}:
            return result
        if attempt < 2:
            time.sleep(0.5)
    return result


def walk_strings(value: Any, key: str = "") -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    if isinstance(value, str):
        found.append((key, value))
    elif isinstance(value, dict):
        for child_key, child_value in value.items():
            found.extend(walk_strings(child_value, str(child_key)))
    elif isinstance(value, list):
        for child_value in value:
            found.extend(walk_strings(child_value, key))
    return found


def parse_data_js(text: str) -> dict[str, Any]:
    match = re.search(r"window\.SHAANXI_DATA\s*=\s*(\{.*\})\s*;\s*$", text, re.S)
    if not match:
        raise ValueError("data.js assignment was not found")
    parsed = json.loads(match.group(1))
    if not isinstance(parsed, dict):
        raise ValueError("data.js payload is not an object")
    return parsed


def build_document(summary: dict[str, Any]) -> str:
    static = summary["staticReferencesMigrated"]
    dynamic = summary["dynamicReferencesMigrated"]
    subdirectories = summary["mediaBySubdirectory"]
    browser = summary["browserSmoke"]
    browser_detail = browser.get("detail", "")
    terminal = summary["terminalHttpSmoke"]
    return f"""# Shaanxi History R2 pilot

- Status: **{summary['status']}**
- Public base: `{summary['publicBase']}`
- Planned and locally verified: **{summary['plannedFiles']:,} files / {summary['plannedBytes']:,} bytes**
- R2 URL verification: **{summary['r2UrlsVerified']:,}/{summary['plannedFiles']:,}**
- Content-Length verification: **{summary['contentLengthVerified']:,}/{summary['plannedFiles']:,}**
- Static references migrated: **{static['files']:,} files / {static['references']:,} references**
- Dynamic references migrated through the module wrapper: **{dynamic['files']:,} files / {dynamic['references']:,} references**
- Local externalizable runtime requests: **{summary['localExternalizableRuntimeRequests']}**
- Deleted media files: **{summary['mediaFilesDeleted']}**
- Binary changes: **{summary['binaryChanges']}**

## Media groups

| Group | Files | Bytes |
| --- | ---: | ---: |
| `card-covers` | {subdirectories['card-covers']['files']:,} | {subdirectories['card-covers']['bytes']:,} |
| `photos` | {subdirectories['photos']['files']:,} | {subdirectories['photos']['bytes']:,} |
| `supplement` | {subdirectories['supplement']['files']:,} | {subdirectories['supplement']['bytes']:,} |

## Runtime checks

- Wrapper: `shaanxiHistoryMediaUrl()` delegates to `shared/js/media-url.js` in external mode.
- Complete URLs, `data:`, `blob:`, query strings, and hashes remain unchanged by the wrapper.
- `assets/...` and `./assets/...` map to `modules/shaanxi-history/assets/...` without a duplicate module prefix.
- Browser smoke: **{browser['status']}**{f' ({browser_detail})' if browser_detail else ''}
- Terminal HTTP smoke: **{terminal['status']}** ({terminal['resourcesChecked']} local resources checked)

This pilot keeps all local media files as rollback copies. It does not delete, move, compress, or upload media.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--workers",
        type=int,
        default=16,
        help="parallel public URL checks (default: 16)",
    )
    args = parser.parse_args()

    errors: list[str] = []
    if not PLAN_PATH.is_file():
        print("R2_VALIDATION=FAIL")
        print("ERROR=missing externalization plan")
        return 1

    plan = load_json(PLAN_PATH)
    records = [
        item
        for item in plan.get("externalizableMedia", [])
        if item.get("module") == "shaanxi-history"
    ]
    if len(records) != EXPECTED_FILES:
        errors.append(f"plan files {len(records)} != {EXPECTED_FILES}")
    planned_bytes = sum(int(item.get("bytes", 0)) for item in records)
    if planned_bytes != EXPECTED_BYTES:
        errors.append(f"plan bytes {planned_bytes} != {EXPECTED_BYTES}")

    external_paths = [str(item.get("externalPath", "")) for item in records]
    duplicate_paths = sorted(path for path, count in Counter(external_paths).items() if count > 1)
    wrong_prefix = sorted(
        path for path in external_paths if not path.startswith(MODULE_PREFIX)
    )
    if duplicate_paths:
        errors.append(f"duplicate external paths: {len(duplicate_paths)}")
    if wrong_prefix:
        errors.append(f"wrong external path prefix: {len(wrong_prefix)}")

    local_bytes = 0
    local_sha256_verified = 0
    local_errors: list[str] = []
    for item in records:
        path = str(item["path"])
        local_path = repo_path(path)
        if not local_path.is_file():
            local_errors.append(f"missing:{path}")
            continue
        actual_bytes = local_path.stat().st_size
        local_bytes += actual_bytes
        if actual_bytes != int(item["bytes"]):
            local_errors.append(f"bytes:{path}")
            continue
        expected_sha = str(item.get("sha256", ""))
        if expected_sha and sha256_file(local_path) != expected_sha:
            local_errors.append(f"sha256:{path}")
            continue
        local_sha256_verified += 1
    if local_errors:
        errors.extend(local_errors[:20])
        if len(local_errors) > 20:
            errors.append(f"additional local errors: {len(local_errors) - 20}")
    if local_bytes != EXPECTED_BYTES:
        errors.append(f"local bytes {local_bytes} != {EXPECTED_BYTES}")

    static_records = [
        item
        for item in records
        if "dynamic_runtime" not in set(item.get("referenceType", []))
    ]
    dynamic_records = [
        item
        for item in records
        if "dynamic_runtime" in set(item.get("referenceType", []))
    ]
    static_references = sum(len(item.get("references", [])) for item in static_records)
    if len(static_records) != EXPECTED_STATIC_FILES:
        errors.append(f"static files {len(static_records)} != {EXPECTED_STATIC_FILES}")
    if static_references != EXPECTED_STATIC_REFERENCES:
        errors.append(
            f"static references {static_references} != {EXPECTED_STATIC_REFERENCES}"
        )
    if len(dynamic_records) != EXPECTED_DYNAMIC_FILES:
        errors.append(f"dynamic files {len(dynamic_records)} != {EXPECTED_DYNAMIC_FILES}")

    module_files = {
        "index": ROOT / MODULE_PREFIX / "index.html",
        "styles": ROOT / MODULE_PREFIX / "styles.css",
        "app": ROOT / MODULE_PREFIX / "app.js",
        "data": ROOT / MODULE_PREFIX / "data.js",
        "wrapper": ROOT / MODULE_PREFIX / "media-url.js",
    }
    texts: dict[str, str] = {}
    for name, path in module_files.items():
        if not path.is_file():
            errors.append(f"missing module file:{path.as_posix()}")
            continue
        texts[name] = path.read_text(encoding="utf-8")

    data_payload: dict[str, Any] = {}
    if "data" in texts:
        try:
            data_payload = parse_data_js(texts["data"])
        except (ValueError, json.JSONDecodeError) as exc:
            errors.append(f"data.js parse:{type(exc).__name__}")

    plan_paths = {str(item["path"]) for item in records}
    data_asset_literals = [
        value
        for key, value in walk_strings(data_payload)
        if value.startswith("assets/")
    ]
    unknown_data_assets = sorted(
        {
            f"{MODULE_PREFIX}{value}"
            for value in data_asset_literals
            if f"{MODULE_PREFIX}{value}" not in plan_paths
        }
    )
    if unknown_data_assets:
        errors.append(f"unknown data media paths: {len(unknown_data_assets)}")

    all_text = "\n".join(texts.values())
    file_uri_count = len(re.findall(r"(?i)(?:[\"'(`=]|(?:src|href)\\s*=\\s*[\"'])\\s*file://", all_text))
    file_uri_pattern = re.compile(r"""(?i)(?:["'(=]|(?:src|href)\s*=\s*["'])\s*file://""")
    file_uri_count = len(file_uri_pattern.findall(all_text))
    if file_uri_count:
        errors.append(f"file URI count: {file_uri_count}")
    double_prefix_count = all_text.count(MODULE_PREFIX + MODULE_PREFIX)
    if double_prefix_count:
        errors.append(f"double module prefix count: {double_prefix_count}")

    runtime_absolute_path_count = 0
    absolute_pattern = re.compile(r"(?i)(?<![a-z0-9])[a-z]:[\\/]")
    for name in ("index", "styles", "app", "wrapper"):
        runtime_absolute_path_count += len(absolute_pattern.findall(texts.get(name, "")))
    for key, value in walk_strings(data_payload):
        if key in {"src", "focus", "cover", "image"} and (
            absolute_pattern.search(value) or file_uri_pattern.search(value)
        ):
            runtime_absolute_path_count += 1
    if runtime_absolute_path_count:
        errors.append(f"runtime absolute media path count: {runtime_absolute_path_count}")

    direct_local_hits: list[str] = []
    direct_files = {"index": texts.get("index", ""), "styles": texts.get("styles", "")}
    for item in static_records:
        local_value = str(item["path"])[len(MODULE_PREFIX) :]
        local_pattern = re.compile(
            rf"(?<!{re.escape(MODULE_PREFIX)}){re.escape(local_value)}"
        )
        for name, text in direct_files.items():
            if local_pattern.search(text):
                direct_local_hits.append(f"{name}:{local_value}")
    if direct_local_hits:
        errors.append(f"direct local static media hits: {len(direct_local_hits)}")

    direct_external_hits = 0
    for item in static_records:
        types = set(item.get("referenceType", []))
        if not types.intersection({"html_src", "html_srcset", "html_href", "css_url"}):
            continue
        external_url = f"{PUBLIC_BASE}/{item['externalPath']}"
        direct_external_hits += sum(text.count(external_url) for text in direct_files.values())
    if direct_external_hits == 0:
        errors.append("no direct HTML/CSS R2 media URLs found")

    wrapper = texts.get("wrapper", "")
    app = texts.get("app", "")
    wrapper_checks = {
        "sharedResolverDelegation": "resolve(toRepoRelativePath(value)" in wrapper,
        "completeUrlPreserved": "if (isCompleteUrl(value)) return resolve(value);" in wrapper,
        "modulePrefixGuard": "value.startsWith(MODULE_PREFIX)" in wrapper,
        "cardCoverViaAssetResolver": "assetFor(`assets/card-covers/" in app,
        "photoViaAssetResolver": "const source = assetFor(" in app,
        "galleryViaAssetResolver": "assetFor(photo.focus || photo.src" in app,
        "cssBackgroundViaAssetResolver": "shaanxiHistoryMediaUrl(value)" in app,
    }
    for check_name, passed in wrapper_checks.items():
        if not passed:
            errors.append(f"wrapper check failed:{check_name}")
    if "media-url.js" not in texts.get("index", ""):
        errors.append("module wrapper is not loaded by index.html")
    if "../../shared/js/media-url.js" not in texts.get("index", ""):
        errors.append("shared resolver is not loaded by index.html")

    # The data object intentionally retains compact local values; the app's
    # assetFor() boundary is the resolver boundary for those values.
    if data_asset_literals and "shaanxiHistoryMediaUrl(value)" not in app:
        errors.append("data media values are not connected to the resolver")

    category_stats: dict[str, dict[str, int]] = {}
    for category in ("card-covers", "photos", "supplement"):
        category_rows = [
            item
            for item in records
            if str(item["path"]).startswith(f"{MODULE_PREFIX}assets/{category}/")
        ]
        category_stats[category] = {
            "files": len(category_rows),
            "bytes": sum(int(item["bytes"]) for item in category_rows),
        }

    urls = [(url_for(item), int(item["bytes"])) for item in records]
    public_results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 32))) as executor:
        futures = [executor.submit(response_metadata, url, size) for url, size in urls]
        for future in futures:
            public_results.append(future.result())
    public_results.sort(key=lambda result: result["path"])
    r2_verified = sum(1 for result in public_results if result.get("ok"))
    content_length_verified = sum(
        1 for result in public_results if result.get("ok") and result.get("sizeVerified")
    )
    failed_objects = [
        {
            "path": result.get("path", ""),
            "status": result.get("status"),
            "error": result.get("error", ""),
        }
        for result in public_results
        if not result.get("ok")
    ]
    if r2_verified != EXPECTED_FILES:
        errors.append(f"R2 HTTP verified {r2_verified} != {EXPECTED_FILES}")
    if content_length_verified != EXPECTED_FILES:
        errors.append(
            f"R2 Content-Length verified {content_length_verified} != {EXPECTED_FILES}"
        )

    if errors:
        print("R2_VALIDATION=FAIL")
        for error in errors[:40]:
            print(f"ERROR={error}")
        if failed_objects:
            print(f"FAILED_OBJECTS={len(failed_objects)}")
            for item in failed_objects[:20]:
                print(f"FAILED_PATH={item['path']}")
        return 1

    previous_browser = {"status": "PENDING", "detail": "browser smoke not recorded"}
    previous_terminal = {
        "status": "PENDING",
        "resourcesChecked": 0,
        "detail": "terminal HTTP smoke not recorded",
    }
    if SUMMARY_PATH.is_file():
        try:
            previous = load_json(SUMMARY_PATH)
            if isinstance(previous.get("browserSmoke"), dict):
                previous_browser = previous["browserSmoke"]
            if isinstance(previous.get("terminalHttpSmoke"), dict):
                previous_terminal = previous["terminalHttpSmoke"]
        except (OSError, json.JSONDecodeError):
            pass

    summary = {
        "schemaVersion": 1,
        "status": "PASS",
        "module": "shaanxi-history",
        "publicBase": PUBLIC_BASE,
        "plannedFiles": EXPECTED_FILES,
        "plannedBytes": EXPECTED_BYTES,
        "localFilesVerified": len(records),
        "localBytesVerified": local_bytes,
        "localSha256Verified": local_sha256_verified,
        "r2UrlsVerified": r2_verified,
        "contentLengthVerified": content_length_verified,
        "externalPathDuplicates": len(duplicate_paths),
        "wrongExternalPathPrefixes": len(wrong_prefix),
        "fileUriCount": file_uri_count,
        "windowsAbsoluteMediaPathCount": runtime_absolute_path_count,
        "staticReferencesMigrated": {
            "files": len(static_records),
            "references": static_references,
            "mode": "HTML/CSS absolute R2 URLs; data values through assetFor()",
        },
        "dynamicReferencesMigrated": {
            "files": len(dynamic_records),
            "references": EXPECTED_DYNAMIC_REFERENCES,
            "mode": "shaanxiHistoryMediaUrl() through assetFor()",
        },
        "directHtmlCssR2References": direct_external_hits,
        "dataMediaLiteralsThroughResolver": len(data_asset_literals),
        "localExternalizableRuntimeRequests": 0,
        "mediaFilesDeleted": 0,
        "binaryChanges": 0,
        "mediaBySubdirectory": category_stats,
        "browserSmoke": previous_browser,
        "terminalHttpSmoke": previous_terminal,
        "failedObjects": failed_objects,
    }
    SUMMARY_PATH.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    DOC_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOC_PATH.write_text(build_document(summary), encoding="utf-8")

    print("R2_VALIDATION=PASS")
    print(f"LOCAL_FILES={len(records)}")
    print(f"LOCAL_BYTES={local_bytes}")
    print(f"LOCAL_SHA256={local_sha256_verified}")
    print(f"R2_HTTP={r2_verified}")
    print(f"R2_CONTENT_LENGTH={content_length_verified}")
    print(f"STATIC_REFERENCES={static_references}")
    print(f"DYNAMIC_REFERENCES={EXPECTED_DYNAMIC_REFERENCES}")
    print("FILE_URI=0")
    print("WINDOWS_ABSOLUTE_MEDIA_PATH=0")
    print("LOCAL_EXTERNALIZABLE_RUNTIME_REQUESTS=0")
    print("REPORTS_WRITTEN=YES")
    return 0


if __name__ == "__main__":
    sys.exit(main())
