#!/usr/bin/env python3
"""Conservative repository-integrity checks for the Ad Fontes static site.

The checker deliberately validates only contracts that can be inferred from
the current repository.  It does not attempt to interpret historical claims
or impose a new data schema on existing modules.

Checks:
* every JSON file is parseable;
* production JSON collections do not contain empty or sibling-duplicate IDs;
* literal HTML/CSS local references stay inside the repository and resolve;
* literal production ``img`` elements have an ``alt`` attribute;
* the retired media Worker host is absent from public runtime files;
* obvious English placeholder markers are absent from production JSON; and
* only files changed from the supplied Git base are subject to size limits.

JavaScript-generated URLs and research/archive documents are intentionally not
treated as a complete dependency graph.  Existing module-specific QA remains
the authority for those runtime contracts.
"""

from __future__ import annotations

import argparse
import json
import posixpath
import re
import subprocess
import sys
from dataclasses import dataclass, asdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import unquote, urlsplit


SOFT_LIMIT_BYTES = 5 * 1024 * 1024
HARD_LIMIT_BYTES = 20 * 1024 * 1024
RETIRED_MEDIA_HOSTS = (
    "ad-fontes-media.gusgumee777.workers.dev",
)
SKIP_DIRS = {
    ".git",
    ".playwright-cli",
    "node_modules",
    "output",
    "outputs",
}
REFERENCE_ATTRIBUTES = (
    "href",
    "src",
    "poster",
    "data-src",
    "data-image",
    "data-background",
    "data-cover",
)
REFERENCE_SCHEMES = {
    "blob",
    "data",
    "javascript",
    "mailto",
    "tel",
}
PRODUCTION_MARKERS = re.compile(
    r"lorem\s+ipsum|\b(?:TODO|TBD|PLACEHOLDER|FIXME)\b",
    re.IGNORECASE,
)
CSS_URL = re.compile(r"url\(\s*(?:\"([^\"]*)\"|'([^']*)'|([^)]*?))\s*\)", re.IGNORECASE)
CSS_IMPORT = re.compile(r"@import\s+(?:url\(\s*)?(?:\"([^\"]*)\"|'([^']*)'|([^\s;')]+))", re.IGNORECASE)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


@dataclass
class Issue:
    severity: str
    check: str
    message: str
    path: str | None = None
    line: int | None = None


def rel_path(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def iter_files(root: Path, suffixes: set[str] | None = None) -> Iterable[Path]:
    """Yield regular files while avoiding generated and tool-owned folders."""

    for path in root.rglob("*"):
        if not path.is_file() or any(part in SKIP_DIRS for part in path.relative_to(root).parts):
            continue
        if suffixes and path.suffix.lower() not in suffixes:
            continue
        yield path


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig", errors="replace")


def is_production_json(path: Path, root: Path) -> bool:
    relative = Path(rel_path(path, root))
    parts = relative.parts
    return (
        relative.as_posix() == "museum-registry.json"
        or relative.as_posix() == "modules/museum-atlas/search-index.json"
        or parts[0] == "data"
        or (parts[0] == "modules" and "data" in parts)
    )


def is_public_runtime_file(path: Path, root: Path) -> bool:
    relative = Path(rel_path(path, root))
    excluded = {".github", "docs", "research", "scripts", "schemas", "tools", "output", "outputs"}
    return bool(relative.parts) and relative.parts[0] not in excluded


def add_issue(
    issues: list[Issue],
    severity: str,
    check: str,
    message: str,
    root: Path,
    path: Path | None = None,
    line: int | None = None,
) -> None:
    issues.append(Issue(severity, check, message, rel_path(path, root) if path else None, line))


def load_json_files(root: Path, issues: list[Issue]) -> dict[Path, Any]:
    parsed: dict[Path, Any] = {}
    scanned = 0
    for path in iter_files(root, {".json"}):
        scanned += 1
        try:
            parsed[path] = json.loads(read_text(path))
        except (OSError, json.JSONDecodeError) as error:
            add_issue(issues, "error", "json", f"invalid JSON: {error}", root, path)
    print(f"JSON parse: scanned {scanned}, parsed {len(parsed)}, errors {sum(i.check == 'json' for i in issues)}")
    return parsed


def scalar_id(value: Any) -> str | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, (int, float)):
        return str(value)
    return None


