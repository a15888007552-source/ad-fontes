# 模块元数据与静态馆藏目录

`module.json` 是总馆、完整 Finding Aid 和 README 模块表的共同事实来源。生成器不改写模块正文，也不需要浏览器、服务器、第三方 Python 包或前端构建工具。

## 正式模块与编号

发现范围为 `modules/*/module.json` 和根目录下的 `*/module.json`。后者保留中国国家博物馆现有的 `guobo-museum/index.html` 地址，不搬迁页面。直接含 `index.html` 的模块目录、以及 `museum-registry.json` 中有正式入口的已开放博物馆，必须有元数据；删除元数据不能使页面悄悄从验证范围消失。

七个总馆入口保留 I—VII；中国博物馆行记为 VI，各独立馆藏和跨馆专题使用 VI 的子编号。首批子编号按现有 museum registry 的已开放省份及馆序分配，墓葬与遗址专题附后。编号分配后作为稳定目录编号保存，不因排序或新增馆藏而重新编号。

`home: true` 且 `parent: null` 表示总馆入口；子模块设置 `home: false` 和已有顶层模块的 `parent` id。完整目录列出全部正式模块。故宫、洛阳等尚无正式专题入口的筹备卡片不是已开放模块；旧 `modules/modules/beilin/` 是兼容地址，不另立编号。宝鸡的青铜器用图谱保持模块内 `chapters`，不重复计为独立分馆。

## Schema

规范见 `schemas/module.schema.json`。`scripts/build_site_catalog.py` 直接读取该规范，以 Python 标准库验证其中实际使用的 JSON Schema 关键字：`type`、`required`、`properties`、`additionalProperties`、`enum`、`pattern`、`minLength`、`minItems`、`minimum`、`uniqueItems`、`items` 和日期 `format`。如修改规范而引入其他关键字，应先补充验证器和测试。

| 字段 | 约定 |
| --- | --- |
| `id` | 与所属目录名一致的小写稳定标识；全站唯一。 |
| `number` | 稳定罗马数字主编号或主编号加数字子编号；全站唯一。 |
| `title`, `latinTitle`, `subtitle` | 模块标题、已有拉丁标题、短副标题。没有独立拉丁标题时用空字符串，不造译名。 |
| `description` | 同时用于首页、Finding Aid 和 README 的范围说明。不得把未实现功能写成已有能力。 |
| `route` | 仓库根目录相对地址；不带 `/ad-fontes/` 前缀。文件或含 `index.html` 的目录必须存在。 |
| `type` | `research-tool`、`proceedings`、`atlas`、`catalog`、`tool`。 |
| `status` | `active` 已开放；`expanding` 已开放且持续增补；`archived` 归档；`experimental` 试验性。与访问限制分别记录。 |
| `access` | `public` 公开；`password-protected` 密码访问；`remote-service` 远程服务入口；`partial` 部分公开。远程入口不等于远程服务在线。 |
| `home`, `parent` | 首页展示与目录层级；不复制一套首页文案。 |
| `materialTypes`, `sourceBasis` | 材料类型与来源基础。受保护模块仅使用已有公开说明，不公开受保护内容。 |
| `corpusCounts` | 带清楚计数口径的非负整数映射。没有可复核数量时用 `{}`，目录不显示数量栏。 |
| `countSources` | 每项数量的仓库相对 JSON `file` 与 JSON Pointer `pointer`；指向数组或对象，生成器计算长度并与数量核对。空 pointer 表示 JSON 根。 |
| `contentRevision` | 学术内容的实际修订日期 `YYYY-MM-DD`，无可核证记录时必须为 `null`，公开显示“未标注（待核定）”。 |
| `interfaceRevision` | 界面、路由、元数据目录或工程结构的实际修订日期 `YYYY-MM-DD`。 |
| `maintainer`, `citation` | 维护者与可复用推荐引用。引用说明要求读者另记访问日期，不自动嵌入构建日期。 |
| `version`, `entry` | 保留既有版本与模块相对入口；`entry` 必须与 `route` 指向同一个文件。 |
| `dataVersion`, `chapters` | 可选兼容字段。旧数据版本不等于整个模块的内容修订；章节入口也验证存在性。 |

日期必须是实际存在的公历日期；CSS、导航、深链接或元数据改动不能更新 `contentRevision`。本次统一目录的界面修订为 2026-08-30，而非任务标题中的未来日期。乐理页原有“第三稿 · 2026-08-09”明确标记内容稿次，保留为该模块内容日期；其他模块没有同等明确的学术修订日期，故为 `null`。不以 Git 提交时间、图片拍摄时间、`generated_at`、`dataVersion` 或界面日期代替学术内容日期。

首批数量口径刻意区分：作品档案与版本记录不是全部作品数量；秦汉和宝鸡的“图像分组”不是文物总数；墓葬与遗址的“馆别关联记录”不声称互不重复的遗址数量。未接入结构化来源的旧页面宣传数字不复制进新目录。现有数据文件和学术文本均不因目录建设而改写。

## 生成与检查

在仓库根目录执行：

```sh
python scripts/build_site_catalog.py
python scripts/build_site_catalog.py --check
python scripts/validate_modules.py
python -B -m unittest discover -s scripts -p test_site_catalog.py
```

第一条只替换以下明确标记的区域。区域之外的字节、换行与手工设计保留；同一元数据生成结果确定性稳定，不读取当前时间。

| 目标 | 区域标记名称 |
| --- | --- |
| `index.html` | `home-modules`、`site-revision` |
| `modules/index.html` | `module-catalog` |
| `README.md` | `readme-modules` |

每个区域使用且仅使用一对 `<!-- BEGIN GENERATED: 名称 -->` 与 `<!-- END GENERATED: 名称 -->`。缺失、重复或倒序标记属于错误，不自动寻找近似边界。站点页脚的界面日期取模块 `interfaceRevision` 的最大值，不代表所有学术内容同时修订。

`--check` 不写文件。元数据非法、编号或地址重复、来源数量过期、入口缺失或生成区域未更新，均返回非零。`validate_modules.py` 保留为只检查元数据的兼容命令，复用同一验证器。CI 的 `Site research checks` 工作流执行目录单元测试与 `--check`，无需安装新框架。
