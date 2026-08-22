import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const poiData = JSON.parse(readFileSync("modules/europa/data/poi.json", "utf8"));
const mediaData = JSON.parse(readFileSync("modules/europa/data/poi-media.json", "utf8"));
const pois = poiData.pois || [];
const cityCoordinates = poiData.cityCoordinates || {};
const checkHttp = process.argv.includes("--check-http");

const rad = Math.PI / 180;
function distanceKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lon) || !Number.isFinite(a.lat) || !Number.isFinite(b.lon) || !Number.isFinite(b.lat)) return null;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = key(item);
    const list = groups.get(value) || [];
    list.push(item);
    groups.set(value, list);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

function normalizeName(name) {
  return String(name || "")
    .replace(/[（(].*?[）)]/gu, "")
    .replace(/[·・,，:：\s\-—]/gu, "")
    .toLowerCase();
}

const exactCoordinateGroups = groupBy(
  pois.filter((poi) => Number.isFinite(poi.lon) && Number.isFinite(poi.lat)),
  (poi) => `${poi.lon.toFixed(6)},${poi.lat.toFixed(6)}`,
).map((group) => ({
  coordinate: [group[0].lon, group[0].lat],
  city: group[0].city,
  items: group.map((poi) => ({ id: poi.id, name: poi.name, status: poi.coordinateStatus })),
}));

const normalizedNameGroups = groupBy(pois, (poi) => `${poi.city}|${normalizeName(poi.name)}`).map((group) => ({
  city: group[0].city,
  names: group.map((poi) => ({ id: poi.id, name: poi.name })),
}));

const closePairs = [];
for (let i = 0; i < pois.length; i += 1) {
  for (let j = i + 1; j < pois.length; j += 1) {
    if (pois[i].city !== pois[j].city) continue;
    const km = distanceKm(pois[i], pois[j]);
    if (km != null && km > 0 && km <= 0.5) closePairs.push({ city: pois[i].city, distanceMeters: Math.round(km * 1000), items: [pois[i].name, pois[j].name] });
  }
}

const cityOutliers = pois.map((poi) => {
  const center = cityCoordinates[poi.city];
  const km = distanceKm(poi, center);
  return km != null && km > 40 ? { id: poi.id, city: poi.city, name: poi.name, distanceKm: Number(km.toFixed(1)) } : null;
}).filter(Boolean);

const missingMedia = pois.filter((poi) => !poi.imageSource || !mediaData.media?.[poi.id]?.url).map((poi) => ({ id: poi.id, city: poi.city, name: poi.name }));
const missingText = pois.filter((poi) => !poi.history?.trim() || !poi.musicRelation?.trim()).map((poi) => ({ id: poi.id, city: poi.city, name: poi.name }));
const fallbackText = pois.filter((poi) => poi.editorialStatus === "editorial-fallback").map((poi) => ({ id: poi.id, city: poi.city, name: poi.name }));
const cityCenterApproximations = pois.filter((poi) => poi.coordinateStatus === "city-center-approximation").map((poi) => ({ id: poi.id, city: poi.city, name: poi.name, coordinate: [poi.lon, poi.lat] }));
const invalidCoordinates = pois.filter((poi) => !Number.isFinite(poi.lon) || !Number.isFinite(poi.lat) || poi.lat < -90 || poi.lat > 90 || poi.lon < -180 || poi.lon > 180).map((poi) => ({ id: poi.id, city: poi.city, name: poi.name, lon: poi.lon, lat: poi.lat }));
const missingSources = pois.filter((poi) => !poi.source?.url).map((poi) => ({ id: poi.id, city: poi.city, name: poi.name }));
const duplicateIds = groupBy(pois, (poi) => poi.id).map((group) => group.map((poi) => ({ id: poi.id, city: poi.city, name: poi.name })));
const missingRequiredFields = pois.filter((poi) => ["id", "city", "name", "category", "lat", "lon", "source", "imageSource"].some((field) => poi[field] == null || poi[field] === "")).map((poi) => ({ id: poi.id, city: poi.city, name: poi.name }));
const orphanAliases = (poiData.aliases || []).filter((alias) => alias.canonicalId && !pois.some((poi) => poi.id === alias.canonicalId));

const mediaHttp = { checked: false, total: 0, ok: 0, bad: [] };
if (checkHttp) {
  const rows = Object.entries(mediaData.media || {});
  mediaHttp.checked = true;
  mediaHttp.total = rows.length;
  const results = [];
  const checkOne = async ([id, media]) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(media.url, { method: "HEAD", signal: controller.signal });
      clearTimeout(timer);
      results.push({ id, status: response.status, ok: response.ok });
    } catch (error) {
      results.push({ id, status: 0, ok: false, error: error.name });
    }
  };
  for (let i = 0; i < rows.length; i += 16) await Promise.all(rows.slice(i, i + 16).map(checkOne));
  mediaHttp.ok = results.filter((result) => result.ok).length;
  mediaHttp.bad = results.filter((result) => !result.ok);
}

