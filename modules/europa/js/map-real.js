const MAPLIBRE_VERSION = "4.7.1";
const POI_ZOOM = 7.4;
const MAX_VISIBLE_POIS = 420;

const CATEGORY_LABELS = {
  landmark: "建筑 / 地点",
  music_venue: "音乐场所",
  conservatory: "音乐学院",
  university: "综合大学",
  house: "故居 / 纪念地",
};

const COORDINATE_LABELS = {
  "manual-building-coordinate": "建筑级坐标",
  "indexed-location": "地点索引坐标",
  "city-center-approximation": "城市中心近似点",
  missing: "缺少坐标",
};

const EDITORIAL_LABELS = {
  curated: "编者整理",
  "source-derived": "来源摘要整理",
  "editorial-fallback": "编者补述 · 待逐点补充史料",
};

const state = {
  root: null,
  map: null,
  mapPromise: null,
  dataPromise: null,
  data: null,
  media: null,
  mode: "satellite",
  showPois: true,
  active: false,
  selectedId: "",
  markers: [],
  markerKey: "",
  renderTimer: 0,
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function ensureMapLibreCss() {
  if (document.querySelector("link[data-europa-maplibre-css]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
  link.dataset.europaMaplibreCss = "1";
  document.head.appendChild(link);
}

function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (state.mapPromise) return state.mapPromise;
  ensureMapLibreCss();
  state.mapPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.async = true;
    script.dataset.europaMaplibre = "1";
    script.onload = () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error("MapLibre 未暴露全局对象"));
    script.onerror = () => reject(new Error("MapLibre 外部资源加载失败"));
    document.head.appendChild(script);
  });
  return state.mapPromise;
}

async function loadData() {
  if (state.dataPromise) return state.dataPromise;
  const poiUrl = new URL("../data/poi.json", import.meta.url);
  const mediaUrl = new URL("../data/poi-media.json", import.meta.url);
  state.dataPromise = Promise.all([
    fetch(poiUrl, { cache: "no-store" }),
    fetch(mediaUrl, { cache: "no-store" }),
  ]).then(async ([poiResponse, mediaResponse]) => {
    if (!poiResponse.ok) throw new Error(`POI 数据加载失败（${poiResponse.status}）`);
    if (!mediaResponse.ok) throw new Error(`POI 图片索引加载失败（${mediaResponse.status}）`);
    const [poiData, mediaData] = await Promise.all([poiResponse.json(), mediaResponse.json()]);
    if (!Array.isArray(poiData.pois) || !poiData.cityCoordinates) throw new Error("POI 数据结构不完整");
    state.data = poiData;
    state.media = mediaData;
    updateSummary();
    return { poiData, mediaData };
  });
  return state.dataPromise;
}

function mapStyle() {
  return {
    version: 8,
    sources: {
      "real-imagery": {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      },
      "real-street": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© OpenStreetMap contributors",
      },
      "real-dem": {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 15,
        encoding: "terrarium",
        attribution: "Terrain tiles © AWS Open Data / Mapzen",
      },
    },
    layers: [
      { id: "real-imagery-layer", type: "raster", source: "real-imagery" },
      { id: "real-street-layer", type: "raster", source: "real-street", layout: { visibility: "none" } },
    ],
  };
}

