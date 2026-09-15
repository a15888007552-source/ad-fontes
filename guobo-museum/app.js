const objectItems = [
  {
    id: "guobo-dudousai-drama-brick",
    src: "assets/photos/dudousai-drama-brick.webp",
    title: "丁都塞 · 戏曲雕砖",
    era: "戏曲 / 图像",
    tags: ["戏曲", "雕砖"],
    description: "砖面上的人物、动作与舞台感，把文字之外的表演记忆带进了展柜。戏曲雕砖多出于宋金墓葬，是戏曲在文本之外留下的图像证据；这件砖的年代与出土地，现场未能录全。"
  },
  {
    id: "guobo-flute-maid-mural",
    src: "assets/photos/flute-maid-mural.webp",
    title: "吹排箫乐妓画",
    era: "乐舞图像",
    tags: ["排箫", "吹奏", "人物"],
    description: "画面中央是一位吹奏排箫的乐妓，衣饰、姿态与乐器构成完整的演奏场景。音乐文物不只有乐器本身，也包括身体与动作——这幅画的墓号与馆藏号，现场未能录全。"
  },
  {
    id: "guobo-xiaoduan-phoenix-crown",
    src: "assets/photos/xiaoduan-phoenix-crown.webp",
    title: "孝端皇后九龙九凤冠",
    era: "明 · 万历",
    tags: ["凤冠", "点翠", "花丝"],
    description: "明万历孝端皇后的凤冠。帽胎以漆竹扎成，前部饰九条金龙，下缀八只点翠金凤，冠后另有一只金凤，合成“九龙九凤”；工艺集花丝、点翠、镶嵌与穿系于一身。",
    sourceLabel: "查看国博馆藏条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/kgfjp/202111/t20211126_252409.shtml"
  },
  {
    id: "guobo-turquoise-meiping",
    src: "assets/photos/meiping.webp",
    title: "松石绿釉暗刻花卉纹梅瓶",
    era: "瓷器 · 器物",
    tags: ["梅瓶", "釉色", "花卉纹"],
    description: "小口、丰肩、敛足，是梅瓶的典型器形；松石绿釉为地，其上暗刻花卉纹。釉色与刻花如何配合，是这件瓶最直接的观看线索。"
  },
  {
    id: "guobo-mengxi-bitan",
    src: "assets/photos/mengxi-bitan.webp",
    title: "《梦溪笔谈》",
    era: "北宋 · 沈括",
    tags: ["古籍", "知识史", "音律"],
    description: "北宋沈括的笔记，内容横跨天文、数学、物理、医药与工程技术，也记音律与古器物。音乐史不只在乐器展柜里，也在知识如何被记录、被传抄。",
    sourceLabel: "查看国博馆藏条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/gjwxbt/202203/t20220301_254035.shtml"
  },
  {
    id: "guobo-shanhaijing",
    src: "assets/photos/shanhaijing.webp",
    title: "《山海经》",
    era: "古籍 · 神话地理",
    tags: ["古籍", "神话", "地理"],
    description: "神话地理的总集，山川、异族、神祇与物产按方位铺开，同时是一部古代知识分类的样本。"
  },
  {
    id: "guobo-zuozhuan",
    src: "assets/photos/zuozhuan.webp",
    title: "《左传》",
    era: "古籍 · 史传",
    tags: ["史传", "礼乐", "制度"],
    description: "编年史，把历史叙事、政治制度与礼仪秩序编织在一起，也是先秦礼乐材料的重要来源。与同场展出的青铜礼器、石磬、乐舞图像互为注脚。"
  },
  {
    id: "guobo-chuci",
    src: "assets/photos/chuci.webp",
    title: "《楚辞》",
    era: "古籍 · 诗歌",
    tags: ["歌辞", "诗歌", "文本"],
    description: "屈原与宋玉一系的歌辞总集，《九歌》《招魂》把祭祀、乐舞与声音想象写进了文本。它与展厅里的乐器、乐舞图像，是同一件事的两面。"
  },
  {
    id: "guobo-xiyuanlu",
    src: "assets/photos/xiyuanlu.webp",
    title: "《洗冤录》",
    era: "古籍 · 法医学史",
    tags: ["古籍", "司法", "知识"],
    description: "南宋宋慈的法医学著作，验伤、验尸与断案的程序被写成可操作的条文，此后沿用数百年。它显示文本如何被整理、传抄，并直接进入制度运作。"
  },
  {
    id: "guobo-pottery-musicians",
    src: "assets/photos/pottery-musicians.webp",
    title: "演奏陶俑",
    era: "唐 · 坐部伎",
    tags: ["陶俑", "乐队", "唐代"],
    description: "唐代宫廷器乐演奏的“坐部伎”，一组六件，分别执琵琶、横笛、排箫、箜篌、笙与拍板。六件合起来是一支完整的乐队编制，比单看“唐代人物俑”具体得多。",
    sourceLabel: "查看国博馆藏条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/kgfjp/202111/t20211116_252264.shtml"
  },
  {
    id: "guobo-baishi-daoren-gequ",
    src: "assets/photos/baishi-daoren-gequ.webp",
    title: "《白石道人歌曲》",
    era: "南宋 · 姜夔",
    tags: ["词曲集", "乐谱", "指法"],
    description: "南宋姜夔的词曲集。词句旁注有乐谱，部分还标注弹奏指法，是现存宋代唯一有谱的词集——这批照片里最直接的一条“纸上音乐”线索。",
    sourceLabel: "查看国博馆藏条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/gjwxbt/202203/t20220301_254048.shtml"
  },
  {
    id: "guobo-dou-e-yuan",
    src: "assets/photos/dou-e-yuan.webp",
    title: "《窦娥冤》",
    era: "元杂剧 · 戏曲",
    tags: ["元杂剧", "戏曲", "文本"],
    description: "关汉卿的杂剧，戏曲史与法制史都会引到的一部作品。展柜里的这一册，是它作为文献存在的样子：剧词离开舞台，变成可以翻阅、校勘的文本。"
  },
  {
    id: "guobo-dong-xieyuan-xixiang",
    src: "assets/photos/dong-xieyuan-xixiang.webp",
    title: "董解元《西厢记诸宫调》",
    era: "金元 · 诸宫调",
    tags: ["诸宫调", "说唱", "叙事"],
    description: "诸宫调把叙事、曲调与说唱合为一体，是元杂剧之前最重要的一种说唱形式。董解元这一本是《西厢记》故事的早期长篇版本，后来的杂剧与传奇都从它长出来。"
  },
  {
    id: "guobo-tiger-qing",
    src: "assets/photos/tiger-qing.webp",
    title: "虎纹特磬",
    era: "石 · 打击乐",
    tags: ["石磬", "八音", "虎纹"],
    description: "石磬属古代“八音”中的“石”，器身刻虎纹。《周礼》《礼记》《左传》《国语》等先秦文献中都有关于磬的记述。",
    sourceLabel: "查看国博石磬条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/kgfjp/202107/t20210728_250856.shtml"
  },
  {
    id: "guobo-xixiangji",
    src: "assets/photos/xixiangji.webp",
    title: "《西厢记》",
    era: "戏曲 · 文本",
    tags: ["戏曲", "古籍", "舞台"],
    description: "王实甫的杂剧，与同场的《西厢记诸宫调》并列陈列，正好呈现同一个故事从说唱到戏曲舞台的两次改写。"
  },
  {
    id: "guobo-unknown-bronze-instrument",
    src: "assets/photos/unknown-bronze-instrument.webp",
    title: "钟 / 铙类青铜器",
    era: "青铜 · 打击乐器",
    tags: ["乳钉", "铭文", "青铜"],
    description: "器身带甬，饰乳钉纹，并有铭文，属钟、铙一类的青铜打击乐器。甬钟、编钟还是铙，需回看展签才能定；完整器名现场未录。"
  },
  {
    id: "guobo-tao-xun",
    src: "assets/photos/tao-xun.webp",
    title: "陶埙",
    era: "土 · 吹奏乐器",
    tags: ["陶埙", "吹奏", "八音"],
    description: "陶埙把音乐线索从青铜与石头转向土与气息。石磬、陶埙这类乐器很早就出现在中国古代音乐文化中；埙的音孔数目随时代增加，音域也随之扩展。",
    sourceLabel: "查看国博相关文章",
    sourceUrl: "https://www.chnmuseum.cn/yj/xscg/xslw/201812/t20181224_33141.shtml"
  },
  {
    id: "guobo-bronze-nao",
    src: "assets/photos/bronze-nao.webp",
    title: "青铜编铙",
    era: "金 · 打击乐器",
    tags: ["编铙", "青铜", "音程"],
    description: "铙是中国较早出现的青铜打击乐器，始见于商代后期，西周早期仍在沿用，敲击时器口朝上。这三枚之间构成确定的音程关系，说明当时已能组织出音阶序列。",
    sourceLabel: "查看国博编铙条目",
    sourceUrl: "https://www.chnmuseum.cn/zp/zpml/csp/202008/t20200826_247351.shtml"
  }
];

