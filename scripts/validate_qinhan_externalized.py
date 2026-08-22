#!/usr/bin/env python3
"""Freeze and validate the post-delete Qin-Han media state.

``--freeze`` hashes the exact pre-delete set from the externalization plan and
writes a recovery manifest. ``--pre-delete`` verifies that manifest. ``--validate``
is an offline post-delete validator. The existing ``validate_qinhan_r2.py``
remains the pre-delete/runtime-stage validator.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
import validate_qinhan_r2 as runtime_validator  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MODULE_ROOT = ROOT / "modules" / "qinhan"
MODULE_PREFIX = "modules/qinhan/"
PLAN_PATH = ROOT / "data" / "media-externalization-plan.json"
MANIFEST_PATH = ROOT / "data" / "qinhan-externalized-media.json"
VALIDATION_PATH = ROOT / "data" / "qinhan-externalized-media-validation.json"
DOC_PATH = ROOT / "docs" / "QINHAN_MEDIA_EXTERNALIZED.md"
UPLOAD_PATH = ROOT / "data" / "qinhan-r2-upload-verification.json"
RUNTIME_PATH = ROOT / "data" / "qinhan-r2-runtime-verification.json"
INVENTORY_PATH = ROOT / "data" / "media-inventory.json"
AUDIT_SUMMARY_PATH = ROOT / "data" / "media-audit-summary.json"
ARCHIVE_PATH = MODULE_ROOT / "data" / "archive.json"
CURRENT_PUBLIC_BASE = "https://pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev"
RETIRED_WORKER_BASE = "https://ad-fontes-media.gusgumee777.workers.dev"
EXPECTED_FILES = 1099
EXPECTED_BYTES = 199_500_311
EXPECTED_PROVENANCE_FILES = 4
MEDIA_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".heic",
    ".tif", ".tiff", ".mp3", ".wav", ".flac", ".m4a", ".ogg", ".mp4",
    ".webm", ".mov", ".pdf", ".woff", ".woff2", ".ttf", ".otf",
}
RUNTIME_FILE_NAMES = {
    "index.html", "styles.css", "motion.css", "app.js", "media-url.js",
    "seal-viewer.js",
}
WINDOWS_ABSOLUTE_RE = re.compile(r"(?i)(?<![a-z0-9])[a-z]:[\\/]")


class ValidationError(RuntimeError):
    pass


def load_json(path: Path) -> Any:
    if not path.is_file():
        raise ValidationError(f"missing JSON: {path.relative_to(ROOT).as_posix()}")
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def repo_path(value: str) -> Path:
    return ROOT.joinpath(*value.split("/"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def normalize_repo_path(value: Any) -> str:
    if not isinstance(value, str):
        raise ValidationError("media path is not a string")
    normalized = value.replace("\\", "/")
    if not normalized.startswith(MODULE_PREFIX) or normalized.startswith("/") or ".." in PurePosixPath(normalized).parts:
        raise ValidationError(f"unsafe/non-Qin-Han media path: {value}")
    return normalized


def module_media_paths() -> set[str]:
    if not MODULE_ROOT.is_dir():
        return set()
    return {
        path.relative_to(ROOT).as_posix()
        for path in MODULE_ROOT.rglob("*")
        if path.is_file() and path.suffix.lower() in MEDIA_EXTENSIONS
    }


def plan_rows() -> list[dict[str, Any]]:
    plan = load_json(PLAN_PATH)
    rows = plan.get("externalizableMedia") if isinstance(plan, dict) else None
    selected = [row for row in rows or [] if isinstance(row, dict) and row.get("module") == "qinhan"]
    if len(selected) != EXPECTED_FILES or sum(int(row.get("bytes", 0)) for row in selected) != EXPECTED_BYTES:
        raise ValidationError("QINHAN_PLAN_MISMATCH")
    return sorted(selected, key=lambda row: str(row.get("path", "")))


def build_objects(rows: list[dict[str, Any]], require_present: bool = True) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in rows:
        path = normalize_repo_path(row.get("path"))
        if path in seen:
            raise ValidationError(f"duplicate plan path: {path}")
        seen.add(path)
        if row.get("module") != "qinhan" or row.get("externalPath") != path:
            raise ValidationError(f"plan path metadata mismatch: {path}")
        expected_bytes = int(row.get("bytes", -1))
        expected_sha = str(row.get("sha256", "")).lower()
        if len(expected_sha) != 64:
            raise ValidationError(f"missing plan SHA-256: {path}")
        local = repo_path(path)
        if require_present:
            if not local.is_file():
                raise ValidationError(f"planned media is missing: {path}")
            if local.stat().st_size != expected_bytes:
                raise ValidationError(f"byte mismatch: {path}")
            if sha256_file(local) != expected_sha:
                raise ValidationError(f"SHA-256 mismatch: {path}")
        objects.append({
            "path": path,
            "bytes": expected_bytes,
            "sha256": expected_sha,
            "module": "qinhan",
            "externalPath": path,
            "objectKey": path,
        })
    if len(objects) != EXPECTED_FILES or sum(item["bytes"] for item in objects) != EXPECTED_BYTES:
        raise ValidationError("QINHAN_PLAN_MISMATCH")
    if require_present and module_media_paths() != seen:
        actual = module_media_paths()
        raise ValidationError(f"QINHAN_LOCAL_SET_MISMATCH missing={sorted(seen - actual)[:5]} extra={sorted(actual - seen)[:5]}")
    return objects


def manifest_payload(objects: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "module": "qinhan",
        "files": len(objects),
        "bytes": sum(item["bytes"] for item in objects),
        "publicBase": RETIRED_WORKER_BASE,
        "sourcePlan": "data/media-externalization-plan.json",
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "objects": objects,
    }


def load_manifest() -> dict[str, Any]:
    manifest = load_json(MANIFEST_PATH)
    objects = manifest.get("objects") if isinstance(manifest, dict) else None
    if (
        not isinstance(manifest, dict)
        or manifest.get("schemaVersion") != 1
        or manifest.get("module") != "qinhan"
        or manifest.get("files") != EXPECTED_FILES
        or manifest.get("bytes") != EXPECTED_BYTES
        or manifest.get("publicBase") != RETIRED_WORKER_BASE
        or not isinstance(objects, list)
        or len(objects) != EXPECTED_FILES
    ):
        raise ValidationError("frozen manifest header mismatch")
    paths: set[str] = set()
    for item in objects:
        if not isinstance(item, dict):
            raise ValidationError("frozen manifest object is not an object")
        path = normalize_repo_path(item.get("path"))
        if path in paths:
            raise ValidationError(f"duplicate frozen manifest path: {path}")
        paths.add(path)
        if item.get("module") != "qinhan" or item.get("externalPath") != path or item.get("objectKey") != path:
            raise ValidationError(f"frozen object key mismatch: {path}")
        if not isinstance(item.get("bytes"), int) or not isinstance(item.get("sha256"), str):
            raise ValidationError(f"frozen object metadata missing: {path}")
    if sum(item["bytes"] for item in objects) != EXPECTED_BYTES:
        raise ValidationError("frozen manifest byte total mismatch")
    return manifest


def verify_local_set(manifest: dict[str, Any], expect_present: bool) -> dict[str, int]:
    objects = manifest["objects"]
    expected = {item["path"] for item in objects}
    actual = module_media_paths()
    overlap = expected & actual
    if expect_present and actual != expected:
        raise ValidationError(f"QINHAN_LOCAL_SET_MISMATCH missing={sorted(expected - actual)[:5]} extra={sorted(actual - expected)[:5]}")
    if not expect_present and overlap:
        raise ValidationError(f"frozen media still present: {sorted(overlap)[:5]}")
    verified = 0
    if expect_present:
        for item in objects:
            local = repo_path(item["path"])
            if local.stat().st_size != item["bytes"] or sha256_file(local) != item["sha256"]:
                raise ValidationError(f"frozen local integrity mismatch: {item['path']}")
            verified += 1
    return {
        "localMediaFiles": len(actual),
        "localMediaBytes": sum(repo_path(path).stat().st_size for path in actual),
        "manifestFilesPresent": len(overlap),
        "sha256Verified": verified,
    }


def historical_worker_evidence() -> dict[str, Any]:
    upload = load_json(UPLOAD_PATH)
    for key, expected in {
        "status": "PASS", "files": EXPECTED_FILES, "bytes": EXPECTED_BYTES,
        "httpVerified": EXPECTED_FILES, "contentLengthVerified": EXPECTED_FILES,
        "sha256SamplesVerified": 40, "cacheControlSamplesVerified": 40,
        "failedObjectCount": 0,
    }.items():
        if upload.get(key) != expected:
            raise ValidationError(f"historical upload evidence mismatch: {key}")
    runtime = load_json(RUNTIME_PATH)
    for key, expected in {
        "runtimeRoutingStatus": "PASS", "totalUniqueRuntimeMediaFiles": EXPECTED_FILES,
        "directLocalRuntimeRequests": 0, "runtimeOldR2DevReferences": 0,
        "provenanceWorkerResolved": EXPECTED_PROVENANCE_FILES,
        "provenanceLocalRuntimeRequests": 0,
    }.items():
        if runtime.get(key) != expected:
            raise ValidationError(f"historical runtime evidence mismatch: {key}")
    browser = runtime.get("browserSmoke") or {}
    if browser.get("status") != "PASS" or browser.get("mediaFailures") != 0:
        raise ValidationError("historical browser smoke evidence is not PASS")
    return {
        "upload": {
            "historical": True, "status": upload.get("status"), "files": upload.get("files"),
            "bytes": upload.get("bytes"), "http": upload.get("httpVerified"),
            "contentLength": upload.get("contentLengthVerified"),
            "sha256Samples": upload.get("sha256SamplesVerified"),
            "cacheControlSamples": upload.get("cacheControlSamplesVerified"),
        },
        "runtime": {
            "historical": True, "status": runtime.get("status"),
            "runtimeRoutingStatus": runtime.get("runtimeRoutingStatus"),
            "totalUniqueRuntimeMediaFiles": runtime.get("totalUniqueRuntimeMediaFiles"),
            "directLocalRuntimeRequests": runtime.get("directLocalRuntimeRequests"),
            "runtimeOldR2DevReferences": runtime.get("runtimeOldR2DevReferences"),
            "browserSmoke": browser,
            "provenanceWorkerResolved": runtime.get("provenanceWorkerResolved"),
            "provenanceLocalRuntimeRequests": runtime.get("provenanceLocalRuntimeRequests"),
            "terminalNetworkStatus": runtime.get("terminalNetworkStatus"),
        },
    }


def runtime_routing(manifest: dict[str, Any]) -> dict[str, Any]:
    frozen = {item["path"] for item in manifest["objects"]}
    texts = runtime_validator.runtime_texts()
    static_occurrences, static_paths = runtime_validator.static_external_paths(texts)
    dynamic_fields, dynamic_paths = runtime_validator.archive_media_fields(load_json(ARCHIVE_PATH))
    provenance_text = texts.get("assets/editorial/provenance-trails.js", "")
    provenance_paths = runtime_validator.provenance_media_paths(provenance_text)
    provenance_checks = runtime_validator.provenance_resolver_checks(provenance_text)
    covered = static_paths | dynamic_paths
    missing = sorted(frozen - covered)
    extra = sorted(covered - frozen)
    if missing or extra:
        raise ValidationError(f"runtime coverage mismatch missing={missing[:5]} extra={extra[:5]}")
    if len(provenance_paths) != EXPECTED_PROVENANCE_FILES or any(path not in frozen for path in provenance_paths):
        raise ValidationError("provenance media set mismatch")
    if not all(provenance_checks.values()):
        raise ValidationError(f"provenance resolver checks failed: {provenance_checks}")
    direct_hits = runtime_validator.direct_local_runtime_hits(texts, frozen)
    runtime_text = "\n".join(texts.get(name, "") for name in sorted(RUNTIME_FILE_NAMES)) + "\n" + provenance_text
    retired_count = runtime_text.count(RETIRED_WORKER_BASE)
    file_count = len(re.findall(r"(?i)\bfile://", runtime_text))
    windows_count = len(WINDOWS_ABSOLUTE_RE.findall(runtime_text))
    double_count = runtime_text.count("modules/qinhan/modules/qinhan/")
    if CURRENT_PUBLIC_BASE not in runtime_text or retired_count or file_count or windows_count or double_count or direct_hits:
        raise ValidationError(
            f"runtime path failure current={CURRENT_PUBLIC_BASE in runtime_text} retired={retired_count} file={file_count} "
            f"windows={windows_count} double={double_count} direct={direct_hits[:3]}"
        )
    if not provenance_checks.get("qinhanUsesMediaResolver") or not provenance_checks.get("qinhanResolverCall"):
        raise ValidationError("provenance does not use qinhanMediaUrl")
    return {
        "runtimeCoverage": len(covered), "runtimeCoverageMissing": missing,
        "runtimeCoverageExtra": extra, "staticWorkerReferenceOccurrences": len(static_occurrences),
        "staticWorkerUniqueFiles": len(static_paths), "dynamicMediaFieldValues": len(dynamic_fields),
        "dynamicUniqueFiles": len(dynamic_paths), "directLocalRuntimeRequests": len(direct_hits),
        "retiredWorkerReferences": retired_count, "doubleModulePrefix": double_count,
        "fileUriReferences": file_count, "windowsAbsoluteRuntimePaths": windows_count,
        "provenanceMediaFiles": len(provenance_paths), "provenanceExternalResolved": len(provenance_paths),
        "provenanceLocalRuntimeRequests": 0, "provenanceResolverChecks": provenance_checks,
    }


def current_audit_state() -> dict[str, int]:
    inventory = load_json(INVENTORY_PATH)
    records = inventory.get("files") if isinstance(inventory, dict) else None
    if not isinstance(records, list):
        raise ValidationError("current media inventory is missing files")
    if any(str(record.get("path", "")).startswith(MODULE_PREFIX) for record in records):
        raise ValidationError("Qin-Han media remains in current inventory")
    audit_summary = load_json(AUDIT_SUMMARY_PATH)
    plan = load_json(PLAN_PATH)
    externalizable = plan.get("externalizableMedia") if isinstance(plan, dict) else None
    if not isinstance(externalizable, list):
        raise ValidationError("current externalization plan is missing externalizableMedia")
    if any(row.get("module") == "qinhan" for row in externalizable):
        raise ValidationError("Qin-Han remains in current externalizable plan")
    return {
        "postDeleteInventoryFiles": int(audit_summary.get("fileCount", len(records))),
        "postDeleteInventoryBytes": int(audit_summary.get("totalBytes", sum(int(row.get("bytes", 0)) for row in records))),
        "postDeleteExternalizableFiles": len(externalizable),
        "postDeleteExternalizableBytes": sum(int(row.get("bytes", 0)) for row in externalizable),
    }


def binary_change_counts() -> dict[str, int]:
    result = subprocess.run(["git", "diff", "--name-status", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=False)
    additions = modifications = deletions = 0
    for line in result.stdout.splitlines():
        fields = line.split("\t")
        if len(fields) < 2:
            continue
        status = fields[0][0]
        paths = fields[1:] if status in {"R", "C"} else fields[1:2]
        for path in paths:
            if Path(path).suffix.lower() not in MEDIA_EXTENSIONS:
                continue
            if status == "D":
                deletions += 1
            elif status in {"A", "C"}:
                additions += 1
            elif status in {"M", "R", "T", "U"}:
                modifications += 1
    untracked = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"], cwd=ROOT, capture_output=True, text=True, check=False)
    additions += sum(Path(path).suffix.lower() in MEDIA_EXTENSIONS for path in untracked.stdout.splitlines() if path)
    return {"binaryAdditions": additions, "binaryModifications": modifications, "binaryDeletions": deletions}


def historical_deletion_evidence() -> dict[str, Any]:
    """Read the frozen deletion-day record strictly; it is history, never rewritten."""
    record = load_json(VALIDATION_PATH)
    required = {
        "status": "PASS",
        "module": "qinhan",
        "frozenFiles": EXPECTED_FILES,
        "frozenBytes": EXPECTED_BYTES,
        "deletedFiles": EXPECTED_FILES,
        "deletedBytes": EXPECTED_BYTES,
        "binaryAdditions": 0,
        "binaryModifications": 0,
        "binaryDeletions": EXPECTED_FILES,
    }
    mismatches = [f"{key}={record.get(key)!r}" for key, expected in required.items() if record.get(key) != expected]
    if mismatches:
        raise ValidationError(f"historical deletion evidence mismatch: {'; '.join(mismatches)}")
    return {
        "files": int(record["deletedFiles"]),
        "bytes": int(record["deletedBytes"]),
        "binaryAdditions": int(record["binaryAdditions"]),
        "binaryModifications": int(record["binaryModifications"]),
        "binaryDeletions": int(record["binaryDeletions"]),
    }


def browser_payload(args: argparse.Namespace) -> dict[str, Any]:
    return {
        "status": args.browser_smoke, "detail": args.browser_detail,
        "consoleErrors": args.browser_console_errors, "consoleWarnings": args.browser_console_warnings,
        "provenanceMedia": args.browser_provenance_media, "provenanceMediaLoaded": args.browser_provenance_loaded,
        "provenanceExternalHttp": args.browser_provenance_http,
        "provenanceLocalRequests": args.browser_provenance_local_requests,
        "archiveDialogsChecked": args.browser_archive_dialogs, "archiveCardsChecked": args.browser_archive_cards,
        "thumbnailSwitch": args.browser_thumbnail_switch, "cropFullSwitch": args.browser_crop_full_switch,
        "mediaFailures": args.browser_media_failures, "localNetworkMediaRequests": args.local_network_media_requests,
    }


def build_document(summary: dict[str, Any]) -> str:
    browser = summary["browserSmoke"]
    historical = summary["historicalWorkerVerification"]
    upload = historical["upload"]
    runtime = historical["runtime"]
    return f"""# Qin-Han media externalized

