from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageOps
from rapidocr_onnxruntime import RapidOCR


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\西安博物馆图片")
DEFAULT_OUT = ROOT / "data" / "ocr-candidates.jsonl"


def main() -> None:
    start = int(sys.argv[sys.argv.index("--start") + 1]) if "--start" in sys.argv else 0
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 48
    files = sorted(SOURCE.glob("*.JPG"), key=lambda p: int(p.stem.split("_")[-1]))[start : start + limit]
    out = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else DEFAULT_OUT
    if not out.is_absolute():
        out = ROOT / out
    engine = RapidOCR()
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as handle:
        for sequence, path in enumerate(files, start + 1):
            try:
                with Image.open(path) as raw:
                    image = ImageOps.exif_transpose(raw).convert("RGB")
                    image.thumbnail((1800, 1200), Image.Resampling.BILINEAR)
                    result, _ = engine(image)
                lines = []
                if result:
                    lines = [{"text": item[1], "score": round(float(item[2]), 4)} for item in result]
                handle.write(json.dumps({"sequence": sequence, "filename": path.name, "lines": lines}, ensure_ascii=False) + "\n")
            except Exception as exc:  # keep the batch moving; failures remain visible
                handle.write(json.dumps({"sequence": sequence, "filename": path.name, "error": str(exc)}, ensure_ascii=False) + "\n")
            handle.flush()
            print(sequence, file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
