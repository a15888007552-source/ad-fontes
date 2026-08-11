const objectItems = [
  {
    src: "assets/photos/dudousai-drama-brick.webp",
    title: "丁都塞 · 戏曲雕砖",
    era: "戏曲 / 图像",
    tags: ["戏曲", "雕砖"],
    description: "这张照片先作为戏曲图像线索收录。砖面上的人物、动作和舞台感，把文字之外的表演记忆带进了展柜；具体时代、出土地和馆藏编号，等下一轮按现场展签继续核对。"
  },
  {
    src: "assets/photos/flute-maid-mural.webp",
    title: "吹排箫乐妓画",
    era: "乐舞图像",
    tags: ["排箫", "吹奏", "人物"],
    description: "画面中可以辨认出吹奏排箫的姿态。它让“音乐文物”不再只是器物本身，也包括身体、服饰、动作和演奏场景。本轮不凭照片把它硬认作某座墓葬或某件具体馆藏。"
  },
  {
    src: "assets/photos/xiaoduan-phoenix-crown.webp",
    title: "孝端皇后九龙九凤冠",
    era: "明 · 万历",
    tags: ["凤冠", "点翠", "花丝"],
    description: "这件凤冠属于明万历时期孝端皇后。中国国家博物馆官网介绍，它用漆竹扎成帽胎，前部饰九条金龙，下面有八只点翠金凤，冠后另有一只金凤，共同组成“九龙九凤”。冠上还使用了花丝、点翠、镶嵌、穿系等工艺。",
    sourceLabel: "查看国博馆藏条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/kgfjp/202111/t20211126_252409.shtml"
  },
  {
    src: "assets/photos/meiping.webp",
    title: "松石绿釉暗刻花卉纹梅瓶",
    era: "瓷器 · 器物",
    tags: ["梅瓶", "釉色", "花卉纹"],
    description: "这张照片保留了现场展签中的题名。松石绿釉、暗刻花卉纹和梅瓶的器形共同构成了它的第一层观看线索；具体朝代、尺寸和馆藏编号，后续再按官方目录逐项补齐。"
  },
  {
    src: "assets/photos/mengxi-bitan.webp",
    title: "《梦溪笔谈》",
    era: "北宋 · 沈括",
    tags: ["古籍", "知识史", "音律"],
    description: "中国国家博物馆官网介绍，《梦溪笔谈》是北宋沈括的著作，内容涉及天文、数学、物理、医药、工程技术等，也涉及音律与古器物学。它提醒我们，博物馆里的音乐史不只在乐器展柜，也在知识如何被记录和解释。",
    sourceLabel: "查看国博馆藏条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/gjwxbt/202203/t20220301_254035.shtml"
  },
  {
    src: "assets/photos/shanhaijing.webp",
    title: "《山海经》",
    era: "古籍 · 神话地理",
    tags: ["古籍", "神话", "地理"],
    description: "这张照片先作为文本与图像线索收录。它适合从神话地理、异域想象和古代知识分类的角度继续展开；本轮不把模糊展签直接升级成某一确定版本的结论。"
  },
  {
    src: "assets/photos/zuozhuan.webp",
    title: "《左传》",
    era: "古籍 · 史传",
    tags: ["史传", "礼乐", "制度"],
    description: "《左传》把历史叙事、政治制度和礼仪秩序编织在一起。放在这次国博参观里，它和青铜礼器、石磬、古代乐舞照片互相照应；具体刻本信息仍以照片展签和官方馆藏记录为准。"
  },
  {
    src: "assets/photos/chuci.webp",
    title: "《楚辞》",
    era: "古籍 · 诗歌",
    tags: ["歌辞", "诗歌", "文本"],
    description: "《楚辞》在这组照片里首先是一件被观看、被翻阅的古籍。它与歌辞、仪式、神话和声音想象之间的关系，适合在下一轮和《九歌》、戏曲文献一起展开；本轮先保留照片和题名。"
  },
  {
    src: "assets/photos/xiyuanlu.webp",
    title: "《洗冤录》",
    era: "古籍 · 法医学史",
    tags: ["古籍", "司法", "知识"],
    description: "这张照片记录了《洗冤录》在展柜中的书名和装帧。它属于古代知识史的一条支线：文本如何被整理、传抄和用于实际制度；具体版本信息暂不超出照片能够支持的范围。"
  },
  {
    src: "assets/photos/pottery-musicians.webp",
    title: "演奏陶俑",
    era: "唐 · 坐部伎",
    tags: ["陶俑", "乐队", "唐代"],
    description: "中国国家博物馆官网将这组陶俑介绍为唐代宫廷器乐演奏的“坐部伎”，一组六件，分别执琵琶、横笛、排箫、箜篌、笙与拍板。照片里的乐队因此不只是“唐代人物俑”，还是一组具体的器乐组合。",
    sourceLabel: "查看国博馆藏条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/kgfjp/202111/t20211116_252264.shtml"
  },
  {
    src: "assets/photos/baishi-daoren-gequ.webp",
    title: "《白石道人歌曲》",
    era: "南宋 · 姜夔",
    tags: ["词曲集", "乐谱", "指法"],
    description: "中国国家博物馆官网介绍，这是南宋姜夔的词、曲集。书中词句旁边注有乐谱，有的还注有弹奏时的指法；官网称它是现存宋代唯一有谱的词集。对这次参观来说，它是最直接的一条“纸上音乐”线索。",
    sourceLabel: "查看国博馆藏条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/gjwxbt/202203/t20220301_254048.shtml"
  },
  {
    src: "assets/photos/dou-e-yuan.webp",
    title: "《窦娥冤》",
    era: "元杂剧 · 戏曲",
    tags: ["元杂剧", "戏曲", "文本"],
    description: "《窦娥冤》把戏曲从舞台带进了古籍文献的观看现场。这里先以照片中的书名和展陈关系为主，不把版本、刊刻年代或具体馆藏号写成未经核对的确定事实。"
  },
  {
    src: "assets/photos/dong-xieyuan-xixiang.webp",
    title: "董谢元《西厢记诸宫调》",
    era: "金元 · 诸宫调",
    tags: ["诸宫调", "说唱", "叙事"],
    description: "“诸宫调”本身就把叙事、曲调和说唱联系在一起。这张照片适合成为后续戏曲专题的入口：从文献题名出发，继续追踪它怎样被唱、被讲、被改编。"
  },
  {
    src: "assets/photos/tiger-qing.webp",
    title: "虎纹特磬",
    era: "石 · 打击乐",
    tags: ["石磬", "八音", "虎纹"],
    description: "照片展签明确写出 Stone Qing（percussion instrument）。中国国家博物馆官网的石磬条目指出，石磬属于古代“八音”中的“石”，并在《周礼》《礼记》《左传》《国语》等先秦文献中都有记述。",
    sourceLabel: "查看国博石磬条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/kgfjp/202107/t20210728_250856.shtml"
  },
  {
    src: "assets/photos/xixiangji.webp",
    title: "《西厢记》",
    era: "戏曲 · 文本",
    tags: ["戏曲", "古籍", "舞台"],
    description: "《西厢记》与《西厢记诸宫调》并列出现在你的照片里，正好形成从文本、说唱到戏曲舞台的观看入口。本轮先保留题名和图像，具体版本信息下一轮再查。"
  },
  {
    src: "assets/photos/unknown-bronze-instrument.webp",
    title: "待核对 · 钟 / 铙类青铜器",
    era: "青铜 · 具体对象待核",
    tags: ["乳钉", "铭文", "待核"],
    description: "照片中可以看见乳钉、纹饰、铭文和带甬形制，具有青铜打击乐器的观看线索。但仅凭这一张照片还不足以确定它究竟是钟、铙、甬钟还是其他具体器物，所以本页只保留为“待核对”，不硬猜藏品名。"
  },
  {
    src: "assets/photos/tao-xun.webp",
    title: "陶埙",
    era: "土 · 吹奏乐器",
    tags: ["陶埙", "吹奏", "八音"],
    description: "陶埙把音乐线索从青铜与石头转向土与气息。中国国家博物馆相关文章提到，石磬、陶埙等乐器很早就出现在中国古代音乐文化中；照片中的具体年代和编号仍待按展签核对。",
    sourceLabel: "查看国博相关文章",
    sourceUrl: "https://www.chnmuseum.cn/yj/xscg/xslw/201812/t20181224_33141.shtml"
  },
  {
    src: "assets/photos/bronze-nao.webp",
    title: "青铜编铙",
    era: "金 · 打击乐器",
    tags: ["编铙", "青铜", "音程"],
    description: "中国国家博物馆官网介绍，青铜铙是中国古代较早出现的打击乐器之一，始见于商代后期，西周早期继续沿用，敲击时器口向上。官网还记录了三枚编铙之间的音程关系，说明它们可以形成有组织的音阶序列。",
    sourceLabel: "查看国博编铙条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/csp/202008/t20200826_247351.shtml"
  }
];

