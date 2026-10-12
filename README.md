# Ad Fontes · 溯源

一处音乐学的数字文献工坊。每一个模块是一件独立的研究工具,其中每一条史实、每一句判断都标注来源。名字取自文艺复兴人文主义者的口号 *ad fontes*——回到本源。

编者:辛申奥(陕西师范大学音乐学院)

## 模块

### 首页模块

编号与首页 `index.html` 一致。

| # | 模块 | 路径 | 说明 | 状态 |
|---|------|------|------|------|
| I | **Annales Musicorum · 欧罗巴 ↔ 华夏音乐家年鉴** | `modules/europa/` | 两部并列的交互年鉴，含声律物理实验室；欧罗巴卷据 Grout《西方音乐史》与 Taruskin《牛津西方音乐史》 | 已上线 |
| II | **Atlas Musicologicus · 音乐辞典星图** | 站外链接(不在本仓库) | 以辞典词条为入口的人物、作品、术语关系图谱 | 站外 |
| III | **Studia Busoniana · 布索尼专栏** | `modules/busoni/` | 布索尼研究合集,现收《布索尼美学·脉络与观念地图》,《肖像尝试》译注待补;内容加密,需密码访问 | 草稿 |
| IV | **Conventus Musicologicus Occidentalis · 西方音乐学会第八届年会数字纪要** | `modules/proceedings/` | 2026 北京年会的交互式纪要,可按主题、会期、会场、发言人检索 | 已上线 |
| V | **Musica Theorica · 乐理** | `modules/theory/` | 可听、可操作的音乐理论工坊,七条路径 | 已上线 |
| VI | **中国博物馆行记 · Museum Atlas** | `modules/museum-atlas/` | 按省份进入各馆专题(见下表) | 已上线 |

### 博物馆专题(经 Museum Atlas 进入)

据 `museum-registry.json`。

| 省份 | 博物馆 | 专题 | 路径 | 状态 |
|------|--------|------|------|------|
| 北京 | 故宫博物院 | — | — | 筹备中 |
| 北京 | 中国国家博物馆 | 文物卡片 | `guobo-museum/` | 已上线 |
| 陕西 | 西安碑林博物馆 | 石墨长安 · 数字档案 | `modules/beilin/` | 已上线 |
| 陕西 | 陕西考古博物馆 | 现场图录 | `modules/shaanxi-archaeology-museum/` | 已上线 |
| 陕西 | 陕西历史博物馆·秦汉馆 | 秦汉馆藏影录 | `modules/qinhan/` | 已上线 |
| 陕西 | 宝鸡青铜器博物院 | 青铜铸史,铭文为证 | `modules/baoji/` | 已上线 |
| 陕西 | 陕西历史博物馆 | 观物档案 | `modules/shaanxi-history/` | 已上线 |
| 陕西 | 西安博物院 | 观物档案 | `modules/xian-museum/` | 已上线 |
| 河南 | 洛阳博物馆 | — | — | 筹备中 |
| 河南 | 商丘博物馆 | 玄鸟生商 · 数字图录 | `modules/shangqiu-museum/` | 已上线 |
| 河南 | 河南博物院 | 华夏之中 · Central Plains Archive | `modules/henan-museum/` | 已上线 |

另有 `modules/tomb-trails/`(从地下到展柜 · 七馆墓葬与遗址历史脉络),作为嵌入组件出现在宝鸡、秦汉馆等专题页内,也可从 Museum Atlas 的「墓葬」入口打开。

### 未挂到首页的目录

| 路径 | 页面标题 | 备注 |
|------|----------|------|
| `modules/ethnomusicology/` | 民族音乐学年鉴 · Annales Ethnomusicologiae | 站内没有页面链接到它 |
| `modules/modules/beilin/` | 石墨长安 · 入口 | 旧的嵌套路径,`validate_modules.py` 标为 legacy |

## 结构

```
index.html                   厂牌门面
modules/
  europa/index.html          模块一(自包含单文件)
  museum-atlas/index.html     总馆入口
  beilin/index.html           碑林专题跳转入口
```

## 编辑原则

不收录无来源的断言。凡涉生卒、事件、评断,皆注明所据文献;存疑者标注争议,不替读者定谳。

## 待办

- [ ] 模块一逐条内容审校:100 人 bio 对照来源核对(独立一期)
- [ ] 将 `cite` 引注在页面上渲染为可见的规范引用
- [ ] 模块二:布索尼《肖像尝试》译注
- [x] 发布到 GitHub Pages
- [ ] 让仓库根目录默认指向总馆入口或专题首页

## 开发与质量

- [本地开发与 QA](docs/DEVELOPMENT.md)
- [研究完整性边界](docs/SCHOLARLY_INTEGRITY.md)

## 版权

版权所有 © 2026 辛申奥，保留所有权利。未经书面许可，不得转载、复制或改作本站原创内容；第三方图文的权利归原权利人。详见 [LICENSE](LICENSE)。