const objectById = new Map(
  objectItems.map((item) => [String(item.id), item]),
);

const grid = document.querySelector("#object-grid");
const count = document.querySelector("#object-count");
const dialog = document.querySelector("#object-dialog");
const dialogClose = document.querySelector(".dialog-close");
const dialogImage = document.querySelector("#dialog-image");
const dialogKicker = document.querySelector("#dialog-kicker");
const dialogTitle = document.querySelector("#dialog-title");
const dialogDescription = document.querySelector("#dialog-description");
const dialogTags = document.querySelector("#dialog-tags");
const dialogBoundary = document.querySelector("#dialog-boundary");
const dialogSource = document.querySelector("#dialog-source");
const opening = document.querySelector("#opening");
const skipOpening = document.querySelector("#skip-opening");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionAllowed = !reducedMotion && !navigator.connection?.saveData;
let openingClosed = false;
let openingLeaveTimer;
let openingFinishTimer;
let lastFocusedElement = null;
let restoreFocusAfterDialogClose = true;

function getItemFromLocation() {
  const id = new URLSearchParams(window.location.search).get("item");
  return id && objectById.has(id) ? id : null;
}

function syncItemToUrl(id) {
  const url = new URL(window.location.href);
  const current = url.searchParams.get("item");

  if (id) {
    const next = String(id);
    if (current === next) return;
    url.searchParams.set("item", next);
  } else {
    if (!current) return;
    url.searchParams.delete("item");
  }

  window.history.pushState(
    { item: id ? String(id) : null },
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function setOpeningComplete({ markSeen = true } = {}) {
  document.body.classList.remove("guobo-intro-active");
  document.documentElement.classList.remove("guobo-intro-live");
  document.documentElement.classList.add("guobo-intro-complete");
  if (markSeen) {
    try {
      sessionStorage.setItem("guobo-intro-seen", "1");
    } catch {
      // A blocked sessionStorage should not prevent the page from opening.
    }
  }
}

function removeOpening({ markSeen = true } = {}) {
  opening?.remove();
  setOpeningComplete({ markSeen });
  document.removeEventListener("keydown", handleOpeningKeydown, true);
}

function closeOpening() {
  if (!opening || openingClosed) return;
  openingClosed = true;
  window.clearTimeout(openingLeaveTimer);
  window.clearTimeout(openingFinishTimer);
  opening.classList.add("is-leaving");
  opening.setAttribute("aria-hidden", "true");
  setOpeningComplete();
  window.setTimeout(removeOpening, motionAllowed ? 1120 : 40);
}

function handleOpeningKeydown(event) {
  if (event.key === "Escape") closeOpening();
}

function setupOpening() {
  if (!opening) return;

  const forceOpening = new URLSearchParams(window.location.search).get("intro") === "1";
  const seen = sessionStorage.getItem("guobo-intro-seen");
  if (!motionAllowed || (!forceOpening && seen)) {
    removeOpening();
    return;
  }

  const isMobile = window.innerWidth <= 720;
  const leaveAt = isMobile ? 760 : 1050;
  const finishAt = isMobile ? 1720 : 2150;
  document.documentElement.classList.add("guobo-intro-live");
  document.body.classList.add("guobo-intro-active");
  skipOpening?.addEventListener("click", closeOpening);
  opening.addEventListener("click", (event) => {
    if (event.target === opening) closeOpening();
  });
  document.addEventListener("keydown", handleOpeningKeydown, true);
  window.requestAnimationFrame(() => skipOpening?.focus({ preventScroll: true }));
  openingLeaveTimer = window.setTimeout(() => opening.classList.add("is-leaving"), leaveAt);
  openingFinishTimer = window.setTimeout(removeOpening, finishAt);
}

const initialItem = getItemFromLocation();
if (initialItem) removeOpening({ markSeen: false });
else setupOpening();

function renderCards() {
  count.textContent = `${objectItems.length} 张照片卡`;
  grid.innerHTML = objectItems.map((item, index) => `
    <button class="object-card" type="button" data-object-id="${item.id}" aria-label="打开 ${item.title} 的介绍">
      <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="object-image"><img src="${item.src}" alt="${item.title}" loading="lazy" /></span>
      <span class="object-caption"><span><h3>${item.title}</h3></span><small>${item.era}</small></span>
    </button>
  `).join("");

  grid.querySelectorAll("[data-object-id]").forEach((card) => {
    card.addEventListener("click", () => openObject(card.dataset.objectId, {
      syncUrl: true,
      focusClose: true,
      rememberFocus: true,
    }));
  });
}

function openObject(
  id,
  {
    syncUrl = false,
    focusClose = true,
    rememberFocus = true,
  } = {},
) {
  const item = objectById.get(String(id));
  if (!item) return false;
  const dialogAlreadyOpen = dialog.open || dialog.hasAttribute("open");
  if (rememberFocus) lastFocusedElement = document.activeElement;
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
  if (!dialogAlreadyOpen) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  if (focusClose) dialogClose.focus();
  if (syncUrl) syncItemToUrl(item.id);
  return true;
}

function clearDialogFields() {
  dialogImage.removeAttribute("src");
  dialogImage.alt = "";
  dialogKicker.textContent = "";
  dialogTitle.textContent = "";
  dialogDescription.textContent = "";
  dialogTags.replaceChildren();
  dialogBoundary.textContent = "";
  dialogSource.hidden = true;
  dialogSource.removeAttribute("href");
}

function finishDialogClose() {
  clearDialogFields();
  if (
    restoreFocusAfterDialogClose &&
    lastFocusedElement?.isConnected &&
    typeof lastFocusedElement.focus === "function"
  ) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
  restoreFocusAfterDialogClose = true;
}

function closeObject({ syncUrl = false, restoreFocus = true } = {}) {
  const dialogIsOpen = dialog.open || dialog.hasAttribute("open");
  if (!dialogIsOpen) {
    lastFocusedElement = null;
    restoreFocusAfterDialogClose = true;
    return false;
  }
  restoreFocusAfterDialogClose = restoreFocus;
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
    finishDialogClose();
  }
  if (syncUrl) syncItemToUrl(null);
  return true;
}

dialogClose.addEventListener("click", () => {
  closeObject({
    syncUrl: true,
    restoreFocus: true,
  });
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    closeObject({
      syncUrl: true,
      restoreFocus: true,
    });
  }
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeObject({
    syncUrl: true,
    restoreFocus: true,
  });
});
dialog.addEventListener("close", () => {
  finishDialogClose();
});
window.addEventListener("popstate", () => {
  lastFocusedElement = null;
  restoreFocusAfterDialogClose = false;
  const id = getItemFromLocation();
  if (id) {
    openObject(id, {
      syncUrl: false,
      focusClose: false,
      rememberFocus: false,
    });
  } else {
    closeObject({
      syncUrl: false,
      restoreFocus: false,
    });
  }
});

renderCards();
if (initialItem) {
  openObject(initialItem, {
    syncUrl: false,
    focusClose: false,
    rememberFocus: false,
  });
}
