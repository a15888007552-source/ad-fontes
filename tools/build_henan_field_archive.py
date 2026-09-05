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

PHOTO_COUNT_MARKER = re.compile(r"(?:(?:\d+|[一二三四五六七八九十百千两]+)\s*张|合计\s*(?:\d+|[一二三四五六七八九十百千两]+))")
PHOTO_WORD_MARKER = re.compile(r"(?:照片|图组|现场照|现场图|现场记录|器物照|标签照片|张图)")
LABEL_WORD_MARKER = re.compile(r"(?:展签|标签)")
PHOTO_DETAIL_MARKER = re.compile(r"(?:正面|侧面|局部|细部|名称|比例|整体|表面|原图|器物)")
CONTEXT_TEMPLATE_MARKER = "在礼仪中的位置，单一纹饰只提供观察入口"


def strip_photo_inventory_sentences(text: str) -> str:
    """Remove sentences that only inventory photos and label pairings.

    The gallery card already exposes the count and role of every image.  A
    sentence is treated as inventory copy only when it carries a count, a
    photo word, and a label or role/detail word; ordinary historical references
    to a single photograph remain untouched.  Keeping the original sentence
    boundaries avoids changing punctuation in paragraphs that need no scrub.
    """
    normalized = compact(text)
    segments = re.findall(r"[^。！？]*[。！？]|[^。！？]+$", normalized)
    if not segments:
        return normalized
    if not any(
        PHOTO_COUNT_MARKER.search(segment)
        and PHOTO_WORD_MARKER.search(segment)
        and (LABEL_WORD_MARKER.search(segment) or PHOTO_DETAIL_MARKER.search(segment))
        for segment in segments
    ):
        return normalized
    kept = [
        segment
        for segment in segments
        if not (
            PHOTO_COUNT_MARKER.search(segment)
            and PHOTO_WORD_MARKER.search(segment)
            and (LABEL_WORD_MARKER.search(segment) or PHOTO_DETAIL_MARKER.search(segment))
        )
    ]
    return compact("".join(kept))


def strip_context_template_sentences(text: str) -> str:
    """Drop the old batch tail that reduced every object to one ritual formula.

    The sentence is an editorial scaffold, not object evidence.  Removing the
    whole sentence keeps the preceding provenance sentence intact; the copy
    upgrader adds an evidence-bound sentence only when the paragraph becomes
    too short.
    """
    normalized = compact(text)
    segments = re.findall(r"[^。！？]*[。！？]|[^。！？]+$", normalized)
    if not segments or not any(CONTEXT_TEMPLATE_MARKER in segment for segment in segments):
        return normalized
    return compact("".join(segment for segment in segments if CONTEXT_TEMPLATE_MARKER not in segment))


def strip_generated_scaffolds(text: str, record: dict[str, Any]) -> str:
    """Remove material-mismatched or batch-generated catalogue tails."""
    normalized = compact(text)
    for old, new in TARGETED_SENTENCE_REPAIRS.get(compact(record.get("id")), {}).items():
        normalized = normalized.replace(old, new)
    segments = re.findall(r"[^。！？]*[。！？]|[^。！？]+$", normalized)
    if not segments:
        return normalized
    title = compact(record.get("name_zh") or record.get("title") or record.get("name"))
    material = compact(record.get("material_or_type") or record.get("material") or record.get("categoryLabel"))
    joined = f"{title} {material}"
    plain_pottery = "陶" in joined and not re.search(r"釉|瓷|珐琅", joined)
    kept = []
    for segment in segments:
        if "器形先于寓意" in segment or "边缘与背面提供了另一组证据" in segment:
            continue
        # These two sentences were introduced as length fillers in an older
        # pass.  They are readable in isolation, but their repeated shape
        # turns the archive into a batch of near-identical captions.  Keep the
        # evidence already in the paragraph and let the length guard below
        # add a record-specific sentence when needed.
        if "尺度与保存痕迹共同限定可说范围，缺环不作补写" in segment:
            continue
        if re.search(
            r"关于[^。]{1,90}的使用场合，仍需把器形与来源记录放在一起判断"
            r"|的器形和[^。]{1,80}表面可以说明观看与使用的方向，具体场合仍要回到[^。]{1,100}组合记录",
            segment,
        ):
            continue
        if CONTEXT_SENTENCE_SCAFFOLD.search(segment):
            replacement = CONTEXT_SENTENCE_REPLACEMENTS.get(compact(record.get("id")))
            if replacement:
                kept.append(replacement)
            # Remove an unmapped occurrence rather than allowing a shared
            # caption to survive; the length guard supplies a record-aware
            # tail on the next pass.
            continue
        if PROVENANCE_CERAMIC_SCAFFOLD.search(segment):
            replacement = CERAMIC_PROVENANCE_REPLACEMENTS.get(compact(record.get("id")))
            if replacement:
                kept.append(replacement)
            # Keep an unmapped future record from reintroducing the shared
            # caption; a later length guard can supply a local sentence.
            continue
        if LOCATION_CALIBRATION_SCAFFOLD.search(segment) or SURFACE_SCAFFOLD.search(segment):
            # Targeted records were rewritten above.  If a future source
            # record carries the old sentence, drop it instead of publishing
            # the shared caption or vessel-only terminology.
            continue
        if USAGE_SENTENCE_SCAFFOLD.search(segment):
            # Known occurrences are supplied by COPY_REPAIRS.  Drop an
            # unmapped one rather than allowing this second batch formula to
            # return during a later catalogue rebuild.
            continue
        if "装饰只是一条线索，组合信息还要继续核对" in segment:
            continue
        if "只提供地点边界" in segment:
            continue
        if re.search(
            r"沿着[^。]{1,80}的器壁和底部观察，泥胎成型与受火痕迹各有位置，解释止于可见证据",
            segment,
        ):
            continue
        if plain_pottery and re.search(r"釉色|积釉|胎釉|施彩或磨损", segment):
            continue
        kept.append(segment)
    return compact("".join(kept))


