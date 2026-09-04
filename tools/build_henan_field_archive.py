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
    # Editorial meta-language that must not return as a batch template.
    "不能用青铜器的铸造术语概括",
    "器物照与展签照可以互相核对",
    "纹饰不能单独替代出土记录",
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

# The photo roles and counts are already shown by the archive card.  These
# older inventory clauses made the prose read like a spreadsheet, so they are
# removed during every build rather than being allowed back in by a catalogue
# rerun.
PHOTO_INVENTORY_PATTERNS = (
    r"{title}的图组从器身延伸到展签，共\d+张，[^。]+。",
    r"从[^。；]{1,100}的展柜照到展签，{title}共保留\d+张图，[^。]+。",
    r"现有图组(?:在[^。；]{1,100})?只留下{title}的一张器物照片，[^。]+。",
    r"{title}的多角度照片也保留了器物与展柜尺度的关系。",
)

PHOTO_COUNT_MARKER = re.compile(r"(?:\d+\s*张|\d+\s*个(?:观看角度)?|合计\s*\d+)")
PHOTO_WORD_MARKER = re.compile(r"(?:照片|图组|现场照|现场图|器物照|标签照片|张图)")
LABEL_WORD_MARKER = re.compile(r"(?:展签|标签)")


def strip_photo_inventory_sentences(text: str) -> str:
    """Remove sentences that only inventory photos and label pairings.

    The gallery card already exposes the count and role of every image.  A
    sentence is treated as inventory copy only when it carries a count, a
    photo word, and a label word together; ordinary historical references to
    a single photograph remain untouched.  Keeping the original sentence
    boundaries avoids changing punctuation in paragraphs that need no scrub.
    """
    normalized = compact(text)
    segments = re.findall(r"[^。！？]*[。！？]|[^。！？]+$", normalized)
    if not segments:
        return normalized
    if not any(
        PHOTO_COUNT_MARKER.search(segment)
        and PHOTO_WORD_MARKER.search(segment)
        and LABEL_WORD_MARKER.search(segment)
        for segment in segments
    ):
        return normalized
    kept = [
        segment
        for segment in segments
        if not (
            PHOTO_COUNT_MARKER.search(segment)
            and PHOTO_WORD_MARKER.search(segment)
            and LABEL_WORD_MARKER.search(segment)
        )
    ]
    return compact("".join(kept))

