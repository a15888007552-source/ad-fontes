# 商丘博物馆数字图录

本模块以商丘博物馆与八关斋现场记录为基础，完成单页展览、镇馆之宝横向画廊、84 件（组）藏品目录和双段文物讲解。

- 使用 302 张有效现场照片；误拍的 `DSC_5478.JPG`、`DSC_5479.JPG` 已排除。
- 商丘博物馆馆藏与八关斋馆外遗存分章呈现。
- `data/catalog.js` 保存题名、年代、分类、照片范围和已确认事实字段。
- `data/content-prehan.js`、`data/content-han.js`、`data/content-late.js` 保存 84 条双段讲解，`data/content.js` 负责合并。
- `data/photo-manifest.js` 由 `tools/build_shangqiu_museum_assets.py` 生成。
- 网页图与缩略图均由原片派生，不覆盖 `C:\图片` 中的文件。
- 图片来源与许可记录见 `ASSET_CREDITS.md`。

本地预览必须通过 HTTP 服务器打开。Windows 下可双击 `打开商丘博物馆网站.cmd`，默认地址为 `http://127.0.0.1:8023/modules/shangqiu-museum/`。
