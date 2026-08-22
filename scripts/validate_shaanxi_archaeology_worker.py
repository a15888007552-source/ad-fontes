#!/usr/bin/env python3
"""Verify Shaanxi Archaeology Museum media through the public Worker only."""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import random
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


MODULE = "shaanxi-archaeology-museum"
MODULE_PREFIX = f"modules/{MODULE}/"
PUBLIC_BASE = "https://ad-fontes-media.gusgumee777.workers.dev"
EXPECTED_FILES = 1061
EXPECTED_BYTES = 103024634
DEFAULT_WORKERS = 12
MAX_WORKERS = 16
DEFAULT_TIMEOUT = 30.0
DEFAULT_ATTEMPTS = 3
SAMPLE_COUNT = 40
SAMPLE_SEED = 20260822
DEFAULT_PLAN = Path("data/media-externalization-plan.json")
DEFAULT_OUTPUT = Path("artifacts/shaanxi-archaeology-worker-verification.json")
USER_AGENT = "ad-fontes-shaanxi-archaeology-worker-validator/1"
CHUNK_SIZE = 1024 * 1024

COVERAGE_CATEGORIES = (
    "assets/backgrounds",
    "assets/hero",
    "assets/brand-emblem.png",
    "assets/photos/thumbs",
    "assets/photos/web",
    "review/contact-sheets",
)

EXPECTED_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".heic": "image/heic",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".pdf": "application/pdf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
}


@dataclass(frozen=True)
class Entry:
    path: str
    bytes: int
    sha256: str


def load_entries(plan_path: Path) -> list[Entry]:
    payload = json.loads(plan_path.read_text(encoding="utf-8"))
    raw_entries = payload.get("externalizableMedia")
    if not isinstance(raw_entries, list):
        raise ValueError("plan does not contain externalizableMedia")

    entries: list[Entry] = []
    seen: set[str] = set()
    for raw in raw_entries:
        if not isinstance(raw, dict) or raw.get("module") != MODULE:
            continue
        path = raw.get("path")
        size = raw.get("bytes")
        digest = raw.get("sha256")
        if not isinstance(path, str) or not path.startswith(MODULE_PREFIX):
            raise ValueError(f"invalid repository-relative path: {path!r}")
        if path in seen:
            raise ValueError(f"duplicate plan path: {path}")
        if not isinstance(size, int) or size < 0:
            raise ValueError(f"invalid byte count for {path}")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", digest):
            raise ValueError(f"invalid SHA-256 for {path}")
        seen.add(path)
        entries.append(Entry(path=path, bytes=size, sha256=digest.lower()))

    return sorted(entries, key=lambda item: item.path)


def category_for(path: str) -> str:
    relative = path[len(MODULE_PREFIX) :]
    for category in COVERAGE_CATEGORIES:
        if category == "assets/brand-emblem.png":
            if relative == category:
                return category
        elif relative.startswith(f"{category}/"):
            return category
    return "other"


def select_samples(entries: list[Entry], count: int = SAMPLE_COUNT, seed: int = SAMPLE_SEED) -> list[Entry]:
    if count < len(COVERAGE_CATEGORIES):
        raise ValueError("sample count is too small to cover all required categories")

    by_category: dict[str, list[Entry]] = {category: [] for category in COVERAGE_CATEGORIES}
    for entry in entries:
        category = category_for(entry.path)
        if category in by_category:
            by_category[category].append(entry)

    selected: list[Entry] = []
    selected_paths: set[str] = set()
    for category in COVERAGE_CATEGORIES:
        candidates = sorted(by_category[category], key=lambda item: item.path)
        if not candidates:
            raise ValueError(f"required sample category is empty: {category}")
        selected.append(candidates[0])
        selected_paths.add(candidates[0].path)

    remaining = [entry for entry in entries if entry.path not in selected_paths]
    random.Random(seed).shuffle(remaining)
    selected.extend(remaining[: count - len(selected)])
    if len(selected) != count:
        raise ValueError(f"not enough plan entries for {count} samples")
    return sorted(selected, key=lambda item: item.path)