const grid = document.querySelector("#object-grid");
const count = document.querySelector("#object-count");
const dialog = document.querySelector("#object-dialog");
const dialogImage = document.querySelector("#dialog-image");
const dialogKicker = document.querySelector("#dialog-kicker");
const dialogTitle = document.querySelector("#dialog-title");
const dialogDescription = document.querySelector("#dialog-description");
const dialogTags = document.querySelector("#dialog-tags");
const dialogBoundary = document.querySelector("#dialog-boundary");
const dialogSource = document.querySelector("#dialog-source");

function renderCards() {
  count.textContent = `${objectItems.length} 张照片卡`;
  grid.innerHTML = objectItems.map((item, index) => `
    <button class="object-card" type="button" data-object-index="${index}" aria-label="打开 ${item.title} 的介绍">
      <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="object-image"><img src="${item.src}" alt="${item.title}" loading="lazy" /></span>
      <span class="object-caption"><span><h3>${item.title}</h3></span><small>${item.era}</small></span>
    </button>
  `).join("");

  grid.querySelectorAll("[data-object-index]").forEach((card) => {
    card.addEventListener("click", () => openObject(Number(card.dataset.objectIndex)));
  });
}

function openObject(index) {
  const item = objectItems[index];
  if (!item) return;
  dialogImage.src = item.src;
  dialogImage.alt = item.title;
  dialogKicker.textContent = item.era;
  dialogTitle.textContent = item.title;
  dialogDescription.textContent = item.description;
  dialogTags.innerHTML = item.tags.map((tag) => `<span>${tag}</span>`).join("");
  dialogBoundary.textContent = "图片：本人参观拍摄 · 文字：首轮离线整理 · 版本/编号信息以官网与现场展签为准";
  if (item.sourceUrl) {
    dialogSource.hidden = false;
    dialogSource.href = item.sourceUrl;
    dialogSource.textContent = `${item.sourceLabel}  ↗`;
  } else {
    dialogSource.hidden = true;
  }
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("close", () => {
  dialogImage.removeAttribute("src");
  dialogImage.alt = "";
  dialogKicker.textContent = "";
  dialogTitle.textContent = "";
  dialogDescription.textContent = "";
  dialogTags.replaceChildren();
  dialogBoundary.textContent = "";
  dialogSource.hidden = true;
  dialogSource.removeAttribute("href");
});

renderCards();
