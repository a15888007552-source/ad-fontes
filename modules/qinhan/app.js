const state = {
  data: null,
  query: "",
  category: "全部",
  featuredOnly: false,
  visible: 12,
  activeGroup: null,
};

const elements = {
  grid: document.querySelector("#archive-grid"),
  status: document.querySelector("#archive-status"),
  count: document.querySelector("#archive-count"),
  filters: document.querySelector("#category-filters"),
  search: document.querySelector("#archive-search"),
  featured: document.querySelector("#featured-only"),
  loadMore: document.querySelector("#load-more"),
  dialog: document.querySelector("#archive-dialog"),
  dialogImage: document.querySelector("#dialog-image"),
  dialogKicker: document.querySelector("#dialog-kicker"),
  dialogSpecial: document.querySelector("#dialog-special"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogSummary: document.querySelector("#dialog-summary"),
  dialogInterpretation: document.querySelector("#dialog-interpretation"),
  dialogLabel: document.querySelector("#dialog-label"),
  dialogMeta: document.querySelector("#dialog-meta"),
  dialogSources: document.querySelector("#dialog-sources"),
  thumbnails: document.querySelector("#dialog-thumbnails"),
  sourceList: document.querySelector("#source-list"),
};

const motion = {
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  frame: 0,
  lastScrollY: window.scrollY,
  revealTargets: new Set(),
};

const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[char]));

const normalize = (value) => String(value || "").toLocaleLowerCase("zh-CN").replace(/\s+/g, "");
const NON_ARTIFACT_GROUP_IDS = new Set(["museum-arrival", "reference-wall"]);
const isPublicArtifact = (group) => !NON_ARTIFACT_GROUP_IDS.has(group.id);

function detailArchiveField(label, value, keepSlot = false) {
  const normalized = value == null ? "" : String(value).trim();
  if (!normalized && keepSlot) return '<div class="detail-archive-field" hidden aria-hidden="true"></div>';
  if (!normalized) return "";
  return '<div class="detail-archive-field"><span class="detail-archive-label">'
    + escapeHTML(label)
    + '</span><strong class="detail-archive-value">'
    + escapeHTML(normalized)
    + '</strong></div>';
}

function detailArchiveMarkup(group) {
  const archiveFields = [
    ["文物编号", group.id],
    ["类别", group.category],
    ["时代", group.period],
    ["材质", group.material],
    ["出土地点", group.findspot],
    ["尺寸", group.dimensions],
  ];
  const primaryPhoto = Array.isArray(group.gallery)
    ? group.gallery.find((photo) => photo.sequence === group.main_sequence)
    : null;
  const processing = group.processing || {};
  const sourceSize = Array.isArray(processing.source_size) ? processing.source_size.join(" × ") : "";
  const photoFields = [
    ["SEQUENCE / 拍摄序列", group.sequence_start != null && group.sequence_end != null ? `${group.sequence_start}—${group.sequence_end}` : ""],
    ["PRIMARY VIEW / 主图文件", primaryPhoto?.filename],
    ["PROCESSING / 图片处理", processing.method ? `${processing.method} · 非生成式` : ""],
    ["SOURCE / 处理来源", processing.source_kind && sourceSize ? `${processing.source_kind} · ${sourceSize} px` : processing.source_kind],
    ["PRESERVATION / 原片状态", group._supplementCaption ? "" : "F 盘只读保留 · SHA-256 已记录"],
  ];
  return '<section class="detail-archive-fields" aria-label="文物档案">'
    + '<h3 class="detail-archive-heading"><span>ARTIFACT ARCHIVE</span><small>文物档案</small></h3>'
    + '<div class="detail-archive-grid">'
    + archiveFields.map(([label, value]) => detailArchiveField(label, value, true)).join("")
    + photoFields.map(([label, value]) => detailArchiveField(label, value)).join("")
    + '</div></section>';
}

function mountDetailArchiveFields(anchor, group) {
  anchor.outerHTML = detailArchiveMarkup(group).replace(
    '<section class="detail-archive-fields"',
    '<section id="dialog-meta" class="detail-archive-fields"',
  );
  elements.dialogMeta = elements.dialog.querySelector("#dialog-meta");
}