# A few cards need two different short repairs after the old “地点边界” or
# “装饰只是一条线索” sentence is removed.  Keep those repairs beside the
# fallback helper so the catalogue upgrade and final build use identical
# prose without adding a new global template.
FALLBACK_TAIL_OVERRIDES: dict[tuple[str, int], str] = {
    ("A-008", 1): "镂孔与圈足的组合改变器身轻重，也让光线在孔壁间移动；用途仍应结合同址器物判断。",
    ("A-025", 1): "黑彩沿叶状单元铺开，器壁弧度决定纹带节奏；彩绘的社会含义不由单件器形独定。",
    ("A-025", 2): "敞口与浅腹先说明盛食尺度，叶状纹的象征方向仍需同组陶片与遗址报告互证。",
    ("A-054", 2): "长流、鋬与腹部比例构成注水动作的顺序，是否进入礼仪场景还要看二里头同组水器。",
    ("b-036", 2): "三足、盖与彩绘把器物置于礼器模型与炊食想象之间，征集记录不支持再指定原始场合。",
    ("b-058", 2): "双龙柄既便于提持，也把正面构图推向观看者；洛阳出土背景可核，具体陈设位置仍待组合资料。",
}

# A provenance-shaped sentence was left on a batch of records by an earlier
# contextual pass.  It reads as if every object had a documented ritual
# position, even when the label only says “征集”.  Replace it with evidence
# tied to the visible form and the recorded source rather than rotating one
# more template through the catalogue.
CONTEXT_SENTENCE_REPLACEMENTS: dict[str, str] = {
    "b-002": "长方形器身、盖与双耳把盛食器的尺度固定下来，蟠虺纹沿腹壁连续铺开；具体礼仪位置仍需同出鼎、豆合看。",
    "b-007": "带钩的弯钩、钮部与错金绿松石嵌饰都集中在扣合受力处，既是服饰构件也显出战国装饰工艺。",
    "b-011": "花瓣形联结件的孔位与鎏金边缘对应马具受力，保安山王后陵的组合使它与车马装备一同理解。",
    "b-020": "炉腹承香、凤形构件向上围合出烟气路径，嘉禾屯出土让熏香器的陈设和葬俗关系有了位置。",
    "b-026": "机括、悬刀和望山组成可动的发射结构，羽纹鎏金落在可见表面；新野来源之外不再推定使用者。",
    "b-033": "壶口、颈腹和执握构件层层收束，龙、虎、朱雀等四神沿器表分区铺陈；洛阳出土只提供汉墓语境的入口。",
    "b-034": "盖、双耳与三只熊足共同承担鼎体承托，黄釉在凸起处有磨蚀露胎；征集记录不支持补出原始墓位。",
    "b-036": "双耳、三足和盖构成仿鼎骨架，彩绘沿腹部展开；征集来源只能说明现藏路径，不能替它指定礼仪场合。",
    "b-041": "八系耳与莲瓣腹把固定、提持和环绕观看连在一起，青釉在器身转折处聚积；鹤壁出土提供北朝瓷业的地点坐标。",
    "b-044": "深腹与单环耳形成悬挂和提取的动作关系，器口与腹壁比例保留了盛食或煮食的容量线索。",
    "b-046": "细长筒腹和外撇口沿适合倾注，征集来源没有伴出器物，宴饮、盥洗或随葬位置仍不可定。",
    "b-058": "长颈瓶体两侧的龙形柄既供提持，也把观看面朝向正面；黄绿白褐低温釉交错留下唐三彩烧成线索。",
    "b-059": "扁囊形壶体模拟皮革缝合，管状口和鸡尾状构件分别承担倾注与装饰；征集记录不补写原始流传。",
    "b-061": "闭合环形器身与鸡首流共同组织提握、注水和回转观看，青釉施于起伏曲面；新乡出土信息到此为止。",
    "b-066": "蒜头口、长颈和鼓腹构成连续倾注路径，深色釉面上的浅斑随曲面变化；新野出土可与唐代器用并读。",
    "b-069": "高颈鼓腹与成对龙形附饰形成对称轮廓，黑釉在曲面上深浅相间；鹤壁出土把它放回地方窑业。",
    "b-071": "葵花形轮廓、中央钮与双鸾仙鹤衔绶围成镜背的同心秩序，镜面照容与吉祥图像在一件日用器上相遇。",
    "b-072": "中央镜钮和相向双鸾把衔绶纹组织成对称镜背，征集来源无法说明它原先是否随葬；镜面用途仍可由形制确认。",
    "b-096": "撇口细颈、下垂腹和圈足构成玉壶春瓶的纵向比例，褐彩龙纹顺腹部回转；鹤壁出土提供元代地方瓷业的坐标。",
    "b-097": "两端收束、腹中部饱满的橄榄形器身依靠曲面显出黑釉浓淡，器形本身就是主要观看线索。",
    "b-107": "撇口细颈、下垂腹和圈足把玉壶春瓶的比例拉长，青花云龙随腹部回转；周惠王墓出处使它进入明代藩王葬制。",
    "b-126": "大口深腹与双兽耳对应盛水、提持的动作，器身铭文把“孟滕姬”与楚国贵族盥洗语境连在一起。",
    "b-127": "大口深腹便于盛水，兽耳方便提持，蟠螭纹沿腹壁展开；和尚岭M9的墓葬组合决定它应与整套楚国水器合看。",
    "b-128": "复合动物形的背部与头部附加构件提示承托、插接或陈设可能，展签未清墓号，功能仍以结构和下寺报告为限。",
    "b-130": "筒形铜件套在钟杖端部，蟠虺纹沿表面展开；它的价值在于把击钟动作与楚墓礼乐组合连接起来。",
    "b-137": "仿古豆形的圈足和深腹承担陈设比例，黄釉地上粉彩云龙与光绪款共同呈现晚清官窑的复古趣味；征集来源不补出原始场合。",
}

CONTEXT_SENTENCE_SCAFFOLD = re.compile(
    r"的器形、[^。]{1,48}与出土组合互相补充，礼仪位置不能只从一处纹饰推出"
)

USAGE_SENTENCE_SCAFFOLD = re.compile(
    r"的用途要结合[^。]{1,120}与同组材料判断，先从[^。]{1,80}的器形和磨痕读起"
)

# Two older passes left provenance and surface sentences that read like a
# single batch caption.  They also put vessel-only terms on non-vessels such
# as the red-pottery silkworm pupa.  Keep the scan explicit so a rebuild cannot
# silently reintroduce either scaffold.
LOCATION_CALIBRATION_SCAFFOLD = re.compile(
    r"从[^。]{1,120}的记录看，[^。]{1,80}的地点与年代相互校准，日常使用的判断因此有了边界"
)
SURFACE_SCAFFOLD = re.compile(
    r"观察[^。]{1,100}时，[^。]{1,100}的表面光泽要和口沿、圈足的转折放在一起，[^。]{1,120}只呈现其中一面"
)