function shell() {
  if (!state.root) return;
  state.root.innerHTML = `
    <div class="realmap-toolbar" role="toolbar" aria-label="实景地图工具">
      <div class="realmap-modes">
        <button type="button" class="realmap-mode is-on" data-realmap-mode="satellite">卫星影像</button>
        <button type="button" class="realmap-mode" data-realmap-mode="terrain">实景地形</button>
        <button type="button" class="realmap-mode" data-realmap-mode="street">街道底图</button>
      </div>
      <div class="realmap-actions">
        <button type="button" class="realmap-tool" data-realmap-home>欧洲视野</button>
        <label class="realmap-toggle"><input type="checkbox" data-realmap-pois checked> <span>地点标记</span></label>
      </div>
      <div class="realmap-summary" data-realmap-summary>正在读取地点索引……</div>
    </div>
    <div class="realmap-layout">
      <div class="realmap-stage">
        <div class="realmap-canvas" data-realmap-canvas role="application" aria-label="欧洲卫星、地形与地点地图"></div>
        <div class="realmap-loading" data-realmap-loading><strong>正在接通实景地图</strong><span>首次进入会加载地图引擎、卫星瓦片和地点索引。</span></div>
        <div class="realmap-status" data-realmap-status>实景地图准备中</div>
      </div>
      <aside class="realmap-panel" data-realmap-panel aria-live="polite">
        <div class="realmap-panel-empty"><span class="realmap-panel-kicker">REALIS · 实景层</span><h4>点选一个地标</h4><p>整片欧洲视野只显示城市；放大到城市附近后，建筑、音乐场所、音乐学院、大学和故居才会出现。点击标记后，这里显示地点史、音乐关联、图片和来源。</p></div>
      </aside>
    </div>
    <div class="realmap-legend" aria-label="地点标记图例">
      <span><i class="legend-dot landmark"></i>建筑 / 地点</span>
      <span><i class="legend-dot music_venue"></i>音乐场所</span>
      <span><i class="legend-dot conservatory"></i>音乐学院</span>
      <span><i class="legend-dot university"></i>综合大学</span>
      <span><i class="legend-dot house"></i>故居 / 纪念地</span>
    </div>
    <p class="realmap-note">※ 地标在缩放等级 z7.4 以上显示；同一实体的简称、括号写法和旧索引别名只保留一个标记。坐标状态和文字整理状态在右侧卡片中明确标注。</p>`;
  bindShell();
}

function bindShell() {
  state.root.querySelectorAll("[data-realmap-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.realmapMode));
  });
  state.root.querySelector("[data-realmap-home]")?.addEventListener("click", () => {
    state.map?.fitBounds([[-12, 35], [37, 66]], { padding: 38, duration: 900 });
  });
  state.root.querySelector("[data-realmap-pois]")?.addEventListener("change", (event) => {
    state.showPois = event.target.checked;
    scheduleMarkers(true);
  });
}

function updateSummary() {
  const target = state.root?.querySelector("[data-realmap-summary]");
  if (!target || !state.data) return;
  const counts = Object.fromEntries(Object.keys(CATEGORY_LABELS).map((category) => [category, 0]));
  state.data.pois.forEach((poi) => { counts[poi.category] = (counts[poi.category] || 0) + 1; });
  target.textContent = `${state.data.pois.length} 个地点 · ${Object.keys(state.data.cityCoordinates).length} 座城市 · 建筑 ${counts.landmark} · 音乐 ${counts.music_venue} · 学院 ${counts.conservatory} · 大学 ${counts.university} · 故居 ${counts.house}`;
}

function updateStatus() {
  const target = state.root?.querySelector("[data-realmap-status]");
  if (!target || !state.map) return;
  const center = state.map.getCenter();
  const zoom = state.map.getZoom();
  const mode = state.mode === "terrain" ? "实景地形 · 3D" : state.mode === "street" ? "街道底图" : "卫星影像";
  const poiState = zoom >= POI_ZOOM ? "地标已显示" : `放大到 z${POI_ZOOM.toFixed(1)} 显示地标`;
  target.textContent = `${mode} · ${center.lat.toFixed(1)}°N ${center.lng.toFixed(1)}°E · z${zoom.toFixed(1)} · ${poiState}`;
}

function setMode(mode) {
  if (!["satellite", "terrain", "street"].includes(mode)) return;
  state.mode = mode;
  state.root?.querySelectorAll("[data-realmap-mode]").forEach((button) => button.classList.toggle("is-on", button.dataset.realmapMode === mode));
  updateStatus();
  if (!state.map || !state.map.isStyleLoaded()) return;
  const imageryVisible = mode !== "street";
  if (state.map.getLayer("real-imagery-layer")) state.map.setLayoutProperty("real-imagery-layer", "visibility", imageryVisible ? "visible" : "none");
  if (state.map.getLayer("real-street-layer")) state.map.setLayoutProperty("real-street-layer", "visibility", mode === "street" ? "visible" : "none");
  if (mode === "terrain") {
    state.map.setTerrain({ source: "real-dem", exaggeration: 1.2 });
    state.map.easeTo({ pitch: 48, bearing: -12, duration: 600 });
  } else {
    state.map.setTerrain(null);
    state.map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
  }
  updateStatus();
}