const highlights = window.MuseumHighlights.create("qinhan");
function filteredGroups() {
  if (!state.data) return [];
  const matched = state.data.groups.filter((group) => {
    if (!isPublicArtifact(group)) return false;
    if (state.category !== "全部" && group.category !== state.category) return false;
    if (state.featuredOnly && !highlights.get(group)) return false;
    if (!state.query) return true;
    const haystack = normalize([group.title, highlights.aliases(group), group.category, group.era, group.summary, group.interpretation, ...group.tags].join(" "));
    return haystack.includes(normalize(state.query));
  });
  return highlights.select(matched, {query: state.query, filtered: state.category !== "全部" || state.featuredOnly});
}

function renderFilters() {
  const publicCategories = state.data.categories.filter((category) =>
    state.data.groups.some((group) => isPublicArtifact(group) && group.category === category)
  );
  const categories = ["全部", ...publicCategories];
  elements.filters.innerHTML = categories.map((category) => `
    <button type="button" class="filter-chip${category === state.category ? " is-active" : ""}" data-category="${escapeHTML(category)}" aria-pressed="${category === state.category}">${escapeHTML(category)}</button>
  `).join("");
  elements.filters.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      state.visible = 12;
      renderFilters();
      renderArchive();
      pulseArchive();
    });
  });
}

function cardTemplate(group, index) {
  const status = group.special_status ? `<span class="card-special">${escapeHTML(group.special_status)}</span>` : "";
  const tags = group.tags.slice(0, 3).map((tag) => `<span>${escapeHTML(tag)}</span>`).join("");
  return `
    <article class="object-card${group.featured ? " is-featured" : ""}" style="--card-order:${index % 12}">
      <button type="button" data-open-id="${escapeHTML(group.id)}" aria-label="打开${escapeHTML(group.title)}详情">
        <span class="card-image">
          <img src="${escapeHTML(qinhanMediaUrl(group.card_image || group.main_image))}" alt="${escapeHTML(group.title)}" loading="lazy" decoding="async" />
          ${group.processing.method ? `<span class="image-process">${escapeHTML(group.processing.method)} · 非生成式</span>` : ''}
        </span>
        <span class="card-copy">
          <span class="card-topline"><span>${String(index + 1).padStart(2, "0")}</span><span>${escapeHTML(group.category)}</span></span>
          ${status}
          <h3>${escapeHTML(group.title)}</h3>
          <span class="card-era">${escapeHTML(group.era)}</span>
          ${highlights.badge(group)}<span class="card-summary">${escapeHTML(group.summary)}</span>
          <span class="card-tags" aria-label="文物标签">${tags}</span>
          <span class="card-metrics" aria-label="图像与序列信息"><span>对象图 ${escapeHTML(group.object_photo_count)}</span><span>展签 ${escapeHTML(group.label_photo_count)}</span><span>序列 ${escapeHTML(group.sequence_start)}—${escapeHTML(group.sequence_end)}</span></span>
          <span class="card-footer"><b>打开详情 ↗</b></span>
        </span>
      </button>
    </article>
  `;
}

function renderArchive() {
  const groups = filteredGroups();
  const shown = groups.slice(0, state.visible);
  elements.grid.innerHTML = shown.map(cardTemplate).join("");
  elements.status.textContent = groups.length
    ? `显示 ${shown.length} / ${groups.length} 个对象组`
    : "没有符合当前条件的对象。可以清空搜索或切换分类。";
  elements.loadMore.hidden = shown.length >= groups.length;
  elements.loadMore.textContent = `继续加载（还剩 ${groups.length - shown.length} 组）`;
  bindOpeners(elements.grid);
  mountCards(elements.grid);
  fitCardTitles();
}

function fitCardTitles() {
  elements.grid.querySelectorAll('.card-copy h3').forEach(title => fitTitle(title, 14));
}
function fitTitle(title, minimumSize) {
    title.style.fontSize = '';
    title.style.whiteSpace = 'nowrap';
    const available = title.clientWidth;
    if (!available || title.scrollWidth <= available) return;
    const fitted = Math.floor(parseFloat(getComputedStyle(title).fontSize) * available / title.scrollWidth * 10) / 10;
    title.style.fontSize = `${Math.max(minimumSize, fitted)}px`;
    if (title.scrollWidth > available + 1) title.style.whiteSpace = 'normal';
}
new ResizeObserver(fitCardTitles).observe(elements.grid);
document.fonts.ready.then(fitCardTitles);
new ResizeObserver(() => fitTitle(elements.dialogTitle, 20)).observe(elements.dialogTitle.parentElement);