def scoped_id(item: dict[str, Any]) -> str | None:
    """Return a collection-aware identity for common multi-museum indexes."""

    value = scalar_id(item.get("id"))
    if value is None:
        return None
    for scope_key in ("museum_id", "module_id", "dataset_id"):
        scope = scalar_id(item.get(scope_key))
        if scope is not None:
            return f"{scope_key}={scope}\x1fid={value}"
    return f"id={value}"


def inspect_id_nodes(
    node: Any,
    location: str,
    root: Path,
    path: Path,
    issues: list[Issue],
) -> None:
    if isinstance(node, dict):
        if "id" in node and scalar_id(node["id"]) is None:
            add_issue(issues, "error", "ids", f"empty or invalid id at {location}", root, path)
        for key in ("sourceId", "source_id"):
            if key in node and isinstance(node[key], str) and not node[key].strip():
                add_issue(issues, "error", "ids", f"empty {key} at {location}", root, path)
        for key, value in node.items():
            inspect_id_nodes(value, f"{location}.{key}", root, path, issues)
        return

    if isinstance(node, list):
        siblings: dict[str, list[int]] = {}
        for index, item in enumerate(node):
            if not isinstance(item, dict) or "id" not in item:
                continue
            value = scoped_id(item)
            if value is not None:
                siblings.setdefault(value, []).append(index)
        for value, indexes in siblings.items():
            if len(indexes) > 1:
                display_value = value.replace("\x1f", ":")
                add_issue(
                    issues,
                    "error",
                    "ids",
                    f"duplicate sibling id {display_value!r} at {location} indexes {indexes}",
                    root,
                    path,
                )
        for index, value in enumerate(node):
            inspect_id_nodes(value, f"{location}[{index}]", root, path, issues)


def check_ids(parsed: dict[Path, Any], root: Path, issues: list[Issue]) -> int:
    scanned = 0
    for path, value in parsed.items():
        if is_production_json(path, root):
            scanned += 1
            inspect_id_nodes(value, "$", root, path, issues)
    print(f"Production IDs: scanned {scanned} JSON documents")
    return scanned


def should_skip_reference(raw: str) -> bool:
    value = raw.strip()
    if not value or value.startswith(("#", "?", "//", "/")):
        return True
    parsed = urlsplit(value)
    return bool(parsed.scheme.lower() in REFERENCE_SCHEMES or parsed.scheme or parsed.netloc)


def resolve_local_reference(source: Path, raw: str, root: Path) -> tuple[Path | None, str | None]:
    """Resolve a literal relative reference, returning (target, error)."""

    value = raw.strip()
    if should_skip_reference(value):
        return None, None
    parsed = urlsplit(value)
    reference = unquote(parsed.path)
    if "\\" in reference:
        return None, "uses a backslash in a web path"
    if any(token in reference for token in ("${", "{{", "<%")):
        return None, None
    # posixpath is used for URL semantics even on the Windows development host.
    normalized = posixpath.normpath(reference)
    target = (source.parent / Path(*normalized.split("/"))).resolve()
    try:
        target.relative_to(root.resolve())
    except ValueError:
        return None, "escapes the repository root"
    return target, None


class StaticReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[tuple[str, str]] = []
        self.missing_alt: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name.lower(): value for name, value in attrs}
        tag_name = tag.lower()
        if tag_name == "img" and "alt" not in values:
            self.missing_alt.append(tag_name)
        for attribute in REFERENCE_ATTRIBUTES:
            value = values.get(attribute)
            if value:
                self.references.append((attribute, value))
        srcset = values.get("srcset")
        if srcset:
            for candidate in srcset.split(","):
                reference = candidate.strip().split(None, 1)[0]
                if reference:
                    self.references.append(("srcset", reference))


