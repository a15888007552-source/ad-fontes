from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT = Path(__file__).resolve().parents[1]
DATA = PROJECT / "data"


def jsonl_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return rows


def ocr_map() -> dict[int, str]:
    values: dict[int, list[str]] = {}
    for path in sorted(DATA.glob("ocr-*.jsonl")):
        for row in jsonl_rows(path):
            sequence = row.get("sequence")
            if not isinstance(sequence, int):
                continue
            values.setdefault(sequence, []).extend(
                str(item.get("text", "")).strip()
                for item in row.get("lines", [])
                if str(item.get("text", "")).strip()
            )
    return {
        sequence: " | ".join(dict.fromkeys(texts))[:1600]
        for sequence, texts in values.items()
    }


def role_for(index: int, total: int) -> tuple[str, bool]:
    if total == 1 or index == 0:
        return "正面/主视", True
    if index == total - 1:
        return "名称/介绍", False
    if index == 1:
        return "侧面", True
    return "局部/细节", True


def main() -> None:
    manifest = json.loads((DATA / "photo-manifest.json").read_text(encoding="utf-8"))
    ranges = json.loads((DATA / "photo-group-ranges.json").read_text(encoding="utf-8"))
    photos = {int(row["sequence"]): row for row in manifest["photos"]}
    labels = ocr_map()
    groups: list[dict[str, Any]] = []
    expected = 1

    for number, spec in enumerate(ranges["groups"], 1):
        start, end = int(spec["start"]), int(spec["end"])
        if start != expected:
            raise SystemExit(f"分组范围不连续：{start}，预期 {expected}")
        total = end - start + 1
        grouped_photos = []
        for index, sequence in enumerate(range(start, end + 1)):
            row = photos[sequence]
            role, display = role_for(index, total)
            grouped_photos.append(
                {
                    "sequence": sequence,
                    "filename": row["filename"],
                    "role": role,
                    "display": display,
                    "source_width": row.get("source_width"),
                    "source_height": row.get("source_height"),
                }
            )
        label_text = ""
        for sequence in range(end, start - 1, -1):
            if labels.get(sequence):
                label_text = labels[sequence]
                break
        title = str(spec["title"])
        status = "展签/现场已留线索" if label_text else "现场照片组"
        groups.append(
            {
                "id": f"photo-group-{number:03d}",
                "number": number,
                "sequence_start": start,
                "sequence_end": end,
                "category": spec["category"],
                "title": title,
                "status": status,
                "tags": spec.get("tags", []),
                "photos": grouped_photos,
                "display_photo_count": sum(photo["display"] for photo in grouped_photos),
                "label_photo_sequence": end,
                "label_text": label_text,
                "evidence_boundary": "照片按相机顺序与现场展签归组；展签明确的名称进入对象目录，未拍到名称的照片保留为现场照片组。",
            }
        )
        expected = end + 1

    if expected != len(photos) + 1:
        raise SystemExit("分组没有覆盖完整照片序列")

    payload = {
        "schema_version": 2,
        "generated_at": manifest.get("generated_at"),
        "source_directory": manifest.get("source_directory"),
        "photo_count": len(photos),
        "group_count": len(groups),
        "classification_rule": ranges["rule"],
        "categories": list(dict.fromkeys(group["category"] for group in groups)),
        "groups": groups,
        "review": {
            "uncertain_group_count": sum(group["status"] == "待核" for group in groups),
            "label_text_group_count": sum(bool(group["label_text"]) for group in groups),
            "note": "第一版分组索引；后续可按展签核对逐组修订，不需要重新处理原图。",
        },
    }
    (DATA / "photo-groups.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({"photo_count": len(photos), "group_count": len(groups)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