- Status: **{summary['status']}**
- Current tree reduction: **{summary['deletedFiles']:,} local media files / {summary['deletedBytes']:,} bytes removed**
- Frozen recovery manifest: `data/qinhan-externalized-media.json` ({summary['frozenFiles']:,} files / {summary['frozenBytes']:,} bytes)
- Current R2 runtime base: `{CURRENT_PUBLIC_BASE}`
- Runtime coverage: **{summary['runtimeCoverage']:,}/{summary['frozenFiles']:,}**; direct local runtime requests **{summary['directLocalRuntimeRequests']}**; retired `workers.dev` references **{summary['retiredWorkerReferences']}**
- Provenance external routing: **{summary['provenanceExternalResolved']}/{summary['provenanceMediaFiles']}**; local provenance requests **{summary['provenanceLocalRuntimeRequests']}**
- Historical upload evidence: **{upload['status']}**, {upload['files']:,} files / {upload['bytes']:,} bytes; HTTP {upload['http']:,}; Content-Length {upload['contentLength']:,}; SHA256 samples {upload['sha256Samples']}; Cache-Control samples {upload['cacheControlSamples']}
- Historical runtime evidence: routing **{runtime['runtimeRoutingStatus']}**, browser smoke **{runtime['browserSmoke'].get('status')}**; terminal Worker status was **{runtime.get('terminalNetworkStatus', 'BLOCKED')}**
- Post-delete browser smoke: **{browser['status']}**; console errors **{browser['consoleErrors']}**; media failures **{browser['mediaFailures']}**; local media network requests **{browser['localNetworkMediaRequests']}**
- Post-delete audit: **{summary['postDeleteInventoryFiles']:,} files / {summary['postDeleteInventoryBytes']:,} bytes**; current externalizable plan **{summary['postDeleteExternalizableFiles']:,} files / {summary['postDeleteExternalizableBytes']:,} bytes**
- Binary changes: additions **{summary['binaryAdditions']}**, modifications **{summary['binaryModifications']}**, deletions **{summary['binaryDeletions']}**

