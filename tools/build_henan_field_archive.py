from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "modules" / "henan-museum"
RESEARCH = MODULE / "research"
DATA = MODULE / "data"
ASSET_MANIFEST = RESEARCH / "field-photo-assets.json"
CATALOGS = [RESEARCH / "catalog-part-a.json", RESEARCH / "catalog-part-b.json"]
SUPPLEMENT = RESEARCH / "supplemental-records.json"
MAJOR_COPY = RESEARCH / "major-object-copy.json"

GENERIC_PHRASES = (
    "提供了可定位的实物样本",
    "器形与装饰同时服务于实际使用和身份表达",
    "器名所列釉色、纹样与器形",
    "它为观察青铜铸造、装饰技术和器用制度的变化",
    "它可与窑址、釉色和纹样材料互证",
    "这部分仍待依据展签",
    # These two strings were retired from the catalogue after the first
    # contextual pass.  Keep them in the build gate so a future regeneration
    # cannot silently reintroduce the batch-copy fingerprint.
    "器物不再只是一个名称，而有了聚落生活的时间坐标",
    "胎土、火候和口沿收放要在多张照片里一起读",
)

ROLE_NAMES = {
    "front": "正面",
    "side": "侧面",
    "back": "背面",
    "detail": "局部",
    "inscription": "铭文",
    "label": "展签",
    "online": "馆藏图",
    "phone": "手机补拍",
}

STATUS_LABELS = {
    "verified_normalized_transcription": "已核对的规范化录文",
    "verified_short_inscription": "已核定短铭",
    "verified": "已核对",
    "high": "高可信",
    "medium": "中等可信",
    "low": "低可信",
}

# This is an editorial context link, not a claim that every object has an
# individual detail page.  It keeps the public archive transparent about the
# exhibition framework when a field record has no object-level URL.
DEFAULT_CONTEXT_SOURCE = {
    "label": "河南博物院｜基本陈列《泱泱华夏·择中建都》（展览语境）",
    "url": "https://www.chnmus.net/ch/exhibitions/permanent/huaxia/index.html",
}