def check_static_references(root: Path, issues: list[Issue]) -> tuple[int, int]:
    scanned = 0
    references = 0
    html_files: list[Path] = []
    for path in iter_files(root, {".html", ".htm"}):
        parts = Path(rel_path(path, root)).parts
        if parts and parts[0] in {"docs", "research", "output", "outputs"}:
            continue
        html_files.append(path)
    css_files: list[Path] = []

    def inspect_reference(path: Path, attribute: str, raw: str) -> None:
        nonlocal references
        target, error = resolve_local_reference(path, raw, root)
        if error:
            add_issue(issues, "error", "static-references", f"{attribute}={raw!r} {error}", root, path)
            return
        if target is None:
            return
        references += 1
        if not target.exists():
            add_issue(
                issues,
                "warning" if attribute == "css-url" else "error",
                "static-references",
                f"{attribute}={raw!r} resolves to missing local file",
                root,
                path,
            )
            return
        if target.suffix.lower() == ".css" and target not in css_files:
            css_files.append(target)

    for path in html_files:
        scanned += 1
        parser = StaticReferenceParser()
        try:
            parser.feed(read_text(path))
        except Exception as error:  # HTMLParser is intentionally permissive, but report unexpected parser failures.
            add_issue(issues, "error", "static-references", f"HTML parse failed: {error}", root, path)
            continue
        for _ in parser.missing_alt:
            add_issue(issues, "error", "static-references", "literal <img> is missing alt", root, path)
        for attribute, raw in parser.references:
            inspect_reference(path, attribute, raw)

    # Only validate stylesheets reachable from a public HTML entry point. This
    # avoids turning unused historical/experimental CSS into a false failure.
    index = 0
    while index < len(css_files):
        path = css_files[index]
        index += 1
        scanned += 1
        content = read_text(path)
        for match in CSS_URL.finditer(content):
            inspect_reference(path, "css-url", match[1] or match[2] or match[3] or "")
        for match in CSS_IMPORT.finditer(content):
            inspect_reference(path, "css-import", match[1] or match[2] or match[3] or "")
    static_errors = sum(i.check == "static-references" and i.severity == "error" for i in issues)
    static_warnings = sum(i.check == "static-references" and i.severity == "warning" for i in issues)
    print(f"Static references: scanned {scanned} HTML/CSS files, resolved {references}, errors {static_errors}, warnings {static_warnings}")
    return scanned, references


def check_retired_hosts(root: Path, issues: list[Issue]) -> int:
    scanned = 0
    suffixes = {".html", ".htm", ".css", ".js", ".mjs"}
    needles = tuple(host.lower() for host in RETIRED_MEDIA_HOSTS)
    for path in iter_files(root, suffixes):
        if not is_public_runtime_file(path, root):
            continue
        scanned += 1
        content = read_text(path).lower()
        for host in needles:
            if host in content:
                add_issue(issues, "error", "retired-media", f"retired media host remains referenced: {host}", root, path)
    print(f"Retired media hosts: scanned {scanned} public runtime files")
    return scanned


def check_production_markers(parsed: dict[Path, Any], root: Path, issues: list[Issue]) -> int:
    scanned = 0
    for path in parsed:
        if not is_production_json(path, root):
            continue
        scanned += 1
        for line_number, line in enumerate(read_text(path).splitlines(), start=1):
            match = PRODUCTION_MARKERS.search(line)
            if match:
                add_issue(
                    issues,
                    "error",
                    "production-markers",
                    f"obvious placeholder marker {match.group(0)!r} in production JSON",
                    root,
                    path,
                    line_number,
                )
    print(f"Production markers: scanned {scanned} JSON documents")
    return scanned


def run_git(root: Path, *arguments: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), *arguments],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout


