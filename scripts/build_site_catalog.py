#!/usr/bin/env python3
"""Validate module metadata and update only marked static catalog regions."""

from __future__ import annotations

import argparse
from datetime import date
from html import escape
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ACCESS_LABELS = {
    "public": "公开访问", "password-protected": "密码访问",
    "remote-service": "远程服务入口", "partial": "部分公开",
}
STATUS_LABELS = {
    "active": "已开放", "expanding": "持续增补",
    "archived": "归档保存", "experimental": "试验性",
}
TARGETS = {"home-modules": "index.html", "module-catalog": "modules/index.html",
           "readme-modules": "README.md", "site-revision": "index.html"}


def schema_errors(value, schema: dict, location: str = "module") -> list[str]:
    """Validate the JSON Schema keywords used by module.schema.json, without dependencies."""
    errors = []
    kinds = schema.get("type", [])
    kinds = [kinds] if isinstance(kinds, str) else kinds
    matches = {"object": isinstance(value, dict), "array": isinstance(value, list),
               "string": isinstance(value, str), "integer": type(value) is int,
               "boolean": type(value) is bool, "null": value is None}
    if kinds and not any(matches.get(kind, False) for kind in kinds):
        return [f"{location}: expected {' or '.join(kinds)}"]
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{location}: unsupported value {value!r}")
    if isinstance(value, str):
        if len(value.strip()) < schema.get("minLength", 0):
            errors.append(f"{location}: must not be empty")
        if "pattern" in schema and re.search(schema["pattern"], value) is None:
            errors.append(f"{location}: invalid format {value!r}")
        if schema.get("format") == "date":
            try:
                if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
                    raise ValueError()
                date.fromisoformat(value)
            except ValueError:
                errors.append(f"{location}: expected a real YYYY-MM-DD date")
    if type(value) is int and value < schema.get("minimum", value):
        errors.append(f"{location}: value below minimum")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{location}: too few items")
        if schema.get("uniqueItems") and len({json.dumps(v, sort_keys=True) for v in value}) != len(value):
            errors.append(f"{location}: duplicate array item")
        for index, item in enumerate(value):
            errors.extend(schema_errors(item, schema.get("items", {}), f"{location}[{index}]"))
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{location}: missing required field {key}")
        properties = schema.get("properties", {})
        for key, item in value.items():
            rule = properties.get(key, schema.get("additionalProperties", {}))
            if rule is False:
                errors.append(f"{location}: unknown field {key}")
            elif isinstance(rule, dict):
                errors.extend(schema_errors(item, rule, f"{location}.{key}"))
    return errors


def local_path(root: Path, value: str) -> Path:
    """Resolve a repository-relative path, rejecting aliases and escapes."""
    if not value or any(token in value for token in ("\\", "?", "#", "%")):
        raise ValueError(f"invalid repository-relative path: {value}")
    if value.startswith("/") or re.match(r"^[A-Za-z]:", value):
        raise ValueError(f"absolute path is not allowed: {value}")
    if any(part in (".", "..") for part in value.split("/")):
        raise ValueError(f"non-canonical path is not allowed: {value}")
    path = (root / value).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError(f"path escapes repository: {value}")
    return path


def module_files(root: Path) -> list[Path]:
    # The root-level guobo-museum is a formal module; nested legacy aliases are not.
    return sorted(set(root.glob("modules/*/module.json")) | set(root.glob("*/module.json")))


def count_from_source(root: Path, source: dict) -> int:
    value = json.loads(local_path(root, source["file"]).read_text(encoding="utf-8-sig"))
    pointer = source["pointer"]
    if pointer:
        for token in pointer[1:].split("/"):
            token = token.replace("~1", "/").replace("~0", "~")
            value = value[int(token)] if isinstance(value, list) else value[token]
    if not isinstance(value, (list, dict)):
        raise ValueError("count pointer must select an array or object, not a declared total")
    return len(value)


def number_key(module: dict) -> tuple[int, int]:
    main, _, sub = module["number"].partition(".")
    values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    number = sum(-values[c] if i + 1 < len(main) and values[c] < values[main[i + 1]] else values[c]
                 for i, c in enumerate(main))
    return number, int(sub) if sub else 0