function bindOpeners(root = document) {
  root.querySelectorAll("[data-open-id]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => openGroup(button.dataset.openId, { syncUrl: true }));
  });
}

function getItemFromLocation() {
  if (!state.data) return null;
  const requested = new URLSearchParams(window.location.search).get("item");
  if (requested) {
    const group = state.data.groups.find((item) => item.id === requested);
    if (group && isPublicArtifact(group)) return requested;
  }
  if (window.location.hash.startsWith("#artifact=")) {
    try {
      const legacyId = decodeURIComponent(window.location.hash.slice("#artifact=".length));
      const group = state.data.groups.find((item) => item.id === legacyId);
      if (group && isPublicArtifact(group)) return legacyId;
    } catch {
      return null;
    }
  }
  return null;
}

function syncItemToUrl(id) {
  const url = new URL(window.location.href);
  const current = url.searchParams.get("item");
  const legacyArtifact = url.hash.startsWith("#artifact=");
  if (id) {
    const next = String(id);
    if (current === next && !legacyArtifact) return;
    url.searchParams.set("item", next);
    if (legacyArtifact) url.hash = "";
  } else {
    if (!current && !legacyArtifact) return;
    url.searchParams.delete("item");
    if (legacyArtifact) url.hash = "#archive";
  }
  window.history.pushState({ item: id ? String(id) : null }, "", `${url.pathname}${url.search}${url.hash}`);
}

function openGroup(id, { syncUrl = false } = {}) {
  if (!state.data) return;
  const group = state.data.groups.find((item) => item.id === id);
  if (!group || !isPublicArtifact(group)) return;
  const dialogAlreadyOpen = elements.dialog.open || elements.dialog.hasAttribute("open");
  state.activeGroup = group;
  mountDetailArchiveFields(elements.dialogMeta, group);
  elements.dialogKicker.textContent = `${group.category} · ${group.era} · ${group.photo_count} 张${group._supplementCaption ? '配图' : '现场照片'}`;
  elements.dialogSpecial.innerHTML = group.special_status ? `<span class="dialog-special">${escapeHTML(group.special_status)}</span>` : "";
  elements.dialogTitle.textContent = group.title;
  elements.dialogSummary.textContent = group.summary;
  elements.dialogInterpretation.textContent = group.interpretation;
  elements.dialogLabel.textContent = group.label_text || "本组没有可用的展签 OCR 文本；请回看对象图和原文件名。";
  elements.dialogSources.innerHTML = group.sources.length
    ? `<h3>对象来源</h3>${group.sources.map((url, index) => `<a href="${escapeHTML(url)}" target="_blank" rel="noreferrer">来源 ${index + 1} ↗</a>`).join("")}`
    : `<h3>对象来源</h3><p>当前以现场展签和个人照片为主，尚未加入可公开核验的对象级馆方链接。</p>`;
  setDialogImage("crop");
  renderThumbnails(group);
  elements.dialog.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === "crop"));
  if (!dialogAlreadyOpen) {
    elements.dialog.classList.add("is-opening");
    elements.dialog.showModal();
    requestAnimationFrame(() => elements.dialog.classList.add("is-ready"));
    window.setTimeout(() => elements.dialog.classList.remove("is-opening"), 650);
  }
  requestAnimationFrame(() => fitTitle(elements.dialogTitle, 20));
  if (syncUrl) syncItemToUrl(group.id);
}

function setDialogImage(view, customPhoto = null) {
  const group = state.activeGroup;
  if (!group) return;
  const nextSource = qinhanMediaUrl(customPhoto ? customPhoto.web : view === "full" ? group.full_image : group.main_image);
  const nextAlt = customPhoto
    ? `${group.title} · ${customPhoto.role_label} · ${customPhoto.filename}`
    : `${group.title} · ${view === "full" ? "完整构图" : "主体裁切"}`;
  const swap = () => {
    elements.dialogImage.src = nextSource;
    elements.dialogImage.alt = nextAlt;
    requestAnimationFrame(() => elements.dialogImage.classList.remove("is-switching"));
  };
  if (motion.reduced || !elements.dialogImage.src) swap();
  else {
    elements.dialogImage.classList.add("is-switching");
    window.setTimeout(swap, 170);
  }
}

