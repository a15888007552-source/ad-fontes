#!/usr/bin/env python3
"""Build a vendor-neutral, repository-relative media externalization plan.

This planner reads the existing media inventory and orphan triage outputs. It
does not scan or rewrite media bytes, and it does not change page references.
"""

from __future__ import annotations

import json
import posixpath
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = ROOT / "data" / "media-inventory.json"
TRIAGE_PATH = ROOT / "data" / "media-orphan-triage.json"
PLAN_PATH = ROOT / "data" / "media-externalization-plan.json"
SUMMARY_PATH = ROOT / "data" / "media-externalization-summary.json"
DOC_PATH = ROOT / "docs" / "MEDIA_EXTERNALIZATION.md"

DIRECT_REFERENCE_TYPES = {
    "html_src",
    "html_srcset",
    "html_href",
    "css_url",
    "json_literal",
    "js_literal",
}
TEXT_EXTENSIONS = {
    ".cjs",
    ".css",
    ".htm",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".sass",
    ".scss",
    ".txt",
    ".toml",
    ".yaml",
    ".yml",
}
ABSOLUTE_OR_EXTERNAL = re.compile(r"^(?:[A-Za-z]:[\\/]|\\\\|/|file://|https?://)", re.I)
HTML_ATTRIBUTE = re.compile(
    r"\b(?P<name>srcset|src|href)\s*=\s*(?P<quote>[\"'])(?P<value>.*?)(?P=quote)",
    re.I | re.S,
)
CSS_URL = re.compile(r"url\(\s*(?P<quote>[\"']?)(?P<value>.*?)(?P=quote)\s*\)", re.I | re.S)
SOURCE_TEXT_CACHE: dict[str, str] = {}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def posix_path(value: str) -> str:
    return value.replace("\\", "/")


