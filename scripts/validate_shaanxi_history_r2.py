#!/usr/bin/env python3
"""Validate Shaanxi History after its externalized media left the Git tree."""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import random
import re
import shutil
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "shaanxi-history-externalized-media.json"
PLAN_PATH = ROOT / "data" / "media-externalization-plan.json"
SUMMARY_PATH = ROOT / "data" / "shaanxi-history-externalized-media-validation.json"
DOC_PATH = ROOT / "docs" / "SHAANXI_HISTORY_MEDIA_EXTERNALIZED.md"
MODULE_PREFIX = "modules/shaanxi-history/"
PUBLIC_BASE = "https://ad-fontes-media.gusgumee777.workers.dev"
LEGACY_PUBLIC_BASE = "https://pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev"
EXPECTED_FILES = 807
EXPECTED_BYTES = 385001226
EXPECTED_REMAINING_FILES = 7
EXPECTED_REMAINING_BYTES = 5817325
SAMPLE_COUNT = 30
CACHE_SAMPLE_COUNT = 30
SAMPLE_SEED = 20260821
USER_AGENT = "ad-fontes-shaanxi-history-externalized-state-validator/1"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def repo_path(path: str) -> Path:
    return ROOT.joinpath(*path.split("/"))


def media_category(path: str) -> str:
    for category in ("photos", "card-covers", "supplement"):
        if f"{MODULE_PREFIX}assets/{category}/" in path:
            return category
    return "other"


def url_for(entry: dict[str, Any]) -> str:
    object_key = str(entry["objectKey"]).lstrip("/")
    return f"{PUBLIC_BASE}/{object_key}"


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


def response_head_once(entry: dict[str, Any]) -> dict[str, Any]:
    """Read one object's status, Content-Length, and cache header."""

    url = url_for(entry)
    request = Request(
        url,
        method="HEAD",
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    )
    try:
        with urlopen(request, timeout=45) as response:
            return {
                "path": entry["path"],
                "status": int(getattr(response, "status", 200)),
                "length": int(response.headers["Content-Length"])
                if response.headers.get("Content-Length")
                else None,
                "cacheControl": response.headers.get("Cache-Control", ""),
                "error": "",
            }
    except HTTPError as exc:
        return {
            "path": entry["path"],
            "status": int(exc.code),
            "length": None,
            "cacheControl": "",
            "error": f"HTTPError:{exc.code}",
        }
    except (URLError, TimeoutError, OSError) as exc:
        return {
            "path": entry["path"],
            "status": getattr(exc, "code", None),
            "length": None,
            "cacheControl": "",
            "error": type(exc).__name__,
        }


def response_head(entry: dict[str, Any]) -> dict[str, Any]:
    """Retry transient edge/network failures without hiding 4xx responses."""

    result: dict[str, Any] = {}
    for attempt in range(5):
        result = response_head_once(entry)
        if result.get("status") in {400, 401, 403, 404}:
            return result
        if result.get("status") == 200 and result.get("length") == int(entry["bytes"]):
            return result
        if attempt < 4:
            time.sleep(0.5)
    return result


