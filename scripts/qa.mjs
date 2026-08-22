import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(process.cwd());
const PUBLIC_ORIGIN = "https://a15888007552-source.github.io";
const PUBLIC_ROOT = "/ad-fontes/";
const PUBLIC_BASE = `${PUBLIC_ORIGIN}${PUBLIC_ROOT}`;
const MEDIA_ORIGIN = "https://pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev";
const RETIRED_WORKER_ORIGIN = "https://ad-fontes-media.gusgumee777.workers.dev";
const EXTERNALIZED_MODULES = new Set(["qinhan", "shaanxi-history", "shaanxi-archaeology-museum"]);
const MEDIA_SUFFIXES = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".heic", ".tif", ".tiff",
  ".mp3", ".wav", ".flac", ".m4a", ".ogg", ".mp4", ".webm", ".mov", ".pdf",
]);
const PAGES = [
  { id: "museum-atlas", path: "modules/museum-atlas/index.html" },
  { id: "beilin", path: "modules/beilin/index.html" },
  { id: "qinhan", path: "modules/qinhan/index.html" },
  { id: "shaanxi-archaeology", path: "modules/shaanxi-archaeology-museum/index.html" },
  { id: "baoji", path: "modules/baoji/index.html" },
  { id: "shaanxi-history", path: "modules/shaanxi-history/index.html" },
  { id: "xian-museum", path: "modules/xian-museum/index.html" },
  { id: "guobo", path: "guobo-museum/index.html" },
];
const ITEM_SOURCES = {
  beilin: "app.js",
  qinhan: "modules/qinhan/app.js",
  "shaanxi-archaeology": "modules/shaanxi-archaeology-museum/photo-catalog.js",
  baoji: "modules/baoji/app.js",
  "shaanxi-history": "modules/shaanxi-history/app.js",
  "xian-museum": "modules/xian-museum/app.js",
  guobo: "guobo-museum/app.js",
};
const failures = [];
const passed = [];
let registryContext = null;
let searchIndexContext = null;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function repoPath(relativePath) {
  const normalized = path.posix.normalize(String(relativePath).replaceAll("\\", "/"));
  assert(normalized !== ".." && !normalized.startsWith("../") && !normalized.startsWith("/"), `unsafe repository path: ${relativePath}`);
  return path.join(ROOT, ...normalized.split("/"));
}

function exists(relativePath) {
  return fs.existsSync(repoPath(relativePath));
}

function readRepo(relativePath) {
  const target = repoPath(relativePath);
  assert(fs.existsSync(target), `missing repository file: ${relativePath}`);
  return fs.readFileSync(target, "utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(readRepo(relativePath));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  assert(isPlainObject(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys are ${actual.join(", ")}, expected ${wanted.join(", ")}`);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function parseAttributes(rawTag) {
  const body = rawTag.slice(1, -1);
  const name = /^\s*[^\s/>]+/.exec(body);
  const attributes = new Map();
  if (!name) return attributes;
  const rest = body.slice(name[0].length);
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(rest))) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function scanStartTags(html) {
  const tags = [];
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf("<", cursor);
    if (start < 0) break;
    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      cursor = end < 0 ? html.length : end + 3;
      continue;
    }
    const nameMatch = /^<([A-Za-z][\w:-]*)/.exec(html.slice(start));
    if (!nameMatch) {
      cursor = start + 1;
      continue;
    }
    let end = start + nameMatch[0].length;
    let quote = null;
    while (end < html.length) {
      const character = html[end];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === "'" || character === '"') {
        quote = character;
      } else if (character === ">") {
        break;
      }
      end += 1;
    }
    if (end >= html.length) break;
    const raw = html.slice(start, end + 1);
    tags.push({ name: nameMatch[1].toLowerCase(), raw, attrs: parseAttributes(raw) });
    cursor = end + 1;
  }
  return tags;
}

function pageHead(html, pagePath) {
  const open = /<head\b[^>]*>/i.exec(html);
  const close = /<\/head\s*>/i.exec(html);
  assert(open && close && close.index > open.index, `${pagePath} has no complete head`);
  return html.slice(open.index + open[0].length, close.index);
}

