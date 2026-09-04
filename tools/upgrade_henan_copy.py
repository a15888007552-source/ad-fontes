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


def stable_variant(record: dict[str, Any], salt: str) -> int:
    """Choose a reproducible prose variant without exposing an internal id."""
    key = f"{record.get('id', '')}|{title_of(record)}|{salt}"
    return sum(ord(char) for char in key) % 3


def site_fragment(record: dict[str, Any]) -> str:
    value = compact(record.get("provenance") or record.get("findspot") or record.get("origin"))
    value = re.sub(r"^\d{4}年[，、 ]*", "", value)
    value = re.sub(r"（[^）]{1,24}）$", "", value)
    value = value.replace("现藏河南博物院", "河南博物院收藏")
    return value[:22] or "现有收藏记录"


def contextualize_repeated(text: str, record: dict[str, Any]) -> str:
    """Replace stock sentences with object-specific editorial sentences.

    Coverage records need a fallback, but a sentence copied verbatim across
    dozens of objects reads like a machine template.  These variants keep the
    same evidence boundary while naming the object and its recorded context.
    """
    title = title_of(record) or "这件器物"
    site = site_fragment(record)
    category = kind(record)

    def replace_variants(pattern: str, variants: list[str], salt: str) -> None:
        count = [0]
        def replace(_match: re.Match[str]) -> str:
            index = count[0]
            count[0] += 1
            return variants[stable_variant(record, f"{salt}-{index}")]
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
            f"从{title}的遗址记录出发，器物不再只是一个名称，而有了聚落生活的时间坐标。",
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
            f"把{title}与同出器物并看，才能进一步判断它进入宴飨、祭祀或墓葬的哪一环。",
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
            f"{title}的玉料光泽、刃缘和穿孔要在多个角度下比较，单看正面会掩去厚度与磨痕。",
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
        return photo_variants[stable_variant(record, f"photo-{index}")]
    text = re.sub(re.escape(photo_sentence), replace_photo, text)
    return compact(text)


def robust_paragraphs(record: dict[str, Any]) -> list[str]:
    current = [contextualize_repeated(clean_template(item, record), record) for item in existing_copy(record)]
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
        current[index] = contextualize_repeated(clean_template(current[index], record), record)

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
