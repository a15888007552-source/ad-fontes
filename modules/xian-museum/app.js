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
  const galleryStrip = document.getElementById("gallery-strip");
  let activeFilter = "all";
  let activeCategory = "all";
  let lastFocusedElement = null;
  let currentItem = null;
  const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  initOpening();
  setStats();
  renderCategories();
  bindFilters();
  render();
  document.querySelector(".featured-open")?.addEventListener("click", () => openItem("xian-001-painted-mirror"));
}());