def public_url(path: str) -> str:
    encoded_path = quote(path, safe="/%:@-._~!$&'()*+,;=")
    return f"{PUBLIC_BASE}/{encoded_path}"


def _headers(response: Any) -> dict[str, str]:
    return {str(key).lower(): str(value) for key, value in response.headers.items()}


def _error_text(error: Exception) -> str:
    if isinstance(error, HTTPError):
        return f"HTTP {error.code}"
    if isinstance(error, URLError):
        return f"{type(error).__name__}: network request failed"
    return type(error).__name__


def head_url(url: str, timeout: float, attempts: int) -> dict[str, Any]:
    last_error = ""
    last_status: int | None = None
    for attempt in range(attempts):
        request = Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
        try:
            with urlopen(request, timeout=timeout) as response:
                return {
                    "status": int(response.status),
                    "headers": _headers(response),
                    "error": None,
                    "attempts": attempt + 1,
                }
        except HTTPError as error:
            last_status = int(error.code)
            last_error = _error_text(error)
            error_headers = {str(key).lower(): str(value) for key, value in (error.headers.items() if error.headers else [])}
            if attempt + 1 == attempts:
                return {
                    "status": last_status,
                    "headers": error_headers,
                    "error": last_error,
                    "attempts": attempt + 1,
                }
        except (OSError, TimeoutError, URLError) as error:
            last_error = _error_text(error)
            if attempt + 1 == attempts:
                return {
                    "status": last_status,
                    "headers": {},
                    "error": last_error,
                    "attempts": attempt + 1,
                }
        time.sleep(0.25 * (2**attempt))

    return {"status": last_status, "headers": {}, "error": last_error, "attempts": attempts}


def get_sha256(entry: Entry, timeout: float, attempts: int) -> dict[str, Any]:
    url = public_url(entry.path)
    last_error = ""
    last_status: int | None = None
    for attempt in range(attempts):
        request = Request(url, method="GET", headers={"User-Agent": USER_AGENT})
        try:
            digest = hashlib.sha256()
            downloaded = 0
            with urlopen(request, timeout=timeout) as response:
                last_status = int(response.status)
                while True:
                    chunk = response.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    digest.update(chunk)
                    downloaded += len(chunk)
            return {
                "status": last_status,
                "bytes": downloaded,
                "sha256": digest.hexdigest(),
                "error": None,
                "attempts": attempt + 1,
            }
        except HTTPError as error:
            last_status = int(error.code)
            last_error = _error_text(error)
        except (OSError, TimeoutError, URLError) as error:
            last_error = _error_text(error)
        if attempt + 1 < attempts:
            time.sleep(0.25 * (2**attempt))

    return {
        "status": last_status,
        "bytes": 0,
        "sha256": None,
        "error": last_error,
        "attempts": attempts,
    }


def expected_mime(path: str) -> str | None:
    return EXPECTED_MIME.get(Path(path).suffix.lower())


def cache_control_ok(value: str | None) -> bool:
    if not value:
        return False
    directives = {part.strip().lower() for part in value.split(",")}
    return {
        "public",
        "max-age=86400",
        "stale-while-revalidate=604800",
    }.issubset(directives)


def content_type_ok(path: str, value: str | None) -> bool:
    expected = expected_mime(path)
    if not expected or not value:
        return False
    actual = value.split(";", 1)[0].strip().lower()
    return actual == expected


def add_failure(failures: list[dict[str, Any]], path: str, stage: str, detail: str, status: int | None = None) -> None:
    item: dict[str, Any] = {"path": path, "stage": stage, "error": detail}
    if status is not None:
        item["status"] = status
    failures.append(item)


