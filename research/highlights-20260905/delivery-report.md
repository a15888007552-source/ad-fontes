# 七馆重点文物交付记录

工作树：`D:\Documents-Offload\website-henan-release`；分支 `main`；起点 `96c91dc8`。未提交、推送、合并或部署。河南馆正文与中国国家博物馆文件未改。

## 最终采用范围

用户在本轮明确要求停止核验、直接采用编辑稿，并同意缺图先展示文字、随后补图。这条新指令取代原先“待核不展示”的门槛；原审计结论没有改成全部通过。

- 105篇全部采用，七馆各15篇。
- 56篇结合现有图片；49篇使用独立文字条目，标明暂无对应照片，不借用同名异物或把组合展柜重命名成单件。
- 此前实际核验通过24篇；其余81篇采用依据是本轮用户授权，字段记录为 `editorial_accepted` / `user_approved`，不是原件身份已核。
- 缺图清单分20项未找到本件图、29项已有相关图但未直接使用。详见 `missing-photos.md`。
- 原1006条跨馆记录及原ID、深链接、图片路径保留；新增49条文字介绍索引，总计1055条档案记录。这个数字不是独立实物件数。

## 页面行为

各馆默认前6项，查看全部重点入口为15项；普通条目保留。考古馆沿用12条分页，全部重点分12+3条。已有图片继续使用各馆原媒体解析及加载方式。缺图介绍不发起图片请求。

文物介绍、资料链接和文字详情深链接已接入。原件与复制品、拓本与原碑、展柜组合存在差异时，采用单独文字介绍，保留原有记录和影像。秦汉馆组合未硬改名。

## 实际浏览器结果

使用已有in-app浏览器，本地预览端口8766，未启动第二个Chrome。桌面1440×900、手机390×844。

最终指令变更后已实测：
- 七馆各显示6个重点标记，并有查看全部重点（15）入口。
- 考古馆全部重点分页12+3，文字详情可点击打开。
- 商丘新增玄鸟条目能通过关键词找到；无意义查询保持空列表；清空恢复默认。
- 总馆能搜索李寿石椁，结果无伪造图片，点击进入碑林独立文字详情深链接。
- 文字详情桌面及手机实际截图已保存。

此前的有图记录回归还覆盖：曹全碑原碑/拓本区分、已核别名、陕历博精确名和器类交叉查询、普通黑釉兔毫盏搜索、详情图片、Esc关闭返回、排序后清空恢复。原始浏览器记录保留两阶段记录，最终字段 `revision=user-approved-all` 为本轮最新结果。即时读取早于防抖触发的尝试不计通过，以后续读取为准。

没有声称105个详情逐一做过浏览器验收，也未对每条外部链接做可用性全检。

## 验证及已知限制

定向静态验证通过：9个JavaScript文件语法、105条采用、各馆15条、前6项、无结果、文字查询、索引联合键去重、原1006条ID/图片路径/深链接保留。结果见 `static-validation.json`。

原有 `scripts/qa.mjs` 注册表测试固定要求10馆，当前注册表已有11馆；运行该测试报错，继而使依赖注册表上下文的索引测试无法执行。已确认“10馆”断言在起点提交已存在，属于 PREEXISTING_UNRELATED_FAILURE；没有借本轮修改注册表或其他馆。另在西安浏览器交互中观察到MutationObserver错误，未将本轮验收写成“控制台零错误”。

文字条目没有伪造器类、材质、尺寸、收藏单位或图像；尚无可绑定类别时不会混入特定器类筛选。全部重点及关键词检索可访问。

## 维护方式

`publication-approval.json`记录本轮采用授权与照片/文字模式；四份审计文件保留事实依据及原缺口。`scripts/sync-museum-highlights.mjs`生成公开编辑数据与总馆增量索引，可重复执行，撤销的本轮字段会恢复到保留的原字段，不回退整个索引。

## 修改文件

- `app.js`
- `data/artifact-groups.json`
- `modules/baoji/app.js`
- `modules/baoji/index.html`
- `modules/beilin/index.html`
- `modules/museum-atlas/index.html`
- `modules/museum-atlas/search-index.json`
- `modules/qinhan/app.js`
- `modules/qinhan/index.html`
- `modules/shaanxi-archaeology-museum/index.html`
- `modules/shaanxi-archaeology-museum/photo-catalog.js`
- `modules/shaanxi-history/app.js`
- `modules/shaanxi-history/index.html`
- `modules/shangqiu-museum/app.js`
- `modules/shangqiu-museum/index.html`
- `modules/xian-museum/app.js`
- `modules/xian-museum/index.html`
- `scripts/qa.mjs`
- `shared/js/museum-highlights.js`
- `shared/js/museum-highlights-data.js`
- `shared/css/museum-highlights.css`
- `scripts/sync-museum-highlights.mjs`

交付资料：`matching-results-105.md/.json`、`missing-photos.md`、`static-validation.json`、`browser/`。