# A small set of catalogue records had an earlier pass of copy injected into
# already-upgraded paragraphs.  Keep the repairs explicit and evidence-bound
# so the generated archive remains readable even when the ignored research
# catalogues are rebuilt from that intermediate state.
COPY_REPAIRS: dict[str, list[str]] = {
    "A-001": [
        "《泱泱华夏·择中建都》位于河南博物院基本陈列入口，以中原地理、都邑形成和文明延续为全展定下尺度。 《泱泱华夏·择中建都》展览导语的出土或征集记录，勾勒出它进入河南博物院收藏的路径；未知处不另行补写。",
        "墙面文字从“择中”切入，把早期聚落、王朝都城与历代制度放进同一条叙事线，而不是从某一件名品孤立起笔。展厅的轴线和文字层级把“择中建都”的叙事落到郑州这座都城上。",
        "入口首先提出一个贯穿全展的问题：华夏文明为何在中原汇合，又如何借都城不断重组。它让随后出现的器物拥有共同的时间轴与空间坐标。",
    ],
    "A-055": [
        "玉璋出土于河南郑州杨庄，属于商代前期。看玉璋的玉料与形制，要先回到它与其他佩饰共同出现的墓葬位置。玉璋的穿孔、刃缘和厚薄变化，仍要结合侧面照看磨制过程。",
        "扁平长条形玉料经切割、磨制而成，刃部与柄端的比例决定整体庄重感。玉璋的光泽并不能代替工艺判断，穿孔、边缘和磨痕要随角度变化一起看。",
        "璋在古代礼仪中具有象征性用途，单件出土信息不足时不宜指定某一仪式。它显示郑州商城时期的礼仪体系并不只依赖青铜，也包含费工的玉器。",
    ],
    "A-056": [
        "1955年，夔龙纹铜盘出土于河南郑州白家庄，属于商代前期。夔龙纹铜盘的出土地点可定位在1955年河南郑州白家庄，青铜水器的器形与商代前期由此互相校准。",
        "浅腹宽沿适合承水，夔龙纹沿可观看的器面展开，纹地与主纹层次分明。在1955年河南郑州白家庄的记录里，夔龙纹铜盘的范线、接缝与青铜水器纹饰分区要一起对读，商代前期的制作次序只能从这些部位逐层追问。",
        "盘常用于盥洗承水，也能进入祭祀、宴飨等礼仪程序。白家庄铜器让郑州商城贵族用器的类别与装饰更加具体。夔龙纹铜盘在1955年河南郑州白家庄留下的组合线索，能约束青铜水器在礼仪中的位置，单一纹饰只提供观察入口。",
    ],
    "A-102": [
        "1981年，鱼龙纹铜盘出土于河南南阳市郊砖瓦厂，属于西周。鱼龙纹铜盘的出土地点可定位在1981年河南南阳市郊砖瓦厂，青铜水器的器形与西周由此互相校准。",
        "浅盘内外以鱼龙纹组织水面可见图案，宽沿与腹部适合承接盥洗用水。在1981年河南南阳市郊砖瓦厂的记录里，鱼龙纹铜盘的范线、接缝与青铜水器纹饰分区要一起对读，西周的制作次序只能从这些部位逐层追问。",
        "盘通常与匜、盉等注水器配合，参与盥洗和礼仪洁净。同出铭文簋为这件盘提供了南阳西周贵族器用的区域背景。鱼龙纹铜盘在1981年河南南阳市郊砖瓦厂留下的组合线索，能约束青铜水器在礼仪中的位置，单一纹饰只提供观察入口。",
    ],
    "b-074": [
        "骑马狩猎纹铜镜为唐代扶沟出土器，现场展签写1958年，河南博物院网页写1963年；目录保留这一年份冲突，不以其中一说覆盖另一说。",
        "镜背以中央钮和四座山峰分区，四名骑者分别张弓、持矛或策马，追逐熊、兔、野猪和鹿，外圈再配飞鸟、蜂蝶与折枝花。纹带转折与边缘修整让青铜镜的铸造过程有了可观察的层次，正面与侧面应合看。",
        "铜镜正面用于照容，背纹则把唐代贵族热衷的山林狩猎压缩为随身图像，也保存了骑射姿态和猎物组合。扶沟出土地点和展签、网页的年份差异都需保留，年代与用途的判断以馆方资料为界。",
    ],
    "b-079": [
        "展签记录，解盐使司大安三年银铤属于金大安三年（1211，展签纪年），来源为1978年唐河县出土。解盐使司大安三年银铤的来源记录指向1978年唐河县，银铤超出金大安三年（1211，展签纪年）与现有照片的推断暂不展开。",
        "器物本身，银铤上的机构、纪年和重量信息用于标识经手与价值，便于大额赋税或财政转运。银面戳记要与展签纪年同看，具体成色、重量以馆方登记为准。",
        "银铤以重量储值，解盐使司和纪年戳记把盐务财政的经手责任压印在银面；唐河出土又提示这类官银后来可能经历窖藏或再流通。",
    ],
    "b-082": [
        "展签记录，三彩舍利匣属于北宋咸平元年（998），来源为1966年密县法海寺塔基地宫出土。把三彩舍利匣的形制、材质和来源放在一起，才能知道它能说明的范围有多大。",
        "器物本身，方形匣体模拟木构建筑，屋顶、门窗和人物神兽以三彩装饰；器内用于安置舍利。舍利匣的门窗、屋檐和匣体比例，把佛塔地宫的供奉空间缩进一件器物。",
        "三彩舍利匣的历史意义在于，它把舍利供养、塔基地宫和宋代三彩工艺结合在同一宗教器物中。三彩舍利匣没有完整出土组合可供复原，因此本文只保留器形能够支持的判断。",
    ],
    "b-114": [
        "展签记录，大清宝钞属于清咸丰四年（1854），来源为征集。大清宝钞的来源只记作征集，原始地点尚不清楚；纸钞的形制先按现有照片记录。",
        "器物照片可见，大清宝钞呈纸面边栏、钞名、图案和成列文字。钞面边栏、钞名和成列文字共同建立面值与发行者的识别秩序。",
        "宝钞依靠版框、面额和官印进入流通，与户部官票并行使用；纸面保存状态可用来观察咸丰时期货币信用的实际载体。大清宝钞的缺环恰在组合关系：没有原始位置的部分，文字不替考古现场补写。",
    ],
    "b-116": [
        "展签记录，左国玑行书卷属于明代（1368—1644），来源为征集。把左国玑行书卷的形制、材质和来源放在一起，才能知道它能说明的范围有多大。",
        "器物本身，长卷以行书连续书写诗文，字势和章法随卷面展开；左国玑为开封人，与李梦阳、张路并称‘中州三杰’。卷面行气、落款与纸张边缘要分开观察，才能理解书写者如何安排长卷节奏。",
        "左国玑行书卷的历史意义在于，作品为明代中州文人交往、诗书关系和地方书法史提供直接材料。左国玑行书卷没有完整出土组合可供复原，因此本文只保留器形能够支持的判断。",
    ],
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def compact(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def copy_source_phrase(record: dict[str, Any]) -> str:
    """Use the same short provenance label as the copy upgrader in QA."""
    raw = compact(record.get("provenance") or record.get("findspot") or record.get("origin"))
    if not raw:
        return "现有收藏记录"
    if raw.startswith("征集") or ("征集" in raw and "出土" not in raw):
        return "征集记录"
    value = re.split(r"[，,；;]", raw, maxsplit=1)[0]
    value = re.sub(r"（[^）]{1,24}）$", "", value)
    value = re.sub(r"(出土|发现|入藏)$", "", value)
    return re.sub(r"\s+", "", value)[:34] or "现有收藏记录"


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
    record_id = compact(record.get("id"))
    raw = COPY_REPAIRS.get(record_id) or (
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
            text = compact(value)
        else:
            text = compact(value.get("text"))
        text = strip_photo_inventory_sentences(text)
        result.append({
            "heading": headings[index] if isinstance(value, str) else compact(value.get("heading")) or headings[index],
            "text": compact(text),
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
    photo_skeleton_groups: dict[str, set[str]] = {}
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
        local_photo_sentences: Counter[str] = Counter()
        for text in texts:
            for phrase in GENERIC_PHRASES:
                if phrase in text:
                    errors.append(f"{group['id']} {group['title']}: generic phrase: {phrase}")
            if title and text.count(title) >= 10:
                errors.append(f"{group['id']} {group['title']}: repeated title corruption")
            if repeated_title and repeated_title.search(text):
                errors.append(f"{group['id']} {group['title']}: nested title prefix")
            # Photo counts and label pairing belong in the gallery UI.  Flag
            # any inventory sentence that combines a count, photo wording, and
            # a label reference; factual excavation prose without that trio is
            # intentionally left alone.
            for sentence in re.split(r"(?<=[。！？；])", text):
                sentence = sentence.strip()
                if not (
                    PHOTO_COUNT_MARKER.search(sentence)
                    and PHOTO_WORD_MARKER.search(sentence)
                    and LABEL_WORD_MARKER.search(sentence)
                ):
                    continue
                normalized = re.sub(re.escape(title), "<TITLE>", sentence) if title else sentence
                normalized = re.sub(r"\d+张", "<N>张", normalized)
                normalized = re.sub(r"\d+个(?:观看角度)?", "<N>", normalized)
                for field in (
                    compact(group.get("provenance")),
                    copy_source_phrase(group),
                    compact(group.get("material")),
                    compact(group.get("material"))[:18],
                ):
                    if field:
                        normalized = normalized.replace(field, "<FIELD>")
                normalized = re.sub(r"\s+", "", normalized)
                if len(normalized) >= 24:
                    photo_skeleton_groups.setdefault(normalized, set()).add(group["id"])
                    local_photo_sentences[normalized] += 1
        if any(count > 1 for count in local_photo_sentences.values()):
            errors.append(f"{group['id']} {group['title']}: repeated photo inventory sentence within group")
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
    repeated_skeletons = sorted(
        (sentence, ids)
        for sentence, ids in photo_skeleton_groups.items()
        if len(ids) >= 5
    )
    if repeated_skeletons:
        errors.append(f"cross-group repeated copy skeletons: {len(repeated_skeletons)}")

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
