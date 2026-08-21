#!/usr/bin/env python3
"""Mechanically extract and verify the static data in Europa's Sinica volume.

This script deliberately accepts only JSON-compatible literal declarations. It
does not interpret or regenerate academic text, media payloads, or JavaScript
logic. The reference page defaults to origin/main so the extraction can be
repeated without keeping a second copy of the 7 MB source file in the PR.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


GROUPS: dict[str, list[str]] = {
    "entries": ["M"],
    "relations": ["L", "LINEAGES"],
    "periods": ["EP", "EPYR"],
    "events": ["HISTEVENTS", "HISTDEEP", "REIGN", "TORD"],
    "sources": ["SCHOL", "GLOSS", "YUEXUE", "BAYIN"],
    "geo": [
        "CITY",
        "CITYBLD",
        "COASTP",
        "GREATWALL",
        "RIVERS",
        "CANAL",
        "REGIONS",
        "SEAS",
    ],
    "media": ["PORTRAITS"],
    "views": ["TYPES", "VIEWS", "VIEWDESC"],
}

SELECTED_NAMES = {name for names in GROUPS.values() for name in names}
ABSOLUTE_PATH_RE = re.compile(r"(?i)(?:[a-z]:[\\/]|file://)")
MEDIA_KEYS = {"u", "src", "path", "image", "img", "thumbnail", "media"}
CITATION_KEYS = {"cite", "citation", "ref", "source", "sources", "credit", "rights"}


@dataclass(frozen=True)
class Block:
    tag: str
    start: int
    end: int
    body_start: int
    body_end: int
    body: str


def find_blocks(html: str) -> list[Block]:
    blocks: list[Block] = []
    for match in re.finditer(r"<(style|script)\b[^>]*>(.*?)</\1>", html, re.I | re.S):
        blocks.append(
            Block(
                tag=match.group(1).lower(),
                start=match.start(),
                end=match.end(),
                body_start=match.start(2),
                body_end=match.end(2),
                body=match.group(2),
            )
        )
    return blocks


def normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def balanced_literal_end(source: str, start: int) -> int:
    if source[start] in "'\"`":
        quote = source[start]
        escaped = False
        for index in range(start + 1, len(source)):
            char = source[index]
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                return index + 1
        raise ValueError(f"unterminated string literal at offset {start}")

    level = 0
    quote: str | None = None
    escaped = False
    line_comment = False
    block_comment = False
    for index in range(start, len(source)):
        char = source[index]
        next_char = source[index + 1] if index + 1 < len(source) else ""
        if line_comment:
            if char == "\n":
                line_comment = False
            continue
        if block_comment:
            if char == "*" and next_char == "/":
                block_comment = False
            continue
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"`":
            quote = char
            continue
        if char == "/" and next_char == "/":
            line_comment = True
            continue
        if char == "/" and next_char == "*":
            block_comment = True
            continue
        if char in "[{":
            level += 1
        elif char in "]}":
            level -= 1
            if level == 0:
                return index + 1
    raise ValueError(f"unterminated literal at offset {start}")


def declaration_ranges(source: str) -> dict[str, tuple[int, int, str]]:
    result: dict[str, tuple[int, int, str]] = {}
    for name in sorted(SELECTED_NAMES):
        matches = list(re.finditer(r"\bconst\s+" + re.escape(name) + r"\s*=\s*", source))
        if len(matches) != 1:
            raise ValueError(f"expected one const {name}, found {len(matches)}")
        match = matches[0]
        start = match.end()
        end = balanced_literal_end(source, start)
        cursor = end
        while cursor < len(source) and source[cursor].isspace():
            cursor += 1
        if cursor >= len(source) or source[cursor] not in ";,":
            raise ValueError(f"const {name} is not a simple literal declaration")
        if source[cursor] == ",":
            # A few original constants share a declaration, for example
            # `const TORD=[...],TNAME={...};`. Preserve the declaration's
            # `const` keyword and the following declarator when removing the
            # selected literal.
            name_start = source.find(name, match.start(), match.end())
            if name_start < 0:
                raise ValueError(f"could not locate declarator name {name}")
            result[name] = (name_start, cursor + 1, source[start:end])
        else:
            result[name] = (match.start(), cursor + 1, source[start:end])
    return result


def reference_bytes(repo: Path, reference: str) -> bytes:
    return subprocess.check_output(
        ["git", "show", f"{reference}:modules/europa/sinica.html"],
        cwd=repo,
    )


def get_page_parts(html: str) -> tuple[Block, Block, Block]:
    blocks = find_blocks(html)
    style = next((block for block in blocks if block.tag == "style"), None)
    scripts = [block for block in blocks if block.tag == "script"]
    main = next(
        (
            block
            for block in scripts
            if "const EP=" in block.body and "const M=" in block.body
        ),
        None,
    )
    if style is None or main is None:
        raise ValueError("could not locate Sinica style or application script block")
    return style, main, blocks[-1]


def extract_values(main_script: str) -> tuple[dict[str, Any], dict[str, tuple[int, int, str]]]:
    ranges = declaration_ranges(main_script)
    values: dict[str, Any] = {}
    for name, (_, _, raw) in ranges.items():
        try:
            values[name] = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"const {name} is not JSON-compatible: {exc}") from exc
    return values, ranges


def loader_text() -> str:
    urls = ",\n".join(f'    "./data/sinica/{group}.json"' for group in GROUPS)
    definitions = "\n".join(
        f"const {name} = SINICA_DATA.{name};" for name in sorted(SELECTED_NAMES)
    )
    return (
        "const SINICA_DATA = Object.assign(\n"
        "  {},\n"
        "  ...(await Promise.all([\n"
        f"{urls}\n"
        "  ].map(async url => {\n"
        "    try {\n"
        "      const response = await fetch(url);\n"
        "      if (!response.ok) throw new Error(`HTTP ${response.status}`);\n"
        "      return response.json();\n"
        "    } catch (error) {\n"
        "      console.error(\"[sinica] data load failed\", url, error);\n"
        "      throw error;\n"
        "    }\n"
        "  })))\n"
        ");\n\n"
        f"{definitions}\n\n"
    )


def transformed_js(main_script: str, ranges: dict[str, tuple[int, int, str]]) -> str:
    result = main_script
    for start, end, _ in sorted(ranges.values(), reverse=True):
        result = result[:start] + result[end:]
    return loader_text() + result.lstrip("\n")


def transformed_html(
    html: str,
    style: Block,
    main: Block,
) -> str:
    replacements = [
        (style.start, style.end, '<link rel="stylesheet" href="./css/sinica.css">'),
        (main.start, main.end, '<script type="module" src="./js/sinica.js"></script>'),
    ]
    result = html
    for start, end, replacement in sorted(replacements, reverse=True):
        result = result[:start] + replacement + result[end:]
    return result


def write_extraction(repo: Path, reference: str) -> tuple[int, int]:
    html_path = repo / "modules" / "europa" / "sinica.html"
    before_bytes = len(html_path.read_bytes())
    current_text = html_path.read_text(encoding="utf-8")
    reference_blob = reference_bytes(repo, reference)
    reference_text = reference_blob.decode("utf-8")
    if normalize_newlines(current_text) != normalize_newlines(reference_text):
        raise ValueError(
            "current sinica.html differs from the reference before extraction; refusing to overwrite"
        )

    style, main, _ = get_page_parts(reference_text)
    values, ranges = extract_values(main.body)
    data_dir = repo / "modules" / "europa" / "data" / "sinica"
    css_dir = repo / "modules" / "europa" / "css"
    js_dir = repo / "modules" / "europa" / "js"
    for directory in (data_dir, css_dir, js_dir):
        directory.mkdir(parents=True, exist_ok=True)
    for group, names in GROUPS.items():
        payload = {name: values[name] for name in names}
        (data_dir / f"{group}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )
    (css_dir / "sinica.css").write_text(style.body, encoding="utf-8", newline="\n")
    (js_dir / "sinica.js").write_text(
        transformed_js(main.body, ranges), encoding="utf-8", newline="\n"
    )
    html_path.write_text(
        transformed_html(reference_text, style, main), encoding="utf-8", newline="\n"
    )
    after_bytes = len(html_path.read_bytes())
    print(f"sinica.html bytes: before={before_bytes} after={after_bytes}")
    print(f"extracted data declarations: {len(SELECTED_NAMES)}")
    print("JSON files: " + ", ".join(f"{group}.json" for group in GROUPS))
    return before_bytes, after_bytes


def walk_strings(value: Any, path: str = "") -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            found.extend(walk_strings(child, f"{path}.{key}" if path else str(key)))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(walk_strings(child, f"{path}[{index}]"))
    elif isinstance(value, str):
        found.append((path, value))
    return found


def walk_keys(value: Any, path: str = "") -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            found.append((child_path, str(key)))
            found.extend(walk_keys(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(walk_keys(child, f"{path}[{index}]"))
    return found


def keyed_strings(value: Any, keys: set[str], path: str = "") -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            if str(key).lower() in keys:
                found.extend(walk_strings(child, child_path))
            else:
                found.extend(keyed_strings(child, keys, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(keyed_strings(child, keys, f"{path}[{index}]"))
    return found


def absolute_paths(values: dict[str, Any]) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for group, payload in values.items():
        for path, value in walk_strings(payload, group):
            if ABSOLUTE_PATH_RE.search(value):
                found.append((path, value))
    return found


def load_current_data(repo: Path) -> dict[str, Any]:
    data_dir = repo / "modules" / "europa" / "data" / "sinica"
    merged: dict[str, Any] = {}
    for group in GROUPS:
        path = data_dir / f"{group}.json"
        if not path.is_file():
            raise ValueError(f"missing extracted JSON: {path}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError(f"extracted JSON is not an object: {path}")
        merged.update(payload)
    return merged


def verify(repo: Path, reference: str) -> None:
    reference_blob = reference_bytes(repo, reference)
    reference_text = reference_blob.decode("utf-8")
    current_path = repo / "modules" / "europa" / "sinica.html"
    current_text = current_path.read_text(encoding="utf-8")
    style, main, _ = get_page_parts(reference_text)
    expected_values, ranges = extract_values(main.body)
    current_values = load_current_data(repo)
    if current_values != expected_values:
        raise ValueError("extracted JSON values differ from the reference declarations")
    if current_text != transformed_html(reference_text, style, main):
        raise ValueError("sinica.html differs from the mechanical HTML replacement")
    if (repo / "modules" / "europa" / "css" / "sinica.css").read_text(
        encoding="utf-8"
    ) != style.body:
        raise ValueError("sinica.css differs from the original style block")
    if (repo / "modules" / "europa" / "js" / "sinica.js").read_text(
        encoding="utf-8"
    ) != transformed_js(main.body, ranges):
        raise ValueError("sinica.js differs from the mechanical application-script extraction")

    residual = []
    for name in SELECTED_NAMES:
        if re.search(r"\bconst\s+" + re.escape(name) + r"\s*=\s*[\[{]", current_text):
            residual.append(name)
    if residual:
        raise ValueError(f"large data declarations remain in sinica.html: {sorted(residual)}")

    print(
        f"sinica.html bytes: reference_blob={len(reference_blob)} current={len(current_path.read_bytes())}"
    )
    print(f"extracted data declarations: {len(SELECTED_NAMES)}")
    for group, names in GROUPS.items():
        for name in names:
            value = expected_values[name]
            if isinstance(value, list):
                print(f"{group}.{name}: array length {len(value)} PASS")
            elif isinstance(value, dict):
                print(f"{group}.{name}: key count {len(value)} PASS")
    old_keys = walk_keys(expected_values)
    new_keys = walk_keys(current_values)
    old_strings = walk_strings(expected_values)
    new_strings = walk_strings(current_values)
    if sorted(old_keys) != sorted(new_keys) or sorted(old_strings) != sorted(new_strings):
        raise ValueError("key/ID sets or text strings differ from the reference")
    print("key/ID sets + all text strings: PASS")
    old_citations = keyed_strings(expected_values, CITATION_KEYS)
    new_citations = keyed_strings(current_values, CITATION_KEYS)
    if sorted(old_citations) != sorted(new_citations):
        raise ValueError("citation/source strings differ from the reference")
    print(f"citation/source strings ({len(old_citations)}): PASS")
    old_media = keyed_strings(expected_values, MEDIA_KEYS)
    new_media = keyed_strings(current_values, MEDIA_KEYS)
    if sorted(old_media) != sorted(new_media):
        raise ValueError("media values/paths differ from the reference")
    print(f"media values/paths ({len(old_media)}): PASS")
    paths = absolute_paths(expected_values)
    if paths:
        print(f"absolute path report: FOUND {len(paths)}")
        for path, value in paths[:20]:
            print(f"  {path}: {value[:220]}")
    else:
        print("absolute path report: none (D:/, C:/, file://)")
    print("HTML residual large-data scan: PASS")
    print("SINICA_VERIFY=PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("extract", "verify"))
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--reference", default="origin/main")
    args = parser.parse_args()
    repo = args.repo.resolve()
    if args.action == "extract":
        write_extraction(repo, args.reference)
    verify(repo, args.reference)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, UnicodeError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