function createCityMarker(city, pair, zoom) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "realmap-city-marker";
  element.title = `${city} · 放大查看地标`;
  element.setAttribute("aria-label", `${city} · 放大查看地标`);
  element.innerHTML = `<span class="realmap-city-dot"></span><span class="realmap-city-label">${escapeHtml(city)}</span>`;
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    state.map?.easeTo({ center: [pair.lon, pair.lat], zoom: Math.max(9.2, zoom + 2.3), duration: 750 });
  });
  return new window.maplibregl.Marker({ element, anchor: "center", pitchAlignment: "map" }).setLngLat([pair.lon, pair.lat]).addTo(state.map);
}

function createPoiMarker(poi, zoom) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `realmap-poi-marker ${poi.category}${poi.id === state.selectedId ? " is-selected" : ""}${zoom < 8.3 && poi.id !== state.selectedId ? " no-label" : ""}`;
  element.title = `${poi.city} · ${poi.name}`;
  element.setAttribute("aria-label", `${poi.city} · ${poi.name} · ${CATEGORY_LABELS[poi.category]}`);
  element.innerHTML = `<span class="realmap-poi-glyph"></span><span class="realmap-poi-label">${escapeHtml(poi.name)}</span>`;
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    selectPoi(poi, true);
  });
  return new window.maplibregl.Marker({ element, anchor: "center", pitchAlignment: "map" }).setLngLat([poi.lon, poi.lat]).addTo(state.map);
}

function visiblePoiList() {
  if (!state.map || !state.data || !state.showPois || state.map.getZoom() < POI_ZOOM) return [];
  const bounds = state.map.getBounds();
  const visible = state.data.pois.filter((poi) => Number.isFinite(poi.lon) && Number.isFinite(poi.lat) && bounds.contains([poi.lon, poi.lat]));
  visible.sort((a, b) => (a.id === state.selectedId ? -1 : b.id === state.selectedId ? 1 : 0));
  return visible.slice(0, MAX_VISIBLE_POIS);
}

function scheduleMarkers(force = false) {
  if (!state.map || !state.data) return;
  if (state.renderTimer) window.clearTimeout(state.renderTimer);
  state.renderTimer = window.setTimeout(() => {
    state.renderTimer = 0;
    renderMarkers(force);
  }, force ? 0 : 120);
}

function renderMarkers(force = false) {
  if (!state.map || !state.data) return;
  const zoom = state.map.getZoom();
  const poiList = visiblePoiList();
  const key = `${state.showPois ? 1 : 0}|${zoom < POI_ZOOM ? "cities" : poiList.map((poi) => `${poi.id}:${poi.id === state.selectedId ? 1 : 0}`).join(",")}`;
  if (!force && key === state.markerKey) return;
  state.markerKey = key;
  state.markers.forEach((marker) => marker.remove());
  state.markers = [];
  if (zoom < POI_ZOOM) {
    Object.entries(state.data.cityCoordinates).forEach(([city, pair]) => {
      if (Number.isFinite(pair.lon) && Number.isFinite(pair.lat)) state.markers.push(createCityMarker(city, pair, zoom));
    });
  } else {
    poiList.forEach((poi) => state.markers.push(createPoiMarker(poi, zoom)));
  }
  updateStatus();
}

function mediaFor(poi) {
  return state.media?.media?.[poi.id] || null;
}

function selectPoi(poi, focus) {
  state.selectedId = poi.id;
  renderPanel(poi);
  if (focus && state.map) {
    state.map.easeTo({ center: [poi.lon, poi.lat], zoom: Math.max(state.map.getZoom(), 12.3), duration: 850, essential: true });
  }
  scheduleMarkers(true);
}

