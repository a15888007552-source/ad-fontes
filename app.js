const PROJECT_ROOT_PREFIX = window.location.pathname.includes("/modules/beilin/") ? "../../" : "";
const projectUrl = (value) => {
  const source = String(value || "");
  return /^(?:[a-z]+:|\/|#)/i.test(source) ? source : `${PROJECT_ROOT_PREFIX}${source}`;
};
const DATA_URL = projectUrl("data/artifact-groups.json");
const IS_EMBEDDED = new URLSearchParams(window.location.search).get("embed") === "1";
const HIDDEN_DOCUMENT_ROLES = new Set(["label", "title"]);

document.body.classList.toggle("is-embedded", IS_EMBEDDED);

const CATEGORY_ORDER = [
  "全部",
  "碑",
  "碑文",
  "墓志",
  "古董/文物",
  "禁止出国（境）展览文物",
];

const CATEGORY_SHORT = {
  "禁止出国（境）展览文物": "禁止出境展览文物",
};

const THEME_ART = {
  碑: "assets/editorial/theme-stele.webp",
  碑文: "assets/editorial/theme-inscription.webp",
  墓志: "assets/editorial/theme-epitaph.webp",
  "古董/文物": "assets/editorial/theme-objects.webp",
  "禁止出国（境）展览文物": "assets/editorial/theme-special.webp",
};

const ROLE_LABELS = {
  front: "正面",
  back: "背面",
  side: "侧面",
  detail: "局部",
  component: "组内单件",
  reference: "资料图",
  label: "介绍",
  title: "题名",
};

const SOURCE_LAYER_LABELS = {
  local_label_photo: "现场主证据",
  museum_official_collection_page: "馆方对象资料",
  wikipedia_overview: "维基百科概述",
  museum_context_page: "博物馆语境资料",
  user_pdf: "用户提供 PDF",
};

const RESEARCH_STATUS_LABELS = {
  curated_from_label_museum_and_context_sources: "已校读 · 展签 + 馆方 + 背景资料",
  curated_from_label_and_context_sources: "已校读 · 展签 + 背景资料",
  curated_from_label: "已校读 · 现场展签",
  curated_from_user_pdf: "已校读 · 用户提供 PDF",
  curated_from_user_pdf_and_museum_sources: "已校读 · PDF + 馆方资料",
};

const state = {
  catalog: null,
  groups: [],
  filtered: [],
  category: "全部",
  query: "",
  sort: "sequence",
  musicOnly: false,
  currentArtifact: null,
  currentPhotos: [],
  currentPhotoIndex: 0,
};

const elements = {
  artifactStat: document.querySelector("#artifactStat"),
  photoStat: document.querySelector("#photoStat"),
  specialStat: document.querySelector("#specialStat"),
  catalogGrid: document.querySelector("#catalogGrid"),
  categoryTabs: document.querySelector("#categoryTabs"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  musicOnly: document.querySelector("#musicOnly"),
  musicFilterCount: document.querySelector("#musicFilterCount"),
  clearFilters: document.querySelector("#clearFilters"),
  resultCount: document.querySelector("#resultCount"),
  emptyState: document.querySelector("#emptyState"),
  loadError: document.querySelector("#loadError"),
  artifactDialog: document.querySelector("#artifactDialog"),
  closeDetail: document.querySelector("#closeDetail"),
  detailCategory: document.querySelector("#detailCategory"),
  detailTitle: document.querySelector("#detailTitle"),
  detailPeriod: document.querySelector("#detailPeriod"),
  detailMainImage: document.querySelector("#detailMainImage"),
  openLightbox: document.querySelector("#openLightbox"),
  galleryCategoryLabel: document.querySelector("#galleryCategoryLabel"),
  galleryArtifactLabel: document.querySelector("#galleryArtifactLabel"),
  galleryRoleLabel: document.querySelector("#galleryRoleLabel"),
  galleryImageNote: document.querySelector("#galleryImageNote"),
  galleryEmptyNote: document.querySelector("#galleryEmptyNote"),
  galleryArtDisclosure: document.querySelector("#galleryArtDisclosure"),
  zoomHint: document.querySelector("#zoomHint"),
  photoThumbs: document.querySelector("#photoThumbs"),
  imageCaption: document.querySelector("#imageCaption"),
  factList: document.querySelector("#factList"),
  subitemsBlock: document.querySelector("#subitemsBlock"),
  subitemsList: document.querySelector("#subitemsList"),
  historyText: document.querySelector("#historyText"),
  formText: document.querySelector("#formText"),
  contributionText: document.querySelector("#contributionText"),
  viewingGuideText: document.querySelector("#viewingGuideText"),
  musicResearch: document.querySelector("#musicResearch"),
  musicTier: document.querySelector("#musicTier"),
  musicTitle: document.querySelector("#musicTitle"),
  musicSummary: document.querySelector("#musicSummary"),
  musicDetails: document.querySelector("#musicDetails"),
  musicBoundary: document.querySelector("#musicBoundary"),
  sourceList: document.querySelector("#sourceList"),
  ocrText: document.querySelector("#ocrText"),
  previousArtifact: document.querySelector("#previousArtifact"),
  nextArtifact: document.querySelector("#nextArtifact"),
  detailPosition: document.querySelector("#detailPosition"),
  lightbox: document.querySelector("#lightbox"),
  lightboxStage: document.querySelector("#lightboxStage"),
  lightboxImage: document.querySelector("#lightboxImage"),
  lightboxCaption: document.querySelector("#lightboxCaption"),
  openOriginal: document.querySelector("#openOriginal"),
  toggleZoom: document.querySelector("#toggleZoom"),
  closeLightbox: document.querySelector("#closeLightbox"),
  previousPhoto: document.querySelector("#previousPhoto"),
  nextPhoto: document.querySelector("#nextPhoto"),
};

const motionAllowed =
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !navigator.connection?.saveData;

let revealObserver = null;

const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s《》〈〉（）()·,，。:：;；“”‘’'"\-—_/]/g, "");
}

function searchableText(group) {
  return normalizeSearch(
    [
      group.name,
      ...(group.name_candidates || []),
      group.category,
      group.period_label,
      group.card_excerpt,
      ...(group.form_labels || []),
      ...(group.subitems || []),
      group.label_description_ocr,
      group.label_text_ocr,
      group.research?.history,
      group.research?.form_and_craft,
      group.research?.contribution,
      group.research?.viewing_guide,
      group.music_focus?.tier_label,
      group.music_focus?.title,
      group.music_focus?.summary,
      ...(group.music_focus?.details || []),
    ].join(" "),
  );
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function registerReveal(element, delay = 0) {
  if (!revealObserver || !element) return;
  element.classList.add("reveal-item");
  element.style.setProperty("--reveal-delay", `${Math.min(delay, 240)}ms`);
  revealObserver.observe(element);
}

function setupMotion() {
  if (!motionAllowed) return;
  document.documentElement.classList.add("js-motion");

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  document.querySelectorAll(".museum-section, .theme-heading, .method-section").forEach((item) => {
    registerReveal(item);
  });
  document.querySelectorAll(".theme-card").forEach((item, index) => {
    registerReveal(item, (index % 3) * 70);
  });

  const hero = document.querySelector(".hero");
  if (hero) {
    let framePending = false;
    const updateHero = () => {
      const shift = Math.min(window.scrollY * 0.035, 28);
      hero.style.setProperty("--hero-shift-y", `${shift}px`);
      framePending = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (framePending || window.scrollY > window.innerHeight * 1.25) return;
        framePending = true;
        requestAnimationFrame(updateHero);
      },
      { passive: true },
    );
  }
}

function animateNumber(element, target) {
  const start = performance.now();
  const duration = 760;
  element.textContent = "0";
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = String(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setupStatAnimation() {
  if (!motionAllowed) return;
  const stats = document.querySelector(".museum-stats");
  if (!stats) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      animateNumber(elements.artifactStat, Number(state.catalog.group_count));
      animateNumber(elements.photoStat, Number(state.catalog.photo_count));
      animateNumber(
        elements.specialStat,
        Number(state.catalog.categories["禁止出国（境）展览文物"] || 0),
      );
      observer.disconnect();
    },
    { threshold: 0.45 },
  );
  observer.observe(stats);
}

function categoryLabel(category) {
  return CATEGORY_SHORT[category] || category;
}

function artifactPhotos(group) {
  const visible = group?._displayPhotos || group?.photos?.filter((photo) => !HIDDEN_DOCUMENT_ROLES.has(photo.role)) || [];
  return visible;
}

function artifactPhotoCount(group) {
  return Number(group?.display_photo_count ?? artifactPhotos(group).length);
}

function cardExcerpt(group) {
  const excerpt = String(group.card_excerpt || group.research?.history || "").replace(/\s+/g, "").trim();
  return excerpt || "展签文字正在校读；名称、年代与对象边界已按现场照片确认。";
}

function renderCategoryTabs() {
  const fragment = document.createDocumentFragment();
  const counts = state.catalog.categories || {};

  CATEGORY_ORDER.forEach((category) => {
    const button = makeElement("button", "category-button");
    button.type = "button";
    button.dataset.category = category;
    button.setAttribute("aria-pressed", String(state.category === category));
    button.append(document.createTextNode(categoryLabel(category)));
    const count = makeElement(
      "span",
      "count",
      String(category === "全部" ? state.groups.length : counts[category] || 0),
    );
    button.append(count);
    button.addEventListener("click", () => {
      state.category = category;
      renderCategoryTabs();
      applyFilters();
    });
    fragment.append(button);
  });

  elements.categoryTabs.replaceChildren(fragment);
}

function applyFilters() {
  const query = normalizeSearch(state.query);
  let groups = state.groups.filter((group) => {
    const categoryMatches = state.category === "全部" || group.category === state.category;
    const queryMatches = !query || group._search.includes(query);
    const musicMatches = !state.musicOnly || Boolean(group.music_focus);
    return categoryMatches && queryMatches && musicMatches;
  });

  if (state.sort === "name") {
    groups = [...groups].sort((a, b) => collator.compare(a.name, b.name));
  } else if (state.sort === "photos") {
    groups = [...groups].sort((a, b) => artifactPhotoCount(b) - artifactPhotoCount(a) || a.sequence_start - b.sequence_start);
  } else {
    groups = [...groups].sort((a, b) => a.sequence_start - b.sequence_start);
  }

  state.filtered = groups;
  renderCards();
}

function resolveImageSources(photo, preferred = []) {
  const sources = [];
  const push = (path) => {
    const resolved = projectUrl(path);
    if (!path || sources.includes(resolved)) return;
    sources.push(resolved);
  };
  preferred.forEach(push);
  push(photo?.preview);
  push(photo?.original);
  return sources;
}

function setImageWithFallback(image, photo, preferred = []) {
  const sources = resolveImageSources(photo, preferred);
  if (!sources.length) return;

  if (image.__fallbackHandler) {
    image.removeEventListener("error", image.__fallbackHandler);
    image.__fallbackHandler = null;
  }

  image.style.opacity = "1";
  image.dataset.imageFallbackIndex = "0";
  image.__fallbackOriginalAlt = image.alt;

  const onImageError = () => {
    const nextIndex = Number(image.dataset.imageFallbackIndex || 0) + 1;
    if (nextIndex < sources.length) {
      image.dataset.imageFallbackIndex = String(nextIndex);
      image.src = sources[nextIndex];
      return;
    }

    image.style.opacity = "0.18";
    image.alt = `${image.__fallbackOriginalAlt || image.alt}（图片载入失败）`;
    if (image.__fallbackHandler) {
      image.removeEventListener("error", image.__fallbackHandler);
      image.__fallbackHandler = null;
    }
  };

  image.__fallbackHandler = onImageError;
  image.addEventListener("error", onImageError);
  image.src = sources[0];
}

function createCard(group, index) {
  const card = makeElement("article", `artifact-card${group.special_status ? " special" : ""}`);
  const button = makeElement("button", "artifact-card-button");
  button.type = "button";
  const cardImageKind = imageKindLabel(group, group.main_photo);
  button.setAttribute("aria-label", `打开${group.name}详情，共${artifactPhotoCount(group)}张${cardImageKind}`);
  button.addEventListener("click", () => {
    window.location.hash = group.id;
  });

  const imageWrap = makeElement("div", "card-image-wrap");
  const image = document.createElement("img");
  const displayPhotos = artifactPhotos(group);
  const cardPhoto = group.main_photo && !HIDDEN_DOCUMENT_ROLES.has(group.main_photo.role)
    ? group.main_photo
    : displayPhotos[0] || null;
  if (cardPhoto) {
    setImageWithFallback(image, cardPhoto, [cardPhoto.thumb, cardPhoto.preview]);
    image.alt = `${group.name}${imageKindLabel(group, cardPhoto)}`;
  } else {
    imageWrap.classList.add("is-editorial-placeholder");
    image.src = projectUrl(THEME_ART[group.category] || THEME_ART["古董/文物"]);
    image.alt = `${group.name}主题视觉占位，本组没有文物本体照片`;
  }
  image.loading = index < 12 ? "eager" : "lazy";
  image.decoding = "async";
  imageWrap.append(image);
  if (!cardPhoto) imageWrap.append(makeElement("span", "card-placeholder-note", "主题视觉 · 非文物照片"));

  const corner = makeElement("div", "card-corner-effect");
  corner.setAttribute("aria-label", "打开详情查看图集");
  corner.append(
    makeElement("span", "corner-label", "图集"),
    makeElement("span", "corner-orbit orbit-a"),
    makeElement("span", "corner-orbit orbit-b"),
    makeElement("span", "corner-core"),
  );

  const copy = makeElement("div", "card-copy");
  const meta = makeElement("p", "card-meta");
  meta.append(makeElement("span", "card-number", group.id.split("-")[1]));
  meta.append(makeElement("span", "card-category", categoryLabel(group.category)));
  const title = makeElement("h3", "", group.name);
  const period = makeElement("p", "card-period", group.period_label || "年代见现场展签");
  const excerpt = makeElement("div", "card-excerpt");
  excerpt.append(makeElement("span", "card-excerpt-label", group.image_source === "user_pdf" ? "资料页校读" : "展签校读"));
  excerpt.append(makeElement("p", "", cardExcerpt(group)));
  const footer = makeElement("div", "card-footer");
  const flags = makeElement("span", "card-flags");
  if (group.special_status) flags.append(makeElement("span", "special-marker", "重点档案"));
  if (group.music_focus) {
    const musicMarker = makeElement("span", "music-marker", "♪ 音乐关联");
    musicMarker.title = group.music_focus.tier_label || "音乐关联";
    flags.append(musicMarker);
  }
  footer.append(
    makeElement(
      "span",
      "card-photo-count",
      artifactPhotoCount(group)
        ? `${isSupplementalImage(group, cardPhoto) ? "资料图" : "文物图"} ${artifactPhotoCount(group)}`
        : "仅有文字证据",
    ),
    flags,
    makeElement("span", "card-enter", "进入 →"),
  );
  copy.append(meta, title, period, excerpt, footer);
  button.append(imageWrap, corner, copy);
  card.append(button);
  return card;
}

function renderCards() {
  if (revealObserver) {
    elements.catalogGrid.querySelectorAll(".artifact-card").forEach((card) => revealObserver.unobserve(card));
  }
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((group, index) => fragment.append(createCard(group, index)));
  elements.catalogGrid.replaceChildren(fragment);
  elements.catalogGrid.querySelectorAll(".artifact-card").forEach((card, index) => {
    registerReveal(card, (index % 8) * 24);
  });
  elements.catalogGrid.setAttribute("aria-busy", "false");
  elements.resultCount.textContent = `显示 ${state.filtered.length} / ${state.groups.length} 件`;
  elements.emptyState.hidden = state.filtered.length !== 0;
}

function clearFilters() {
  state.query = "";
  state.category = "全部";
  state.sort = "sequence";
  state.musicOnly = false;
  elements.searchInput.value = "";
  elements.sortSelect.value = "sequence";
  elements.musicOnly.setAttribute("aria-pressed", "false");
  renderCategoryTabs();
  applyFilters();
}

function setStats() {
  elements.artifactStat.textContent = state.catalog.group_count;
  elements.photoStat.textContent = state.catalog.photo_count;
  elements.specialStat.textContent = state.catalog.categories["禁止出国（境）展览文物"] || 0;
  elements.musicFilterCount.textContent = state.catalog.music_focus_count || 0;
  document.querySelectorAll("[data-theme-count]").forEach((item) => {
    item.textContent = state.catalog.categories[item.dataset.themeCount] || 0;
  });
}

function formatRole(role) {
  return ROLE_LABELS[role] || role || "照片";
}

function isSupplementalImage(group, photo) {
  return group?.image_source === "user_pdf" || photo?.source_type === "user_pdf";
}

function imageKindLabel(group, photo) {
  return isSupplementalImage(group, photo) ? "PDF资料图" : "现场文物照片";
}

function imageEvidenceLabel(group, photo) {
  if (!isSupplementalImage(group, photo)) return `拍摄序号 ${photo?.sequence ?? "—"}`;
  return photo?.source_label || group?.image_source_label || "用户提供 PDF 资料图";
}

function selectedPhoto() {
  return state.currentPhotos[state.currentPhotoIndex] || null;
}

function selectPhoto(index, updateLightbox = false) {
  const group = state.currentArtifact;
  if (!group) return;
  const count = state.currentPhotos.length;
  if (!count) return;
  state.currentPhotoIndex = ((index % count) + count) % count;
  const photo = selectedPhoto();

  const nextSource = new URL(projectUrl(photo.preview || photo.original), window.location.href).href;
  if (elements.detailMainImage.src !== nextSource) {
    elements.openLightbox.classList.add("is-changing");
    const finishChange = () => elements.openLightbox.classList.remove("is-changing");
    elements.detailMainImage.addEventListener("load", finishChange, { once: true });
    window.setTimeout(finishChange, 520);
    setImageWithFallback(elements.detailMainImage, photo, [photo.preview, photo.original]);
  }
  elements.detailMainImage.alt = `${group.name}：${formatRole(photo.role)}，${imageKindLabel(group, photo)}`;
  elements.galleryRoleLabel.textContent = formatRole(photo.role);
  elements.imageCaption.textContent = `${formatRole(photo.role)} · ${photo.filename} · ${imageEvidenceLabel(group, photo)} · ${photo.display_width} × ${photo.display_height}`;

  elements.photoThumbs.querySelectorAll(".photo-thumb").forEach((thumb, thumbIndex) => {
    thumb.setAttribute("aria-current", String(thumbIndex === state.currentPhotoIndex));
  });

  if (updateLightbox && elements.lightbox.open) {
    updateLightboxImage();
  }
}

function renderThumbs(group) {
  const fragment = document.createDocumentFragment();
  artifactPhotos(group).forEach((photo, index) => {
    const button = makeElement("button", "photo-thumb");
    button.type = "button";
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-label", `查看${formatRole(photo.role)}，${photo.filename}`);
    button.setAttribute("aria-current", String(index === state.currentPhotoIndex));
    const image = document.createElement("img");
    setImageWithFallback(image, photo, [photo.thumb, photo.preview]);
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    button.append(image, makeElement("span", "", formatRole(photo.role)));
    button.addEventListener("click", () => selectPhoto(index));
    fragment.append(button);
  });
  elements.photoThumbs.replaceChildren(fragment);
}

function factRow(term, description) {
  const row = document.createElement("div");
  const dt = makeElement("dt", "", term);
  const dd = makeElement("dd", "", description || "—");
  row.append(dt, dd);
  return row;
}

function renderFacts(group) {
  const form = group.form_labels?.length ? group.form_labels.join("；") : "见多角度照片与展签";
  const labelSequences = group.label_photo_sequences?.length
    ? group.label_photo_sequences.join("、")
    : group.label_photo_sequence || "—";
  const evidenceTerm = group.image_source === "user_pdf" ? "资料来源" : "展签依据";
  const evidenceDescription = group.image_source === "user_pdf"
    ? group.image_source_label || "用户提供 PDF 资料图"
    : `摄影序号 ${labelSequences} · 已提取为卡片文字`;
  const imageTerm = group.image_source === "user_pdf" ? "PDF资料图" : "文物影像";
  const imageDescription = group.image_source === "user_pdf"
    ? `${artifactPhotoCount(group)} 张（不属于现场拍摄）`
    : `${artifactPhotoCount(group)} 张（展签与题名牌不进入画廊）`;
  const rows = [
    factRow("类别", categoryLabel(group.category)),
    factRow("年代", group.period_label),
    factRow("形制 / 书体", form),
    factRow(imageTerm, imageDescription),
    factRow(evidenceTerm, evidenceDescription),
    factRow("校读状态", RESEARCH_STATUS_LABELS[group.research?.status] || "现场档案"),
  ];
  if (group.music_focus) {
    rows.splice(3, 0, factRow("音乐关联", group.music_focus.tier_label));
  }
  elements.factList.replaceChildren(...rows);

  if (group.subitems?.length) {
    const fragment = document.createDocumentFragment();
    group.subitems.forEach((item) => fragment.append(makeElement("li", "", item)));
    elements.subitemsList.replaceChildren(fragment);
    elements.subitemsBlock.hidden = false;
  } else {
    elements.subitemsList.replaceChildren();
    elements.subitemsBlock.hidden = true;
  }
}

function renderSources(group) {
  const fragment = document.createDocumentFragment();
  const sources = group.research?.sources || [];

  if (!sources.length) {
    fragment.append(makeElement("p", "", "当前条目仅保留现场照片，尚未匹配外部资料。"));
  }

  sources.forEach((source) => {
    const item = makeElement("article", "source-item");
    item.append(
      makeElement("p", "source-layer", SOURCE_LAYER_LABELS[source.layer] || source.layer),
    );
    const link = makeElement("a", "", source.label);
    link.href = projectUrl(source.url);
    link.target = "_blank";
    link.rel = "noreferrer";
    item.append(link, makeElement("p", "", source.note || source.scope || ""));
    fragment.append(item);
  });

  elements.sourceList.replaceChildren(fragment);
}

function detailNavigationList() {
  const filteredHasCurrent = state.filtered.some((group) => group.id === state.currentArtifact?.id);
  return filteredHasCurrent ? state.filtered : state.groups;
}

function renderDetail(group) {
  state.currentArtifact = group;
  state.currentPhotos = artifactPhotos(group);
  const mainSequence = group.main_photo?.sequence;
  const mainIndex = Math.max(
    0,
    state.currentPhotos.findIndex((photo) => photo.sequence === mainSequence),
  );
  state.currentPhotoIndex = mainIndex;

  elements.detailCategory.textContent = group.special_status
    ? `${categoryLabel(group.category)} · 重点档案`
    : categoryLabel(group.category);
  elements.detailTitle.textContent = group.name;
  elements.detailPeriod.textContent = group.period_label || "年代见现场展签";
  elements.galleryCategoryLabel.textContent = categoryLabel(group.category);
  elements.galleryArtifactLabel.textContent = group.name;
  elements.openLightbox.style.setProperty(
    "--gallery-art",
    `url("${THEME_ART[group.category] || THEME_ART["古董/文物"]}")`,
  );
  elements.historyText.textContent = group.research?.history || "本条目的历史背景尚待补充。";
  elements.formText.textContent = group.research?.form_and_craft || "形制与工艺信息见现场照片。";
  elements.contributionText.textContent = group.research?.contribution || "本条目的研究价值尚待补充。";
  elements.viewingGuideText.textContent = group.research?.viewing_guide || "请结合整体、局部与展签照片分层观察。";
  const musicFocus = group.music_focus;
  if (musicFocus) {
    elements.musicTier.textContent = musicFocus.tier_label || "音乐关联";
    elements.musicTitle.textContent = musicFocus.title || "音乐与礼乐专题";
    elements.musicSummary.textContent = musicFocus.summary || "";
    elements.musicDetails.replaceChildren(
      ...(musicFocus.details || []).map((item) => makeElement("li", "", item)),
    );
    elements.musicBoundary.textContent = musicFocus.boundary ? `证据边界：${musicFocus.boundary}` : "";
    elements.musicResearch.hidden = false;
  } else {
    elements.musicTier.textContent = "";
    elements.musicTitle.textContent = "";
    elements.musicSummary.textContent = "";
    elements.musicDetails.replaceChildren();
    elements.musicBoundary.textContent = "";
    elements.musicResearch.hidden = true;
  }
  elements.ocrText.textContent = group.label_text_ocr || "当前照片组未识别出可用的展签文字。";

  renderThumbs(group);
  renderFacts(group);
  renderSources(group);
  const hasArtifactPhotos = state.currentPhotos.length > 0;
  elements.openLightbox.disabled = !hasArtifactPhotos;
  elements.openLightbox.classList.toggle("has-no-artifact-photo", !hasArtifactPhotos);
  elements.galleryEmptyNote.hidden = hasArtifactPhotos;
  elements.detailMainImage.hidden = !hasArtifactPhotos;
  elements.galleryArtDisclosure.textContent = hasArtifactPhotos
    ? isSupplementalImage(group, selectedPhoto())
      ? "用户提供 PDF 资料图 · 原图未修改"
      : "AI 主题环境 · 原图未修改"
    : "AI 主题环境 · 非文物影像";
  if (elements.galleryImageNote) {
    elements.galleryImageNote.innerHTML = hasArtifactPhotos && isSupplementalImage(group, selectedPhoto())
      ? "图像来自用户提供 PDF 资料页<br />背景为 AI 主题环境"
      : hasArtifactPhotos
        ? "中央为现场原图<br />背景为 AI 主题环境"
        : "没有现场文物原图<br />背景为 AI 主题环境";
  }
  elements.zoomHint.textContent = hasArtifactPhotos ? "点击查看原图" : "无可打开的文物原图";
  elements.openLightbox.setAttribute(
    "aria-label",
    hasArtifactPhotos ? `查看${group.name}高清原图` : `${group.name}没有文物本体照片`,
  );
  if (hasArtifactPhotos) {
    selectPhoto(mainIndex);
  } else {
    elements.detailMainImage.removeAttribute("src");
    elements.detailMainImage.alt = "";
    elements.galleryRoleLabel.textContent = "无文物本体照片";
    elements.imageCaption.textContent = "本组仅有展签或题名墙记录：照片已转为文字证据，不进入文物画廊。";
  }

  const list = detailNavigationList();
  const position = Math.max(0, list.findIndex((item) => item.id === group.id));
  elements.detailPosition.textContent = `${position + 1} / ${list.length}`;
}

function openArtifactById(id, updateHash = false) {
  const group = state.groups.find((item) => item.id === id);
  if (!group) return false;
  renderDetail(group);
  if (!elements.artifactDialog.open) elements.artifactDialog.showModal();
  if (updateHash) history.replaceState(null, "", `#${group.id}`);
  return true;
}

function navigateArtifact(direction) {
  if (!state.currentArtifact) return;
  const list = detailNavigationList();
  const currentIndex = list.findIndex((item) => item.id === state.currentArtifact.id);
  const nextIndex = ((currentIndex + direction) % list.length + list.length) % list.length;
  openArtifactById(list[nextIndex].id, true);
}

function handleHash() {
  if (!state.catalog) return;
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (/^artifact-\d{3}$/.test(id)) {
    if (!openArtifactById(id)) history.replaceState(null, "", window.location.pathname);
  } else if (elements.artifactDialog.open) {
    elements.artifactDialog.close();
  }
}

function closeArtifact() {
  if (elements.lightbox.open) elements.lightbox.close();
  if (elements.artifactDialog.open) elements.artifactDialog.close();
  state.currentPhotos = [];
}

function updateLightboxImage() {
  const photo = selectedPhoto();
  const group = state.currentArtifact;
  if (!photo || !group) return;
  elements.lightboxStage.classList.remove("is-zoomed");
  elements.toggleZoom.textContent = "1:1 原尺寸";
  elements.lightboxImage.src = projectUrl(photo.original);
  elements.lightboxImage.alt = `${group.name}高清原图：${formatRole(photo.role)}`;
  elements.lightboxCaption.textContent = `${group.name} · ${formatRole(photo.role)} · ${photo.filename} · ${imageEvidenceLabel(group, photo)} · ${state.currentPhotoIndex + 1}/${state.currentPhotos.length}`;
  elements.openOriginal.href = projectUrl(photo.original);
}

function openCurrentLightbox() {
  if (!state.currentArtifact || !state.currentPhotos.length) return;
  updateLightboxImage();
  if (!elements.lightbox.open) elements.lightbox.showModal();
}

function navigatePhoto(direction) {
  if (!state.currentArtifact || !state.currentPhotos.length) return;
  selectPhoto(state.currentPhotoIndex + direction, true);
}

function toggleZoom() {
  const zoomed = elements.lightboxStage.classList.toggle("is-zoomed");
  elements.toggleZoom.textContent = zoomed ? "适合窗口" : "1:1 原尺寸";
  if (!zoomed) {
    elements.lightboxStage.scrollTo({ top: 0, left: 0 });
  }
}

function bindEvents() {
  document.querySelectorAll("[data-theme-category]").forEach((card) => {
    card.addEventListener("click", () => {
      state.category = card.dataset.themeCategory;
      state.query = "";
      state.sort = "sequence";
      state.musicOnly = false;
      elements.searchInput.value = "";
      elements.sortSelect.value = "sequence";
      elements.musicOnly.setAttribute("aria-pressed", "false");
      renderCategoryTabs();
      applyFilters();
      document.querySelector("#catalog")?.scrollIntoView({ behavior: motionAllowed ? "smooth" : "auto" });
    });
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    applyFilters();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    applyFilters();
  });

  elements.musicOnly.addEventListener("click", () => {
    state.musicOnly = !state.musicOnly;
    elements.musicOnly.setAttribute("aria-pressed", String(state.musicOnly));
    applyFilters();
  });

  elements.clearFilters.addEventListener("click", clearFilters);
  document.querySelector("[data-clear-search]")?.addEventListener("click", () => {
    state.query = "";
    elements.searchInput.value = "";
    applyFilters();
    elements.searchInput.focus();
  });

  elements.closeDetail.addEventListener("click", closeArtifact);
  elements.previousArtifact.addEventListener("click", () => navigateArtifact(-1));
  elements.nextArtifact.addEventListener("click", () => navigateArtifact(1));
  elements.openLightbox.addEventListener("click", openCurrentLightbox);
  elements.closeLightbox.addEventListener("click", () => elements.lightbox.close());
  elements.previousPhoto.addEventListener("click", () => navigatePhoto(-1));
  elements.nextPhoto.addEventListener("click", () => navigatePhoto(1));
  elements.toggleZoom.addEventListener("click", toggleZoom);
  elements.lightboxImage.addEventListener("click", toggleZoom);

  elements.artifactDialog.addEventListener("click", (event) => {
    if (event.target === elements.artifactDialog) closeArtifact();
  });
  elements.lightbox.addEventListener("click", (event) => {
    if (event.target === elements.lightbox) elements.lightbox.close();
  });

  elements.artifactDialog.addEventListener("close", () => {
    state.currentArtifact = null;
    state.currentPhotos = [];
    if (/^#artifact-\d{3}$/.test(window.location.hash)) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  });

  window.addEventListener("hashchange", handleHash);
  document.addEventListener("keydown", (event) => {
    if (elements.lightbox.open) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigatePhoto(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigatePhoto(1);
      }
      return;
    }
    if (elements.artifactDialog.open) return;
    if (event.key === "/" && document.activeElement !== elements.searchInput) {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

async function initialize() {
  bindEvents();
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    if (!Array.isArray(catalog.groups) || catalog.assigned_photo_count !== catalog.photo_count) {
      throw new Error("Catalog validation failed");
    }
    state.catalog = catalog;
    state.groups = catalog.groups.map((group) => {
      const _displayPhotos = (group.photos || []).filter((photo) => !HIDDEN_DOCUMENT_ROLES.has(photo.role));
      return { ...group, _displayPhotos, _search: searchableText(group) };
    });
    setStats();
    setupStatAnimation();
    renderCategoryTabs();
    applyFilters();
    handleHash();
  } catch (error) {
    console.error("Failed to load Beilin catalog", error);
    elements.catalogGrid.setAttribute("aria-busy", "false");
    elements.catalogGrid.replaceChildren();
    elements.resultCount.textContent = "载入失败";
    elements.loadError.hidden = false;
  }
}

setupMotion();
initialize();
