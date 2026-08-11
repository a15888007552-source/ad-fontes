#!/usr/bin/env python3
"""Build responsive web images for the Beilin archive.

Only object photographs shown by the site are processed. Label and title-card
evidence photographs remain available as originals but are intentionally not
duplicated into web-delivery folders.
"""

from __future__ import annotations

import argparse
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "artifact-groups.json"
HIDDEN_ROLES = {"label", "title"}
PHOTO_VARIANTS = (
    ("thumb", 320, "JPEG", 78),
    ("thumb", 320, "WEBP", 72),
    ("web", 1280, "JPEG", 82),
    ("web", 1280, "WEBP", 78),
    ("large", 2200, "WEBP", 82),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=ROOT / "assets" / "photos" / "original",
        help="Directory containing the original camera files.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=min(3, max(1, os.cpu_count() or 1)),
        help="Parallel image workers. Three is conservative for 24 MP originals.",
    )
    parser.add_argument("--force", action="store_true", help="Rebuild existing variants.")
    return parser.parse_args()


def visible_filenames() -> list[str]:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8-sig"))
    filenames: list[str] = []
    seen: set[str] = set()
    for group in catalog.get("groups", []):
        for photo in group.get("photos", []):
            filename = str(photo.get("filename") or "")
            if not filename or photo.get("role") in HIDDEN_ROLES or filename in seen:
                continue
            seen.add(filename)
            filenames.append(filename)
    return filenames


def resized(image: Image.Image, max_edge: int) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS, reducing_gap=3.0)
    return copy


def save_variant(image: Image.Image, destination: Path, image_format: str, quality: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    options = {"quality": quality}
    if image_format == "JPEG":
        options.update({"optimize": True, "progressive": True, "subsampling": 2})
    else:
        options.update({"method": 4})
    image.save(destination, image_format, **options)


def build_photo(filename: str, source_dir: Path, force: bool) -> tuple[str, int, int]:
    source = source_dir / filename
    if not source.exists():
        fallback = ROOT / "assets" / "photos" / "original" / filename
        source = fallback if fallback.exists() else source
    if not source.exists():
        raise FileNotFoundError(source)

    stem = Path(filename).stem
    destinations: list[tuple[Path, str, int, int]] = []
    for directory, max_edge, image_format, quality in PHOTO_VARIANTS:
        suffix = ".jpg" if image_format == "JPEG" else ".webp"
        destination = ROOT / "assets" / "photos" / directory / f"{stem}{suffix}"
        destinations.append((destination, image_format, max_edge, quality))

    if not force and all(path.exists() and path.stat().st_size > 0 for path, *_ in destinations):
        return filename, source.stat().st_size, sum(path.stat().st_size for path, *_ in destinations)

    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        cache: dict[int, Image.Image] = {}
        for destination, image_format, max_edge, quality in sorted(
            destinations, key=lambda item: item[2], reverse=True
        ):
            if force or not destination.exists() or destination.stat().st_size == 0:
                variant = cache.setdefault(max_edge, resized(image, max_edge))
                save_variant(variant, destination, image_format, quality)
        for variant in cache.values():
            variant.close()

    return filename, source.stat().st_size, sum(path.stat().st_size for path, *_ in destinations)


def build_supporting_images(force: bool) -> None:
    hero_source = ROOT / "assets" / "hero" / "beilin-gate.jpg"
    with Image.open(hero_source) as opened:
        hero = ImageOps.exif_transpose(opened).convert("RGB")
        for width in (960, 1600):
            destination = hero_source.with_name(f"beilin-gate-{width}.webp")
            if force or not destination.exists():
                save_variant(resized(hero, width), destination, "WEBP", 80)

    editorial_dir = ROOT / "assets" / "editorial"
    for source in sorted(editorial_dir.glob("theme-*.webp")):
        if source.stem.endswith(("-640", "-960")):
            continue
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            for width in (640, 960):
                destination = source.with_name(f"{source.stem}-{width}.webp")
                if force or not destination.exists():
                    save_variant(resized(image, width), destination, "WEBP", 78)


def main() -> int:
    args = parse_args()
    source_dir = args.source.expanduser().resolve()
    filenames = visible_filenames()
    before_bytes = 0
    after_bytes = 0
    failures: list[str] = []

    build_supporting_images(args.force)
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {
            executor.submit(build_photo, filename, source_dir, args.force): filename
            for filename in filenames
        }
        for index, future in enumerate(as_completed(futures), 1):
            filename = futures[future]
            try:
                _, source_size, variant_size = future.result()
                before_bytes += source_size
                after_bytes += variant_size
            except Exception as exc:  # noqa: BLE001 - report every failed source together
                failures.append(f"{filename}: {exc}")
            if index % 25 == 0 or index == len(futures):
                print(f"processed={index}/{len(futures)} failures={len(failures)}", flush=True)

    manifest = {
        "visible_photo_count": len(filenames),
        "hidden_roles": sorted(HIDDEN_ROLES),
        "source_bytes": before_bytes,
        "variant_bytes": after_bytes,
        "reduction_percent_vs_original_per_initial_request": round(
            (1 - after_bytes / before_bytes) * 100, 2
        ) if before_bytes else 0,
        "variants": [
            {"directory": directory, "max_edge": max_edge, "format": image_format, "quality": quality}
            for directory, max_edge, image_format, quality in PHOTO_VARIANTS
        ],
        "failures": failures,
    }
    manifest_path = ROOT / "assets" / "photos" / "image-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
