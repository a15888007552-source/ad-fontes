#!/usr/bin/env python3
"""Persistent product regression guard for Ad Fontes.

Policy (important):
    `pin` may only be run AFTER the user has explicitly confirmed a version is
    correct (e.g. "这个版本是对的" / "这个版可以锁" / "就要这个版本").
    Agents must NEVER pin a baseline on their own visual/product judgement.
    If `verify` reports PRODUCT_GUARD=FAIL, stop immediately: no commit, no
    push, no PR, no merge, unless the task explicitly declares it is modifying
    that product and the user re-pins after final confirmation.

Commands:
    pin <name> <files...>   freeze sha256/git-blob of files into the baseline
    verify [product]        compare current worktree against pinned baselines
    status                  list pinned products and files
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE_PATH = ROOT / "data" / "product-guard-baselines.json"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def git_blob(path: str) -> str:
    result = subprocess.run(
        ["git", "hash-object", path],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def load_baselines() -> dict:
    if not BASELINE_PATH.exists():
        return {"schemaVersion": 1, "products": {}}
    return json.loads(BASELINE_PATH.read_text(encoding="utf-8"))


def save_baselines(data: dict) -> None:
    BASELINE_PATH.parent.mkdir(parents=True, exist_ok=True)
    BASELINE_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def pin(name: str, files: list[str]) -> int:
    data = load_baselines()
    products = data.setdefault("products", {})

    record = {
        "files": {},
    }

    missing = []

    for relative in files:
        path = ROOT / relative
        if not path.is_file():
            missing.append(relative)
            continue

        record["files"][relative] = {
            "sha256": sha256_file(path),
            "gitBlob": git_blob(relative),
        }

    if missing:
        print("PRODUCT_GUARD_PIN=FAIL")
        for item in missing:
            print(f"MISSING={item}")
        return 1

    products[name] = record
    save_baselines(data)

    print("PRODUCT_GUARD_PIN=PASS")
    print(f"PRODUCT={name}")
    print(f"FILES={len(record['files'])}")
    return 0


def verify(product: str | None = None) -> int:
    data = load_baselines()
    products = data.get("products", {})

    selected = (
        {product: products[product]}
        if product and product in products
        else products
    )

    if product and product not in products:
        print("PRODUCT_GUARD=FAIL")
        print(f"UNKNOWN_PRODUCT={product}")
        return 1

    failures = []

    for product_name, record in selected.items():
        for relative, expected in record.get("files", {}).items():
            path = ROOT / relative

            if not path.is_file():
                failures.append(
                    (product_name, relative, "missing", expected.get("sha256"), "")
                )
                continue

            actual_sha = sha256_file(path)

            if actual_sha != expected.get("sha256"):
                failures.append(
                    (
                        product_name,
                        relative,
                        "content-changed",
                        expected.get("sha256"),
                        actual_sha,
                    )
                )

    if failures:
        print("PRODUCT_GUARD=FAIL")
        for product_name, relative, reason, expected, actual in failures:
            print(f"PRODUCT={product_name}")
            print(f"FILE={relative}")
            print(f"REASON={reason}")
            print(f"EXPECTED={expected}")
            print(f"ACTUAL={actual}")
        return 1

    print("PRODUCT_GUARD=PASS")
    print(f"PRODUCTS={len(selected)}")
    print(
        "FILES="
        + str(
            sum(len(item.get("files", {})) for item in selected.values())
        )
    )
    return 0


def status() -> int:
    data = load_baselines()
    products = data.get("products", {})

    print("PRODUCT_GUARD_STATUS")
    for name, record in products.items():
        print(f"{name}: {len(record.get('files', {}))} files")
        for path in record.get("files", {}):
            print(f"  {path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    pin_parser = sub.add_parser("pin")
    pin_parser.add_argument("name")
    pin_parser.add_argument("files", nargs="+")

    verify_parser = sub.add_parser("verify")
    verify_parser.add_argument("product", nargs="?")

    sub.add_parser("status")

    args = parser.parse_args()

    if args.command == "pin":
        return pin(args.name, args.files)

    if args.command == "verify":
        return verify(args.product)

    return status()


if __name__ == "__main__":
    raise SystemExit(main())