def write_output(output_path: Path, payload: dict[str, Any]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def base_result(planned_files: int, planned_bytes: int) -> dict[str, Any]:
    return {
        "status": "FAIL",
        "module": MODULE,
        "publicBase": PUBLIC_BASE,
        "plannedFiles": planned_files,
        "plannedBytes": planned_bytes,
        "httpVerified": 0,
        "contentLengthVerified": 0,
        "worker404Failures": 0,
        "worker5xxFailures": 0,
        "otherHttpFailures": 0,
        "sha256Samples": {
            "selected": 0,
            "verified": 0,
            "failures": 0,
            "bytesVerified": 0,
            "coverage": {},
        },
        "contentTypeSamples": {"selected": 0, "verified": 0, "failures": 0},
        "cacheControlSamples": {"selected": 0, "verified": 0, "failures": 0},
        "missingObjectStatus": None,
        "failedObjects": [],
        "durationSeconds": 0.0,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT)
    parser.add_argument("--attempts", type=int, default=DEFAULT_ATTEMPTS)
    args = parser.parse_args()
    if not 1 <= args.workers <= MAX_WORKERS:
        parser.error(f"--workers must be between 1 and {MAX_WORKERS}")
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    if not 1 <= args.attempts <= 3:
        parser.error("--attempts must be between 1 and 3")
    return args


def main() -> int:
    args = parse_args()
    started = time.monotonic()
    try:
        entries = load_entries(args.plan)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        result = base_result(0, 0)
        result["failedObjects"] = [{"stage": "plan", "error": str(error)}]
        result["durationSeconds"] = round(time.monotonic() - started, 3)
        write_output(args.output, result)
        print("WORKER_VALIDATION=FAIL")
        print(f"error={error}")
        return 1

    planned_bytes = sum(entry.bytes for entry in entries)
    result = base_result(len(entries), planned_bytes)
    if len(entries) != EXPECTED_FILES or planned_bytes != EXPECTED_BYTES:
        result["failedObjects"] = [
            {
                "stage": "plan",
                "error": f"expected {EXPECTED_FILES}/{EXPECTED_BYTES}, got {len(entries)}/{planned_bytes}",
            }
        ]
        result["durationSeconds"] = round(time.monotonic() - started, 3)
        write_output(args.output, result)
        print("WORKER_VALIDATION=FAIL")
        print(f"plan={len(entries)}/{planned_bytes}")
        return 1

    samples = select_samples(entries)
    result["sha256Samples"]["selected"] = len(samples)
    result["contentTypeSamples"]["selected"] = len(samples)
    result["cacheControlSamples"]["selected"] = len(samples)
    result["sha256Samples"]["coverage"] = {
        category: sum(category_for(entry.path) == category for entry in samples)
        for category in COVERAGE_CATEGORIES
    }
    result["contentTypeSamples"]["coverage"] = result["sha256Samples"]["coverage"]
    result["cacheControlSamples"]["coverage"] = result["sha256Samples"]["coverage"]

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        head_results = list(
            executor.map(
                lambda entry: head_url(public_url(entry.path), args.timeout, args.attempts),
                entries,
            )
        )

    failures: list[dict[str, Any]] = []
    http_verified = 0
    content_length_verified = 0
    worker_404 = 0
    worker_5xx = 0
    other_http = 0
    for entry, head in zip(entries, head_results):
        status = head.get("status")
        if status == 200:
            http_verified += 1
            raw_length = head.get("headers", {}).get("content-length")
            try:
                actual_length = int(raw_length) if raw_length is not None else None
            except (TypeError, ValueError):
                actual_length = None
            if actual_length == entry.bytes:
                content_length_verified += 1
            else:
                add_failure(
                    failures,
                    entry.path,
                    "content-length",
                    f"expected {entry.bytes}, got {actual_length}",
                    status,
                )
        elif status == 404:
            worker_404 += 1
            add_failure(failures, entry.path, "head", "HTTP 404", status)
        elif isinstance(status, int) and 500 <= status <= 599:
            worker_5xx += 1
            add_failure(failures, entry.path, "head", f"HTTP {status}", status)
        else:
            other_http += 1
            add_failure(failures, entry.path, "head", head.get("error") or f"HTTP {status}", status)

    sample_head_by_path = {entry.path: head for entry, head in zip(entries, head_results)}
    content_type_verified = 0
    cache_control_verified = 0
    for entry in samples:
        head = sample_head_by_path[entry.path]
        headers = head.get("headers", {})
        if head.get("status") == 200 and content_type_ok(entry.path, headers.get("content-type")):
            content_type_verified += 1
        else:
            add_failure(
                failures,
                entry.path,
                "content-type",
                f"expected {expected_mime(entry.path)}, got {headers.get('content-type')}",
                head.get("status"),
            )
        if head.get("status") == 200 and cache_control_ok(headers.get("cache-control")):
            cache_control_verified += 1
        else:
            add_failure(
                failures,
                entry.path,
                "cache-control",
                f"expected public/max-age=86400/stale-while-revalidate=604800, got {headers.get('cache-control')}",
                head.get("status"),
            )

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(args.workers, len(samples))) as executor:
        sha_results = list(
            executor.map(
                lambda entry: get_sha256(entry, args.timeout, args.attempts),
                samples,
            )
        )

    sha_verified = 0
    sha_bytes_verified = 0
    for entry, sha_result in zip(samples, sha_results):
        if (
            sha_result.get("status") == 200
            and sha_result.get("bytes") == entry.bytes
            and sha_result.get("sha256") == entry.sha256
        ):
            sha_verified += 1
            sha_bytes_verified += entry.bytes
        else:
            add_failure(
                failures,
                entry.path,
                "sha256",
                f"expected {entry.bytes}/{entry.sha256}, got {sha_result.get('bytes')}/{sha_result.get('sha256')}",
                sha_result.get("status"),
            )

    missing_key = f"{MODULE_PREFIX}__worker_validation_missing_20260822__.webp"
    missing_result = head_url(public_url(missing_key), args.timeout, args.attempts)
    missing_status = missing_result.get("status")
    if missing_status != 404:
        add_failure(
            failures,
            missing_key,
            "missing-object",
            missing_result.get("error") or f"expected HTTP 404, got HTTP {missing_status}",
            missing_status,
        )

    result["httpVerified"] = http_verified
    result["contentLengthVerified"] = content_length_verified
    result["worker404Failures"] = worker_404
    result["worker5xxFailures"] = worker_5xx
    result["otherHttpFailures"] = other_http
    result["sha256Samples"]["verified"] = sha_verified
    result["sha256Samples"]["failures"] = len(samples) - sha_verified
    result["sha256Samples"]["bytesVerified"] = sha_bytes_verified
    result["contentTypeSamples"]["verified"] = content_type_verified
    result["contentTypeSamples"]["failures"] = len(samples) - content_type_verified
    result["cacheControlSamples"]["verified"] = cache_control_verified
    result["cacheControlSamples"]["failures"] = len(samples) - cache_control_verified
    result["missingObjectStatus"] = missing_status
    result["failedObjects"] = failures
    result["durationSeconds"] = round(time.monotonic() - started, 3)

    result["status"] = "PASS" if (
        result["httpVerified"] == EXPECTED_FILES
        and result["contentLengthVerified"] == EXPECTED_FILES
        and result["worker404Failures"] == 0
        and result["worker5xxFailures"] == 0
        and result["otherHttpFailures"] == 0
        and result["sha256Samples"]["verified"] == SAMPLE_COUNT
        and result["contentTypeSamples"]["verified"] == SAMPLE_COUNT
        and result["cacheControlSamples"]["verified"] == SAMPLE_COUNT
        and result["missingObjectStatus"] == 404
        and not failures
    ) else "FAIL"

    write_output(args.output, result)
    print(f"WORKER_VALIDATION={result['status']}")
    print(f"HTTP={result['httpVerified']}/{EXPECTED_FILES}")
    print(f"CONTENT_LENGTH={result['contentLengthVerified']}/{EXPECTED_FILES}")
    print(f"SHA256={result['sha256Samples']['verified']}/{SAMPLE_COUNT}")
    print(f"CONTENT_TYPE={result['contentTypeSamples']['verified']}/{SAMPLE_COUNT}")
    print(f"CACHE_CONTROL={result['cacheControlSamples']['verified']}/{SAMPLE_COUNT}")
    print(f"MISSING_OBJECT={result['missingObjectStatus']}")
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
