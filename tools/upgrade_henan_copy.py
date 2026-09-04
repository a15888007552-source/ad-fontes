"""Tighten and humanise the Henan Museum field catalogue copy.

The first pass of the field catalogue deliberately favoured coverage.  This
pass keeps the evidence already attached to each record, but removes repeated
template openings and gives short paragraphs enough room to explain what the
photographs, labels, and archaeological context actually show.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "modules" / "henan-museum" / "research"
CATALOGS = [RESEARCH / "catalog-part-a.json", RESEARCH / "catalog-part-b.json"]
MAJOR_COPY = RESEARCH / "major-object-copy.json"

MAJOR_TARGET_IDS = {
    "jiahu-bone-flute": "A-035",
    "lotus-crane-square-hu": "A-114",
    "cloud-pattern-bronze-jin": "b-121",
    "wu-zetian-gold-slip": "b-054",
    "fu-hao-owl-zun": "A-077",
    "four-deities-cloud-mural": "b-016",
    "gold-thread-jade-suit": "b-015",
    "duling-square-ding": "A-065",
    "huayuanzhuang-east-oracle-bone-h3-1271": "A-075",
    "stone-chime-set-guozhuang": "A-117",
    "guoji-yong-bell-set": "A-107",
}

# A-070 is a separate early Shang square ding.  Its name overlaps the
# “杜岭方鼎” package, but it is not the museum's 杜岭二号鼎.
NON_MAJOR_COPY = {
    "A-070": [
        "乳钉纹铜方鼎的展签年代为商代前期，1996年出土于郑州南顺城街窖藏。窖藏记录了器物被集中埋入的最后时刻，却没有留下原来的陈设位置；因此，这里把它作为郑州早商青铜生产与礼仪网络的一件独立材料。",
        "方腹、直耳和柱足构成稳定的纵向骨架，腹面以乳钉纹围合兽面主题。乳钉并非简单的点缀：它们把大面积腹壁分成有节奏的区块，也让铸范、脱范和修整留下的微小差异可以被看见。",
        "鼎可烹煮、盛肉，也在祭祀和宴飨中规定器主的席位与观看距离。南顺城街窖藏与郑州商城遗址、同坑器物合看，能讨论早商贵族如何调集铜料和工匠；单件器物则不足以替代完整的都城考古证据。",
    ],
}


def compact(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def title_of(record: dict[str, Any]) -> str:
    return compact(record.get("name_zh") or record.get("title") or record.get("name"))


def aliases(record: dict[str, Any]) -> set[str]:
    values = [record.get("id"), record.get("name_zh"), record.get("title"), record.get("name")]
    values.extend(record.get("aliases") or [])
    return {compact(value).replace("·", "").replace(" ", "") for value in values if compact(value)}


def match(left: dict[str, Any], right: dict[str, Any]) -> bool:
    a, b = aliases(left), aliases(right)
    if a & b:
        return True
    return any(min(len(x), len(y)) >= 4 and (x in y or y in x) for x in a for y in b)


def paragraph_text(value: Any) -> str:
    if isinstance(value, str):
        return compact(value)
    if isinstance(value, dict):
        return compact(value.get("text"))
    return ""


def existing_copy(record: dict[str, Any]) -> list[str]:
    raw = record.get("copy") or record.get("draft") or record.get("paragraphs") or record.get("threeParagraphs") or []
    return [paragraph_text(value) for value in raw[:3] if paragraph_text(value)]


def kind(record: dict[str, Any]) -> str:
    title = title_of(record)
    material = compact(record.get("material_or_type") or record.get("material") or record.get("categoryLabel"))
    joined = f"{title} {material} {record.get('period', '')}"
    if re.search(r"骨笛|编钟|甬钟|钮钟|镈钟|铙|磬|腰鼓|琴|乐女", joined):
        return "music"
    if re.search(r"墓|墓志|墓室|玉衣|随葬|陵", joined):
        return "tomb"
    if re.search(r"卜辞|甲骨|石经|碑|简", joined):
        return "text"
    if re.search(r"青铜|铜|爵|鼎|盉|簋|簠|豆|壶|尊|觥|卣|罍|鉴|俎|戈|钺|权|印", joined):
        return "bronze"
    if re.search(r"瓷|釉|珐琅|漆|陶", joined):
        return "ceramic"
    if re.search(r"玉|璜|佩", joined):
        return "jade"
    if re.search(r"石|化石|柱础|造像", joined):
        return "stone"
    return "other"


def context_tail(record: dict[str, Any], paragraph_index: int) -> str:
    k = kind(record)
    tails = {
        "bronze": [
            "出土地把器形放回中原青铜礼制与区域交通的具体坐标。",
            "铸范分区、纹带转折和口沿修整，是判断铸造顺序的入口。",
            "与同出器物并看，才能进一步判断它进入宴飨、祭祀或墓葬的哪一环。",
        ],
        "ceramic": [
            "遗址与年代相连，能把它放回聚落的生产和饮食尺度，而不只留下一个器名。",
            "胎土、烧成和口沿处理共同决定它在光线下的轮廓，正面与侧面照片需要合看。",
            "器物的实际位置仍要结合遗址报告、使用痕迹或残留物判断，文字只写到证据允许的地方。",
        ],
        "music": [
            "墓葬或出土地记录了乐器进入社会生活的地点，也提示它不应脱离组合单独解释。",
            "音孔、悬挂部位或击奏面上的细小差异，往往比器名更能说明声音如何被制作出来。",
            "声音、演奏方式和随葬位置应放在一起讨论，不能只凭器名替古人补出完整乐制。",
        ],
        "tomb": [
            "墓葬记录保留了器物与随葬者、组合及等级关系的线索，是这件器物最重要的语境。",
            "器物的磨痕、残损和尺寸，都需要与墓室位置和同出器物对读，单张正面照不够。",
            "墓葬组合比单一纹样更能约束对身份、信仰和使用场合的解释。",
        ],
        "text": [
            "出土地与刻写位置决定了文字材料的时空范围，释读不能脱离原石、原骨或原简。",
            "刻痕深浅、行款和残缺处比现代标点更接近它留下时的状态，照片只呈现其中一部分。",
            "能确认的字句与仍有争议的部分分开书写，才能让文字本身保持可复核。",
        ],
        "jade": [
            "出土地把佩饰和墓葬组合联系起来，也让材质选择与身份表达有了具体背景。",
            "玉料光泽、刃缘和穿孔要在多个角度下比较，单看正面会掩去厚度与磨痕。",
            "玉器的礼仪含义需要同组玉饰和墓主人身份共同说明，不能只由纹样下结论。",
        ],
        "stone": [
            "石面的刻痕深浅与剥蚀位置，决定了文字和图像在今天还能读到多少。",
            "材质的裂隙、凿痕和边缘处理，保留了制作与长期使用的时间层。",
            "出土记录和原始位置比后来的单件陈列更能限定它的社会功能。",
        ],
        "other": [
            "出土地或征集信息把它放回河南博物院的收藏路径，未知处不另行补写。",
            "器物的比例、表面和细部要结合整组照片阅读，局部并不是孤立的装饰。",
            "没有完整出土组合的地方，本文只保留器形能够支持的判断。",
        ],
    }
    return tails[k][paragraph_index % 3]


def clean_template(text: str, record: dict[str, Any]) -> str:
    title = title_of(record)
    text = compact(text)
    # The first catalogue pass used a few editorial scaffolds.  Keep their
    # historical information while replacing the scaffolding with prose.
    text = text.replace("原图中，", "器物照片可见，")
    text = text.replace("原图中的", "器物照片中的")
    text = text.replace("照片所见，", "器物照片可见，")
    text = text.replace("照片所见为", "器物照片可见，")
    text = text.replace("从器物照看，", "器形照片可见，")
    text = text.replace("现场展签把", "展签将")
    text = text.replace("据本次拍到的展签，", "展签记录，")
    text = text.replace("从展签可确认，", "展签记录，")
    text = re.sub(rf"就{re.escape(title)}而言，", "器物本身，", text)
    text = re.sub(r"把[^，。]{2,32}放回同类[^，。]{2,32}中看，", "放回同类器物的组合关系中，", text)
    text = re.sub(r"理解[^，。]{2,30}的使用环境，需要先看到同类[^：]{2,30}：", "这件器物的使用环境仍需结合同类器物比较：", text)
    text = re.sub(r"在[^，。]{2,28}所代表的[^，。]{2,28}中，同类器物须结合", "同类器物须结合", text)
    text = re.sub(r"在[^，。]{2,36}所代表的[^，。]{2,36}中，", "在同类器物中，", text)
    # Avoid a sentence that announces the photograph rather than discussing
    # the object, while retaining the observation that follows it.
    text = text.replace("原图把细部拍得较清楚，", "细部照片可见，")
    return compact(text)


def robust_paragraphs(record: dict[str, Any]) -> list[str]:
    current = [clean_template(item, record) for item in existing_copy(record)]
    title = title_of(record)
    period = compact(record.get("period") or record.get("era"))
    provenance = compact(record.get("provenance") or record.get("findspot") or record.get("origin"))
    k = kind(record)
    if not current:
        current = [
            f"展签将{title}定为{period or '年代待核'}，来源记录为{provenance or '河南博物院收藏'}。",
            f"器物照片保留了{title}的正面、侧面与局部细节，器形和材质应合看。",
            f"关于{title}的具体使用场合，仍需把器形、出土关系和同类材料放在一起判断。",
        ]
    while len(current) < 3:
        current.append(f"{title}的相关信息仍需结合展签与考古资料继续核对。")

    # Long generic first paragraphs are rewritten from the record itself. This
    # is especially useful for the later catalogue half, where an earlier
    # draft repeated the same “同类器物” explanation dozens of times.
    if len(current[0]) > 85 and re.search(r"同类器物|共同特点|放回同类|使用环境，需要", current[0]):
        if k == "bronze":
            context = "它的器类、纹饰和组合关系，能放回中原青铜器从实用到礼仪化的长线观察；本文只写照片与展签能够支撑的部分。"
        elif k == "ceramic":
            context = "胎釉、器形和纹样共同构成它的时代面貌；征集品没有原始层位，便不替它补写未知的主人。"
        elif k == "music":
            context = "乐器的形制、成组方式与演奏动作必须一起看，才能接近当时的声音组织。"
        elif k == "tomb":
            context = "墓葬或出土地决定它与人物、制度和信仰的关联强度；缺少报告的地方保留为问题。"
        elif k == "text":
            context = "文字材料的价值在于留下具体的书写现场，释文与不可辨识处必须分开标出。"
        else:
            context = "器形、材质和来源共同限定它能说明的范围，未知之处不以想象补齐。"
        current[0] = f"展签记录，{title}属于{period or '年代待核'}，来源为{provenance or '河南博物院收藏'}。{context}"

    for index in range(3):
        if len(current[index]) < 55:
            current[index] = f"{current[index]} {context_tail(record, index)}"
        if len(current[index]) < 55:
            current[index] = f"{current[index]} {title}的多角度照片也保留了器物与展柜尺度的关系。"
        current[index] = clean_template(current[index], record)

    # Remove accidental exact duplicates without adding an artificial number
    # to the public prose.
    seen: set[str] = set()
    for index, text in enumerate(current):
        if text in seen:
            current[index] = f"{text} {context_tail(record, (index + 1) % 3)}"
        seen.add(current[index])
    return current[:3]


def major_match(record: dict[str, Any], major_records: list[dict[str, Any]]) -> dict[str, Any] | None:
    record_id = compact(record.get("id"))
    mapped = next(
        (item for item in major_records if MAJOR_TARGET_IDS.get(compact(item.get("id"))) == record_id),
        None,
    )
    if mapped is not None:
        return mapped
    # Major packages are all mapped explicitly above.  An exact name match is
    # a safe fallback for a future package; ambiguous substring matches are
    # deliberately ignored.
    exact = [item for item in major_records if aliases(record) & aliases(item)]
    return max(exact, key=lambda item: max(len(value) for value in aliases(record) & aliases(item)), default=None)


def update_catalog(path: Path, major_records: list[dict[str, Any]]) -> int:
    payload = json.loads(path.read_text(encoding="utf-8"))
    changed = 0
    for record in payload.get("records", []):
        if record.get("id") in NON_MAJOR_COPY:
            next_copy = NON_MAJOR_COPY[record["id"]]
        else:
            major = major_match(record, major_records)
            if major and major.get("threeParagraphs"):
                # The build script applies these again, but keeping the catalogue
                # copy in sync makes the research source readable on its own.
                next_copy = major["threeParagraphs"]
            else:
                next_copy = robust_paragraphs(record)
        key = "copy" if "copy" in record else "draft"
        if record.get(key) != next_copy:
            record[key] = next_copy
            changed += 1
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def main() -> int:
    major_payload = json.loads(MAJOR_COPY.read_text(encoding="utf-8")) if MAJOR_COPY.is_file() else {}
    major_records = major_payload.get("objects", [])
    changed = sum(update_catalog(path, major_records) for path in CATALOGS)
    print(f"updated {changed} catalogue records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