def load_modules(root: Path = ROOT) -> list[dict]:
    schema = json.loads((root / "schemas/module.schema.json").read_text(encoding="utf-8"))
    modules, errors = [], []
    seen = {key: set() for key in ("id", "number", "route")}
    files = module_files(root)
    if not files:
        raise ValueError("no formal module.json files found")
    # A directly browsable module must not silently disappear when metadata is deleted.
    expected = [p.parent for p in (root / "modules").glob("*/index.html") if p.parent.name != "modules"]
    registry = root / "museum-registry.json"
    if registry.is_file():
        for museum in json.loads(registry.read_text(encoding="utf-8"))["museums"]:
            if museum.get("status") == "live" and museum.get("site_path"):
                expected.append(local_path(root, museum["site_path"]).parent)
    for directory in sorted(set(expected)):
        if not (directory / "module.json").is_file():
            errors.append(f"{directory.relative_to(root)}: missing formal module.json")
    for path in files:
        label = path.relative_to(root).as_posix()
        try:
            module = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            errors.append(f"{label}: {exc}")
            continue
        validation = schema_errors(module, schema, label)
        if validation:
            errors.extend(validation)
            continue
        for key in seen:
            if module[key] in seen[key]:
                errors.append(f"{label}: duplicate {key}: {module[key]}")
            seen[key].add(module[key])
        if module["id"] != path.parent.name:
            errors.append(f"{label}: id must match module directory")
        try:
            route = local_path(root, module["route"])
            entry = local_path(path.parent, module["entry"])
            route_file = route / "index.html" if route.is_dir() else route
            if not route_file.is_file():
                errors.append(f"{label}: route does not exist: {module['route']}")
            if route_file != entry:
                errors.append(f"{label}: route and entry identify different files")
            for chapter in module.get("chapters", []):
                if not local_path(path.parent, chapter["entry"]).is_file():
                    errors.append(f"{label}: chapter route does not exist: {chapter['entry']}")
        except ValueError as exc:
            errors.append(f"{label}: {exc}")
        counts, sources = module["corpusCounts"], module.get("countSources", {})
        if set(counts) != set(sources):
            errors.append(f"{label}: each corpus count requires exactly one countSources record")
        for key in set(counts) & set(sources):
            try:
                actual = count_from_source(root, sources[key])
                if counts[key] != actual:
                    errors.append(f"{label}: stale count {key}: metadata {counts[key]}, source {actual}")
            except (OSError, ValueError, KeyError, IndexError, TypeError) as exc:
                errors.append(f"{label}: invalid count source for {key}: {exc}")
        modules.append(module)
    by_id = {module["id"]: module for module in modules}
    for module in modules:
        parent = module["parent"]
        if module["home"] != (parent is None):
            errors.append(f"{module['id']}: only top-level modules belong on the home page")
        if parent is not None:
            if parent not in by_id or not by_id[parent]["home"]:
                errors.append(f"{module['id']}: parent must be an existing top-level module")
            elif not module["number"].startswith(by_id[parent]["number"] + "."):
                errors.append(f"{module['id']}: child number must extend its parent number")
    if errors:
        raise ValueError("\n".join(errors))
    return sorted(modules, key=number_key)


def revision(value: str | None) -> str:
    return value or "未标注（待核定）"


def home_region(modules: list[dict]) -> str:
    rows = ['  <ul class="mods">']
    for module in modules:
        if not module["home"]:
            continue
        e = {k: escape(str(v), quote=True) for k, v in module.items()}
        badge = "lock" if module["access"] == "password-protected" else "live"
        rows.extend([
            '    <li>', f'      <a class="mod" href="{e["route"]}">',
            '        <div class="mod-top">', f'          <span class="num">{e["number"]}</span>',
            f'          <h3 class="mod-title">{e["title"]}</h3>',
            f'          <span class="mod-sub">{e["subtitle"]}</span>', '        </div>',
            f'        <p class="mod-desc">{e["description"]}</p>', '        <div class="mod-meta">',
            f'          <span class="src">{escape(" · ".join(module["sourceBasis"]))}</span>',
            f'          <span class="badge live">{STATUS_LABELS[module["status"]]}</span>',
            f'          <span class="badge {badge}">{ACCESS_LABELS[module["access"]]}</span>',
            '          <span class="go">进入 →</span>', '        </div>', '      </a>', '    </li>',
        ])
    rows.append('  </ul>')
    return "\n".join(rows)


