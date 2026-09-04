"""Export the JSON field catalogues as readable research notes."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "modules" / "henan-museum" / "research"


def text(value):
    if isinstance(value, str):
        return " ".join(value.split())
    if isinstance(value, dict):
        return " ".join(str(value.get("text", "")).split())
    return ""


def export(source: str, target: str, heading: str) -> None:
    payload = json.loads((RESEARCH / source).read_text(encoding="utf-8"))
    records = payload.get("records", [])
    lines = [f"# {heading}", "", f"记录数：{len(records)} 组。", "", "> 正文按来处、器形与工艺、历史现场三段整理；照片顺序保留正面、侧面、局部/铭文、展签。", ""]
    for record in records:
        title = record.get("name_zh") or record.get("title") or record.get("name") or "待核器物"
        lines += [f"## {record.get('id', '')}　{title}", "", f"- 年代：{record.get('period') or record.get('era') or '待核'}", f"- 材质／器类：{record.get('material_or_type') or record.get('material') or '待核'}", f"- 出土／来源：{record.get('provenance') or record.get('findspot') or '待核'}"]
        photos = ", ".join(record.get("photos") or [])
        labels = ", ".join(record.get("label_photos") or ([record.get("label_photo")] if record.get("label_photo") else []))
        if photos:
            lines.append(f"- 器物／细节照片：{photos}")
        if labels:
            lines.append(f"- 展签照片：{labels}")
        lines.append("")
        copy = record.get("copy") or record.get("draft") or record.get("paragraphs") or record.get("threeParagraphs") or []
        for item in copy[:3]:
            if text(item):
                lines += [text(item), ""]
        inscription = record.get("inscription")
        if isinstance(inscription, dict) and inscription.get("original"):
            lines += ["**铭文／题记**", "", f"原文：{text(inscription.get('original'))}", "", f"释意：{text(inscription.get('translation') or inscription.get('paraphrase'))}", "", f"说明：{text(inscription.get('note') or inscription.get('missing_or_disputed') or inscription.get('uncertainty'))}", ""]
        sources = []
        for source_item in record.get("sources") or []:
            if isinstance(source_item, str):
                sources.append(source_item)
            elif source_item.get("url"):
                sources.append(source_item["url"])
        if sources:
            lines += ["**来源**", ""] + [f"- {url}" for url in dict.fromkeys(sources)] + [""]
    (RESEARCH / target).write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main() -> None:
    export("catalog-part-a.json", "catalog-part-a.md", "河南博物院田野照片器物档案 A 段")
    export("catalog-part-b.json", "catalog-part-b.md", "河南博物院田野照片器物档案 B 段")


if __name__ == "__main__":
    main()