function renderThumbnails(group) {
  const visiblePhotos = group.gallery.filter((photo) => photo.role !== "label");
  elements.thumbnails.innerHTML = visiblePhotos.map((photo) => `
    <button type="button" data-photo-sequence="${photo.sequence}" aria-label="查看${escapeHTML(photo.role_label)} ${escapeHTML(photo.filename)}">
      <img src="${escapeHTML(qinhanMediaUrl(photo.thumb))}" alt="" loading="lazy" decoding="async" />
      <span>${escapeHTML(photo.role_label)} · ${escapeHTML(photo.filename)}</span>
    </button>
  `).join("");
  elements.thumbnails.querySelectorAll("[data-photo-sequence]").forEach((button) => {
    button.addEventListener("click", () => {
      const photo = group.gallery.find((item) => item.sequence === Number(button.dataset.photoSequence));
      if (photo) setDialogImage("custom", photo);
      elements.dialog.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("is-active"));
    });
  });
}

function closeDialog({ syncUrl = true } = {}) {
  if (elements.dialog.open) {
    if (motion.reduced) elements.dialog.close();
    else {
      elements.dialog.classList.remove("is-ready");
      elements.dialog.classList.add("is-closing");
      window.setTimeout(() => {
        elements.dialog.close();
        elements.dialog.classList.remove("is-closing");
      }, 240);
    }
  }
  state.activeGroup = null;
  if (syncUrl) syncItemToUrl(null);
}

function renderSources() {
  elements.sourceList.innerHTML = state.data.sources.map((source, index) => `
    <article>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <div><h3>${escapeHTML(source.label)}</h3><p>${escapeHTML(source.supports)}</p></div>
      ${source.url ? `<a href="${escapeHTML(source.url)}" target="_blank" rel="noreferrer" aria-label="打开${escapeHTML(source.label)}">↗</a>` : `<b>现场证据</b>`}
    </article>
  `).join("");
}

function setupIntro() {
  const intro = document.querySelector(".page-intro");
  if (!intro) return;
  const forceIntro = new URLSearchParams(location.search).get("intro") === "1";
  const skipIntro = motion.reduced || window.innerWidth <= 820 || (!forceIntro && sessionStorage.getItem("qinhan-intro-seen"));
  document.documentElement.style.setProperty("--intro-delay", skipIntro ? ".12s" : "1.65s");
  if (skipIntro) {
    intro.remove();
    document.documentElement.classList.add("intro-complete");
    return;
  }
  document.body.classList.add("intro-active");
  window.setTimeout(() => intro.classList.add("is-leaving"), 1050);
  window.setTimeout(() => {
    intro.remove();
    document.body.classList.remove("intro-active");
    document.documentElement.classList.add("intro-complete");
    sessionStorage.setItem("qinhan-intro-seen", "1");
  }, 2150);
}

function setupTextReveals() {
  document.querySelectorAll(".hero h1 > *, main h2").forEach((element) => {
    if (element.dataset.motionSplit === "true") return;
    element.dataset.motionSplit = "true";
    const text = element.textContent.trim();
    element.setAttribute("aria-label", text);
    element.innerHTML = Array.from(text).map((char, index) =>
      `<span class="motion-char" aria-hidden="true" style="--char-index:${index}">${char === " " ? "&nbsp;" : escapeHTML(char)}</span>`
    ).join("");
  });
}

