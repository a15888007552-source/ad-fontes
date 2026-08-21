(() => {
  "use strict";

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const findRoot = () => document.querySelector(
    "#artifact-grid, #photoArchive, #photoArchiveGrid, #photoGrid, #photoGroups, [data-photo-archive], [data-photo-groups]"
  ) || [...document.querySelectorAll("[id]")].find((node) => /photo.*(archive|grid|group|catalog)/i.test(node.id));

  const root = findRoot();
  if (!root) return;

  let artifacts = [];
  let visible = [];
  let activeArtifact = null;
  let activePhoto = 0;
  let zoom = 1;
  let currentPage = 1;
  const pageSize = 12;
  let lastFocusedElement = null;
  let restoreFocusAfterDialogClose = true;

  const dialog = document.createElement("dialog");
  dialog.className = "artifact-dialog";
  dialog.setAttribute("aria-label", "文物详情");
  document.body.append(dialog);

  function artifactById(id) {
    return artifacts.find(
      (artifact) => artifact.id === String(id)
    ) || null;
  }

  function getItemFromLocation() {
    const id = new URLSearchParams(window.location.search).get("item");
    return id && artifactById(id) ? id : null;
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
      url.pathname + url.search + url.hash
    );
  }

  const factRow = (label, value) => value
    ? `<div class="artifact-fact"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    : "";

  const cardHtml = (artifact) => {
    const photo = artifact.photos[0];
    const number = String(artifact.index).padStart(3, "0");
    const period = artifact.period || "年代以现场资料为限";
    return `
      <article class="artifact-catalog-card" tabindex="0" role="button" data-artifact-id="${artifact.id}" aria-label="查看${escapeHtml(artifact.title)}详情">
        <figure class="artifact-card-media">
          <img src="${escapeHtml(photo.thumb)}"
               srcset="${escapeHtml(photo.thumb)} 480w, ${escapeHtml(photo.web)} 1600w"
               sizes="(max-width: 720px) 100vw, 34vw"
               width="${photo.width}" height="${photo.height}"
               loading="lazy" decoding="async" alt="${escapeHtml(artifact.title)}现场照片">
          <span class="artifact-photo-count">${artifact.photos.length} 图</span>
        </figure>
        <div class="artifact-card-copy">
          <p class="artifact-card-kicker"><span>${number}</span><span>${escapeHtml(artifact.category)}</span></p>
          <h3>${escapeHtml(artifact.title)}</h3>
          <p class="artifact-card-period">${escapeHtml(period)}</p>
          <p class="artifact-card-summary">${escapeHtml(artifact.summary)}</p>
          <div class="artifact-card-footer"><span>文物图 ${artifact.photos.length}</span><span>进入详情 →</span></div>
        </div>
      </article>`;
  };

  function renderCards() {
    const grid = root.querySelector(".artifact-catalog-grid");
    const count = root.querySelector("[data-artifact-count]");
    if (count) count.textContent = `${visible.length} / ${artifacts.length} 条文物记录`;
    if (!grid) return;
    const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = visible.slice(start, start + pageSize);
    const pager = root.querySelector("[data-artifact-pager]");

    if (pager) {
      pager.innerHTML = `
        <button type="button" data-page-direction="previous" ${currentPage === 1 ? "disabled" : ""}>上一页</button>
        <span>第 ${currentPage} / ${totalPages} 页</span>
        <button type="button" data-page-direction="next" ${currentPage === totalPages ? "disabled" : ""}>下一页</button>`;
      pager.querySelectorAll("[data-page-direction]").forEach((button) => {
        button.addEventListener("click", () => {
          currentPage += button.dataset.pageDirection === "next" ? 1 : -1;
          renderCards();
          root.querySelector(".artifact-catalog-toolbar")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
    grid.innerHTML = visible.length
      ? pageItems.map(cardHtml).join("")
      : '<p class="artifact-empty">没有符合当前条件的文物记录。</p>';
  }

  function applyFilter() {
    currentPage = 1;
    const query = root.querySelector("[data-artifact-search]")?.value.trim().toLowerCase() || "";
    const category = root.querySelector("[data-artifact-category]")?.value || "";
    visible = artifacts.filter((artifact) => {
      const haystack = [artifact.title, artifact.category, artifact.period, artifact.findspot, artifact.material, artifact.summary].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (!category || artifact.category === category);
    });
    renderCards();
  }

  function resetZoom() {
    zoom = 1;
    const image = dialog.querySelector(".artifact-dialog-main-image");
    if (image) image.style.transform = "scale(1)";
    const output = dialog.querySelector("[data-zoom-value]");
    if (output) output.textContent = "100%";
  }

  function setZoom(next) {
    zoom = Math.min(5, Math.max(1, next));
    const image = dialog.querySelector(".artifact-dialog-main-image");
    if (image) image.style.transform = `scale(${zoom})`;
    const output = dialog.querySelector("[data-zoom-value]");
    if (output) output.textContent = `${Math.round(zoom * 100)}%`;
  }

  function selectPhoto(index) {
    if (!activeArtifact) return;
    activePhoto = Math.min(activeArtifact.photos.length - 1, Math.max(0, index));
    const photo = activeArtifact.photos[activePhoto];
    const image = dialog.querySelector(".artifact-dialog-main-image");
    if (image) {
      image.src = photo.web;
      image.alt = `${activeArtifact.title} ${photo.role}`;
    }
    dialog.querySelectorAll("[data-photo-index]").forEach((button) => {
      button.setAttribute("aria-current", Number(button.dataset.photoIndex) === activePhoto ? "true" : "false");
    });
    const caption = dialog.querySelector("[data-photo-caption]");
    if (caption) caption.textContent = `${photo.role} · 图 ${activePhoto + 1} / ${activeArtifact.photos.length}`;
    resetZoom();
  }

  function openArtifact(
    artifact,
    {
      syncUrl = false,
      focusClose = true,
      rememberFocus = true
    } = {}
  ) {
    if (!artifact) return;
    const dialogAlreadyOpen = dialog.open || dialog.hasAttribute("open");
    activeArtifact = artifact;
    activePhoto = 0;
    if (rememberFocus) {
      lastFocusedElement = document.activeElement;
    } else {
      lastFocusedElement = null;
    }
    const facts = [
      factRow("类别", artifact.category),
      factRow("时代", artifact.period),
      factRow("形制 / 尺寸", artifact.dimensions),
      factRow("出土 / 发现", artifact.findspot),
      factRow("材质 / 工艺", artifact.material),
      factRow("主题 / 要点", artifact.theme),
    ].join("");
    dialog.innerHTML = `
      <div class="artifact-dialog-shell">
        <button class="artifact-dialog-close" type="button" data-dialog-close aria-label="关闭详情">关闭 ×</button>
        <section class="artifact-dialog-gallery" aria-label="文物照片">
          <div class="artifact-dialog-stage">
            <img class="artifact-dialog-main-image" src="${escapeHtml(artifact.photos[0].web)}" alt="${escapeHtml(artifact.title)}整体" decoding="async">
          </div>
          <div class="artifact-zoom-controls" aria-label="图像缩放">
            <button type="button" data-zoom-out aria-label="缩小">−</button>
            <output data-zoom-value>100%</output>
            <button type="button" data-zoom-in aria-label="放大">＋</button>
            <button type="button" data-zoom-reset>复位</button>
          </div>
          <div class="artifact-dialog-thumbs">
            ${artifact.photos.map((photo, index) => `
              <button type="button" data-photo-index="${index}" aria-current="${index === 0}">
                <img src="${escapeHtml(photo.thumb)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async" alt="${escapeHtml(photo.role)}缩略图">
                <span>${escapeHtml(photo.role)}</span>
              </button>`).join("")}
          </div>
          <p class="artifact-dialog-caption" data-photo-caption>整体 · 图 1 / ${artifact.photos.length}</p>
        </section>
        <article class="artifact-dialog-copy">
          <p class="artifact-dialog-index">CATALOGUE ${String(artifact.index).padStart(3, "0")}</p>
          <h2>${escapeHtml(artifact.title)}</h2>
          <dl class="artifact-facts">${facts}</dl>
          <section><h3>文物说明</h3><p>${escapeHtml(artifact.description)}</p></section>
          <section><h3>历史与研究价值</h3><p>${escapeHtml(artifact.significance)}</p></section>
          <section><h3>观看提示</h3><p>${escapeHtml(artifact.viewing_notes)}</p></section>
          <aside class="artifact-evidence"><strong>资料边界</strong><p>${escapeHtml(artifact.evidence_note)}</p></aside>
        </article>
      </div>`;
    if (!dialogAlreadyOpen) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    }
    document.body.classList.add("catalog-dialog-open");
    resetZoom();
    if (focusClose) dialog.querySelector("[data-dialog-close]")?.focus();
    if (syncUrl) syncItemToUrl(artifact.id);
  }

  function handleDialogClose() {
    activeArtifact = null;
    document.body.classList.remove("catalog-dialog-open");
    const restore = restoreFocusAfterDialogClose ? lastFocusedElement : null;
    lastFocusedElement = null;
    restoreFocusAfterDialogClose = true;
    if (restore && typeof restore.focus === "function") restore.focus();
  }

  function closeArtifact(
    {
      syncUrl = false,
      restoreFocus = true
    } = {}
  ) {
    const dialogIsOpen = dialog.open || dialog.hasAttribute("open");
    if (!dialogIsOpen) return;
    restoreFocusAfterDialogClose = restoreFocus;
    if (syncUrl) syncItemToUrl(null);
    if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
      handleDialogClose();
    }
  }

  root.addEventListener("input", (event) => {
    if (event.target.matches("[data-artifact-search], [data-artifact-category]")) applyFilter();
  });
  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-artifact-category]")) applyFilter();
  });
  root.addEventListener("click", (event) => {
    const card = event.target.closest("[data-artifact-id]");
    if (card) {
      const artifact = artifactById(card.dataset.artifactId);
      if (artifact) {
        openArtifact(artifact, {
          syncUrl: true,
          focusClose: true,
          rememberFocus: true
        });
      }
    }
  });
  root.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-artifact-id]")) {
      event.preventDefault();
      event.target.click();
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-dialog-close]")) {
      closeArtifact({ syncUrl: true, restoreFocus: true });
      return;
    }
    const photoButton = event.target.closest("[data-photo-index]");
    if (photoButton) selectPhoto(Number(photoButton.dataset.photoIndex));
    if (event.target.closest("[data-zoom-in]")) setZoom(zoom + 0.25);
    if (event.target.closest("[data-zoom-out]")) setZoom(zoom - 0.25);
    if (event.target.closest("[data-zoom-reset]")) resetZoom();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeArtifact({ syncUrl: true, restoreFocus: true });
  });
  dialog.addEventListener("wheel", (event) => {
    if (!event.target.closest(".artifact-dialog-stage")) return;
    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
  }, { passive: false });
  dialog.addEventListener("close", handleDialogClose);

  window.addEventListener("popstate", () => {
    const id = getItemFromLocation();
    if (id) {
      openArtifact(artifactById(id), {
        syncUrl: false,
        focusClose: false,
        rememberFocus: false
      });
    } else {
      closeArtifact({
        syncUrl: false,
        restoreFocus: false
      });
    }
  });

  async function loadArtifactData() {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(`data/artifacts.json?v=20260815-curated3&attempt=${attempt}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => window.setTimeout(resolve, 650 * attempt));
      }
    }
    throw lastError;
  }

  const embeddedPayload = window.__SHAANXI_ARTIFACTS__;

  (embeddedPayload ? Promise.resolve(embeddedPayload) : loadArtifactData())
    .then((payload) => {
      artifacts = payload.artifacts || [];
      visible = [...artifacts];
      const legacyToolbar = root.closest("#other")?.querySelector(".object-toolbar");
      if (legacyToolbar) legacyToolbar.hidden = true;
      const categories = [...new Set(artifacts.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
      root.innerHTML = `
        <div class="artifact-catalog-toolbar">
          <label><span>检索</span><input type="search" data-artifact-search placeholder="输入器名、年代、地点或材质" autocomplete="off"></label>
          <label><span>类别</span><select data-artifact-category><option value="">全部类别</option>${categories.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}</select></label>
          <p data-artifact-count>${artifacts.length} / ${artifacts.length} 条文物记录</p>
        </div>
        <div class="artifact-catalog-grid"></div>
        <nav class="artifact-catalog-pager" data-artifact-pager aria-label="文物目录分页"></nav>`;
      renderCards();
      const requestedItem = getItemFromLocation();
      if (requestedItem) {
        openArtifact(artifactById(requestedItem), {
          syncUrl: false,
          focusClose: true,
          rememberFocus: false
        });
      }
    })
    .catch((error) => {
      root.innerHTML = `<p class="artifact-load-error"><strong>文物目录载入失败。</strong><br>请确认通过本地服务器打开页面，并刷新重试。<small>${escapeHtml(error.message)}</small></p>`;
    });
})();
