#!/usr/bin/env python3
"""Validate Ad Fontes module metadata using only the Python standard library."""

from __future__ import annotations

import json
import sys
from pathlib import Path


REQUIRED = ("id", "title", "type", "status", "version", "entry", "maintainer")
ALLOWED_STATUS = {"draft", "published", "archived", "experimental"}


def fail(errors: list[str], module_id: str, message: str) -> None:
    errors.append(f"✗ {module_id}: {message}")


def validate_module(module_dir: Path, seen_ids: set[str], errors: list[str]) -> str | None:
    module_id = module_dir.name
    metadata_path = module_dir / "module.json"
    if not metadata_path.is_file():
        fail(errors, module_id, "missing module.json")
        return None

    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        fail(errors, module_id, f"invalid module.json ({exc})")
        return None

    if not isinstance(metadata, dict):
        fail(errors, module_id, "module.json must contain an object")
        return None

    for field in REQUIRED:
        value = metadata.get(field)
        if not isinstance(value, str) or not value.strip():
            fail(errors, module_id, f"missing or empty required field: {field}")

    declared_id = metadata.get("id")
    if isinstance(declared_id, str):
        if declared_id in seen_ids:
            fail(errors, module_id, f"duplicate id: {declared_id}")
        seen_ids.add(declared_id)
        if declared_id != module_id:
            print(f"⚠ {module_dir.as_posix()}: id differs from directory name ({declared_id})")

    status = metadata.get("status")
    if isinstance(status, str) and status not in ALLOWED_STATUS:
        fail(errors, module_id, f"unsupported status: {status}")

    entry = metadata.get("entry")
    if isinstance(entry, str) and entry:
        module_root = module_dir.resolve()
        entry_path = (module_dir / entry).resolve()
        try:
            entry_path.relative_to(module_root)
        except ValueError:
            fail(errors, module_id, f"entry escapes module directory: {entry}")
        else:
            if not entry_path.is_file():
                fail(errors, module_id, f"entry file does not exist: {entry}")

    if not any(line.startswith(f"✗ {module_id}:") for line in errors):
        print(f"✓ {module_id}")
    return declared_id if isinstance(declared_id, str) else None


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parents[1]
    modules_root = root / "modules"
    errors: list[str] = []
    seen_ids: set[str] = set()

    if not modules_root.is_dir():
        print(f"✗ modules: directory does not exist")
        return 1

    nested_root = modules_root / "modules"
    if nested_root.exists():
        for child in sorted(nested_root.iterdir()):
            relative = child.relative_to(root).as_posix()
            print(f"⚠ legacy nested path: {relative}")

    direct_modules = [
        path
        for path in sorted(modules_root.iterdir())
        if path.is_dir() and path.name != "modules"
    ]
    if not direct_modules:
        print("✗ modules: no direct module directories found")
        return 1

    for module_dir in direct_modules:
        validate_module(module_dir, seen_ids, errors)

    for path in sorted((root / "schemas").glob("*.json")):
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            fail(errors, path.name, f"invalid schema JSON ({exc})")

    if errors:
        for error in errors:
            print(error)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