def catalog_region(modules: list[dict]) -> str:
    rows = ['<div class="catalog-grid">']
    for module in modules:
        e = {k: escape(str(v), quote=True) for k, v in module.items()}
        rows.extend([f'  <article class="catalog-card" id="module-{e["id"]}">',
                     '    <div class="catalog-heading">',
                     f'      <span class="catalog-number">{e["number"]}</span>',
                     f'      <h2>{e["title"]}</h2>', '    </div>'])
        if module["latinTitle"]:
            rows.append(f'    <p class="catalog-latin">{e["latinTitle"]}</p>')
        if module["subtitle"]:
            rows.append(f'    <p class="catalog-subtitle">{e["subtitle"]}</p>')
        rows.extend([f'    <p class="catalog-description">{e["description"]}</p>', '    <dl class="catalog-meta">'])
        fields = [("材料类型", " · ".join(module["materialTypes"])),
                  ("访问状态", ACCESS_LABELS[module["access"]] + " · " + STATUS_LABELS[module["status"]]),
                  ("内容修订", revision(module["contentRevision"])),
                  ("界面修订", revision(module["interfaceRevision"])),
                  ("来源基础", "；".join(module["sourceBasis"]))]
        if module["corpusCounts"]:
            fields.append(("馆藏规模", " · ".join(f"{key} {value}" for key, value in module["corpusCounts"].items())))
        for key, value in fields:
            rows.append(f'      <div><dt>{key}</dt><dd>{escape(value)}</dd></div>')
        rows.extend(['    </dl>', f'    <p class="catalog-citation">推荐引用：{e["citation"]}</p>',
                     f'    <a class="catalog-route" href="../{e["route"]}">进入 {e["title"]} →</a>', '  </article>'])
    rows.append('</div>')
    return "\n".join(rows)


def readme_region(modules: list[dict]) -> str:
    def cell(value: str) -> str:
        return value.replace("|", "\\|").replace("\n", " ")
    rows = ["| 编号 | 模块与入口 | 范围 | 访问 | 内容修订 | 界面修订 |",
            "| --- | --- | --- | --- | --- | --- |"]
    for module in modules:
        rows.append(f"| {module['number']} | [{cell(module['title'])}]({module['route']}) | "
                    f"{cell(module['description'])} | {ACCESS_LABELS[module['access']]} · "
                    f"{STATUS_LABELS[module['status']]} | {revision(module['contentRevision'])} | "
                    f"{module['interfaceRevision']} |")
    return "\n".join(rows)


def replace_region(text: str, name: str, content: str) -> str:
    start, end = f"<!-- BEGIN GENERATED: {name} -->", f"<!-- END GENERATED: {name} -->"
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f"expected exactly one marker pair for {name}")
    before, tail = text.split(start)
    if end not in tail:
        raise ValueError(f"end marker precedes start marker for {name}")
    _, after = tail.split(end)
    newline = "\r\n" if "\r\n" in text else "\n"
    return before + start + newline + content.replace("\n", newline) + newline + end + after


def read_exact(path: Path) -> str:
    with path.open(encoding="utf-8", newline="") as handle:
        return handle.read()


def generated_files(root: Path, modules: list[dict]) -> dict[Path, str]:
    latest = max(module["interfaceRevision"] for module in modules)
    regions = {"home-modules": home_region(modules), "module-catalog": catalog_region(modules),
               "readme-modules": readme_region(modules),
               "site-revision": f'    <span class="draft">目录与界面修订 · {latest} · 内容日期见各模块馆藏目录</span>'}
    outputs = {}
    for name, relative in TARGETS.items():
        path = root / relative
        text = outputs.get(path, read_exact(path))
        outputs[path] = replace_region(text, name, regions[name])
    return outputs


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if metadata or generated regions are stale")
    args = parser.parse_args(argv)
    try:
        modules = load_modules(ROOT)
        outputs = generated_files(ROOT, modules)
    except (OSError, ValueError, KeyError) as exc:
        print(f"Catalog validation failed:\n{exc}", file=sys.stderr)
        return 1
    stale = []
    for path, content in outputs.items():
        original = read_exact(path)
        if original == content:
            continue
        stale.append(path.relative_to(ROOT).as_posix())
        if not args.check:
            path.write_bytes(content.encode("utf-8"))
    if args.check and stale:
        print("Generated catalog is stale: " + ", ".join(stale), file=sys.stderr)
        print("Run: python scripts/build_site_catalog.py", file=sys.stderr)
        return 1
    print(f"Catalog {'checked' if args.check else 'built'}: {len(modules)} formal modules, "
          f"{sum(module['home'] for module in modules)} home entries; {len(stale)} file(s) changed.")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
    raise SystemExit(main())
