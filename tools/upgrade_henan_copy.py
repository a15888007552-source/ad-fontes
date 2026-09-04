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

from build_henan_field_archive import (
    COPY_REPAIRS,
    fallback_copy_tail,
    strip_context_template_sentences,
    strip_photo_inventory_sentences,
)


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

# The first contextual pass left two stock sentences in a small set of
# records.  They are especially distracting when the object is not a vessel
# (for example, a pottery dog or a model of a tent support).  Keep these
# rewrites explicit: each sentence is tied to the evidence visible in that
# record instead of rotating another generic template.
RESIDUAL_COPY_REWRITES: dict[str, dict[str, str]] = {
    "A-002": {
        "old": "从袋足陶斝的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
        "new": "灰嘴遗址的出土记录把这件袋足陶斝置回龙山文化的炊器组合；具体使用仍需结合残留物判断。",
    },
    "A-004": {
        "old": "从陶鬶的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
        "new": "郾城郝家台遗址留下的出土信息，使陶鬶可以与龙山文化的炊煮、倾注场景相连；更细的使用位置仍要看同坑材料。",
    },
    "A-014": {
        "old": "从灰陶执鋬杯的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
        "new": "河南郑州的出土记录只提供了文化与地点线索，灰陶执鋬杯的具体使用仍不能由单件照片定死。",
    },
    "A-018": {
        "old": "从陶罐的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
        "new": "西山遗址的地点与仰韶年代，为陶罐的储藏或炊煮可能划出范围；是否承受过火，还要等烟炱和残留物证据。",
    },
    "A-026": {
        "old": "从斜三角纹彩陶钵的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
        "new": "下集遗址与仰韶年代将这件彩陶钵放回聚落饮食与仪式的日常层面，纹样的象征含义仍需更多组合证据。",
    },
    "A-028": {
        "old": "从白衣彩陶钵的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
        "new": "大河村遗址的出土背景让白衣彩陶钵回到仰韶时期的餐饮器物序列；白衣和三角纹的具体意义不作越界推断。",
    },
    "A-032": {
        "old": "从人祖纹彩陶缸的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
        "new": "洪山庙遗址的地点和仰韶年代为人祖纹彩陶缸保留了明确坐标，图像与仪式用途仍需结合出土组合观察。",
    },
    "A-069": {
        "old": "从绳纹陶鬲的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
        "new": "二里岗遗址的出土信息把绳纹陶鬲置于郑州早商炊器谱系，具体炉灶位置与使用痕迹未见记录。",
    },
    "A-002-material": {
        "old": "袋足陶斝的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "泥胎中的颗粒与袋足转折先说明受火结构；它没有施釉，烧成痕迹应与器腹和足部合看。",
    },
    "A-004-material": {
        "old": "陶鬶的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "陶鬶的泥胎、长流和三足转折一起决定受热与倾注的姿态；照片未显示的使用痕迹暂不补写。",
    },
    "A-014-material": {
        "old": "灰陶执鋬杯的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "灰陶胎色和鋬、口沿的比例说明这是一件轻便饮器；侧面照片更能看出握持所需的空间。",
    },
    "A-018-material": {
        "old": "陶罐的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "陶罐的收口和鼓腹直接关系到容量，胎色与火痕是否来自炊煮，还要等检测或残留物证据。",
    },
    "A-026-material": {
        "old": "斜三角纹彩陶钵的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "钵壁的陶胎与彩绘层次需分开观察；斜三角纹沿器壁展开，照片能说明构图，不能单独证明用途。",
    },
    "A-028-material": {
        "old": "白衣彩陶钵的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "白色陶衣覆盖在胎体之上，彩绘边缘与器壁转折显示了施彩次序；烧成温度仍无直接记录。",
    },
    "A-032-material": {
        "old": "人祖纹彩陶缸的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "缸体厚薄和人祖纹的绘制范围共同决定观看距离；胎土颜色来自照片可见，具体颜料配方尚无展签说明。",
    },
    "A-069-material": {
        "old": "绳纹陶鬲的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "绳纹压印留在陶胎表面，袋足与腹部转折共同承担受热；是否长期置于火上，还需痕迹材料印证。",
    },
    "b-037-material": {
        "old": "红釉卧姿陶狗的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "红釉覆盖伏卧陶狗，耳、口、爪等塑形细部比表面光泽更关键；釉面反光提示观看角度，不能据此补写用途。",
    },
    "b-052-material": {
        "old": "白陶帐座的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "白陶帐座以多件立柱状构件模拟帷帐承托，截面和插接关系比单件外观更能说明它的模型功能。",
    },
    "b-056-material": {
        "old": "三彩骆驼及牵驼胡俑的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "骆驼的驼峰、牵驼人的姿态和三彩施釉层次共同构成运输场景；釉色只说明装饰，不替墓葬身份下结论。",
    },
    "b-064-material": {
        "old": "淡黄釉绞胎枕的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "绞胎枕的两色胎泥在剖面形成旋拧纹理，淡黄釉将起伏压低；枕面与底部照片应合看其寝具尺度。",
    },
    "b-070-material": {
        "old": "白釉多足瓷砚的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "多足承托砚面使器物离开案面，白釉在足部转折处积色；砚面磨痕和墨痕比口沿更值得复核。",
    },
    "b-089-material": {
        "old": "钧窑玫瑰紫鼓钉三足瓷盆托的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "鼓钉排列和三足承托构成盆托的结构节奏，玫瑰紫窑变在浅腹内外深浅不同；照片未能确定其配套器物。",
    },
    "b-090-material": {
        "old": "钧窑月白釉花瓣瓷碗的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "花瓣形口沿把月白釉的高光切成连续弧面，浅腹与圈足的比例决定端持感；窑变细节应以近照为准。",
    },
    "b-091-material": {
        "old": "钧窑玫瑰紫葵花瓷盘的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "葵花式分瓣口沿与浅盘体配合展开纹样，玫瑰紫釉色在瓣尖和盘心形成层次；实际用途仍需组合材料。",
    },
    "b-094-material": {
        "old": "张公巷窑青釉盘口瓷瓶的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "盘口、细颈与鼓腹的轮廓在青釉积釉处更清楚，圈足与器壁的接合可从侧面照复核；窑口归属以展签为界。",
    },
    "b-095-material": {
        "old": "黄釉刻莲花纹瓷盆的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "浅腹盆面以刻花压出莲瓣起伏，黄釉在刀痕处显出明暗；器壁厚度和底足比泛谈口沿更能说明制作。",
    },
    "b-098-material": {
        "old": "当阳峪窑绞胎瓷碗的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "绞胎纹由不同色泥相叠旋合，碗壁内外的纹理方向并不相同；釉面细裂与胎体关系需看局部照片。",
    },
    "b-103-material": {
        "old": "白地黑花山水人物纹瓷枕的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "瓷枕的长方枕面以白地黑花分出山水人物开光，边框和底部承重结构决定使用姿态；彩绘颜料不凭照片臆测。",
    },
    "b-104-material": {
        "old": "三彩荷叶童子枕的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "童子伏卧承托荷叶枕面，三彩低温釉在人物衣褶和叶脉处形成色块；构件受力关系要结合侧面照观察。",
    },
    "b-105-material": {
        "old": "白地黑花荷鸭纹瓷枕的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "八角枕面把荷叶与水鸭纳入白地黑花的开光构图，底部和侧壁决定它的承压方式；纹样寓意不单凭画面定论。",
    },
    "b-111-material": {
        "old": "仿哥釉铁锈花狮耳盘口瓷瓶的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "狮耳、盘口与铁锈花共同构成器物的观赏重点，开片釉面在暗光下更明显；仿哥釉的工艺判断仍需参照窑业资料。",
    },
    "b-133-material": {
        "old": "蓝釉黄彩云龙纹瓷盘的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "蓝釉铺底、黄彩勾龙，色层在浅腹和圈足转折处彼此映衬；盘面磨痕未见明确记录，使用场合暂不推定。",
    },
    "b-135-material": {
        "old": "粉彩荷花瓷吸杯的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "杯体塑成荷花，荷梗兼作吸管，墨书纪念文字把饮用功能和事件记忆连在一起；粉彩颜色不等于原始使用场景。",
    },
    "b-145-material": {
        "old": "五彩宝相花纹瓷盘的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
        "new": "宝相花以放射布局铺在浅腹盘面，红、绿彩与白地形成层次；圈足和盘背的制作细节需从多角度照片比看。",
    },
}


