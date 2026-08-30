#!/usr/bin/env python3
"""Compatibility command for the shared, dependency-free module schema validator."""

import sys

from build_site_catalog import load_modules


def main() -> int:
    try:
        modules = load_modules()
    except (OSError, ValueError, KeyError) as exc:
        print(f"Module validation failed:\n{exc}", file=sys.stderr)
        return 1
    print(f"Validated {len(modules)} formal modules using schemas/module.schema.json.")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    raise SystemExit(main())
