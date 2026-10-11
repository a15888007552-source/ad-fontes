# 作曲家关系谱数据格式（草案 v0.1）

适用范围：ad-fontes 仓库 `modules/europa/`（欧罗巴音乐家年鉴）。本草案只定格式，不改任何现有文件。

## 0. 设计原则（全部来自仓库现有约定）

- **人物 ID 沿用 `persons.json` 的四字母键**（如 `mach`、`beet`），不另起编号。新格式只"挂"在既有人物上，不改 `persons.json` / `relations.json` 的原有字段。
- **关系类别沿用 `js/relation-taxonomy.js`** 的 8 类（师承、影响、接续、知交、亲缘、对立、比较、待核）与 4 级证据（documented / strongly-supported / historiographical / comparative）。
- **书目记录沿用 `schemas/source.schema.json`**（`id`、`author`、`title`、`edition`、`publisher`、`year`、`locator.page`）。
- **作品 ID 沿用 `data/research/works.json` 的 `work:` 前缀**。
- **公开 / 内部两层分离**：仓库里只存"第几版第几页"和一个定位编号 `anchorId`；书上的原话、PDF 第几张图、电子书文件路径都只存在**仓库之外的内部文件**里。

## 1. 文件布局

```
modules/europa/data/
  books.json                     # 公开：书目登记（教科书、词典），一书一版一条
  composers/<personId>.json      # 公开：每位作曲家一份
（仓库之外，内部）
  europa-anchors/<personId>.jsonl  # 内部：页码定位原话，一行一条
```

> 新格式**禁止**任何本机路径、电子书文件名进入仓库。

## 2. books.json（书目登记）

```json
{
  "schemaVersion": 1,
  "books": [
    {
      "id": "grout-zh-<版次>",
      "kind": "textbook",
      "author": "格劳特、帕利斯卡、伯克霍尔德",
      "title": "西方音乐史",
      "edition": "<版次，照版权页>",
      "translator": "<译者，照版权页>",
      "publisher": "<出版社>",
      "year": "<出版年>",
      "isbn": "<ISBN>",
      "pageNote": "正文页码为阿拉伯数字；前言为罗马数字"
    }
  ]
}
```

- `kind`：`textbook`（教科书，如 Grout）| `dictionary`（词典，如 New Grove）| `monograph`（专著）。
- 同一本书的不同版本、不同译本**各占一条**，页码绝不混用。
- `id` 规则：`<作者或丛书简称>-<语种>-<版次>`，全小写，连字符。

## 3. composers/<personId>.json

```json
{
  "schemaVersion": 1,
  "personId": "mach",
  "updated": "YYYY-MM-DD",
  "status": "draft",
  "chronology": [ ... ],
  "lineage":    [ ... ],
  "works":      [ ... ],
  "scholarship": { "query": { ... }, "articles": [ ... ], "scholars": [ ... ] },
  "bookRefs":   [ ... ]
}
```

`status`：`draft`（AI 填写未审）→ `reviewed`（人工核过）→ `published`（可上页面）。只有 `reviewed` 以上才允许前端读取。

### 3.1 chronology 大事记时间谱系

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | `<personId>-t01` 起顺序编号 |
| `dateStart` / `dateEnd` | 是 | 整数年；只知一年时两者相同 |
| `dateDisplay` | 是 | 照来源写法，如"约1323年""1340年起" |
| `certainty` | 是 | `certain` / `approximate` / `disputed`（与 research 数据一致） |
| `place` | 否 | 中文地名；地名应能在 `geo.json` 找到 |
| `title` | 是 | 10 字以内的事件名 |
| `text` | 是 | 1–2 句中文转述，不得超出来源所说 |
| `persons` | 否 | 涉及的其他人物 personId 列表 |
| `workRefs` | 否 | 涉及的作品 `work:` ID |
| `refs` | 是 | 至少一个 `bookRefs` 的 `refId`；无来源的事件不收 |

### 3.2 lineage 谱系关系

| 字段 | 必填 | 说明 |
|---|---|---|
| `target` | 是 | 对方 personId；对方不在年鉴里时写 `null` 并填 `targetName` |
| `targetName` | 条件 | 原文名 + 中文名 |
| `category` | 是 | 八类之一 |
| `label` | 否 | 细分说法（如"私淑""庇护"），须在 `LABEL_CATEGORY` 已有标签内 |
| `direction` | 是 | `out`（本人→对方）/ `in`（对方→本人）/ `undirected` |
| `evidence` | 是 | 四级证据之一 |
| `note` | 是 | 一句中文说明 |
| `refs` | 是 | 至少一个 `refId`；从现有 `relations.json` 搬来、尚无出处的条目可为空，但须加 `"importedFrom": "relations.json"` |

### 3.3 works 作品与公有领域乐谱

