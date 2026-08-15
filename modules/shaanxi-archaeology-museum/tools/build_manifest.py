from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\西安博物馆图片")
DATA = PROJECT / "data"


def numeric_key(path: Path) -> tuple[int, str]:
    match = re.search(r"(\d+)", path.stem)
    return (int(match.group(1)) if match else 10**9, path.name.lower())


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"source directory not found: {SOURCE}")
    files = sorted(SOURCE.glob("*.JPG"), key=numeric_key)
    if not files:
        raise SystemExit("no JPG files found")

    rows: list[dict] = []
    for sequence, path in enumerate(files, 1):
        rows.append(
            {
                "sequence": sequence,
                "filename": path.name,
                "bytes": path.stat().st_size,
                "sha256": None,
                "captured_at": None,
                "source_width": None,
                "source_height": None,
            }
        )

    DATA.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source_directory": str(SOURCE),
        "originals_are_read_only": True,
        "photo_count": len(rows),
        "total_bytes": sum(row["bytes"] for row in rows),
        "contact_sheets": [
            str(path.relative_to(PROJECT)).replace("\\", "/")
            for path in sorted((PROJECT / "review" / "contact-sheets").glob("contact_*.jpg"))
            if path.name != "contact_001_041.jpg"
        ],
        "photos": rows,
    }
    (DATA / "photo-manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "photo_count": len(rows),
                "total_bytes": payload["total_bytes"],
                "contact_sheets": len(payload["contact_sheets"]),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
