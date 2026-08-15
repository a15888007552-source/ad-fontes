(() => {
  const root = document.querySelector("#photo-archive-grid");
  const section = document.querySelector("#photos");
  if (!root || !section) return;

  const dataUrl = new URL("data/photo-groups.json?v=20260815-groups", document.baseURI);
  let archive = null;
  let activeCategory = "全部";
  let searchTerm = "";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const imagePath = (filename) => `assets/photos/web/${encodeURIComponent(String(filename).replace(/\.JPG$/i, ".jpg"))}`;

  const displayTitle = (group) => String(group.title || "现场照片组")
    .replace(/待核/gu, "")
    .replace(/([，,、]\s*)+[）)]/gu, "）")
    .replace(/[（(]\s*[）)]/gu, "")
    .replace(/\s+/gu, " ")
    .trim() || "现场照片组";
  const displayStatus = () => "现场照片组";
  const displayBoundary = () => "照片按相机顺序与现场展签归组；展签明确的名称进入对象卡片，未拍到名称的照片只保留为现场照片组。";
  const curatedLabels = {
    "photo-group-112": "现场展签可读：龙凤纹琉璃佩、恭应皇后谥册、恭应皇后之宝、奉天皇帝之宝、龙凤纹琉璃璧、双鸾双鸟葵花镜。",
  };
  const displayLabel = (group) => curatedLabels[group.id]
    || "这组照片保留为现场照片组；已明确名称的对象进入文物目录，自动分组文字不作为馆方定名。";

  const statusClass = () => "";

  const visibleGroups = () => {
    const query = searchTerm.trim().toLowerCase();
    return archive.groups.filter((group) => {
      const categoryMatch = activeCategory === "全部" || group.category === activeCategory;
      const haystack = [group.title, group.category, group.label_text, ...(group.tags || [])].join(" ").toLowerCase();
      return categoryMatch && (!query || haystack.includes(query));
    });
  };

  const photoButton = (group, photo, large = false) => `
    <button class="photo-group-image${large ? " photo-group-image--large" : ""}" type="button"
      data-photo-file="${escapeHtml(photo.filename)}"
      data-photo-title="${escapeHtml(displayTitle(group))} · ${escapeHtml(photo.role)}"
      aria-label="查看 ${escapeHtml(displayTitle(group))} 的${escapeHtml(photo.role)}">
      <img src="${imagePath(photo.filename)}" alt="${escapeHtml(displayTitle(group))} · ${escapeHtml(photo.role)}" loading="lazy" decoding="async">
      <span class="photo-group-image-label">${escapeHtml(photo.role)} · ${String(photo.sequence).padStart(3, "0")}</span>
    </button>`;

  const ensureDialogs = () => {
    if (document.querySelector("#photo-group-dialog")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <dialog class="photo-group-dialog" id="photo-group-dialog" aria-labelledby="photo-group-dialog-title">
        <div class="photo-group-dialog-inner">
          <button class="photo-group-dialog-close" type="button" data-close-dialog aria-label="关闭">×</button>
          <div id="photo-group-dialog-content"></div>
        </div>
      </dialog>
      <dialog class="photo-image-dialog" id="photo-image-dialog" aria-label="查看现场照片">
        <button class="photo-image-dialog-close" type="button" data-close-image aria-label="关闭">×</button>
        <img id="photo-image-dialog-img" alt="">
        <p id="photo-image-dialog-caption"></p>
      </dialog>`);
    const groupDialog = document.querySelector("#photo-group-dialog");
    const imageDialog = document.querySelector("#photo-image-dialog");
    document.querySelector("[data-close-dialog]").addEventListener("click", () => groupDialog.close());
    document.querySelector("[data-close-image]").addEventListener("click", () => imageDialog.close());
    [groupDialog, imageDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }));
  };

  const openImage = (button) => {
    ensureDialogs();
    const dialog = document.querySelector("#photo-image-dialog");
    const image = document.querySelector("#photo-image-dialog-img");
    image.src = imagePath(button.dataset.photoFile);
    image.alt = button.dataset.photoTitle || "现场照片";
    document.querySelector("#photo-image-dialog-caption").textContent = button.dataset.photoTitle || "现场照片";
    dialog.showModal();
  };

  const openGroup = (id) => {
    const group = archive.groups.find((item) => item.id === id);
    if (!group) return;
    ensureDialogs();
    const dialog = document.querySelector("#photo-group-dialog");
    const content = document.querySelector("#photo-group-dialog-content");
    const displayPhotos = group.photos.filter((photo) => photo.display);
    content.innerHTML = `
      <p class="photo-group-dialog-kicker">对象组 ${String(group.number).padStart(3, "0")} · ${escapeHtml(group.category)}</p>
      <h2 id="photo-group-dialog-title">${escapeHtml(displayTitle(group))}</h2>
      <div class="photo-group-dialog-meta">
        <span>相机序列 ${String(group.sequence_start).padStart(3, "0")}–${String(group.sequence_end).padStart(3, "0")}</span>
        <span>${displayPhotos.length} 张主图/细节</span>
        <span class="${statusClass(group)}">${displayStatus()}</span>
      </div>
      ${group.tags?.length ? `<div class="photo-group-tags">${group.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="photo-group-dialog-photos">${displayPhotos.map((photo) => photoButton(group, photo, true)).join("")}</div>
      <section class="photo-group-label-text">
        <p class="photo-group-label-heading">名称 / 介绍文字</p>
        <p>${escapeHtml(displayLabel(group))}</p>
      </section>
      <p class="photo-group-boundary">${escapeHtml(displayBoundary(group))}</p>`;
    content.querySelectorAll(".photo-group-image").forEach((button) => button.addEventListener("click", () => openImage(button)));
    dialog.showModal();
  };

  const renderGroups = () => {
    const groups = visibleGroups();
    const count = section.querySelector("#photo-count");
    if (count) count.textContent = `${groups.length} 个对象组 · ${archive.photo_count} 张现场照片`;
    if (!groups.length) {
      root.innerHTML = `<div class="photo-group-empty">没有匹配的对象组。可以换一个名称、年代或类别。</div>`;
      return;
    }
    root.innerHTML = groups.map((group) => {
      const displayPhotos = group.photos.filter((photo) => photo.display);
      const previewPhotos = displayPhotos.slice(0, 4);
      const remaining = Math.max(0, displayPhotos.length - previewPhotos.length);
      return `
        <article class="photo-group-card ${statusClass(group)}" data-group-id="${escapeHtml(group.id)}">
          <div class="photo-group-card-head">
            <p class="photo-group-card-kicker">对象组 ${String(group.number).padStart(3, "0")} · ${escapeHtml(group.category)}</p>
            <span class="photo-group-status ${statusClass(group)}">${displayStatus()}</span>
            <h3>${escapeHtml(displayTitle(group))}</h3>
            <p class="photo-group-sequence">相机序列 ${String(group.sequence_start).padStart(3, "0")}–${String(group.sequence_end).padStart(3, "0")} · ${displayPhotos.length} 张主图/细节</p>
          </div>
          <div class="photo-group-strip">${previewPhotos.map((photo) => photoButton(group, photo)).join("")}${remaining ? `<button class="photo-group-more" type="button" data-open-group="${escapeHtml(group.id)}">+${remaining} 张</button>` : ""}</div>
          <div class="photo-group-card-foot">
            <p>${escapeHtml(displayLabel(group))}</p>
            <button class="photo-group-open" type="button" data-open-group="${escapeHtml(group.id)}">展开对象档案 <span aria-hidden="true">↗</span></button>
          </div>
        </article>`;
    }).join("");
    root.querySelectorAll(".photo-group-image").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      openImage(button);
    }));
    root.querySelectorAll("[data-open-group]").forEach((button) => button.addEventListener("click", () => openGroup(button.dataset.openGroup)));
  };

  const renderControls = () => {
    const toolbar = section.querySelector(".photo-archive-toolbar");
    if (!toolbar || toolbar.querySelector(".photo-group-controls")) return;
    toolbar.insertAdjacentHTML("beforeend", `
      <div class="photo-group-controls" aria-label="照片档案筛选">
        <label class="photo-group-search"><span class="sr-only">搜索对象组</span><input type="search" id="photo-group-search" placeholder="搜索文物、年代或展签文字"></label>
        <div class="photo-group-filters" role="group" aria-label="按类别筛选">
          <button class="photo-group-filter is-active" type="button" data-category="全部">全部</button>
          ${archive.categories.map((category) => `<button class="photo-group-filter" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}
        </div>
      </div>`);
    toolbar.querySelector("#photo-group-search").addEventListener("input", (event) => { searchTerm = event.target.value; renderGroups(); });
    toolbar.querySelectorAll(".photo-group-filter").forEach((button) => button.addEventListener("click", () => {
      activeCategory = button.dataset.category || "全部";
      toolbar.querySelectorAll(".photo-group-filter").forEach((item) => item.classList.toggle("is-active", item === button));
      renderGroups();
    }));
  };

  fetch(dataUrl, { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error(`photo-groups.json ${response.status}`);
    return response.json();
  }).then((data) => {
    archive = data;
    renderControls();
    renderGroups();
  }).catch((error) => {
    root.innerHTML = `<div class="photo-group-empty">照片分组索引暂时无法读取：${escapeHtml(error.message)}。原图没有被删除。</div>`;
    const count = section.querySelector("#photo-count");
    if (count) count.textContent = "照片分组索引加载失败";
    console.error("photo group archive failed", error);
  });
})();