function setupReveals(root = document) {
  const targets = root.querySelectorAll([
    ".section-rail", ".museum-heading", ".museum-prose > *", ".museum-figure", ".museum-facts",
    ".exhibition-sticky", ".exhibition-copy > *", ".queen-image-wrap", ".queen-copy > *", ".tiger-image-wrap", ".tiger-copy > *",
    ".archive-intro > *", ".archive-tools", ".archive-status", ".method-title-wrap",
    ".method-copy > *", ".method-steps", ".source-list"
  ].join(","));
  if (motion.reduced || !("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-revealed"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      motion.revealTargets.delete(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -4%", threshold: 0.025 });
  targets.forEach((target, index) => {
    target.classList.add("motion-reveal");
    target.style.setProperty("--reveal-order", index % 4);
    motion.revealTargets.add(target);
    observer.observe(target);
  });
}

function setupSectionTracking() {
  const header = document.querySelector(".site-header");
  const links = [...document.querySelectorAll(".site-header nav a")];
  const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.toggle("is-current", link.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-25% 0px -65%", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }
  const update = () => {
    motion.frame = 0;
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    document.documentElement.style.setProperty("--scroll-progress", Math.min(1, y / max));
    header.classList.toggle("is-scrolled", y > 44);
    header.classList.toggle("is-hidden", !motion.reduced && y > motion.lastScrollY && y > 520 && !elements.dialog.open);
    motion.lastScrollY = y;
    const hero = document.querySelector(".hero");
    if (hero && y < window.innerHeight * 1.15 && !motion.reduced) {
      const progress = Math.min(1, y / window.innerHeight);
      hero.style.setProperty("--hero-scroll", progress.toFixed(3));
      hero.style.setProperty("--hero-copy-shift", `${(progress * -46).toFixed(1)}px`);
      hero.style.setProperty("--hero-media-shift", `${(progress * 72).toFixed(1)}px`);
      hero.style.setProperty("--hero-media-scale", (1.025 + progress * .055).toFixed(3));
    }
    motion.revealTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      if (rect.top < window.innerHeight * .96 && rect.bottom > 0) {
        target.classList.add("is-revealed");
        motion.revealTargets.delete(target);
      }
    });
  };
  window.addEventListener("scroll", () => {
    if (!motion.frame) motion.frame = requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function mountCards(root = document) {
  root.querySelectorAll(".object-card").forEach((card) => {
    requestAnimationFrame(() => card.classList.add("is-mounted"));
  });
}

function pulseArchive() {
  elements.grid.classList.remove("is-refreshing");
  void elements.grid.offsetWidth;
  elements.grid.classList.add("is-refreshing");
}

function animateCounters() {
  if (motion.reduced) return;
  document.querySelectorAll(".hero-stats dt").forEach((counter, counterIndex) => {
    const end = Number(counter.textContent) || 0;
    counter.textContent = "0";
    const introDelay = document.body.classList.contains("intro-active") ? 2050 : 250;
    const startAt = performance.now() + introDelay + counterIndex * 100;
    const duration = 900;
    const tick = (now) => {
      if (now < startAt) {
        requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, (now - startAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = String(Math.round(end * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function setupMotion() {
  setupIntro();
  setupTextReveals();
  setupReveals();
  setupSectionTracking();
  document.documentElement.classList.add("motion-ready");
}

async function init() {
  try {
    const response = await fetch("data/archive.json?v=20260813-motion1", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    highlights.apply(state.data.groups);
    const publicGroups = state.data.groups.filter(isPublicArtifact);
    const publicObjects = publicGroups.reduce((sum, group) => sum + group.object_photo_count, 0);
    const publicLabels = publicGroups.reduce((sum, group) => sum + group.label_photo_count, 0);
    document.querySelector("#stat-photos").textContent = state.data.photo_count;
    document.querySelector("#stat-groups").textContent = publicGroups.length;
    document.querySelector("#stat-featured").textContent = publicGroups.filter((group) => highlights.get(group)).length;
    elements.count.textContent = `${publicGroups.length} 个文物条目 · ${publicObjects} 张对象图 · ${publicLabels} 张证据图`;
    renderFilters();
    renderArchive();
    renderSources();
    bindOpeners(document);
    mountCards(document);
    animateCounters();
    const requestedItem = getItemFromLocation();
    if (requestedItem) {
      document.querySelector(".page-intro")?.remove();
      document.body.classList.remove("intro-active");
      document.documentElement.classList.add("intro-complete");
      openGroup(requestedItem, { syncUrl: false });
    }
  } catch (error) {
    elements.status.innerHTML = `<strong>档案数据没有载入。</strong><br />请通过项目内的“打开网站”方式浏览，而不是直接双击 HTML。`;
    console.error(error);
  }
}

let searchTimer;
elements.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = elements.search.value;
    state.visible = 12;
    renderArchive();
  }, 120);
});



elements.loadMore.addEventListener("click", () => {
  state.visible += 12;
  renderArchive();
  pulseArchive();
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.search.focus();
  }
});

elements.dialog.querySelector(".dialog-close").addEventListener("click", () => closeDialog({ syncUrl: true }));
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) closeDialog({ syncUrl: true });
});
elements.dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDialog({ syncUrl: true });
});
elements.dialog.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    setDialogImage(button.dataset.view);
    elements.dialog.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item === button));
  });
});

window.addEventListener("popstate", () => {
  const id = getItemFromLocation();
  if (id) openGroup(id, { syncUrl: false });
  else closeDialog({ syncUrl: false });
});

setupMotion();
init();
