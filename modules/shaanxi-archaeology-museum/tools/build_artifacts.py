from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
REVIEW = ROOT / "review"

# Pure name/description cards. They remain attached to a record as evidence,
# but are never exposed as gallery images.
HIDDEN_LABELS = {
    3, 6, 8, 11, 13, 17, 20, 23, 26, 29, 32,
    45, 48, 51, 53, 55, 57, 59, 61, 63, 65, 67, 69, 72, 75, 78, 81, 83, 85, 88, 91, 94, 98, 99, 102, 106, 108, 110, 112, 114,
    127, 129, 131, 135, 138, 145, 160, 162, 165, 167, 169, 173, 175, 177, 182,
    195, 200, 204, 208, 211, 214, 218, 221, 225, 230, 233, 236, 239, 243, 246, 249, 255, 257, 263, 265, 267, 271, 274, 276,
    294, 302, 305, 308, 317, 320, 325, 327, 333, 336, 341, 344, 346, 349, 351, 354, 356, 361, 363, 364, 366, 368, 371, 376, 378, 379, 385, 388, 390, 392,
    397, 399, 403, 408, 411, 414, 416, 423, 425, 428, 430, 433, 436, 438, 441, 443, 445, 448, 450, 455, 460, 461, 462, 465, 466, 470, 472, 475, 478, 480,
    485, 487, 492, 494, 497, 500, 503, 504, 507, 509, 511, 514, 516, 519, 521,
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_ocr() -> dict[int, str]:
    result: dict[int, str] = {}
    with (DATA / "ocr-d-full.jsonl").open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            values = []
            for item in row.get("lines", []):
                if isinstance(item, str):
                    values.append(item)
                elif isinstance(item, dict):
                    values.append(str(item.get("text") or item.get("value") or ""))
            result[int(row["sequence"])] = " | ".join(value.strip() for value in values if value.strip())
    return result


def normalize(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "", value or "").lower()


def clean_text(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    text = re.sub(r"PHOTO\s*\d+", "", text, flags=re.I)
    text = text.replace("OCR", "展签文字")
    text = text.replace("无展签文字信息", "未见可辨展签文字")
    text = text.replace("无展签文字", "未见可辨展签文字")
    text = text.replace("待补充", "未见明确记录")
    text = text.replace("让我们", "").replace("带你走进", "")
    text = re.sub(r"不只是.{0,18}更是", "同时也是", text)
    text = text.strip(" ，；。")
    return text + ("。" if text and text[-1] not in "。！？" else "")


def supported_fact(value: str, evidence: str, title: str) -> str:
    value = clean_text(value).rstrip("。")
    if not value:
        return ""
    haystack = normalize(evidence + " " + title)
    numbers = re.findall(r"\d{3,4}", value)
    if numbers and any(number not in haystack for number in numbers):
        return ""
    chunks = [
        chunk for chunk in re.findall(r"[\u4e00-\u9fff]{2,}", value)
        if chunk not in {"公元前", "公元", "时期", "时代", "出土", "发现"}
    ]
    if chunks and len(value) <= 48 and not any(normalize(chunk) in haystack for chunk in chunks):
        return ""
    return value


def infer_category(title: str, supplied: str) -> str:
    if supplied:
        return supplied
    rules = [
        ("壁画|图（数字复原）|马球图", "壁画与图像"),
        ("墓志|诏版|铭文|刻文|卜骨|甲骨|石磬", "文字与铭刻"),
        ("遗址|报告集|考古图|土$|土样", "考古资料"),
        ("玉|琉璃", "玉石与玻璃器"),
        ("铜|金|银|簋|鼎|钟|镜|带饰|马络", "金属器"),
        ("陶|釉|瓷|瓦|砖|俑|罐|壶|炉", "陶瓷与建筑构件"),
        ("骨|牙|角|化石", "骨角与动物遗存"),
        ("罗|绣|绢|长裤|巾|袱", "纺织品"),
    ]
    for pattern, label in rules:
        if re.search(pattern, title):
            return label
    return "考古文物"


def overlap(a: dict, b: dict) -> int:
    return max(0, min(int(a["end"]), int(b["end"])) - max(int(a["start"]), int(b["start"])) + 1)


def main() -> None:
    curation = read_json(DATA / "artifact-curation.json")["groups"]
    draft_rows = read_json(REVIEW / "deepseek-final-drafts.json")["drafts"]
    manifest_rows = read_json(DATA / "photo-manifest.json")["photos"]
    manifest = {int(row["sequence"]): row for row in manifest_rows}
    ocr = read_ocr()

    expected = 1
    for group in curation:
        if int(group["start"]) != expected:
            raise ValueError(f"Non-contiguous curation at {expected}: {group}")
        expected = int(group["end"]) + 1
    if expected != 522:
        raise ValueError(f"Curation ends at {expected - 1}, expected 521")

    artifacts = []
    for index, group in enumerate(curation, start=1):
        start, end = int(group["start"]), int(group["end"])
        exact = next(
            (row for row in draft_rows if int(row.get("start", -1)) == start and int(row.get("end", -1)) == end),
            None,
        )
        draft = exact or max(draft_rows, key=lambda row: overlap(group, row))
        sequences = list(range(start, end + 1))
        label_sequences = [sequence for sequence in sequences if sequence in HIDDEN_LABELS]
        display_sequences = [sequence for sequence in sequences if sequence not in HIDDEN_LABELS]
        if not display_sequences:
            raise ValueError(f"No display photograph remains for {start}-{end} {group['title']}")

        evidence = " ".join(ocr.get(sequence, "") for sequence in sequences)
        title = clean_text(group["title"]).rstrip("。")
        category = infer_category(title, clean_text(draft.get("category", "")).rstrip("。"))
        period = supported_fact(draft.get("period", ""), evidence, title)
        dimensions = supported_fact(draft.get("dimensions", ""), evidence, title)
        findspot = supported_fact(draft.get("findspot", ""), evidence, title)
        material = supported_fact(draft.get("material", ""), evidence, title)
        theme = clean_text(draft.get("theme", "")).rstrip("。") or title
        summary = clean_text(draft.get("summary", "")) or f"这组现场照片记录了{title}的整体形态与展陈关系。"
        description = clean_text(draft.get("description", "")) or f"照片按现场拍摄顺序保留{title}的整体与局部。可结合器形、纹饰、铭文、材质和保存状态逐项观察；未在展签中明确出现的信息不作推定。"
        significance = clean_text(draft.get("significance", "")) or "这组材料适合用于器类、工艺、图像与出土组合的比较。具体年代、用途和历史解释以展签及公开考古资料能够支持的范围为限。"
        viewing_notes = clean_text(draft.get("viewing_notes", "")) or "先看整体比例，再切换同组角度与局部照片，比较口沿、腹部、底足、纹饰或铭文区域；放大时注意表面保存状态与修复痕迹。"
        evidence_note = clean_text(draft.get("evidence_note", "")) or "名称与可辨事实来自现场展签；未能确认的字段保持空白。"

        if start == 82:
            category = "玉器"
            period = "北周宣政元年（578）"
            findspot = "1988年咸阳底张湾村若干云墓"
            material = "白玉"
            theme = "北周蹀躞带具"
            summary = "这组照片记录八环白玉蹀躞带的完整排列。展签明确其年代为北周宣政元年（578），1988年出土于咸阳底张湾村若干云墓。"
            description = "八环白玉蹀躞带由带銙、环件与带具构件组成，照片保留了整组器物在展柜中的排列关系。白玉构件色泽温润，形制规整；八环沿带具展开，便于观察不同构件之间的对应关系。这里仅采用该组展签能够确认的名称、纪年、材质与出土信息，不把相邻展柜中的玻璃器混入本条记录。"
            significance = "这件纪年明确的北周带具，可用于观察蹀躞带的构成方式、玉质构件的组合逻辑，以及北周至隋唐服饰制度与随葬体系中的带具形态。"
            viewing_notes = "先看整组排列和八环的位置，再放大带銙边缘、穿孔与连接部位；切换局部照片时，比较各构件尺寸、磨光程度与保存状态。"
            evidence_note = "名称、北周宣政元年（578）、白玉及若干云墓出土信息由现场展签直接支持；尺寸与现藏信息未见明确记录。"

        if start == 481:
            category = "金银器与饰品"
            period = "元（1271—1368）"
            material = "金、绿松石"
            summary = "照片记录仙人龟鹤齐寿带柄镜、金嵌绿松石耳坠与多件金簪。展签将这些饰物分别标为元代，并注明王里村墓葬的不同出土编号。"
            description = "同柜器物包括仙人龟鹤齐寿带柄镜、金嵌绿松石“天茄”耳坠、金累丝嵌绿松石耳坠，以及“满池娇”、螭虎纹和连钱纹折股金簪。照片把器物与编号、展签一并保留，可辨认耳坠的绿松石镶嵌、金丝工艺和簪体的弯折形态。多件器物来自同一时期但并非同一墓号，详情页按展签分别说明，不合并其出土信息。"
            significance = "这组金饰适合比较元代耳坠与簪钗的造型、金工和镶嵌方法，也能显示同一展柜如何并置不同墓葬出土的首饰。"
            viewing_notes = "先看带柄镜与金饰的整体陈列，再放大耳坠的绿松石镶口、累丝结构和簪首纹样；核对展签时注意M16与M19两个墓号。"

        if start == 483:
            category = "陶瓷器"
            period = "唐"
            summary = "这组照片记录铜川黄堡耀州窑遗址出土的素烧蹲狮香熏，以及褐黄釉、三彩和素烧器物。不同照片保留了器形与展签之间的对应关系。"
            description = "照片中可见素烧蹲狮香熏的蹲狮造型、镂空口部与承托底座；同柜另有褐黄釉器盖、三彩凸棱碗、三彩枕、褐黄釉犀牛枕、三彩行炉、深腹碗和素烧双鱼瓶标本等。展签将这些器物标为唐代，并分别注明铜川黄堡耀州窑遗址及发现年份。由于器物来自不同发掘年度，本条按窑址材料组合展示，不把它们写成同一出土单位。"
            significance = "这组窑址标本可用于比较耀州窑唐代素烧、褐黄釉与三彩产品的器形和装饰，也能观察成品、器盖、枕与造像类香熏在同一生产遗址中的类型差异。"
            viewing_notes = "先看蹲狮香熏的整体轮廓和镂空部位，再比较三彩、褐黄釉与素烧器物的表面效果；切换照片时按展签编号核对器名。"

        photos = []
        for position, sequence in enumerate(display_sequences):
            row = manifest[sequence]
            stem = Path(row["filename"]).stem
            photos.append({
                "sequence": sequence,
                "filename": row["filename"],
                "thumb": f"assets/photos/thumbs/{stem}.jpg",
                "web": f"assets/photos/web/{stem}.jpg",
                "width": int(row.get("source_width") or 3),
                "height": int(row.get("source_height") or 2),
                "role": "整体" if position == 0 else ("角度" if position == 1 else "局部"),
            })

        artifacts.append({
            "id": f"artifact-{index:03d}",
            "index": index,
            "start": start,
            "end": end,
            "title": title,
            "category": category,
            "period": period,
            "dimensions": dimensions,
            "findspot": findspot,
            "material": material,
            "theme": theme,
            "summary": summary,
            "description": description,
            "significance": significance,
            "viewing_notes": viewing_notes,
            "evidence_note": evidence_note,
            "display_sequences": display_sequences,
            "label_sequences": label_sequences,
            "source_excerpt": clean_text(evidence[:900]) if evidence else "",
            "photos": photos,
        })

    payload = {
        "meta": {
            "artifact_count": len(artifacts),
            "photo_count": len(manifest_rows),
            "display_photo_count": sum(len(item["photos"]) for item in artifacts),
            "hidden_label_count": sum(len(item["label_sequences"]) for item in artifacts),
            "coverage": [1, 521],
            "method": "Codex visual grouping; DeepSeek evidence-bounded first draft; Codex rule and manual review",
        },
        "artifacts": artifacts,
    }
    (DATA / "artifacts.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["meta"], ensure_ascii=False))


if __name__ == "__main__":
    main()