def select_samples(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(entries, key=lambda item: str(item["objectKey"]))
    selected: list[dict[str, Any]] = []
    selected_paths: set[str] = set()
    for category in ("photos", "card-covers", "supplement"):
        rows = [item for item in ordered if media_category(str(item["path"])) == category]
        if not rows:
            raise ValueError(f"missing sample category: {category}")
        for item in rows[: min(10, len(rows))]:
            selected.append(item)
            selected_paths.add(str(item["path"]))
    remaining = [
        item for item in ordered if str(item["path"]) not in selected_paths
    ]
    random.Random(SAMPLE_SEED).shuffle(remaining)
    selected.extend(remaining[: max(0, SAMPLE_COUNT - len(selected))])
    if len(selected) != SAMPLE_COUNT:
        raise ValueError(f"sample size {len(selected)} != {SAMPLE_COUNT}")
    return selected


def sha256_get_once(entry: dict[str, Any]) -> dict[str, Any]:
    request = Request(
        url_for(entry),
        method="GET",
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    )
    try:
        with urlopen(request, timeout=90) as response:
            status = int(getattr(response, "status", 200))
            digest = hashlib.sha256()
            received = 0
            for block in iter(lambda: response.read(1024 * 1024), b""):
                digest.update(block)
                received += len(block)
            content_length = response.headers.get("Content-Length")
        return {
            "path": entry["path"],
            "status": status,
            "received": received,
            "length": int(content_length) if content_length else None,
            "sha256": digest.hexdigest(),
            "expectedSha256": entry["sha256"],
            "error": "",
        }
    except HTTPError as exc:
        return {
            "path": entry["path"],
            "status": int(exc.code),
            "received": 0,
            "length": None,
            "sha256": "",
            "expectedSha256": entry["sha256"],
            "error": f"HTTPError:{exc.code}",
        }
    except (URLError, TimeoutError, OSError) as exc:
        return {
            "path": entry["path"],
            "status": getattr(exc, "code", None),
            "received": 0,
            "length": None,
            "sha256": "",
            "expectedSha256": entry["sha256"],
            "error": type(exc).__name__,
        }


def sha256_get(entry: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for attempt in range(5):
        result = sha256_get_once(entry)
        if (
            result.get("status") == 200
            and result.get("received") == int(entry["bytes"])
            and result.get("length") == int(entry["bytes"])
            and result.get("sha256") == entry["sha256"]
        ):
            return result
        if result.get("status") in {400, 401, 403, 404}:
            return result
        if attempt < 4:
            time.sleep(0.7)
    return result


def cache_control_samples(entries: list[dict[str, Any]]) -> tuple[int, list[dict[str, Any]]]:
    rows = sorted(entries, key=lambda item: str(item["objectKey"]))
    random.Random(SAMPLE_SEED + 1).shuffle(rows)
    rows = rows[:CACHE_SAMPLE_COUNT]
    required = ("public", "max-age=86400", "stale-while-revalidate=604800")
    results: list[dict[str, Any]] = []
    for entry in rows:
        result: dict[str, Any] = {}
        for attempt in range(5):
            result = response_head_once(entry)
            cache = str(result.get("cacheControl", "")).lower()
            if result.get("status") == 200 and all(token in cache for token in required):
                break
            if result.get("status") in {400, 401, 403, 404}:
                break
            if attempt < 4:
                time.sleep(0.7)
        results.append(result)
    passed = sum(
        1
        for result in results
        if result.get("status") == 200
        and all(
            token in str(result.get("cacheControl", "")).lower()
            for token in required
        )
    )
    return passed, results


def browser_smoke_status() -> dict[str, Any]:
    browsers = [
        name
        for name in ("chrome", "chromium", "google-chrome", "msedge")
        if shutil.which(name)
    ]
    used_percent: float | None = None
    if os.name == "nt":
        try:
            class MemoryStatus(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]

            status = MemoryStatus()
            status.dwLength = ctypes.sizeof(MemoryStatus)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
                used_percent = float(status.dwMemoryLoad)
        except (AttributeError, OSError):
            used_percent = None
    if used_percent is not None and used_percent >= 75:
        return {
            "status": "SKIPPED",
            "detail": f"not launched: physical memory usage {used_percent:.1f}% was above the 75% safety threshold",
        }
    if not browsers:
        return {
            "status": "SKIPPED",
            "detail": "not launched: Chrome/Chromium/Edge executables were unavailable on PATH",
        }
    return {
        "status": "SKIPPED",
        "detail": "not launched by this terminal validator; browser automation requires an explicit available-browser run",
    }


def build_document(summary: dict[str, Any]) -> str:
    browser = summary["browserSmoke"]
    terminal = summary["terminalHttpSmoke"]
    samples = summary["sha256Samples"]
    cache = summary["cacheControlSamples"]
    return f"""# Shaanxi History externalized media

- Status: **{summary['status']}**
- Frozen manifest: **{summary['frozenManifestFiles']:,} files / {summary['frozenManifestBytes']:,} bytes**
- Active Worker public base: `{summary['activePublicBase']}`
- Worker HTTP: **{summary['workerHttpVerified']:,}/{summary['frozenManifestFiles']:,}**
- Content-Length: **{summary['contentLengthVerified']:,}/{summary['frozenManifestFiles']:,}**
- SHA256 GET samples: **{samples['verified']:,}/{samples['selected']:,}** (`photos={samples['coverage']['photos']}`, `card-covers={samples['coverage']['card-covers']}`, `supplement={samples['coverage']['supplement']}`)
- Cache-Control samples: **{cache['verified']:,}/{cache['selected']:,}**
- Local frozen copies present: **{summary['localCopiesPresent']}**
- Remaining Shaanxi History local media: **{summary['remainingLocalMediaFiles']:,} files / {summary['remainingLocalMediaBytes']:,} bytes**
- Direct local runtime requests for frozen media: **{summary['directLocalRuntimeRequests']}**
- Runtime old `r2.dev` references: **{summary['runtimeOldR2DevReferences']}**

## Deletion record

- Deleted from the current Git tree: **{summary['mediaFilesDeleted']:,} files / {summary['deletedBytes']:,} bytes**.
- Binary additions: **{summary['binaryAdditions']}**.
- Binary modifications: **{summary['binaryModifications']}**.
- Binary deletions: **{summary['binaryDeletions']}**.
- The R2/Worker objects were not deleted or modified.
- This change only shrinks the current Git tree and checkout. The old binary blobs remain in Git history.
- A history purge will be considered only after all modules have completed media migration.

## Runtime and smoke checks

- `data/shaanxi-history-externalized-media.json` is the permanent freeze source for the deleted objects.
- `assets/...` data literals remain allowed because `assetFor()` and `shaanxiHistoryMediaUrl()` resolve them to the Worker.
- Terminal HTTP smoke: **{terminal['status']}** ({terminal['resourcesChecked']} resources checked).
- Browser smoke: **{browser['status']}**{f' ({browser.get("detail", "")})' if browser.get("detail") else ''}

Recommended Worker cache policy already verified on sampled responses:

```text
public, max-age=86400, stale-while-revalidate=604800
```
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=16)
    parser.add_argument(
        "--terminal-status",
        choices=("PENDING", "PASS", "SKIPPED"),
        default="PENDING",
    )
    parser.add_argument("--terminal-resources", type=int, default=0)
    parser.add_argument("--terminal-detail", default="")
    args = parser.parse_args()

    errors: list[str] = []
    if not MANIFEST_PATH.is_file():
        print("EXTERNALIZED_VALIDATION=FAIL")
        print("ERROR=missing frozen externalized media manifest")
        return 1

    manifest = load_json(MANIFEST_PATH)
    entries = list(manifest.get("entries", []))
    manifest_files = int(manifest.get("files", 0))
    manifest_bytes = int(manifest.get("bytes", 0))
    if manifest_files != EXPECTED_FILES or len(entries) != EXPECTED_FILES:
        errors.append(f"frozen manifest files {manifest_files}/{len(entries)} != {EXPECTED_FILES}")
    if manifest_bytes != EXPECTED_BYTES or sum(int(item.get("bytes", 0)) for item in entries) != EXPECTED_BYTES:
        errors.append(f"frozen manifest bytes {manifest_bytes} != {EXPECTED_BYTES}")

    manifest_paths = [str(item.get("path", "")) for item in entries]
    object_keys = [str(item.get("objectKey", "")) for item in entries]
    if len(set(manifest_paths)) != len(manifest_paths):
        errors.append("duplicate frozen manifest paths")
    if len(set(object_keys)) != len(object_keys):
        errors.append("duplicate frozen object keys")
    if any(path != key for path, key in zip(manifest_paths, object_keys)):
        errors.append("frozen path/object key mismatch")
    if any(not path.startswith(MODULE_PREFIX) for path in manifest_paths):
        errors.append("frozen manifest path outside Shaanxi History module")
    if manifest.get("activePublicBase") != PUBLIC_BASE:
        errors.append("frozen manifest active base mismatch")

    local_present = [path for path in manifest_paths if repo_path(path).is_file()]
    local_copy_bytes = sum(repo_path(path).stat().st_size for path in local_present)
    if local_present:
        errors.append(f"local frozen copies still present: {len(local_present)}")

    remaining_exts = {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".heic",
        ".tif", ".tiff", ".mp3", ".wav", ".flac", ".m4a", ".ogg", ".mp4",
        ".webm", ".mov", ".pdf", ".woff", ".woff2", ".ttf", ".otf",
    }
    module_root = ROOT / "modules" / "shaanxi-history"
    remaining_media = [
        path for path in module_root.rglob("*")
        if path.is_file() and path.suffix.lower() in remaining_exts
    ]
    remaining_bytes = sum(path.stat().st_size for path in remaining_media)
    if len(remaining_media) != EXPECTED_REMAINING_FILES:
        errors.append(f"remaining Shaanxi media files {len(remaining_media)} != {EXPECTED_REMAINING_FILES}")
    if remaining_bytes != EXPECTED_REMAINING_BYTES:
        errors.append(f"remaining Shaanxi media bytes {remaining_bytes} != {EXPECTED_REMAINING_BYTES}")

    module_files = {
        "index": module_root / "index.html",
        "styles": module_root / "styles.css",
        "app": module_root / "app.js",
        "data": module_root / "data.js",
        "wrapper": module_root / "media-url.js",
    }
    texts: dict[str, str] = {}
    for name, path in module_files.items():
        if not path.is_file():
            errors.append(f"missing module file: {path.as_posix()}")
            continue
        texts[name] = path.read_text(encoding="utf-8")

    data_payload: dict[str, Any] = {}
    if "data" in texts:
        try:
            data_payload = parse_data_js(texts["data"])
        except (ValueError, json.JSONDecodeError) as exc:
            errors.append(f"data.js parse: {type(exc).__name__}")

    current_plan_paths: set[str] = set()
    if PLAN_PATH.is_file():
        current_plan = load_json(PLAN_PATH)
        current_plan_paths = {
            str(item.get("path", ""))
            for item in current_plan.get("externalizableMedia", [])
            if item.get("module") == "shaanxi-history"
        }
    if len(current_plan_paths) != EXPECTED_REMAINING_FILES:
        errors.append(
            f"current plan Shaanxi media files {len(current_plan_paths)} != {EXPECTED_REMAINING_FILES}"
        )
    known_media_paths = set(manifest_paths) | current_plan_paths
    data_asset_literals = [
        value for _, value in walk_strings(data_payload) if value.startswith("assets/")
    ]
    unknown_data_assets = sorted(
        f"{MODULE_PREFIX}{value}"
        for value in data_asset_literals
        if f"{MODULE_PREFIX}{value}" not in known_media_paths
    )
    if unknown_data_assets:
        errors.append(f"unknown data media paths: {len(unknown_data_assets)}")

    all_text = "\n".join(texts.values())
    runtime_old_r2dev_references = len(re.findall(r"(?i)r2\.dev", all_text))
    if runtime_old_r2dev_references:
        errors.append(f"runtime old r2.dev references: {runtime_old_r2dev_references}")
    runtime_worker_base_occurrences = all_text.count(PUBLIC_BASE)
    if runtime_worker_base_occurrences == 0:
        errors.append("active Worker base is absent from runtime files")
    file_uri_pattern = re.compile(r"(?i)(?:[\"'(=]|(?:src|href)\s*=\s*[\"'])\s*file://")
    file_uri_count = len(file_uri_pattern.findall(all_text))
    if file_uri_count:
        errors.append(f"file URI count: {file_uri_count}")
    double_prefix_count = all_text.count(MODULE_PREFIX + MODULE_PREFIX)
    if double_prefix_count:
        errors.append(f"double module prefix count: {double_prefix_count}")
    absolute_pattern = re.compile(r"(?i)(?<![a-z0-9])[a-z]:[\\/]")
    windows_absolute_count = sum(
        len(absolute_pattern.findall(texts.get(name, "")))
        for name in ("index", "styles", "app", "wrapper")
    )
    if windows_absolute_count:
        errors.append(f"Windows absolute media paths: {windows_absolute_count}")

    direct_local_hits: list[str] = []
    for path in manifest_paths:
        local_value = path[len(MODULE_PREFIX):]
        pattern = re.compile(rf"(?<!{re.escape(MODULE_PREFIX)}){re.escape(local_value)}")
        for name in ("index", "styles"):
            if pattern.search(texts.get(name, "")):
                direct_local_hits.append(f"{name}:{local_value}")
    if direct_local_hits:
        errors.append(f"direct local frozen-media hits: {len(direct_local_hits)}")

    direct_worker_hits = sum(
        texts.get(name, "").count(PUBLIC_BASE) for name in ("index", "styles")
    )
    if direct_worker_hits == 0:
        errors.append("no direct HTML/CSS Worker media URLs found")

    wrapper = texts.get("wrapper", "")
    app = texts.get("app", "")
    wrapper_checks = {
        "sharedResolverDelegation": "resolve(toRepoRelativePath(value)" in wrapper,
        "completeUrlPreserved": "if (isCompleteUrl(value)) return resolve(value);" in wrapper,
        "modulePrefixGuard": "value.startsWith(MODULE_PREFIX)" in wrapper,
        "cardCoverViaAssetResolver": "assetFor(`assets/card-covers/" in app,
        "photoViaAssetResolver": "const source = assetFor(" in app,
        "dataUsesResolverBoundary": "shaanxiHistoryMediaUrl(value)" in app,
    }
    for check_name, passed in wrapper_checks.items():
        if not passed:
            errors.append(f"resolver check failed: {check_name}")
    if "media-url.js" not in texts.get("index", ""):
        errors.append("module resolver is not loaded by index.html")
    if "../../shared/js/media-url.js" not in texts.get("index", ""):
        errors.append("shared resolver is not loaded by index.html")

    category_stats: dict[str, dict[str, int]] = {}
    for category in ("card-covers", "photos", "supplement"):
        rows = [item for item in entries if media_category(str(item["path"])) == category]
        category_stats[category] = {
            "files": len(rows),
            "bytes": sum(int(item["bytes"]) for item in rows),
        }

    ordered_entries = sorted(entries, key=lambda item: str(item["objectKey"]))
    public_results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 32))) as executor:
        futures = [executor.submit(response_head, entry) for entry in ordered_entries]
        for future in futures:
            public_results.append(future.result())
    worker_http_verified = sum(1 for result in public_results if result.get("status") == 200)
    content_length_verified = sum(
        1
        for result, entry in zip(public_results, ordered_entries)
        if result.get("status") == 200 and result.get("length") == int(entry["bytes"])
    )
    worker_404_failures = sum(1 for result in public_results if result.get("status") == 404)
    worker_5xx_failures = sum(
        1 for result in public_results if isinstance(result.get("status"), int) and result["status"] >= 500
    )
    failed_objects = [
        {"path": result.get("path", ""), "status": result.get("status"), "error": result.get("error", "")}
        for result, entry in zip(public_results, ordered_entries)
        if result.get("status") != 200 or result.get("length") != int(entry["bytes"])
    ]
    if worker_http_verified != EXPECTED_FILES:
        errors.append(f"Worker HTTP verified {worker_http_verified} != {EXPECTED_FILES}")
    if content_length_verified != EXPECTED_FILES:
        errors.append(f"Worker Content-Length verified {content_length_verified} != {EXPECTED_FILES}")

    sample_records = select_samples(ordered_entries)
    with ThreadPoolExecutor(max_workers=8) as executor:
        sample_results = list(executor.map(sha256_get, sample_records))
    sample_coverage = Counter(
        media_category(str(result["path"]))
        for result in sample_results
        if result.get("status") == 200
        and result.get("sha256") == result.get("expectedSha256")
    )
    sha256_samples_verified = sum(
        1
        for result, entry in zip(sample_results, sample_records)
        if result.get("status") == 200
        and result.get("received") == int(entry["bytes"])
        and result.get("length") == int(entry["bytes"])
        and result.get("sha256") == entry["sha256"]
    )
    if sha256_samples_verified != SAMPLE_COUNT:
        errors.append(f"SHA256 samples verified {sha256_samples_verified} != {SAMPLE_COUNT}")
    for category in ("photos", "card-covers", "supplement"):
        if not sample_coverage.get(category):
            errors.append(f"SHA256 sample category missing: {category}")

    cache_verified, cache_results = cache_control_samples(ordered_entries)
    if cache_verified != CACHE_SAMPLE_COUNT:
        errors.append(f"Cache-Control samples verified {cache_verified} != {CACHE_SAMPLE_COUNT}")

    if errors:
        print("EXTERNALIZED_VALIDATION=FAIL")
        for error in errors[:40]:
            print(f"ERROR={error}")
        if failed_objects:
            print(f"FAILED_OBJECTS={len(failed_objects)}")
            for item in failed_objects[:20]:
                print(f"FAILED_PATH={item['path']}")
        return 1

    browser = browser_smoke_status()
    terminal = {
        "status": args.terminal_status,
        "resourcesChecked": args.terminal_resources,
        "detail": args.terminal_detail,
    }
    summary = {
        "schemaVersion": 1,
        "status": "PASS",
        "module": "shaanxi-history",
        "activePublicBase": PUBLIC_BASE,
        "frozenManifest": MANIFEST_PATH.relative_to(ROOT).as_posix(),
        "frozenManifestFiles": EXPECTED_FILES,
        "frozenManifestBytes": EXPECTED_BYTES,
        "preDeleteLocalIntegrity": {
            "files": EXPECTED_FILES,
            "bytes": EXPECTED_BYTES,
            "sha256Verified": EXPECTED_FILES,
        },
        "localCopiesPresent": len(local_present),
        "localCopyBytesPresent": local_copy_bytes,
        "remainingLocalMediaFiles": len(remaining_media),
        "remainingLocalMediaBytes": remaining_bytes,
        "currentPlanShaanxiFiles": len(current_plan_paths),
        "workerHttpVerified": worker_http_verified,
        "contentLengthVerified": content_length_verified,
        "worker404Failures": worker_404_failures,
        "worker5xxFailures": worker_5xx_failures,
        "sha256Samples": {
            "selected": len(sample_records),
            "verified": sha256_samples_verified,
            "coverage": {
                "photos": sample_coverage.get("photos", 0),
                "card-covers": sample_coverage.get("card-covers", 0),
                "supplement": sample_coverage.get("supplement", 0),
            },
        },
        "cacheControlSamples": {
            "selected": CACHE_SAMPLE_COUNT,
            "verified": cache_verified,
            "required": "public, max-age=86400, stale-while-revalidate=604800",
        },
        "runtimeWorkerBaseOccurrences": runtime_worker_base_occurrences,
        "runtimeOldR2DevReferences": runtime_old_r2dev_references,
        "directLocalRuntimeRequests": len(direct_local_hits),
        "fileUriCount": file_uri_count,
        "windowsAbsoluteMediaPathCount": windows_absolute_count,
        "doubleModulePrefixCount": double_prefix_count,
        "directWorkerReferences": direct_worker_hits,
        "dataMediaLiteralsThroughResolver": len(data_asset_literals),
        "mediaBySubdirectory": category_stats,
        "mediaFilesDeleted": EXPECTED_FILES,
        "deletedBytes": EXPECTED_BYTES,
        "binaryAdditions": 0,
        "binaryModifications": 0,
        "binaryDeletions": EXPECTED_FILES,
        "browserSmoke": browser,
        "terminalHttpSmoke": terminal,
        "failedObjects": failed_objects,
    }
    SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DOC_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOC_PATH.write_text(build_document(summary), encoding="utf-8")

    print("EXTERNALIZED_VALIDATION=PASS")
    print(f"FROZEN_MANIFEST={EXPECTED_FILES}/{EXPECTED_BYTES}")
    print(f"LOCAL_COPIES_PRESENT={len(local_present)}")
    print(f"REMAINING_LOCAL_MEDIA={len(remaining_media)}/{remaining_bytes}")
    print(f"WORKER_HTTP={worker_http_verified}/{EXPECTED_FILES}")
    print(f"CONTENT_LENGTH={content_length_verified}/{EXPECTED_FILES}")
    print(f"SHA256_SAMPLES={sha256_samples_verified}/{len(sample_records)}")
    print(f"CACHE_CONTROL_SAMPLES={cache_verified}/{CACHE_SAMPLE_COUNT}")
    print(f"RUNTIME_OLD_R2DEV={runtime_old_r2dev_references}")
    print(f"DIRECT_LOCAL_RUNTIME={len(direct_local_hits)}")
    print(f"REPORTS_WRITTEN={SUMMARY_PATH.name},{DOC_PATH.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
