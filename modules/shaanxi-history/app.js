(function () {
  "use strict";

  const data = window.SHAANXI_DATA || { items: [], categories: [], wallPaintings: [], stats: {} };
  const items = Array.isArray(data.items) ? data.items : [];
  const itemById = new Map(items.map((item) => [String(item.id), item]));
  const grid = document.getElementById("object-grid");
  const empty = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const resultCount = document.getElementById("result-count");
  const activeQuery = document.getElementById("active-query");
  const dialog = document.getElementById("object-dialog");
  const dialogImage = document.getElementById("dialog-image");
  const dialogImageWrap = document.getElementById("dialog-image-wrap");
  const zoomLevel = document.getElementById("zoom-level");
  const galleryStrip = document.getElementById("gallery-strip");
  let activeFilter = "all";
  let activeCategory = "all";
  let lastFocusedElement = null;
  let titleFitFrame = 0;
  const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const zoomState = { scale: 1, x: 0, y: 0, dragging: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0 };
  const IMAGE_REV = "20260817-polish1";

  function initMotion() {
    document.documentElement.classList.add("motion-ready");
    const sections = [...document.querySelectorAll(".section")];
    sections.forEach((section, index) => {
      section.classList.add("reveal");
      section.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 60}ms`);
    });

    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    // Long archive sections can be hundreds of viewports tall. A percentage
    // threshold would never be reached for the full 296-card collection, so
    // reveal as soon as any part of the section enters the viewport.
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });

    sections.forEach((section) => observer.observe(section));
    // The archive must never disappear while an observer is waiting for a
    // scroll threshold.  This is especially important for local file://
    // previews, where the first intersection callback can be delayed or
    // omitted by the embedded browser.
    requestAnimationFrame(() => {
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top < window.innerHeight * 0.88) {
          section.classList.add("is-visible");
          observer.unobserve(section);
        }
      });
    });
  }

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char]));
  const isCompleteMediaUrl = (value) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
  const assetFor = (path) => {
    const value = String(path || "");
    if (!value || isCompleteMediaUrl(value)) return value;
    const resolved = shaanxiHistoryMediaUrl(value);
    return `${resolved}${resolved.includes("?") ? "&" : "?"}rev=${IMAGE_REV}`;
  };
  const cssUrl = (value) => encodeURI(String(shaanxiHistoryMediaUrl(value) || "")).replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16)}`);
  const cardCoverFor = (item) => item.localMedia ? new URL(item.localMedia, document.baseURI).href : assetFor(`assets/card-covers/${String(item.id).replace(/[^A-Za-z0-9_-]+/g, "-")}.webp`);
  const photoSourceFor = (photo) => photo?.localMedia ? new URL(photo.localMedia, document.baseURI).href : assetFor(photo?.focus || photo?.src);
  const hasTag = (item, tag) => Array.isArray(item.tags) && item.tags.includes(tag);

  function applyImageZoom() {
    dialogImageWrap.style.setProperty("--zoom-scale", zoomState.scale.toFixed(3));
    dialogImageWrap.style.setProperty("--zoom-x", `${zoomState.x.toFixed(1)}px`);
    dialogImageWrap.style.setProperty("--zoom-y", `${zoomState.y.toFixed(1)}px`);
    dialogImageWrap.classList.toggle("is-zoomed", zoomState.scale > 1.001);
    dialogImageWrap.classList.toggle("is-dragging", zoomState.dragging);
    zoomLevel.textContent = `${Math.round(zoomState.scale * 100)}%`;
  }

  function clampZoomPan() {
    const rect = dialogImageWrap.getBoundingClientRect();
    const maxX = Math.max(0, rect.width * (zoomState.scale - 1) / 2);
    const maxY = Math.max(0, rect.height * (zoomState.scale - 1) / 2);
    zoomState.x = Math.max(-maxX, Math.min(maxX, zoomState.x));
    zoomState.y = Math.max(-maxY, Math.min(maxY, zoomState.y));
    if (zoomState.scale <= 1.001) { zoomState.scale = 1; zoomState.x = 0; zoomState.y = 0; }
  }

  function setImageZoom(nextScale, clientX, clientY) {
    const previous = zoomState.scale;
    const next = Math.max(1, Math.min(6, nextScale));
    if (Number.isFinite(clientX) && Number.isFinite(clientY) && previous > 0) {
      const rect = dialogImageWrap.getBoundingClientRect();
      const pointX = (clientX - rect.left - rect.width / 2 - zoomState.x) / previous;
      const pointY = (clientY - rect.top - rect.height / 2 - zoomState.y) / previous;
      zoomState.x = clientX - rect.left - rect.width / 2 - pointX * next;
      zoomState.y = clientY - rect.top - rect.height / 2 - pointY * next;
    }
    zoomState.scale = next;
    clampZoomPan();
    applyImageZoom();
  }

  function resetImageZoom() {
    Object.assign(zoomState, { scale: 1, x: 0, y: 0, dragging: false, pointerId: null });
    applyImageZoom();
  }

  function initImageZoom() {
    if (!dialogImageWrap || !zoomLevel) return;
    dialogImageWrap.addEventListener("wheel", (event) => {
      if (!dialogImage.getAttribute("src")) return;
      event.preventDefault();
      setImageZoom(zoomState.scale * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
    }, { passive: false });
    dialogImageWrap.querySelector("[data-zoom-in]")?.addEventListener("click", () => setImageZoom(zoomState.scale * 1.3));
    dialogImageWrap.querySelector("[data-zoom-out]")?.addEventListener("click", () => setImageZoom(zoomState.scale / 1.3));
    dialogImageWrap.querySelector("[data-zoom-reset]")?.addEventListener("click", resetImageZoom);
    dialogImageWrap.addEventListener("dblclick", (event) => { if (!event.target.closest(".zoom-toolbar")) resetImageZoom(); });
    dialogImageWrap.addEventListener("pointerdown", (event) => {
      if (zoomState.dragging || event.isPrimary === false || event.button !== 0 || zoomState.scale <= 1 || event.target.closest(".zoom-toolbar")) return;
      event.preventDefault();
      zoomState.dragging = true; zoomState.pointerId = event.pointerId; zoomState.startX = event.clientX; zoomState.startY = event.clientY; zoomState.originX = zoomState.x; zoomState.originY = zoomState.y;
      dialogImageWrap.setPointerCapture(event.pointerId); applyImageZoom();
    });
    dialogImageWrap.addEventListener("pointermove", (event) => {
      if (!zoomState.dragging || event.pointerId !== zoomState.pointerId) return;
      zoomState.x = zoomState.originX + event.clientX - zoomState.startX; zoomState.y = zoomState.originY + event.clientY - zoomState.startY; clampZoomPan(); applyImageZoom();
    });
    const endDrag = (event) => { if (event.pointerId !== zoomState.pointerId) return; zoomState.dragging = false; zoomState.pointerId = null; applyImageZoom(); };
    dialogImageWrap.addEventListener("pointerup", endDrag); dialogImageWrap.addEventListener("pointercancel", endDrag); dialogImageWrap.addEventListener("lostpointercapture", endDrag);
    dialogImageWrap.addEventListener("keydown", (event) => {
      if (["+", "="].includes(event.key)) { event.preventDefault(); setImageZoom(zoomState.scale * 1.3); }
      if (event.key === "-") { event.preventDefault(); setImageZoom(zoomState.scale / 1.3); }
      if (event.key === "0") { event.preventDefault(); resetImageZoom(); }
    });
    window.addEventListener("resize", () => { clampZoomPan(); applyImageZoom(); }, { passive: true });
    resetImageZoom();
  }
  const sequenceOrder = (item) => Number(item.sequenceOrder ?? item.sequence ?? 9999);
  const displayNumber = (item) => item.displayNumber || (Number.isFinite(Number(item.sequence)) ? String(item.sequence).padStart(3, "0") : "—");
  const textFor = (item) => [
    item.title,
    item.period,
    item.material,
    item.type,
    item.origin,
    item.summary,
    item.tagsText,
    ...(item.tags || []),
  ].join(" ").toLocaleLowerCase("zh-CN");

  function tagLabel(tag) {
    return ({
      music: "♫ 音乐关联",
      forbidden: "禁止出境",
      greek: "文明以止",
      wall: "唐墓壁画",
    }[tag]) || tag;
  }

  function titleSize(title) {
    const length = Array.from(String(title || "")).length;
    if (length > 25) return "12px";
    if (length > 20) return "13px";
    if (length > 15) return "15px";
    if (length > 11) return "17px";
    return "20px";
  }

  function fitCardTitles() {
    const cards = [...grid.querySelectorAll(".object-card")];
    cards.forEach((card) => {
      card.style.setProperty("--title-size", `${card.dataset.titleSize}px`);
    });
    // Measure only after every card has returned to its intended maximum.
    // This keeps short names large while fitting the few long names onto one line.
    cards.forEach((card) => {
      const title = card.querySelector(".card-title");
      const baseSize = Number(card.dataset.titleSize) || 16;
      if (!title || title.scrollWidth <= title.clientWidth + 1) return;
      const ratio = title.clientWidth / Math.max(title.scrollWidth, 1);
      const fittedSize = Math.max(8.6, Math.floor(baseSize * ratio * 9.8) / 10);
      card.style.setProperty("--title-size", `${fittedSize}px`);
    });
  }

  function scheduleTitleFit() {
    cancelAnimationFrame(titleFitFrame);
    titleFitFrame = requestAnimationFrame(fitCardTitles);
  }

  function dialogTitleSize(title) {
    const length = Array.from(String(title || "")).length;
    if (length > 30) return "17px";
    if (length > 24) return "19px";
    if (length > 18) return "22px";
    if (length > 13) return "26px";
    if (length > 9) return "30px";
    return "34px";
  }

  function bindItemButtons(scope) {
    if (!scope) return;
    scope.querySelectorAll("[data-item-id]").forEach((button) => {
      button.addEventListener("click", () => openItem(button.dataset.itemId, { syncUrl: true }));
    });
  }

  function getItemFromLocation() {
    const id = new URLSearchParams(window.location.search).get("item");
    return id && itemById.has(id) ? id : null;
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
    window.history.pushState({ item: id ? String(id) : null }, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function setStats() {
    const filters = ["music", "forbidden", "greek", "wall"];
    const markedKinds = filters.filter((tag) => items.some((item) => hasTag(item, tag))).length;
    const itemStat = document.getElementById("stat-items");
    const photoStat = document.getElementById("stat-photos");
    const flagStat = document.getElementById("stat-flags");
    if (itemStat) itemStat.textContent = items.length ? String(items.length) : "—";
    if (photoStat) photoStat.textContent = data.stats?.photos ? String(data.stats.photos) : "—";
    if (flagStat) flagStat.textContent = markedKinds ? String(markedKinds) : "—";

    ["all", ...filters].forEach((filter) => {
      const target = document.getElementById(`filter-${filter}-count`);
      if (!target) return;
      target.textContent = filter === "all"
        ? String(items.length)
        : String(items.filter((item) => hasTag(item, filter)).length);
    });
  }

  function renderCategories() {
    const holder = document.getElementById("category-filters");
    if (!holder) return;
    const categories = [...new Set((data.categories || []).filter(Boolean))];
    holder.innerHTML = categories.length
      ? `<span class="filter-label">类别：</span>${categories.map((category) => `<button class="filter-chip ${activeCategory === category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}`
      : "";
    holder.querySelectorAll("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = activeCategory === button.dataset.category ? "all" : button.dataset.category;
        renderCategories();
        render();
      });
    });
  }

  function filteredItems() {
    const query = searchInput.value.trim().toLocaleLowerCase("zh-CN");
    const output = items.filter((item) => {
      const filterMatch = activeFilter === "all" || hasTag(item, activeFilter);
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      const searchMatch = !query || textFor(item).includes(query);
      return filterMatch && categoryMatch && searchMatch;
    });
    return [...output].sort((left, right) => {
      if (sortSelect.value === "title") return String(left.title).localeCompare(String(right.title), "zh-CN");
      if (sortSelect.value === "chronology") return (left.yearValue ?? 9999) - (right.yearValue ?? 9999) || sequenceOrder(left) - sequenceOrder(right);
      return sequenceOrder(left) - sequenceOrder(right);
    });
  }

  function cardHtml(item, index) {
    const cover = cardCoverFor(item);
    const tags = (item.tags || []).filter((tag) => ["music", "forbidden", "greek", "wall"].includes(tag));
    const photoCount = (item.photos || []).length;
    const sourceCount = (item.sources || []).length;
    const cardLead = item.cardLead || (item.essay || [])[1]?.text || (item.essay || [])[0]?.text || "";
    const delay = Math.min(index, 11) * 18;
    const baseTitleSize = Number.parseFloat(titleSize(item.title));
    const inlineStyle = `--title-size:${baseTitleSize}px;--card-delay:${delay}ms`;
    return `<button class="object-card card-enter" style="${escapeHtml(inlineStyle)}" type="button" data-title-size="${baseTitleSize}" data-item-id="${escapeHtml(item.id)}" aria-label="打开 ${escapeHtml(item.title)} 详情">
      <span class="card-image">
        ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">` : `<span class="image-placeholder" aria-hidden="true">陕</span>`}
        <span class="card-number">${escapeHtml(displayNumber(item))}</span>
        <span class="card-photo-count">${photoCount} 图</span>
      </span>
      <span class="card-body">
        <span class="card-kicker"><span>${escapeHtml(item.category || "观物档案")}</span><span>${escapeHtml(item.period || "")}</span></span>
        <span class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
        <span class="card-origin">${escapeHtml(item.origin || "出土 / 来源未完整记录")}</span>
        <span class="card-lead">${escapeHtml(cardLead)}</span>
        <span class="card-bottom">
          <span class="card-tags">${tags.map((tag) => `<span class="mini-tag ${escapeHtml(tag)}">${escapeHtml(tagLabel(tag))}</span>`).join("")}</span>
          <span class="card-reference">${sourceCount ? `资料 ${sourceCount}` : "现场档案"}<i aria-hidden="true">→</i></span>
        </span>
      </span>
    </button>`;
  }

  function render() {
    const output = filteredItems();
    grid.innerHTML = output.map(cardHtml).join("");
    empty.hidden = output.length !== 0;
    grid.hidden = output.length === 0;
    resultCount.textContent = `显示 ${output.length} / ${items.length} 条目`;
    const query = searchInput.value.trim();
    const chips = [
      activeFilter !== "all" ? tagLabel(activeFilter) : "",
      activeCategory !== "all" ? activeCategory : "",
      query ? `“${query}”` : "",
    ].filter(Boolean);
    activeQuery.textContent = chips.join(" · ");
    bindItemButtons(grid);
    scheduleTitleFit();
  }

  function detailArchiveField(label, value, keepSlot = false) {
    const normalized = value == null ? "" : String(value).trim();
    if (!normalized && keepSlot) return '<div class="detail-archive-field" hidden aria-hidden="true"></div>';
    if (!normalized) return "";
    return '<div class="detail-archive-field"><span class="detail-archive-label">'
      + escapeHtml(label)
      + '</span><strong class="detail-archive-value">'
      + escapeHtml(normalized)
      + '</strong></div>';
  }

  function detailArchiveMarkup(item) {
    const archiveFields = [
      ["文物编号", "SHM-" + displayNumber(item)],
      ["类别", item.type],
      ["时代", item.period],
      ["材质", item.material],
      ["出土地点", item.findspot],
      ["尺寸", item.dimensions],
    ];
    const photos = Array.isArray(item.photos) ? item.photos : [];
    const photoFields = [
      ["SOURCE / 出土 / 来源", item.origin],
      ["PHOTO SET / 器物图组", item.photoRange || (photos.length ? `${photos.length} 图` : "")],
    ];
    return '<section class="detail-archive-fields" aria-label="文物档案">'
      + '<h3 class="detail-archive-heading"><span>ARTIFACT ARCHIVE</span><small>文物档案</small></h3>'
      + '<div class="detail-archive-grid">'
      + archiveFields.map(([label, value]) => detailArchiveField(label, value, true)).join("")
      + photoFields.map(([label, value]) => detailArchiveField(label, value)).join("")
      + '</div></section>';
  }

  function mountDetailArchiveFields(anchor, item) {
    anchor.outerHTML = detailArchiveMarkup(item).replace(
      '<section class="detail-archive-fields"',
      '<section id="dialog-meta" class="detail-archive-fields"',
    );
  }

  function setDialogImage(photo, index, total) {
    resetImageZoom();
    const source = photoSourceFor(photo);
    dialogImage.src = source;
    dialogImage.alt = photo?.label || "文物器物图";
    const imageWrap = dialogImage.closest(".dialog-image-wrap");
    if (source) imageWrap?.style.setProperty("--dialog-bg", `url(${cssUrl(source)})`);
    else imageWrap?.style.removeProperty("--dialog-bg");
    const frame = photo?.viewLabel || (photo?.number ? `DSC_${photo.number}` : "补入资料图");
    document.getElementById("dialog-sequence").textContent = `${frame} · ${index + 1} / ${Math.max(total, 1)}`;
  }

  function openItem(id, { syncUrl = false, focusClose = true, rememberFocus = true } = {}) {
    const item = itemById.get(String(id));
    if (!item) return false;
    dialog.dataset.itemId = item.id;
    if (rememberFocus) lastFocusedElement = document.activeElement;
    const photos = Array.isArray(item.photos) ? item.photos.filter((photo) => photo && (photo.focus || photo.src)) : [];
    const title = document.getElementById("dialog-title");
    document.getElementById("dialog-kicker").textContent = [item.category || "观物档案", item.period || ""].filter(Boolean).join(" · ");
    title.textContent = item.title;
    title.title = item.title;
    title.style.setProperty("--dialog-title-size", dialogTitleSize(item.title));
    document.getElementById("dialog-tags").innerHTML = (item.tags || [])
      .map((tag) => `<span class="mini-tag ${escapeHtml(tag)}">${escapeHtml(tagLabel(tag))}</span>`)
      .join("");
    mountDetailArchiveFields(document.getElementById("dialog-meta"), item);
    document.getElementById("dialog-essay").innerHTML = (item.essay || [])
      .map((part) => `<h3>${escapeHtml(part.heading)}</h3><p>${escapeHtml(part.text)}</p>`)
      .join("");
    const sources = (item.sources || [])
      .map((source) => source.url
        ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label || source.url)} ↗</a>`
        : escapeHtml(source.label))
      .join(" · ");
    document.getElementById("dialog-evidence").innerHTML = `<b>资料与图像说明</b><br>${escapeHtml(item.evidence || "名称与年代以现场展签及公开馆藏资料为依据。")}${sources ? `<br><span>公开资料：${sources}</span>` : ""}`;

    if (photos.length) {
      setDialogImage(photos[0], 0, photos.length);
      galleryStrip.innerHTML = photos.map((photo, index) => `<button class="gallery-thumb ${index === 0 ? "active" : ""}" type="button" data-photo-index="${index}" aria-label="查看第 ${index + 1} 张器物图"><img src="${escapeHtml(photoSourceFor(photo))}" alt="${escapeHtml(item.title)} · 第 ${index + 1} 张器物图" loading="lazy" decoding="async"></button>`).join("");
      galleryStrip.querySelectorAll("[data-photo-index]").forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.dataset.photoIndex);
          galleryStrip.querySelectorAll(".gallery-thumb").forEach((thumb) => thumb.classList.toggle("active", thumb === button));
          setDialogImage(photos[index], index, photos.length);
        });
      });
    } else {
      dialogImage.removeAttribute("src");
      dialogImage.alt = "该条目暂无可展示器物图";
      dialogImage.closest(".dialog-image-wrap")?.style.removeProperty("--dialog-bg");
      document.getElementById("dialog-sequence").textContent = "暂无器物图";
      galleryStrip.innerHTML = "";
    }

    const dialogAlreadyOpen = dialog.open || dialog.hasAttribute("open");
    if (!dialogAlreadyOpen) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    dialog.setAttribute("aria-modal", "true");
    requestAnimationFrame(() => {
      dialog.classList.add("is-open");
      if (focusClose) document.getElementById("dialog-close")?.focus();
    });
    if (syncUrl) syncItemToUrl(item.id);
    return true;
  }

  function closeDialog({ syncUrl = false } = {}) {
    resetImageZoom();
    if (syncUrl) syncItemToUrl(null);
    dialog.classList.remove("is-open");
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function renderSpecialPreview() {
    const holder = document.getElementById("special-preview");
    if (!holder) return;
    const specialItems = items.filter((item) => hasTag(item, "greek")).slice(0, 3);
    holder.innerHTML = specialItems.map((item) => `<button class="special-card" type="button" data-item-id="${escapeHtml(item.id)}" aria-label="打开 ${escapeHtml(item.title)} 详情"><img src="${escapeHtml(cardCoverFor(item))}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async"><span><small>${escapeHtml(item.period || "文明以止")}</small><span class="special-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span></span></button>`).join("");
    bindItemButtons(holder);
  }

  function renderTreasureGrid() {
    const holder = document.getElementById("treasure-grid");
    if (!holder) return;
    const notes = {
      "field-4445": "骆驼背上的七名乐工与一名舞者，把胡汉乐舞、商旅往来和唐代三彩烧造凝聚在同一组形象中。",
      "field-4523": "提梁、凤首流与腹内水道彼此配合；从壶底注水而由壶嘴倾出，是耀州窑早期制瓷技术的罕见实例。",
      "field-4618": "银壶借皮囊形制塑出鼓腹，壶身錾刻衔杯舞马，直接对应唐玄宗宫廷驯马祝寿的乐舞传统。",
      "field-4681": "整块缠丝玛瑙琢成兽首角杯，金质口鼻与天然纹带相接，见证中亚器形进入唐代宫廷后的重新制作。",
      "wall-maqiu": "骑手策马击球，人物与坐骑在疾驰中彼此穿插，是唐代马球运动、服饰与鞍具最具代表性的图像记录之一。",
      "wall-hunting": "数十骑出行于山林之间，鹰犬、旗帜与马队构成长卷式场面，保存了唐代贵族游猎制度的视觉细节。",
      "wall-que-lou": "高大的阙楼、城垣和山水共同界定墓主人身份；建筑形象为唐代宫阙布局与等级秩序提供了稀见资料。",
      "wall-gongnv": "九名宫女手持器物徐行，衣裙、发式与行列节奏细致可辨，成为观察唐代宫廷女性生活的重要图像。",
    };
    const treasureItems = items.filter((item) => hasTag(item, "forbidden"));
    holder.innerHTML = treasureItems.map((item, index) => `<button class="treasure-card" type="button" data-item-id="${escapeHtml(item.id)}" aria-label="打开 ${escapeHtml(item.title)} 详情">
      <span class="treasure-image"><img src="${escapeHtml(cardCoverFor(item))}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async"><b>${String(index + 1).padStart(2, "0")}</b></span>
      <span class="treasure-copy"><span class="treasure-meta">${escapeHtml(item.period || "")} · ${escapeHtml(item.category || "馆藏文物")}</span><strong>${escapeHtml(item.title)}</strong><span class="treasure-note">${escapeHtml(notes[item.id] || item.summary || "查看完整馆藏资料。")}</span><i>展开完整资料与图组 →</i></span>
    </button>`).join("");
    bindItemButtons(holder);
  }

  function initOpening() {
    const opening = document.getElementById("opening-screen");
    const skip = document.getElementById("opening-skip");
    if (!opening) return;

    if (getItemFromLocation()) {
      opening.remove();
      return;
    }

    let seen = false;
    try { seen = sessionStorage.getItem("shaanxi-opening-seen") === "1"; } catch { /* restricted storage is non-fatal */ }
    const force = new URLSearchParams(window.location.search).get("intro") === "1";
    if ((seen && !force) || reduceMotion) {
      opening.remove();
      return;
    }

    const root = document.documentElement;
    let closeTimer = 0;
    root.classList.add("intro-enabled", "intro-playing");
    opening.setAttribute("aria-hidden", "false");

    const finish = () => {
      if (!opening.isConnected || opening.classList.contains("is-leaving")) return;
      window.clearTimeout(closeTimer);
      opening.classList.add("is-leaving");
      root.classList.remove("intro-playing");
      try { sessionStorage.setItem("shaanxi-opening-seen", "1"); } catch { /* restricted storage is non-fatal */ }
      window.setTimeout(() => {
        opening.remove();
        root.classList.remove("intro-enabled");
      }, 720);
    };

    skip?.addEventListener("click", finish, { once: true });
    opening.addEventListener("click", (event) => {
      if (event.target === opening) finish();
    });
    closeTimer = window.setTimeout(finish, 3800);
  }

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
      render();
      if (button.dataset.filter !== "all") document.getElementById("collection").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });
  document.querySelectorAll("[data-filter-jump]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector(`[data-filter="${link.dataset.filterJump}"]`);
      if (target) target.click();
    });
  });
  searchInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);
  window.addEventListener("resize", scheduleTitleFit, { passive: true });
  document.getElementById("clear-filters").addEventListener("click", () => {
    activeFilter = "all";
    activeCategory = "all";
    searchInput.value = "";
    document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === "all"));
    renderCategories();
    render();
  });
  document.getElementById("dialog-close").addEventListener("click", () => closeDialog({ syncUrl: true }));
  dialog.addEventListener("close", () => {
    dialog.classList.remove("is-open");
    dialog.removeAttribute("aria-modal");
    const restore = lastFocusedElement;
    lastFocusedElement = null;
    if (restore && typeof restore.focus === "function") restore.focus();
  });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog({ syncUrl: true }); });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog({ syncUrl: true }); });
  window.addEventListener("popstate", () => {
    const id = getItemFromLocation();
    if (id) openItem(id, { syncUrl: false, focusClose: false, rememberFocus: false });
    else closeDialog({ syncUrl: false });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape" && dialog.hasAttribute("open")) {
      event.preventDefault();
      closeDialog({ syncUrl: true });
    }
  });

  const themeToggle = document.getElementById("theme-toggle");
  function readTheme() {
    try { return localStorage.getItem("shaanxi-theme"); } catch { return null; }
  }
  function writeTheme(value) {
    try { localStorage.setItem("shaanxi-theme", value); } catch { /* restricted storage is non-fatal */ }
  }
  function syncThemeButton() {
    const dark = document.documentElement.dataset.theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.setAttribute("aria-label", dark ? "切换到浅色主题" : "切换到深色主题");
  }
  const savedTheme = readTheme();
  if (savedTheme === "dark" || savedTheme === "light") document.documentElement.dataset.theme = savedTheme;
  syncThemeButton();
  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    writeTheme(next);
    syncThemeButton();
  });

  initMotion();
  initImageZoom();
  setStats();
  renderCategories();
  render();
  renderTreasureGrid();
  renderSpecialPreview();
  // Start the visible duration only after the heavy archive grid has finished
  // its synchronous first render; otherwise the timer can expire before paint.
  initOpening();
  const initialItem = getItemFromLocation();
  if (initialItem) openItem(initialItem, { syncUrl: false, focusClose: true, rememberFocus: false });
}());
