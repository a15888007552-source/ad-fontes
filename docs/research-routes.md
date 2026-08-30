# 可引用的研究地址

欧罗巴保留原有 `#m=<人物ID>` 与 `#v=<视图ID>`。作品和子档案由同一个解析、序列化与恢复入口管理，不改变研究 JSON 中的 ID 或档案内容。

```text
modules/europa/#m=buso
modules/europa/#v=musio
modules/europa/#work=work%3Abuso-doktor-faust
modules/europa/#work=work%3Abuso-doktor-faust&archive=versions
modules/europa/#work=work%3Abuso-doktor-faust&archive=fontes
modules/europa/#work=work%3Abuso-doktor-faust&archive=performances
modules/europa/#work=work%3Abuso-doktor-faust&archive=recordings
modules/europa/#work=work%3Abuso-doktor-faust&archive=reception
```

五类子档案与作品总览合为六种档案状态。`item` 仅使用当前 JSON 中属于该作品、该档案的既有实体 ID，例如在版本地址后添加 `&item=version%3Abuso-doktor-faust-authorial-1916-1924`。复制控件会生成规范地址；未经编码的冒号地址也能解析。

主动导航在界面成功打开后 `pushState`；首次恢复、地址规范化及历史恢复使用 `replaceState`。关闭依次返回子档案的作品、作品所属人物、原顶层视图。刷新和浏览器前进后退使用同一恢复流程。人物及顶层视图不等待无关研究 JSON，作品则等待其所需数据。

不存在的作品／人物显示可恢复错误；未知档案类别返回作品，未知条目返回所属档案并解释原因。剪贴板不可用时提供可选择的地址输入框，不调用警告弹窗。条目定位尊重减少动态效果偏好。

```sh
node --test scripts/test_europa_routes.mjs
```

真实浏览器检查复用 `scripts/smoke_europa_routes_browser.py` 的 `run_europa_smoke(page, base_url)`；调用方拥有浏览器，不为每个地址重复启动浏览器。该函数覆盖异步数据、历史、错误、复制后新上下文打开、桌面与移动视图。测试使用公共研究数据，不涉及布索尼受保护正文。