function resolveRepoReference(reference, pagePath) {
  const raw = String(reference || "").trim();
  if (!raw || raw.startsWith("#")) return null;
  if (/^(?:data|blob|mailto|tel|javascript):/i.test(raw)) return null;
  const url = new URL(raw, `${PUBLIC_BASE}${pagePath}`);
  if (url.origin !== PUBLIC_ORIGIN || !url.pathname.startsWith(PUBLIC_ROOT)) return null;
  const relative = path.posix.normalize(decodeURIComponent(url.pathname.slice(PUBLIC_ROOT.length)));
  if (relative === ".." || relative.startsWith("../") || relative.startsWith("/")) return null;
  return relative;
}

function isMediaPath(value) {
  return MEDIA_SUFFIXES.has(path.posix.extname(String(value).split(/[?#]/, 1)[0]).toLowerCase());
}

function moduleIdFor(relativePath) {
  return /^modules\/([^/]+)\//.exec(String(relativePath))?.[1] || null;
}

function isExternalizedMediaPath(relativePath) {
  return isMediaPath(relativePath) && EXTERNALIZED_MODULES.has(moduleIdFor(relativePath));
}

function isSafeLocalPath(value, allowEmpty = false) {
  if (allowEmpty && value === "") return true;
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.startsWith("\\")
    && !value.includes("\\")
    && !value.split("/").includes("..")
    && !/^[A-Za-z][A-Za-z\d+.-]*:/.test(value)
    && !value.includes("?")
    && !value.includes("#");
}

function assertTrustedImageUrl(value, page, label) {
  const url = new URL(value, PUBLIC_BASE);
  assert(url.protocol === "https:", `${page.path} ${label} must use HTTPS`);
  assert(url.origin !== RETIRED_WORKER_ORIGIN, `${page.path} ${label} still uses the retired workers.dev host`);
  if (url.origin === MEDIA_ORIGIN) {
    assert(EXTERNALIZED_MODULES.has(moduleIdFor(url.pathname.slice("/".length))), `${page.path} ${label} uses the media host for an unknown module`);
    assert(url.pathname.startsWith("/modules/"), `${page.path} ${label} media path is not repo-relative`);
    return;
  }
  assert(url.origin === PUBLIC_ORIGIN && url.pathname.startsWith(PUBLIC_ROOT), `${page.path} ${label} must use the public site or trusted Worker`);
  const local = path.posix.normalize(decodeURIComponent(url.pathname.slice(PUBLIC_ROOT.length)));
  assert(!local.startsWith("../") && !local.startsWith("/"), `${page.path} ${label} escapes repository root`);
  assert(exists(local) || isExternalizedMediaPath(local), `${page.path} ${label} maps to missing file ${local}`);
}

function metaValues(head, attribute, value) {
  return scanStartTags(head)
    .filter((tag) => tag.name === "meta" && tag.attrs.get(attribute) === value)
    .map((tag) => tag.attrs.get("content") || "");
}

function one(values, label) {
  assert(values.length === 1, `${label} expected once, found ${values.length}`);
  return values[0];
}

function canonicalFor(pagePath) {
  return `${PUBLIC_BASE}${pagePath}`;
}

function registryQa() {
  const registry = readJson("museum-registry.json");
  exactKeys(registry, ["schema_version", "provinces", "museums"], "museum-registry root");
  assert(registry.schema_version === 1, "museum-registry schema_version must be 1");
  assert(Array.isArray(registry.provinces) && registry.provinces.length === 3, "registry must contain three provinces");
  assert(Array.isArray(registry.museums) && registry.museums.length === 10, "registry must contain ten museums");
  const provinceIds = new Set();
  for (const province of registry.provinces) {
    exactKeys(province, ["id", "name", "code", "order"], "province");
    assert(nonEmpty(province.id) && !provinceIds.has(province.id), `invalid province id: ${province.id}`);
    assert(nonEmpty(province.name) && nonEmpty(province.code) && finiteNumber(province.order), `invalid province: ${province.id}`);
    provinceIds.add(province.id);
  }
  const museumIds = new Set();
  const live = [];
  for (const museum of registry.museums) {
    exactKeys(museum, ["id", "province", "order", "name", "city", "theme", "status", "archive_type", "site_path", "card_image"], `museum ${museum.id || "?"}`);
    assert(nonEmpty(museum.id) && !museumIds.has(museum.id), `invalid museum id: ${museum.id}`);
    assert(provinceIds.has(museum.province), `unknown province for ${museum.id}`);
    assert(nonEmpty(museum.name) && nonEmpty(museum.city) && nonEmpty(museum.theme), `missing museum labels for ${museum.id}`);
    assert(museum.status === "live" || museum.status === "preparation", `invalid status for ${museum.id}`);
    exactKeys(museum.card_image, ["path", "alt", "loading", "fetchpriority", "width", "height"], `card_image ${museum.id}`);
    assert(nonEmpty(museum.card_image.path) && nonEmpty(museum.card_image.alt), `missing card image metadata for ${museum.id}`);
    assert(museum.card_image.loading === "eager" || museum.card_image.loading === "lazy", `invalid card loading for ${museum.id}`);
    if (exists(museum.card_image.path)) {
      assert(isMediaPath(museum.card_image.path), `card image is not a media path for ${museum.id}`);
    } else {
      assert(isExternalizedMediaPath(museum.card_image.path), `missing non-external card image for ${museum.id}: ${museum.card_image.path}`);
    }
    if (museum.status === "live") {
      assert(nonEmpty(museum.archive_type) && nonEmpty(museum.site_path) && exists(museum.site_path), `live museum path missing for ${museum.id}`);
      live.push(museum);
    } else {
      assert(museum.archive_type === null && museum.site_path === null, `preparation museum contract failed for ${museum.id}`);
    }
    museumIds.add(museum.id);
  }
  assert(live.length === 7, `expected seven live museum entries, found ${live.length}`);
  registryContext = { registry, provinceIds, live };
}

function metadataQa() {
  const required = [
    ["name", "description"],
    ["property", "og:type"], ["property", "og:site_name"],
    ["property", "og:title"], ["property", "og:description"], ["property", "og:url"],
    ["property", "og:image"],
    ["name", "twitter:card"], ["name", "twitter:title"], ["name", "twitter:description"],
    ["name", "twitter:image"],
  ];
  for (const page of PAGES) {
    const html = readRepo(page.path);
    const head = pageHead(html, page.path);
    const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
    assert(titles.length === 1 && titles[0][1].trim(), `${page.path} must have one non-empty title`);
    const title = titles[0][1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const canonical = one(scanStartTags(head).filter((tag) => tag.name === "link" && (tag.attrs.get("rel") || "").toLowerCase().split(/\s+/).includes("canonical")).map((tag) => tag.attrs.get("href") || ""), `${page.path} canonical`);
    assert(canonical === canonicalFor(page.path), `${page.path} canonical mismatch`);
    const values = new Map(required.map(([attribute, key]) => [`${attribute}:${key}`, one(metaValues(head, attribute, key), `${page.path} ${attribute}=${key}`)]));
    assert(values.get("property:og:type") === "website", `${page.path} og:type mismatch`);
    assert(values.get("property:og:site_name") === "Ad Fontes · Museum Atlas", `${page.path} og:site_name mismatch`);
    assert(values.get("property:og:title") === title && values.get("name:twitter:title") === title, `${page.path} title metadata mismatch`);
    assert(values.get("property:og:description") === values.get("name:description") && values.get("name:twitter:description") === values.get("name:description"), `${page.path} description metadata mismatch`);
    assert(values.get("property:og:url") === canonical && values.get("name:twitter:card") === "summary_large_image", `${page.path} social metadata mismatch`);
    assert(values.get("property:og:image") === values.get("name:twitter:image"), `${page.path} social images differ`);
    assertTrustedImageUrl(values.get("property:og:image"), page, "og:image");
  }
}

function atlasQa() {
  assert(registryContext, "registry QA did not run");
  const html = readRepo("modules/museum-atlas/index.html");
  assert(/museum-registry\.json/.test(html), "Atlas registry loader is missing");
  assert(/window\.resolveAtlasMediaUrl/.test(html) && /pub-2f296678a1134f0fa45cf651ddd6f956\.r2\.dev/.test(html), "Atlas media resolver/R2 production base is missing");
  for (const moduleId of EXTERNALIZED_MODULES) assert(new RegExp(`['"]${moduleId}['"]`).test(html), `Atlas externalized module missing: ${moduleId}`);
  const bodyStart = html.indexOf("<body");
  const searchScript = html.indexOf('<script id="atlas-search-script"');
  const staticMarkup = html.slice(bodyStart >= 0 ? bodyStart : 0, searchScript >= 0 ? searchScript : html.length);
  const cards = staticMarkup.match(/class=["']museum-card(?:\s|["'])/g) || [];
  assert(cards.length === 10, `Atlas fallback card count ${cards.length} != 10`);
  const provinceHooks = [...html.matchAll(/data-registry-museums=["']([^"']+)["']/g)].map((match) => match[1]);
  assert(JSON.stringify([...new Set(provinceHooks)].sort()) === JSON.stringify([...registryContext.provinceIds].sort()), "Atlas province hooks differ from registry");
  const selected = [...html.matchAll(/class=["'][^"']*\bselected-object\b[^"']*["']/g)];
  assert(selected.length === 7, `BUILD 01 selected object count ${selected.length} != 7`);
  assert((html.match(/class=["'][^"']*\batlas-search__input\b/g) || []).length === 1, "BUILD 02 search input missing");
  assert(/search-index\.json/.test(html) && /atlas-search-result/.test(html), "BUILD 02 search renderer is missing");
  assert(/URLSearchParams[\s\S]{0,220}province|province[\s\S]{0,220}URLSearchParams/.test(html), "Atlas province URL state is missing");
  assert(/history\.pushState\s*\(/.test(html) && /addEventListener\s*\(\s*["']popstate["']/.test(html), "Atlas History API state handling is missing");
  for (const token of ["maplibre", "model-viewer", "three.module", ".glb", ".gltf"]) assert(!html.toLowerCase().includes(token), `Atlas contains forbidden legacy token: ${token}`);
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const value = match[1];
    if (!/^(?:https?:|data:|#|mailto:|javascript:)/i.test(value)) assert(resolveRepoReference(value, "modules/museum-atlas/index.html"), `unsafe Atlas href: ${value}`);
  }
}

function searchIndexQa() {
  const index = readJson("modules/museum-atlas/search-index.json");
  exactKeys(index, ["schema_version", "records"], "search-index root");
  assert(index.schema_version === 1 && Array.isArray(index.records) && index.records.length === 922, `search-index expected 922 records, found ${index.records?.length}`);
  const expectedKeys = ["museum_id", "museum_name", "id", "title", "period", "type", "material", "origin", "keywords", "site_path", "image_path"];
  const allowedEmpty = new Set(["beilin:artifact-057", "baoji:photo-group-3619", "baoji:photo-group-3881"]);
  const seen = new Set();
  const museums = new Set();
  const byMuseum = new Map();
  for (const record of index.records) {
    assert(isPlainObject(record) && JSON.stringify(Object.keys(record)) === JSON.stringify(expectedKeys), "search record schema/order mismatch");
    for (const field of ["museum_id", "museum_name", "id", "title", "site_path"]) assert(nonEmpty(record[field]), `search record missing ${field}`);
    for (const field of ["period", "type", "material", "origin", "image_path"]) assert(typeof record[field] === "string", `search record invalid ${field}`);
    assert(Array.isArray(record.keywords) && record.keywords.every((keyword) => typeof keyword === "string"), `search keywords invalid for ${record.id}`);
    assert(isSafeLocalPath(record.site_path) && isSafeLocalPath(record.image_path, true), `unsafe search path for ${record.id}`);
    const composite = `${record.museum_id}:${record.id}`;
    assert(!seen.has(composite), `duplicate search record ${composite}`);
    seen.add(composite);
    museums.add(record.museum_id);
    if (!byMuseum.has(record.museum_id)) byMuseum.set(record.museum_id, record);
    if (!record.image_path) assert(allowedEmpty.has(composite), `unexpected empty image path ${composite}`);
    if (record.image_path) {
      const moduleId = record.site_path.match(/^modules\/([^/]+)\//)?.[1] || null;
      const candidates = [record.image_path, moduleId ? `modules/${moduleId}/${record.image_path}` : "", record.image_path.startsWith("modules/") ? record.image_path : ""];
      assert(candidates.some((candidate) => candidate && exists(candidate)) || (moduleId && EXTERNALIZED_MODULES.has(moduleId)), `search image cannot be resolved for ${composite}`);
    }
  }
  assert(museums.size === 7, `search-index museum count ${museums.size} != 7`);
  for (const museum of registryContext.live) assert(byMuseum.has(museum.id), `search-index missing live museum ${museum.id}`);
  assert([...allowedEmpty].every((id) => seen.has(id)), "audited no-image records are missing");
  searchIndexContext = { index, byMuseum };
}

function deepLinkQa() {
  assert(registryContext && searchIndexContext, "registry/search QA did not run");
  for (const museum of registryContext.live) {
    const sourcePath = ITEM_SOURCES[museum.id];
    assert(sourcePath, `no item source registered for ${museum.id}`);
    const source = readRepo(sourcePath);
    assert(/URLSearchParams[\s\S]{0,180}(?:\.get|\.has)\(\s*["']item["']\s*\)/.test(source), `${museum.id} lacks stable item query handling`);
    assert(/history\.pushState\s*\(|history\s*\[[^\]]+\]\s*\(/.test(source), `${museum.id} lacks stable item History API handling`);
    const record = searchIndexContext.byMuseum.get(museum.id);
    assert(record.site_path === museum.site_path && isSafeLocalPath(record.id), `${museum.id} search/deep-link contract mismatch`);
    const target = new URL(record.site_path, PUBLIC_BASE);
    target.searchParams.set("item", record.id);
    assert(target.searchParams.get("item") === record.id && target.pathname.startsWith(PUBLIC_ROOT), `${museum.id} deep-link URL is unstable`);
  }
}

function atlasReturnLinksQa() {
  assert(registryContext, "registry QA did not run");
  for (const museum of registryContext.live) {
    const html = readRepo(museum.site_path);
    const matches = scanStartTags(html).filter((tag) => tag.name === "a" && resolveRepoReference(tag.attrs.get("href"), museum.site_path) === "modules/museum-atlas/index.html");
    assert(matches.length === 1, `${museum.id} must have exactly one return-to-atlas link`);
    const url = new URL(matches[0].attrs.get("href"), `${PUBLIC_BASE}${museum.site_path}`);
    assert(url.searchParams.get("province") === museum.province, `${museum.id} return province mismatch`);
    assert(!/localhost|127\.0\.0\.1|old branch/i.test(matches[0].attrs.get("href") || ""), `${museum.id} return link points to a local/old target`);
  }
}

function localResourcesQa() {
  for (const page of PAGES) {
    const html = readRepo(page.path);
    for (const tag of scanStartTags(html)) {
      let attribute = null;
      if (tag.name === "script") attribute = "src";
      if (tag.name === "img" || tag.name === "iframe") attribute = "src";
      if (tag.name === "link") {
        const rel = (tag.attrs.get("rel") || "").toLowerCase().split(/\s+/);
        if (rel.includes("stylesheet") || rel.includes("icon") || rel.includes("preload")) attribute = "href";
      }
      if (!attribute || !tag.attrs.has(attribute)) continue;
      const reference = tag.attrs.get(attribute);
      const local = resolveRepoReference(reference, page.path);
      if (local && !exists(local)) assert(isExternalizedMediaPath(local), `${page.path} missing local resource: ${reference} -> ${local}`);
    }
  }
}

function externalizedRuntimeQa() {
  for (const moduleId of EXTERNALIZED_MODULES) {
    const directory = repoPath(`modules/${moduleId}`);
    assert(fs.existsSync(directory), `missing externalized module ${moduleId}`);
    const files = [];
    const visit = (current) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const target = path.join(current, entry.name);
        if (entry.isDirectory()) visit(target);
        else if (/\.(?:html|css|js|json)$/i.test(entry.name)) files.push(target);
      }
    };
    visit(directory);
    for (const target of files) {
      if (!/\.(?:html|css|js)$/i.test(target)) continue;
      const source = fs.readFileSync(target, "utf8");
      assert(!/ad-fontes-media\.gusgumee777\.workers\.dev/i.test(source), `${moduleId} still references the retired workers.dev host: ${path.relative(ROOT, target)}`);
    }
    const indexPath = `modules/${moduleId}/index.html`;
    const html = readRepo(indexPath);
    for (const tag of scanStartTags(html)) {
      const reference = tag.name === "img" ? tag.attrs.get("src") : tag.name === "link" ? tag.attrs.get("href") : null;
      if (!reference || !isMediaPath(reference)) continue;
      assert(reference.startsWith(MEDIA_ORIGIN), `${indexPath} still directly requests local media: ${reference}`);
    }
    const wrapper = moduleId === "qinhan" ? "qinhanMediaUrl" : moduleId === "shaanxi-history" ? "shaanxiHistoryMediaUrl" : "shaanxiArchaeologyMediaUrl";
    assert(files.some((target) => fs.readFileSync(target, "utf8").includes(wrapper)), `${moduleId} resolver wrapper is missing`);
  }
  const trails = readRepo("assets/editorial/provenance-trails.js");
  for (const moduleId of EXTERNALIZED_MODULES) {
    const wrapper = moduleId === "qinhan" ? "qinhanMediaUrl" : moduleId === "shaanxi-history" ? "shaanxiHistoryMediaUrl" : "shaanxiArchaeologyMediaUrl";
    assert(new RegExp(`page === '${moduleId}'[^)]*window\\.${wrapper}`).test(trails), `provenance trail media routing missing for ${moduleId}`);
  }
  const atlas = readRepo("modules/museum-atlas/index.html");
  assert(/externalizedModules\s*=\s*new Set\(\[\s*["']qinhan["'][\s\S]*["']shaanxi-history["'][\s\S]*["']shaanxi-archaeology-museum["']/.test(atlas), "Atlas externalized resolver set is incomplete");
  assert(!/ad-fontes-media\.gusgumee777\.workers\.dev/i.test(atlas), "Atlas still contains the retired workers.dev host");
  assert(/pub-2f296678a1134f0fa45cf651ddd6f956\.r2\.dev/i.test(atlas), "Atlas R2 production media base is missing");
}

function runtimeSafetyQa() {
  const roots = ["museum-registry.json", "modules/museum-atlas", "shared/js", "app.js", "guobo-museum", "modules/beilin", "modules/qinhan", "modules/baoji", "modules/xian-museum", "modules/shaanxi-history", "modules/shaanxi-archaeology-museum"];
  const files = new Set();
  const visit = (relative) => {
    const target = repoPath(relative);
    if (!fs.existsSync(target)) return;
    if (fs.statSync(target).isFile()) {
      if (/\.(?:html|css|js)$/i.test(target) || relative === "museum-registry.json" || relative === "modules/museum-atlas/search-index.json") files.add(target);
      return;
    }
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) visit(path.posix.join(relative, entry.name));
  };
  roots.forEach(visit);
  for (const target of files) {
    const source = fs.readFileSync(target, "utf8");
    assert(!/ad-fontes-media\.gusgumee777\.workers\.dev/i.test(source), `retired workers.dev URL in ${path.relative(ROOT, target)}`);
  }
}

function javascriptSyntaxQa() {
  const sources = ["app.js", ...Object.values(ITEM_SOURCES), "modules/qinhan/media-url.js", "modules/shaanxi-history/media-url.js", "modules/shaanxi-archaeology-museum/media-url.js"];
  for (const relativePath of new Set(sources)) {
    if (!exists(relativePath)) continue;
    const result = spawnSync(process.execPath, ["--check", repoPath(relativePath)], { encoding: "utf8", maxBuffer: 1024 * 1024 });
    assert(result.status === 0, `${relativePath} syntax failed: ${(result.stderr || result.stdout || "unknown syntax error").trim()}`);
  }
}

function runSection(name, callback) {
  try {
    callback();
    passed.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

runSection("registry-schema-and-rendering-contract", registryQa);
runSection("metadata", metadataQa);
runSection("atlas-and-build-01", atlasQa);
runSection("build-02-search-index", searchIndexQa);
runSection("deep-links", deepLinkQa);
runSection("return-to-atlas", atlasReturnLinksQa);
runSection("local-resources", localResourcesQa);
runSection("externalized-worker-routing", externalizedRuntimeQa);
runSection("runtime-safety", runtimeSafetyQa);
runSection("javascript-syntax", javascriptSyntaxQa);

if (failures.length === 0) {
  console.log(`QA PASS: ${passed.length} sections`);
  process.exitCode = 0;
} else {
  console.error(`QA FAIL: ${failures.length} section(s)`);
  failures.forEach(({ name, message }) => console.error(`- ${name}: ${message}`));
  process.exitCode = 1;
}
