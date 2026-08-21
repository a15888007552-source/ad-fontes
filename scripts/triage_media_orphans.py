#!/usr/bin/env python3
"""Conservatively triage the suspected media orphans from media-inventory.json.

This is a second-stage, read-only classification pass. It reuses the existing
audit scanner for repository walking and path normalization, then adds checks
for dynamic templates, manifests, build scripts, HTML data-* attributes, CSS
URLs, variant families, and source/archive documentation.

No media bytes are decoded or rewritten. The generated artifacts contain paths
and bounded evidence only; they never copy source-file payloads.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import audit_media  # noqa: E402  (the existing audit is the shared scanner)


CLASSIFICATIONS = (
    "confirmed_referenced",
    "probable_dynamic_reference",
    "source_original",
    "generated_derivative",
    "probable_unused",
    "unknown",
)
CONFIDENCES = ("high", "medium", "low")

# These are the PR #4 audit totals this triage is intentionally bound to. A
# changed audit input must fail loudly instead of silently triaging a different
# population.
EXPECTED_AUDIT_ORPHAN_COUNT = 2842
EXPECTED_AUDIT_ORPHAN_BYTES = 448_982_234

TRIAGE_TEXT_EXTENSIONS = audit_media.TEXT_EXTENSIONS | {
    ".less",
    ".py",
    ".sass",
    ".scss",
    ".toml",
    ".txt",
    ".yaml",
    ".yml",
}
CODE_EXTENSIONS = {
    ".cjs",
    ".css",
    ".html",
    ".htm",
    ".js",
    ".json",
    ".less",
    ".mjs",
    ".py",
    ".sass",
    ".scss",
    ".yaml",
    ".yml",
}
DOC_EXTENSIONS = {".md", ".txt"}
MANIFEST_WORDS = {
    "archive",
    "artifact",
    "asset",
    "catalog",
    "data",
    "gallery",
    "image",
    "manifest",
    "media",
    "photo",
    "picture",
}
SEMANTIC_WORDS = {
    "asset",
    "assets",
    "file",
    "filename",
    "gallery",
    "image",
    "media",
    "original",
    "path",
    "photo",
    "photos",
    "preview",
    "thumb",
    "thumbnail",
    "img",
}
SOURCE_WORDS = {
    "archive",
    "archival",
    "master",
    "original",
    "originals",
    "raw",
    "raws",
    "scan",
    "scans",
    "source",
    "sources",
    "unprocessed",
}
SOURCE_DOC_WORDS = {
    "archive",
    "archival",
    "master",
    "original",
    "originals",
    "raw",
    "source",
    "sources",
    "原图",
    "原始",
    "源素材",
    "档案",
    "保留",
}
DERIVATIVE_DIR_WORDS = {
    "card-covers",
    "contact-sheets",
    "display",
    "focus",
    "generated",
    "large",
    "medium",
    "processed",
    "preview",
    "output",
    "playwright",
    "review",
    "small",
    "thumb",
    "thumbnail",
    "thumbs",
    "web",
}
DERIVATIVE_FILE_WORDS = DERIVATIVE_DIR_WORDS | {
    "featured",
    "full",
    "hires",
    "original-sized",
}
FAMILY_DIR_WORDS = DERIVATIVE_DIR_WORDS | {
    "archive",
    "master",
    "original",
    "raw",
    "source",
}
RESOLUTION_TOKENS = {
    "320",
    "480",
    "640",
    "800",
    "960",
    "1024",
    "1200",
    "1280",
    "1440",
    "1600",
    "1920",
    "2048",
    "2560",
    "3840",
}
SPECIAL_DIRECTORIES = (
    "assets/photos",
    "modules/shaanxi-history/assets",
    "modules/qinhan/assets",
    "modules/xian-museum/assets",
    "modules/shaanxi-archaeology-museum/assets",
    "modules/europa/assets",
    "modules/baoji/assets",
)

TRIAGE_OUTPUT_PATHS = {
    "data/media-orphan-triage.json",
    "data/media-orphan-summary.json",
    "docs/MEDIA_ORPHAN_TRIAGE.md",
    "scripts/triage_media_orphans.py",
}
REFERENCE_OUTPUT_PATHS = audit_media.AUDIT_OUTPUT_PATHS | TRIAGE_OUTPUT_PATHS

DATA_ATTR_RE = re.compile(
    r"\b(?P<name>data-[A-Za-z0-9_:.~-]+)\s*=\s*"
    r"(?P<quote>[\"'])(?P<value>.*?)\2",
    re.IGNORECASE | re.DOTALL,
)
VARIABLE_RE = re.compile(r"\x24\{[^{}]*\}|\{[^{}]+\}")
HTML_COMMENT_RE = re.compile(r"<!--[\s\S]*?-->")
BLOCK_COMMENT_RE = re.compile(r"/\*[\s\S]*?\*/")
PY_COMMENT_RE = re.compile(r"(?m)^\s*#.*$")
LINE_COMMENT_RE = re.compile(r"(?<![:\w])//[^\r\n]*")
DYNAMIC_MEDIA_FRAGMENT_RE = re.compile(
    r"(?P<value>(?:(?:[A-Za-z0-9_.-]+|__TRIAGE_VAR__)/)*"
    r"(?:[A-Za-z0-9_.-]*__TRIAGE_VAR__[A-Za-z0-9_.-]*)"
    r"\.(?:jpg|jpeg|png|webp|gif|svg|avif|heic|tif|tiff|mp3|wav|flac|m4a|ogg|mp4|webm|mov|pdf|woff2?|ttf|otf))",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class TextSource:
    path: str
    text: str
    code_text: str
    lower: str
    code_lower: str
    extension: str
    manifest_like: bool
    document_like: bool


def human_bytes(value: int) -> str:
    size = float(value)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if size < 1024 or unit == "TiB":
            return f"{size:,.2f} {unit}" if unit != "B" else f"{value:,} B"
        size /= 1024
    return f"{value:,} B"


def md(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def words_for_stem(stem: str) -> list[str]:
    return [item for item in re.split(r"[-_. ]+", stem.casefold()) if item]


def source_is_manifest_like(path: str) -> bool:
    lower = path.casefold()
    return any(word in lower for word in MANIFEST_WORDS)


def mask_comments(text: str, extension: str) -> str:
    """Mask comments in code before path matching, keeping source bytes intact."""

    masked = text
    if extension in {".html", ".htm"}:
        masked = HTML_COMMENT_RE.sub(" ", masked)
    if extension in {
        ".cjs",
        ".css",
        ".js",
        ".less",
        ".mjs",
        ".sass",
        ".scss",
    }:
        masked = BLOCK_COMMENT_RE.sub(" ", masked)
        masked = LINE_COMMENT_RE.sub(" ", masked)
    if extension == ".py":
        masked = PY_COMMENT_RE.sub(" ", masked)
    return masked


def iter_quoted_spans(text: str) -> Iterable[tuple[str, str, int, int]]:
    """Yield quote, content, start, end with a linear scanner."""

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
        char = text[index]
        if char not in {"\"", "'", chr(96)}:
            index += 1
            continue
        quote = char
        start = index + 1
        index = start
        while index < length:
            char = text[index]
            if char == "\\":
                index += 2
                continue
            if char == quote:
                yield quote, text[start:index], start, index
                index += 1
                break
            index += 1
        else:
            return


def local_occurrence(text: str, needle: str) -> bool:
    """Find a local path token without treating an external URL as evidence."""

    lower = text.casefold()
    target = needle.casefold()
    start = 0
    while True:
        position = lower.find(target, start)
        if position < 0:
            return False
        line_start = lower.rfind("\n", 0, position) + 1
        prefix = lower[line_start:position]
        quote_cut = max(prefix.rfind('"'), prefix.rfind("'"), prefix.rfind(chr(96)))
        url_cut = max(
            prefix.rfind("http://"),
            prefix.rfind("https://"),
            prefix.rfind("file://"),
        )
        if url_cut <= quote_cut:
            return True
        start = position + max(1, len(target))


def path_variants(path: str) -> tuple[str, ...]:
    variants = {
        path,
        path.replace("/", "\\"),
        f"./{path}",
        f"/{path}",
    }
    return tuple(sorted(variants, key=lambda value: (len(value), value)))


def exact_static_reference(source: TextSource, target: str) -> bool:
    if source.document_like:
        return False
    text = source.code_text
    if any(local_occurrence(text, variant) for variant in path_variants(target)):
        return True
    for _, value, _, _ in iter_quoted_spans(text):
        if chr(36) + "{" in value or (source.extension == ".py" and "{" in value):
            continue
        for candidate in audit_media.candidate_paths(source.path, value):
            if candidate.casefold() == target.casefold():
                return True
    if source.extension in {".css", ".less", ".sass", ".scss"}:
        for match in audit_media.CSS_URL_RE.finditer(text):
            value = match.group("value")
            for candidate in audit_media.candidate_paths(source.path, value):
                if candidate.casefold() == target.casefold():
                    return True
    return False


def occurrences(text: str, needle: str, limit: int = 5) -> list[int]:
    """Return bounded, token-aware occurrences; basename alone is not proof."""

    lower = text.casefold()
    target = needle.casefold()
    if len(target) < 4:
        return []
    result: list[int] = []
    position = 0
    while len(result) < limit:
        position = lower.find(target, position)
        if position < 0:
            break
        before = lower[position - 1] if position else ""
        after_index = position + len(target)
        after = lower[after_index] if after_index < len(lower) else ""
        if not (
            before.isalnum()
            or before in "_-"
            or after.isalnum()
            or after in "_-"
        ):
            result.append(position)
        position += max(1, len(target))
    return result


def nearby_semantic_context(text: str, position: int, radius: int = 90) -> bool:
    context = text[max(0, position - radius) : position + radius].casefold()
    return any(
        re.search(
            rf"(?<![a-z0-9_-]){re.escape(word)}(?![a-z0-9_-])",
            context,
        )
        for word in SEMANTIC_WORDS
    )


def external_occurrence(text: str, position: int) -> bool:
    line_start = text.rfind("\n", 0, position) + 1
    prefix = text[line_start:position].casefold()
    quote_cut = max(prefix.rfind('"'), prefix.rfind("'"), prefix.rfind(chr(96)))
    url_cut = max(
        prefix.rfind("http://"),
        prefix.rfind("https://"),
        prefix.rfind("file://"),
    )
    return url_cut > quote_cut


def negative_reference_context(text: str, position: int) -> bool:
    context = text[max(0, position - 90) : position + 20].casefold()
    return "!=" in context or " not " in context or "exclude" in context


def source_document_context(source: TextSource, target: dict[str, Any]) -> bool:
    if not source.document_like and "readme" not in source.path.casefold():
        return False
    needles = [
        PurePosixPath(target["path"]).name,
        PurePosixPath(target["path"]).stem,
    ]
    for needle in needles:
        for position in occurrences(source.text, needle, limit=4):
            context = source.lower[max(0, position - 220) : position + 220]
            if any(word in context for word in SOURCE_DOC_WORDS):
                return True
    return False


def has_source_marker(path: str) -> bool:
    parts = PurePosixPath(path).parts
    stem = PurePosixPath(path).stem.casefold()
    path_words = {part.casefold() for part in parts[:-1]}
    stem_words = set(words_for_stem(stem))
    return bool((path_words | stem_words) & SOURCE_WORDS)


def derivative_markers(path: str) -> list[str]:
    parts = PurePosixPath(path).parts
    markers: list[str] = []
    for part in parts[:-1]:
        if part.casefold() in DERIVATIVE_DIR_WORDS:
            markers.append(f"directory:{part}")
    for word in words_for_stem(PurePosixPath(path).stem):
        if word in DERIVATIVE_FILE_WORDS:
            markers.append(f"filename:{word}")
    return sorted(set(markers))


def photo_collection_path(path: str) -> bool:
    parts = [part.casefold() for part in PurePosixPath(path).parts]
    return "photos" in parts and not derivative_markers(path)


def family_key(path: str) -> str:
    pure = PurePosixPath(path)
    parent = [part.casefold() for part in pure.parts[:-1]]
    parent = [part for part in parent if part not in FAMILY_DIR_WORDS]
    stem = pure.stem.casefold()
    tokens = words_for_stem(stem)
    kept = [token for token in tokens if token not in DERIVATIVE_FILE_WORDS]
    # A numeric camera/object id such as DSC_1280 is not a size variant.
    # Strip a resolution-like suffix only when at least two semantic stem
    # tokens remain, as in theme-epitaph-640.
    semantic_tokens = [token for token in kept if not token.isdigit()]
    if len(semantic_tokens) >= 2:
        kept = [
            token for token in kept if token not in RESOLUTION_TOKENS
        ]
    if not kept:
        kept = [stem]
    return "/".join(parent + ["_".join(kept)])


def variant_kinds(path: str) -> list[str]:
    kinds: set[str] = set()
    pure = PurePosixPath(path)
    for part in pure.parts[:-1]:
        lower = part.casefold()
        if lower in FAMILY_DIR_WORDS:
            kinds.add(lower)
    for token in words_for_stem(pure.stem):
        if token in DERIVATIVE_FILE_WORDS:
            kinds.add(token)
        elif token in RESOLUTION_TOKENS:
            kinds.add("resolution")
    return sorted(kinds)


def build_variant_families(records: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[family_key(record["path"])].append(record)
    families: dict[str, dict[str, Any]] = {}
    for key, members in grouped.items():
        if len(members) < 2:
            continue
        members = sorted(members, key=lambda item: item["path"])
        variants: dict[str, list[str]] = defaultdict(list)
        for member in members:
            for kind in variant_kinds(member["path"]):
                variants[kind].append(member["path"])
        families[key] = {
            "familyKey": key,
            "members": [member["path"] for member in members],
            "referencedMembers": sorted(
                member["path"] for member in members if member["referenced"]
            ),
            "orphanMembers": sorted(
                member["path"]
                for member in members
                if member["suspected_orphan"]
            ),
            "bytes": sum(member["bytes"] for member in members),
            "variantKinds": {
                kind: sorted(paths) for kind, paths in sorted(variants.items())
            },
            "hasReferencedWebDisplay": bool(
                any(
                    member["referenced"]
                    and any(
                        kind in {"web", "display", "thumb", "thumbnail"}
                        for kind in variant_kinds(member["path"])
                    )
                    for member in members
                )
            ),
        }
    return families


def load_text_sources(repo: Path) -> list[TextSource]:
    sources: list[TextSource] = []
    for path, relative in audit_media.iter_repo_files(repo):
        extension = audit_media.extension_for(relative)
        if (
            extension not in TRIAGE_TEXT_EXTENSIONS
            or relative in REFERENCE_OUTPUT_PATHS
        ):
            continue
        text = audit_media.decode_text(path)
        code_text = mask_comments(text, extension)
        sources.append(
            TextSource(
                path=relative,
                text=text,
                code_text=code_text,
                lower=text.casefold(),
                code_lower=code_text.casefold(),
                extension=extension,
                manifest_like=source_is_manifest_like(relative),
                document_like=extension in DOC_EXTENSIONS,
            )
        )
    return sources


def variable_static_form(value: str, extension: str) -> tuple[str, bool]:
    if extension == ".py":
        pattern = re.sub(r"\{[^{}]+\}", "__TRIAGE_VAR__", value)
    else:
        pattern = re.sub(r"\x24\{[^{}]*\}", "__TRIAGE_VAR__", value)
    return pattern, "__TRIAGE_VAR__" in pattern


def make_dynamic_rules(
    source: TextSource, value: str, kind: str
) -> list[dict[str, Any]]:
    static, has_variable = variable_static_form(value, source.extension)
    if not has_variable:
        return []
    if value.casefold().lstrip().startswith(
        ("http:", "https:", "file:", "data:")
    ):
        return []
    rules: list[dict[str, Any]] = []
    candidate_values = {static}
    candidate_values.update(
        match.group("value")
        for match in DYNAMIC_MEDIA_FRAGMENT_RE.finditer(static)
    )
    for candidate_value in sorted(candidate_values):
        for candidate in audit_media.candidate_paths(
            source.path, candidate_value
        ):
            candidate = candidate.replace("\\", "/")
            extension = audit_media.extension_for(candidate)
            if (
                extension not in audit_media.MEDIA_EXTENSIONS
                or "__TRIAGE_VAR__" not in candidate
            ):
                continue
            regex_text = re.escape(candidate).replace(
                re.escape("__TRIAGE_VAR__"), r"[^/]+"
            )
            rules.append(
                {
                    "source": source.path,
                    "kind": kind,
                    "pattern": value[:240],
                    "regex": re.compile(rf"^{regex_text}$", re.IGNORECASE),
                    "extension": extension,
                }
            )
    return rules


def build_dynamic_rules(sources: list[TextSource]) -> list[dict[str, Any]]:
    rules: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for source in sources:
        spans = list(iter_quoted_spans(source.code_text))
        for quote, value, _, _ in spans:
            if quote == chr(96) and chr(36) + "{" in value:
                kind = "template_literal"
            elif source.extension == ".py" and "{" in value and "}" in value:
                kind = "python_fstring_or_format"
            else:
                continue
            for rule in make_dynamic_rules(source, value, kind):
                identity = (
                    rule["source"],
                    rule["kind"],
                    rule["pattern"],
                    rule["regex"].pattern,
                )
                if identity not in seen:
                    seen.add(identity)
                    rules.append(rule)

        # Detect a simple concatenated path such as
        # "assets/photos/" + id + ".webp". It needs a path-looking fragment,
        # a media extension, and + between adjacent quoted fragments.
        for left_index, left in enumerate(spans):
            left_value = left[1]
            if (
                "/" not in left_value
                or audit_media.extension_for(left_value)
                in audit_media.MEDIA_EXTENSIONS
            ):
                continue
            for right in spans[left_index + 1 : left_index + 5]:
                between = source.code_text[left[3] + 1 : right[2]]
                if "+" not in between or len(between) > 320:
                    continue
                right_value = right[1]
                combined = f"{left_value}__TRIAGE_VAR__{right_value}"
                if (
                    audit_media.extension_for(right_value)
                    not in audit_media.MEDIA_EXTENSIONS
                ):
                    continue
                for rule in make_dynamic_rules(
                    source,
                    combined.replace(
                        "__TRIAGE_VAR__", chr(36) + "{value}"
                    ),
                    "string_concatenation",
                ):
                    identity = (
                        rule["source"],
                        rule["kind"],
                        rule["pattern"],
                        rule["regex"].pattern,
                    )
                    if identity not in seen:
                        seen.add(identity)
                        rules.append(rule)
    return sorted(
        rules,
        key=lambda item: (item["source"], item["kind"], item["pattern"]),
    )


def dynamic_hits_for_orphans(
    rules: list[dict[str, Any]], orphans: list[dict[str, Any]]
) -> dict[str, list[dict[str, str]]]:
    by_extension: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for rule in rules:
        by_extension[rule["extension"]].append(rule)
    hits: dict[str, list[dict[str, str]]] = defaultdict(list)
    for orphan in orphans:
        for rule in by_extension.get(orphan["extension"], []):
            if rule["regex"].fullmatch(orphan["path"]):
                hits[orphan["path"]].append(
                    {
                        "source": rule["source"],
                        "kind": rule["kind"],
                        "pattern": rule["pattern"],
                    }
                )
    for path in hits:
        hits[path] = sorted(
            hits[path],
            key=lambda item: (
                item["source"],
                item["kind"],
                item["pattern"],
            ),
        )
    return hits


def source_document_context_at(source: TextSource, position: int) -> bool:
    context = source.lower[max(0, position - 220) : position + 220]
    return any(word in context for word in SOURCE_DOC_WORDS)


def build_evidence_index(
    sources: list[TextSource],
    targets: list[dict[str, Any]],
    inventory_records: list[dict[str, Any]],
) -> dict[str, dict[str, set[str]]]:
    """Scan each text source once and invert basename/stem evidence."""

    evidence_keys = (
        "exactStaticReferences",
        "externalReferences",
        "manifestMatches",
        "pythonBuildReferences",
        "htmlDataAttributes",
        "cssUrlMatches",
        "indirectPathMatches",
        "sourceDocumentation",
        "manifestBasenameMatches",
    )
    index = {
        target["path"]: {key: set() for key in evidence_keys}
        for target in targets
    }
    target_by_needle: dict[str, set[str]] = defaultdict(set)
    for target in targets:
        pure = PurePosixPath(target["path"])
        for needle in {pure.name, pure.stem}:
            if len(needle) >= 4:
                target_by_needle[needle.casefold()].add(target["path"])
    if not target_by_needle:
        return index
    needle_pattern = re.compile(
        r"(?<![A-Za-z0-9_-])(?:"
        + "|".join(
            re.escape(needle)
            for needle in sorted(
                target_by_needle,
                key=lambda item: (-len(item), item),
            )
        )
        + r")(?![A-Za-z0-9_-])",
        re.IGNORECASE,
    )
    media_by_key = {
        record["path"].casefold(): record["path"]
        for record in inventory_records
    }
    for source in sources:
        data_ranges = [
            (match.start("value"), match.end("value"))
            for match in DATA_ATTR_RE.finditer(source.code_text)
        ]
        css_ranges = [
            (match.start("value"), match.end("value"))
            for match in audit_media.CSS_URL_RE.finditer(source.code_text)
        ]
        if not source.document_like:
            for _, value, _, _ in iter_quoted_spans(source.code_text):
                if chr(36) + "{" in value or (
                    source.extension == ".py" and "{" in value
                ):
                    continue
                for candidate in audit_media.candidate_paths(
                    source.path, value
                ):
                    actual = media_by_key.get(candidate.casefold())
                    if actual in index:
                        index[actual]["exactStaticReferences"].add(source.path)
            if source.extension in {".css", ".less", ".sass", ".scss"}:
                for match in audit_media.CSS_URL_RE.finditer(
                    source.code_text
                ):
                    for candidate in audit_media.candidate_paths(
                        source.path, match.group("value")
                    ):
                        actual = media_by_key.get(candidate.casefold())
                        if actual in index:
                            index[actual]["exactStaticReferences"].add(
                                source.path
                            )

        for match in needle_pattern.finditer(source.code_text):
            matched = match.group(0).casefold()
            for target_path in target_by_needle.get(matched, set()):
                if external_occurrence(source.code_text, match.start()):
                    index[target_path]["externalReferences"].add(source.path)
                    continue
                if source.document_like:
                    if source_document_context_at(source, match.start()):
                        index[target_path]["sourceDocumentation"].add(
                            source.path
                        )
                    continue
                if any(
                    start <= match.start() <= end for start, end in data_ranges
                ):
                    index[target_path]["htmlDataAttributes"].add(source.path)
                if any(
                    start <= match.start() <= end for start, end in css_ranges
                ):
                    index[target_path]["cssUrlMatches"].add(source.path)
                semantic = (
                    not negative_reference_context(
                        source.code_text, match.start()
                    )
                    and nearby_semantic_context(
                        source.code_text, match.start()
                    )
                )
                if semantic:
                    if source.manifest_like:
                        index[target_path]["manifestMatches"].add(
                            source.path
                        )
                    if source.extension == ".py":
                        index[target_path]["pythonBuildReferences"].add(
                            source.path
                        )
                    if source.extension in CODE_EXTENSIONS:
                        index[target_path]["indirectPathMatches"].add(
                            source.path
                        )
                if source.manifest_like:
                    index[target_path]["manifestBasenameMatches"].add(
                        source.path
                    )
    return index


def evidence_for_target(
    target: dict[str, Any],
    evidence_index: dict[str, dict[str, set[str]]],
    dynamic_hits: list[dict[str, str]],
) -> dict[str, Any]:
    indexed = evidence_index[target["path"]]
    return {
        key: sorted(values)
        for key, values in indexed.items()
    } | {"dynamicReferences": dynamic_hits}


def family_for_target(
    target: dict[str, Any], families: dict[str, dict[str, Any]]
) -> dict[str, Any] | None:
    family = families.get(family_key(target["path"]))
    if not family or target["path"] not in family["orphanMembers"]:
        return None
    return family


def classify_target(
    target: dict[str, Any],
    evidence: dict[str, Any],
    family: dict[str, Any] | None,
) -> tuple[str, str, bool, list[str]]:
    """Return classification, confidence, dynamic_possible, and signals."""

    signals: list[str] = []
    exact = evidence["exactStaticReferences"]
    dynamic = evidence["dynamicReferences"]
    manifest = evidence["manifestMatches"]
    python_sources = evidence["pythonBuildReferences"]
    data_attrs = evidence["htmlDataAttributes"]
    css_sources = evidence["cssUrlMatches"]
    indirect = evidence["indirectPathMatches"]
    docs = evidence["sourceDocumentation"]
    external = evidence["externalReferences"]
    markers = derivative_markers(target["path"])
    source_marker = has_source_marker(target["path"])
    photo_collection = photo_collection_path(target["path"])
    family_referenced = bool(family and family["referencedMembers"])
    family_kinds = set(variant_kinds(target["path"]))

    if exact:
        signals.append("exact_static_path")
        return "confirmed_referenced", "high", True, signals

    if dynamic:
        signals.append("dynamic_template_or_concatenation")
        confidence = (
            "high"
            if any(
                item["kind"]
                in {"template_literal", "python_fstring_or_format"}
                for item in dynamic
            )
            else "medium"
        )
        return "probable_dynamic_reference", confidence, True, signals

    if manifest:
        signals.append("manifest_or_photo_manifest_match")
    if python_sources:
        signals.append("python_build_script_match")
    if data_attrs:
        signals.append("html_data_attribute_match")
    if css_sources:
        signals.append("css_url_match")
    if indirect:
        signals.append("indirect_code_path_match")
    if external:
        signals.append("external_url_reference")

    dynamic_possible = bool(
        manifest
        or python_sources
        or data_attrs
        or css_sources
        or indirect
        or external
    )

    if docs:
        signals.append("source_or_archive_documentation")
        return "source_original", "high", dynamic_possible, signals

    if source_marker:
        signals.append("source_or_original_path_marker")
        return "source_original", "high", dynamic_possible, signals

    if family:
        signals.append("variant_family")
        if family_referenced:
            signals.append("referenced_sibling_variant")
        source_like_variant = (
            family_referenced
            and not markers
            and target["extension"] in {".jpg", ".jpeg", ".png", ".heic", ".tif", ".tiff"}
            and any(
                PurePosixPath(member).suffix.casefold() == ".webp"
                for member in family["members"]
            )
        )
        if source_like_variant:
            signals.append("source_format_sibling_variant")
            return "source_original", "medium", dynamic_possible, signals
        if family_kinds & DERIVATIVE_FILE_WORDS or markers:
            signals.append("derivative_variant_name")
            confidence = "high" if family_referenced else "medium"
            return "generated_derivative", confidence, dynamic_possible, signals
        if photo_collection:
            signals.append("photo_collection")
            return "source_original", "medium", dynamic_possible, signals
        return "unknown", "medium", dynamic_possible, signals

    if markers:
        signals.append("generated_or_derivative_path_marker")
        confidence = (
            "high"
            if any(
                marker.split(":", 1)[-1]
                in {"generated", "processed", "thumb", "thumbs", "web"}
                for marker in markers
            )
            else "medium"
        )
        return "generated_derivative", confidence, dynamic_possible, signals

    if photo_collection:
        signals.append("photo_collection_without_static_reference")
        return "source_original", "medium", dynamic_possible, signals

    if dynamic_possible:
        if data_attrs or css_sources or python_sources:
            return "probable_dynamic_reference", "medium", True, signals
        if manifest and not indirect:
            return "probable_dynamic_reference", "medium", True, signals
        signals.append("weak_stem_context_only")
        return "unknown", "low", True, signals

    if signals:
        return "unknown", "low", dynamic_possible, signals

    # High-confidence probable_unused is deliberately narrow. Any
    # dynamic/manifest possibility, family relation, source collection, or
    # derivative marker exits this branch before it can receive this label.
    return (
        "probable_unused",
        "high",
        False,
        ["no_static_dynamic_manifest_or_variant_evidence"],
    )


def reason_for_target(
    target: dict[str, Any],
    classification: str,
    confidence: str,
    evidence: dict[str, Any],
    family: dict[str, Any] | None,
) -> str:
    reasons: list[str] = []
    if evidence["exactStaticReferences"]:
        reasons.append("second pass found an exact local path in code/data")
    if evidence["externalReferences"]:
        reasons.append(
            "basename/stem appears in an external URL; not counted as a local reference"
        )
    if evidence["dynamicReferences"]:
        patterns = sorted(
            {item["pattern"] for item in evidence["dynamicReferences"]}
        )[:2]
        reasons.append("dynamic path pattern: " + ", ".join(patterns))
    if evidence["manifestMatches"]:
        reasons.append("basename/stem appears in a manifest-like data file")
    if evidence["pythonBuildReferences"]:
        reasons.append("Python build/generation source mentions the asset stem")
    if evidence["htmlDataAttributes"]:
        reasons.append("HTML data-* attribute contains the asset stem")
    if evidence["cssUrlMatches"]:
        reasons.append("CSS url() contains the asset stem")
    if evidence["indirectPathMatches"]:
        reasons.append("JS/JSON/Python object or array context contains the asset stem")
    if evidence["sourceDocumentation"]:
        reasons.append("README/docs describe the path or stem as source/original/archive material")
    if family:
        siblings = [
            path for path in family["members"] if path != target["path"]
        ]
        if family["referencedMembers"]:
            reasons.append(
                "variant family has referenced sibling(s): "
                + ", ".join(family["referencedMembers"][:3])
            )
        elif siblings:
            reasons.append("same-stem variant family: " + ", ".join(siblings[:3]))
        if family["hasReferencedWebDisplay"]:
            reasons.append("web/display variant is referenced while this member is not")
    markers = derivative_markers(target["path"])
    if markers:
        reasons.append("derivative/generated marker: " + ", ".join(markers[:4]))
    if classification == "source_original":
        reasons.append("source/original label is conservative and does not imply removability")
    if classification == "generated_derivative":
        reasons.append("generated/derivative label does not imply removability")
    if classification == "probable_unused":
        reasons.append("no static, dynamic, manifest, source, or variant evidence found")
    if classification == "unknown":
        reasons.append("evidence is insufficient for a safe keep-or-release decision")
    if not reasons:
        reasons.append("classified from the second-stage static evidence pass")
    return f"{classification}/{confidence}: " + "; ".join(reasons)


def related_files_for(
    evidence: dict[str, Any], family: dict[str, Any] | None
) -> list[str]:
    related: set[str] = set()
    for key in (
        "exactStaticReferences",
        "externalReferences",
        "manifestMatches",
        "pythonBuildReferences",
        "htmlDataAttributes",
        "cssUrlMatches",
        "indirectPathMatches",
        "sourceDocumentation",
        "manifestBasenameMatches",
    ):
        related.update(evidence.get(key, []))
    related.update(
        item["source"] for item in evidence.get("dynamicReferences", [])
    )
    if family:
        related.update(family["members"])
    return sorted(related)


def build_file_record(
    target: dict[str, Any],
    evidence_index: dict[str, dict[str, set[str]]],
    dynamic_hits: list[dict[str, str]],
    families: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    evidence = evidence_for_target(target, evidence_index, dynamic_hits)
    family = family_for_target(target, families)
    classification, confidence, dynamic_possible, signals = classify_target(
        target, evidence, family
    )
    return {
        "path": target["path"],
        "bytes": target["bytes"],
        "module": target["module"],
        "classification": classification,
        "confidence": confidence,
        "reason": reason_for_target(
            target, classification, confidence, evidence, family
        ),
        "relatedFiles": related_files_for(evidence, family),
        "signals": signals,
        "dynamicPossible": dynamic_possible,
        "evidence": evidence,
        "variantFamily": family["familyKey"] if family else None,
    }


def aggregate_directories(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    totals: dict[str, dict[str, int]] = defaultdict(
        lambda: {
            "fileCount": 0,
            "bytes": 0,
            "probableUnusedBytes": 0,
            "highConfidenceProbableUnusedBytes": 0,
            "dynamicReferenceBytes": 0,
            "generatedDerivativeBytes": 0,
        }
    )
    for record in records:
        parts = PurePosixPath(record["path"]).parts
        for index in range(1, len(parts)):
            directory = "/".join(parts[:index])
            total = totals[directory]
            total["fileCount"] += 1
            total["bytes"] += record["bytes"]
            if record["classification"] == "probable_unused":
                total["probableUnusedBytes"] += record["bytes"]
                if record["confidence"] == "high":
                    total["highConfidenceProbableUnusedBytes"] += record["bytes"]
            if record["classification"] == "probable_dynamic_reference":
                total["dynamicReferenceBytes"] += record["bytes"]
            if record["classification"] == "generated_derivative":
                total["generatedDerivativeBytes"] += record["bytes"]
    return [
        {"path": path, **totals[path]}
        for path in sorted(
            totals,
            key=lambda item: (
                -totals[item]["probableUnusedBytes"],
                -totals[item]["bytes"],
                item,
            ),
        )
    ]


def aggregate_modules(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    totals: dict[str, dict[str, Any]] = {}
    for record in records:
        module = record["module"] or "global"
        if module not in totals:
            totals[module] = {
                "module": module,
                "fileCount": 0,
                "bytes": 0,
                "classifications": {
                    classification: {"fileCount": 0, "bytes": 0}
                    for classification in CLASSIFICATIONS
                },
            }
        item = totals[module]
        item["fileCount"] += 1
        item["bytes"] += record["bytes"]
        class_total = item["classifications"][record["classification"]]
        class_total["fileCount"] += 1
        class_total["bytes"] += record["bytes"]
    return sorted(
        totals.values(),
        key=lambda item: (
            -item["bytes"],
            -item["fileCount"],
            item["module"],
        ),
    )


def aggregate_parent_directories(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Rank actual containing directories without repeating every ancestor."""

    totals: dict[str, dict[str, int]] = defaultdict(
        lambda: {
            "fileCount": 0,
            "bytes": 0,
            "probableUnusedBytes": 0,
            "highConfidenceProbableUnusedBytes": 0,
            "dynamicReferenceBytes": 0,
            "generatedDerivativeBytes": 0,
        }
    )
    for record in records:
        parent = PurePosixPath(record["path"]).parent.as_posix()
        if parent == ".":
            parent = "global"
        item = totals[parent]
        item["fileCount"] += 1
        item["bytes"] += record["bytes"]
        if record["classification"] == "probable_unused":
            item["probableUnusedBytes"] += record["bytes"]
            if record["confidence"] == "high":
                item["highConfidenceProbableUnusedBytes"] += record["bytes"]
        if record["classification"] == "probable_dynamic_reference":
            item["dynamicReferenceBytes"] += record["bytes"]
        if record["classification"] == "generated_derivative":
            item["generatedDerivativeBytes"] += record["bytes"]
    return [
        {"path": path, **totals[path]}
        for path in sorted(
            totals,
            key=lambda item: (
                -totals[item]["probableUnusedBytes"],
                -totals[item]["bytes"],
                item,
            ),
        )
    ]