def local_file(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = posix_path(value).strip()
    if not candidate or ABSOLUTE_OR_EXTERNAL.match(candidate):
        return None
    candidate = candidate.split("?", 1)[0].split("#", 1)[0]
    if not candidate or candidate.startswith("../"):
        return None
    path = ROOT / Path(*candidate.split("/"))
    try:
        resolved = path.resolve()
        resolved.relative_to(ROOT.resolve())
    except (OSError, ValueError):
        return None
    return candidate if resolved.is_file() else None


def module_label(module: Any) -> str:
    return module if isinstance(module, str) and module else "global"


def suffixless(value: str) -> str:
    return value.split("?", 1)[0].split("#", 1)[0]


def source_forms(source: str, target: str) -> set[str]:
    source_dir = posixpath.dirname(source) or "."
    relative = posixpath.relpath(target, source_dir)
    forms = {target, relative}
    if relative != "." and not relative.startswith("."):
        forms.add("./" + relative)
    forms.update(item.replace("/", "\\") for item in tuple(forms))
    return forms


def token_matches(value: str, forms: set[str]) -> bool:
    token = suffixless(value.strip().strip("\"'"))
    token = token.replace("\\", "/")
    normalized_forms = {suffixless(item).replace("\\", "/") for item in forms}
    if token in normalized_forms:
        return True
    if token.startswith("./") and token[2:] in normalized_forms:
        return True
    return False


def read_source(source: str, cache: dict[str, str]) -> str:
    source = posix_path(source)
    if source in cache:
        return cache[source]
    path = local_file(source)
    if not path:
        cache[source] = ""
        return ""
    try:
        text = (ROOT / Path(*path.split("/"))).read_text(encoding="utf-8", errors="replace")
    except (OSError, UnicodeError):
        text = ""
    cache[source] = text
    return text


def is_manifest_source(source: str, evidence: dict[str, Any]) -> bool:
    basename = posixpath.basename(source).lower()
    if any(
        marker in basename
        for marker in ("manifest", "artifact", "photo-index", "crop-manifest", "assets.json")
    ):
        return True
    return source in {
        posix_path(item)
        for key in ("manifestMatches", "manifestBasenameMatches")
        for item in evidence.get(key, [])
        if isinstance(item, str)
    }


def direct_types_for_source(source: str, target: str, text: str) -> set[str]:
    """Classify a literal reference without using basename-only evidence."""
    if not text:
        return set()
    forms = source_forms(source, target)
    extension = Path(source).suffix.lower()
    found: set[str] = set()

    if extension in {".html", ".htm"}:
        for match in HTML_ATTRIBUTE.finditer(text):
            name = match.group("name").lower()
            values = match.group("value").split(",") if name == "srcset" else [match.group("value")]
            for item in values:
                item = item.strip()
                if not item:
                    continue
                item = item.split(None, 1)[0]
                if token_matches(item, forms):
                    found.add({"src": "html_src", "srcset": "html_srcset", "href": "html_href"}[name])
                    break
        # Inline style attributes use the same CSS url(...) syntax and are
        # still direct, mechanically rewritable references.
        for match in CSS_URL.finditer(text):
            if token_matches(match.group("value"), forms):
                found.add("css_url")
                break
    elif extension == ".css":
        for match in CSS_URL.finditer(text):
            if token_matches(match.group("value"), forms):
                found.add("css_url")
                break
    elif extension == ".json":
        if any(form.replace("\\", "/") in text for form in forms):
            found.add("json_literal")
    elif extension in {".js", ".mjs", ".cjs"}:
        if any(form.replace("\\", "/") in text for form in forms):
            found.add("js_literal")
    elif any(form.replace("\\", "/") in text for form in forms):
        found.add("other")

    return found


def dynamic_types(kind: str) -> set[str]:
    if kind == "template_literal":
        return {"js_template", "dynamic_runtime"}
    if kind == "string_concatenation":
        return {"js_concatenation", "dynamic_runtime"}
    return {"dynamic_runtime", "other"}


def evidence_sources(evidence: dict[str, Any]) -> set[str]:
    sources: set[str] = set()
    for item in evidence.get("dynamicReferences", []):
        if isinstance(item, dict) and isinstance(item.get("source"), str):
            sources.add(posix_path(item["source"]))
    for key in (
        "manifestMatches",
        "manifestBasenameMatches",
        "pythonBuildReferences",
        "htmlDataAttributes",
        "cssUrlMatches",
        "indirectPathMatches",
        "externalReferences",
    ):
        for item in evidence.get(key, []):
            if isinstance(item, str):
                candidate = local_file(item)
                if candidate:
                    sources.add(candidate)
    return sources


def reference_context(row: dict[str, Any], triage: dict[str, Any] | None) -> tuple[list[str], set[str], int]:
    evidence = (triage or {}).get("evidence", {})
    source_names = {posix_path(item) for item in row.get("references", []) if isinstance(item, str)}
    source_names.update(evidence_sources(evidence))
    source_names = {item for item in source_names if local_file(item)}
    types: set[str] = set()
    dynamic_count = 0

    dynamic_by_source: dict[str, set[str]] = defaultdict(set)
    for item in evidence.get("dynamicReferences", []):
        if not isinstance(item, dict):
            continue
        source = local_file(item.get("source"))
        if not source:
            continue
        dynamic_by_source[source].update(dynamic_types(str(item.get("kind", ""))))
        dynamic_count += 1

    manifest_sources = {
        posix_path(item)
        for key in ("manifestMatches", "manifestBasenameMatches")
        for item in evidence.get(key, [])
        if isinstance(item, str) and local_file(item)
    }

    for source in sorted(source_names):
        source_types = set(dynamic_by_source.get(source, set()))
        source_text = read_source(source, SOURCE_TEXT_CACHE)
        source_types.update(direct_types_for_source(source, row["path"], source_text))
        if source in manifest_sources or is_manifest_source(source, evidence):
            source_types.add("manifest")
        if not source_types:
            source_types.add("other")
        types.update(source_types)

    if evidence.get("dynamicReferences"):
        types.add("dynamic_runtime")
    if evidence.get("manifestMatches"):
        types.add("manifest")
    if not types:
        types.add("other")
    return sorted(source_names), types, dynamic_count


def risk_for(types: set[str]) -> str:
    if "dynamic_runtime" in types:
        return "high"
    if types.intersection({"manifest", "js_template", "js_concatenation", "other"}):
        return "medium"
    return "low"


def usage_for(referenced: bool, triage: dict[str, Any] | None, types: set[str]) -> str:
    parts: list[str] = []
    if referenced:
        parts.append("referenced local media")
    if triage and triage.get("classification") == "probable_dynamic_reference":
        parts.append("probable dynamic runtime media")
    if "manifest" in types:
        parts.append("manifest-backed filename mapping")
    return "; ".join(parts) if parts else "retained website media"


def compact_triage(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "path": row["path"],
        "bytes": row["bytes"],
        "module": row.get("module"),
        "sha256": row.get("sha256"),
        "classification": row.get("classification"),
        "confidence": row.get("confidence"),
        "reason": row.get("reason", ""),
        "relatedFiles": sorted(
            {posix_path(item) for item in row.get("relatedFiles", []) if isinstance(item, str)}
        ),
    }


def sum_bytes(rows: Iterable[dict[str, Any]]) -> int:
    return sum(int(row.get("bytes", 0)) for row in rows)


def count_bytes(rows: Iterable[dict[str, Any]]) -> dict[str, int]:
    rows = list(rows)
    return {"files": len(rows), "bytes": sum_bytes(rows)}


def grouped_stats(rows: list[dict[str, Any]], key_function) -> dict[str, dict[str, int]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        groups[str(key_function(row))].append(row)
    return {key: count_bytes(groups[key]) for key in sorted(groups)}


def build_pilot(inventory_rows: list[dict[str, Any]], externalizable: list[dict[str, Any]], triage_by_path: dict[str, dict[str, Any]]) -> dict[str, Any]:
    prefix = "modules/shaanxi-history/"
    inventory_by_path = {row["path"]: row for row in inventory_rows}
    module_rows = [row for row in inventory_rows if row["path"].startswith(prefix)]
    pilot_rows = [row for row in externalizable if row["path"].startswith(prefix)]
    pilot_triage = [
        triage_by_path[row["path"]]
        for row in module_rows
        if row["path"] in triage_by_path
        and triage_by_path[row["path"]].get("classification") == "probable_dynamic_reference"
    ]

    def under(directory: str) -> list[dict[str, Any]]:
        return [row for row in module_rows if row["path"].startswith(prefix + directory + "/")]

    static_rows = [row for row in pilot_rows if inventory_by_path[row["path"]].get("referenced")]
    dynamic_rows = [row for row in pilot_rows if row["path"] in {item["path"] for item in pilot_triage}]
    auto_rows = [
        row
        for row in static_rows
        if set(row.get("referenceType", [])) <= DIRECT_REFERENCE_TYPES
    ]
    dynamic_reference_count = sum(
        len(triage_by_path[row["path"]].get("evidence", {}).get("dynamicReferences", []))
        or 1
        for row in dynamic_rows
    )
    static_reference_count = sum(len(row.get("references", [])) for row in static_rows)

    return {
        "module": "shaanxi-history",
        "totalMedia": count_bytes(module_rows),
        "externalizableMedia": count_bytes(pilot_rows),
        "staticReferencedFiles": len(static_rows),
        "staticReferenceCount": static_reference_count,
        "dynamicReferencedFiles": len(dynamic_rows),
        "dynamicReferenceCount": dynamic_reference_count,
        "cardCovers": count_bytes(under("assets/card-covers")),
        "photos": count_bytes(under("assets/photos")),
        "supplement": count_bytes(under("assets/supplement")),
        "autoRewritableReferenceCount": sum(len(row.get("references", [])) for row in auto_rows),
        "resolverRequiredDynamicReferenceCount": dynamic_reference_count,
    }


def build_markdown(summary: dict[str, Any], pilot: dict[str, Any]) -> str:
    risk = summary["byMigrationRisk"]
    return f"""# Media externalization plan

Generated by `scripts/plan_media_externalization.py` from the current
`data/media-inventory.json` and `data/media-orphan-triage.json`.

This PR is planning-only: it does not move, delete, compress, re-encode, or
rewrite any media or page URL. `externalPath` remains the original
repository-relative path, and no external host is configured.

## Current plan

- Externalizable retained website media: **{summary['totalExternalizableFiles']:,} files / {summary['totalExternalizableBytes']:,} bytes**
- Low risk: **{risk['low']['files']:,} files / {risk['low']['bytes']:,} bytes**
- Medium risk: **{risk['medium']['files']:,} files / {risk['medium']['bytes']:,} bytes**
- High risk: **{risk['high']['files']:,} files / {risk['high']['bytes']:,} bytes**
- Dynamic-runtime media: **{summary['dynamicRuntimeFiles']:,} files / {summary['dynamicRuntimeBytes']:,} bytes**
- Source originals kept separate from the first migration batch: **{summary['sourceOriginalFiles']:,} files / {summary['sourceOriginalBytes']:,} bytes**
- Unreferenced generated derivatives excluded from the website migration set: **{summary['unreferencedGeneratedFiles']:,} files / {summary['unreferencedGeneratedBytes']:,} bytes**

## Shaanxi History pilot

- Total media: **{pilot['totalMedia']['files']:,} files / {pilot['totalMedia']['bytes']:,} bytes**
- Externalizable media: **{pilot['externalizableMedia']['files']:,} files / {pilot['externalizableMedia']['bytes']:,} bytes**
- Static reference files / occurrences: **{pilot['staticReferencedFiles']:,} / {pilot['staticReferenceCount']:,}**
- Dynamic reference files / occurrences: **{pilot['dynamicReferencedFiles']:,} / {pilot['dynamicReferenceCount']:,}**
- `card-covers`: **{pilot['cardCovers']['files']:,} files / {pilot['cardCovers']['bytes']:,} bytes**
- `photos`: **{pilot['photos']['files']:,} files / {pilot['photos']['bytes']:,} bytes**
- `supplement`: **{pilot['supplement']['files']:,} files / {pilot['supplement']['bytes']:,} bytes**
- Automatically rewritable direct references: **{pilot['autoRewritableReferenceCount']:,}**
- Dynamic references requiring the resolver: **{pilot['resolverRequiredDynamicReferenceCount']:,}**

## Protocol

### Phase A — resolver and plan

Keep `shared/js/media-url.js` as the only URL-resolution seam. Its default
`local` mode returns the input unchanged. Do not wire it into existing pages
until an external host exists and the plan has been reviewed.

### Phase B — external media host

Create and validate a media host outside this repository. The host must retain
the exact repository-relative directory structure. This repository does not
choose or hard-code GitHub media, R2, S3, CDN, or any other vendor.

### Phase C — Shaanxi History pilot

Migrate only an approved subset of `modules/shaanxi-history/` after its static
and dynamic references have been mapped. Static paths may be rewritten only
after validation; manifest, template, concatenation, and runtime paths must go
through the resolver or their existing data-loading path.

### Phase D — verify every resource

Run the local HTTP smoke test and verify every pilot resource returns HTTP 200,
including query/hash variants and all dynamically generated paths.

### Phase E — other modules

Extend the same review and validation process module by module. Keep source
originals and unresolved/unknown files out of the first migration batch.

### Phase F — remove only after stability

After the external host and site have remained stable, delete only the
explicitly approved externalized media from the current repository tree. This
phase is not part of this PR.

### Phase G — shrink Git history last

Only after all media has been stable outside the repository should Git history
be considered for shrinking. This PR does not modify Git history.

The media host must remain decoupled from application code. Switching between
GitHub media, R2, S3, or another host must require changing one shared base URL,
not changing module-specific path logic.
"""


def main() -> int:
    inventory = load_json(INVENTORY_PATH)
    triage = load_json(TRIAGE_PATH)
    inventory_rows = inventory["files"]
    triage_rows = triage["files"]
    inventory_by_path = {row["path"]: row for row in inventory_rows}
    triage_by_path = {row["path"]: row for row in triage_rows}

    if len(inventory_by_path) != len(inventory_rows):
        raise RuntimeError("media inventory contains duplicate paths")
    if len(triage_by_path) != len(triage_rows):
        raise RuntimeError("media orphan triage contains duplicate paths")

    orphan_paths = {row["path"] for row in inventory_rows if row.get("suspected_orphan")}
    if orphan_paths != set(triage_by_path):
        missing = sorted(orphan_paths - set(triage_by_path))[:5]
        extra = sorted(set(triage_by_path) - orphan_paths)[:5]
        raise RuntimeError(f"triage/inventory orphan mismatch: missing={missing}, extra={extra}")

    externalizable: list[dict[str, Any]] = []
    for inventory_row in inventory_rows:
        path = inventory_row["path"]
        triage_row = triage_by_path.get(path)
        classification = triage_row.get("classification") if triage_row else None
        if not inventory_row.get("referenced") and classification != "probable_dynamic_reference":
            continue
        references, types, _ = reference_context(inventory_row, triage_row)
        externalizable.append(
            {
                "path": path,
                "bytes": inventory_row["bytes"],
                "module": inventory_row.get("module"),
                "sha256": inventory_row["sha256"],
                "usage": usage_for(bool(inventory_row.get("referenced")), triage_row, types),
                "referenceType": sorted(types),
                "references": references,
                "externalPath": path,
                "migrationRisk": risk_for(types),
            }
        )

    externalizable.sort(key=lambda row: row["path"])
    external_paths = [row["externalPath"] for row in externalizable]
    if len(external_paths) != len(set(external_paths)):
        raise RuntimeError("externalPath collision detected")

    for row in externalizable:
        if not local_file(row["path"]):
            raise RuntimeError(f"planned media path does not exist: {row['path']}")
        if ABSOLUTE_OR_EXTERNAL.match(row["path"]) or row["externalPath"].lower().startswith("file://"):
            raise RuntimeError(f"absolute/external path in plan: {row['path']}")
        if inventory_by_path[row["path"]]["sha256"] != row["sha256"]:
            raise RuntimeError(f"inventory hash mismatch: {row['path']}")
        for reference in row["references"]:
            if not local_file(reference):
                raise RuntimeError(f"plan reference does not exist: {reference}")

    source_original = [
        compact_triage(row)
        for row in triage_rows
        if row.get("classification") == "source_original"
    ]
    unknown = [compact_triage(row) for row in triage_rows if row.get("classification") == "unknown"]
    unreferenced_generated = [
        compact_triage(row)
        for row in triage_rows
        if row.get("classification") == "generated_derivative"
    ]

    by_module = grouped_stats(externalizable, lambda row: module_label(row["module"]))
    by_type: dict[str, dict[str, int]] = {}
    for reference_type in sorted({item for row in externalizable for item in row["referenceType"]}):
        rows = [row for row in externalizable if reference_type in row["referenceType"]]
        by_type[reference_type] = count_bytes(rows)
    by_risk = grouped_stats(externalizable, lambda row: row["migrationRisk"])
    for risk in ("low", "medium", "high"):
        by_risk.setdefault(risk, {"files": 0, "bytes": 0})

    dynamic_rows = [row for row in externalizable if "dynamic_runtime" in row["referenceType"]]
    pilot = build_pilot(inventory_rows, externalizable, triage_by_path)
    summary = {
        "schemaVersion": 1,
        "generatedFrom": {
            "inventory": "data/media-inventory.json",
            "triage": "data/media-orphan-triage.json",
        },
        "totalExternalizableFiles": len(externalizable),
        "totalExternalizableBytes": sum_bytes(externalizable),
        "byModule": by_module,
        "byReferenceType": by_type,
        "byMigrationRisk": by_risk,
        "dynamicRuntimeFiles": len(dynamic_rows),
        "dynamicRuntimeBytes": sum_bytes(dynamic_rows),
        "sourceOriginalFiles": len(source_original),
        "sourceOriginalBytes": sum_bytes(source_original),
        "unreferencedGeneratedFiles": len(unreferenced_generated),
        "unreferencedGeneratedBytes": sum_bytes(unreferenced_generated),
        "unknownFiles": len(unknown),
        "unknownBytes": sum_bytes(unknown),
        "inventoryFileCount": len(inventory_rows),
        "inventoryTotalBytes": sum_bytes(inventory_rows),
        "shaanxiHistoryPilot": pilot,
    }
    plan = {
        "schemaVersion": 1,
        "generatedFrom": summary["generatedFrom"],
        "externalizationMode": "local-default; external host disabled",
        "externalizableMedia": externalizable,
        "sourceOriginalMedia": source_original,
        "unknownMedia": unknown,
        "excludedUnreferencedGeneratedMedia": {
            "files": len(unreferenced_generated),
            "bytes": sum_bytes(unreferenced_generated),
            "records": unreferenced_generated,
        },
        "shaanxiHistoryPilot": pilot,
    }

    write_json(PLAN_PATH, plan)
    write_json(SUMMARY_PATH, summary)
    DOC_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOC_PATH.write_text(build_markdown(summary, pilot), encoding="utf-8", newline="\n")

    print(
        json.dumps(
            {
                "externalizableFiles": summary["totalExternalizableFiles"],
                "externalizableBytes": summary["totalExternalizableBytes"],
                "shaanxiHistoryFiles": pilot["externalizableMedia"]["files"],
                "shaanxiHistoryBytes": pilot["externalizableMedia"]["bytes"],
                "riskFiles": {key: value["files"] for key, value in by_risk.items()},
                "dynamicRuntimeFiles": summary["dynamicRuntimeFiles"],
                "dynamicRuntimeBytes": summary["dynamicRuntimeBytes"],
                "sourceOriginalFiles": summary["sourceOriginalFiles"],
                "sourceOriginalBytes": summary["sourceOriginalBytes"],
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (KeyError, OSError, RuntimeError, ValueError) as exc:
        print(f"plan_media_externalization.py: {exc}", file=sys.stderr)
        raise SystemExit(1)
