from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageOps, ImageFilter


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\西安博物馆图片")
WEB = PROJECT / "assets" / "photos" / "web"
THUMBS = PROJECT / "assets" / "photos" / "thumbs"


def numeric_key(path: Path) -> tuple[int, str]:
    match = re.search(r"(\d+)", path.stem)
    return (int(match.group(1)) if match else 10**9, path.name.lower())


def resize_image(source: Path, target: Path, max_edge: int, quality: int) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as raw:
        raw.draft("RGB", (max_edge * 2, max_edge * 2))
        image = ImageOps.exif_transpose(raw).convert("RGB")
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        # Conservative, non-generative treatment: no invented pixels or content.
        image = image.filter(ImageFilter.UnsharpMask(radius=0.45, percent=65, threshold=3))
        image.save(target, format="JPEG", quality=quality, optimize=True, progressive=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create local web derivatives from F: originals.")
    parser.add_argument("--start", type=int, default=0, help="zero-based source offset")
    parser.add_argument("--limit", type=int, default=48, help="number of source photos to process")
    parser.add_argument("--files", nargs="*", help="explicit JPG filenames; overrides --start/--limit")
    parser.add_argument("--thumb-only", action="store_true", help="create thumbnails without large derivatives")
    parser.add_argument("--web-only", action="store_true", help="create large derivatives without thumbnails")
    args = parser.parse_args()

    files = sorted(SOURCE.glob("*.JPG"), key=numeric_key)
    if args.files:
        lookup = {path.name: path for path in files}
        missing = [name for name in args.files if name not in lookup]
        if missing:
            raise SystemExit(f"source files not found: {', '.join(missing)}")
        selected = [lookup[name] for name in args.files]
    else:
        selected = files[args.start : args.start + args.limit]
    if not selected:
        raise SystemExit("no source photos selected")

    done = []
    for source in selected:
        web_target = WEB / f"{source.stem}.jpg"
        thumb_target = THUMBS / f"{source.stem}.jpg"
        if not args.thumb_only:
            resize_image(source, web_target, 1800, 82)
        if not args.web_only:
            resize_image(source, thumb_target, 520, 74)
        done.append(source.name)
    print(json.dumps({"start": args.start + 1, "count": len(done), "last": done[-1]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
