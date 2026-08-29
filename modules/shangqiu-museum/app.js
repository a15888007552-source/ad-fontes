(() => {
  "use strict";

  const photos = Array.isArray(window.SHANGQIU_PHOTOS) ? window.SHANGQIU_PHOTOS : [];
  const catalog = Array.isArray(window.SHANGQIU_CATALOG) ? window.SHANGQIU_CATALOG : [];
  const photoByNumber = new Map(photos.map((photo) => [photo.number, photo]));
  const artifactById = new Map(catalog.map((artifact) => [artifact.id, artifact]));
  const state = { category: "全部", query: "", zoom: 1, x: 0, y: 0, dragging: false, dragX: 0, dragY: 0 };

  const grid = document.querySelector("#catalog-grid");
  const visibleCount = document.querySelector("#visible-count");
  const groupCount = document.querySelector("#group-count");
  const emptyState = document.querySelector("#empty-state");
  const filterRow = document.querySelector("#filter-row");
  const searchInput = document.querySelector("#search-input");
  const resetFilter = document.querySelector("#reset-filter");
  const dialog = document.querySelector("#artifact-dialog");
  const dialogImage = document.querySelector("#dialog-image");
  const filmstrip = document.querySelector("#filmstrip");
  const viewer = document.querySelector("#viewer");
  const zoomLabel = document.querySelector("#zoom-label");
  const opening = document.querySelector("#opening-screen");
  const openingEnter = document.querySelector("#opening-enter");
  const openingSkip = document.querySelector("#opening-skip");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function dismissOpening() {
    if (!opening || opening.classList.contains("is-leaving")) return;
    if (opening.contains(document.activeElement)) {
      document.querySelector(".hero-actions .button-primary")?.focus({ preventScroll: true });
    }
    opening.classList.add("is-leaving");
    opening.setAttribute("aria-hidden", "true");
    document.body.classList.remove("intro-active");
    window.setTimeout(() => opening.remove(), 420);
  }

  openingEnter?.addEventListener("click", dismissOpening);
  openingSkip?.addEventListener("click", dismissOpening);
  window.setTimeout(dismissOpening, reduceMotion.matches ? 80 : 1900);

  function rangePhotos(artifact) {
    return photos.filter((photo) => photo.number >= artifact.start && photo.number <= artifact.end);
  }

  function objectPhotos(artifact) {
    const labelNumbers = new Set(artifact.labels || []);
    const all = rangePhotos(artifact);
    const objects = all.filter((photo) => !labelNumbers.has(photo.number));
    return objects.length ? objects : all;
  }

  function primaryPhoto(artifact) {
    return objectPhotos(artifact)[0] || photoByNumber.get(artifact.start) || photos[0];
  }

  function categories() {
    return ["全部", ...new Set(catalog.map((item) => item.category))];
  }

  function createFilters() {
    filterRow.replaceChildren();
    categories().forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-button";
      button.textContent = category;
      button.dataset.category = category;
      button.setAttribute("aria-pressed", String(category === state.category));
      button.addEventListener("click", () => {
        state.category = category;
        createFilters();
        renderCatalog();
      });
      filterRow.append(button);
    });
  }

  function matches(artifact) {
    const categoryMatch = state.category === "全部" || artifact.category === state.category;
    const haystack = `${artifact.title} ${artifact.era} ${artifact.category} ${artifact.site}`.toLowerCase();
    return categoryMatch && haystack.includes(state.query.trim().toLowerCase());
  }

  function card(artifact) {
    const photo = primaryPhoto(artifact);
    const introduction = artifact.summary || artifact.paragraphs?.[0] || "器物的形制、材质与装饰共同留下时代信息，打开详情可继续辨读。";
    const materialLabel = artifact.material ? "质地" : "类别";
    const materialValue = artifact.material || artifact.category;
    const placeLabel = artifact.category === "馆外遗存" ? "所在地" : "收藏";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "artifact-card";
    button.dataset.artifactId = artifact.id;
    button.setAttribute("aria-label", `打开${artifact.title}详情`);
    button.innerHTML = `
      <img src="${photo?.thumb || ""}" alt="${artifact.title}" loading="lazy" decoding="async" />
      <span class="card-copy">
        <span class="card-topline"><span>${artifact.featured ? "馆藏精选" : "器物档案"}</span>${artifact.featured ? '<span class="featured-dot" aria-label="馆藏精选"></span>' : ""}</span>
        <h3>${artifact.title}</h3>
        <span class="card-facts" aria-label="文物基本信息">
          <span><small>年代</small><b>${artifact.era}</b></span>
          <span><small>${materialLabel}</small><b>${materialValue}</b></span>
          <span><small>${placeLabel}</small><b>${artifact.site}</b></span>
        </span>
        <span class="card-introduction">${introduction}</span>
      </span>`;
    button.addEventListener("click", () => openArtifact(artifact.id));
    return button;
  }

  function renderCatalog() {
    const items = catalog.filter(matches);
    grid.replaceChildren(...items.map(card));
    visibleCount.textContent = String(items.length).padStart(2, "0");
    emptyState.hidden = items.length > 0;
  }

  function resetZoom() {
    state.zoom = 1;
    state.x = 0;
    state.y = 0;
    applyTransform();
  }

  function applyTransform() {
    dialogImage.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.zoom})`;
    zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    viewer.classList.toggle("is-zoomed", state.zoom > 1);
  }

  function setZoom(nextZoom) {
    state.zoom = Math.min(6, Math.max(1, nextZoom));
    if (state.zoom === 1) { state.x = 0; state.y = 0; }
    applyTransform();
  }

  function showPhoto(photo, artifact, button) {
    if (!photo) return;
    dialogImage.src = photo.web;
    dialogImage.alt = `${artifact.title}，第 ${[...filmstrip.children].indexOf(button) + 1} 幅图像`;
    filmstrip.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    resetZoom();
  }

  function openArtifact(id, { syncHistory = true } = {}) {
    const artifact = artifactById.get(id);
    if (!artifact) return;
    const images = objectPhotos(artifact);
    document.querySelector("#dialog-kicker").textContent = `${artifact.site} · ${artifact.category}`;
    const dialogTitle = document.querySelector("#dialog-title");
    dialogTitle.textContent = artifact.title;
    dialogTitle.classList.toggle("is-long", artifact.title.length > 10);
    dialogTitle.classList.toggle("is-very-long", artifact.title.length > 15);
    const metaRows = Array.isArray(artifact.metaRows) && artifact.metaRows.length
      ? artifact.metaRows
      : [
          ["年代", artifact.era],
          [artifact.material ? "质地" : "类别", artifact.material || artifact.category],
          [artifact.category === "馆外遗存" ? "所在地" : "收藏", artifact.site],
        ];
    const metaBody = document.querySelector("#dialog-meta-body");
    metaBody.replaceChildren();
    for (let index = 0; index < metaRows.length; index += 2) {
      const row = document.createElement("tr");
      metaRows.slice(index, index + 2).forEach(([label, value]) => {
        if (!value) return;
        const heading = document.createElement("th");
        heading.scope = "row";
        heading.textContent = label;
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(heading, cell);
      });
      if (row.children.length) metaBody.append(row);
    }
    const paragraphs = Array.isArray(artifact.paragraphs)
      ? artifact.paragraphs
      : [artifact.summary, [artifact.form, artifact.context].filter(Boolean).join("\n")];
    const cleanParagraphs = paragraphs.map((value) => String(value || "").trim()).filter(Boolean);
    const readingText = document.querySelector("#dialog-reading-text");
    readingText.replaceChildren(...cleanParagraphs.map((value) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = value;
      return paragraph;
    }));
    document.querySelector("#object-reading").hidden = cleanParagraphs.length === 0;
    const sources = String(artifact.sources || "").trim();
    document.querySelector("#dialog-sources").textContent = sources;
    document.querySelector("#object-sources").hidden = !sources;
    filmstrip.replaceChildren();
    images.forEach((photo, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", `查看第 ${index + 1} 幅图像`);
      button.setAttribute("aria-pressed", String(index === 0));
      button.innerHTML = `<img src="${photo.thumb}" alt="" loading="lazy" />`;
      button.addEventListener("click", () => showPhoto(photo, artifact, button));
      filmstrip.append(button);
    });
    showPhoto(images[0], artifact, filmstrip.firstElementChild);
    if (!dialog.open) dialog.showModal();
    if (syncHistory && location.hash !== `#artifact=${artifact.id}`) {
      history.pushState({ artifact: artifact.id }, "", `#artifact=${artifact.id}`);
    }
  }

  function closeDialog({ syncHistory = true } = {}) {
    if (dialog.open) dialog.close();
    dialogImage.removeAttribute("src");
    filmstrip.replaceChildren();
    resetZoom();
    if (!syncHistory || !location.hash.startsWith("#artifact=")) return;
    if (history.state?.artifact) history.back();
    else history.replaceState(null, "", "#catalog");
  }

  searchInput.addEventListener("input", () => { state.query = searchInput.value; renderCatalog(); });
  resetFilter.addEventListener("click", () => {
    state.category = "全部";
    state.query = "";
    searchInput.value = "";
    createFilters();
    renderCatalog();
  });
  document.querySelectorAll("[data-filter-link]").forEach((link) => link.addEventListener("click", () => {
    state.category = link.dataset.filterLink;
    createFilters();
    renderCatalog();
  }));
  document.querySelectorAll("[data-open-artifact]").forEach((button) => button.addEventListener("click", () => openArtifact(button.dataset.openArtifact)));
  document.querySelector(".dialog-close").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
  document.querySelectorAll("[data-zoom]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.zoom;
    if (action === "in") setZoom(state.zoom * 1.3);
    if (action === "out") setZoom(state.zoom / 1.3);
    if (action === "reset") resetZoom();
  }));
  viewer.addEventListener("wheel", (event) => {
    if (state.zoom <= 1 && !event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom(state.zoom * (event.deltaY < 0 ? 1.16 : .86));
  }, { passive: false });
  viewer.addEventListener("pointerdown", (event) => {
    if (state.zoom <= 1) return;
    state.dragging = true;
    state.dragX = event.clientX - state.x;
    state.dragY = event.clientY - state.y;
    viewer.classList.add("is-dragging");
    viewer.setPointerCapture(event.pointerId);
  });
  viewer.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    state.x = event.clientX - state.dragX;
    state.y = event.clientY - state.dragY;
    applyTransform();
  });
  viewer.addEventListener("pointerup", () => { state.dragging = false; viewer.classList.remove("is-dragging"); });
  viewer.addEventListener("dblclick", resetZoom);
  viewer.addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") setZoom(state.zoom * 1.3);
    if (event.key === "-") setZoom(state.zoom / 1.3);
    if (event.key === "0") resetZoom();
  });

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("nav");
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }));

  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");
  const heroBackdrop = document.querySelector(".hero-backdrop");
  const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: "0px 0px -6%" });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  if (hero && heroBackdrop && !reduceMotion.matches && window.matchMedia("(pointer:fine)").matches) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * -10;
      const y = ((event.clientY - rect.top) / rect.height - .5) * -7;
      heroBackdrop.style.transform = `scale(1.045) translate3d(${x}px, ${y}px, 0)`;
    });
    hero.addEventListener("pointerleave", () => { heroBackdrop.style.transform = "scale(1.03)"; });
  }

  const treasureTrack = document.querySelector("#treasure-track");
  const treasureSlides = [...document.querySelectorAll(".treasure-slide")];
  const treasureCurrent = document.querySelector("#treasure-current");
  const treasureDots = [...document.querySelectorAll("[data-treasure-dot]")];
  let treasureIndex = 0;
  let treasureFrame = 0;

  function updateTreasureState(index) {
    treasureIndex = Math.max(0, Math.min(treasureSlides.length - 1, index));
    treasureCurrent.textContent = String(treasureIndex + 1).padStart(2, "0");
    treasureDots.forEach((dot, dotIndex) => {
      const active = dotIndex === treasureIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-pressed", String(active));
    });
  }

  function goToTreasure(index) {
    const next = Math.max(0, Math.min(treasureSlides.length - 1, index));
    treasureSlides[next]?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "nearest", inline: "start" });
    updateTreasureState(next);
  }

  document.querySelectorAll("[data-treasure]").forEach((button) => button.addEventListener("click", () => {
    goToTreasure(treasureIndex + (button.dataset.treasure === "next" ? 1 : -1));
  }));
  treasureDots.forEach((dot) => dot.addEventListener("click", () => goToTreasure(Number(dot.dataset.treasureDot))));
  treasureTrack?.addEventListener("scroll", () => {
    cancelAnimationFrame(treasureFrame);
    treasureFrame = requestAnimationFrame(() => {
      if (!treasureTrack.clientWidth) return;
      updateTreasureState(Math.round(treasureTrack.scrollLeft / treasureTrack.clientWidth));
    });
  }, { passive: true });
  treasureTrack?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); goToTreasure(treasureIndex + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); goToTreasure(treasureIndex - 1); }
  });

  groupCount.textContent = String(catalog.length).padStart(2, "0");
  createFilters();
  renderCatalog();

  window.addEventListener("popstate", () => {
    const artifactId = location.hash.match(/^#artifact=(.+)$/)?.[1];
    if (artifactId) openArtifact(artifactId, { syncHistory: false });
    else closeDialog({ syncHistory: false });
  });

  const initialArtifact = location.hash.match(/^#artifact=(.+)$/)?.[1];
  if (initialArtifact) openArtifact(initialArtifact, { syncHistory: false });
})();
