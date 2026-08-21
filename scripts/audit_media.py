#!/usr/bin/env python3
"""Inventory local media assets and their text-source references.

The default command regenerates the inventory, summary, and report and then
validates them against the current worktree.  ``--validate`` performs the
same filesystem checks without rewriting the generated artifacts.

Only media bytes are hashed.  Image/audio/PDF/font contents are never
decoded, parsed, or copied into the generated JSON.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import posixpath
import re
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from urllib.parse import unquote, urlsplit


MEDIA_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".avif",
    ".heic",
    ".tif",
    ".tiff",
    ".mp3",
    ".wav",
    ".flac",
    ".m4a",
    ".ogg",
    ".mp4",
    ".webm",
    ".mov",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
}
TEXT_EXTENSIONS = {".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".md"}

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".avif",
}
ORIGINAL_IMAGE_EXTENSIONS = {".heic", ".tif", ".tiff"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
FONT_EXTENSIONS = {".woff", ".woff2", ".ttf", ".otf"}

# These names are directory-level temporary/cache locations, not repository
# media.  Generated audit and follow-up triage artifacts are excluded from
# reference scanning so they cannot self-reference every inventory path on
# reruns.
EXCLUDED_DIRECTORY_NAMES = {
    ".git",
    ".cache",
    "cache",
    "caches",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".tox",
    ".nox",
    ".venv",
    "venv",
    "tmp",
    "temp",
    "temporary",
}
AUDIT_OUTPUT_PATHS = {
    "data/media-inventory.json",
    "data/media-audit-summary.json",
    "data/media-externalization-plan.json",
    "data/media-externalization-summary.json",
    "data/media-orphan-triage.json",
    "data/media-orphan-summary.json",
    "data/media-prune-plan.json",
    "data/shaanxi-history-externalized-media.json",
    "data/shaanxi-history-externalized-media-validation.json",
    "data/shaanxi-history-r2-pilot-summary.json",
    "data/shaanxi-history-r2-verification.json",
    "data/shaanxi-history-workers-verification.json",
    "docs/MEDIA_AUDIT.md",
    "docs/MEDIA_EXTERNALIZATION.md",
    "docs/MEDIA_ORPHAN_TRIAGE.md",
    "docs/SHAANXI_HISTORY_MEDIA_EXTERNALIZED.md",
    "docs/SHAANXI_HISTORY_R2_MIGRATION.md",
    "docs/SHAANXI_HISTORY_R2_PILOT.md",
    "docs/SHAANXI_HISTORY_WORKERS_MIGRATION.md",
}

LARGE_EMBEDDED_URI_BYTES = 100 * 1024
LARGE_BINARY_BYTES = 10 * 1024 * 1024
HASH_CHUNK_BYTES = 1024 * 1024

# The payload is deliberately captured only long enough to measure it.  No
# payload field is ever written to inventory/report output.
DATA_URI_RE = re.compile(
    r"data:(?P<mime>image/[^;,\s\"'<>]+)"
    r"(?P<params>(?:;[^;,\s\"'<>]+)*),"
    r"(?P<payload>[^\"'`\s<>)}\]]+)",
    re.IGNORECASE,
)
HTML_ATTR_RE = re.compile(
    r"\b(?:src|href|poster|data|srcset)\s*=\s*([\"'])(.*?)\1",
    re.IGNORECASE | re.DOTALL,
)
CSS_URL_RE = re.compile(
    r"url\(\s*(?P<quote>[\"']?)(?P<value>.*?)(?P=quote)\s*\)",
    re.IGNORECASE | re.DOTALL,
)
MARKDOWN_LINK_RE = re.compile(
    r"!?\[[^\]]*\]\(\s*(?:<(?P<angle>[^>]+)>|(?P<bare>[^)\s]+))",
    re.DOTALL,
)


def rel_path(repo: Path, path: Path) -> str:
    return path.relative_to(repo).as_posix()


def extension_for(path: str) -> str:
    return PurePosixPath(path).suffix.casefold()


def module_for(path: str) -> str | None:
    parts = PurePosixPath(path).parts
    if len(parts) >= 2 and parts[0] == "modules":
        return parts[1]
    return None


def iter_repo_files(repo: Path) -> Iterable[tuple[Path, str]]:
    """Yield regular, non-symlink files with deterministic POSIX paths."""

    excluded = {name.casefold() for name in EXCLUDED_DIRECTORY_NAMES}
    for root, dirnames, filenames in os.walk(repo, topdown=True, followlinks=False):
        dirnames[:] = sorted(
            name for name in dirnames if name.casefold() not in excluded
        )
        for name in sorted(filenames):
            path = Path(root) / name
            if path.is_symlink() or not path.is_file():
                continue
            yield path, rel_path(repo, path)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(HASH_CHUNK_BYTES)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def scan_media_files(repo: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path, relative in iter_repo_files(repo):
        extension = extension_for(relative)
        if extension not in MEDIA_EXTENSIONS:
            continue
        records.append(
            {
                "path": relative,
                "extension": extension,
                "bytes": path.stat().st_size,
                "module": module_for(relative),
                "sha256": sha256_file(path),
            }
        )
    return sorted(records, key=lambda record: record["path"])


def decode_text(path: Path) -> str:
    # References are text-only inputs.  Replacement decoding keeps one bad
    # byte from hiding an otherwise visible path without touching the file.
    return path.read_bytes().decode("utf-8", errors="replace")


def strip_query_hash(value: str) -> str:
    value = value.strip().replace("\\/", "/")
    lower_value = value.casefold()
    if not value or lower_value.startswith(
        ("#", "data:", "http:", "https:", "//", "file:")
    ):
        return ""
    # A repository-relative media path cannot be a multi-kilobyte source
    # blob.  This also avoids sending encrypted/catalogue payload strings to
    # URL parsing while keeping normal long filenames and query strings.
    if len(value) > 4096:
        return ""
    try:
        parsed = urlsplit(value)
    except ValueError:
        return ""
    if parsed.scheme or parsed.netloc:
        return ""
    return unquote(parsed.path).replace("\\", "/").strip()


def iter_quoted_strings(text: str) -> Iterable[str]:
    """Yield quoted spans with a linear scanner safe for minified vendor JS."""

    index = 0
    length = len(text)
    while index < length:
        if text.startswith("<!--", index):
            end = text.find("-->", index + 4)
            index = length if end < 0 else end + 3
            continue
        if text.startswith("/*", index):
            end = text.find("*/", index + 2)
            index = length if end < 0 else end + 2
            continue
        if text.startswith("//", index):
            end = text.find("\n", index + 2)
            index = length if end < 0 else end + 1
            continue
        quote = text[index]
        if quote not in {"\"", "'", "`"}:
            index += 1
            continue
        start = index + 1
        index = start
        while index < length:
            char = text[index]
            if char == "\\":
                index += 2
                continue
            if char == quote:
                yield text[start:index]
                index += 1
                break
            index += 1
        else:
            # An unterminated quote in a minified/comment-like text span does
            # not make the rest of the file a candidate string.
            return


def candidate_paths(source: str, value: str) -> list[str]:
    """Return path-semantic candidates; never use basename-only matching."""

    cleaned = strip_query_hash(value)
    if not cleaned:
        return []
    source_path = PurePosixPath(source)
    source_parent = source_path.parent.as_posix()
    candidates: list[str] = []

    if cleaned.startswith("/"):
        candidates.append(posixpath.normpath(cleaned.lstrip("/")))
    elif cleaned.startswith(("./", "../")):
        candidates.append(posixpath.normpath(posixpath.join(source_parent, cleaned)))
    elif cleaned.startswith("modules/"):
        candidates.append(posixpath.normpath(cleaned))
    else:
        # A path literal in HTML/CSS is normally relative to that file.  JS,
        # JSON, and module assets also commonly use page/module-root paths;
        # those are fallbacks only after the source-relative candidate.
        candidates.append(posixpath.normpath(posixpath.join(source_parent, cleaned)))
        source_module = module_for(source)
        if source_module:
            candidates.append(
                posixpath.normpath(posixpath.join("modules", source_module, cleaned))
            )
        if "/" in cleaned:
            candidates.append(posixpath.normpath(cleaned))

    unique: list[str] = []
    for candidate in candidates:
        if candidate in {".", ".."} or candidate.startswith("../"):
            continue
        if candidate not in unique:
            unique.append(candidate)
    return unique


def collect_text_candidates(text: str, add_candidate: Any) -> None:
    """Extract URL-like strings without treating a basename as proof."""

    # Attribute and CSS regexes are intentionally applied to comment-masked
    # text so documentation/comments cannot turn a filename into a reference.
    reference_text = re.sub(r"<!--[\s\S]*?-->|/\*[\s\S]*?\*/", "", text)

    for match in HTML_ATTR_RE.finditer(reference_text):
        value = match.group(2)
        if match.group(0).lower().lstrip().startswith("srcset") or "srcset" in match.group(0).lower():
            for item in value.split(","):
                token = item.strip().split()
                if token:
                    add_candidate(token[0])
        else:
            add_candidate(value)

    for match in CSS_URL_RE.finditer(reference_text):
        add_candidate(match.group("value"))

    for match in MARKDOWN_LINK_RE.finditer(reference_text):
        add_candidate(match.group("angle") or match.group("bare") or "")

    # This catches JSON string values and JS string/template literals.  The
    # scanner is linear and safe for compressed vendor bundles.  Data URIs
    # are discarded immediately by strip_query_hash and are not stored.
    for value in iter_quoted_strings(reference_text):
        add_candidate(value)


def scan_text_sources(
    repo: Path, media_records: list[dict[str, Any]]
) -> tuple[dict[str, dict[str, int]], list[dict[str, Any]]]:
    media_by_key = {record["path"].casefold(): record["path"] for record in media_records}
    references: dict[str, dict[str, int]] = defaultdict(dict)
    embedded: list[dict[str, Any]] = []

    for path, source in iter_repo_files(repo):
        if source in AUDIT_OUTPUT_PATHS or extension_for(source) not in TEXT_EXTENSIONS:
            continue
        text = decode_text(path)

        for match in DATA_URI_RE.finditer(text):
            payload = match.group("payload")
            is_base64 = "base64" in match.group("params").casefold()
            payload_length = len(payload.replace("\r", "").replace("\n", ""))
            approximate_bytes = (
                int(payload_length * 0.75)
                if is_base64
                else len(payload.encode("utf-8", errors="replace"))
            )
            start = match.start()
            line = text.count("\n", 0, start) + 1
            line_start = text.rfind("\n", 0, start)
            embedded.append(
                {
                    "source": source,
                    "line": line,
                    "column": start - line_start,
                    "mime": match.group("mime").lower(),
                    "base64": is_base64,
                    "approxBytes": approximate_bytes,
                    "over100KB": approximate_bytes > LARGE_EMBEDDED_URI_BYTES,
                }
            )

        resolved_targets: set[str] = set()

        def add_candidate(value: str) -> None:
            cleaned = strip_query_hash(value)
            if not cleaned:
                return
            suffix = extension_for(cleaned)
            if suffix not in MEDIA_EXTENSIONS:
                return
            for candidate in candidate_paths(source, value):
                actual = media_by_key.get(candidate.casefold())
                if actual is not None:
                    resolved_targets.add(actual)
                    break

        collect_text_candidates(text, add_candidate)
        for target in sorted(resolved_targets):
            references[target][source] = references[target].get(source, 0) + 1

    embedded.sort(key=lambda item: (item["source"], item["line"], item["column"]))
    return references, embedded


def pipeline_profile(record: dict[str, Any]) -> dict[str, Any]:
    extension = record["extension"]
    size = record["bytes"]
    roles: list[str] = []
    basis: list[str] = []
    if extension in IMAGE_EXTENSIONS:
        roles.extend(["thumb", "display"])
        basis.append("web-image-extension")
    if extension in ORIGINAL_IMAGE_EXTENSIONS:
        roles.append("original")
        basis.append("source-like-image-extension")
    if extension in AUDIO_EXTENSIONS | VIDEO_EXTENSIONS | {".pdf"} | FONT_EXTENSIONS:
        roles.append("original")
        basis.append("non-web-binary-extension")
    if size >= 1024 * 1024:
        if "original" not in roles:
            roles.append("original")
        basis.append("size-at-least-1MiB")
    return {
        "roles": roles,
        "basis": basis or ["extension-not-thumbable"],
        "heuristicOnly": True,
    }


def aggregate_directories(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[str, dict[str, int]] = defaultdict(lambda: {"fileCount": 0, "bytes": 0})
    for record in records:
        parts = PurePosixPath(record["path"]).parts
        for index in range(1, len(parts)):
            directory = "/".join(parts[:index])
            totals[directory]["fileCount"] += 1
            totals[directory]["bytes"] += record["bytes"]
    return [
        {"path": path, **totals[path]}
        for path in sorted(
            totals,
            key=lambda item: (-totals[item]["bytes"], -totals[item]["fileCount"], item),
        )
    ]


def aggregate_modules(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[str, dict[str, int]] = defaultdict(lambda: {"fileCount": 0, "bytes": 0})
    for record in records:
        module = record["module"] or "global"
        totals[module]["fileCount"] += 1
        totals[module]["bytes"] += record["bytes"]
    return [
        {"module": module, **totals[module]}
        for module in sorted(
            totals,
            key=lambda item: (-totals[item]["bytes"], -totals[item]["fileCount"], item),
        )
    ]


def aggregate_extensions(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[str, dict[str, int]] = defaultdict(lambda: {"fileCount": 0, "bytes": 0})
    for record in records:
        totals[record["extension"]]["fileCount"] += 1
        totals[record["extension"]]["bytes"] += record["bytes"]
    return [
        {"extension": extension, **totals[extension]}
        for extension in sorted(totals, key=lambda item: (-totals[item]["bytes"], item))
    ]


def build_duplicate_groups(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        by_hash[record["sha256"]].append(record)
    groups: list[dict[str, Any]] = []
    for digest, group in by_hash.items():
        if len(group) < 2:
            continue
        total_bytes = sum(item["bytes"] for item in group)
        keep_bytes = max(item["bytes"] for item in group)
        groups.append(
            {
                "sha256": digest,
                "fileCount": len(group),
                "bytes": total_bytes,
                "potentialReclaimBytes": total_bytes - keep_bytes,
                "paths": sorted(item["path"] for item in group),
            }
        )
    return sorted(
        groups,
        key=lambda item: (-item["potentialReclaimBytes"], -item["bytes"], item["sha256"]),
    )


def build_audit(repo: Path) -> dict[str, Any]:
    records = scan_media_files(repo)
    references, embedded = scan_text_sources(repo, records)
    for record in records:
        source_map = references.get(record["path"], {})
        record["referenced"] = bool(source_map)
        record["referenceCount"] = len(source_map)
        record["references"] = sorted(source_map)
        record["referenceOccurrences"] = sum(source_map.values())
        record["suspected_orphan"] = not bool(source_map)
        record["pipeline"] = pipeline_profile(record)

    duplicate_groups = build_duplicate_groups(records)
    duplicate_hashes = {group["sha256"] for group in duplicate_groups}
    for record in records:
        storage_flags: list[str] = []
        if record["bytes"] >= LARGE_BINARY_BYTES:
            storage_flags.append("large_binary_at_least_10MiB")
        if record["sha256"] in duplicate_hashes:
            storage_flags.append("duplicate_content")
        if record["extension"] in AUDIO_EXTENSIONS | VIDEO_EXTENSIONS | {".pdf"}:
            storage_flags.append("non_web_binary")
        record["git_storage_flags"] = storage_flags

    extension_stats = aggregate_extensions(records)
    module_stats = aggregate_modules(records)
    directory_stats = aggregate_directories(records)
    referenced_records = [record for record in records if record["referenced"]]
    orphan_records = [record for record in records if record["suspected_orphan"]]
    role_counts: dict[str, int] = defaultdict(int)
    for record in records:
        for role in record["pipeline"]["roles"]:
            role_counts[role] += 1
    duplicate_waste = sum(group["potentialReclaimBytes"] for group in duplicate_groups)
    embedded_bytes = sum(item["approxBytes"] for item in embedded)
    embedded_large = [item for item in embedded if item["over100KB"]]

    summary = {
        "fileCount": len(records),
        "totalBytes": sum(record["bytes"] for record in records),
        "duplicateGroups": len(duplicate_groups),
        "duplicateWasteBytes": duplicate_waste,
        "suspectedOrphanCount": len(orphan_records),
        "suspectedOrphanBytes": sum(record["bytes"] for record in orphan_records),
        "referencedMediaCount": len(referenced_records),
        "embeddedDataUriCount": len(embedded),
        "embeddedDataUriBytesApprox": embedded_bytes,
        "embeddedDataUriOver100KBCount": len(embedded_large),
        "embeddedDataUriOver100KBBytesApprox": sum(
            item["approxBytes"] for item in embedded_large
        ),
        "byExtension": extension_stats,
        "byModule": module_stats,
        "byDirectory": directory_stats,
        "topDirectories": directory_stats[:5],
        "pipelineRoleCounts": dict(sorted(role_counts.items())),
        "largeBinaryThresholdBytes": LARGE_BINARY_BYTES,
        "largeEmbeddedUriThresholdBytes": LARGE_EMBEDDED_URI_BYTES,
    }

    inventory = {
        "schemaVersion": 1,
        "scan": {
            "mediaExtensions": sorted(MEDIA_EXTENSIONS),
            "textReferenceExtensions": sorted(TEXT_EXTENSIONS),
            "excludedDirectoryNames": sorted(EXCLUDED_DIRECTORY_NAMES),
            "referenceOutputExclusions": sorted(AUDIT_OUTPUT_PATHS),
        },
        "summary": summary,
        "files": records,
        "duplicateGroups": duplicate_groups,
        "embeddedDataUris": embedded,
    }
    return {"inventory": inventory, "summary": summary}


def human_bytes(value: int) -> str:
    size = float(value)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if size < 1024 or unit == "TiB":
            return f"{size:,.2f} {unit}" if unit != "B" else f"{value:,} B"
        size /= 1024
    return f"{value:,} B"


def md(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def report_markdown(inventory: dict[str, Any]) -> str:
    summary = inventory["summary"]
    records = inventory["files"]
    duplicate_groups = inventory["duplicateGroups"]
    embedded = inventory["embeddedDataUris"]
    lines = [
        "# MEDIA AUDIT",
        "",
        f"- Media files: **{summary['fileCount']:,}**",
        f"- Total media size: **{summary['totalBytes']:,} bytes ({human_bytes(summary['totalBytes'])})**",
        f"- Referenced media: **{summary['referencedMediaCount']:,}**",
        f"- Suspected orphan media: **{summary['suspectedOrphanCount']:,}** / **{summary['suspectedOrphanBytes']:,} bytes ({human_bytes(summary['suspectedOrphanBytes'])})**; nothing was deleted.",
        f"- Embedded image data URIs: **{summary['embeddedDataUriCount']:,}** / **{summary['embeddedDataUriBytesApprox']:,} approximate bytes ({human_bytes(summary['embeddedDataUriBytesApprox'])})**",
        f"- Embedded data URIs over 100 KiB: **{summary['embeddedDataUriOver100KBCount']:,}** / **{summary['embeddedDataUriOver100KBBytesApprox']:,} approximate bytes**",
        "",
        "## By extension",
        "",
        "| Extension | Files | Bytes |",
        "|---|---:|---:|",
    ]
    for item in summary["byExtension"]:
        lines.append(f"| `{item['extension']}` | {item['fileCount']:,} | {item['bytes']:,} |")

    lines.extend(["", "## By module", "", "| Module | Files | Bytes |", "|---|---:|---:|"])
    for item in summary["byModule"]:
        lines.append(f"| `{md(item['module'])}` | {item['fileCount']:,} | {item['bytes']:,} |")

    lines.extend(
        [
            "",
            "## By directory",
            "",
            "| Directory | Files (recursive) | Bytes (recursive) |",
            "|---|---:|---:|",
        ]
    )
    for item in summary["byDirectory"][:30]:
        lines.append(f"| `{md(item['path'])}` | {item['fileCount']:,} | {item['bytes']:,} |")

    lines.extend(["", "## Largest 30 media files", "", "| # | Path | Extension | Bytes | Module | Referenced |", "|---:|---|---|---:|---|---|"])
    largest = sorted(records, key=lambda item: (-item["bytes"], item["path"]))[:30]
    for index, item in enumerate(largest, 1):
        lines.append(
            f"| {index} | `{md(item['path'])}` | `{item['extension']}` | {item['bytes']:,} | `{md(item['module'] or 'global')}` | {'yes' if item['referenced'] else 'no'} |"
        )

    lines.extend(
        [
            "",
            "## Duplicate media",
            "",
            f"- Duplicate groups: **{summary['duplicateGroups']:,}**",
            f"- Potential reclaimable duplicate space: **{summary['duplicateWasteBytes']:,} bytes ({human_bytes(summary['duplicateWasteBytes'])})**",
            "",
            "| SHA-256 | Files | Bytes | Potential reclaim | Paths |",
            "|---|---:|---:|---:|---|",
        ]
    )
    for group in duplicate_groups[:50]:
        paths = "<br>".join(f"`{md(path)}`" for path in group["paths"])
        lines.append(
            f"| `{group['sha256']}` | {group['fileCount']:,} | {group['bytes']:,} | {group['potentialReclaimBytes']:,} | {paths} |"
        )
    if not duplicate_groups:
        lines.append("| — | 0 | 0 | 0 | No duplicate groups |")

    lines.extend(
        [
            "",
            "## Suspected orphans",
            "",
            "Only the conservative `suspected_orphan` label is used. No file is deleted or moved.",
            "",
            "| Path | Bytes | Module | SHA-256 |",
            "|---|---:|---|---|",
        ]
    )
    for item in sorted(orphan_records(records), key=lambda record: (-record["bytes"], record["path"]))[:50]:
        lines.append(
            f"| `{md(item['path'])}` | {item['bytes']:,} | `{md(item['module'] or 'global')}` | `{item['sha256']}` |"
        )
    if not orphan_records(records):
        lines.append("| — | 0 | — | — |")

    lines.extend(
        [
            "",
            "## Embedded data URIs",
            "",
            "Payloads are not copied into inventory. Approximate bytes use 3/4 of base64 payload length; no image decoding is performed.",
            "",
            "| Source | Line | MIME | Base64 | Approx. bytes | >100 KiB |",
            "|---|---:|---|---|---:|---|",
        ]
    )
    for item in sorted(embedded, key=lambda entry: (-entry["approxBytes"], entry["source"], entry["line"]))[:50]:
        lines.append(
            f"| `{md(item['source'])}` | {item['line']} | `{item['mime']}` | {'yes' if item['base64'] else 'no'} | {item['approxBytes']:,} | {'yes' if item['over100KB'] else 'no'} |"
        )
    if not embedded:
        lines.append("| — | — | — | — | 0 | no |")

    lines.extend(
        [
            "",
            "## Pipeline suitability (heuristic)",
            "",
            "Roles use extension, byte size, and path/reference metadata only; no dimensions, EXIF, decoding, OCR, or content inspection was used.",
            "",
            "| Role | File count |",
            "|---|---:|",
        ]
    )
    for role in ("thumb", "display", "original"):
        lines.append(f"| `{role}` candidate | {summary['pipelineRoleCounts'].get(role, 0):,} |")

    storage_candidates = sorted(
        (item for item in records if item["git_storage_flags"]),
        key=lambda item: (-item["bytes"], item["path"]),
    )
    lines.extend(
        [
            "",
            "## Git storage candidates",
            "",
            f"Files are flagged for review when they are >= {human_bytes(LARGE_BINARY_BYTES)}, duplicate-content members, or audio/video/PDF binaries. This is an audit recommendation only; no file was changed.",
            "",
            "| Path | Bytes | Flags |",
            "|---|---:|---|",
        ]
    )
    for item in storage_candidates[:50]:
        lines.append(f"| `{md(item['path'])}` | {item['bytes']:,} | `{', '.join(item['git_storage_flags'])}` |")
    if not storage_candidates:
        lines.append("| — | 0 | none |")

    lines.extend(["", "## Priority directories", ""])
    for index, item in enumerate(summary["topDirectories"], 1):
        lines.append(
            f"{index}. `{md(item['path'])}` — {item['fileCount']:,} files, {item['bytes']:,} bytes ({human_bytes(item['bytes'])})."
        )
    lines.extend(
        [
            "",
            "## Reproducibility",
            "",
            "Run `python scripts/audit_media.py` to regenerate and validate the inventory, summary, and report. Generated artifacts omit timestamps and embedded payload contents for stable reruns.",
            "",
        ]
    )
    return "\n".join(lines)


def orphan_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [record for record in records if record["suspected_orphan"]]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def write_outputs(repo: Path, audit: dict[str, Any]) -> None:
    write_json(repo / "data" / "media-inventory.json", audit["inventory"])
    write_json(repo / "data" / "media-audit-summary.json", audit["summary"])
    report_path = repo / "docs" / "MEDIA_AUDIT.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report_markdown(audit["inventory"]), encoding="utf-8", newline="\n")


def validate_artifacts(repo: Path) -> dict[str, Any]:
    inventory_path = repo / "data" / "media-inventory.json"
    summary_path = repo / "data" / "media-audit-summary.json"
    if not inventory_path.is_file() or not summary_path.is_file():
        raise ValueError("generated inventory or summary is missing")
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    records = inventory.get("files")
    if not isinstance(records, list):
        raise ValueError("inventory.files is not a list")
    actual_records = scan_media_files(repo)
    actual_by_path = {record["path"]: record for record in actual_records}
    inventory_by_path = {record.get("path"): record for record in records}
    if len(inventory_by_path) != len(records):
        raise ValueError("inventory contains duplicate paths")
    if len(records) != len(actual_records):
        raise ValueError(
            f"inventory record count {len(records)} != actual media count {len(actual_records)}"
        )
    if set(inventory_by_path) != set(actual_by_path):
        raise ValueError("inventory paths differ from actual media paths")
    for path, actual in actual_by_path.items():
        record = inventory_by_path[path]
        full_path = repo / PurePosixPath(path)
        if not full_path.is_file():
            raise ValueError(f"inventory path does not exist: {path}")
        if record.get("bytes") != full_path.stat().st_size:
            raise ValueError(f"byte size mismatch: {path}")
        if record.get("bytes") != actual["bytes"]:
            raise ValueError(f"scanned byte size mismatch: {path}")
        if record.get("sha256") != actual["sha256"]:
            raise ValueError(f"SHA-256 mismatch: {path}")
        if record.get("extension") != actual["extension"]:
            raise ValueError(f"extension mismatch: {path}")
        if record.get("module") != actual["module"]:
            raise ValueError(f"module mismatch: {path}")
        references = record.get("references")
        if not isinstance(references, list) or references != sorted(set(references)):
            raise ValueError(f"reference list is not unique/sorted: {path}")
        if record.get("referenceCount") != len(references):
            raise ValueError(f"reference count mismatch: {path}")
        if record.get("referenced") != bool(references):
            raise ValueError(f"referenced flag mismatch: {path}")
        if record.get("suspected_orphan") != (not references):
            raise ValueError(f"suspected_orphan flag mismatch: {path}")
        for source in references:
            source_path = repo / PurePosixPath(source)
            if not source_path.is_file():
                raise ValueError(f"reference source does not exist: {source}")

    hash_to_records: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        hash_to_records[record["sha256"]].append(record)
    expected_groups = {
        group["sha256"]: group for group in inventory.get("duplicateGroups", [])
    }
    actual_group_hashes = {digest for digest, group in hash_to_records.items() if len(group) > 1}
    if set(expected_groups) != actual_group_hashes:
        raise ValueError("duplicate group hashes do not match inventory records")
    for digest, group in expected_groups.items():
        members = hash_to_records[digest]
        if any(member["sha256"] != digest for member in members):
            raise ValueError(f"duplicate group SHA mismatch: {digest}")
        if sorted(member["path"] for member in members) != sorted(group["paths"]):
            raise ValueError(f"duplicate group paths mismatch: {digest}")
        total = sum(member["bytes"] for member in members)
        waste = total - max(member["bytes"] for member in members)
        if group["bytes"] != total or group["potentialReclaimBytes"] != waste:
            raise ValueError(f"duplicate group byte mismatch: {digest}")

    expected_summary = {
        "fileCount": len(records),
        "totalBytes": sum(record["bytes"] for record in records),
        "duplicateGroups": len(expected_groups),
        "duplicateWasteBytes": sum(
            group["potentialReclaimBytes"] for group in expected_groups.values()
        ),
        "suspectedOrphanCount": sum(record["suspected_orphan"] for record in records),
        "suspectedOrphanBytes": sum(
            record["bytes"] for record in records if record["suspected_orphan"]
        ),
        "referencedMediaCount": sum(record["referenced"] for record in records),
        "embeddedDataUriCount": len(inventory.get("embeddedDataUris", [])),
        "embeddedDataUriBytesApprox": sum(
            item["approxBytes"] for item in inventory.get("embeddedDataUris", [])
        ),
    }
    for key, value in expected_summary.items():
        if summary.get(key) != value:
            raise ValueError(f"summary mismatch for {key}: {summary.get(key)} != {value}")
    for item in inventory.get("embeddedDataUris", []):
        if "payload" in item or "data" in item:
            raise ValueError("embedded data URI payload was copied into inventory")
    return {
        "fileCount": len(records),
        "totalBytes": expected_summary["totalBytes"],
        "duplicateGroups": len(expected_groups),
        "duplicateWasteBytes": expected_summary["duplicateWasteBytes"],
        "suspectedOrphanCount": expected_summary["suspectedOrphanCount"],
        "suspectedOrphanBytes": expected_summary["suspectedOrphanBytes"],
        "embeddedDataUriCount": expected_summary["embeddedDataUriCount"],
        "embeddedDataUriBytesApprox": expected_summary["embeddedDataUriBytesApprox"],
    }


def run(repo: Path, write: bool) -> int:
    if write:
        audit = build_audit(repo)
        write_outputs(repo, audit)
    result = validate_artifacts(repo)
    print("MEDIA_AUDIT=PASS")
    for key, value in result.items():
        print(f"{key}={value}")
    print("INVENTORY_VALIDATION=PASS")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument(
        "--validate",
        action="store_true",
        help="validate existing generated artifacts without rewriting them",
    )
    args = parser.parse_args()
    repo = args.repo.resolve()
    return run(repo, write=not args.validate)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
