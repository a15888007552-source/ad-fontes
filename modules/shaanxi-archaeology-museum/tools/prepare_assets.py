from __future__ import annotations

import hashlib
import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\西安博物馆图片")
REVIEW = PROJECT / "review" / "contact-sheets"
DATA = PROJECT / "data"


def numeric_key(path: Path) -> tuple[int, str]:
    match = re.search(r"(\d+)", path.stem)
    return (int(match.group(1)) if match else 10**9, path.name.lower())


def sha256(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def load_font(size: int, bold: bool = False):
    candidates = [
        Path(r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size)
            except OSError:
                pass
    return ImageFont.load_default()


def make_contact_sheet(rows: list[dict], sheet_number: int) -> Path:
    cols = 6
    cell_w, cell_h = 300, 235
    margin = 24
    header_h = 70
    rows_count = math.ceil(len(rows) / cols)
    canvas = Image.new("RGB", (margin * 2 + cols * cell_w, header_h + margin + rows_count * cell_h), "#f1eee7")
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(28, True)
    label_font = load_font(17, True)
    meta_font = load_font(13)
    draw.text((margin, 18), f"陕西考古博物馆 · 现场照片接触表 {sheet_number:02d}", fill="#28231e", font=title_font)

    for index, row in enumerate(rows):
        col = index % cols
        row_index = index // cols
        x = margin + col * cell_w
        y = header_h + row_index * cell_h
        tile = Image.new("RGB", (cell_w - 10, cell_h - 10), "#ded9d0")
        try:
            with Image.open(row["source_path"]) as raw:
                raw.draft("RGB", (cell_w - 22, cell_h - 62))
                image = ImageOps.exif_transpose(raw).convert("RGB")
                image.thumbnail((cell_w - 22, cell_h - 62), Image.Resampling.BILINEAR)
                tile.paste(image, ((cell_w - 10 - image.width) // 2, 10))
        except (OSError, ValueError):
            draw.text((x + 14, y + 28), "读取失败", fill="#a43d31", font=label_font)
        canvas.paste(tile, (x, y))
        draw.rectangle((x, y, x + cell_w - 10, y + cell_h - 10), outline="#bdb6aa", width=1)
        draw.text((x + 10, y + cell_h - 45), row["filename"], fill="#28231e", font=label_font)
        draw.text((x + 10, y + cell_h - 24), f"{row['sequence']:03d} · {row['captured_at'] or '时间未知'}", fill="#685f55", font=meta_font)

    output = REVIEW / f"contact_{rows[0]['sequence']:03d}_{rows[-1]['sequence']:03d}.jpg"
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, quality=88, optimize=True)
    return output


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"source directory not found: {SOURCE}")
    files = sorted(SOURCE.glob("*.JPG"), key=numeric_key)
    if "--start" in sys.argv:
        start_index = int(sys.argv[sys.argv.index("--start") + 1])
        files = files[start_index:]
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
        files = files[:limit]
    if not files:
        raise SystemExit("no JPG files found")

    photos: list[dict] = []
    start_index = int(sys.argv[sys.argv.index("--start") + 1]) if "--start" in sys.argv else 0
    for sequence, path in enumerate(files, start_index + 1):
        captured_at = None
        width = height = None
        try:
            with Image.open(path) as image:
                oriented = ImageOps.exif_transpose(image)
                width, height = oriented.size
                exif = image.getexif()
                raw_date = exif.get(36867) or exif.get(306)
                if raw_date:
                    captured_at = str(raw_date).replace(":", "-", 2)
        except (OSError, ValueError):
            pass
        photos.append(
            {
                "sequence": sequence,
                "filename": path.name,
                "source_path": str(path),
                "bytes": path.stat().st_size,
                "sha256": sha256(path) if "--hash" in sys.argv else None,
                "captured_at": captured_at,
                "source_width": width,
                "source_height": height,
            }
        )

    REVIEW.mkdir(parents=True, exist_ok=True)
    for start in range(0, len(photos), 48):
        make_contact_sheet(photos[start : start + 48], (photos[start]["sequence"] - 1) // 48 + 1)

    payload = {
        "schema_version": 1,
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source_directory": str(SOURCE),
        "originals_are_read_only": True,
        "photo_count": len(photos),
        "total_bytes": sum(row["bytes"] for row in photos),
        "contact_sheets": [str(path.relative_to(PROJECT)).replace("\\", "/") for path in sorted(REVIEW.glob("*.jpg"))],
        "photos": [{key: value for key, value in row.items() if key != "source_path"} for row in photos],
    }
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "photo-manifest.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"photo_count": len(photos), "total_bytes": payload["total_bytes"], "contact_sheets": len(payload["contact_sheets"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