# The ceramic provenance sentence came from an early coverage pass.  It was
# factually harmless in isolation, but its fixed shape appeared on dozens of
# unrelated cards.  Replace it with a sentence that names the recorded site
# and the particular archaeological question of each object.
PROVENANCE_CERAMIC_SCAFFOLD = re.compile(
    r"[^。！？]{0,100}的出土信息把[^。！？]{1,120}放回具体年代，[^。！？]{1,120}的器形与烧成线索仍需结合展签阅读"
)

CERAMIC_PROVENANCE_REPLACEMENTS: dict[str, str] = {
    "A-003": "河南汤阴白营遗址的出土背景，让这件镂孔灰陶盘回到中原龙山文化的陶器序列。",
    "A-006": "下王岗遗址的出土记录，为陶鼎的龙山文化年代提供了可核坐标。",
    "A-007": "谷水河遗址把弦纹陶鼎置于龙山文化的炊煮器背景，具体层位仍以发掘资料为准。",
    "A-008": "小芝田遗址的出土关系，使镂孔觚形陶器的中原龙山文化背景有迹可循。",
    "A-010": "郑州西郊的出土信息说明灰陶鬶属于龙山文化，具体使用仍由器形与同组材料限定。",
    "A-012": "小芝田遗址让编织纹双耳灰陶簋与龙山文化的盛食器组合相连。",
    "A-013": "汝州出土记录为双耳箅流灰陶壶留下龙山文化的地点线索，未见层位不另补写。",
    "A-019": "西山遗址与仰韶年代可以相互核对，陶鼎的具体出土层位仍以考古报告为准。",
    "A-020": "黄楝树遗址的出土背景把镂孔高足红陶豆放回屈家岭文化的盛食器序列。",
    "A-021": "同一遗址记录也为镂孔灰陶豆保留了屈家岭文化的地点与年代背景。",
    "A-022": "段寨遗址的出土材料，让镂孔高圈足陶豆进入大汶口文化的盛食器讨论。",
    "A-024": "茅草寺的采集记录只提供鱼纹彩陶壶的地点线索，完整层位关系仍不可复原。",
    "A-025": "河南郑州的出土信息为叶状纹彩陶钵划出仰韶文化坐标，具体组合还需补证。",
    "A-027": "汝州记录只确认X纹彩陶罐的仰韶文化背景，具体地点仍待展签与报告核定。",
    "A-029": "大河村遗址的出土关系把彩陶双连壶放回仰韶聚落的饮食器物组合。",
    "A-030": "庙底沟遗址的出土背景，为花瓣纹彩陶钵留下仰韶文化的时间位置。",
    "A-033": "裴李岗遗址让乳钉纹红陶鼎进入早期聚落炊器的观察范围。",
    "A-036": "裴李岗遗址的记录，把红陶勺放回裴李岗文化的取食器序列。",
    "A-037": "石固遗址的出土信息，为红陶小口双耳壶保留了裴李岗文化的地点坐标。",
    "A-046": "南寨遗址的出土关系，把黑陶壶形盉置于夏代水器的考古背景。",
    "A-047": "同一遗址记录也为白陶爵保留了夏代饮器的地点与年代线索。",
    "A-048": "南寨遗址让白陶封口盉的夏代背景可由出土记录核对。",
    "A-049": "稍柴遗址的材料，为陶豆进入夏代聚落盛食器序列留下了依据。",
    "A-050": "稍柴遗址的出土背景，也把绳纹扁足灰陶鼎置于夏代炊器观察中。",
    "A-053": "二里头遗址的出土记录，为灰陶大口尊保留了夏代器用的地点坐标。",
    "A-054": "二里头遗址让弦纹灰陶盉回到夏代水器的考古语境，具体组合仍需对读。",
    "A-067": "郑州人民公园的出土信息把原始瓷尊放回商代早期的地方器用背景。",
    "A-090": "北窑西周冶铜遗址的材料，让泥质簋范与铸铜生产现场直接相连。",
    "A-091": "北窑西周墓地的出土背景，为原始瓷簋保留了西周盛食器的地点线索。",
    "b-030": "新密出土记录把陶廪放回汉代墓葬明器的仓储想象，原始位置仍待报告核对。",
    "b-032": "金谷园汉墓的出土关系，使带题记陶仓与汉代仓储模型的语境相连。",
    "b-038": "项城出土信息为绿釉立姿陶狗保留了汉代随葬动物俑的地点背景。",
    "b-040": "孟州出土记录让青釉方格纹洗进入西晋日用瓷器的地方脉络。",
    "b-052": "张盛墓的出土位置，把白陶帐座与隋代墓葬中的帷帐模型联系起来。",
    "b-056": "南郊唐墓的组合背景，为三彩骆驼及牵驼胡俑留下运输场景的年代坐标。",
    "b-063": "黄冶窑址的出土记录，让黑釉陶三足炉与唐代窑业现场相互照见。",
    "b-064": "黄冶窑址也为淡黄釉绞胎枕保留了唐代绞胎工艺的窑址背景。",
    "b-087": "赵西村采集记录只提供钧窑天蓝釉荷叶花口瓷瓶的年代与地点线索，层位不作补推。",
    "b-088": "钧台窑址的出土背景，把玫瑰紫六方瓷花盆放回宋代钧窑生产现场。",
    "b-090": "石固镇的出土信息，为钧窑月白釉花瓣瓷碗留下金代地点坐标。",
    "b-091": "拐河菜园窖藏的出土关系，把钧窑玫瑰紫葵花瓷盘置于宋代窖藏语境。",
    "b-092": "李固村出土记录只确认酱釉黑彩虎形瓷枕的金代背景，器形与烧成仍按近照核对。",
    "b-094": "张公巷窑址的出土材料，让青釉盘口瓷瓶进入北宋窑业的现场脉络。",
    "b-098": "修武出土记录为当阳峪窑绞胎瓷碗留下宋代地方窑业的地点线索。",
    "b-099": "焦作出土背景把当阳峪窑白釉红绿彩缠枝花卉纹罐放回金代彩绘瓷的地方生产中。",
    "b-100": "洛阳出土记录，让定窑白釉镂雕八角兽首瓷洗与宋代定窑器用背景相连。",
    "b-101": "镇平出土信息为白地黑花瓷梅瓶留下宋代磁州窑系的地点线索。",
    "b-104": "上蔡城关的出土背景，把三彩荷叶童子枕放回宋代陶瓷枕的地方脉络。",
    "b-108": "开封出土记录让白地黑花“内酒”瓷瓶的明代文字瓷器背景有迹可循。",
    "b-110": "河南博物院的收藏记录只确认青花无双谱人物诗文瓷瓶的时代与器形，原始地点不另补。",
    "b-111": "现藏记录为仿哥釉铁锈花狮耳盘口瓷瓶保留清代器形与釉色信息，流传路径仍未知。",
}

