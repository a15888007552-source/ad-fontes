#!/usr/bin/env python3
"""Audit structured scholarly metadata without judging historical truth.

This is intentionally a framework rather than an invented citation schema.
It inventories the source-related fields that are actually present in JSON
data and enforces ``sourceId -> bibliography/source entry`` only when both
sides of that relation can be identified structurally.  Free-text ``source``,
``cite`` and ``evidence`` fields are reported but are not converted into a
machine-checkable bibliography contract.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Iterable


FIELD_NAMES = (
    "source",
    "sourceId",
    "source_id",
    "citation",
    "cite",
    "references",
    "bibliography",
    "provenance",
    "evidence",
)
GENERATED_DIRS = {".git", ".playwright-cli", "node_modules", "output", "outputs", "research"}
CATALOG_KEYS = {"bibliography", "references", "sources"}

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def relative(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def iter_json_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.json"):
        if not path.is_file():
            continue
        parts = path.relative_to(root).parts
        if any(part in GENERATED_DIRS for part in parts) or parts[:1] == ("schemas",):
            continue
        yield path


def load_documents(root: Path) -> tuple[dict[Path, Any], list[dict[str, str]]]:
    documents: dict[Path, Any] = {}
    errors: list[dict[str, str]] = []
    for path in iter_json_files(root):
        try:
            documents[path] = json.loads(path.read_text(encoding="utf-8-sig"))
        except (OSError, json.JSONDecodeError) as error:
            errors.append({"path": relative(path, root), "message": str(error)})
    return documents, errors


def walk(node: Any, location: str = "$") -> Iterable[tuple[str, Any, str]]:
    if isinstance(node, dict):
        for key, value in node.items():
            yield key, value, f"{location}.{key}"
            yield from walk(value, f"{location}.{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from walk(value, f"{location}[{index}]")


def non_empty_string(value: Any) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def collect_catalog_ids(value: Any) -> tuple[set[str], list[str]]:
    """Return identifiers and structural violations for one catalog value."""

    ids: list[str] = []
    violations: list[str] = []
    if isinstance(value, list):
        entries = value
        for index, entry in enumerate(entries):
            if not isinstance(entry, dict):
                continue
            if "id" not in entry:
                continue
            identifier = non_empty_string(entry["id"])
            if identifier is None:
                violations.append(f"catalog item {index} has an empty/non-string id")
            else:
                ids.append(identifier)
    elif isinstance(value, dict):
        # A keyed catalog can use its stable keys as identifiers. Only accept
        # records that look like bibliographic entries; free-form metadata
        # objects such as grouped research notes are not catalogs.
        for key, entry in value.items():
            if isinstance(entry, dict) and ("id" in entry or "title" in entry or "author" in entry):
                identifier = non_empty_string(key)
                if identifier is not None:
                    ids.append(identifier)

    duplicates = sorted({identifier for identifier in ids if ids.count(identifier) > 1})
    for identifier in duplicates:
        violations.append(f"duplicate catalog id {identifier!r}")
    return set(ids), violations


def audit(root: Path) -> dict[str, Any]:
    documents, parse_errors = load_documents(root)
    observations: dict[str, dict[str, Any]] = {
        key: {"occurrences": 0, "files": []} for key in FIELD_NAMES
    }
    source_ids: list[dict[str, str]] = []
    catalogs: list[dict[str, Any]] = []
    violations: list[dict[str, str]] = []

    for path, document in documents.items():
        file_name = relative(path, root)
        production = file_name == "museum-registry.json" or file_name.startswith("data/") or (
            file_name.startswith("modules/") and "/data/" in file_name
        )
        for key, value, location in walk(document):
            if key in observations:
                observations[key]["occurrences"] += 1
                if file_name not in observations[key]["files"] and len(observations[key]["files"]) < 8:
                    observations[key]["files"].append(file_name)
            if not production:
                continue
            if key in {"sourceId", "source_id"}:
                if isinstance(value, str) and value.strip():
                    source_ids.append({"value": value.strip(), "file": file_name, "location": location})
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, str) and item.strip():
                            source_ids.append({"value": item.strip(), "file": file_name, "location": location})
            if key.lower() in CATALOG_KEYS and isinstance(value, (list, dict)):
                ids, catalog_violations = collect_catalog_ids(value)
                if ids or catalog_violations:
                    catalogs.append({"file": file_name, "field": key, "ids": ids})
                    for message in catalog_violations:
                        violations.append({"check": "catalog-ids", "file": file_name, "message": message})

    catalog_ids = set().union(*(catalog["ids"] for catalog in catalogs)) if catalogs else set()
    resolution: dict[str, Any]
    if not source_ids:
        resolution = {
            "status": "NOT YET ENFORCEABLE",
            "reason": "No sourceId/source_id references were found in production JSON data.",
            "checked": 0,
            "missing": [],
        }
    elif not catalog_ids:
        resolution = {
            "status": "NOT YET ENFORCEABLE",
            "reason": "sourceId exists, but no structured bibliography/references/sources catalog with stable IDs was found.",
            "checked": len(source_ids),
            "missing": [],
        }
    else:
        missing = sorted({item["value"] for item in source_ids if item["value"] not in catalog_ids})
        for item in source_ids:
            if item["value"] in missing:
                violations.append(
                    {
                        "check": "source-id-resolution",
                        "file": item["file"],
                        "message": f"{item['location']} references missing source id {item['value']!r}",
                    }
                )
        resolution = {
            "status": "FAIL" if missing else "PASS",
            "reason": "Resolved sourceId values against structurally identified catalog IDs.",
            "checked": len(source_ids),
            "catalog_ids": len(catalog_ids),
            "missing": missing,
        }

    status = "FAIL" if parse_errors or violations else "PASS"
    return {
        "schema_version": 1,
        "status": status,
        "scope": {
            "json_documents": len(documents),
            "production_documents": sum(
                1
                for path in documents
                if (name := relative(path, root)) == "museum-registry.json"
                or name.startswith("data/")
                or (name.startswith("modules/") and "/data/" in name)
            ),
            "historical_claims_judged": False,
            "ai_generated_assertions_accepted_as_evidence": False,
        },
        "field_inventory": observations,
        "enforceable_checks": {
            "source_id_resolution": resolution,
            "catalog_id_integrity": "PASS" if not any(item["check"] == "catalog-ids" for item in violations) else "FAIL",
        },
        "not_yet_enforceable": [
            "Free-text source/cite/evidence fields are inventoried but do not prove a traceable bibliography relation.",
            "Historical claims are not assessed by this script; they require human source review.",
        ]
        + ([resolution["reason"]] if resolution["status"] == "NOT YET ENFORCEABLE" else []),
        "parse_errors": parse_errors,
        "violations": violations,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--report", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = args.root.resolve()
    report = audit(root)
    if args.report:
        target = args.report if args.report.is_absolute() else root / args.report
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    inventory = report["field_inventory"]
    present = ", ".join(f"{key}={value['occurrences']}" for key, value in inventory.items() if value["occurrences"])
    print(f"Scholarly integrity: {report['status']}")
    print(f"JSON documents: {report['scope']['json_documents']}; production documents: {report['scope']['production_documents']}")
    print(f"Observed fields: {present or 'none'}")
    print(f"sourceId resolution: {report['enforceable_checks']['source_id_resolution']['status']}")
    for reason in report["not_yet_enforceable"]:
        print(f"NOT YET ENFORCEABLE: {reason}")
    for item in report["parse_errors"]:
        print(f"ERROR [json] {item['file']}: {item['message']}")
    for item in report["violations"]:
        print(f"ERROR [{item['check']}] {item['file']}: {item['message']}")
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