MAJOR_TARGET_IDS = {
    "jiahu-bone-flute": "A-035",
    "lotus-crane-square-hu": "A-114",
    "cloud-pattern-bronze-jin": "b-121",
    "northern-qi-white-glazed-green-painted-long-necked-vase": "supp-white-green-long-necked-bottle",
    "wu-zetian-gold-slip": "b-054",
    "fu-hao-owl-zun": "A-077",
    "four-deities-cloud-mural": "b-016",
    "gold-thread-jade-suit": "b-015",
    "duling-square-ding": "A-065",
    "huayuanzhuang-east-oracle-bone-h3-1271": "A-075",
    "stone-chime-set-guozhuang": "A-117",
    "guoji-yong-bell-set": "A-107",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def compact(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def note_value(value: Any) -> str:
    if isinstance(value, (list, tuple)):
        return "、".join(compact(item) for item in value if compact(item))
    return compact(value)


def record_list(payload: dict[str, Any]) -> list[dict[str, Any]]:
    for key in ("records", "groups", "items", "objects"):
        if isinstance(payload.get(key), list):
            return payload[key]
    return []


def source_list(record: dict[str, Any]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    seen: set[str] = set()
    for source in record.get("sources") or []:
        if isinstance(source, str):
            url, label = source, source
        else:
            url = compact(source.get("url") or source.get("href"))
            label = compact(source.get("label") or source.get("title") or url)
        if not url.startswith(("https://", "http://")) or url in seen:
            continue
        seen.add(url)
        result.append({"label": label or url, "url": url})
    return result


def sentence_lead(text: str, maximum: int = 82) -> str:
    text = compact(text)
    if not text:
        return ""
    match = re.search(r"^(.+?[。！？])", text)
    lead = match.group(1) if match else text
    if len(lead) <= maximum:
        return lead
    return lead[: maximum - 1].rstrip("，、；：") + "…"


def normalize_copy(record: dict[str, Any]) -> list[dict[str, str]]:
    raw = (
        record.get("copy")
        or record.get("draft")
        or record.get("paragraphs")
        or record.get("threeParagraphs")
        or []
    )
    headings = ("身份与来处", "器形与工艺", "历史现场")
    result: list[dict[str, str]] = []
    for index, value in enumerate(raw[:3]):
        if isinstance(value, str):
            result.append({"heading": headings[index], "text": compact(value)})
        else:
            result.append({
                "heading": compact(value.get("heading")) or headings[index],
                "text": compact(value.get("text")),
            })
    return result


def normalize_inscription(record: dict[str, Any]) -> dict[str, str] | None:
    raw = record.get("inscription")
    if not isinstance(raw, dict):
        return None
    original = compact(raw.get("original") or raw.get("text") or raw.get("transcription"))
    if not original or re.search(r"待核|待释|未见|无法辨|无可靠", original):
        return None
    translation = compact(raw.get("translation") or raw.get("paraphrase") or raw.get("interpretation"))
    note_parts = [
        note_value(raw.get("source") or raw.get("seen_from") or raw.get("note")),
        note_value(raw.get("missing_or_disputed") or raw.get("uncertainty") or raw.get("notes")),
    ]
    note = "；".join(value for value in note_parts if value)
    status = compact(raw.get("status") or raw.get("transcription_status") or raw.get("confidence"))
    status = STATUS_LABELS.get(status, status)
    return {
        "original": original,
        "translation": translation,
        "note": note,
        "status": status,
    }


def derive_tags(title: str, era: str, material: str, provenance: str, flags: dict[str, Any], inscription: Any) -> list[str]:
    joined = f"{title} {era} {material} {provenance}"
    tags: set[str] = set()
    if re.search(r"旧石器|新石器|裴李岗|仰韶|龙山|贾湖", joined):
        tags.add("prehistoric")
    if flags.get("bronze") or re.search(r"青铜|铜(?!胎|镜)|甲骨|卜骨|卜甲", joined):
        tags.add("bronze")
    if flags.get("musical_instrument") or re.search(r"骨笛|编钟|甬钟|钮钟|铙|磬|琴|鼓|乐俑|乐舞", joined):
        tags.add("music")
    if flags.get("tomb") or re.search(r"墓|陵|随葬|墓志|墓室|墓葬", joined):
        tags.add("tomb")
    if re.search(r"陶|瓷|釉|三彩|窑|琉璃", joined):
        tags.add("ceramic")
    if inscription:
        tags.add("inscription")
    if re.search(r"明|清|民国|中华民国|近现代|康熙|雍正|乾隆|嘉庆|道光|同治|光绪|宣统", joined):
        tags.add("later")
    return sorted(tags)


def camera_photo_objects(record: dict[str, Any]) -> list[dict[str, Any]]:
    filenames = [compact(value) for value in record.get("photos") or [] if compact(value)]
    labels = [compact(value) for value in record.get("label_photos") or [] if compact(value)]
    label = compact(record.get("label_photo"))
    if label:
        labels.append(label)
    inscription = normalize_inscription(record)
    result: list[dict[str, Any]] = []
    for index, filename in enumerate(filenames):
        if index == 0:
            role = "front"
        elif inscription and index == len(filenames) - 1 and len(filenames) > 1:
            role = "inscription"
        elif index == 1:
            role = "side"
        else:
            role = "detail"
        result.append({
            "filename": filename,
            "role": role,
            "featured": index == 0,
            "credit": f"本次实拍 · {Path(filename).stem}",
        })
    for label_name in labels:
        if label_name not in filenames and not any(item.get("filename") == label_name for item in result):
            result.append({"filename": label_name, "role": "label", "credit": f"现场展签 · {Path(label_name).stem}"})
    return result


def asset_photo_objects(record: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for index, photo in enumerate(record.get("asset_photos") or []):
        if isinstance(photo, str):
            photo = {"asset": photo}
        item = {
            "asset": compact(photo.get("asset")),
            "role": compact(photo.get("role")) or ("front" if index == 0 else "detail"),
            "credit": compact(photo.get("credit")),
            "alt": compact(photo.get("alt")),
            "featured": bool(photo.get("featured") or index == 0),
        }
        if item["asset"]:
            result.append(item)
    return result


def normalize_record(record: dict[str, Any], number: int) -> dict[str, Any]:
    title = compact(record.get("name_zh") or record.get("title") or record.get("name"))
    era = compact(record.get("period") or record.get("era"))
    material = compact(record.get("material_or_type") or record.get("material") or record.get("categoryLabel"))
    provenance = compact(record.get("provenance") or record.get("findspot") or record.get("origin"))
    paragraphs = normalize_copy(record)
    inscription = normalize_inscription(record)
    photos = camera_photo_objects(record) + asset_photo_objects(record)
    flags = record.get("flags") if isinstance(record.get("flags"), dict) else {}
    tags = derive_tags(title, era, material, provenance, flags, inscription)
    roles = []
    for photo in photos:
        label = ROLE_NAMES.get(photo.get("role"), photo.get("role", "现场照片"))
        if label not in roles:
            roles.append(label)
    sources = source_list(record) or [DEFAULT_CONTEXT_SOURCE.copy()]
    if "bronze" in tags and "鉴" in title:
        atlas_source = {
            "label": "宝鸡青铜器博物馆｜青铜器用图谱：鉴（jian-water）",
            "url": "../baoji/index.html?atlasType=jian-water#bronze-use-atlas",
        }
        if not any(item.get("url") == atlas_source["url"] for item in sources):
            sources.append(atlas_source)
    group: dict[str, Any] = {
        "id": compact(record.get("id")) or f"field-{number:03d}",
        "number": number,
        "title": title,
        "era": era,
        "material": material,
        "provenance": provenance,
        "lead": compact(record.get("lead")) or sentence_lead(paragraphs[0]["text"] if paragraphs else ""),
        "paragraphs": paragraphs,
        "photos": photos,
        "tags": tags,
        "origin": "本次馆内实拍" if any("filename" in photo for photo in photos) else "补充资料",
        "sequenceLabel": " → ".join(roles),
        "sources": sources,
    }
    if flags.get("musical_instrument"):
        group["musicFocus"] = True
    if flags.get("tomb"):
        group["tombFocus"] = True
    if inscription:
        group["inscription"] = inscription
        group["inscriptionFocus"] = True
    return group


def record_aliases(record: dict[str, Any]) -> set[str]:
    values = [record.get("title"), record.get("name"), record.get("name_zh")]
    values.extend(record.get("aliases") or [])
    return {compact(value).replace("·", "").replace(" ", "") for value in values if compact(value)}


def records_match(left: dict[str, Any], right: dict[str, Any]) -> bool:
    left_aliases = record_aliases(left)
    right_aliases = record_aliases(right)
    if left_aliases & right_aliases:
        return True
    # Exhibition labels often append a count, excavation number, or an older
    # catalogue name.  A sufficiently long contained alias is still safe for
    # these named objects, while short vessel-type words (鼎、禁、鉴) are not.
    return any(
        min(len(a), len(b)) >= 4 and (a in b or b in a)
        for a in left_aliases
        for b in right_aliases
    )


def best_record_match(records: list[dict[str, Any]], override: dict[str, Any]) -> dict[str, Any] | None:
    """Choose the strongest named match, avoiding generic vessel aliases.

    A flagship package may list both “杜岭方鼎” and “兽面乳钉纹铜方鼎” as
    aliases.  Simple substring matching would also catch a different
    “乳钉纹铜方鼎”; an exact, longest alias must win first.
    """
    explicit_id = MAJOR_TARGET_IDS.get(compact(override.get("id")))
    if explicit_id:
        target = next((record for record in records if compact(record.get("id")) == explicit_id), None)
        if target is not None:
            return target
    override_aliases = record_aliases(override)
    exact = [
        (max(len(alias) for alias in override_aliases & record_aliases(record)), record)
        for record in records
        if override_aliases & record_aliases(record)
    ]
    if exact:
        return max(exact, key=lambda item: item[0])[1]
    candidates = [record for record in records if records_match(record, override)]
    if not candidates:
        return None
    return max(
        candidates,
        key=lambda record: max(
            (min(len(a), len(b)) for a in record_aliases(record) for b in override_aliases if a in b or b in a),
            default=0,
        ),
    )


def merge_supplemental_records(records: list[dict[str, Any]], supplements: list[dict[str, Any]]) -> None:
    """Attach phone/online views to an existing field object when names match."""
    for supplement in supplements:
        target = next((record for record in records if records_match(record, supplement)), None)
        if target is None:
            records.append(supplement)
            continue
        target.setdefault("asset_photos", []).extend(supplement.get("asset_photos") or [])
        target.setdefault("sources", []).extend(supplement.get("sources") or [])
        if supplement.get("inscription"):
            target["inscription"] = supplement["inscription"]
        # Supplemental records were researched from the museum pages and are
        # preferred to the early short field-label draft. Major-copy overrides
        # are applied once more below for the small set of flagship objects.
        for key in (
            "copy", "draft", "paragraphs", "threeParagraphs", "lead",
            "period", "era", "material_or_type", "material", "provenance", "findspot",
        ):
            if supplement.get(key):
                target[key] = supplement[key]


def apply_major_copy(records: list[dict[str, Any]], path: Path) -> None:
    if not path.is_file():
        return
    payload = read_json(path)
    overrides = record_list(payload)
    for override in overrides:
        aliases = record_aliases(override)
        if not aliases:
            continue
        target = best_record_match(records, override)
        if target is None:
            continue
        if override.get("threeParagraphs"):
            # Normalize the flagship research package onto the catalogue's
            # primary copy key so an older field-label draft cannot win.
            target["copy"] = override["threeParagraphs"]
        if override.get("findspot"):
            target["provenance"] = override["findspot"]
        for key in (
            "copy", "draft", "paragraphs", "threeParagraphs", "lead", "sources", "inscription",
            "period", "era", "material_or_type", "material", "provenance", "findspot",
        ):
            if override.get(key):
                target[key] = override[key]


def validate(groups: list[dict[str, Any]], camera_names: list[str]) -> dict[str, Any]:
    errors: list[str] = []
    assigned = [photo["filename"] for group in groups for photo in group["photos"] if photo.get("filename")]
    counts = Counter(assigned)
    missing = sorted(set(camera_names) - set(assigned))
    duplicate = sorted(name for name, count in counts.items() if count > 1)
    unexpected = sorted(set(assigned) - set(camera_names))
    if missing:
        errors.append(f"unassigned camera photos: {len(missing)}")
    if duplicate:
        errors.append(f"duplicate camera assignments: {len(duplicate)}")
    if unexpected:
        errors.append(f"unexpected camera filenames: {len(unexpected)}")

    ids = Counter(group["id"] for group in groups)
    titles = Counter(group["title"] for group in groups)
    if any(count > 1 for count in ids.values()):
        errors.append("duplicate group ids")
    if any(not group["title"] for group in groups):
        errors.append("group without title")
    for group in groups:
        texts = [paragraph.get("text", "") for paragraph in group["paragraphs"]]
        if len(texts) != 3 or any(len(text) < 55 for text in texts):
            errors.append(f"{group['id']} {group['title']}: copy must contain three substantial paragraphs")
        if not group["photos"]:
            errors.append(f"{group['id']} {group['title']}: no photos")
        title = group["title"]
        if title:
            repeated_title = re.compile(rf"(?:把{re.escape(title)}){{2,}}|(?:{re.escape(title)}的){{2,}}")
        else:
            repeated_title = None
        for text in texts:
            for phrase in GENERIC_PHRASES:
                if phrase in text:
                    errors.append(f"{group['id']} {group['title']}: generic phrase: {phrase}")
            if title and text.count(title) >= 10:
                errors.append(f"{group['id']} {group['title']}: repeated title corruption")
            if repeated_title and repeated_title.search(text):
                errors.append(f"{group['id']} {group['title']}: nested title prefix")
        for photo in group["photos"]:
            asset = photo.get("asset")
            if asset and not (MODULE / asset).is_file():
                errors.append(f"{group['id']} {group['title']}: missing asset {asset}")
            filename = photo.get("filename")
            if filename:
                stem = Path(filename).stem
                for kind in ("web", "thumbs"):
                    path = MODULE / "assets" / "photos" / kind / f"{stem}.webp"
                    if not path.is_file():
                        errors.append(f"{group['id']} {group['title']}: missing {kind} image for {filename}")

    paragraph_counts = Counter(
        paragraph["text"] for group in groups for paragraph in group["paragraphs"] if paragraph.get("text")
    )
    repeated = sorted(text for text, count in paragraph_counts.items() if count > 1)
    if repeated:
        errors.append(f"exactly repeated paragraphs: {len(repeated)}")

    return {
        "sourceCount": len(camera_names),
        "groupCount": len(groups),
        "assignedCameraPhotos": len(assigned),
        "unassigned": missing,
        "duplicateAssignments": duplicate,
        "unexpected": unexpected,
        "duplicateTitleCount": sum(1 for count in titles.values() if count > 1),
        "groupsWithOnlineSources": sum(bool(group["sources"]) for group in groups),
        "inscriptionGroupCount": sum(bool(group.get("inscription")) for group in groups),
        "exactRepeatedParagraphCount": len(repeated),
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-invalid", action="store_true", help="write outputs even when validation fails")
    args = parser.parse_args()

    missing_inputs = [str(path) for path in CATALOGS + [ASSET_MANIFEST, SUPPLEMENT] if not path.is_file()]
    if missing_inputs:
        raise SystemExit("missing inputs:\n" + "\n".join(missing_inputs))

    raw_records: list[dict[str, Any]] = []
    unidentified: list[dict[str, Any]] = []
    for path in CATALOGS:
        payload = read_json(path)
        raw_records.extend(record_list(payload))
        unidentified.extend(payload.get("unidentified_groups") or [])
    if unidentified:
        raise SystemExit(f"catalog still contains {len(unidentified)} unidentified groups")
    supplements = record_list(read_json(SUPPLEMENT))
    merge_supplemental_records(raw_records, supplements)
    apply_major_copy(raw_records, MAJOR_COPY)

    groups = [normalize_record(record, index) for index, record in enumerate(raw_records, 1)]
    manifest = read_json(ASSET_MANIFEST)
    camera_names = [item["filename"] for item in manifest["items"]]
    report = validate(groups, camera_names)

    print(json.dumps({key: value for key, value in report.items() if key not in {"errors", "unassigned", "duplicateAssignments", "unexpected"}}, ensure_ascii=False, indent=2))
    if report["errors"]:
        print("VALIDATION ERRORS")
        for error in report["errors"][:80]:
            print("-", error)
        if len(report["errors"]) > 80:
            print(f"- ... {len(report['errors']) - 80} more")
        if not args.allow_invalid:
            return 1

    payload = {
        "schema": "henan-field-archive-v2",
        "sourceCount": len(camera_names),
        "supplementalCount": len(record_list(read_json(SUPPLEMENT))),
        "groupCount": len(groups),
        "groups": groups,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    (DATA / "field-photo-index.json").write_text(json_text, encoding="utf-8")
    (DATA / "field-photo-index.js").write_text("window.HENAN_FIELD_ARCHIVE = " + json_text.rstrip() + ";\n", encoding="utf-8")
    (RESEARCH / "field-photo-coverage-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", DATA / "field-photo-index.json")
    print("wrote", DATA / "field-photo-index.js")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