# Record-specific repairs for the two scaffolds above.  They retain the
# source boundary while replacing the repeated sentence with an observation
# that belongs to the object in that card.
TARGETED_SENTENCE_REPAIRS: dict[str, dict[str, str]] = {
    "A-005": {
        "从河南巩义小芝田遗址出土的记录看，白陶鬶的地点与年代相互校准，日常使用的判断因此有了边界。": "小芝田遗址的出土背景，让白陶鬶回到中原龙山文化的炊煮器序列。",
        "观察白陶鬶时，白陶水器／温器的表面光泽要和口沿、圈足的转折放在一起，河南巩义小芝田遗址只呈现其中一面。": "白陶鬶的细胎、长流与足部转折共同说明成型难度，侧面照片比表面反光更有辨识力。",
    },
    "A-009": {
        "从河南淅川下王岗遗址出土的记录看，黑陶澄滤器的地点与年代相互校准，日常使用的判断因此有了边界。": "下王岗遗址的同批材料，是判断黑陶澄滤器是否参与液体过滤的重要参照。",
    },
    "A-011": {
        "从征集，原始出土地点未见于本组展签的记录看，灰陶斝的地点与年代相互校准，日常使用的判断因此有了边界。": "征集记录没有保留灰陶斝的原始地点，这里只把它放在中原龙山文化的时间框架内。",
        "征集记录留下的是灰陶斝的地点坐标，灰陶斝的纹饰意义仍要让位于器形与同组材料。": "征集记录只留下灰陶斝入藏这一层信息，袋足、口沿和鋬的结构仍可用于讨论温热液体的操作。",
    },
    "A-016": {
        "从河南出土，具体遗址在照片中未辨清的记录看，陶釜、陶灶的地点与年代相互校准，日常使用的判断因此有了边界。": "现有材料只确认陶釜、陶灶在河南出土并属仰韶文化，具体遗址仍留作待考。",
    },
    "A-017": {
        "从河南郑州西山遗址出土，河南省文物考古研究院藏的记录看，陶钵的地点与年代相互校准，日常使用的判断因此有了边界。": "西山遗址与现藏机构信息可以核对陶钵的来源，具体层位不由展柜照片补写。",
        "把陶钵放回其记录的遗址与年代，陶胎细部才能和聚落生活的尺度相互照应。": "陶钵的敞口、浅腹和厚薄关系，保留了仰韶聚落日常取食的器形线索。",
    },
    "A-023": {
        "从河南郸城段寨遗址出土的记录看，白陶鬶的地点与年代相互校准，日常使用的判断因此有了边界。": "段寨遗址的出土背景，让这件白陶鬶进入大汶口文化的炊煮器序列。",
        "观察白陶鬶时，白陶水器／温器的表面光泽要和口沿、圈足的转折放在一起，河南郸城段寨遗址只呈现其中一面。": "段寨白陶鬶的浅色胎体、长流、鋬与足显示复杂接合，近照应从结构而非反光读。",
    },
    "A-031": {
        "从河南淅川下王岗遗址出土的记录看，红陶蚕蛹的地点与年代相互校准，日常使用的判断因此有了边界。": "下王岗的出土记录只说明红陶蚕蛹进入仰韶文化遗址材料，陶塑的具体用途仍需谨慎。",
        "观察红陶蚕蛹时，红陶塑形物的表面光泽要和口沿、圈足的转折放在一起，1972年河南淅川下王岗遗址只呈现其中一面。": "红陶蚕蛹没有口沿或圈足，分节、收尖与塑形痕迹才是判断制作的关键。",
    },
    "A-034": {
        "从河南郑州后庄王遗址出土的记录看，红陶尖底缸的地点与年代相互校准，日常使用的判断因此有了边界。": "后庄王遗址的出土关系，把红陶尖底缸放回仰韶时期的储水或炊用讨论。",
        "观察红陶尖底缸时，红陶缸的表面光泽要和口沿、圈足的转折放在一起，1958年河南郑州后庄王遗址只呈现其中一面。": "尖底器底与鼓腹决定红陶尖底缸的放置方式，正面和侧面应先看轮廓，再谈受火痕迹。",
    },
    "A-038": {
        "从河南新郑裴李岗遗址出土的记录看，红陶圈足碗的地点与年代相互校准，日常使用的判断因此有了边界。": "裴李岗遗址的出土背景，提示圈足碗属于早期聚落的盛食器序列。",
    },
    "A-039": {
        "从河南新郑裴李岗遗址出土的记录看，红陶三足钵的地点与年代相互校准，日常使用的判断因此有了边界。": "裴李岗遗址把三足钵放回早期聚落的盛食与加热器物组合。",
    },
    "A-044": {
        "从河南巩义稍柴遗址出土的记录看，堆绳纹灰陶瓮的地点与年代相互校准，日常使用的判断因此有了边界。": "稍柴遗址的出土记录，为堆绳纹灰陶瓮的盛水与储藏可能保留了夏代聚落背景。",
        "观察堆绳纹灰陶瓮时，灰陶水器的表面光泽要和口沿、圈足的转折放在一起，河南巩义稍柴遗址只呈现其中一面。": "堆绳纹沿灰陶瓮外壁起伏，粗粝胎面和大口深腹共同留下搬持、储水的线索。",
    },
    "A-048": {
        "把白陶封口盉放回其记录的遗址与年代，陶胎细部才能和聚落生活的尺度相互照应。": "南寨遗址的出土背景，让白陶封口盉进入夏代专门水器的观察范围。",
        "看白陶封口盉的三足、鋬或圈足，白陶盉／封口水器的受力与烧成痕迹各有位置，展柜照片先保留这些可见证据。": "封口、腹部与足部的连接决定白陶封口盉如何注入和倾出，细胎烧成的均匀程度仍以近照为准。",
    },
    "A-051": {
        "从河南禹州瓦店遗址出土的记录看，磨光黑陶觚的地点与年代相互校准，日常使用的判断因此有了边界。": "瓦店遗址让磨光黑陶觚进入夏代礼仪饮器的讨论，但陶质与青铜器不能直接等同。",
    },
    "A-068": {
        "从河南郑州二里岗出土的记录看，绳纹陶斝的地点与年代相互校准，日常使用的判断因此有了边界。": "二里岗的出土记录，把绳纹陶斝置于郑州早商温酒器序列；具体使用仍要看同组材料。",
    },
    "A-074": {
        "从疑为1988年河南偃师商城遗址出土的记录看，灰陶瓮的地点与年代相互校准，日常使用的判断因此有了边界。": "现有记录只把灰陶瓮暂系1988年偃师商城遗址，具体出土位置仍待发掘资料确认。",
    },
    "b-031": {
        "观察陶囷时，陶质仓储明器的表面光泽要和口沿、圈足的转折放在一起，南阳市只呈现其中一面。": "陶囷是缩小的仓储模型，封闭仓体、取粮口和底部承托比表面反光更关键。",
    },
    "b-086": {
        "观察汝窑天蓝釉刻花鹅颈瓷瓶时，汝窑青瓷的表面光泽要和口沿、圈足的转折放在一起，1987年宝丰县清凉寺窑址只呈现其中一面。": "汝窑鹅颈瓶的天蓝釉随S形器壁起伏，圈足的香灰胎与垫烧痕迹可由侧面和底部照核对。",
    },
    "b-132": {
        "观察黄釉蓝彩九桃纹瓷盘时，釉上彩瓷器的表面光泽要和口沿、圈足的转折放在一起，征集记录只呈现其中一面。": "浅腹、圈足和九桃彩绘共同展开盘面，近照可见蓝彩叠色与釉面光泽。",
    },
    "b-142": {
        "观察白釉绿彩二龙戏珠纹瓷盘时，釉上彩瓷器的表面光泽要和口沿、圈足的转折放在一起，征集记录只呈现其中一面。": "白釉盘的浅腹和圈足先决定端持尺度，绿彩二龙戏珠纹再沿盘面铺开；征集记录不补原始场合。",
    },
    "b-144": {
        "观察五彩云龙纹瓷炉时，五彩瓷香炉的表面光泽要和口沿、圈足的转折放在一起，征集记录只呈现其中一面。": "五彩瓷炉的敞口、炉腹和承足决定承香与陈设方向，云龙彩绘的层次从正面和侧面合看。",
    },
}