function renderPanel(poi) {
  const panel = state.root?.querySelector("[data-realmap-panel]");
  if (!panel) return;
  const media = mediaFor(poi);
  const image = media?.url
    ? `<figure class="realmap-figure"><img src="${escapeHtml(media.url)}" alt="${escapeHtml(poi.name)}" loading="lazy" decoding="async"><figcaption>${media.aiCreated ? "AI创作（用户提供图像）" : "实景图"}${media.credit ? ` · ${escapeHtml(media.credit)}` : ""}</figcaption></figure>`
    : `<div class="realmap-no-image">该地点暂无本地图片索引</div>`;
  const source = poi.source?.url ? `<a href="${escapeHtml(poi.source.url)}" target="_blank" rel="noopener">打开公开来源 ↗</a>` : "";
  panel.innerHTML = `
    <article class="realmap-poi-card">
      <div class="realmap-card-meta"><span class="realmap-card-icon ${escapeHtml(poi.category)}"></span>${escapeHtml(poi.city)} · ${escapeHtml(CATEGORY_LABELS[poi.category] || poi.kindLabel || "地点")}</div>
      <h4>${escapeHtml(poi.name)}</h4>
      <p class="realmap-card-coords">${Number(poi.lat).toFixed(5)}°N · ${Number(poi.lon).toFixed(5)}°E</p>
      ${image}
      <h5>建筑 / 地点史</h5>
      <p>${escapeHtml(poi.history)}</p>
      <h5>与音乐 / 音乐家的关联</h5>
      <p>${escapeHtml(poi.musicRelation)}</p>
      <div class="realmap-card-status"><span>坐标：${escapeHtml(COORDINATE_LABELS[poi.coordinateStatus] || poi.coordinateStatus || "未标注")}</span><span>文字：${escapeHtml(EDITORIAL_LABELS[poi.editorialStatus] || poi.editorialStatus || "未标注")}</span></div>
      <div class="realmap-card-source">${source}</div>
    </article>`;
  panel.querySelector("img")?.addEventListener("error", (event) => {
    const figure = event.currentTarget.closest("figure");
    if (figure) figure.outerHTML = `<div class="realmap-no-image">图片暂时无法读取；地点和文字资料仍保留。</div>`;
  }, { once: true });
}

function renderError(message) {
  const loading = state.root?.querySelector("[data-realmap-loading]");
  if (loading) {
    loading.hidden = false;
    loading.innerHTML = `<strong>实景地图暂时没有启动</strong><span>${escapeHtml(message)}。可以刷新页面后重试。</span>`;
  }
}

async function createMap() {
  const canvas = state.root?.querySelector("[data-realmap-canvas]");
  if (!canvas || state.map) return;
  const [maplibre] = await Promise.all([loadMapLibre(), loadData()]);
  if (!state.active || !state.root?.isConnected) return;
  const map = new maplibre.Map({
    container: canvas,
    style: mapStyle(),
    center: [10.1, 46.2],
    zoom: 4.45,
    minZoom: 2,
    maxZoom: 18,
    pitch: 0,
    bearing: 0,
    fadeDuration: 0,
    attributionControl: { compact: true },
    dragRotate: true,
    keyboard: true,
  });
  state.map = map;
  map.addControl(new maplibre.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
  map.on("load", () => {
    const loading = state.root?.querySelector("[data-realmap-loading]");
    if (loading) loading.hidden = true;
    setMode(state.mode);
    renderMarkers(true);
    updateStatus();
  });
  map.on("moveend", () => {
    scheduleMarkers();
    updateStatus();
  });
  map.on("zoomend", updateStatus);
  map.on("error", (event) => {
    if (event?.error?.message && /webgl|context/i.test(event.error.message)) renderError(event.error.message);
  });
}

export function initRealMapView() {
  const root = document.querySelector("#realmap-view");
  if (!root) return;
  state.root = root;
  state.active = true;
  if (!root.dataset.shellReady) {
    shell();
    root.dataset.shellReady = "1";
  }
  if (state.map) {
    window.requestAnimationFrame(() => { state.map.resize(); renderMarkers(true); updateStatus(); });
    return;
  }
  Promise.all([loadData(), createMap()]).catch((error) => renderError(error.message || "外部地图资源加载失败"));
}

export function stopRealMapView() {
  state.active = false;
}

export function getRealMapDiagnostics() {
  return {
    poiCount: state.data?.pois?.length || 0,
    cityCount: state.data ? Object.keys(state.data.cityCoordinates).length : 0,
    mapReady: !!state.map,
    mode: state.mode,
    poiZoom: POI_ZOOM,
  };
}