def compact(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def title_of(record: dict[str, Any]) -> str:
    return compact(record.get("name_zh") or record.get("title") or record.get("name"))


def strip_generated_scaffolds(text: str, record: dict[str, Any]) -> str:
    """Remove material-mismatched or batch-generated tail sentences.

    The first catalogue pass used a handful of surface/context sentences as
    scaffolding.  They are especially misleading on plain Neolithic pottery:
    an unglazed grey or red earthenware object cannot be described through
    glaze accumulation or a glaze layer.  The same pass also left two
    recognizable batch tails that add no object evidence.  Drop those whole
    sentences and let the length guard add a short evidence sentence only if
    a paragraph actually needs it.
    """
    normalized = compact(text)
    segments = re.findall(r"[^。！？]*[。！？]|[^。！？]+$", normalized)
    if not segments:
        return normalized
    title = title_of(record)
    material = compact(record.get("material_or_type") or record.get("material") or record.get("categoryLabel"))
    joined = f"{title} {material}"
    plain_pottery = "陶" in joined and not re.search(r"釉|瓷|珐琅", joined)
    removed = []
    for segment in segments:
        if "器形先于寓意" in segment or "边缘与背面提供了另一组证据" in segment:
            continue
        if "尺度与保存痕迹共同限定可说范围，缺环不作补写" in segment:
            continue
        if re.search(
            r"关于[^。]{1,90}的使用场合，仍需把器形与来源记录放在一起判断"
            r"|的器形和[^。]{1,80}表面可以说明观看与使用的方向，具体场合仍要回到[^。]{1,100}组合记录",
            segment,
        ):
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
        removed.append(segment)
    return compact("".join(removed))


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
    if re.search(r"卜辞|甲骨|石经|碑|简|印刷|宣传品|文献|书卷|小册|行书", joined):
        return "text"
    # Material outranks a vessel-shape character. “陶鼎”“陶豆” and glazed
    # pottery were being caught by the bronze regex because it also contains
    # generic shape words such as 鼎、豆、壶、尊. Keep their craft description
    # ceramic; reserve the bronze path for an explicitly metal record.
    if re.search(r"陶|瓷|釉|珐琅|漆", joined) and not re.search(r"青铜|铜质|铜器|铜胎", material):
        return "ceramic"
    # Currency and membership badges may contain 铜 or 印 in their names, but
    # they are not bronze vessels.  Keep their copy on monetary or documentary
    # tracks instead of giving them vessel parts such as ears and spouts.
    if re.search(r"银铤|银币|钱币|铜钱|宝钞|官票|钞票|证章|货币", joined):
        return "other"
    if re.search(r"青铜|铜|爵|鼎|盉|簋|簠|豆|壶|尊|觥|卣|罍|鉴|俎|戈|钺|权|印", joined):
        return "bronze"
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


def apply_residual_copy_rewrites(text: str, record: dict[str, Any]) -> str:
    """Repair stock sentences and collapse nested results from old passes.

    The catalogue was regenerated several times while the contextual variants
    were being edited.  Two variants used the object title as a prefix, so a
    second pass could prepend that title again and again.  Repair those legacy
    forms before applying any new contextual variant; this keeps the upgrade
    script idempotent and prevents corrupted prose from reaching the public
    data file.
    """
    text = compact(text)
    title = title_of(record)
    if title:
        escaped_title = re.escape(title)
        # Older runs nested ``把{title}`` before the shared bronze tail.
        text = re.sub(
            rf"(?:把{escaped_title})+与同出器物并看，才能进一步判断它进入宴飨、祭祀或墓葬的哪一环。",
            f"把{title}放回同坑组合，才能判断它在宴飨、祭祀或墓葬中扮演哪一环。",
            text,
        )
        # The jade material variant suffered from the same nesting problem.
        text = re.sub(
            rf"(?:{escaped_title}的)+玉料光泽、刃缘和穿孔要在多个角度下比较，单看正面会掩去厚度与磨痕。",
            f"{title}的材质、穿孔与边缘要在多个角度下比较，单看正面会掩去厚度与磨痕。",
            text,
        )
    record_id = compact(record.get("id"))
    for key in (record_id, f"{record_id}-material"):
        rewrite = RESIDUAL_COPY_REWRITES.get(key)
        if rewrite and rewrite["old"] in text:
            text = text.replace(rewrite["old"], rewrite["new"])

    # A prior contextual pass already changed the two object-specific records
    # below, so their old exact stock strings are not present in
    # RESIDUAL_COPY_REWRITES anymore.  Keep these repairs explicit as well.
    legacy_mismatch = {
        "b-037": (
            "红釉覆盖伏卧陶狗，耳、口、爪等塑形细部比器皿口沿更关键；釉面反光提示观看角度，不能据此补写用途。",
            "红釉覆盖伏卧陶狗，耳、口、爪等塑形细部比表面光泽更关键；釉面反光提示观看角度，不能据此补写用途。",
        ),
        "b-052": (
            "白陶帐座以多件立柱状构件模拟帷帐承托，截面和插接关系比口沿更能说明它的模型功能。",
            "白陶帐座以多件立柱状构件模拟帷帐承托，截面和插接关系比单件外观更能说明它的模型功能。",
        ),
    }
    mismatch = legacy_mismatch.get(record_id)
    if mismatch and mismatch[0] in text:
        text = text.replace(mismatch[0], mismatch[1])
    return compact(text)


def stable_variant(record: dict[str, Any], salt: str) -> int:
    """Choose a reproducible prose variant without exposing an internal id."""
    key = f"{record.get('id', '')}|{title_of(record)}|{salt}"
    return sum(ord(char) for char in key) % 3


def variant_index(record: dict[str, Any], salt: str, length: int) -> int:
    """Choose one of an arbitrary number of editorial variants reproducibly."""
    if length <= 1:
        return 0
    key = f"{record.get('id', '')}|{title_of(record)}|{salt}"
    return sum(ord(char) for char in key) % length


def site_fragment(record: dict[str, Any]) -> str:
    value = compact(record.get("provenance") or record.get("findspot") or record.get("origin"))
    value = re.sub(r"^\d{4}年[，、 ]*", "", value)
    value = re.sub(r"（[^）]{1,24}）$", "", value)
    value = value.replace("现藏河南博物院", "河南博物院收藏")
    return value[:22] or "现有收藏记录"


def source_phrase(record: dict[str, Any]) -> str:
    """Return a short source label that reads naturally in a sentence."""
    raw = compact(record.get("provenance") or record.get("findspot") or record.get("origin"))
    if not raw:
        return "现有收藏记录"
    if raw.startswith("征集") or ("征集" in raw and "出土" not in raw):
        return "征集记录"
    # Keep the year and the named site when available.  The earlier 22-character
    # fragment collapsed many unrelated objects onto one prose skeleton (for
    # example several pieces from 妇好墓).  A little more provenance gives each
    # sentence a factual anchor without turning it into a catalogue field.
    value = re.split(r"[，,；;]", raw, maxsplit=1)[0]
    value = re.sub(r"（[^）]{1,24}）$", "", value)
    value = re.sub(r"(出土|发现|入藏)$", "", value)
    value = re.sub(r"\s+", "", value)
    return value[:34] or "现有收藏记录"


def material_phrase(record: dict[str, Any]) -> str:
    value = compact(record.get("material_or_type") or record.get("material") or record.get("categoryLabel"))
    return value[:18] or "器物材质"


def expanded_provenance_sentence(record: dict[str, Any], title: str, category: str) -> str:
    source = source_phrase(record)
    period = compact(record.get("period") or record.get("era")) or "所属年代"
    material = material_phrase(record)
    if "征集" in source:
        if category == "bronze":
            return f"{title}的征集记录没有留下原始地点，{material}的器形与{period}只能按现有展签核对。"
        if category == "ceramic":
            return f"{title}的来源只记作征集，{material}的胎釉和器形以展签为界，原始地点尚不清楚。"
        return f"{title}的来源只记作征集，原始地点尚不清楚；{material}的形制先按现有照片记录。"
    if category == "bronze":
        return f"{title}的出土地点可定位在{source}，{material}的器形与{period}由此互相校准。"
    if category == "ceramic":
        return f"{source}的出土信息把{title}放回具体年代，{material}的器形与烧成线索仍需结合展签阅读。"
    if category == "music":
        return f"{source}为{title}留下地点坐标，{material}的器形与{period}可以回到出土记录核对。"
    if category == "tomb":
        return f"{title}在{source}的出土位置，决定了{material}与随葬组合之间可以讨论到哪一步。"
    return f"{title}的来源记录指向{source}，{material}超出{period}与现有照片的推断暂不展开。"


def expanded_craft_sentence(record: dict[str, Any], title: str, category: str) -> str:
    source = source_phrase(record)
    material = material_phrase(record)
    period = compact(record.get("period") or record.get("era")) or "所属年代"
    if category == "bronze":
        if "征集" in source:
            variants = [
                f"{title}的接缝、耳部与纹带转折可以互相参照，{material}的铸造痕迹仍只能按现有展签和照片判断。",
                f"征集记录中的{title}，要从流、耳和边缘转折看{material}的成型线索，原始工序不另作推定。",
                f"{title}的{material}纹带在边缘处留下了接合线，具体铸造步骤仍缺少原始出土记录。",
                f"看{title}的耳部与接缝，能辨出{material}的制作分区，不能把缺失的范具细节补写出来。",
                f"{title}的轮廓转折和纹带收束都落在{material}表面，征集来源使工艺判断停在可见痕迹。",
                f"从{title}的边缘修整入手，{material}的铸成与后续加工可以分层观察，先不越过征集记录。",
                f"{title}的纹饰、耳部和接缝各自留下制作线索，{material}的次序还要等待更完整的来源材料。",
                f"把{title}的边缘细部与整体器形合看，才不会将{material}的表面变化误当成完整工序。",
            ]
        else:
            variants = [
                f"在{source}的记录里，{title}的范线、接缝与{material}纹饰分区要一起对读，{period}的制作次序只能从这些部位逐层追问。",
                f"{title}的耳、流与纹带转折彼此牵连，{source}所见的{material}铸造痕迹要放回{period}的器形传统中核对。",
                f"沿着{title}的接缝和纹饰边界看，{material}的范具分区逐渐显出轮廓，具体次序仍以{source}记录为界。",
                f"{title}的器壁厚薄、口沿收束和{material}纹带共同提示制作步骤，出土于{source}的线索可以逐处复核。",
                f"对照{source}的出土信息，{title}的纹带转折与边缘修整让{material}的铸造过程有了可观察的层次。",
                f"{title}的{material}表面不是平面的图案，接缝、转折和口沿把{period}工匠的修整动作留了下来。",
                f"看{title}，先把{material}的器壁、耳部和纹饰分区拆开，再由{source}的组合关系追问铸造先后。",
                f"{title}在{source}留下的器形资料，连接起{material}的纹饰布局与边缘制作，局部观察不替代完整报告。",
            ]
        return variants[variant_index(record, "craft-bronze", len(variants))]
    if category == "ceramic":
        if "陶" in material or "陶" in title:
            variants = [
                f"{title}的胎色、收口和足部转折共同留下烧成线索，{source}所见的{material}更适合从受火与成型痕迹读起。",
                f"沿着{title}的器壁、口沿和底部看，{material}的泥胎怎样成型，{source}的照片给出了一条清楚线索。",
                f"{title}把{material}的质地留在器壁起伏和边缘收束上，{source}记录中的细部可与整体轮廓互相印证。",
                f"看{title}的三足、鋬或圈足，{material}的受力与烧成痕迹各有位置，展柜照片先保留这些可见证据。",
                f"{title}的胎体颗粒、边缘修整和表面颜色要分开读，{source}只支持讨论{material}的制作线索。",
                f"从{title}的器腹到足部，{material}的成型动作藏在转折处，现有来源不替它补出未见的工序。",
                f"{title}的纹样依附器壁起伏展开，{material}的烧成效果要和口沿、底部照片放在一起看。",
                f"把{title}的器形和{material}胎体并置，边缘与受火部位才显示出这件陶器的制作节奏。",
            ]
        else:
            variants = [
                f"{title}的胎釉交界、边缘与积釉位置，显示{material}怎样成型，{source}照片可供逐处核对。",
                f"观察{title}的釉面起伏和底部收束，{material}的烧成层次与{source}的展签信息可以互相参照。",
                f"{title}的器壁曲线把胎体和釉色连在一起，{source}留下的{material}细部宜从正面、侧面合看。",
                f"顺着{title}的口沿和足部看，{material}的施釉范围与成型步骤各有痕迹，照片不替缺失部分下结论。",
                f"{title}的釉层、胎骨和纹样边界彼此咬合，{source}所见的{material}制作线索仍需结合窑业资料。",
                f"把{title}放回{source}的记录，胎釉厚薄与器形转折共同说明{material}的烧造特征。",
                f"{title}的表面光泽只是入口，边缘积釉和器底处理更能说明{material}如何完成成型。",
                f"看{title}的轮廓和施彩部位，{material}的成型与装饰是两组线索，展签和照片分别留下依据。",
            ]
        return variants[variant_index(record, "craft-ceramic", len(variants))]
    if category == "jade":
        variants = [
            f"{title}的孔壁、边缘和磨痕比套用器类术语更能说明{material}的雕琢过程，{source}的侧面与背面照片应合看。",
            f"看{title}的穿孔和刃缘，{material}的厚度变化把打磨动作留在局部，来源记录只支持到可见痕迹。",
            f"{title}的轮廓在{source}的图组中可以转面观察，{material}的磨痕与孔壁共同限定佩饰的制作判断。",
            f"把{title}的正面纹样和背面起伏放在一起，{material}的雕琢顺序才不会被单一光泽带偏。",
        ]
        return variants[variant_index(record, "craft-jade", len(variants))]
    if category == "text":
        variants = [
            f"{title}的刻写位置、边缘与保存状态要分开记录，{source}的{material}不能套用器物铸造的判断路径。",
            f"读{title}的字痕先看载体与缺损，{material}在{source}留下的书写位置比顺口释读更可靠。",
            f"{title}的行款和刻痕深浅要同{source}的保存状况合看，{material}能确认的范围止于照片与展签。",
        ]
        return variants[variant_index(record, "craft-text", len(variants))]
    variants = [
        f"{title}的结构接合与表面处理各有工艺线索，{source}所见的{material}只支持讨论制作痕迹。",
        f"看{title}的接合处和表面起伏，{material}的制作层次可以在{source}的照片中逐点核对。",
        f"{title}的边缘、背面和保存状态共同限定{material}的工艺判断，来源记录之外暂不延伸。",
        f"从{title}的局部转折入手，{material}留下的制作痕迹与{source}的收藏信息各自有边界。",
    ]
    return variants[variant_index(record, "craft-other", len(variants))]


def expanded_surface_sentence(record: dict[str, Any], title: str, category: str) -> str:
    source = source_phrase(record)
    material = material_phrase(record)
    if category == "ceramic":
        joined = f"{title} {material}"
        if "陶" in joined and not re.search(r"釉|瓷|珐琅", joined):
            variants = [
                f"{title}在{source}的光线下显出陶胎的起伏，口沿与底部的收束先按器形记录。",
                f"沿着{title}的器壁和足部看，{material}的泥胎、受火与边缘修整各有痕迹。",
                f"{title}的胎色和表面颗粒保留了烧成线索，{source}的照片适合与整体轮廓合看。",
                f"从{title}的口沿到器底，陶胎厚薄与镂孔、三足或圈足的转折共同说明成型动作。",
                f"{title}的纹样或绳纹依附陶胎展开，局部磨光与受火痕迹以照片可见处为限。",
                f"把{title}的正面和侧面放在一起，胎色、器壁弧度与底部受力关系才不会被一处光线带偏。",
                f"{title}的陶胎没有施釉证据，现有记录更适合讨论泥胎成型、烧成和表面修整。",
                f"观察{title}的边缘和足部，泥胎留下的制作痕迹比泛谈光泽更接近器物现场。",
            ]
            return variants[variant_index(record, "surface-plain-pottery", len(variants))]
        variants = [
            f"{title}的器壁曲线和底足收束在{source}的光线下形成层次，局部细节应与整体轮廓合看。",
            f"{title}的釉色随器壁曲面明暗变化，{source}的照片同时留下{material}的边缘和底部。",
            f"观察{title}时，{material}的表面光泽要和口沿、圈足的转折放在一起，{source}只呈现其中一面。",
            f"{source}的现场光线把{title}的{material}胎釉层次照出深浅，背面细部仍按图组补看。",
            f"沿着{title}的器壁看{material}的色泽与起伏，正面照片之外，侧面才显出边缘收束。",
            f"{title}的表面处理不止是颜色，{material}的积釉、施彩或磨损要结合{source}的多角度图。",
            f"从{title}的口沿到底部，{material}的表面状态各有变化，展柜照片保留了可见的那一段。",
            f"把{title}的整体轮廓和{material}的局部光泽合看，{source}的记录足以说明表面层次但不替缺失细节下结论。",
            f"{title}的器壁从{source}的展柜光线里显出{material}层次，底部与背面也要合看。",
            f"从{title}的口沿、肩部到足部，{material}的光泽和胎色各有变化，边缘细节不能省略。",
            f"把{title}转到侧面，{material}的厚薄和收束才清楚；正面负责呈现纹样布局。",
            f"{title}的表面细节落在口沿与底足之间，{source}的照片让这些转折可以逐项复核。",
            f"光线会改变{title}的{material}观感，稳定的线索是器壁曲线、底足与局部磨痕。",
        ]
        return variants[variant_index(record, "surface-ceramic", len(variants))]
    if category == "bronze":
        variants = [
            f"在{source}的展柜光线下，{title}的表面、边缘与{material}纹带要放在同一组照片里比较，局部差异不能脱离器形解释。",
            f"{title}的纹带在{material}表面形成明暗起伏，{source}的侧面与局部照可用来校正器壁转折。",
            f"观察{title}的铜色与边缘磨痕，{material}的纹饰密度要同{source}的整体器形一起读。",
            f"{source}的现场光线让{title}的{material}表面出现不同层次，局部变化先按照片记录。",
            f"从{title}的口沿、耳部到腹壁，{material}的表面处理各有痕迹，纹样不能脱离结构单看。",
            f"{title}的铸造表面留下纹带和修整的交界，{source}的图组把这些细部放回器形比例。",
            f"把{title}的正面纹饰与背面、边缘合看，{material}的保存状态才不会被一处反光误导。",
            f"{title}的色泽只是观看入口，{source}记录的{material}接缝、转折与局部磨蚀更值得对读。",
        ]
        return variants[variant_index(record, "surface-bronze", len(variants))]
    variants = [
        f"{title}的表面、边缘与{material}的保存状态应分开记录，{source}的现有照片不替缺失的细节下结论。",
        f"沿着{title}的边缘和背面看，{material}的保存痕迹与{source}的展陈光线需要分开理解。",
        f"{source}留下的{title}照片能够辨认{material}的表面层次，未见部分仍保持为未知。",
        f"{title}的轮廓、表面和细部在{source}的图组中各有证据，保存状况不由单一角度概括。",
    ]
    return variants[variant_index(record, "surface-other", len(variants))]


def expanded_photo_sentence(record: dict[str, Any], title: str) -> str:
    # Photo counts, role order, and label pairing belong to the gallery UI.
    # Returning an empty replacement keeps the prose historical rather than
    # reintroducing an inventory sentence on the next catalogue pass.
    return ""


def expanded_context_sentence(record: dict[str, Any], title: str, category: str) -> str:
    source = source_phrase(record)
    material = material_phrase(record)
    if category == "bronze":
        variants = [
            f"{source}的组合信息比单一纹样更能约束{title}的使用场合，具体关系仍要回到同出器物。",
            f"把{title}和{source}的同出器物放在一起，{material}的容量、耳部与礼仪位置才有可比尺度。",
            f"{source}让{title}不只是孤立器名，{material}的器形与共存关系共同指向它可能承担的礼仪动作。",
            f"读{title}的纹饰要回到{source}的器物组合，{material}的使用场合不能由一处图案单独决定。",
            f"{title}的大小和结构与{source}的出土组合彼此照应，{material}在礼仪中的分工仍需逐件核对。",
            f"从{source}的来源线索看，{title}的{material}形制可放回器用与礼制交界处观察，结论留在证据范围内。",
            f"{title}的组合位置比孤立纹样更有解释力，{source}所示的{material}用途仍须结合完整报告。",
            f"把{title}的器形、纹带与{source}的同坑材料合看，才不会把{material}的装饰直接等同于身份。",
        ]
        return variants[variant_index(record, "context-bronze", len(variants))]
    if category == "ceramic":
        variants = [
            f"{title}的用途要结合{source}与同组材料判断，先从{material}的器形和磨痕读起。",
            f"把{title}的器形放回{source}的出土背景，{material}的装饰只是一条线索，组合信息还要继续核对。",
            f"{source}给{title}留下来源坐标，{material}的纹样如何服务用途，要和同组器物对照。",
            f"看{title}的使用可能，{material}的口沿、底部和磨损比吉祥图案更接近器物动作，{source}只提供地点边界。",
            f"{title}的器形和{material}表面可以说明观看与使用的方向，具体场合仍要回到{source}的组合记录。",
            f"{title}的纹样要连同{material}的开口与底部一起看，{source}只把用途推断限制在一段范围内。",
            f"{title}放在{source}的历史层里看，{material}的大小、开口和残留痕迹才有解释空间。",
            f"{title}的开口、腹部与底足共同限定用途，{source}只提供一段可核的来源背景。",
            f"看{title}的纹样之前，先确认{material}的尺度和受力方式；{source}的组合记录再补上使用线索。",
            f"{source}留下的是{title}的地点坐标，{material}的纹饰意义仍要让位于器形与同组材料。",
            f"{title}的用途不能从图案单独推开，{material}的开口和磨损要与{source}的记录并读。",
            f"沿着{title}的器壁和底部观察，{material}的装饰才有了与实际动作相连的尺度。",
        ]
        return variants[variant_index(record, "context-ceramic", len(variants))]
    if category == "music":
        variants = [
            f"{title}的器形与同组乐器要放回{source}的语境，{material}才能进入声音生活的讨论。",
            f"把{title}的孔距、音高与{source}的墓葬组合并读，{material}的声音线索才不会脱离使用环境。",
            f"{source}交代了{title}进入社会生活的地点，{material}的演奏方式仍需结合同组乐器和可测数据。",
            f"听觉经验不能替代{title}的器形证据，{material}与{source}所见的组合关系要分开核对。",
        ]
        return variants[variant_index(record, "context-music", len(variants))]
    if category == "tomb":
        variants = [
            f"{title}与{source}的墓葬组合共同限定身份和使用场合，{material}纹样本身不作单一结论。",
            f"在{source}的墓葬位置上，{title}和同出器物互相说明，{material}的等级意味仍需谨慎表述。",
            f"{title}的随葬位置与{source}的墓室结构一起构成语境，{material}的装饰只能作为其中一条线索。",
            f"回到{source}的墓葬组合，{title}的形制和{material}保存状态才有机会与身份、场合对应。",
        ]
        return variants[variant_index(record, "context-tomb", len(variants))]
    variants = [
        f"把{title}放回{source}与同组材料，才能讨论{material}的社会位置，纹饰只作为线索保留。",
        f"{source}的来源记录为{title}划出解释边界，{material}的形制与表面信息先按照片核对。",
        f"看{title}不能脱离{source}的收藏路径，{material}提供的线索只延伸到现有资料支持的范围。",
        f"{title}的器形与{material}保存状态可以互相参照，来源未覆盖的社会含义暂不补写。",
    ]
    return variants[variant_index(record, "context-other", len(variants))]


def generic_form_sentence(record: dict[str, Any], title: str, category: str) -> str:
    source = source_phrase(record)
    material = material_phrase(record)
    if category == "ceramic":
        return f"{title}的器形与{material}表面处理共同限定使用动作，具体用途仍需结合{source}的记录判断。"
    if category == "bronze":
        return f"{title}的器形、{material}与出土组合互相补充，礼仪位置不能只从一处纹饰推出。"
    return f"{title}的形制和{material}保存了可观察的线索，来源记录之外的解释暂不展开。"


def contextualize_repeated(text: str, record: dict[str, Any]) -> str:
    """Replace stock sentences with object-specific editorial sentences.

    Coverage records need a fallback, but a sentence copied verbatim across
    dozens of objects reads like a machine template.  These variants keep the
    same evidence boundary while naming the object and its recorded context.
    """
    # Repair malformed text before replacing any remaining stock sentence.  A
    # catalogue upgrade may be run repeatedly during editing or deployment.
    text = apply_residual_copy_rewrites(text, record)
    title = title_of(record) or "这件器物"
    site = site_fragment(record)
    category = kind(record)

    def replace_variants(pattern: str, variants: list[str], salt: str) -> None:
        count = [0]
        def replace(_match: re.Match[str]) -> str:
            index = count[0]
            count[0] += 1
            return variants[variant_index(record, f"{salt}-{index}", len(variants))]
        nonlocal text
        text = re.sub(pattern, replace, text)
    replacements: dict[str, list[str]] = {
        "出土地把器形放回中原青铜礼制与区域交通的具体坐标。": [
            f"{title}的出土记录把器形放回中原青铜礼制与区域交通的坐标。",
            f"从{site}的记录看，{title}不只是器名，也带着一处可以定位的考古现场。",
            f"把{title}放回{site}的背景，器形与时代的关系才有了尺度。",
        ],
        "遗址与年代相连，能把它放回聚落的生产和饮食尺度，而不只留下一个器名。": [
            f"{title}所在的{site}与年代相互校准，让它回到聚落生产和饮食的尺度。",
            f"从{title}的遗址记录出发，地点与年代彼此校准，聚落生活的尺度也就有了落脚处。",
            f"在{site}，{title}的出土地点为年代提供了落脚处，也把日常使用的想象限制在可核的范围内。",
        ],
        "铸范分区、纹带转折和口沿修整，是判断铸造顺序的入口。": [
            f"{title}的铸范分区、纹带转折和口沿修整，可用来追问铸造的先后。",
            f"在{title}上，范块衔接、纹带转折和口沿修整留下了铸造顺序的线索。",
            f"{title}的边缘与纹带转折比单看纹样更有用：它们提示范具如何合拢。",
        ],
        "胎土、烧成和口沿处理共同决定它在光线下的轮廓，正面与侧面照片需要合看。": [
            f"看{title}，胎土、烧成和口沿处理共同决定了光线下的轮廓；正面与侧面应合看。",
            f"{title}的质地并不只由釉色决定，胎土、火候和口沿收放要在多张照片里一起读。",
            f"从{title}的胎体到口沿，烧成留下的细微差别比一眼的颜色更能说明制作过程。",
        ],
        "器物的实际位置仍要结合遗址报告、使用痕迹或残留物判断，文字只写到证据允许的地方。": [
            f"{title}的实际位置仍要结合遗址报告、使用痕迹或残留物判断，文字只写到证据允许的地方。",
            f"仅凭{title}的单件照片还不能锁定用途；遗址层位、磨损与残留物仍是下一步证据。",
            f"关于{title}的使用位置，现有记录只支持谨慎推断，不能用器形替代完整的考古报告。",
        ],
        "与同出器物并看，才能进一步判断它进入宴飨、祭祀或墓葬的哪一环。": [
            f"把{title}放回同坑组合，才能判断它在宴飨、祭祀或墓葬中扮演哪一环。",
            f"{title}在组合中的位置比孤立器名更有解释力；它究竟服务哪一场合，还要回到同坑材料。",
            f"只有把{title}放回同组器物，宴飨、祭祀或墓葬之间的差别才不会被纹饰带偏。",
        ],
        "胎釉、器形和纹样共同构成它的时代面貌；征集品没有原始层位，便不替它补写未知的主人。": [
            f"{title}的胎釉、器形和纹样共同构成时代面貌；作为征集品，原始层位与主人不另行推测。",
            f"对{title}来说，釉面、器形和纹样可以互相校验，征集记录却不能补出失去的出土层位。",
            f"{title}能说明的是胎釉与装饰的组合关系；没有原始层位，便不把未知归给某位主人。",
        ],
        "它的器类、纹饰和组合关系，能放回中原青铜器从实用到礼仪化的长线观察；本文只写照片与展签能够支撑的部分。": [
            f"{title}的器类、纹饰与组合关系，可放回中原器物由实用走向礼仪化的长线观察；这里只写照片与展签能支撑的部分。",
            f"从{title}出发，可以看见器用与礼仪之间的变化，但具体判断仍以现场照片和展签为界。",
            f"{title}提供的是一段可定位的器物材料：纹饰、结构和组合关系相互参照，才不会把局部说成全貌。",
        ],
        "器形、材质和来源共同限定它能说明的范围，未知之处不以想象补齐。": [
            f"{title}能说明什么，取决于器形、材质和来源记录；未知之处不以想象补齐。",
            f"关于{title}，照片给出形制与表面，来源记录给出边界，超出这些证据的部分暂不下结论。",
            f"把{title}的形制、材质和来源放在一起，才能知道它能说明的范围有多大。",
        ],
        "器物的比例、表面和细部要结合整组照片阅读，局部并不是孤立的装饰。": [
            f"{title}的比例、表面与细部要结合整组照片阅读，局部并不是孤立的装饰。",
            f"看{title}不能只停在一张正面照：比例、背面和局部共同决定器物的真实轮廓。",
            f"{title}的细部只有放回整组照片才有意义，局部纹理不能脱离器形单独解释。",
        ],
        "没有完整出土组合的地方，本文只保留器形能够支持的判断。": [
            f"{title}没有完整出土组合可供复原，因此本文只保留器形能够支持的判断。",
            f"关于{title}的出土组合仍不完整，能够确认的只到器形、材质与展签所示信息。",
            f"{title}的缺环恰在组合关系：没有原始位置的部分，文字不替考古现场补写。",
        ],
        "出土地与刻写位置决定了文字材料的时空范围，释读不能脱离原石、原骨或原简。": [
            f"{title}的出土地与刻写位置决定文字材料的时空范围，释读不能脱离原石、原骨或原简。",
            f"读{title}上的文字，先要确认它在哪里出土、刻在何处；脱离载体的释读很容易越过证据。",
            f"{title}的文字信息与载体不可分开，地点、位置和保存状况共同限定可以读到的范围。",
        ],
        "刻痕深浅、行款和残缺处比现代标点更接近它留下时的状态，照片只呈现其中一部分。": [
            f"{title}的刻痕深浅、行款与残缺处比现代标点更接近原状，照片只呈现其中一部分。",
            f"面对{title}的文字，先看刻痕、行款和缺损，再谈断句；现代标点不能替代原始痕迹。",
            f"{title}留下的书写痕迹并不等于完整文本，深浅、行距和残缺都需要在局部照片中复核。",
        ],
        "能确认的字句与仍有争议的部分分开书写，才能让文字本身保持可复核。": [
            f"{title}中能确认的字句与仍有争议的部分分开书写，文字才保持可复核。",
            f"关于{title}的释读，已辨字与未辨字必须分开，不能让顺口的断句遮住缺损。",
            f"把{title}的可识文字、残缺处和推测分层记录，读者才知道哪一句可以回到原物核对。",
        ],
        "墓葬记录保留了器物与随葬者、组合及等级关系的线索，是这件器物最重要的语境。": [
            f"墓葬记录保留了{title}与随葬者、组合及等级关系的线索，是理解它的关键语境。",
            f"对{title}来说，墓葬中的位置与同出器物同样重要，它们共同限定身份与等级的解释。",
            f"{title}进入墓葬后不再是孤立的器物，随葬者、组合和位置留下了可追问的社会关系。",
        ],
        "器物的磨痕、残损和尺寸，都需要与墓室位置和同出器物对读，单张正面照不够。": [
            f"{title}的磨痕、残损和尺寸，要与墓室位置及同出器物对读，单张正面照不够。",
            f"判断{title}在墓中的作用，不能只看正面；磨痕、残损、尺寸与位置要互相印证。",
            f"{title}的使用线索藏在磨损与组合里，墓室位置比单一纹样更能限制解释。",
        ],
        "墓葬组合比单一纹样更能约束对身份、信仰和使用场合的解释。": [
            f"对{title}的身份、信仰与使用场合，墓葬组合比单一纹样更能约束解释。",
            f"{title}的纹样可以提示方向，却不能独自决定意义；随葬组合才是更稳的参照。",
            f"把{title}放回墓葬组合，身份与使用场合的判断才不会被一处装饰牵着走。",
        ],
        "墓葬或出土地记录了乐器进入社会生活的地点，也提示它不应脱离组合单独解释。": [
            f"{title}的墓葬或出土地记录了乐器进入社会生活的地点，也提示它不应脱离组合解释。",
            f"{title}的声音史从出土位置开始：墓葬组合说明它如何被放置，却不替我们补写演奏场景。",
            f"读{title}，要把器形、出土地与同组乐器并置，才能讨论它在社会生活中的位置。",
        ],
        "音孔、悬挂部位或击奏面上的细小差异，往往比器名更能说明声音如何被制作出来。": [
            f"{title}的音孔、悬挂部位或击奏面上的细小差异，比器名更能说明声音如何被制作出来。",
            f"关于{title}的声音，孔位、悬挂点与击奏面是可测的证据，不能只凭名称想象。",
            f"把{title}的孔距或击奏面放大来看，制作声音的动作才会从器名背后显出来。",
        ],
        "声音、演奏方式和随葬位置应放在一起讨论，不能只凭器名替古人补出完整乐制。": [
            f"{title}的声音、演奏方式与随葬位置应放在一起讨论，不能只凭器名补出完整乐制。",
            f"即使是{title}这样的乐器，也要把可测音高、演奏动作与墓葬位置分开核对。",
            f"{title}能留下音列线索，却不能独自证明完整乐制；演奏方式与随葬位置仍需并读。",
        ],
        "出土地把佩饰和墓葬组合联系起来，也让材质选择与身份表达有了具体背景。": [
            f"{title}的出土地与墓葬组合，让材质选择和身份表达有了具体背景。",
            f"看{title}的玉料与形制，要先回到它与其他佩饰共同出现的墓葬位置。",
            f"{title}的佩戴意义不能只从纹样推断，出土地与同组玉饰提供了更可靠的尺度。",
        ],
        "玉料光泽、刃缘和穿孔要在多个角度下比较，单看正面会掩去厚度与磨痕。": [
            f"{title}的材质、穿孔与边缘要在多个角度下比较，单看正面会掩去厚度与磨痕。",
            f"读{title}的制作痕迹，侧面和背面的厚度、孔壁与刃缘同样重要。",
            f"{title}的光泽并不能代替工艺判断，穿孔、边缘和磨痕要随角度变化一起看。",
        ],
        "玉器的礼仪含义需要同组玉饰和墓主人身份共同说明，不能只由纹样下结论。": [
            f"{title}的礼仪含义要由同组玉饰和墓主人身份共同说明，不能只由纹样下结论。",
            f"{title}的纹样只是入口，真正的礼仪位置还要看同墓玉饰与墓主人身份。",
            f"谈{title}的身份表达，应把材质、佩戴组合和墓葬等级放在同一证据链里。",
        ],
        "石面的刻痕深浅与剥蚀位置，决定了文字和图像在今天还能读到多少。": [
            f"{title}石面的刻痕深浅与剥蚀位置，决定文字和图像在今天还能读到多少。",
            f"{title}的可读性受刻痕、剥蚀与光线共同影响，局部照片比整面轮廓更能说明问题。",
            f"读{title}上的痕迹要避开过度补全，深浅、残损与保存环境共同构成今天的边界。",
        ],
        "材质的裂隙、凿痕和边缘处理，保留了制作与长期使用的时间层。": [
            f"{title}的裂隙、凿痕与边缘处理，保留了制作和长期使用的时间层。",
            f"从{title}的材质裂隙与边缘，可以同时看到制作痕迹和后来使用留下的磨耗。",
            f"{title}表面的不平整并非都来自年代，凿痕、修整与裂隙要分开观察。",
        ],
        "出土记录和原始位置比后来的单件陈列更能限定它的社会功能。": [
            f"对{title}的社会功能，出土记录和原始位置比后来的单件陈列更有约束力。",
            f"{title}今天的展柜位置便于观看，却不能替代它最初的出土位置与组合。",
            f"判断{title}曾如何被使用，要先把后来的单件陈列与原始出土关系分开。",
        ],
        "同类器物须结合材质、结构与出土组合辨认用途，单凭装饰不能推出使用者身份": [
            f"判断{title}的用途，要把材质、结构与出土组合放在一起，单凭装饰不能推出使用者身份。",
            f"{title}的装饰只能提示观察方向，真正的用途仍需与同类器物和出土组合互证。",
            f"把{title}放回同类材料中，材质与结构才有解释力；纹样本身不足以指定使用者。",
        ],
        "出土地或征集信息把它放回河南博物院的收藏路径，未知处不另行补写。": [
            f"{title}的出土或征集记录，勾勒出它进入河南博物院收藏的路径；未知处不另行补写。",
            f"从{site}的记录看，{title}有一条可以追溯的收藏线索，缺失部分仍留作未知。",
            f"{title}的来源只写到现有记录允许的范围，出土与征集之间的空白不靠想象填补。",
        ],
        "文字材料的价值在于留下具体的书写现场，释文与不可辨识处必须分开标出。": [
            f"{title}的价值在于留下具体书写现场，释文与不可辨识处必须分开标出。",
            f"读{title}上的文字，要把可辨字、残缺处和释读分层记录，不能用顺口的句子遮住缺损。",
            f"{title}保存的是一段书写痕迹，而非自动完整的文本；释文边界需要随原物标明。",
        ],
        "墓葬或出土地决定它与人物、制度和信仰的关联强度；缺少报告的地方保留为问题。": [
            f"{title}与人物、制度和信仰的关联强度，由墓葬或出土地决定；缺少报告的地方保留为问题。",
            f"关于{title}的身份线索，先看墓葬位置与出土记录，报告没有覆盖的部分不越界解释。",
            f"{title}能否连到人物或制度，要由出土语境来限定，单件陈列不能代替墓葬报告。",
        ],
        "乐器的形制、成组方式与演奏动作必须一起看，才能接近当时的声音组织。": [
            f"{title}的形制、成组方式与演奏动作必须一起看，才能接近当时的声音组织。",
            f"关于{title}的声音，器形、同组乐器和可能的演奏动作要分开核对，再谈音乐关系。",
            f"{title}留下了声音结构的线索，却不能脱离成组方式与演奏动作独自证明乐制。",
        ],
    }

    # Some early records appended a bronze-specific sentence to ceramics,
    # paper, jade, or stone objects.  Keep the evidence boundary but make the
    # replacement agree with the object's material and use.
    if category != "bronze":
        replacements["出土地把器形放回中原青铜礼制与区域交通的具体坐标。"] = [
            f"{title}的出土或征集记录，为器形提供了可以定位的时间与地点。",
            f"从{site}的记录看，{title}不只是器名，也带着一处可以回到的考古背景。",
            f"把{title}放回{site}的来源记录，器形与时代的关系才有了尺度。",
        ]
        replacements["铸范分区、纹带转折和口沿修整，是判断铸造顺序的入口。"] = [
            f"{title}的边缘、接合与表面处理，留下了制作过程的线索。",
            f"在{title}上，材质转折和局部修整比泛泛谈纹样更能说明工艺。",
            f"观察{title}的口沿、底部或接合处，可以把制作动作落到具体痕迹。",
        ]
    if category != "ceramic":
        replacements["遗址与年代相连，能把它放回聚落的生产和饮食尺度，而不只留下一个器名。"] = [
            f"{title}的来源记录与年代相互校准，让它回到具体的历史尺度。",
            f"从{title}的出土或征集记录出发，器物不再只是一个名称，而有了时间坐标。",
            f"{title}的地点与年代为解释提供落脚处，超出记录的部分暂不补写。",
        ]
        replacements["胎土、烧成和口沿处理共同决定它在光线下的轮廓，正面与侧面照片需要合看。"] = [
            f"看{title}，材质、边缘和表面处理共同决定光线下的轮廓；多角度应合看。",
            f"{title}的质地不能只由颜色概括，正面、侧面与局部照片要放在一起读。",
            f"从{title}的表面到边缘，细微的制作差别比一眼的色调更有说明力。",
        ]
    if category != "text":
        replacements["出土地与刻写位置决定了文字材料的时空范围，释读不能脱离原石、原骨或原简。"] = [
            f"{title}的来源与保存状况共同限定可以确认的信息，未知处不另行补写。",
            f"关于{title}，照片给出形制与表面，展签给出边界，超出两者的部分暂不下结论。",
            f"把{title}的形制、材质和来源放在一起，才能知道它能说明的范围有多大。",
        ]

    for original, variants in replacements.items():
        if original in text:
            text = text.replace(original, variants[stable_variant(record, original)])

    # Older generated passes already wrote two of the variants above into the
    # catalogue.  Catch those forms too, otherwise a second editorial pass
    # would leave the generic sentence untouched.
    legacy_provenance = rf"{re.escape(title)}的出土地点为年代提供了落脚处，也把日常使用的想象限制在可核的范围内。"
    provenance_variants = [
        f"在{site}，{title}的出土地点为年代提供了落脚处，也把日常使用的想象限制在可核的范围内。",
        f"从{site}的记录看，{title}的地点与年代相互校准，日常使用的判断因此有了边界。",
        f"{title}的来源记录给年代留下落脚处，超出{site}所能证明的部分暂不补写。",
    ]
    provenance_count = [0]
    def replace_legacy_provenance(_match: re.Match[str]) -> str:
        index = provenance_count[0]
        provenance_count[0] += 1
        return provenance_variants[stable_variant(record, f"legacy-provenance-{index}")]
    text = re.sub(legacy_provenance, replace_legacy_provenance, text)

    legacy_material = rf"从{re.escape(title)}的胎体到口沿，烧成留下的细微差别比一眼的颜色更能说明制作过程。"
    material_variants = [
        f"从{title}的表面到边缘，细微的制作差别比一眼的色调更有说明力。",
        f"{title}的质地不能只由颜色概括，胎体、口沿与局部照片要放在一起读。",
        f"看{title}的胎体和口沿，烧成留下的层次才不会被表面色彩遮住。",
    ]
    material_count = [0]
    def replace_legacy_material(_match: re.Match[str]) -> str:
        index = material_count[0]
        material_count[0] += 1
        return material_variants[stable_variant(record, f"legacy-material-{index}")]
    text = re.sub(legacy_material, replace_legacy_material, text)

    # The first pass had already expanded the stock sentence with the object
    # name.  Rewrite those expanded forms as well, so re-running this tool
    # keeps the catalogue free of a shared sentence skeleton.
    replace_variants(
        rf"{re.escape(title)}的出土记录把器形放回中原青铜礼制与区域交通的坐标。",
        [
            f"{title}的出土记录与{site}相连，器形与年代由此能够互相校准。",
            f"回到{site}的现场，{title}的形制才有了可以核对的时间坐标。",
            f"{title}留下的来源线索指向{site}，其余超出记录的推断暂不展开。",
        ],
        "expanded-provenance",
    )
    replace_variants(
        rf"{re.escape(title)}的铸范分区、纹带转折和口沿修整，可用来追问铸造的先后。",
        [
            f"看{title}的范块衔接与口沿收束，铸造步骤可以从边缘痕迹逐层追问。",
            f"{title}的纹带转折并非只为装饰，也留下范具合拢和修整的线索。",
            f"把{title}的口沿、纹带和接缝放在一起，才能讨论铸造先后。",
        ],
        "expanded-casting",
    )
    replace_variants(
        rf"{re.escape(title)}的边缘与纹带转折比单看纹样更有用：它们提示范具如何合拢。",
        [
            f"{title}的边缘、接缝与纹带转折，把制作动作落到了可见的部位。",
            f"从{title}的口沿和纹带转折，可以追问范具合拢后留下的修整痕迹。",
            f"{title}的纹样要连同边缘一起看，局部结构比单独的装饰名称更能说明工艺。",
        ],
        "expanded-edge",
    )
    replace_variants(
        rf"在{re.escape(title)}上，范块衔接、纹带转折和口沿修整留下了铸造顺序的线索。",
        [
            f"{title}的范块衔接与口沿修整，把铸造顺序留在了器物边缘。",
            f"观察{title}的纹带转折，能看见范具合拢后如何被再次修整。",
            f"对{title}而言，接缝、转折和口沿比一眼看见的纹样更接近制作现场。",
        ],
        "expanded-casting-alt",
    )
    replace_variants(
        rf"(?:多角度照片把{re.escape(title)}与展柜的尺度关系一并保留下来|这组图保留了{re.escape(title)}在展柜中的比例和细部层次|从{re.escape(site)}的图组里，{re.escape(title)}的正面、侧面与局部可以互相校验)。",
        [
            f"从{site}的现场图组里，可以对读{title}的正面、侧面与局部。",
            f"{title}的图组保留了它在展柜中的比例，也把细部放在了整体轮廓旁边。",
            f"看{title}的多张照片，展柜尺度与器物轮廓可以彼此校验。",
        ],
        "expanded-photo",
    )
    replace_variants(
        rf"从{re.escape(title)}的表面到边缘，细微的制作差别比一眼的色调更有说明力。",
        [
            f"在{site}的现场光线下，{title}的表面、边缘与局部质地可以互相校验。",
            f"看{title}不能只停在颜色：胎体、口沿和局部照片共同说明制作痕迹。",
            f"{title}的表面层次要连同边缘和背面一起看，色调本身不足以概括工艺。",
        ],
        "expanded-material",
    )

    # A later pass had already expanded four variants with the title inserted,
    # but those expansions still shared the same sentence skeleton.  Rewrite
    # them from the record's source, material, and available photo roles.
    replace_variants(
        rf"从[^。]{{1,100}}的记录看，{re.escape(title)}不只是器名，也带着一处可以定位的考古现场。",
        [expanded_provenance_sentence(record, title, category)],
        "expanded-provenance-clean",
    )
    replace_variants(
        rf"把{re.escape(title)}的口沿、纹带和接缝放在一起，才能讨论铸造先后。",
        [expanded_craft_sentence(record, title, category)],
        "expanded-craft-clean",
    )
    replace_variants(
        rf"从[^。]{{1,100}}的现场图组里，可以对读{re.escape(title)}的正面、侧面与局部。",
        [expanded_photo_sentence(record, title)],
        "expanded-photo-clean",
    )
    replace_variants(
        rf"只有把{re.escape(title)}放回同组器物，宴飨、祭祀或墓葬之间的差别才不会被纹饰带偏。",
        [expanded_context_sentence(record, title, category)],
        "expanded-context-clean",
    )

    # Earlier catalogue passes left several of the rotated variants above in
    # the JSON.  They are readable sentences, but still repeat at batch scale.
    # Rewrite every known form from the record's own source and material so a
    # second run cannot reintroduce a shared skeleton.
    cleanup_variants = [
        (rf"关于{re.escape(title)}的使用场合，仍需把器形与来源记录放在一起判断。", expanded_context_sentence(record, title, category), "fallback-occasion-clean"),
        (rf"{re.escape(title)}的形制与材质留下了可见证据，未见部分按记录保留。", expanded_context_sentence(record, title, category), "fallback-form-clean"),
        (rf"{re.escape(title)}的尺度与保存痕迹共同限定可说范围，缺环不作补写。", expanded_context_sentence(record, title, category), "fallback-scale-clean"),
        (rf"{re.escape(title)}的边缘、接缝与纹带转折，把制作动作落到了可见的部位。", expanded_craft_sentence(record, title, category), "edge-clean"),
        (rf"{re.escape(title)}的范块衔接与口沿修整，把铸造顺序留在了器物边缘。", expanded_craft_sentence(record, title, category), "casting-alt-clean"),
        (rf"{re.escape(title)}的表面层次要连同边缘和背面一起看，色调本身不足以概括工艺。", expanded_surface_sentence(record, title, category), "surface-clean"),
        (rf"把{re.escape(title)}的口沿、纹带和接缝放在一起，才能讨论铸造先后。", expanded_craft_sentence(record, title, category), "craft-clean"),
        (rf"把{re.escape(title)}放回同坑组合，才能判断它在宴飨、祭祀或墓葬中扮演哪一环。", expanded_context_sentence(record, title, category), "context-clean"),
        (rf"{re.escape(title)}在组合中的位置比孤立器名更有解释力；它究竟服务哪一场合，还要回到同坑材料。", expanded_context_sentence(record, title, category), "context-alt-clean"),
        (rf"关于{re.escape(title)}的使用位置，现有记录只支持谨慎推断，不能用器形替代完整的考古报告。", expanded_context_sentence(record, title, category), "use-clean"),
        (rf"看{re.escape(title)}，胎土、烧成和口沿处理共同决定了光线下的轮廓；正面与侧面应合看。", expanded_surface_sentence(record, title, category), "surface-alt-clean"),
        (rf"看{re.escape(title)}的多张照片，展柜尺度与器物轮廓可以彼此校验。", expanded_photo_sentence(record, title), "photo-alt-clean"),
        (rf"{re.escape(title)}的图组保留了它在展柜中的比例，也把细部放在了整体轮廓旁边。", expanded_photo_sentence(record, title), "photo-clean"),
        (rf"{re.escape(title)}的胎釉、器形和纹样共同构成时代面貌；作为征集品，原始层位与主人不另行推测。", expanded_provenance_sentence(record, title, category), "ceramic-origin-clean"),
        (rf"对{re.escape(title)}来说，釉面、器形和纹样可以互相校验，征集记录却不能补出失去的出土层位。", expanded_provenance_sentence(record, title, category), "ceramic-origin-alt-clean"),
        (rf"{re.escape(title)}能说明的是胎釉与装饰的组合关系；没有原始层位，便不把未知归给某位主人。", expanded_provenance_sentence(record, title, category), "ceramic-origin-short-clean"),
        (rf"{re.escape(title)}的器类、纹饰与组合关系，可放回中原器物由实用走向礼仪化的长线观察；这里只写照片与展签能支撑的部分。", generic_form_sentence(record, title, category), "long-context-clean"),
        (rf"从{re.escape(title)}出发，可以看见器用与礼仪之间的变化，但具体判断仍以现场照片和展签为界。", expanded_context_sentence(record, title, category), "long-context-alt-clean"),
        (rf"{re.escape(title)}提供的是一段可定位的器物材料：纹饰、结构和组合关系相互参照，才不会把局部说成全貌。", generic_form_sentence(record, title, category), "material-context-clean"),
        (rf"{re.escape(title)}的实际位置仍要结合遗址报告、使用痕迹或残留物判断，文字只写到证据允许的地方。", expanded_context_sentence(record, title, category), "use-alt-clean"),
        (rf"{re.escape(title)}为征集品，原始层位和同出关系仍然未知。", expanded_provenance_sentence(record, title, category), "collection-clean"),
        (rf"关于{re.escape(title)}，照片给出形制与表面，来源记录给出边界，超出这些证据的部分暂不下结论。", expanded_provenance_sentence(record, title, category), "source-clean"),
        (rf"{re.escape(title)}能说明什么，取决于器形、材质和来源记录；未知之处不以想象补齐。", expanded_provenance_sentence(record, title, category), "scope-clean"),
        (rf"{re.escape(title)}的比例、表面与细部要结合整组照片阅读，局部并不是孤立的装饰。", expanded_photo_sentence(record, title), "detail-clean"),
        (rf"看{re.escape(title)}不能只停在一张正面照：比例、背面和局部共同决定器物的真实轮廓。", expanded_photo_sentence(record, title), "front-clean"),
    ]
    for pattern, replacement, salt in cleanup_variants:
        replace_variants(pattern, [replacement], salt)

    generic_form = "瓶、壶、尊、罐和盒用于盛装、倾注或收纳，口颈、系耳与盖的差别直接关系到使用方式。"
    if generic_form in text:
        text = text.replace(generic_form, generic_form_sentence(record, title, category))

    # Match sentences produced by the immediately preceding generation too.
    # These broad forms deliberately stop at the sentence terminator, so a
    # future rerun replaces the whole old clause rather than leaving a shared
    # lead before a varied second clause.
    replace_variants(
        rf"(?:在[^。；]{{1,90}}的记录里，)?{re.escape(title)}的范线、接缝与[^。；]{{0,90}}纹饰分区要一起对读[，；][^。]{{1,120}}。",
        [expanded_craft_sentence(record, title, category)],
        "broad-craft",
    )
    replace_variants(
        rf"{re.escape(title)}的接缝、耳部与纹带转折可以互相参照，[^。]{{1,150}}。",
        [expanded_craft_sentence(record, title, category)],
        "broad-craft-ear",
    )
    replace_variants(
        rf"{re.escape(title)}的耳、流与纹带转折彼此牵连，[^。]{{1,180}}。",
        [expanded_craft_sentence(record, title, category)],
        "broad-craft-ear-legacy",
    )
    replace_variants(
        rf"{re.escape(title)}的胎体、边缘和烧成痕迹要分开看，[^。]{{1,180}}。",
        [expanded_craft_sentence(record, title, category)],
        "broad-craft-pottery",
    )
    replace_variants(
        rf"观察{re.escape(title)}的胎体、边缘与表面处理，[^。]{{1,180}}。",
        [expanded_craft_sentence(record, title, category)],
        "broad-craft-surface",
    )
    replace_variants(
        rf"看{re.escape(title)}，[^。]{{1,100}}的表面层次要连同边缘和背面一起核对；[^。]{{1,120}}。",
        [expanded_surface_sentence(record, title, category)],
        "broad-surface-layer",
    )
    replace_variants(
        rf"{re.escape(title)}的出土地点落在[^。]{{1,150}}，这条坐标让器形与[^。]{{1,80}}可以互相校准。",
        [expanded_provenance_sentence(record, title, category)],
        "broad-provenance-location",
    )
    replace_variants(
        rf"{re.escape(title)}留下的来源线索指向[^。]{{1,150}}，其余超出记录的推断暂不展开。",
        [expanded_provenance_sentence(record, title, category)],
        "broad-provenance-clue",
    )
    replace_variants(
        rf"{re.escape(title)}所在的[^。]{{1,150}}与年代相互校准，让它回到聚落生产和饮食的尺度。",
        [expanded_provenance_sentence(record, title, category)],
        "broad-provenance-settlement",
    )
    replace_variants(
        rf"把{re.escape(title)}放回[^。]{{1,150}}的背景，器形与时代的关系才有了尺度。",
        [expanded_provenance_sentence(record, title, category)],
        "broad-provenance-background",
    )
    replace_variants(
        rf"{re.escape(title)}的来源记录指向[^。]{{1,150}}，[^。]{{1,120}}超出[^。]{{1,120}}的推断暂不展开。",
        [expanded_provenance_sentence(record, title, category)],
        "broad-provenance-record",
    )
    replace_variants(
        rf"{re.escape(title)}在[^。]{{1,120}}留下的组合线索，能约束[^。]{{1,100}}；单一纹饰只提供观察入口。",
        [expanded_context_sentence(record, title, category)],
        "broad-context-location",
    )
    replace_variants(
        rf"在[^。；]{{1,100}}的展柜光线下，看{re.escape(title)}的[^。；]{{1,80}}表面层次，边缘和背面也要一起核对。",
        [expanded_surface_sentence(record, title, category)],
        "broad-surface-display",
    )
    replace_variants(
        rf"从[^。；]{{1,100}}的材料出发，{re.escape(title)}的[^。；]{{1,100}}纹饰可作观察入口，不能独自承担用途判断。",
        [expanded_context_sentence(record, title, category)],
        "broad-context-material",
    )
    replace_variants(
        rf"沿着{re.escape(title)}的器壁看[^。；]{{1,100}}的色泽与起伏，正面照片之外，侧面才显出边缘收束。",
        [expanded_surface_sentence(record, title, category)],
        "broad-surface-side",
    )
    replace_variants(
        rf"从{re.escape(title)}的口沿到底部，[^。；]{{1,100}}的表面状态各有变化，展柜照片保留了可见的那一段。",
        [expanded_surface_sentence(record, title, category)],
        "broad-surface-bottom",
    )
    replace_variants(
        rf"{re.escape(title)}的纹样要连同[^。；]{{1,100}}的开口与底部一起看，[^。；]{{1,100}}只把用途推断限制在一段范围内。",
        [expanded_context_sentence(record, title, category)],
        "broad-context-opening",
    )
    replace_variants(
        rf"{re.escape(title)}的用途还要结合[^。]{{1,140}}，[^。]{{1,100}}不能单独替代出土记录。",
        [expanded_context_sentence(record, title, category)],
        "broad-context-ceramic",
    )
    replace_variants(
        rf"{re.escape(title)}的现场图组(?:有\d+张照片，器物照与展签照可以互相核对[；，][^。]+|同时保留器物照与展签照，[^。]+)。",
        [expanded_photo_sentence(record, title)],
        "broad-photo-label",
    )
    replace_variants(
        rf"{re.escape(title)}在[^。]{{1,100}}的现场图组(?:有\d+张照片，器物照与展签照可以互相核对[；，][^。]+|同时保留器物照与展签照，[^。]+)。",
        [expanded_photo_sentence(record, title)],
        "broad-photo-label-source",
    )
    replace_variants(
        rf"{re.escape(title)}在[^。]{{1,70}}现有\d+张现场照，[^。]+。",
        [expanded_photo_sentence(record, title)],
        "broad-photo-field",
    )

    # A common photo-scale sentence was often duplicated within one record.
    photo_sentence = f"{title}的多角度照片也保留了器物与展柜尺度的关系。"
    photo_variants = [
        f"从{site}的图组里，{title}与展柜的尺度关系一并保留下来。",
        f"这组来自{site}的照片保留了{title}的比例和细部层次。",
        f"在{site}拍下的正面、侧面与局部，可以互相校验{title}的轮廓。",
    ]
    photo_count = [0]
    def replace_photo(_match: re.Match[str]) -> str:
        index = photo_count[0]
        photo_count[0] += 1
        return photo_variants[variant_index(record, f"photo-{index}", len(photo_variants))]
    text = re.sub(re.escape(photo_sentence), replace_photo, text)

    # Photo counts and label pairing are already visible in the gallery card;
    # remove the two old inventory phrasings (and the one-photo variant) from
    # prose so a rerun cannot restore the batch-copy fingerprint.
    for pattern in (
        rf"{re.escape(title)}的图组从器身延伸到展签，共\d+张，[^。]+。",
        rf"从[^。；]{{1,100}}的展柜照到展签，{re.escape(title)}共保留\d+张图，[^。]+。",
        rf"现有图组(?:在[^。；]{{1,100}})?只留下{re.escape(title)}的一张器物照片，[^。]+。",
    ):
        text = re.sub(pattern, "", text)
    return strip_generated_scaffolds(
        strip_context_template_sentences(strip_photo_inventory_sentences(text)), record
    )


def robust_paragraphs(record: dict[str, Any]) -> list[str]:
    repair = COPY_REPAIRS.get(compact(record.get("id")))
    if repair:
        return [
            strip_generated_scaffolds(
                strip_context_template_sentences(strip_photo_inventory_sentences(paragraph)), record
            )
            for paragraph in repair
        ]
    current = [
        apply_residual_copy_rewrites(contextualize_repeated(clean_template(item, record), record), record)
        for item in existing_copy(record)
    ]
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
        current[index] = apply_residual_copy_rewrites(
            contextualize_repeated(clean_template(current[index], record), record), record
        )
        current[index] = strip_generated_scaffolds(current[index], record)
        # The inventory scrub can shorten an otherwise useful paragraph. Add
        # a compact evidence sentence only after the final template pass so a
        # photo sentence cannot be regenerated or removed on the next run.
        if len(current[index]) < 55:
            current[index] = f"{current[index]} {fallback_copy_tail(record, index)}"

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