def changed_files(root: Path, base_ref: str | None) -> tuple[str | None, list[str]]:
    base = base_ref.strip() if base_ref else ""
    if not base:
        base = run_git(root, "rev-parse", "HEAD^") or ""
    if base:
        output = run_git(root, "diff", "--name-only", "--diff-filter=AMRT", f"{base}...HEAD")
        if output is not None:
            return base, [line.strip() for line in output.splitlines() if line.strip()]
    output = run_git(root, "diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "HEAD") or ""
    return None, [line.strip() for line in output.splitlines() if line.strip()]


def check_changed_file_sizes(root: Path, base_ref: str | None, issues: list[Issue]) -> dict[str, Any]:
    base, paths = changed_files(root, base_ref)
    soft: list[dict[str, Any]] = []
    hard: list[dict[str, Any]] = []
    for relative_name in paths:
        path = (root / relative_name).resolve()
        try:
            path.relative_to(root.resolve())
        except ValueError:
            add_issue(issues, "error", "size-guard", f"Git returned a path outside the repository: {relative_name}", root)
            continue
        if not path.is_file():
            continue
        size = path.stat().st_size
        entry = {"path": relative_name.replace("\\", "/"), "bytes": size, "megabytes": round(size / 1024 / 1024, 2)}
        if size > HARD_LIMIT_BYTES:
            hard.append(entry)
            add_issue(
                issues,
                "error",
                "size-guard",
                f"changed file is {entry['megabytes']} MB (>20 MB); prefer WebP/AVIF or external media storage",
                root,
                path,
            )
        elif size > SOFT_LIMIT_BYTES:
            soft.append(entry)
            add_issue(
                issues,
                "warning",
                "size-guard",
                f"changed file is {entry['megabytes']} MB (>5 MB); consider WebP/AVIF or external media storage",
                root,
                path,
            )
    print(f"Changed-file size guard: base {base or 'unavailable'}, files {len(paths)}, warnings {len(soft)}, failures {len(hard)}")
    return {
        "base_ref": base,
        "changed_files": len(paths),
        "soft_limit_bytes": SOFT_LIMIT_BYTES,
        "hard_limit_bytes": HARD_LIMIT_BYTES,
        "warnings": soft,
        "failures": hard,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="repository root (default: current directory)")
    parser.add_argument("--base-ref", default="", help="Git base SHA/ref used for the changed-file size guard")
    parser.add_argument("--report", type=Path, help="write a JSON report to this path")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = args.root.resolve()
    if not (root / ".git").exists() and run_git(root, "rev-parse", "--show-toplevel") is None:
        print(f"ERROR repository root is not a Git checkout: {root}", file=sys.stderr)
        return 2

    issues: list[Issue] = []
    parsed = load_json_files(root, issues)
    check_ids(parsed, root, issues)
    check_static_references(root, issues)
    check_retired_hosts(root, issues)
    check_production_markers(parsed, root, issues)
    size_guard = check_changed_file_sizes(root, args.base_ref, issues)

    errors = [issue for issue in issues if issue.severity == "error"]
    warnings = [issue for issue in issues if issue.severity == "warning"]
    status = "FAIL" if errors else "PASS"
    report = {
        "schema_version": 1,
        "status": status,
        "root": str(root),
        "checks": {
            "json": {"status": "FAIL" if any(i.check == "json" and i.severity == "error" for i in issues) else "PASS"},
            "ids": {"status": "FAIL" if any(i.check == "ids" and i.severity == "error" for i in issues) else "PASS"},
            "static_references": {"status": "FAIL" if any(i.check == "static-references" and i.severity == "error" for i in issues) else "PASS"},
            "retired_media": {"status": "FAIL" if any(i.check == "retired-media" and i.severity == "error" for i in issues) else "PASS"},
            "production_markers": {"status": "FAIL" if any(i.check == "production-markers" and i.severity == "error" for i in issues) else "PASS"},
            "changed_file_size_guard": size_guard,
        },
        "errors": [asdict(issue) for issue in errors],
        "warnings": [asdict(issue) for issue in warnings],
    }
    if args.report:
        report_path = args.report if args.report.is_absolute() else root / args.report
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Repository integrity: {status} ({len(errors)} errors, {len(warnings)} warnings)")
    for issue in issues:
        location = issue.path or "repository"
        if issue.line is not None:
            location += f":{issue.line}"
        print(f"{issue.severity.upper()} [{issue.check}] {location}: {issue.message}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
