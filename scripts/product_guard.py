#!/usr/bin/env python3
"""Ad Fontes persistent product regression guard.

Policy:
    - `pin` requires the explicit `--user-approved` flag. Only use
      --user-approved after the user has visually approved the product
      version. Agents must never approve a baseline on their own judgement
      (a passing test is NOT user approval).
    - `verify` only compares; it never updates expected hashes
      (no self-healing). A mismatch is always PRODUCT_GUARD=FAIL / exit 1.
    - Updating a baseline is always a separate, explicit, user-confirmed
      action after the product change has been visually approved.
    - `changed-files` gates a task's diff against an explicit allow list.

Exit codes: 0 = pass, 1 = guard failure / blocked.
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
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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


def pin(name: str, files: list[str], user_approved: bool) -> int:
    if not user_approved:
        print("PRODUCT_GUARD_PIN=BLOCKED")
        print("REASON=missing --user-approved")
        print("Only use --user-approved after the user has visually approved the product version.")
        return 1

    data = load_baselines()
    products = data.setdefault("products", {})
    record = {"approvedBy": "user", "files": {}}
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

    if product and product not in products:
        print("PRODUCT_GUARD=FAIL")
        print(f"UNKNOWN_PRODUCT={product}")
        return 1

    selected = {product: products[product]} if product else products
    failures = []

    for product_name, record in selected.items():
        for relative, expected in record.get("files", {}).items():
            path = ROOT / relative
            if not path.is_file():
                failures.append((product_name, relative, "missing", expected.get("sha256"), ""))
                continue
            actual_sha = sha256_file(path)
            if actual_sha != expected.get("sha256"):
                failures.append((product_name, relative, "content-changed", expected.get("sha256"), actual_sha))

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
    print("FILES=" + str(sum(len(item.get("files", {})) for item in selected.values())))
    return 0


def status() -> int:
    data = load_baselines()
    products = data.get("products", {})
    print("PRODUCT_GUARD_STATUS")
    for name, record in products.items():
        print(f"{name}: {len(record.get('files', {}))} files (approvedBy={record.get('approvedBy', '?')})")
        for path in record.get("files", {}):
            print(f"  {path}")
    return 0


def path_allowed(path: str, allow: list[str]) -> bool:
    for pattern in allow:
        if pattern.endswith("/**"):
            if path.startswith(pattern[:-2]):
                return True
        elif path == pattern:
            return True
    return False


def changed_files(base: str, allow: list[str]) -> int:
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        print("PRODUCT_GUARD_CHANGED_FILES=FAIL")
        print(f"GIT_ERROR={result.stderr.strip()}")
        return 1
    files = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    unauthorized = [path for path in files if not path_allowed(path, allow)]

    print(f"UNAUTHORIZED_FILES={len(unauthorized)}")
    for path in unauthorized:
        print(f"FILE={path}")
    if unauthorized:
        return 1
    print("CHANGED_FILES_GATE=PASS")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    pin_parser = sub.add_parser("pin", help="pin a product baseline (requires explicit user approval)")
    pin_parser.add_argument("name")
    pin_parser.add_argument(
        "--user-approved",
        action="store_true",
        help="Only use --user-approved after the user has visually approved the product version.",
    )
    pin_parser.add_argument("files", nargs="+")

    verify_parser = sub.add_parser("verify")
    verify_parser.add_argument("product", nargs="?")

    sub.add_parser("status")

    changed_parser = sub.add_parser("changed-files")
    changed_parser.add_argument("--base", required=True)
    changed_parser.add_argument("--allow", action="append", default=[])

    args = parser.parse_args()

    if args.command == "pin":
        return pin(args.name, args.files, args.user_approved)
    if args.command == "verify":
        return verify(args.product)
    if args.command == "changed-files":
        return changed_files(args.base, args.allow)
    return status()


if __name__ == "__main__":
    raise SystemExit(main())
