# Ad Fontes 模块标准

本文件定义 Ad Fontes 正式模块的目录、元数据和媒体约定。它是第一阶段的兼容标准：现有模块不要求在同一个 PR 中全部迁移，但新代码和后续迁移应尽量遵守这一结构。

## 1. 推荐目录

```text
modules/<module-id>/
├── index.html
├── module.json
├── css/
├── js/
├── data/
└── assets/
```

- `index.html`：只保留页面的 DOM/语义骨架、无障碍入口和必要的相对路径入口。
- `css/`：模块专属样式。机械迁移时保持现有选择器、变量、字体、配色和动画语义不变。
- `js/`：展示与交互逻辑，使用原生 JavaScript / ES Modules；不引入框架或构建链。
- `data/`：人物、文物、事件、来源、关系等结构化学术数据。原始 ID、文本、标点、Unicode 和现有字段含义必须保持不变。
- `assets/`：图片、音频、PDF 等媒体文件及其相对路径。
- `module.json`：模块的最小元数据，结构由 [`schemas/module.schema.json`](../schemas/module.schema.json) 约束。

页面仍须兼容 GitHub Pages 的静态托管。模块内部资源使用相对路径；不要假设存在 Node、npm、服务器端路由或打包器。

## 2. module.json

正式模块至少声明：

```json
{
  "id": "europa",
  "number": "I",
  "title": "Annales Musicorum",
  "subtitle": "欧罗巴 ↔ 华夏音乐家年鉴",
  "type": "research-tool",
  "status": "published",
  "version": "1.0.0",
  "entry": "index.html",
  "maintainer": "辛申奥",
  "dataVersion": "2026-08-09"
}
```

`number`、`subtitle` 和 `dataVersion` 是可选字段。元数据只能记录当前页面已经表达的名称、说明和维护信息；不能借此改写页面中的学术内容、历史事实或引用。

本 PR 中的 `module.json` 只建立最小合法描述，不改变现有页面入口、标题、内容或 URL。现有的 `modules/modules/beilin` 保留为历史兼容路径，由验证脚本报告 warning，不在本阶段删除或迁移。

## 3. 数据与来源

学术内容进入 JSON，展示和交互进入 JavaScript，页面结构进入 HTML，样式进入 CSS。数据拆分以可读性和边界清晰为准：耦合紧密的结构可以保留在较少的 JSON 文件中，不为形式强行拆分。

历史引文不在本阶段大规模人工改写。今后新增来源数据应尽量使用 [`schemas/source.schema.json`](../schemas/source.schema.json) 所支持的字段，例如作者、题名、版本、出版信息和可解析的章节/页码定位；既有 `cite` 字符串在没有逐条核对时保持原样。

数据迁移必须满足：

- 原始 ID 集合和条目数量不变；
- biography、deep reading、citation 等原文不重写、不“优化”；
- 生卒年、作品、关系、地理信息和 Unicode 字符不擅自校正；
- JSON 使用 UTF-8；
- 页面通过原生 `fetch()` / ES Modules 加载数据；
- 迁移前后用自动化比较验证字符串和 ID，而不是依靠肉眼或文件存在来推断完成。

## 4. 媒体规范

后续媒体管线推荐使用以下层级：

```text
assets/
├── thumb/
├── display/
└── original/
```

媒体 manifest 推荐字段如下：

```json
{
  "id": "...",
  "src": "...",
  "thumbnail": "...",
  "alt": "...",
  "type": "...",
  "creator": "...",
  "rights": "...",
  "source": "..."
}
```

`thumb` 用于列表，`display` 用于页面展示，`original` 用于保留原始文件。目录层级不等于版权许可：来源、创作者、权利状态、展示许可、下载许可和后续再利用许可应分别记录。

本阶段只定义规范，不移动、重新编码或批量重命名大型图片、音频、PDF、字体或其他二进制资产。媒体搬迁应在独立 PR 中进行，并以文件计数、字节数和必要的哈希校验为验收依据。

## 5. 兼容与变更边界

第一阶段允许旧模块继续使用自包含 HTML 或历史目录，只要入口和 URL 继续有效。模块化重构应优先采用机械抽取，避免无关格式化、UI redesign、算法重写、密码机制改动、历史重写或框架引入。下一阶段可单独处理 `modules/europa/sinica.html` 的数据抽离和媒体管线。
