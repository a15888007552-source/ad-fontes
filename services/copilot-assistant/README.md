# Ad Fontes Copilot Assistant

这是一个只读的站内研究助手后端：它从公开的 Ad Fontes 页面检索相关段落，再把这些段落交给 GitHub Copilot SDK，最后返回回答和来源链接。

## 本地启动

要求 Node.js `>=22.12.0`。

```powershell
cd D:\Documents-Offload\website\services\copilot-assistant
npm install
Copy-Item .env.example .env
npm start
```

如果当前机器已经通过 Copilot CLI 登录，SDK 可以使用本地登录状态。也可以把 `COPILOT_GITHUB_TOKEN` 放在本机 `.env` 中；不要把 Token 写进前端或提交到 Git。

健康检查：`http://127.0.0.1:8787/api/health`

请求示例：

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8787/api/chat `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{"message":"本站有哪些模块？"}'
```

## 资料边界

服务只索引首页、欧罗巴年鉴、年会纪要、乐理、音乐哲学和 Archaeological Provenance 六个公开入口；密码访问的 Busoni 模块和本地工作区不会被加入语料。

Copilot 会话禁用文件、Shell、网络、MCP 和记忆操作，只接受站内材料作为回答依据。它是研究导览，不替代对原始文献和页面出处的核对。

## 接入静态页面

静态页面可以加载 `shared/css/ad-fontes-assistant.css` 和 `shared/js/ad-fontes-assistant.js`。本地运行时，脚本默认请求 `http://127.0.0.1:8787/api/chat`；公开 GitHub Pages 页面只有在配置好 HTTPS 后端地址后才启用聊天入口。