| 字段 | 必填 | 说明 |
|---|---|---|
| `workId` | 是 | 已在 `research/works.json` 的沿用原 ID；新作品用 `work:<人名>-<短题>` |
| `title` / `originalTitle` | 是 | 中文通行名 / 原文名 |
| `catalogue` | 否 | 作品编号（BWV、K.、Op. 等），照来源抄 |
| `date` / `genre` | 否 | 照来源 |
| `scores` | 否 | 乐谱链接列表，见下 |
| `refs` | 否 | `refId` 列表 |

`scores[]`：

```json
{
  "site": "IMSLP",
  "url": "https://imslp.org/wiki/...",
  "edition": "<版本说明：编订者、出版社、年份>",
  "rightsText": "<网站页面上写的权利原文，照抄>",
  "checked": "YYYY-MM-DD"
}
```

- 只收网站本身标明为公有领域（Public Domain）的版本；`rightsText` 照抄，不自己判断；页面没写就整条不收。
- 链接到作品页或具体版本页，不直链 PDF 文件，不下载乐谱进仓库。

### 3.4 scholarship 国内期刊题录与学者

```json
"query": {
  "db": "中国知网 学术期刊",
  "field": "主题",
  "q": "马肖",
  "sourceFilter": ["北大核心", "CSSCI", "AMI"],
  "subjectFilter": "音乐舞蹈",
  "sort": "被引 降序",
  "total": 0,
  "retrieved": "YYYY-MM-DD"
},
"articles": [
  { "title": "", "authors": [""], "affiliations": [""], "journal": "",
    "year": "", "issue": "", "indexes": ["CSSCI"], "cites": 0 }
],
"scholars": [
  { "name": "", "affiliation": "", "articleCount": 0, "topics": [""] }
]
```

- 只存题录，不存摘要全文、不存 PDF、不存知网链接中的会话参数。
- `scholars` 由 `articles` 汇总得出，不另行补人。

### 3.5 bookRefs 教科书页码与词典条目

教科书（格劳特等 Grout《西方音乐史》、诺顿断代史等）和词典（《新格罗夫音乐与音乐家词典》New Grove）是不同的书，定位方式不同，**分两种写**，用 `refType` 区分。

**教科书**（`refType: "textbook"`）：

| 字段 | 必填 | 说明 |
|---|---|---|
| `refId` | 是 | `<personId>-r01` 起编号，供上面各节引用 |
| `refType` | 是 | `"textbook"` |
| `bookId` | 是 | `books.json` 中 `kind: "textbook"` 的 `id` |
| `chapter` | 是 | 章号与章名，照书 |
| `page` | 是 | **书上印的页码**，字符串，如 `"151"`、`"151–153"`、`"xiv"` |
| `topic` | 是 | 这页讲了什么，一句中文 |
| `anchorId` | 是 | 指向内部定位文件的一行，如 `mach-a01` |
| `verified` | 是 | AI 填写一律 `false`（页面显示为"未核"）；人工翻书核过才改 `true` |

**词典**（`refType: "dictionary"`）：

| 字段 | 必填 | 说明 |
|---|---|---|
| `refId` | 是 | 同上 |
| `refType` | 是 | `"dictionary"` |
| `bookId` | 是 | `books.json` 中 `kind: "dictionary"` 的 `id` |
| `volume` | 是 | 卷号 |
| `headword` | 是 | 词条标题原样，如 `"Machaut, Guillaume de"` |
| `section` | 否 | 词条内的节号与节名 |
| `topic` | 是 | 这条依据讲了什么，一句中文 |
| `anchorId` | 是 | 同上 |
| `verified` | 是 | 同上 |

## 4. 内部定位文件（不进任何仓库）

`europa-anchors/<personId>.jsonl`，一行一条：

```json
{"anchorId":"mach-a01","bookId":"grout-en-10","page":"151","quote":"<书上原话一句，照抄>","scanIndex":"<扫描件第几张，可空>","filledBy":"gemini","filledAt":"YYYY-MM-DD"}
```

- 词典条目的定位行写 `volume` 和 `headword` 代替 `page`。
- `quote` 是该页上能证明这条信息的一句原话，逐字照抄；用来日后翻书核对。
- `scanIndex` 只记扫描件/PDF 的第几张图，帮助人工定位；它**不是**页码，不得写进公开文件。
- 这个文件夹放哪里由你决定；它不能出现在 ad-fontes 仓库里（建议同时把文件夹名写进 `.gitignore`，需你同意后再改）。

## 5. 审核与上线

1. AI 交回 → `status: draft`，`verified: false`。
2. 人工抽查定位原话与页码/词条 → `verified: true`，整份达标后 `status: reviewed`。
3. 前端只读 `reviewed` / `published`；接线前端是另一件事，不在本草案内。
