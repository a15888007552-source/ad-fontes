# 年会纪要：数据、地址与保真检查

`modules/proceedings/` 仍是 GitHub Pages 可直接提供的静态应用。旧有六个视图和详情模板保留在 `app.js`，原样式在 `styles.css`；`bootstrap.js` 在外部 JSON 载入完成后只初始化一次。未启用 JavaScript 或载入失败时，页面提供相应说明与返回目录／重新载入入口。

## 数据分工

| 文件 | 内容与边界 |
| --- | --- |
| `data/conference.json` | 原会议字段、叙述和生成信息；`fieldOrder`、`recordOrder` 保存原顶层字段及全部记录的顺序。 |
| `data/presentations.json` | 原主旨与分会场发言，保留全部字段，包括暂未显示的字段。 |
| `data/posters.json` | 原展板记录；不补写缺失会期，不把展板重新归为发言。 |
| `data/sessions.json` | 原日历显示分组的记录引用，不是重新编定的学术场次。 |
| `data/speakers.json` | 原署名记录的引用，不进行人物同名合并、拆名或身份推断。 |
| `data/media.json` | 原照片序列与 `IMAGES` 映射。保持映射，避免原缩略图逻辑退回不存在的目录。 |

`data-loader.js` 校验分区、旧 ID、记录顺序和引用关系，并重组原 `SITE_DATA`、`IMAGES`。运行时从上述文件读取学术正文；日程与署名索引仅持有记录 ID。具体数量和保真指纹以 `baseline.manifest.json` 为准，不另建手工统计表。总馆的发言／展板数量直接校验上述两个数组的长度。

`t194` 原本不存在；`t219` 原本没有会期，仍保留为可寻址展板和署名记录，不强行纳入日程组。

## 稳定地址

地址以该模块入口为基准：

```text
#view=overview
#view=all
#presentation=t000
#poster=t140
#poster=t219
#session=session-t000
#speaker=speaker-t000
```

`routes.js` 集中解析和序列化单个路由键；`reader-routes.js` 在数据就绪后检查 ID 并恢复界面。记录 ID 仍取自原资料；日程分组用其首条原记录生成稳定引用 ID，署名记录用其所属原记录生成引用 ID。未知 ID 显示可恢复错误，不补造档案。主动操作写入浏览器历史；刷新与前进后退通过同一个恢复入口处理。

检索与原有分类筛选继续使用原逻辑。新增复制链接、阅读打印和键盘定位属于界面层，不修改摘要、述要、署名、日期、会场或来源说明。

## 校验与浏览器验收

在仓库根目录运行：

```sh
node scripts/validate_proceedings_baseline.mjs
node scripts/extract_proceedings_data.mjs --check
node scripts/test_proceedings_bootstrap.mjs
node --test scripts/test_proceedings_routes.mjs
python -B scripts/build_site_catalog.py --check
```

基线同时核对完整语义数据、规范化文本、全部旧 ID 与原顺序、媒体路径、原来源说明、页面挂载点、六个视图、全部详情及固定检索结果。`--check-source` 是拆分前 A／B 阶段的额外源码指纹检查；页面外置后应使用默认保真检查，不能因为结构变更而重新生成基线。

提取脚本的 `--write` 仅用于首次从原始页面生成数据，拒绝覆盖已有数据。物理 CRLF／LF 差异不改变 JSON 字符串内容；格式检查只统一文件换行，完整数据校验不会因此放宽。

统一浏览器入口可加入 `--proceedings`：

```sh
python -B scripts/smoke_site_research.py --proceedings --output <报告目录>
```

该入口使用现有 Playwright／Chromium，不安装依赖。也可把 `scripts/smoke_proceedings.py` 的 `run_proceedings_smoke(page, base_url)` 放入调用方已经打开的浏览器中。基线失败必须先定位原因；不能通过重建指纹、删除断言或改写材料使工程重构“通过”。将来真正修订学术内容时，应另行审查内容差异，再明确更新相关基线。