The local Qin-Han copies were removed only after the frozen manifest, local size/SHA-256 checks, historical Worker evidence, and runtime routing checks passed. The R2/Worker objects were not modified, the Worker and Qin-Han runtime URLs were not changed, and no other module was processed.

`scripts/validate_qinhan_r2.py` remains the pre-delete/runtime-stage validator because it expects local Qin-Han media to exist. Use `scripts/validate_qinhan_externalized.py --validate` for the post-delete state.

This reduces the **current tree** only. Git history still retains the old media blobs; this task does not rewrite Git history. The frozen manifest is the recovery reference for any future local restoration.
"""


def freeze() -> int:
    objects = build_objects(plan_rows(), require_present=True)
    write_json(MANIFEST_PATH, manifest_payload(objects))
    print("QINHAN_FROZEN_MANIFEST=PASS")
    print(f"files={len(objects)}")
    print(f"bytes={sum(item['bytes'] for item in objects)}")
    print(f"sha256Verified={len(objects)}")
    return 0


def pre_delete() -> int:
    manifest = load_manifest()
    local = verify_local_set(manifest, expect_present=True)
    evidence = historical_worker_evidence()
    routing = runtime_routing(manifest)
    print("QINHAN_PRE_DELETE=PASS")
    print(f"localMediaFiles={local['localMediaFiles']}")
    print(f"localMediaBytes={local['localMediaBytes']}")
    print(f"sha256Verified={local['sha256Verified']}")
    print(f"runtimeCoverage={routing['runtimeCoverage']}")
    print(f"historicalUpload={evidence['upload']['status']}")
    print(f"historicalRuntimeRouting={evidence['runtime']['runtimeRoutingStatus']}")
    return 0


def validate(args: argparse.Namespace) -> int:
    manifest = load_manifest()
    local = verify_local_set(manifest, expect_present=False)
    evidence = historical_worker_evidence()
    deletion_evidence = historical_deletion_evidence()
    routing = runtime_routing(manifest)
    current = current_audit_state()
    binary = binary_change_counts()
    browser = browser_payload(args)
    if browser["status"] == "PASS" and (browser["consoleErrors"] or browser["mediaFailures"] or browser["localNetworkMediaRequests"]):
        raise ValidationError("browser smoke reported errors, media failures, or local requests")
    # Current worktree safety: a committed post-delete tree must hold no media
    # binary changes at all. The 1099 deletions live in the historical record.
    if binary["binaryAdditions"] or binary["binaryModifications"] or binary["binaryDeletions"]:
        raise ValidationError(f"current worktree holds unexpected media binary changes: {binary}")
    summary: dict[str, Any] = {
        "status": "PASS", "module": "qinhan", "frozenFiles": EXPECTED_FILES, "frozenBytes": EXPECTED_BYTES,
        "preDeleteLocalExists": EXPECTED_FILES, "preDeleteSha256Verified": EXPECTED_FILES,
        "deletedFiles": EXPECTED_FILES - local["manifestFilesPresent"], "deletedBytes": EXPECTED_BYTES,
        "localCopiesPresent": local["manifestFilesPresent"], "runtimeCoverage": routing["runtimeCoverage"],
        "runtimeCoverageMissing": routing["runtimeCoverageMissing"], "runtimeCoverageExtra": routing["runtimeCoverageExtra"],
        "directLocalRuntimeRequests": routing["directLocalRuntimeRequests"], "retiredWorkerReferences": routing["retiredWorkerReferences"],
        "provenanceMediaFiles": routing["provenanceMediaFiles"], "provenanceExternalResolved": routing["provenanceExternalResolved"],
        "provenanceLocalRuntimeRequests": routing["provenanceLocalRuntimeRequests"], "browserSmoke": browser,
        "browserMediaFailures": browser["mediaFailures"], "localNetworkMediaRequests": browser["localNetworkMediaRequests"],
        "terminalWorkerNetwork": args.terminal_worker_network, "historicalWorkerVerification": evidence,
        "historicalDeletionEvidence": deletion_evidence,
        **binary, **current,
    }
    if summary["deletedFiles"] != EXPECTED_FILES or summary["localCopiesPresent"] != 0:
        raise ValidationError("frozen Qin-Han local copies were not deleted exactly")
    # --validate is read-only for tracked history: data/qinhan-externalized-media-validation.json
    # and docs/QINHAN_MEDIA_EXTERNALIZED.md stay untouched. An optional untracked
    # artifact may be requested with --output.
    if args.output:
        write_json(Path(args.output), summary)
    print("QINHAN_EXTERNALIZED=PASS")
    for key in ("frozenFiles", "frozenBytes", "deletedFiles", "deletedBytes", "localCopiesPresent", "runtimeCoverage", "directLocalRuntimeRequests", "retiredWorkerReferences", "provenanceExternalResolved", "binaryAdditions", "binaryModifications", "binaryDeletions"):
        print(f"{key}={summary[key]}")
    print(
        "historicalDeletionEvidence="
        f"{deletion_evidence['files']}/{deletion_evidence['bytes']}"
        f" binary={deletion_evidence['binaryAdditions']}/{deletion_evidence['binaryModifications']}/{deletion_evidence['binaryDeletions']}"
    )
    print(f"browserSmoke={browser['status']}")
    print(f"terminalWorkerNetwork={args.terminal_worker_network}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--freeze", action="store_true")
    modes.add_argument("--pre-delete", action="store_true")
    modes.add_argument("--validate", action="store_true")
    parser.add_argument("--browser-smoke", choices=("PASS", "SKIPPED"), default="SKIPPED")
    parser.add_argument("--browser-detail", default="")
    parser.add_argument("--browser-console-errors", type=int, default=0)
    parser.add_argument("--browser-console-warnings", type=int, default=0)
    parser.add_argument("--browser-provenance-media", type=int, default=0)
    parser.add_argument("--browser-provenance-loaded", type=int, default=0)
    parser.add_argument("--browser-provenance-http", type=int, default=0)
    parser.add_argument("--browser-provenance-local-requests", type=int, default=0)
    parser.add_argument("--browser-archive-dialogs", type=int, default=0)
    parser.add_argument("--browser-archive-cards", type=int, default=0)
    parser.add_argument("--browser-thumbnail-switch", default="SKIPPED")
    parser.add_argument("--browser-crop-full-switch", default="SKIPPED")
    parser.add_argument("--browser-media-failures", type=int, default=0)
    parser.add_argument("--local-network-media-requests", type=int, default=0)
    parser.add_argument("--terminal-worker-network", choices=("PASS", "BLOCKED"), default="BLOCKED")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="optional untracked artifact path for the current validation summary (e.g. artifacts/qinhan-externalized-current-validation.json)",
    )
    args = parser.parse_args()
    if args.freeze:
        return freeze()
    if args.pre_delete:
        return pre_delete()
    return validate(args)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValidationError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
