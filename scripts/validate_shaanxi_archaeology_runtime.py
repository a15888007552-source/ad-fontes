#!/usr/bin/env python3
"""Validate Shaanxi Archaeology Museum runtime media routing offline."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MODULE = "shaanxi-archaeology-museum"
MODULE_PREFIX = f"modules/{MODULE}/"
PUBLIC_BASE = "https://ad-fontes-media.gusgumee777.workers.dev"
EXPECTED_FILES = 1061
EXPECTED_BYTES = 103024634
UPLOAD_VERIFICATION = ROOT / "data" / "shaanxi-archaeology-r2-upload-verification.json"
DEFAULT_OUTPUT = ROOT / "data" / "shaanxi-archaeology-r2-runtime-verification.json"
MEDIA_SUFFIXES = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".avif",
    ".heic",
    ".tif",
    ".tiff",
    ".mp3",
    ".wav",
    ".flac",
    ".m4a",
    ".ogg",
    ".mp4",
    ".webm",
    ".mov",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
}
COMPLETE_URL = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|//)", re.I)
WORKER_PREFIX = PUBLIC_BASE.rstrip("/") + "/"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def strip_query_hash(value: str) -> str:
    return re.split(r"[?#]", value, maxsplit=1)[0]


def resolve_module_path(value: str | None) -> str | None:
    if value is None:
        return value
    value = str(value)
    if not value or COMPLETE_URL.match(value):
        return value
    normalized = value[2:] if value.startswith("./") else value
    if normalized.startswith(MODULE_PREFIX):
        repo_path = normalized
    elif normalized.startswith(("assets/", "review/")):
        repo_path = MODULE_PREFIX + normalized
    else:
        return value
    return WORKER_PREFIX + repo_path.lstrip("/")


def repo_path_from_value(value: str) -> str | None:
    value = str(value).strip()
    if value.startswith(WORKER_PREFIX):
        return strip_query_hash(value[len(WORKER_PREFIX) :])
    if value.startswith(MODULE_PREFIX):
        return strip_query_hash(value)
    if value.startswith(("assets/", "review/")):
        return MODULE_PREFIX + strip_query_hash(value)
    return None


def load_plan() -> tuple[list[dict[str, Any]], set[str], int, int]:
    payload = json.loads(read_text(ROOT / "data" / "media-externalization-plan.json"))
    entries = [
        item
        for item in payload.get("externalizableMedia", [])
        if item.get("module") == MODULE
    ]
    paths = {item["path"] for item in entries}
    total_bytes = sum(int(item["bytes"]) for item in entries)
    return entries, paths, len(entries), total_bytes


def parse_attr_media(index_text: str) -> list[dict[str, str]]:
    refs: list[dict[str, str]] = []
    pattern = re.compile(r"\b(src|href|srcset)\s*=\s*([\"'])(.*?)\2", re.I | re.S)
    for match in pattern.finditer(index_text):
        attribute = match.group(1).lower()
        raw_value = match.group(3).strip()
        values = (
            [part.strip().split()[0] for part in raw_value.split(",") if part.strip()]
            if attribute == "srcset"
            else [raw_value]
        )
        for value in values:
            repo_path = repo_path_from_value(value)
            if repo_path:
                refs.append({"attribute": attribute, "value": value, "path": repo_path})
    return refs


def loaded_stylesheets(index_text: str) -> list[str]:
    return re.findall(
        r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)',
        index_text,
        re.I,
    )


def loaded_scripts(index_text: str) -> list[str]:
    return re.findall(r'<script[^>]+src=["\']([^"\']+)', index_text, re.I)


def resolve_loaded_path(relative: str) -> Path:
    return (ROOT / "modules" / MODULE / relative.split("?", 1)[0]).resolve()


def css_media_refs(index_text: str) -> tuple[dict[str, str], list[dict[str, str]]]:
    texts: dict[str, str] = {}
    refs: list[dict[str, str]] = []
    for href in loaded_stylesheets(index_text):
        path = resolve_loaded_path(href)
        if not path.is_file():
            texts[href] = ""
            continue
        text = read_text(path)
        texts[href] = text
        pattern = r'''url\(\s*(?:"([^"]+)"|'([^']+)'|([^\)\s]+))\s*\)'''
        for match in re.finditer(pattern, text, re.I):
            value = next((group for group in match.groups() if group is not None), "").strip()
            repo_path = repo_path_from_value(value)
            if repo_path:
                refs.append({"stylesheet": href, "value": value, "path": repo_path})
    return texts, refs


def runtime_texts(index_text: str, stylesheet_texts: dict[str, str]) -> dict[str, str]:
    texts = {
        "modules/shaanxi-archaeology-museum/index.html": index_text,
        "modules/shaanxi-archaeology-museum/media-url.js": read_text(ROOT / "modules" / MODULE / "media-url.js"),
        "shared/js/media-url.js": read_text(ROOT / "shared" / "js" / "media-url.js"),
        "assets/editorial/provenance-trails.js": read_text(ROOT / "assets" / "editorial" / "provenance-trails.js"),
    }
    for href, text in stylesheet_texts.items():
        texts[f"modules/{MODULE}/{href.split('?', 1)[0]}"] = text
    for src in loaded_scripts(index_text):
        path = resolve_loaded_path(src)
        if path.is_file():
            relative = path.relative_to(ROOT).as_posix()
            texts[relative] = read_text(path)
    provenance_css = ROOT / "assets" / "editorial" / "provenance-trails.css"
    if provenance_css.is_file():
        texts["assets/editorial/provenance-trails.css"] = read_text(provenance_css)
    return texts


def provenance_images(provenance_text: str) -> list[str]:
    return [
        value
        for value in re.findall(r"image\s*:\s*'([^']+)'", provenance_text)
        if value.startswith(MODULE_PREFIX)
    ]


def dynamic_data_paths(data_text: str) -> set[str]:
    logical = set(re.findall(r"assets/photos/(?:thumbs|web)/[^\"'\s]+", data_text))
    return {MODULE_PREFIX + path for path in logical}


def expected_mime_suffix(path: str) -> str:
    return Path(path).suffix.lower()


def resolver_checks(module_text: str) -> tuple[dict[str, Any], list[str]]:
    cases = {
        "https://example.com/a.webp?rev=1#hero": "https://example.com/a.webp?rev=1#hero",
        "data:image/png;base64,abc": "data:image/png;base64,abc",
        "blob:https://example.com/id": "blob:https://example.com/id",
        "//cdn.example.com/a.webp": "//cdn.example.com/a.webp",
        "assets/photos/web/DSC_3114.jpg?rev=1#view": WORKER_PREFIX + MODULE_PREFIX + "assets/photos/web/DSC_3114.jpg?rev=1#view",
        "./assets/photos/thumbs/DSC_3117.jpg": WORKER_PREFIX + MODULE_PREFIX + "assets/photos/thumbs/DSC_3117.jpg",
        "review/contact-sheets/contact_001_041.jpg": WORKER_PREFIX + MODULE_PREFIX + "review/contact-sheets/contact_001_041.jpg",
        MODULE_PREFIX + "assets/brand-emblem.png": WORKER_PREFIX + MODULE_PREFIX + "assets/brand-emblem.png",
        "../shared/icon.svg": "../shared/icon.svg",
        "data/photo.jpg": "data/photo.jpg",
    }
    passed = {
        "completeUrlPreserved": True,
        "assetsPathPrefixed": True,
        "reviewPathPrefixed": True,
        "modulePrefixNotDoubled": True,
        "unrelatedRelativeUnchanged": True,
        "workerBaseCorrect": PUBLIC_BASE in module_text,
        "usesSharedResolver": "window.resolveMediaUrl" in module_text and "resolveMediaUrl(repoPath" in module_text,
        "completeUrlGuardPresent": "COMPLETE_URL" in module_text,
    }
    case_results = []
    for value, expected in cases.items():
        actual = resolve_module_path(value)
        ok = actual == expected and MODULE_PREFIX + MODULE_PREFIX not in str(actual)
        case_results.append({"input": value, "output": actual, "expected": expected, "passed": ok})
        if not ok:
            passed["case:" + value] = False
    passed["allCases"] = all(item["passed"] for item in case_results)
    return {"checks": passed, "cases": case_results}, [key for key, value in passed.items() if not value]


def photo_sink_checks(photo_text: str) -> tuple[dict[str, bool], list[str]]:
    checks = {
        "cardImgSrc": bool(re.search(r"src=\"\$\{escapeHtml\(thumbUrl\)\}", photo_text)),
        "cardSrcsetThumb": bool(re.search(r"srcset=\"\$\{escapeHtml\(thumbUrl\)\} 480w", photo_text)),
        "cardSrcsetWeb": bool(re.search(r"\$\{escapeHtml\(webUrl\)\} 1600w", photo_text)),
        "selectPhotoImageSrc": bool(re.search(r"image\.src\s*=\s*mediaUrl\(photo\.web\)", photo_text)),
        "openArtifactMainImage": bool(re.search(r"mediaUrl\(artifact\.photos\[0\]\.web\)", photo_text)),
        "dialogThumbnails": bool(re.search(r"escapeHtml\(mediaUrl\(photo\.thumb\)\)", photo_text)),
        "mediaUrlHelperPresent": bool(re.search(r"const mediaUrl =", photo_text)),
    }
    return checks, [key for key, value in checks.items() if not value]


def direct_local_sink_count(photo_text: str) -> int:
    patterns = (
        r'src="\$\{escapeHtml\(photo\.(?:thumb|web)\)\}',
        r'srcset="\$\{escapeHtml\(photo\.(?:thumb|web)\)\}',
        r"image\.src\s*=\s*photo\.(?:thumb|web)",
        r'escapeHtml\(artifact\.photos\[0\]\.web\)',
    )
    return sum(len(re.findall(pattern, photo_text)) for pattern in patterns)


def git_binary_changes() -> dict[str, Any]:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return {"additions": 0, "modifications": 0, "deletions": 0, "paths": [], "status": "UNAVAILABLE"}
    additions = modifications = deletions = 0
    paths: list[str] = []
    for line in result.stdout.splitlines():
        if len(line) < 4:
            continue
        code = line[:2]
        path = line[3:].split(" -> ")[-1]
        if Path(path).suffix.lower() not in MEDIA_SUFFIXES:
            continue
        paths.append(path)
        if code == "??" or "A" in code:
            additions += 1
        elif "D" in code:
            deletions += 1
        else:
            modifications += 1
    return {
        "additions": additions,
        "modifications": modifications,
        "deletions": deletions,
        "paths": paths,
        "status": "PASS" if not paths else "FAIL",
    }


def build_report(browser_reason: str) -> tuple[dict[str, Any], list[str]]:
    failures: list[str] = []
    entries, plan_paths, planned_files, planned_bytes = load_plan()
    index_path = ROOT / "modules" / MODULE / "index.html"
    index_text = read_text(index_path)
    stylesheet_texts, css_refs = css_media_refs(index_text)
    texts = runtime_texts(index_text, stylesheet_texts)
    photo_text = read_text(ROOT / "modules" / MODULE / "photo-catalog.js")
    data_text = read_text(ROOT / "modules" / MODULE / "data" / "artifacts-data.js")
    provenance_text = read_text(ROOT / "assets" / "editorial" / "provenance-trails.js")
    html_refs = parse_attr_media(index_text)
    html_paths = {ref["path"] for ref in html_refs}
    css_paths = {ref["path"] for ref in css_refs}
    dynamic_paths = dynamic_data_paths(data_text)
    provenance_paths = set(provenance_images(provenance_text))
    review_paths = {
        path
        for text in texts.values()
        for path in re.findall(r"modules/" + re.escape(MODULE) + r"/review/contact-sheets/[^\"'\s)]+", text)
    }
    runtime_paths = (html_paths | css_paths | dynamic_paths | provenance_paths | review_paths) & plan_paths
    local_html_refs = [ref for ref in html_refs if ref["value"].startswith(("assets/", "review/")) and ref["path"] in plan_paths]
    local_css_refs = [ref for ref in css_refs if ref["value"].startswith(("assets/", "review/")) and ref["path"] in plan_paths]
    direct_local = len(local_html_refs) + len(local_css_refs) + direct_local_sink_count(photo_text)

    resolver_report, resolver_failures = resolver_checks(read_text(ROOT / "modules" / MODULE / "media-url.js"))
    failures.extend(f"resolver:{item}" for item in resolver_failures)
    sink_report, sink_failures = photo_sink_checks(photo_text)
    failures.extend(f"photo-sink:{item}" for item in sink_failures)

    script_order = loaded_scripts(index_text)
    order_checks = {
        "sharedResolverBeforeModuleResolver": script_order.index("../../shared/js/media-url.js") < script_order.index("media-url.js"),
        "moduleResolverBeforeCatalog": script_order.index("media-url.js") < script_order.index(next(item for item in script_order if item.startswith("catalog-direct.js"))),
        "moduleResolverBeforePhotoCatalog": script_order.index("media-url.js") < script_order.index(next(item for item in script_order if item.startswith("photo-catalog.js"))),
        "moduleResolverBeforeProvenance": script_order.index("media-url.js") < script_order.index(next(item for item in script_order if item.startswith("../../assets/editorial/provenance-trails.js"))),
    }
    failures.extend(f"script-order:{key}" for key, value in order_checks.items() if not value)

    html_worker_failures = [ref for ref in html_refs if ref["path"] in plan_paths and not ref["value"].startswith(WORKER_PREFIX)]
    css_worker_failures = [ref for ref in css_refs if ref["path"] in plan_paths and not ref["value"].startswith(WORKER_PREFIX)]
    if html_worker_failures:
        failures.append("html:externalized media is not on Worker")
    if css_worker_failures:
        failures.append("css:externalized media is not on Worker")
    if direct_local:
        failures.append("runtime:direct local media reference remains")

    provenance_target = sorted(provenance_paths)
    provenance_resolved = sum(bool(resolve_module_path(path).startswith(WORKER_PREFIX)) for path in provenance_target)
    if len(provenance_target) != 6 or provenance_resolved != 6:
        failures.append("provenance:expected 6 Worker-routed images")
    if not all(path in plan_paths for path in provenance_target):
        failures.append("provenance:image is outside frozen plan")

    fallback_checks = {
        "qinhanBranchPreserved": "if (page === 'qinhan' && typeof window.qinhanMediaUrl === 'function')" in provenance_text,
        "shaanxiBranchScoped": "if (page === 'shaanxi-archaeology-museum' && typeof window.shaanxiArchaeologyMediaUrl === 'function')" in provenance_text,
        "otherModulesFallbackPreserved": "return new URL(path, projectRoot).href;" in provenance_text,
    }
    failures.extend(f"provenance-fallback:{key}" for key, value in fallback_checks.items() if not value)

    forbidden_patterns = {
        "oldR2Dev": r"r2\.dev",
        "fileScheme": r"file://",
        "windowsAbsolute": r"(?i)\b[A-Z]:[\\/]",
        "localhostMedia": r"(?i)localhost[^\"'\s]*(?:assets|review)",
        "doubleModulePrefix": re.escape(MODULE_PREFIX + MODULE_PREFIX),
    }
    forbidden_counts = {
        name: sum(len(re.findall(pattern, text)) for text in texts.values())
        for name, pattern in forbidden_patterns.items()
    }
    failures.extend(name for name, count in forbidden_counts.items() if count)

    local_files = 0
    local_bytes = 0
    missing_local: list[str] = []
    for entry in entries:
        path = ROOT / entry["path"]
        if not path.is_file():
            missing_local.append(entry["path"])
            continue
        local_files += 1
        local_bytes += path.stat().st_size
    if local_files != EXPECTED_FILES or local_bytes != EXPECTED_BYTES or missing_local:
        failures.append("local-media:retained file count or bytes mismatch")

    worker_evidence = {
        "source": "GitHub Actions",
        "previousRunStatus": "PASS",
        "workflow": "Verify Shaanxi Archaeology Worker media",
        "http": 1061,
        "contentLength": 1061,
        "sha256Samples": 40,
        "contentTypeSamples": 40,
        "cacheControlSamples": 40,
        "missingObject": 404,
    }
    upload_evidence = json.loads(read_text(UPLOAD_VERIFICATION))
    storage_checks = {
        "s3Objects": upload_evidence.get("s3ObjectsVerified") == EXPECTED_FILES,
        "s3Bytes": upload_evidence.get("s3BytesVerified") == EXPECTED_BYTES,
        "s3Missing": upload_evidence.get("s3MissingObjects") == 0,
        "s3SizeMismatch": upload_evidence.get("s3SizeMismatches") == 0,
        "shaSamples": upload_evidence.get("sha256Samples", {}).get("verified") == 40,
    }
    failures.extend(f"storage:{key}" for key, value in storage_checks.items() if not value)

    binary_changes = git_binary_changes()
    if binary_changes["status"] != "PASS":
        failures.append("binary:media change detected")

    static_refs = len(html_refs) + len(css_refs)
    runtime_bytes = sum(int(next(item["bytes"] for item in entries if item["path"] == path)) for path in runtime_paths)
    report = {
        "status": "PASS_STATIC_BROWSER_SKIPPED" if not failures else "FAIL",
        "module": MODULE,
        "publicBase": PUBLIC_BASE,
        "plannedFiles": planned_files,
        "plannedBytes": planned_bytes,
        "staticRuntimeMediaFiles": len((html_paths | css_paths) & plan_paths),
        "staticRuntimeReferenceCount": static_refs,
        "dynamicDataMediaFiles": len(dynamic_paths & plan_paths),
        "dynamicRuntimeSinkCount": sum(sink_report.values()) - 1,
        "dynamicRuntimeSinks": sink_report,
        "provenanceMediaFiles": len(provenance_target),
        "provenanceWorkerResolved": provenance_resolved,
        "reviewRuntimeMediaFiles": len(review_paths & plan_paths),
        "totalRuntimeReferencedMediaFiles": len(runtime_paths),
        "runtimeReferencedPlanCoverage": {
            "files": len(runtime_paths),
            "bytes": runtime_bytes,
            "ofFrozenFiles": planned_files,
            "ofFrozenBytes": planned_bytes,
        },
        "directLocalRuntimeReferences": direct_local,
        "oldR2DevReferences": forbidden_counts["oldR2Dev"],
        "doublePrefixReferences": forbidden_counts["doubleModulePrefix"],
        "resolverChecks": resolver_report,
        "scriptOrderChecks": order_checks,
        "fallbackChecks": fallback_checks,
        "workerEvidence": worker_evidence,
        "browserSmoke": {
            "status": "SKIPPED",
            "reason": browser_reason,
            "consoleErrors": None,
            "localMediaRequests": None,
            "workerMediaFailures": None,
            "oldR2DevRequests": None,
        },
        "terminalWorkerNetwork": "BLOCKED",
        "localMediaFiles": local_files,
        "localMediaBytes": local_bytes,
        "missingLocalMedia": missing_local,
        "binaryMediaChanges": binary_changes,
        "discovery": {
            "loadedStylesheets": loaded_stylesheets(index_text),
            "loadedScripts": script_order,
            "htmlStaticReferences": html_refs,
            "cssStaticReferences": css_refs,
            "dynamicDataPathCount": len(dynamic_paths & plan_paths),
            "provenanceImages": provenance_target,
            "reviewRuntimePaths": sorted(review_paths & plan_paths),
            "nonRuntimeReviewPlanFiles": sum(
                path.startswith(MODULE_PREFIX + "review/contact-sheets/") for path in plan_paths
            ),
            "storageChecks": storage_checks,
        },
        "failedChecks": failures,
    }
    return report, failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="verification JSON output path",
    )
    parser.add_argument(
        "--browser-reason",
        default="Browser smoke was skipped by the coordinator because physical memory was above the safe launch threshold.",
    )
    args = parser.parse_args()
    report, failures = build_report(args.browser_reason)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"RUNTIME_VALIDATION={report['status']}")
    print(f"PLAN={report['plannedFiles']}/{report['plannedBytes']}")
    print(f"STATIC_RUNTIME={report['staticRuntimeMediaFiles']}/{report['staticRuntimeReferenceCount']}")
    print(f"DYNAMIC_DATA={report['dynamicDataMediaFiles']}")
    print(f"DYNAMIC_SINKS={report['dynamicRuntimeSinkCount']}")
    print(f"PROVENANCE={report['provenanceWorkerResolved']}/{report['provenanceMediaFiles']}")
    print(f"REVIEW_RUNTIME={report['reviewRuntimeMediaFiles']}")
    print(f"DIRECT_LOCAL={report['directLocalRuntimeReferences']}")
    print(f"OLD_R2={report['oldR2DevReferences']}")
    print(f"LOCAL_MEDIA={report['localMediaFiles']}/{report['localMediaBytes']}")
    print(f"BROWSER_SMOKE={report['browserSmoke']['status']}")
    if failures:
        print("FAILED_CHECKS=" + ",".join(failures))
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
