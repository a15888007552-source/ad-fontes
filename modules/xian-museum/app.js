(function () {
  "use strict";

  const data = window.XIAN_DATA || { items: [], categories: [], stats: {} };
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
  let currentItem = null;
  const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const zoomState = { scale: 1, x: 0, y: 0, dragging: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0 };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char]));
  const assetFor = (path) => String(path || "");
  const hasTag = (item, tag) => Array.isArray(item.tags) && item.tags.includes(tag);
  const isGroup = (item) => Boolean(item && item.isGroup);

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
    zoomState.scale = next; clampZoomPan(); applyImageZoom();
  }

  function resetImageZoom() {
    Object.assign(zoomState, { scale: 1, x: 0, y: 0, dragging: false, pointerId: null }); applyImageZoom();
  }

  function initImageZoom() {
    if (!dialogImageWrap || !zoomLevel) return;
    dialogImageWrap.addEventListener("wheel", (event) => { if (!dialogImage.getAttribute("src")) return; event.preventDefault(); setImageZoom(zoomState.scale * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY); }, { passive: false });
    dialogImageWrap.querySelector("[data-zoom-in]")?.addEventListener("click", () => setImageZoom(zoomState.scale * 1.3));
    dialogImageWrap.querySelector("[data-zoom-out]")?.addEventListener("click", () => setImageZoom(zoomState.scale / 1.3));
    dialogImageWrap.querySelector("[data-zoom-reset]")?.addEventListener("click", resetImageZoom);
    dialogImageWrap.addEventListener("dblclick", (event) => { if (!event.target.closest(".zoom-toolbar")) resetImageZoom(); });
    dialogImageWrap.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || zoomState.scale <= 1 || event.target.closest(".zoom-toolbar")) return;
      zoomState.dragging = true; zoomState.pointerId = event.pointerId; zoomState.startX = event.clientX; zoomState.startY = event.clientY; zoomState.originX = zoomState.x; zoomState.originY = zoomState.y; dialogImageWrap.setPointerCapture(event.pointerId); applyImageZoom();
    });
    dialogImageWrap.addEventListener("pointermove", (event) => { if (!zoomState.dragging || event.pointerId !== zoomState.pointerId) return; zoomState.x = zoomState.originX + event.clientX - zoomState.startX; zoomState.y = zoomState.originY + event.clientY - zoomState.startY; clampZoomPan(); applyImageZoom(); });
    const endDrag = (event) => { if (event.pointerId !== zoomState.pointerId) return; zoomState.dragging = false; zoomState.pointerId = null; applyImageZoom(); };
    dialogImageWrap.addEventListener("pointerup", endDrag); dialogImageWrap.addEventListener("pointercancel", endDrag);
    dialogImageWrap.addEventListener("keydown", (event) => {
      if (["+", "="].includes(event.key)) { event.preventDefault(); setImageZoom(zoomState.scale * 1.3); }
      if (event.key === "-") { event.preventDefault(); setImageZoom(zoomState.scale / 1.3); }
      if (event.key === "0") { event.preventDefault(); resetImageZoom(); }
    });
    window.addEventListener("resize", () => { clampZoomPan(); applyImageZoom(); }, { passive: true }); resetImageZoom();
  }
  const tagLabel = (tag) => ({ music: "♫ 音乐关联", group: "展柜图组", forbidden: "禁止出境", featured: "镇馆重点" }[tag] || tag);
  const itemText = (item) => [
    item.title,
    item.period,
    item.material,
    item.category,
    item.origin,
    item.summary,
    ...(Array.isArray(item.tags) ? item.tags : []),
    isGroup(item) ? "展柜图组" : "",
  ].join(" ").toLocaleLowerCase("zh-CN");

  function titleSize(title) {
    const length = Array.from(String(title || "")).length;
    if (length > 27) return "11px";
    if (length > 22) return "12px";
    if (length > 17) return "13px";
    if (length > 12) return "14px";
    return "16px";
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
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    sections.forEach((section) => observer.observe(section));
    requestAnimationFrame(() => {
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top < window.innerHeight * 0.88) {
          section.classList.add("is-visible");
          observer.unobserve(section);
        }
      });
    });
  }

  function setStats() {
    const set = (id, value) => {
      const target = document.getElementById(id);
      if (target) target.textContent = value == null ? "—" : String(value);
    };
    set("stat-items", data.stats?.items ?? items.length);
    set("stat-photos", data.stats?.photos ?? "—");
    set("stat-groups", data.stats?.groups ?? items.filter(isGroup).length);
    set("stat-forbidden", data.stats?.forbidden ?? items.filter((item) => hasTag(item, "forbidden")).length);
    set("filter-all-count", items.length);
    set("filter-music-count", items.filter((item) => hasTag(item, "music")).length);
    set("filter-groups-count", items.filter(isGroup).length);
    set("filter-forbidden-count", items.filter((item) => hasTag(item, "forbidden")).length);
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
      const filterMatch = activeFilter === "all"
        || (activeFilter === "groups" && isGroup(item))
        || (activeFilter === "music" && hasTag(item, "music"))
        || (activeFilter === "forbidden" && hasTag(item, "forbidden"));
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      return filterMatch && categoryMatch && (!query || itemText(item).includes(query));
    });
    const collator = new Intl.Collator("zh-CN");
    return [...output].sort((left, right) => {
      if (sortSelect.value === "title") return collator.compare(String(left.title), String(right.title));
      if (sortSelect.value === "chronology") return String(left.period).localeCompare(String(right.period), "zh-CN") || (left.sequence ?? 9999) - (right.sequence ?? 9999);
      return (left.sequence ?? 9999) - (right.sequence ?? 9999);
    });
  }

  function cardHtml(item, index) {
    const cover = assetFor(item.cover || item.photos?.[0]?.src);
    const tags = [];
    if (isGroup(item)) tags.push("group");
    if (hasTag(item, "music")) tags.push("music");
    if (hasTag(item, "forbidden")) tags.push("forbidden");
    const photoCount = Array.isArray(item.photos) ? item.photos.length : 0;
    const delay = Math.min(index, 15) * 18;
    return `<button class="object-card card-enter" style="--title-size:${titleSize(item.title)};--card-delay:${delay}ms" type="button" data-item-id="${escapeHtml(item.id)}" aria-label="打开 ${escapeHtml(item.title)} 详情">
      <span class="card-image"${cover ? ` style="background-image:linear-gradient(rgba(7,18,21,.35),rgba(7,18,21,.35)),url('${escapeHtml(cover)}')"` : ""}>
        ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}" loading="lazy">` : `<span class="image-placeholder" aria-hidden="true">西</span>`}
        <span class="card-number">${String(item.sequence ?? "—").padStart(3, "0")}</span>
        <span class="card-photo-count">${photoCount} 图</span>
      </span>
      <span class="card-body">
        <span class="card-kicker"><span>${escapeHtml(item.category || "观物档案")}</span><span>${escapeHtml(item.period || "")}</span></span>
        <span class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
        <span class="card-origin">${escapeHtml(item.origin || "出土 / 来源未完整记录")}</span>
        <span class="card-summary">${escapeHtml(item.summary || "")}</span>
        <span class="card-bottom"><span class="card-tags">${tags.map((tag) => `<span class="mini-tag ${tag}">${escapeHtml(tagLabel(tag))}</span>`).join("")}<span class="mini-tag">${photoCount} 图</span></span><span class="card-open" aria-hidden="true">查看档案 →</span></span>
      </span>
    </button>`;
  }

  function bindItemButtons(scope) {
    scope.querySelectorAll("[data-item-id]").forEach((button) => {
      button.addEventListener("click", () => openItem(button.dataset.itemId));
    });
  }

  function render() {
    const output = filteredItems();
    grid.innerHTML = output.map(cardHtml).join("");
    grid.hidden = output.length === 0;
    empty.hidden = output.length !== 0;
    resultCount.textContent = `显示 ${output.length} / ${items.length} 条目`;
    const query = searchInput.value.trim();
    const chips = [
      activeFilter === "music" ? tagLabel("music") : "",
      activeFilter === "groups" ? tagLabel("group") : "",
      activeFilter === "forbidden" ? tagLabel("forbidden") : "",
      activeCategory !== "all" ? activeCategory : "",
      query ? `“${query}”` : "",
    ].filter(Boolean);
    activeQuery.textContent = chips.join(" · ");
    bindItemButtons(grid);
  }

  function activateCategory(category) {
    activeFilter = "all";
    activeCategory = category;
    searchInput.value = "";
    document.querySelectorAll("[data-filter]").forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "all"));
    renderCategories();
    render();
    document.getElementById("collection")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function renderRoutes() {
    const holder = document.getElementById("route-grid");
    if (!holder) return;
    const routes = [
      { number: "I", title: "青铜铭辞", category: "青铜礼器", itemId: "xian-048-5024", image: "assets/photos/focus-5024.webp", note: "从永盂、乙鼎与申父庚盉的器形和铭文，辨认西周礼制中的册命、宴飨与家族记忆。" },
      { number: "II", title: "汉家日用", category: "生活器用", itemId: "xian-018-4907", image: "assets/photos/focus-4907.webp", note: "羊灯、席镇、行灶与博山炉把视线引向汉代居室：照明、熏香、坐席和炊事皆有具体形制。" },
      { number: "III", title: "石上梵影", category: "佛教造像", itemId: "xian-028-4955", image: "assets/photos/focus-4955.webp", note: "由北朝造像碑至唐代坐佛，题记、背光与尊像组合记录佛教艺术在长安地区的落地过程。" },
      { number: "IV", title: "彩釉长安", category: "陶俑与雕塑", itemId: "xian-057-5058", image: "assets/photos/focus-5058.webp", note: "腾空马、蓝釉驴与彩绘陶俑保留姿态、服饰和釉色，也显出唐代城市交通与外来文化的踪迹。" },
    ];
    holder.innerHTML = routes.map((route) => {
      const count = items.filter((item) => item.category === route.category).length;
      return `<article class="route-card">
        <button class="route-object" type="button" data-item-id="${escapeHtml(route.itemId)}" aria-label="打开${escapeHtml(route.title)}代表文物详情"><img src="${escapeHtml(route.image)}" alt="${escapeHtml(route.title)}代表文物" loading="lazy"><span>${escapeHtml(route.number)}</span></button>
        <div class="route-copy"><small>${escapeHtml(route.category)} · ${count} 件</small><h3>${escapeHtml(route.title)}</h3><p>${escapeHtml(route.note)}</p><button class="route-enter" type="button" data-route-category="${escapeHtml(route.category)}">沿此径浏览 ${count} 件文物 <span>→</span></button></div>
      </article>`;
    }).join("");
    bindItemButtons(holder);
    holder.querySelectorAll("[data-route-category]").forEach((button) => button.addEventListener("click", () => activateCategory(button.dataset.routeCategory)));
  }

  function metaHtml(item) {
    const values = [
      ["时代", item.period || "年代未完整识读"],
      ["材质", item.material || "材质未完整识读"],
      ["类别", item.category || "未分类"],
      ["出土 / 来源", item.origin || "来源未完整记录"],
      ["器物视图", item.photoRange || `${(item.photos || []).length} 图`],
      ["档案编号", `XAM-${String(item.sequence ?? "—").padStart(3, "0")}`],
    ];
    return values.map(([label, value]) => `<div><b>${escapeHtml(label)}</b>${escapeHtml(value)}</div>`).join("");
  }

  function setDialogImage(photo, index, total) {
    resetImageZoom();
    const source = assetFor(photo?.src);
    dialogImage.src = source;
    dialogImage.alt = `${currentItem?.title || "条目"} · ${photo?.caption || "器物视图"}`;
    const frame = typeof photo?.number === "number" ? `DSC_${photo.number}` : (photo?.number || "补充视图");
    document.getElementById("dialog-sequence").textContent = `${frame} · ${index + 1} / ${Math.max(total, 1)}`;
    galleryStrip.querySelectorAll(".gallery-thumb").forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === index));
  }

  function openItem(id) {
    const item = itemById.get(String(id));
    if (!item) return;
    currentItem = item;
    lastFocusedElement = document.activeElement;
    const photos = Array.isArray(item.photos) ? item.photos.filter((photo) => photo && photo.src) : [];
    document.getElementById("dialog-kicker").textContent = `${String(item.sourceMuseum || "西安博物院").toUpperCase()}  /  ${isGroup(item) ? "展柜图组" : "OBJECT RECORD"}`;
    const title = document.getElementById("dialog-title");
    title.textContent = item.title || "未命名条目";
    title.style.setProperty("--dialog-title-size", dialogTitleSize(item.title));
    document.getElementById("dialog-tags").innerHTML = [
      isGroup(item) ? `<span class="group">展柜图组</span>` : "",
      hasTag(item, "music") ? `<span class="music">♫ 音乐关联</span>` : "",
      hasTag(item, "forbidden") ? `<span class="forbidden">禁止出境文物</span>` : "",
      `<span>${escapeHtml(item.category || "观物档案")}</span>`,
    ].filter(Boolean).join("");
    document.getElementById("dialog-meta").innerHTML = metaHtml(item);
    document.getElementById("dialog-essay").innerHTML = (item.sections || []).map((section) => `<section><h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.text)}</p></section>`).join("");
    const sourceLinks = (item.sources || []).map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} ↗</a>`).join(" · ");
    document.getElementById("dialog-evidence").innerHTML = `<b>资料来源</b><br>${escapeHtml(item.evidence || "名称、时代与来源依据现场展签。") }${sourceLinks ? `<br>${sourceLinks}` : ""}`;
    galleryStrip.innerHTML = photos.map((photo, index) => `<button class="gallery-thumb" type="button" data-photo-index="${index}" aria-label="查看第 ${index + 1} 张器物视图"><img src="${escapeHtml(photo.src)}" alt="" loading="lazy"></button>`).join("");
    galleryStrip.querySelectorAll("[data-photo-index]").forEach((button) => button.addEventListener("click", () => setDialogImage(photos[Number(button.dataset.photoIndex)], Number(button.dataset.photoIndex), photos.length)));
    if (photos.length) setDialogImage(photos[0], 0, photos.length);
    dialog.setAttribute("aria-modal", "true");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    dialog.classList.add("is-open");
    document.getElementById("dialog-close").focus();
  }

  function closeDialog() {
    resetImageZoom();
    if (!dialog.open && !dialog.hasAttribute("open")) return;
    dialog.classList.remove("is-open");
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    dialog.removeAttribute("aria-modal");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
  }

  function bindFilters() {
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((chip) => chip.classList.toggle("active", chip === button));
        render();
      });
    });
    searchInput.addEventListener("input", render);
    sortSelect.addEventListener("change", render);
    document.getElementById("clear-filters").addEventListener("click", () => {
      activeFilter = "all";
      activeCategory = "all";
      searchInput.value = "";
      document.querySelectorAll("[data-filter]").forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === "all"));
      renderCategories();
      render();
    });
  }

  function syncThemeButton() {
    const button = document.getElementById("theme-toggle");
    const dark = document.documentElement.dataset.theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "切换到浅色主题" : "切换到深色主题");
  }

  function readTheme() {
    try { return window.localStorage.getItem("xian-theme"); } catch (error) { return null; }
  }

  function writeTheme(value) {
    try { window.localStorage.setItem("xian-theme", value); } catch (error) { /* private browsing can disable storage */ }
  }

  function initTheme() {
    const stored = readTheme();
    if (stored === "dark" || stored === "light") document.documentElement.dataset.theme = stored;
    syncThemeButton();
    document.getElementById("theme-toggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      writeTheme(next);
      syncThemeButton();
    });
  }

  function initOpening() {
    const opening = document.getElementById("opening");
    if (!opening) return;
    document.body.classList.add("opening-active");
    const close = () => {
      opening.classList.add("is-leaving");
      document.body.classList.remove("opening-active");
      window.setTimeout(() => opening.remove(), reduceMotion ? 0 : 720);
    };
    document.getElementById("opening-enter")?.addEventListener("click", close);
    document.getElementById("opening-skip")?.addEventListener("click", close);
    if (!reduceMotion) window.setTimeout(() => opening.classList.add("is-ready"), 120);
    else opening.classList.add("is-ready");
  }

  document.getElementById("dialog-close").addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener("close", () => {
    dialog.classList.remove("is-open");
    dialog.removeAttribute("aria-modal");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  if (!reduceMotion) initMotion();
  else document.documentElement.classList.add("motion-ready");
  initTheme();
  initImageZoom();
  initOpening();
  setStats();
  renderCategories();
  bindFilters();
  renderRoutes();
  render();
  document.querySelector(".featured-open")?.addEventListener("click", () => openItem("xian-001-painted-mirror"));
}());