const categoryCounts = Object.fromEntries(pois.reduce((map, poi) => map.set(poi.category, (map.get(poi.category) || 0) + 1), new Map()));
const statusCounts = Object.fromEntries(pois.reduce((map, poi) => map.set(poi.coordinateStatus, (map.get(poi.coordinateStatus) || 0) + 1), new Map()));
const editorialCounts = Object.fromEntries(pois.reduce((map, poi) => map.set(poi.editorialStatus, (map.get(poi.editorialStatus) || 0) + 1), new Map()));

const report = {
  generatedAt: new Date().toISOString(),
  input: { version: poiData.version, pois: pois.length, cities: Object.keys(cityCoordinates).length, aliases: (poiData.aliases || []).length, media: Object.keys(mediaData.media || {}).length },
  counts: { category: categoryCounts, coordinateStatus: statusCounts, editorialStatus: editorialCounts },
  checks: {
    invalidCoordinates,
    exactCoordinateGroups,
    closePairsWithin500m: closePairs,
    normalizedNameGroups,
    aliases: poiData.aliases || [],
    cityOutliers,
    missingMedia,
    missingText,
    fallbackText,
    cityCenterApproximations,
    missingSources,
    duplicateIds,
    missingRequiredFields,
    orphanAliases,
    mediaHttp,
  },
  verdict: {
    coordinatesReadyForRendering: invalidCoordinates.length === 0,
    duplicateEntitiesHiddenByStableAliases: (poiData.aliases || []).length > 0,
    allPointsHaveImages: missingMedia.length === 0,
    allPointsHaveEditorialText: missingText.length === 0,
    allDescriptionsPointReviewed: fallbackText.length === 0,
    requiresCoordinateReview: cityCenterApproximations.length > 0 || closePairs.length > 0,
    stableIdsAndSchemas: duplicateIds.length === 0 && missingRequiredFields.length === 0 && orphanAliases.length === 0,
    mediaUrlsReachable: checkHttp ? mediaHttp.bad.length === 0 : null,
  },
};

mkdirSync("work", { recursive: true });
writeFileSync("work/europa-poi-audit.json", `${JSON.stringify(report, null, 2)}\n`);
const md = [
  "# 欧罗巴实景 POI 审计",
  "",
  `- POI：${pois.length} 条；城市：${Object.keys(cityCoordinates).length}；实体别名：${(poiData.aliases || []).length}；媒体：${Object.keys(mediaData.media || {}).length}。`,
  `- 坐标状态：${JSON.stringify(statusCounts)}。`,
  `- 文本状态：${JSON.stringify(editorialCounts)}。`,
  `- 完全相同坐标组：${exactCoordinateGroups.length} 组；500 米内非同点对：${closePairs.length} 对。`,
  `- 城市中心近似点：${cityCenterApproximations.length} 条；缺图片：${missingMedia.length} 条；缺文字：${missingText.length} 条；待逐点复核的模板/编者补述：${fallbackText.length} 条。`,
  `- 稳定 ID / 字段结构：重复 ID ${duplicateIds.length} 组；缺字段 ${missingRequiredFields.length} 条；失效别名 ${orphanAliases.length} 条。`,
  checkHttp ? `- 图片 HEAD：${mediaHttp.ok}/${mediaHttp.total} 可达；失败 ${mediaHttp.bad.length} 条。` : "- 图片 HTTP 可达性：本次未执行网络检查。",
  "",
  "## 完全相同坐标组",
  "",
  ...exactCoordinateGroups.map((group) => `- ${group.city} ${group.coordinate.join(", ")}：${group.items.map((item) => item.name).join("、")}`),
  "",
  "## 需要注意",
  "",
  "这份报告把数量完整、实体去重、建筑级坐标、图片可用性和逐点文字审校分开统计；有坐标并不等于建筑级坐标已经逐点核准。地图会渲染已有点，但卡片会显示其坐标状态。",
].join("\n");
writeFileSync("work/europa-poi-audit.md", `${md}\n`);
console.log(JSON.stringify({
  pois: pois.length,
  aliases: (poiData.aliases || []).length,
  exactCoordinateGroups: exactCoordinateGroups.length,
  closePairsWithin500m: closePairs.length,
  cityCenterApproximations: cityCenterApproximations.length,
  missingMedia: missingMedia.length,
  missingText: missingText.length,
  editorialFallback: fallbackText.length,
  invalidCoordinates: invalidCoordinates.length,
}, null, 2));
