#!/usr/bin/env python3
"""Validate Qin-Han runtime media routing against the existing Worker objects.

This validator never uploads, deletes, rewrites, or decodes media.  It checks
the frozen externalization plan, the unchanged local copies, the Qin-Han data
resolver boundary, and the public Worker response state.  It is the
pre-delete/runtime-stage validator; after local Qin-Han media is removed, use
``scripts/validate_qinhan_externalized.py`` instead.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import shutil
import subprocess
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / "data" / "media-externalization-plan.json"
ARCHIVE_PATH = ROOT / "modules" / "qinhan" / "data" / "archive.json"
SUMMARY_PATH = ROOT / "data" / "qinhan-r2-runtime-verification.json"
DOC_PATH = ROOT / "docs" / "QINHAN_R2_RUNTIME.md"
UPLOAD_SUMMARY_PATH = ROOT / "data" / "qinhan-r2-upload-verification.json"
PROVENANCE_PATH = ROOT / "assets" / "editorial" / "provenance-trails.js"
MODULE_ROOT = ROOT / "modules" / "qinhan"
MODULE_PREFIX = "modules/qinhan/"
PUBLIC_BASE = "https://ad-fontes-media.gusgumee777.workers.dev"
LEGACY_PUBLIC_BASE = "https://pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev"
EXPECTED_FILES = 1099
EXPECTED_BYTES = 199500311
EXPECTED_PROVENANCE_FILES = 4
SAMPLE_COUNT = 40
CACHE_SAMPLE_COUNT = 40
SAMPLE_SEED = 20260821
USER_AGENT = "ad-fontes-qinhan-r2-runtime-validator/1"
REQUEST_TIMEOUT = 45
NETWORK_ATTEMPTS = 5
MEDIA_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".heic",
    ".tif", ".tiff", ".mp3", ".wav", ".flac", ".m4a", ".ogg", ".mp4",
    ".webm", ".mov", ".pdf", ".woff", ".woff2", ".ttf", ".otf",
}
TEXT_EXTENSIONS = {".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".jsonl"}
RUNTIME_REQUEST_FILES = {
    "index.html",
    "styles.css",
    "motion.css",
    "app.js",
    "media-url.js",
    "seal-viewer.js",
}
WORKER_URL_RE = re.compile(
    re.escape(PUBLIC_BASE) + r"/modules/qinhan/[^\"'\s)<>]+"
)
ABSOLUTE_PATH_RE = re.compile(r"(?i)(?<![a-z0-9])[a-z]:[\\/]")
FILE_URI_RE = re.compile(r"(?i)\bfile://")
PROVENANCE_QINHAN_BLOCK_RE = re.compile(
    r"""(?s)\bqinhan\s*:\s*\{.*?(?=\n\s*['\"]xian-museum['\"]\s*:)"""
)
PROVENANCE_IMAGE_RE = re.compile(r"""image\s*:\s*['\"]([^'\"]+)['\"]""")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def repo_path(repo_relative: str) -> Path:
    return ROOT.joinpath(*repo_relative.split("/"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def normalize_qinhan_path(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = value.replace("\\", "/").split("?", 1)[0].split("#", 1)[0]
    candidate = candidate.removeprefix("./")
    if candidate.startswith("assets/"):
        return MODULE_PREFIX + candidate
    if candidate.startswith(MODULE_PREFIX):
        return candidate
    return None


def module_media_paths() -> set[str]:
    return {
        path.relative_to(ROOT).as_posix()
        for path in MODULE_ROOT.rglob("*")
        if path.is_file() and path.suffix.lower() in MEDIA_EXTENSIONS
    }


def runtime_texts() -> dict[str, str]:
    texts: dict[str, str] = {}
    for path in MODULE_ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        relative = path.relative_to(MODULE_ROOT).as_posix()
        texts[relative] = path.read_text(encoding="utf-8", errors="replace")
    if PROVENANCE_PATH.is_file():
        texts["assets/editorial/provenance-trails.js"] = PROVENANCE_PATH.read_text(
            encoding="utf-8", errors="replace"
        )
    return texts


def provenance_media_paths(text: str) -> set[str]:
    block = PROVENANCE_QINHAN_BLOCK_RE.search(text)
    if not block:
        return set()
    return {
        normalized
        for value in PROVENANCE_IMAGE_RE.findall(block.group(0))
        if (normalized := normalize_qinhan_path(value))
    }


def provenance_resolver_checks(text: str) -> dict[str, bool]:
    block = PROVENANCE_QINHAN_BLOCK_RE.search(text)
    image_function = re.search(
        r"const\s+img\s*=\s*\(path\)\s*=>\s*\{(?P<body>.*?)\n\s*\};",
        text,
        re.S,
    )
    body = image_function.group("body") if image_function else ""
    return {
        "qinhanDatasetPresent": bool(block),
        "qinhanUsesMediaResolver": bool(
            re.search(
                r"page\s*===\s*['\"]qinhan['\"].*?window\.qinhanMediaUrl",
                body,
                re.S,
            )
        ),
        "qinhanResolverCall": "return window.qinhanMediaUrl(path);" in body,
        "nonQinhanLocalFallback": "return new URL(path, projectRoot).href;" in body,
    }


def previous_upload_verification() -> dict[str, Any] | None:
    if not UPLOAD_SUMMARY_PATH.is_file():
        return None
    baseline = load_json(UPLOAD_SUMMARY_PATH)
    return {
        "historical": True,
        "status": baseline.get("status"),
        "files": baseline.get("files"),
        "bytes": baseline.get("bytes"),
        "http": baseline.get("httpVerified"),
        "contentLength": baseline.get("contentLengthVerified"),
        "sha256Samples": baseline.get("sha256SamplesVerified"),
        "cacheControlSamples": baseline.get("cacheControlSamplesVerified"),
    }


def archive_media_fields(archive: dict[str, Any]) -> tuple[list[dict[str, str]], set[str]]:
    fields: list[dict[str, str]] = []
    paths: set[str] = set()
    for group in archive.get("groups", []):
        if not isinstance(group, dict):
            continue
        for field in ("main_image", "full_image"):
            value = group.get(field)
            normalized = normalize_qinhan_path(value)
            if normalized:
                fields.append({"field": field, "value": str(value), "path": normalized})
                paths.add(normalized)
        for photo in group.get("gallery", []):
            if not isinstance(photo, dict):
                continue
            for field in ("thumb", "web"):
                value = photo.get(field)
                normalized = normalize_qinhan_path(value)
                if normalized:
                    fields.append({"field": field, "value": str(value), "path": normalized})
                    paths.add(normalized)
    return fields, paths


def worker_url(path: str) -> str:
    return f"{PUBLIC_BASE}/{path.lstrip('/')}"


def static_worker_paths(texts: dict[str, str]) -> tuple[list[str], set[str]]:
    occurrences: list[str] = []
    paths: set[str] = set()
    for name in ("index.html", "styles.css", "motion.css"):
        for match in WORKER_URL_RE.finditer(texts.get(name, "")):
            url = match.group(0)
            occurrences.append(url)
            path = urlsplit(url).path.lstrip("/")
            paths.add(path)
    return occurrences, paths


def strip_worker_urls(text: str) -> str:
    return WORKER_URL_RE.sub("", text)


def direct_local_runtime_hits(texts: dict[str, str], plan_paths: set[str]) -> list[dict[str, str]]:
    hits: list[dict[str, str]] = []
    for name in sorted(RUNTIME_REQUEST_FILES):
        text = strip_worker_urls(texts.get(name, ""))
        for path in sorted(plan_paths):
            local_path = path[len(MODULE_PREFIX):] if path.startswith(MODULE_PREFIX) else path
            if local_path in text or f"./{local_path}" in text:
                hits.append({"file": name, "path": path})
    return hits


def response_head_once(entry: dict[str, Any]) -> dict[str, Any]:
    request = Request(
        worker_url(str(entry["path"])),
        method="HEAD",
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    )
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            length = response.headers.get("Content-Length")
            return {
                "path": entry["path"],
                "status": int(getattr(response, "status", 200)),
                "length": int(length) if length else None,
                "cacheControl": response.headers.get("Cache-Control", ""),
                "error": "",
            }
    except HTTPError as exc:
        return {"path": entry["path"], "status": int(exc.code), "length": None, "cacheControl": "", "error": f"HTTPError:{exc.code}"}
    except (URLError, TimeoutError, OSError) as exc:
        return {"path": entry["path"], "status": getattr(exc, "code", None), "length": None, "cacheControl": "", "error": type(exc).__name__}


def response_head(entry: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for attempt in range(NETWORK_ATTEMPTS):
        result = response_head_once(entry)
        if result.get("status") in {400, 401, 403, 404}:
            return result
        if result.get("status") == 200 and result.get("length") == int(entry["bytes"]):
            return result
        if attempt < NETWORK_ATTEMPTS - 1:
            time.sleep(0.5)
    return result


def sample_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(entries, key=lambda item: str(item["path"]))
    selected: list[dict[str, Any]] = []
    selected_paths: set[str] = set()
    for marker in (
        "assets/photos/",
        "assets/processed/crop/",
        "assets/processed/full/",
        "assets/external/",
    ):
        candidates = [item for item in ordered if marker in str(item["path"])]
        if not candidates:
            raise ValueError(f"missing SHA sample family: {marker}")
        for item in candidates[:5]:
            selected.append(item)
            selected_paths.add(str(item["path"]))
    remaining = [item for item in ordered if str(item["path"]) not in selected_paths]
    random.Random(SAMPLE_SEED).shuffle(remaining)
    selected.extend(remaining[: max(0, SAMPLE_COUNT - len(selected))])
    if len(selected) != SAMPLE_COUNT:
        raise ValueError(f"SHA sample size {len(selected)} != {SAMPLE_COUNT}")
    return selected


def sha256_get_once(entry: dict[str, Any]) -> dict[str, Any]:
    request = Request(
        worker_url(str(entry["path"])),
        method="GET",
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    )
    try:
        with urlopen(request, timeout=max(REQUEST_TIMEOUT, 90)) as response:
            digest = hashlib.sha256()
            received = 0
            for block in iter(lambda: response.read(1024 * 1024), b""):
                digest.update(block)
                received += len(block)
            length = response.headers.get("Content-Length")
            return {
                "path": entry["path"],
                "status": int(getattr(response, "status", 200)),
                "received": received,
                "length": int(length) if length else None,
                "sha256": digest.hexdigest(),
                "expectedSha256": entry["sha256"],
                "error": "",
            }
    except HTTPError as exc:
        return {"path": entry["path"], "status": int(exc.code), "received": 0, "length": None, "sha256": "", "expectedSha256": entry["sha256"], "error": f"HTTPError:{exc.code}"}
    except (URLError, TimeoutError, OSError) as exc:
        return {"path": entry["path"], "status": getattr(exc, "code", None), "received": 0, "length": None, "sha256": "", "expectedSha256": entry["sha256"], "error": type(exc).__name__}


def sha256_get(entry: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for attempt in range(NETWORK_ATTEMPTS):
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
        if attempt < NETWORK_ATTEMPTS - 1:
            time.sleep(0.7)
    return result


def binary_change_paths() -> list[str]:
    changed: set[str] = set()
    tracked = subprocess.run(
        ["git", "diff", "--name-only", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    changed.update(line.replace("\\", "/") for line in tracked.stdout.splitlines() if line)
    untracked = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    changed.update(line.replace("\\", "/") for line in untracked.stdout.splitlines() if line)
    return sorted(path for path in changed if Path(path).suffix.lower() in MEDIA_EXTENSIONS)


def browser_smoke_payload(args: argparse.Namespace) -> dict[str, Any]:
    return {
        "status": args.browser_status,
        "detail": args.browser_detail,
        "consoleErrors": args.browser_console_errors,
        "consoleWarnings": args.browser_console_warnings,
        "provenanceMedia": args.browser_provenance_media,
        "provenanceMediaLoaded": args.browser_provenance_loaded,
        "provenanceWorkerHttp": args.browser_provenance_http,
        "provenanceLocalRequests": args.browser_provenance_local_requests,
        "mediaFailures": args.browser_media_failures,
        "archiveDialogsChecked": args.browser_archive_dialogs,
        "cropFullSwitch": args.browser_crop_full_switch,
    }


def build_document(summary: dict[str, Any]) -> str:
    samples = summary["sha256Samples"]
    cache = summary["cacheControlSamples"]
    terminal = summary["terminalHttpSmoke"]
    browser = summary["browserSmoke"]
    baseline = summary.get("previousUploadVerification") or {}
    return f"""# Qin-Han R2 runtime

- Status: **{summary['status']}**
- Active Worker public base: `{summary['activePublicBase']}`
- Frozen plan: **{summary['plannedFiles']:,} files / {summary['plannedBytes']:,} bytes**
- Local Qin-Han media retained: **{summary['localMediaFiles']:,} files / {summary['localMediaBytes']:,} bytes**
- Static Worker media references: **{summary['staticWorkerUniqueFiles']:,} files / {summary['staticWorkerReferenceOccurrences']:,} occurrences**
- Dynamic archive media fields: **{summary['dynamicMediaFieldValues']:,} values / {summary['dynamicUniqueFiles']:,} unique files**
- Provenance Qin-Han media: **{summary['provenanceMediaFiles']:,} files**; Worker-resolved **{summary['provenanceWorkerResolved']:,}/{summary['provenanceMediaFiles']:,}**; local requests **{summary['provenanceLocalRuntimeRequests']}**
- Runtime routing: **{summary['runtimeRoutingStatus']}** (static + dynamic archive + provenance resolver)
- Runtime coverage: **{summary['totalUniqueRuntimeMediaFiles']:,}/{summary['plannedFiles']:,} unique files**
- Worker HTTP: **{summary['workerHttpVerified']:,}/{summary['plannedFiles']:,}**
- Content-Length: **{summary['contentLengthVerified']:,}/{summary['plannedFiles']:,}**
- Worker object failures observed: **{summary.get('failedObjectCount', 0):,}**; unverified because terminal network was skipped/blocked: **{summary.get('unverifiedObjectCount', 0):,}**
- SHA256 GET samples: **{samples['verified']:,}/{samples['selected']:,}**
- Cache-Control samples: **{cache['verified']:,}/{cache['selected']:,}**
- Direct local runtime requests for planned media: **{summary['directLocalRuntimeRequests']}**
- Runtime old `r2.dev` references: **{summary['runtimeOldR2DevReferences']}**
- Double module prefix / `file://` / Windows absolute paths: **{summary['doubleModulePrefixCount']} / {summary['fileUriCount']} / {summary['windowsAbsolutePathCount']}**
- Preloads: **{summary['preloads']['count']}**; `fetchpriority=high`: **{summary['preloads']['highPriorityCount']}**
- Terminal HTTP smoke: **{terminal['status']}** ({terminal['resourcesChecked']} resources checked)
- Terminal Worker revalidation: **{summary['terminalNetworkStatus']}**{f' ({summary.get("terminalNetworkDetail", "")})' if summary.get("terminalNetworkDetail") else ''}
- Browser smoke: **{browser['status']}**{f' ({browser.get("detail", "")})' if browser.get("detail") else ''}; console **{browser.get('consoleErrors', 0)} errors / {browser.get('consoleWarnings', 0)} warnings**; provenance **{browser.get('provenanceMediaLoaded', 0)}/{browser.get('provenanceMedia', 0)}**; media failures **{browser.get('mediaFailures', 0)}**
- Historical upload verification baseline: **{baseline.get('status', 'UNAVAILABLE')}** — {baseline.get('files', 0):,} files / {baseline.get('bytes', 0):,} bytes; HTTP {baseline.get('http', 0):,}; Content-Length {baseline.get('contentLength', 0):,}; SHA256 samples {baseline.get('sha256Samples', 0):,}; Cache-Control samples {baseline.get('cacheControlSamples', 0):,}
- Binary media changes: **{summary['binaryMediaChanges']}**
{f"- Verification blockers: **{'; '.join(summary.get('verificationBlockers', []))}**" if summary.get('verificationBlockers') else ''}

`archive.json` keeps its original `assets/...` values. The runtime boundary is
`qinhanMediaUrl()`, which delegates to the shared vendor-neutral resolver and
maps those values to the unchanged `modules/qinhan/...` Worker object keys.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=24)
    parser.add_argument("--network-timeout", type=int, default=45)
    parser.add_argument("--network-attempts", type=int, default=5)
    parser.add_argument("--terminal-status", choices=("PASS", "SKIPPED"), default="SKIPPED")
    parser.add_argument("--terminal-resources", type=int, default=0)
    parser.add_argument("--terminal-detail", default="")
    parser.add_argument("--browser-status", choices=("PASS", "SKIPPED"), default="SKIPPED")
    parser.add_argument("--browser-detail", default="")
    parser.add_argument("--browser-console-errors", type=int, default=0)
    parser.add_argument("--browser-console-warnings", type=int, default=0)
    parser.add_argument("--browser-provenance-media", type=int, default=0)
    parser.add_argument("--browser-provenance-loaded", type=int, default=0)
    parser.add_argument("--browser-provenance-http", type=int, default=0)
    parser.add_argument("--browser-provenance-local-requests", type=int, default=0)
    parser.add_argument("--browser-media-failures", type=int, default=0)
    parser.add_argument("--browser-archive-dialogs", type=int, default=0)
    parser.add_argument("--browser-crop-full-switch", default="")
    parser.add_argument(
        "--terminal-network-status",
        choices=("PASS", "BLOCKED", "SKIPPED"),
        default=None,
    )
    parser.add_argument("--terminal-network-detail", default="")
    parser.add_argument(
        "--skip-worker-network",
        action="store_true",
        help="skip all external Worker requests and record local validation as BLOCKED",
    )
    parser.add_argument(
        "--record-failure",
        action="store_true",
        help="write a BLOCKED report when external verification is unavailable",
    )
    args = parser.parse_args()
    global REQUEST_TIMEOUT, NETWORK_ATTEMPTS
    REQUEST_TIMEOUT = max(5, int(args.network_timeout))
    NETWORK_ATTEMPTS = max(1, int(args.network_attempts))

    errors: list[str] = []
    if not PLAN_PATH.is_file():
        print("QINHAN_R2_RUNTIME=FAIL")
        print("ERROR=missing media externalization plan")
        return 1
    if not ARCHIVE_PATH.is_file():
        print("QINHAN_R2_RUNTIME=FAIL")
        print("ERROR=missing Qin-Han archive data")
        return 1

    plan = load_json(PLAN_PATH)
    entries = [item for item in plan.get("externalizableMedia", []) if item.get("module") == "qinhan"]
    plan_paths = {str(item.get("path", "")) for item in entries}
    planned_bytes = sum(int(item.get("bytes", 0)) for item in entries)
    if len(entries) != EXPECTED_FILES or len(plan_paths) != EXPECTED_FILES:
        errors.append(f"plan files {len(entries)}/{len(plan_paths)} != {EXPECTED_FILES}")
    if planned_bytes != EXPECTED_BYTES:
        errors.append(f"plan bytes {planned_bytes} != {EXPECTED_BYTES}")
    if any(not path.startswith(MODULE_PREFIX) for path in plan_paths):
        errors.append("plan contains a path outside modules/qinhan")
    external_paths = [str(item.get("externalPath", "")) for item in entries]
    if len(set(external_paths)) != len(external_paths):
        errors.append("duplicate externalPath values")
    if any(item.get("externalPath") != item.get("path") for item in entries):
        errors.append("externalPath does not preserve the repo-relative object key")

    local_paths = module_media_paths()
    local_bytes = sum(repo_path(path).stat().st_size for path in local_paths)
    if len(local_paths) != EXPECTED_FILES:
        errors.append(f"local media files {len(local_paths)} != {EXPECTED_FILES}")
    if local_bytes != EXPECTED_BYTES:
        errors.append(f"local media bytes {local_bytes} != {EXPECTED_BYTES}")
    if local_paths != plan_paths:
        errors.append(
            f"local/plan media path mismatch (local-only={len(local_paths - plan_paths)}, plan-only={len(plan_paths - local_paths)})"
        )
    integrity_failures: list[str] = []
    for entry in sorted(entries, key=lambda item: str(item["path"])):
        path = str(entry["path"])
        local = repo_path(path)
        if not local.is_file():
            integrity_failures.append(f"missing:{path}")
            continue
        if local.stat().st_size != int(entry["bytes"]):
            integrity_failures.append(f"size:{path}")
        if sha256_file(local) != str(entry["sha256"]):
            integrity_failures.append(f"sha256:{path}")
    if integrity_failures:
        errors.append(f"local plan integrity failures: {len(integrity_failures)}")

    texts = runtime_texts()
    provenance_text = texts.get("assets/editorial/provenance-trails.js", "")
    provenance_paths = provenance_media_paths(provenance_text)
    provenance_checks = provenance_resolver_checks(provenance_text)
    provenance_plan_missing = sorted(provenance_paths - plan_paths)
    provenance_resolver_ok = all(provenance_checks.values()) and not provenance_plan_missing
    provenance_worker_resolved = (
        len(provenance_paths) if provenance_resolver_ok else 0
    )
    provenance_local_hits = (
        [
            {"file": "assets/editorial/provenance-trails.js", "path": path}
            for path in sorted(provenance_paths)
        ]
        if provenance_paths and not provenance_resolver_ok
        else []
    )
    if len(provenance_paths) != EXPECTED_PROVENANCE_FILES:
        errors.append(
            f"provenance Qin-Han media paths {len(provenance_paths)} != {EXPECTED_PROVENANCE_FILES}"
        )
    if provenance_plan_missing:
        errors.append(
            f"provenance media paths outside plan: {len(provenance_plan_missing)}"
        )
    for check, passed in provenance_checks.items():
        if not passed:
            errors.append(f"provenance resolver check failed: {check}")

    all_runtime_text = "\n".join(texts.values())
    old_host_count = all_runtime_text.count(LEGACY_PUBLIC_BASE)
    old_r2_count = len(re.findall(r"(?i)r2\.dev", all_runtime_text))
    worker_base_count = all_runtime_text.count(PUBLIC_BASE)
    file_uri_count = len(FILE_URI_RE.findall(all_runtime_text))
    runtime_request_text = "\n".join(
        texts.get(name, "") for name in sorted(RUNTIME_REQUEST_FILES)
    )
    windows_absolute_count = len(ABSOLUTE_PATH_RE.findall(runtime_request_text))
    double_prefix_count = all_runtime_text.count(MODULE_PREFIX + MODULE_PREFIX)
    if old_host_count or old_r2_count:
        errors.append(f"runtime old r2.dev references: {old_r2_count}")
    if worker_base_count == 0:
        errors.append("active Worker base is absent from Qin-Han runtime")
    if file_uri_count:
        errors.append(f"file URI count: {file_uri_count}")
    if windows_absolute_count:
        errors.append(f"Windows absolute path count: {windows_absolute_count}")
    if double_prefix_count:
        errors.append(f"double module prefix count: {double_prefix_count}")

    archive = load_json(ARCHIVE_PATH)
    dynamic_fields, dynamic_paths = archive_media_fields(archive)
    dynamic_unknown = sorted(dynamic_paths - plan_paths)
    if dynamic_unknown:
        errors.append(f"archive dynamic paths outside plan: {len(dynamic_unknown)}")
    expected_field_values = 36 * 2 + 512 * 2
    if len(dynamic_fields) != expected_field_values:
        errors.append(f"archive dynamic field values {len(dynamic_fields)} != {expected_field_values}")

    static_occurrences, static_paths = static_worker_paths(texts)
    static_unknown = sorted(static_paths - plan_paths)
    if static_unknown:
        errors.append(f"static Worker paths outside plan: {len(static_unknown)}")
    runtime_paths = dynamic_paths | static_paths | provenance_paths
    if runtime_paths != plan_paths:
        errors.append(
            f"runtime coverage mismatch (covered={len(runtime_paths)}, missing={len(plan_paths - runtime_paths)}, extra={len(runtime_paths - plan_paths)})"
        )
    direct_local_hits = direct_local_runtime_hits(texts, plan_paths)
    direct_local_hits.extend(provenance_local_hits)
    if direct_local_hits:
        errors.append(f"direct local runtime media references: {len(direct_local_hits)}")

    runtime_routing_status = (
        "PASS"
        if (
            len(provenance_paths) == EXPECTED_PROVENANCE_FILES
            and provenance_worker_resolved == EXPECTED_PROVENANCE_FILES
            and runtime_paths == plan_paths
            and not direct_local_hits
            and old_host_count == 0
            and old_r2_count == 0
        )
        else "FAIL"
    )

    wrapper = texts.get("media-url.js", "")
    app = texts.get("app.js", "")
    index = texts.get("index.html", "")
    resolver_checks = {
        "sharedResolverDelegation": "resolveMediaUrl(repoPath" in wrapper,
        "modulePrefixGuard": "startsWith(MODULE_PREFIX)" in wrapper,
        "assetsPrefixMapping": 'startsWith("assets/")' in wrapper,
        "completeUrlPreserved": "COMPLETE_URL.test(value)" in wrapper,
        "archiveMainResolver": "qinhanMediaUrl(group.main_image)" in app,
        "dialogResolver": "const nextSource = qinhanMediaUrl(" in app,
        "thumbnailResolver": "qinhanMediaUrl(photo.thumb)" in app,
        "sharedResolverLoaded": "../../shared/js/media-url.js" in index,
        "moduleResolverLoaded": 'src="media-url.js"' in index,
    }
    for check, passed in resolver_checks.items():
        if not passed:
            errors.append(f"resolver check failed: {check}")

    preloads = re.findall(r"<link\b[^>]*rel=[\"']preload[\"'][^>]*as=[\"']image[\"'][^>]*>", index, re.I)
    preload_count = len(preloads)
    high_priority_count = sum(1 for item in preloads if re.search(r"fetchpriority=[\"']high[\"']", item, re.I))
    if preload_count > 2:
        errors.append(f"image preload count {preload_count} > 2")
    if high_priority_count > 2:
        errors.append(f"high-priority image preload count {high_priority_count} > 2")
    expected_preload_urls = {
        worker_url(f"{MODULE_PREFIX}assets/brand-emblem.png"),
        worker_url(f"{MODULE_PREFIX}assets/external/qinhan-museum-aerial-zou-hong.jpg"),
    }
    if not all(url in index for url in expected_preload_urls):
        errors.append("critical preload URL set is incomplete")

    ordered_entries = sorted(entries, key=lambda item: str(item["path"]))
    if args.skip_worker_network:
        head_results = [
            {
                "path": entry["path"],
                "status": None,
                "length": None,
                "cacheControl": "",
                "error": "terminal network skipped",
            }
            for entry in ordered_entries
        ]
    else:
        with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 32))) as executor:
            head_results = list(executor.map(response_head, ordered_entries))
    worker_http_verified = sum(1 for result in head_results if result.get("status") == 200)
    content_length_verified = sum(
        1
        for result, entry in zip(head_results, ordered_entries)
        if result.get("status") == 200 and result.get("length") == int(entry["bytes"])
    )
    worker_404_failures = sum(1 for result in head_results if result.get("status") == 404)
    worker_5xx_failures = sum(
        1 for result in head_results if isinstance(result.get("status"), int) and result["status"] >= 500
    )
    failed_objects = [
        {"path": result.get("path", ""), "status": result.get("status"), "error": result.get("error", "")}
        for result, entry in zip(head_results, ordered_entries)
        if result.get("status") != 200 or result.get("length") != int(entry["bytes"])
    ]
    if worker_http_verified != EXPECTED_FILES:
        errors.append(f"Worker HTTP verified {worker_http_verified} != {EXPECTED_FILES}")
    if content_length_verified != EXPECTED_FILES:
        errors.append(f"Worker Content-Length verified {content_length_verified} != {EXPECTED_FILES}")

    samples = sample_entries(ordered_entries)
    if args.skip_worker_network:
        sample_results = [
            {
                "path": entry["path"],
                "status": None,
                "received": 0,
                "length": None,
                "sha256": "",
                "expectedSha256": entry["sha256"],
                "error": "terminal network skipped",
            }
            for entry in samples
        ]
    else:
        with ThreadPoolExecutor(max_workers=8) as executor:
            sample_results = list(executor.map(sha256_get, samples))
    sha_verified = sum(
        1
        for result, entry in zip(sample_results, samples)
        if result.get("status") == 200
        and result.get("received") == int(entry["bytes"])
        and result.get("length") == int(entry["bytes"])
        and result.get("sha256") == entry["sha256"]
    )
    sample_coverage = Counter(
        "photos" if "/assets/photos/" in str(result["path"])
        else "processed-crop" if "/assets/processed/crop/" in str(result["path"])
        else "processed-full" if "/assets/processed/full/" in str(result["path"])
        else "external" if "/assets/external/" in str(result["path"])
        else "other"
        for result in sample_results
        if result.get("status") == 200 and result.get("sha256") == result.get("expectedSha256")
    )
    if sha_verified != SAMPLE_COUNT:
        errors.append(f"SHA256 samples verified {sha_verified} != {SAMPLE_COUNT}")
    for family in ("photos", "processed-crop", "processed-full", "external"):
        if not sample_coverage.get(family):
            errors.append(f"SHA256 sample family missing: {family}")

    cache_rows = sorted(ordered_entries, key=lambda item: str(item["path"]))
    random.Random(SAMPLE_SEED + 1).shuffle(cache_rows)
    cache_sample_paths = {str(item["path"]) for item in cache_rows[:CACHE_SAMPLE_COUNT]}
    cache_results = [result for result in head_results if str(result.get("path")) in cache_sample_paths]
    required_cache = ("public", "max-age=86400", "stale-while-revalidate=604800")
    cache_verified = sum(
        1
        for result in cache_results
        if result.get("status") == 200
        and all(token in str(result.get("cacheControl", "")).lower() for token in required_cache)
    )
    if cache_verified != CACHE_SAMPLE_COUNT:
        errors.append(f"Cache-Control samples verified {cache_verified} != {CACHE_SAMPLE_COUNT}")

    browser_summary = browser_smoke_payload(args)
    terminal_network_status = args.terminal_network_status or (
        "PASS" if worker_http_verified == EXPECTED_FILES else "BLOCKED"
    )
    terminal_network_detail = args.terminal_network_detail or (
        "terminal network path to workers.dev unavailable"
        if terminal_network_status == "BLOCKED"
        else ""
    )
    previous_upload = previous_upload_verification()
    if args.browser_status == "PASS":
        browser_expectations = {
            "provenanceMedia": EXPECTED_PROVENANCE_FILES,
            "provenanceMediaLoaded": EXPECTED_PROVENANCE_FILES,
            "provenanceWorkerHttp": EXPECTED_PROVENANCE_FILES,
            "provenanceLocalRequests": 0,
            "mediaFailures": 0,
        }
        for field, expected in browser_expectations.items():
            if browser_summary.get(field) != expected:
                errors.append(
                    f"browser smoke {field} {browser_summary.get(field)} != {expected}"
                )
        if browser_summary.get("consoleErrors") != 0:
            errors.append("browser smoke console errors are nonzero")
        if browser_summary.get("consoleWarnings") != 0:
            errors.append("browser smoke console warnings are nonzero")

    changed_binary_paths = binary_change_paths()
    if changed_binary_paths:
        errors.append(f"binary media changes: {len(changed_binary_paths)}")
    if args.terminal_status not in {"PASS", "SKIPPED"}:
        errors.append("terminal HTTP smoke was not recorded")

    if errors:
        if args.record_failure and (args.skip_worker_network or worker_http_verified != EXPECTED_FILES):
            blocked_summary = {
                "schemaVersion": 1,
                "status": "BLOCKED",
                "module": "qinhan",
                "activePublicBase": PUBLIC_BASE,
                "plannedFiles": EXPECTED_FILES,
                "plannedBytes": EXPECTED_BYTES,
                "localMediaFiles": len(local_paths),
                "localMediaBytes": local_bytes,
                "staticWorkerReferenceOccurrences": len(static_occurrences),
                "staticWorkerUniqueFiles": len(static_paths),
                "staticWorkerPaths": sorted(static_paths),
                "dynamicMediaFieldValues": len(dynamic_fields),
                "dynamicUniqueFiles": len(dynamic_paths),
                "dynamicFieldCounts": dict(Counter(item["field"] for item in dynamic_fields)),
                "totalUniqueRuntimeMediaFiles": len(runtime_paths),
                "runtimeCoverageMissing": sorted(plan_paths - runtime_paths),
                "runtimeCoverageExtra": sorted(runtime_paths - plan_paths),
                "workerHttpVerified": worker_http_verified,
                "contentLengthVerified": content_length_verified,
                "worker404Failures": worker_404_failures,
                "worker5xxFailures": worker_5xx_failures,
                "sha256Samples": {
                    "selected": len(samples),
                    "verified": sha_verified,
                    "coverage": dict(sample_coverage),
                },
                "cacheControlSamples": {
                    "selected": CACHE_SAMPLE_COUNT,
                    "verified": cache_verified,
                    "required": "public, max-age=86400, stale-while-revalidate=604800",
                },
                "directLocalRuntimeRequests": len(direct_local_hits),
                "runtimeOldR2DevReferences": old_host_count,
                "runtimeR2DevOccurrences": old_r2_count,
                "workerBaseOccurrences": worker_base_count,
                "doubleModulePrefixCount": double_prefix_count,
                "fileUriCount": file_uri_count,
                "windowsAbsolutePathCount": windows_absolute_count,
                "preloads": {"count": preload_count, "highPriorityCount": high_priority_count},
                "terminalHttpSmoke": {
                    "status": args.terminal_status,
                    "resourcesChecked": args.terminal_resources,
                    "detail": args.terminal_detail,
                },
                "provenanceMediaFiles": len(provenance_paths),
                "provenanceWorkerResolved": provenance_worker_resolved,
                "provenanceLocalRuntimeRequests": len(provenance_local_hits),
                "provenanceResolverChecks": provenance_checks,
                "runtimeRoutingStatus": runtime_routing_status,
                "terminalNetworkStatus": terminal_network_status,
                "terminalNetworkDetail": terminal_network_detail,
                "previousUploadVerification": previous_upload,
                "browserSmoke": browser_summary,
                "binaryMediaChanges": len(changed_binary_paths),
                "verificationBlockers": errors,
                "workerVerificationSkipped": args.skip_worker_network,
                "failedObjectCount": 0 if args.skip_worker_network else len(failed_objects),
                "unverifiedObjectCount": len(failed_objects) if args.skip_worker_network else 0,
                "failedObjectExamples": [] if args.skip_worker_network else failed_objects[:20],
            }
            write_json(SUMMARY_PATH, blocked_summary)
            DOC_PATH.write_text(build_document(blocked_summary), encoding="utf-8", newline="\n")
            print(f"REPORTS_WRITTEN={SUMMARY_PATH.name},{DOC_PATH.name}")
        print("QINHAN_R2_RUNTIME=FAIL")
        for error in errors[:60]:
            print(f"ERROR={error}")
        if not args.skip_worker_network:
            for item in failed_objects[:20]:
                print(f"FAILED_OBJECT={item['path']} status={item['status']} error={item['error']}")
        return 1

    summary = {
        "schemaVersion": 1,
        "status": "PASS",
        "module": "qinhan",
        "activePublicBase": PUBLIC_BASE,
        "plannedFiles": EXPECTED_FILES,
        "plannedBytes": EXPECTED_BYTES,
        "localMediaFiles": len(local_paths),
        "localMediaBytes": local_bytes,
        "staticWorkerReferenceOccurrences": len(static_occurrences),
        "staticWorkerUniqueFiles": len(static_paths),
        "staticWorkerPaths": sorted(static_paths),
        "dynamicMediaFieldValues": len(dynamic_fields),
        "dynamicUniqueFiles": len(dynamic_paths),
        "dynamicFieldCounts": dict(Counter(item["field"] for item in dynamic_fields)),
        "totalUniqueRuntimeMediaFiles": len(runtime_paths),
        "runtimeCoverageMissing": sorted(plan_paths - runtime_paths),
        "runtimeCoverageExtra": sorted(runtime_paths - plan_paths),
        "workerHttpVerified": worker_http_verified,
        "contentLengthVerified": content_length_verified,
        "worker404Failures": worker_404_failures,
        "worker5xxFailures": worker_5xx_failures,
        "sha256Samples": {
            "selected": len(samples),
            "verified": sha_verified,
            "coverage": dict(sample_coverage),
        },
        "cacheControlSamples": {
            "selected": CACHE_SAMPLE_COUNT,
            "verified": cache_verified,
            "required": "public, max-age=86400, stale-while-revalidate=604800",
        },
        "directLocalRuntimeRequests": len(direct_local_hits),
        "runtimeOldR2DevReferences": old_host_count,
        "runtimeR2DevOccurrences": old_r2_count,
        "workerBaseOccurrences": worker_base_count,
        "doubleModulePrefixCount": double_prefix_count,
        "fileUriCount": file_uri_count,
        "windowsAbsolutePathCount": windows_absolute_count,
        "preloads": {"count": preload_count, "highPriorityCount": high_priority_count},
        "terminalHttpSmoke": {
            "status": args.terminal_status,
            "resourcesChecked": args.terminal_resources,
            "detail": args.terminal_detail,
        },
        "provenanceMediaFiles": len(provenance_paths),
        "provenanceWorkerResolved": provenance_worker_resolved,
        "provenanceLocalRuntimeRequests": len(provenance_local_hits),
        "provenanceResolverChecks": provenance_checks,
        "runtimeRoutingStatus": runtime_routing_status,
        "terminalNetworkStatus": terminal_network_status,
        "terminalNetworkDetail": terminal_network_detail,
        "previousUploadVerification": previous_upload,
        "browserSmoke": browser_summary,
        "binaryMediaChanges": len(changed_binary_paths),
        "workerVerificationSkipped": args.skip_worker_network,
        "failedObjectCount": len(failed_objects),
        "unverifiedObjectCount": 0,
        "failedObjects": failed_objects,
    }
    write_json(SUMMARY_PATH, summary)
    DOC_PATH.write_text(build_document(summary), encoding="utf-8", newline="\n")

    print("QINHAN_R2_RUNTIME=PASS")
    print(f"PLAN={EXPECTED_FILES}/{EXPECTED_BYTES}")
    print(f"LOCAL_MEDIA={len(local_paths)}/{local_bytes}")
    print(f"STATIC_WORKER={len(static_paths)} files/{len(static_occurrences)} references")
    print(f"DYNAMIC_FIELDS={len(dynamic_fields)} values/{len(dynamic_paths)} files")
    print(f"RUNTIME_COVERAGE={len(runtime_paths)}/{EXPECTED_FILES}")
    print(f"WORKER_HTTP={worker_http_verified}/{EXPECTED_FILES}")
    print(f"CONTENT_LENGTH={content_length_verified}/{EXPECTED_FILES}")
    print(f"SHA256_SAMPLES={sha_verified}/{len(samples)}")
    print(f"CACHE_CONTROL_SAMPLES={cache_verified}/{CACHE_SAMPLE_COUNT}")
    print(f"DIRECT_LOCAL_RUNTIME={len(direct_local_hits)}")
    print(f"RUNTIME_OLD_R2DEV={old_host_count}")
    print(f"BINARY_MEDIA_CHANGES={len(changed_binary_paths)}")
    print(f"REPORTS_WRITTEN={SUMMARY_PATH.name},{DOC_PATH.name}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