def fallback_copy_tail(record: dict[str, Any], paragraph_index: int) -> str:
    """Supply a short, object-aware sentence after an obsolete tail is removed.

    The catalogue gate requires three substantial paragraphs.  This fallback
    is intentionally varied and tied to what a field photograph can show;
    it is used only when a cleanup leaves a paragraph unusually short.
    """
    record_id = compact(record.get("id"))
    override = FALLBACK_TAIL_OVERRIDES.get((record_id, paragraph_index))
    if override:
        return override
    title = compact(record.get("name_zh") or record.get("title") or record.get("name")) or "这件器物"
    material = compact(record.get("material_or_type") or record.get("material") or record.get("categoryLabel"))
    joined = f"{title} {material}"
    plain_pottery = "陶" in joined and not re.search(r"釉|瓷|珐琅", joined)
    if plain_pottery:
        variants = (
            f"从{title}的开口、腹深和底部受力看，器形先决定可承受的动作，具体用途仍要等同组材料补足。",
            f"把{title}的正面与侧面放在一起，陶胎厚薄、口沿收束和足部转折才有可比尺度。",
            f"照片能确认{title}的陶胎轮廓与表面痕迹，未见的尺寸和残留不据此补写。",
            f"{title}的局部磨痕与整体比例互相照应，仍不足以单独指定使用场合。",
            f"沿着{title}的器壁和底部观察，泥胎成型与受火痕迹各有位置，解释止于可见证据。",
            f"{title}的纹样或压印依附陶胎展开，图案提供观看入口，不能替代来源与组合记录。",
            f"器壁弧度、口沿处理与底部支撑共同说明{title}的制作方式，功能判断保留余地。",
            f"把{title}放回其记录的遗址与年代，陶胎细部才能和聚落生活的尺度相互照应。",
        )
    elif re.search(r"釉|瓷|珐琅", joined):
        variants = (
            f"从{title}的器壁曲线、底足和表面层次看，材质与成型步骤互相印证，缺失部分不补写。",
            f"把{title}的正面、侧面和底部合看，胎体厚薄与釉面起伏才不会被一处反光带偏。",
            f"照片能确认{title}的器形和表面处理，窑口、尺寸等未见信息仍以馆方记录为界。",
            f"{title}的局部光泽与整体比例互相照应，具体使用场合还要回到同组器物。",
            f"沿着{title}的口沿、肩部和足部观察，成型收束与施釉范围各有痕迹。",
            f"{title}的纹样依附器壁展开，装饰与器形共同构成观看线索，不能单独推出身份。",
            f"器壁曲线、底足承托和表面处理共同说明{title}的制作次序，结论留在照片可支持的范围。",
            f"把{title}放回现有来源记录，釉面细部才有时间与用途的参照尺度。",
        )
    else:
        variants = (
            f"{title}的轮廓、材质和局部痕迹相互校验，来源之外的解释暂不延伸。",
            f"把{title}的正面、侧面与背面合看，制作和保存留下的差异才不会被单一角度遮住。",
            f"照片能确认{title}的结构与表面，未见的尺寸、重量或原始位置仍保持为未知。",
            f"{title}的细部与整体比例彼此照应，具体功能要等同组材料补足。",
            f"沿着{title}的边缘、接缝和转折观察，制作动作落在可复核的部位。",
            f"{title}的图像或文字提供观察入口，社会含义仍需与来源记录共同判断。",
            f"器形、材质和保存状态共同说明{title}能够支持的判断，缺环不以想象补齐。",
            f"把{title}放回河南博物院的收藏语境，现有照片与展签各自留下证据。",
        )
    key = f"{record.get('id', '')}|{title}|fallback-{paragraph_index}"
    index = sum(ord(char) for char in key) % len(variants)
    return variants[index]

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
        "盘常用于盥洗承水，也能进入祭祀、宴飨等礼仪程序。白家庄铜器让郑州商城贵族用器的类别与装饰更加具体。具体礼仪环节仍需结合同时出土的盉、匜等器物判断。",
    ],
    "A-102": [
        "1981年，鱼龙纹铜盘出土于河南南阳市郊砖瓦厂，属于西周。鱼龙纹铜盘的出土地点可定位在1981年河南南阳市郊砖瓦厂，青铜水器的器形与西周由此互相校准。",
        "浅盘内外以鱼龙纹组织水面可见图案，宽沿与腹部适合承接盥洗用水。在1981年河南南阳市郊砖瓦厂的记录里，鱼龙纹铜盘的范线、接缝与青铜水器纹饰分区要一起对读，西周的制作次序只能从这些部位逐层追问。",
        "盘通常与匜、盉等注水器配合，参与盥洗和礼仪洁净。同出铭文簋为这件盘提供了南阳西周贵族器用的区域背景。具体使用环节仍需回到南阳地区同组器物与出土报告。",
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
    "b-120": [
        "展签记录，《京汉工人流血记》为1923年印刷文献，现藏河南博物院。小册子记录京汉铁路总工会筹备、罢工与镇压经过，收录宣言、通电和报道，文献身份先由出版信息与内容范围来确定。",
        "这本小册子由北京《工人周刊》社出版，纸面上的标题、分栏和连续文字承担叙事与传播功能。栏线、字级与纸张状态共同说明它怎样面向读者传递事件。",
        "《京汉工人流血记》保存了二七大罢工相关的一手传播材料，为研究早期工人运动、铁路工会组织和近代政治宣传提供文献依据。它的历史价值在文字内容与传播现场，具体流传路径仍以馆藏记录为界。",
    ],
    "b-119": [
        "展签记录，《廖仲恺先生》宣传品属于民国时期，现藏河南博物院。印刷品以廖仲恺遇刺和国民革命为主题，保存了近代政治传播的现场。",
        "版面以标题、图像与连续文字组织阅读，纸张、墨色和印刷边缘显示其作为宣传品的制作方式。现有展签没有说明具体印刷工艺和发行数量，能够确认的先到纸面与内容。",
        "《廖仲恺先生》宣传品保存了近代政治宣传的语言、图像与传播对象，可与二十世纪初的报刊和革命史料互证；原始流传路径仍以馆藏记录为界。",
    ],
    "b-113": [
        "展签将户部官票定为清咸丰五年（1855），来源记作征集。纸钞的来源只记作征集，原始地点尚不清楚；票面格式先按现有展签和照片记录。",
        "纸面以票名、朱印和版框建立面额与发行者的识别秩序，填写栏位与纸张磨损又留下进入流通的线索。票面尺寸和保存状态需要结合近照阅读。",
        "户部官票以户部名义和朱印确认价值，填写项目把一次发行落实到具体票面；咸丰财政紧张背景使它成为纸币制度扩张的实物材料。",
    ],
    "b-115": [
        "展签记录，满文“天命汗钱”铜钱（2枚）属于明万历四十四年（1616），来源为征集。两枚铜钱以满文钱名和铸造格式标示政权建立后的货币身份，原始流传路径未见记录。",
        "钱面铸有满文“天命汗钱”，方孔圆钱的轮廓、穿孔边缘和文字布局共同构成识别信息。铜质、铸文和磨损可从近照观察，具体铸造地点没有展签说明。",
        "这组钱币把后金政权早期的文字选择、纪年与货币发行放在同一件日用物上；作为征集品，不能据现有记录补出最初使用者。",
    ],
    "b-005": [
        "展签将错银嵌绿松石云纹铜方豆定为战国（前475—前221），来源记作1935年汲县山彪镇出土。错银嵌绿松石云纹铜方豆属于青铜盛食器；盛食和烹饪器在祭祀、宴飨中按类别与数量组合，器主铭和墓葬等级决定其礼制含义。",
        "器物本身，器表凹槽分别嵌入银和绿松石，方形豆用于盛放食物；嵌错材料与云纹构成清晰的色彩对比。高柄、盘部与足座的比例把食物托至观看高度，局部照片可见嵌饰边缘的修整。",
        "豆以高柄托举食物，使祭品在席间清楚可见；银与绿松石的色差强调云纹，也把器表的装饰等级落实在观看面。山彪镇出土与同组器物合看，才能讨论它的礼仪位置。",
    ],
    "b-008": [
        "展签记录，坐人铜灯属于战国（前475—前221），来源为1975年三门峡市上村岭出土。坐人、灯架和三烛座的分铆结构说明它是一件可实际照明的复合器具，人物姿态同时承担承托作用。",
        "器物本身，坐人、灯架和灯盘分铸后铆接，坐人双手托举丫形灯架，盘内设三个烛座；人物双手、灯架节点与烛座高度把照明动作写进结构。",
        "坐人铜灯承托烛火提供室内照明，分铆结构也说明战国灯具已把人物造型纳入机械构成。上村岭出土为战国灯具提供地点坐标，具体陈设位置仍要结合墓葬组合。",
    ],
    "b-026": [
        "展签记录，鎏金羽纹铜弩机属于东汉（25—220），来源为新野县出土。机括、悬刀和望山组成可动的发射结构，羽纹鎏金落在可见表面；新野来源之外不再推定使用者。",
        "器物照片可见，鎏金羽纹铜弩机呈机括、悬刀和望山等可动结构，羽状纹上残留鎏金层，成排羽状纹。机括的转轴、悬刀与弩臂接合处共同说明它如何控制发射，鎏金只按可见残留记录。",
        "鎏金羽纹铜弩机装入弩臂控制发射，机括精度和鎏金装饰同时涉及兵器技术与使用者等级。新野县来源给出地点线索，弩机与墓葬组合的具体关系仍须查对完整报告。",
    ],
    "b-044": [
        "展签记录，单环耳铜鍪属于西汉（前206—25），来源为三门峡市上村岭出土。深腹与单环耳形成悬挂和提取的动作关系，器口与腹壁比例保留了盛食或煮食的容量线索。",
        "器物照片可见，单环耳铜鍪呈深腹容器配单环耳。环耳与腹壁的连接处承受提取时的力量，深腹和口沿收束则限定了盛放或加热的空间。",
        "鍪的深腹可煮食或盛食，单环耳方便悬挂和提取；上村岭出土把这种带有北方器形因素的铜器放进汉代中原交流背景。具体使用环节仍需与同组器物和出土报告对读。",
    ],
    "b-117": [
        "展签将独山玉李占鳌私印（4件）定为清代（1644—1911），来源记作征集。四方印均以独山玉雕成，征集记录没有留下原始地点；印面文字和印钮形制先按照片与展签核对。",
        "器物本身，四方印均以南阳独山玉雕刻，印面分别用于姓名、书斋或自警文字；印蜕展示了篆刻效果。印面布局、印钮形制和篆刻刀痕是可见的制作线索，玉材的色泽与磨痕应从多角度照片比看。",
        "私印用于书画、书信或收藏钤记，四方印把姓名、斋号和自警语分开使用；独山玉材质又将南阳地方资源带入文人篆刻。征集来源无法说明最初持有人，具体流传路径留在未知。",
    ],
    "A-009": [
        "1971年，黑陶澄滤器出土于河南淅川下王岗遗址，属于中原龙山文化。下王岗遗址的同批材料，是判断黑陶澄滤器是否参与液体过滤的重要参照。",
        "器壁设有成排小孔，黑色表面来自烧成气氛与后期处理，孔洞才是决定用途的关键结构。孔列的密度与器壁弧度共同说明澄滤时液体如何通过，磨痕和残留仍需实物检测。",
        "它可用于把液体与固体残渣分开，所处理的具体食物或饮品仍需残留物分析。一件看似朴素的陶器，保存了史前人群对加工流程的细致分工。",
    ],
    "A-027": [
        "X纹彩陶罐出土于河南汝州，属于仰韶文化；更具体的地点尚待核定。汝州记录只确认X纹彩陶罐的仰韶文化背景，具体地点仍待展签与报告核定。",
        "交叉线条构成连续X形带，围绕罐腹建立清晰分区。X纹彩陶罐的纹样或压印依附陶胎展开，图案提供观看入口，不能替代来源与组合记录。",
        "罐用于盛储，肩腹部的彩绘处在最易被观看的位置。简单线条通过重复和转折形成稳定的器物识别；汝州出土地点尚未辨清，具体组合不补写。",
    ],
    "A-051": [
        "磨光黑陶觚出土于河南禹州瓦店遗址，属于夏代。瓦店遗址的出土背景，把磨光黑陶觚置于夏代陶质礼器的讨论范围；具体使用仍需同组材料佐证。",
        "器表磨光，口部外张、腰部收束，纵向比例比容量更引人注目。外张口部和收束腰线把觚形的观看方向固定下来，磨光留下的反光与刮痕还需从侧面照片核对。",
        "觚形器可能用于饮酒或仪式陈设，陶质器与后世青铜觚之间不能简单等同。瓦店材料为观察夏时期礼仪饮器的形成提供了重要参照。",
    ],
    "A-090": [
        "泥质簋范出土于河南洛阳北窑西周冶铜遗址，属于西周。范内留下簋的局部轮廓，它把成品青铜器的形制追溯到冶铜作坊，范片也记录了作坊的技术选择。",
        "泥范内表预制簋的局部形状与纹饰，合范后才形成青铜器外壁。范面分片、接口和残留泥胎比三足或鋬的容器术语更关键，它们提示制范、合范与脱范的先后。",
        "它是生产工具而非礼器成品，使用后往往破碎丢弃。冶铜遗址中的器范把西周青铜器研究从成品推回作坊、工序与工匠组织。",
    ],
    "b-035": [
        "展签记录，绘彩云气纹陶盒属于汉代（前206—220），来源为征集。圆盒与盖合的形制先按现有照片记录，征集信息没有留下原始地点或组合。",
        "器物照片可见，圆形盒体和相合的盖，器表以红、白等彩绘出连续云气，彩层已有局部脱落。盒盖合口、圆形轮廓与云气彩层的起伏共同说明成型和施彩次序，未见的胎质不作补写。",
        "绘彩云气纹陶盒用盖与盒体收纳小件物品，云气彩绘又把日常容器转化为墓中理想化陈设。来源仅为征集，原始使用者与墓葬位置仍保持为未知。",
    ],
    "b-039": [
        "展签记录，青釉刻花六系罐属于北齐武平七年（576），1958年濮阳市李云墓出土。把青釉刻花六系罐放回同类材料中，材质与结构才有解释力；纹样本身不足以指定使用者。",
        "近照把细部拍得较清楚，青釉刻花六系罐呈鼓腹罐肩上分布六个系耳，青釉覆盖胎体并在转折处积釉。口沿、肩部和六系连接处的受力关系，与李云墓的照片记录可以逐项复核。",
        "罐肩六系可用于系绳、加固封盖或搬运，深腹适合贮藏；李云墓的明确纪年使它能作为北齐青瓷器形和墓葬消费的参照。六系分布与深腹容量共同限定用途，具体组合仍以墓葬资料为准。",
    ],
    "b-066": [
        "展签记录，花釉蒜头瓷壶属于唐代（618—907），来源为1973年新野县出土。蒜头口、长颈和鼓腹构成连续倾注路径，深色釉面上的浅斑随曲面变化；新野出土可与唐代器用并读。",
        "器物照片可见，花釉蒜头瓷壶呈蒜头口、长颈和鼓腹，深色釉面上散布浅色斑点。顺着花釉蒜头瓷壶的口沿和足部看，花釉瓷器的施釉范围与成型步骤各有痕迹，照片不替缺失部分下结论。",
        "蒜头口限制液体外溢，长颈便于握持和倾注；花釉斑点让同一实用壶在转动中呈现不规则色彩。新野出土提供地点线索，具体使用仍需与同组器物对读。",
    ],
    "b-092": [
        "展签记录，酱釉黑彩虎形瓷枕属于金代（1115—1234），来源为1968年修武县李固村出土。李固村出土记录只确认酱釉黑彩虎形瓷枕的金代背景，器形与烧成仍按近照核对。",
        "器物本身，枕体塑成伏虎，枕面绘黑彩景物，酱釉覆盖虎身；它兼具寝具和吉祥动物造型。虎背曲线、枕面承托区与底部支撑共同说明睡卧动作，釉色只按照片可见范围记录。",
        "虎背承担枕面功能，动物造型同时寄托镇护意味；修武出土使金代寝具图像能够进入地方日常生活和葬俗的双重讨论。虎形与枕面结构先说明使用方向，具体随葬组合仍需报告。",
    ],
    "b-097": [
        "展签将黑釉橄榄瓷尊定为元代（1271—1368），来源记作鹤壁市出土。两端收束、腹中部饱满的橄榄形器身依靠曲面显出黑釉浓淡，器形本身就是主要观看线索。",
        "器形照片可见，黑釉橄榄瓷尊呈两端收束、腹中部饱满的橄榄形器身，黑釉覆盖器身并显出局部露胎。顺着黑釉橄榄瓷尊的口沿和足部看，瓷器的施釉范围与成型步骤各有痕迹，照片不替缺失部分下结论。",
        "橄榄形尊两端收束、腹部扩张，适合盛装和陈设；黑釉在曲面上的浓淡变化使器形本身成为主要装饰。鹤壁出土提供地点线索，容量与陈设位置仍要结合同组材料判断。",
    ],
    "b-099": [
        "展签记录，当阳峪窑白釉红绿彩缠枝花卉纹罐属于金代（1115—1234），来源为1973年焦作市出土。焦作出土背景把当阳峪窑白釉红绿彩缠枝花卉纹罐放回金代彩绘瓷的地方生产中。",
        "近照把细部拍得较清楚，当阳峪窑白釉红绿彩缠枝花卉纹罐呈短颈鼓腹罐身与连续花卉带，白釉使器形轮廓和附饰更清楚。转到侧面看，罐体厚薄、口沿收束与花卉带的关系才完整，正面负责呈现纹样布局。",
        "罐用于贮藏，白釉上的红绿彩花卉适合近距离陈设观看；焦作出土可说明金代当阳峪窑彩绘产品在本地的使用。短颈与鼓腹先限定贮藏动作，具体陈设位置仍待同组器物说明。",
    ],
    "b-101": [
        "展签记录，白地黑花瓷梅瓶属于宋代（960—1279），来源为1985年镇平县出土。镇平出土信息为白地黑花瓷梅瓶留下宋代磁州窑系的地点线索。",
        "器形照片可见，白地黑花瓷梅瓶呈小口短颈、丰肩和下收腹，白色化妆土上绘黑彩。小口、丰肩与腹部收束形成贮酒所需的容积关系，化妆土和黑彩的边缘可从侧面近照复核。",
        "梅瓶小口丰肩，适于贮酒并减少挥发，黑彩装饰集中在宽阔肩腹；镇平出土使宋代白地黑花器的地区使用可被定位。小口与丰肩的组合说明使用方向，具体场合仍需同组材料。",
    ],
    "b-134": [
        "展签记录，粉彩云蝠纹瓷盘属于清代（1644—1911），来源为征集。粉彩云蝠纹瓷盘的来源只记作征集，原始地点尚不清楚；粉彩瓷器的胎釉和器形以展签为界。",
        "器物照片可见，粉彩云蝠纹瓷盘呈浅腹圆盘和圈足，粉彩以柔和层次描画纹样，云纹与蝙蝠纹。盘沿、浅腹和圈足的比例把观看面展开，粉彩的叠色与局部光泽则保留在近照里。",
        "蝙蝠与云气把“福”意铺满盘面，适合节庆宴席或陈设；器物为征集品，吉祥含义可以辨认，原使用者却无法确认。浅腹盘形只说明盛物或陈设的可能，具体组合不由征集记录补写。",
    ],
    "b-140": [
        "展签记录，霁蓝釉瓷盘属于清康熙（1662—1722），来源为征集。霁蓝釉瓷盘的来源只记作征集，原始地点尚不清楚；蓝釉瓷器的胎釉和器形以展签为界。",
        "器物照片可见，霁蓝釉瓷盘呈浅腹圆盘和圈足。从霁蓝釉瓷盘的口沿到底部，蓝釉瓷器的表面状态各有变化，展柜照片保留了可见的那一段；征集现场的光线也让边缘与局部质地可以互相校验。",
        "霁蓝釉把装饰集中到均匀色面，盘形可用于供器、盛物或陈设；缺少出土和使用记录时，不能仅凭蓝釉断定礼仪等级。浅腹与圈足先限定器物动作，原始使用场合留作未决问题。",
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
        text = strip_generated_scaffolds(
            strip_context_template_sentences(strip_photo_inventory_sentences(text)), record
        )
        if len(text) < 55:
            text = compact(f"{text} {fallback_copy_tail(record, index)}")
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
    normalized_sentence_groups: dict[str, set[str]] = {}
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
            # Keep the broader editorial-skeleton guard alongside the photo
            # inventory check.  Provenance/date sentences are facts and are
            # deliberately excluded; non-factual copy should not collapse to
            # one sentence after object names and materials are substituted.
            for sentence in re.split(r"(?<=[。！？；])", text):
                sentence = sentence.strip()
                factual = re.search(r"(出土于|出土|征集|现藏|属于[^，。]{0,16}(文化|代|时期)|\d{4}年)", sentence)
                # Provenance and date clauses are factual and normally stay
                # out of the style-skeleton count.  A batch caption can hide
                # behind the same words, though, so keep a sentence that
                # matches the retired context formula in the scan.  This
                # prevents “出土组合” from acting as a blanket skip.
                if factual and not (
                    CONTEXT_SENTENCE_SCAFFOLD.search(sentence)
                    or PROVENANCE_CERAMIC_SCAFFOLD.search(sentence)
                    or LOCATION_CALIBRATION_SCAFFOLD.search(sentence)
                    or SURFACE_SCAFFOLD.search(sentence)
                    or USAGE_SENTENCE_SCAFFOLD.search(sentence)
                ):
                    continue
                normalized = re.sub(re.escape(title), "<TITLE>", sentence) if title else sentence
                normalized = re.sub(r"\d+张", "<N>张", normalized)
                normalized = re.sub(r"\d+个(?:观看角度)?", "<N>", normalized)
                for field in (
                    compact(group.get("provenance")),
                    copy_source_phrase(group),
                    compact(group.get("material")),
                ):
                    if field:
                        normalized = normalized.replace(field, "<FIELD>")
                normalized = re.sub(r"\s+", "", normalized)
                if len(normalized) >= 24:
                    normalized_sentence_groups.setdefault(normalized, set()).add(group["id"])
            # Photo counts and label pairing belong in the gallery UI.  Flag
            # any inventory sentence that combines a count, photo wording, and
            # a label or role/detail reference; factual excavation prose without
            # that trio is
            # intentionally left alone.
            for sentence in re.split(r"(?<=[。！？；])", text):
                sentence = sentence.strip()
                if not (
                    PHOTO_COUNT_MARKER.search(sentence)
                    and PHOTO_WORD_MARKER.search(sentence)
                    and (LABEL_WORD_MARKER.search(sentence) or PHOTO_DETAIL_MARKER.search(sentence))
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
        for sentence, ids in normalized_sentence_groups.items()
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