def special_directory_stats(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for root in SPECIAL_DIRECTORIES:
        members = [
            record
            for record in records
            if record["path"] == root or record["path"].startswith(root + "/")
        ]
        by_class = {
            classification: {
                "fileCount": sum(
                    record["classification"] == classification
                    for record in members
                ),
                "bytes": sum(
                    record["bytes"]
                    for record in members
                    if record["classification"] == classification
                ),
            }
            for classification in CLASSIFICATIONS
        }
        result.append(
            {
                "path": root,
                "fileCount": len(members),
                "bytes": sum(record["bytes"] for record in members),
                "classifications": by_class,
                "highConfidenceProbableUnusedBytes": sum(
                    record["bytes"]
                    for record in members
                    if record["classification"] == "probable_unused"
                    and record["confidence"] == "high"
                ),
            }
        )
    return result


def disposition_directories(
    records: list[dict[str, Any]],
    inventory_records: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    inventory_by_dir: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in inventory_records:
        pure = PurePosixPath(record["path"])
        for index in range(1, len(pure.parts)):
            inventory_by_dir["/".join(pure.parts[:index])].append(record)

    triage_by_dir: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        pure = PurePosixPath(record["path"])
        for index in range(1, len(pure.parts)):
            triage_by_dir["/".join(pure.parts[:index])].append(record)

    dispositions: dict[str, list[dict[str, Any]]] = {
        "keepInWebsiteRepository": [],
        "webDisplayOnlyCandidate": [],
        "originalsOutOfRepositoryCandidate": [],
        "manualConfirmation": [],
    }
    for directory in sorted(triage_by_dir):
        members = triage_by_dir[directory]
        all_members = inventory_by_dir.get(directory, [])
        referenced = sum(member["referenced"] for member in all_members)
        dynamic = sum(
            member["classification"] == "probable_dynamic_reference"
            for member in members
        )
        source_bytes = sum(
            member["bytes"]
            for member in members
            if member["classification"] == "source_original"
        )
        generated_bytes = sum(
            member["bytes"]
            for member in members
            if member["classification"] == "generated_derivative"
        )
        unknown_bytes = sum(
            member["bytes"]
            for member in members
            if member["classification"] == "unknown"
        )
        probable_unused_bytes = sum(
            member["bytes"]
            for member in members
            if member["classification"] == "probable_unused"
        )
        marker = directory.casefold()
        item = {
            "path": directory,
            "bytes": sum(member["bytes"] for member in members),
            "suspectedOrphanCount": len(members),
            "referencedSiblingCount": referenced,
            "dynamicRescueCount": dynamic,
        }
        if dynamic or referenced:
            dispositions["keepInWebsiteRepository"].append(item)
        if any(
            token in marker.split("/")
            for token in {"web", "thumb", "thumbs", "display", "preview"}
        ) and referenced:
            dispositions["webDisplayOnlyCandidate"].append(item)
        if source_bytes:
            dispositions["originalsOutOfRepositoryCandidate"].append(
                {**item, "sourceOriginalBytes": source_bytes}
            )
        if unknown_bytes or generated_bytes or probable_unused_bytes:
            dispositions["manualConfirmation"].append(
                {
                    **item,
                    "unknownBytes": unknown_bytes,
                    "generatedDerivativeBytes": generated_bytes,
                    "probableUnusedBytes": probable_unused_bytes,
                }
            )

    for key in dispositions:
        dispositions[key] = sorted(
            dispositions[key],
            key=lambda item: (-item["bytes"], item["path"]),
        )[:20]
    return dispositions


def build_summary(
    triage_records: list[dict[str, Any]],
    inventory_records: list[dict[str, Any]],
    families: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    class_totals = {
        classification: {
            "fileCount": sum(
                record["classification"] == classification
                for record in triage_records
            ),
            "bytes": sum(
                record["bytes"]
                for record in triage_records
                if record["classification"] == classification
            ),
        }
        for classification in CLASSIFICATIONS
    }
    confidence_totals = {
        confidence: {
            "fileCount": sum(
                record["confidence"] == confidence for record in triage_records
            ),
            "bytes": sum(
                record["bytes"]
                for record in triage_records
                if record["confidence"] == confidence
            ),
        }
        for confidence in CONFIDENCES
    }
    high_unused = [
        record
        for record in triage_records
        if record["classification"] == "probable_unused"
        and record["confidence"] == "high"
    ]
    dynamic_rescues = [
        record
        for record in triage_records
        if record["classification"] == "probable_dynamic_reference"
    ]
    directory_stats = aggregate_directories(triage_records)
    parent_directory_stats = aggregate_parent_directories(triage_records)
    priority: list[dict[str, Any]] = []
    selected_priority_paths: set[str] = set()
    priority_sources = [
        (
            "probable_unused_release_candidate",
            [
                item
                for item in parent_directory_stats
                if item["probableUnusedBytes"] > 0
            ],
        ),
        (
            "generated_derivative_pipeline_review",
            [
                item
                for item in sorted(
                    parent_directory_stats,
                    key=lambda item: (
                        -item["generatedDerivativeBytes"],
                        -item["bytes"],
                        item["path"],
                    ),
                )
                if item["generatedDerivativeBytes"] > 0
            ],
        ),
    ]
    for basis, candidates in priority_sources:
        for item in candidates:
            if item["path"] in selected_priority_paths:
                continue
            priority.append({**item, "priorityBasis": basis})
            selected_priority_paths.add(item["path"])
            if len(priority) >= 5:
                break
        if len(priority) >= 5:
            break
    return {
        "schemaVersion": 1,
        "inputSuspectedOrphanCount": len(triage_records),
        "inputSuspectedOrphanBytes": sum(
            record["bytes"] for record in triage_records
        ),
        "auditBaseline": {
            "suspectedOrphanCount": EXPECTED_AUDIT_ORPHAN_COUNT,
            "suspectedOrphanBytes": EXPECTED_AUDIT_ORPHAN_BYTES,
        },
        "classificationCounts": [
            {
                "classification": classification,
                **class_totals[classification],
            }
            for classification in CLASSIFICATIONS
        ],
        "classificationTotals": class_totals,
        "confidenceTotals": confidence_totals,
        "highConfidenceProbableUnusedCount": len(high_unused),
        "highConfidenceProbableUnusedBytes": sum(
            record["bytes"] for record in high_unused
        ),
        "sourceOriginalCount": class_totals["source_original"]["fileCount"],
        "sourceOriginalBytes": class_totals["source_original"]["bytes"],
        "generatedDerivativeCount": class_totals["generated_derivative"]["fileCount"],
        "generatedDerivativeBytes": class_totals["generated_derivative"]["bytes"],
        "dynamicReferenceRescueCount": len(dynamic_rescues),
        "dynamicReferenceRescueBytes": sum(
            record["bytes"] for record in dynamic_rescues
        ),
        "confirmedReferencedCount": class_totals["confirmed_referenced"]["fileCount"],
        "confirmedReferencedBytes": class_totals["confirmed_referenced"]["bytes"],
        "variantFamilyCount": sum(
            bool(family["orphanMembers"]) for family in families.values()
        ),
        "byModule": aggregate_modules(triage_records),
        "byDirectory": directory_stats,
        "priorityDirectories": priority,
        "specialDirectories": special_directory_stats(triage_records),
        "directoryDispositions": disposition_directories(
            triage_records, inventory_records
        ),
        "classificationDefinitions": {
            "confirmed_referenced": "Second pass found an exact local static path.",
            "probable_dynamic_reference": "A dynamic/template/manifest/indirect path may resolve to the file.",
            "source_original": "Source/original/archive material or a conservative photo collection label.",
            "generated_derivative": "Generated or named derivative/variant; not automatically removable.",
            "probable_unused": "No static, dynamic, manifest, source, or variant evidence found.",
            "unknown": "Insufficient evidence for a safe keep-or-release decision.",
        },
    }


def build_triage(
    repo: Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    inventory_path = repo / "data" / "media-inventory.json"
    if not inventory_path.is_file():
        raise ValueError("data/media-inventory.json is missing")
    audit_inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    inventory_records = audit_inventory.get("files")
    if not isinstance(inventory_records, list):
        raise ValueError("media inventory files is not a list")
    orphans = [
        record for record in inventory_records if record.get("suspected_orphan")
    ]
    audit_summary = audit_inventory.get("summary", {})
    if len(orphans) != audit_summary.get("suspectedOrphanCount"):
        raise ValueError("inventory orphan count differs from audit summary")
    orphan_bytes = sum(record["bytes"] for record in orphans)
    if orphan_bytes != audit_summary.get("suspectedOrphanBytes"):
        raise ValueError("inventory orphan bytes differ from audit summary")
    if (
        len(orphans) != EXPECTED_AUDIT_ORPHAN_COUNT
        or orphan_bytes != EXPECTED_AUDIT_ORPHAN_BYTES
    ):
        raise ValueError(
            f"expected PR #4 orphan baseline {EXPECTED_AUDIT_ORPHAN_COUNT}/{EXPECTED_AUDIT_ORPHAN_BYTES}, "
            f"got {len(orphans)}/{orphan_bytes}"
        )

    sources = load_text_sources(repo)
    rules = build_dynamic_rules(sources)
    dynamic_hits = dynamic_hits_for_orphans(rules, orphans)
    families = build_variant_families(inventory_records)
    evidence_index = build_evidence_index(
        sources, orphans, inventory_records
    )
    triage_records = [
        build_file_record(
            target,
            evidence_index,
            dynamic_hits.get(target["path"], []),
            families,
        )
        for target in sorted(orphans, key=lambda record: record["path"])
    ]
    triage = {
        "schemaVersion": 1,
        "input": {
            "inventory": "data/media-inventory.json",
            "auditSchemaVersion": audit_inventory.get("schemaVersion"),
            "suspectedOrphanCount": len(orphans),
            "suspectedOrphanBytes": orphan_bytes,
        },
        "scan": {
            "textExtensions": sorted(TRIAGE_TEXT_EXTENSIONS),
            "referenceOutputExclusions": sorted(REFERENCE_OUTPUT_PATHS),
            "dynamicRuleCount": len(rules),
            "specialDirectories": list(SPECIAL_DIRECTORIES),
        },
        "files": triage_records,
        "variantFamilies": [
            families[key]
            for key in sorted(families)
            if families[key]["orphanMembers"]
        ],
    }
    summary = build_summary(triage_records, inventory_records, families)
    return triage, summary


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def report_markdown(
    triage: dict[str, Any], summary: dict[str, Any]
) -> str:
    files = triage["files"]
    classification_map = summary["classificationTotals"]
    lines = [
        "# MEDIA ORPHAN TRIAGE",
        "",
        f"- Input suspected orphans: **{summary['inputSuspectedOrphanCount']:,}** / **{summary['inputSuspectedOrphanBytes']:,} bytes ({human_bytes(summary['inputSuspectedOrphanBytes'])})**",
        "- No media file was deleted, moved, compressed, renamed, or re-encoded.",
        "- probable_unused is a review label only; source_original and generated_derivative are not deletion approvals.",
        "",
        "## Classification totals",
        "",
        "| Classification | Files | Bytes |",
        "|---|---:|---:|",
    ]
    for classification in CLASSIFICATIONS:
        item = classification_map[classification]
        lines.append(
            f"| {classification} | {item['fileCount']:,} | {item['bytes']:,} ({human_bytes(item['bytes'])}) |"
        )

    lines.extend(
        [
            "",
            "## By module",
            "",
            "| Module | Orphans | Bytes | High-confidence probable_unused bytes | Dynamic rescue bytes |",
            "|---|---:|---:|---:|---:|",
        ]
    )
    for item in summary["byModule"]:
        high_unused = sum(
            record["bytes"]
            for record in files
            if (record["module"] or "global") == item["module"]
            and record["classification"] == "probable_unused"
            and record["confidence"] == "high"
        )
        dynamic = item["classifications"]["probable_dynamic_reference"]["bytes"]
        lines.append(
            f"| {md(item['module'])} | {item['fileCount']:,} | {item['bytes']:,} | {high_unused:,} | {dynamic:,} |"
        )

    lines.extend(
        [
            "",
            "## High-confidence probable_unused",
            "",
            f"- Count: **{summary['highConfidenceProbableUnusedCount']:,}**",
            f"- Bytes: **{summary['highConfidenceProbableUnusedBytes']:,} ({human_bytes(summary['highConfidenceProbableUnusedBytes'])})**",
            "- The list is sorted by bytes. These are candidates for human review, not automatic cleanup.",
            "",
            "| # | Path | Bytes | Module | Reason |",
            "|---:|---|---:|---|---|",
        ]
    )
    high_unused_records = sorted(
        [
            record
            for record in files
            if record["classification"] == "probable_unused"
            and record["confidence"] == "high"
        ],
        key=lambda record: (-record["bytes"], record["path"]),
    )[:100]
    for index, record in enumerate(high_unused_records, 1):
        lines.append(
            f"| {index} | {md(record['path'])} | {record['bytes']:,} | {md(record['module'] or 'global')} | {md(record['reason'])} |"
        )
    if not high_unused_records:
        lines.append("| — | — | 0 | — | none |")

    lines.extend(
        [
            "",
            "## Source originals and generated derivatives",
            "",
            f"- source_original: **{summary['sourceOriginalCount']:,}** / **{summary['sourceOriginalBytes']:,} bytes ({human_bytes(summary['sourceOriginalBytes'])})**",
            f"- generated_derivative: **{summary['generatedDerivativeCount']:,}** / **{summary['generatedDerivativeBytes']:,} bytes ({human_bytes(summary['generatedDerivativeBytes'])})**",
            f"- probable_dynamic_reference rescues: **{summary['dynamicReferenceRescueCount']:,}** / **{summary['dynamicReferenceRescueBytes']:,} bytes ({human_bytes(summary['dynamicReferenceRescueBytes'])})**",
            f"- Exact second-pass static references: **{summary['confirmedReferencedCount']:,}** / **{summary['confirmedReferencedBytes']:,} bytes**",
            "",
            "## Variant families",
            "",
            f"- Families involving suspected orphans: **{summary['variantFamilyCount']:,}**",
            "- Referenced web/display/thumb siblings are recorded explicitly; unreferenced members remain review items.",
            "",
            "| Family key | Members | Referenced members | Bytes |",
            "|---|---:|---:|---:|",
        ]
    )
    families = sorted(
        triage["variantFamilies"],
        key=lambda family: (-family["bytes"], family["familyKey"]),
    )
    for family in families[:100]:
        lines.append(
            f"| {md(family['familyKey'])} | {len(family['members']):,} | {len(family['referencedMembers']):,} | {family['bytes']:,} |"
        )
    if not families:
        lines.append("| — | 0 | 0 | 0 |")

    lines.extend(
        [
            "",
            "## Priority directories by potential storage action",
            "",
            "The first rows are probable_unused release candidates. generated_derivative rows are pipeline-review candidates only; they are not deletion approvals.",
            "",
            "| # | Basis | Directory | Orphans | Bytes | probable_unused bytes | generated_derivative bytes |",
            "|---:|---|---|---:|---:|---:|---:|",
        ]
    )
    for index, item in enumerate(summary["priorityDirectories"], 1):
        lines.append(
            f"| {index} | {item['priorityBasis']} | {md(item['path'])} | {item['fileCount']:,} | {item['bytes']:,} | {item['probableUnusedBytes']:,} | {item['generatedDerivativeBytes']:,} |"
        )
    if not summary["priorityDirectories"]:
        lines.append("| — | — | — | 0 | 0 | 0 | 0 |")

    lines.extend(
        [
            "",
            "## Special directories",
            "",
            "| Directory | Orphans | Bytes | Dynamic | Source original bytes | Generated derivative bytes | High-confidence probable_unused bytes |",
            "|---|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for item in summary["specialDirectories"]:
        classes = item["classifications"]
        lines.append(
            f"| {item['path']} | {item['fileCount']:,} | {item['bytes']:,} | {classes['probable_dynamic_reference']['fileCount']:,} | {classes['source_original']['bytes']:,} | {classes['generated_derivative']['bytes']:,} | {item['highConfidenceProbableUnusedBytes']:,} |"
        )

    disposition_labels = (
        ("keepInWebsiteRepository", "Suitable to keep in website repository"),
        ("webDisplayOnlyCandidate", "Web/display-only candidates"),
        ("originalsOutOfRepositoryCandidate", "Originals-out-of-repository candidates"),
        ("manualConfirmation", "Needs later manual confirmation"),
    )
    for key, label in disposition_labels:
        lines.extend(["", f"### {label}", ""])
        items = summary["directoryDispositions"].get(key, [])[:10]
        if not items:
            lines.append("- none detected")
            continue
        for item in items:
            suffix = (
                f"; suspected orphan {item['suspectedOrphanCount']:,} / {item['bytes']:,} bytes"
            )
            if item.get("dynamicRescueCount"):
                suffix += f"; dynamic rescue {item['dynamicRescueCount']:,}"
            lines.append(f"- {item['path']} — {item['bytes']:,} bytes{suffix}")

    lines.extend(
        [
            "",
            "## Guardrails",
            "",
            "- Input is the suspected_orphan set from data/media-inventory.json; all six classifications sum to that exact set and byte total.",
            "- Dynamic checks cover JS template literals, simple string concatenation, Python formatted strings, manifest-like JSON, HTML data-* values, CSS url(), and code/data stem context.",
            "- No PDF content, image pixels, EXIF, OCR, network resource, or media payload was read.",
            "- Re-run with python scripts/triage_media_orphans.py; --validate checks generated artifacts without rewriting them.",
            "",
        ]
    )
    return "\n".join(lines)


def write_outputs(
    repo: Path, triage: dict[str, Any], summary: dict[str, Any]
) -> None:
    write_json(repo / "data" / "media-orphan-triage.json", triage)
    write_json(repo / "data" / "media-orphan-summary.json", summary)
    report_path = repo / "docs" / "MEDIA_ORPHAN_TRIAGE.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        report_markdown(triage, summary),
        encoding="utf-8",
        newline="\n",
    )


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_outputs(repo: Path) -> dict[str, Any]:
    inventory = load_json(repo / "data" / "media-inventory.json")
    triage = load_json(repo / "data" / "media-orphan-triage.json")
    summary = load_json(repo / "data" / "media-orphan-summary.json")
    inventory_records = inventory.get("files")
    triage_records = triage.get("files")
    if not isinstance(inventory_records, list) or not isinstance(triage_records, list):
        raise ValueError("inventory.files and triage.files must be lists")
    orphan_records = [
        record for record in inventory_records if record.get("suspected_orphan")
    ]
    expected_by_path = {record["path"]: record for record in orphan_records}
    actual_by_path = {record.get("path"): record for record in triage_records}
    if len(actual_by_path) != len(triage_records):
        raise ValueError("triage contains duplicate paths")
    if set(actual_by_path) != set(expected_by_path):
        raise ValueError("triage paths differ from audit suspected orphan paths")
    if len(orphan_records) != EXPECTED_AUDIT_ORPHAN_COUNT:
        raise ValueError("audit orphan count is not the PR #4 baseline")
    orphan_bytes = sum(record["bytes"] for record in orphan_records)
    if orphan_bytes != EXPECTED_AUDIT_ORPHAN_BYTES:
        raise ValueError("audit orphan bytes are not the PR #4 baseline")

    for path, result in actual_by_path.items():
        source = expected_by_path[path]
        if result.get("bytes") != source.get("bytes"):
            raise ValueError(f"triage byte mismatch: {path}")
        if result.get("module") != source.get("module"):
            raise ValueError(f"triage module mismatch: {path}")
        if result.get("classification") not in CLASSIFICATIONS:
            raise ValueError(f"invalid classification: {path}")
        if result.get("confidence") not in CONFIDENCES:
            raise ValueError(f"invalid confidence: {path}")
        related = result.get("relatedFiles")
        if not isinstance(related, list) or related != sorted(set(related)):
            raise ValueError(f"relatedFiles is not unique/sorted: {path}")
        for related_path in related:
            if not (repo / PurePosixPath(related_path)).is_file():
                raise ValueError(f"related file does not exist: {related_path}")
        if (
            result["classification"] == "probable_unused"
            and result["confidence"] == "high"
            and result.get("dynamicPossible")
        ):
            raise ValueError(
                f"dynamic possibility was marked probable_unused/high: {path}"
            )
        evidence = result.get("evidence", {})
        for dynamic in evidence.get("dynamicReferences", []):
            if dynamic.get("source") not in related:
                raise ValueError(
                    f"dynamic source missing from relatedFiles: {path}"
                )

    families = triage.get("variantFamilies")
    if not isinstance(families, list):
        raise ValueError("triage.variantFamilies is not a list")
    family_keys: set[str] = set()
    for family in families:
        key = family.get("familyKey")
        if not isinstance(key, str) or key in family_keys:
            raise ValueError("variant family keys are not unique")
        family_keys.add(key)
        members = family.get("members")
        if not isinstance(members, list) or members != sorted(set(members)):
            raise ValueError(
                f"variant family members are not unique/sorted: {key}"
            )
        for member in members:
            if not (repo / PurePosixPath(member)).is_file():
                raise ValueError(
                    f"variant family member does not exist: {member}"
                )
        if not set(family.get("orphanMembers", [])).issubset(set(members)):
            raise ValueError(f"variant family orphan members mismatch: {key}")
        if not set(family.get("referencedMembers", [])).issubset(set(members)):
            raise ValueError(
                f"variant family referenced members mismatch: {key}"
            )

    class_totals = {
        classification: {
            "fileCount": sum(
                record["classification"] == classification
                for record in triage_records
            ),
            "bytes": sum(
                record["bytes"]
                for record in triage_records
                if record["classification"] == classification
            ),
        }
        for classification in CLASSIFICATIONS
    }
    if sum(item["fileCount"] for item in class_totals.values()) != len(
        triage_records
    ):
        raise ValueError("classification counts do not sum to triage input count")
    if sum(item["bytes"] for item in class_totals.values()) != orphan_bytes:
        raise ValueError("classification bytes do not sum to audit orphan bytes")
    if summary.get("inputSuspectedOrphanCount") != len(triage_records):
        raise ValueError("summary input count mismatch")
    if summary.get("inputSuspectedOrphanBytes") != orphan_bytes:
        raise ValueError("summary input bytes mismatch")
    if summary.get("classificationTotals") != class_totals:
        raise ValueError("summary classification totals mismatch")
    high_unused = [
        record
        for record in triage_records
        if record["classification"] == "probable_unused"
        and record["confidence"] == "high"
    ]
    if summary.get("highConfidenceProbableUnusedCount") != len(high_unused):
        raise ValueError("summary high-confidence probable_unused count mismatch")
    if summary.get("highConfidenceProbableUnusedBytes") != sum(
        record["bytes"] for record in high_unused
    ):
        raise ValueError("summary high-confidence probable_unused bytes mismatch")
    dynamic = [
        record
        for record in triage_records
        if record["classification"] == "probable_dynamic_reference"
    ]
    if summary.get("dynamicReferenceRescueCount") != len(dynamic):
        raise ValueError("summary dynamic rescue count mismatch")
    if summary.get("dynamicReferenceRescueBytes") != sum(
        record["bytes"] for record in dynamic
    ):
        raise ValueError("summary dynamic rescue bytes mismatch")
    if summary.get("sourceOriginalCount") != class_totals["source_original"]["fileCount"]:
        raise ValueError("summary source_original count mismatch")
    if summary.get("sourceOriginalBytes") != class_totals["source_original"]["bytes"]:
        raise ValueError("summary source_original bytes mismatch")
    if summary.get("generatedDerivativeCount") != class_totals["generated_derivative"]["fileCount"]:
        raise ValueError("summary generated_derivative count mismatch")
    if summary.get("generatedDerivativeBytes") != class_totals["generated_derivative"]["bytes"]:
        raise ValueError("summary generated_derivative bytes mismatch")
    if summary.get("variantFamilyCount") != len(families):
        raise ValueError("summary variant family count mismatch")
    return {
        "inputSuspectedOrphanCount": len(triage_records),
        "inputSuspectedOrphanBytes": orphan_bytes,
        "highConfidenceProbableUnusedCount": len(high_unused),
        "highConfidenceProbableUnusedBytes": sum(
            record["bytes"] for record in high_unused
        ),
        "sourceOriginalCount": class_totals["source_original"]["fileCount"],
        "sourceOriginalBytes": class_totals["source_original"]["bytes"],
        "generatedDerivativeCount": class_totals["generated_derivative"]["fileCount"],
        "generatedDerivativeBytes": class_totals["generated_derivative"]["bytes"],
        "dynamicReferenceRescueCount": len(dynamic),
        "dynamicReferenceRescueBytes": sum(
            record["bytes"] for record in dynamic
        ),
        "variantFamilyCount": len(families),
    }


def run(repo: Path, write: bool) -> int:
    if write:
        triage, summary = build_triage(repo)
        write_outputs(repo, triage, summary)
    result = validate_outputs(repo)
    print("ORPHAN_TRIAGE=PASS")
    for key, value in result.items():
        print(f"{key}={value}")
    print("ORPHAN_TRIAGE_VALIDATION=PASS")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repository root (defaults to the parent of scripts/)",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="validate existing triage artifacts without rewriting them",
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
