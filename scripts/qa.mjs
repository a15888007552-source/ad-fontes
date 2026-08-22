import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import nodeFs from "node:fs";

const ROOT = path.resolve(process.cwd());
const PUBLIC_ORIGIN = "https://a15888007552-source.github.io";
const PUBLIC_ROOT = "/ad-fontes/";
const PUBLIC_BASE = `${PUBLIC_ORIGIN}${PUBLIC_ROOT}`;

const PUBLIC_PAGES = [
  { id: "museum-atlas", path: "modules/museum-atlas/index.html", canonical: `${PUBLIC_BASE}modules/museum-atlas/index.html` },
  { id: "beilin", path: "modules/beilin/index.html", canonical: `${PUBLIC_BASE}modules/beilin/index.html` },
  { id: "qinhan", path: "modules/qinhan/index.html", canonical: `${PUBLIC_BASE}modules/qinhan/index.html` },
  { id: "shaanxi-archaeology", path: "modules/shaanxi-archaeology-museum/index.html", canonical: `${PUBLIC_BASE}modules/shaanxi-archaeology-museum/index.html` },
  { id: "baoji", path: "modules/baoji/index.html", canonical: `${PUBLIC_BASE}modules/baoji/index.html` },
  { id: "xian-museum", path: "modules/xian-museum/index.html", canonical: `${PUBLIC_BASE}modules/xian-museum/index.html` },
  { id: "shaanxi-history", path: "modules/shaanxi-history/index.html", canonical: `${PUBLIC_BASE}modules/shaanxi-history/index.html` },
  { id: "guobo", path: "guobo-museum/index.html", canonical: `${PUBLIC_BASE}guobo-museum/index.html` },
];

const failures = [];
const passedSections = [];
let registryContext = null;

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
  return nodeFs.existsSync(repoPath(relativePath));
}

function readRepo(relativePath) {
  const target = repoPath(relativePath);
  assert(nodeFs.existsSync(target), `missing repository file: ${relativePath}`);
  return nodeFs.readFileSync(target, "utf8");
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
  assert(isPlainObject(value), `${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys are ${actual.join(", ")}, expected ${wanted.join(", ")}`);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function chineseInteger(value) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  assert(Number.isInteger(value) && value >= 0 && value <= 99, `Chinese integer out of supported range: ${value}`);
  if (value < 10) return digits[value];
  if (value === 10) return "十";
  if (value < 20) return `十${digits[value % 10]}`;
  if (value % 10 === 0) return `${digits[Math.floor(value / 10)]}十`;
  return `${digits[Math.floor(value / 10)]}十${digits[value % 10]}`;
}

function decodeEntities(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function textContent(value) {
  return decodeEntities(String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function parseAttributes(rawTag) {
  const body = rawTag.slice(1, -1);
  const nameMatch = /^\s*[^\s/>]+/.exec(body);
  const attributes = new Map();
  if (!nameMatch) return attributes;
  const rest = body.slice(nameMatch[0].length);
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attributePattern.exec(rest))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attributes.set(name, decodeEntities(value));
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
      const commentEnd = html.indexOf("-->", start + 4);
      cursor = commentEnd < 0 ? html.length : commentEnd + 3;
      continue;
    }
    if (html[start + 1] === "/" || html[start + 1] === "!" || html[start + 1] === "?") {
      cursor = start + 1;
      continue;
    }
    const nameMatch = /^<([A-Za-z][\w:-]*)/.exec(html.slice(start));
    if (!nameMatch) {
      cursor = start + 1;
      continue;
    }
    const name = nameMatch[1].toLowerCase();
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
    const tag = { name, raw, attrs: parseAttributes(raw), start, end: end + 1 };
    tags.push(tag);
    cursor = end + 1;
    if (name === "script" || name === "style") {
      const closePattern = new RegExp(`<\\/${name}\\s*>`, "ig");
      closePattern.lastIndex = cursor;
      const closing = closePattern.exec(html);
      cursor = closing ? closing.index + closing[0].length : html.length;
    }
  }
  return tags;
}

function extractBlock(html, tag) {
  const tokenPattern = new RegExp(`<\\/?${tag.name}\\b[^>]*>`, "ig");
  tokenPattern.lastIndex = tag.end;
  let depth = 1;
  let token;
  while ((token = tokenPattern.exec(html))) {
    if (token[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return {
          inner: html.slice(tag.end, token.index),
          outer: html.slice(tag.start, token.index + token[0].length),
          end: token.index + token[0].length,
        };
      }
    } else if (!/\/\s*>$/.test(token[0])) {
      depth += 1;
    }
  }
  fail(`unclosed <${tag.name}> element near byte ${tag.start}`);
}

function elementsWithAttribute(html, attribute, expectedValue) {
  const wanted = expectedValue === undefined ? undefined : String(expectedValue);
  return scanStartTags(html).filter((tag) => {
    if (!tag.attrs.has(attribute.toLowerCase())) return false;
    return wanted === undefined || tag.attrs.get(attribute.toLowerCase()) === wanted;
  });
}

function firstScriptOffset(html) {
  const match = /<script\b/i.exec(html);
  return match ? match.index : html.length;
}

function resolveRepoReference(reference, pagePath) {
  const raw = String(reference || "").trim();
  if (!raw || raw.startsWith("#")) return null;
  const lower = raw.toLowerCase();
  if (/^(?:data|blob|mailto|tel|javascript):/.test(lower)) return null;
  if (lower.startsWith("http:") || lower.startsWith("https:") || lower.startsWith("//")) {
    const url = new URL(raw, PUBLIC_BASE);
    if (url.origin !== PUBLIC_ORIGIN || !url.pathname.startsWith(PUBLIC_ROOT)) return null;
    return path.posix.normalize(decodeURIComponent(url.pathname.slice(PUBLIC_ROOT.length)));
  }
  const url = new URL(raw, `${PUBLIC_BASE}${pagePath}`);
  if (url.origin !== PUBLIC_ORIGIN || !url.pathname.startsWith(PUBLIC_ROOT)) return null;
  const relative = path.posix.normalize(decodeURIComponent(url.pathname.slice(PUBLIC_ROOT.length)));
  if (relative === ".." || relative.startsWith("../") || relative.startsWith("/")) return null;
  return relative;
}

function resolveAtlasTarget(reference, pagePath) {
  return resolveRepoReference(reference, pagePath);
}

function countMatches(text, pattern) {
  return [...String(text).matchAll(pattern)].length;
}

function getHead(html, pagePath) {
  const open = /<head\b[^>]*>/i.exec(html);
  const close = /<\/head\s*>/i.exec(html);
  assert(open && close && close.index > open.index, `${pagePath} has no complete head`);
  return html.slice(open.index + open[0].length, close.index);
}

function getTitle(head, pagePath) {
  const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
  assert(titles.length === 1, `${pagePath} must contain exactly one title, found ${titles.length}`);
  return textContent(titles[0][1]);
}

function metaValues(head, attribute, value) {
  return scanStartTags(head)
    .filter((tag) => tag.name === "meta" && tag.attrs.get(attribute) === value)
    .map((tag) => tag.attrs.get("content") ?? "");
}

function linkTags(head, relToken) {
  return scanStartTags(head).filter((tag) => {
    if (tag.name !== "link") return false;
    const rel = (tag.attrs.get("rel") || "").toLowerCase().split(/\s+/).filter(Boolean);
    return rel.includes(relToken.toLowerCase());
  });
}

function requireOne(values, label) {
  assert(values.length === 1, `${label} must occur exactly once, found ${values.length}`);
  return values[0];
}

function safePublicImageUrl(value, pagePath, label) {
  const url = new URL(value, PUBLIC_BASE);
  assert(url.protocol === "https:", `${pagePath} ${label} must use HTTPS`);
  assert(url.origin === PUBLIC_ORIGIN && url.pathname.startsWith(PUBLIC_ROOT), `${pagePath} ${label} must use the public base`);
  assert(!url.search && !url.hash, `${pagePath} ${label} must not contain query/hash`);
  const local = path.posix.normalize(decodeURIComponent(url.pathname.slice(PUBLIC_ROOT.length)));
  assert(local !== ".." && !local.startsWith("../") && exists(local), `${pagePath} ${label} maps to missing file ${local}`);
  return url.href;
}

function parseHtmlPage(page) {
  const html = readRepo(page.path);
  return { ...page, html, head: getHead(html, page.path), tags: scanStartTags(html) };
}

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[\s;{}])\/\/.*$/gm, "$1");
}

function checkNodeSyntax(target, label) {
  const result = spawnSync(process.execPath, ["--check", target], { encoding: "utf8", maxBuffer: 1024 * 1024 });
  assert(result.status === 0, `${label} syntax failed: ${(result.stderr || result.stdout || "unknown syntax error").trim()}`);
}

function parseCssBraces(css) {
  let braces = 0;
  let comment = false;
  let quote = null;
  let escaped = false;
  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    const next = css[index + 1];
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "*") {
      comment = true;
      index += 1;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "{") {
      braces += 1;
    } else if (character === "}") {
      braces -= 1;
      assert(braces >= 0, "CSS has a closing brace without an opening brace");
    }
  }
  assert(!comment, "CSS comment is not terminated");
  assert(!quote, "CSS string is not terminated");
  assert(braces === 0, `CSS brace depth ended at ${braces}`);
}

function findMuseumCards(markup) {
  return scanStartTags(markup)
    .filter((tag) => (tag.name === "a" || tag.name === "article") && (tag.attrs.get("class") || "").split(/\s+/).includes("museum-card"))
    .map((tag) => ({ ...tag, ...extractBlock(markup, tag) }));
}

function findSingleMountText(markup, attribute, value) {
  const matches = elementsWithAttribute(markup, attribute, value);
  assert(matches.length === 1, `${attribute}=${value} must occur exactly once, found ${matches.length}`);
  return textContent(extractBlock(markup, matches[0]).inner);
}

function registryQa() {
  const registry = readJson("museum-registry.json");
  exactKeys(registry, ["schema_version", "provinces", "museums"], "museum-registry root");
  assert(registry.schema_version === 1, "registry schema_version must be 1");
  assert(Array.isArray(registry.provinces) && registry.provinces.length > 0, "registry provinces must be non-empty");
  assert(Array.isArray(registry.museums) && registry.museums.length > 0, "registry museums must be non-empty");

  const provinceIds = new Set();
  const provinceOrders = new Set();
  for (const province of registry.provinces) {
    exactKeys(province, ["id", "name", "code", "order"], "province");
    assert(isNonEmptyString(province.id) && !provinceIds.has(province.id), `duplicate/empty province id: ${province.id}`);
    assert(isNonEmptyString(province.name) && isNonEmptyString(province.code), `province ${province.id} needs name/code`);
    assert(finiteNumber(province.order) && !provinceOrders.has(province.order), `duplicate/invalid province order: ${province.id}`);
    provinceIds.add(province.id);
    provinceOrders.add(province.order);
  }

  const museumIds = new Set();
  const museumOrders = new Map([...provinceIds].map((id) => [id, new Set()]));
  const live = [];
  const preparation = [];
  for (const museum of registry.museums) {
    exactKeys(museum, ["id", "province", "order", "name", "city", "theme", "status", "archive_type", "site_path", "card_image"], `museum ${museum.id || "?"}`);
    assert(isNonEmptyString(museum.id) && !museumIds.has(museum.id), `duplicate/empty museum id: ${museum.id}`);
    assert(provinceIds.has(museum.province), `museum ${museum.id} references unknown province`);
    assert(finiteNumber(museum.order) && !museumOrders.get(museum.province).has(museum.order), `duplicate/invalid museum order: ${museum.id}`);
    assert(isNonEmptyString(museum.name) && isNonEmptyString(museum.city) && isNonEmptyString(museum.theme), `museum ${museum.id} needs name/city/theme`);
    assert(museum.status === "live" || museum.status === "preparation", `museum ${museum.id} has invalid status`);
    exactKeys(museum.card_image, ["path", "alt", "loading", "fetchpriority", "width", "height"], `card_image ${museum.id}`);
    assert(isNonEmptyString(museum.card_image.path) && exists(museum.card_image.path), `missing card image for ${museum.id}: ${museum.card_image.path}`);
    assert(isNonEmptyString(museum.card_image.alt), `card image alt missing for ${museum.id}`);
    assert(museum.card_image.loading === "eager" || museum.card_image.loading === "lazy", `invalid card image loading for ${museum.id}`);
    assert(museum.card_image.fetchpriority === null || typeof museum.card_image.fetchpriority === "string", `invalid card image fetchpriority for ${museum.id}`);
    for (const dimension of ["width", "height"]) {
      assert(museum.card_image[dimension] === null || (finiteNumber(museum.card_image[dimension]) && museum.card_image[dimension] > 0), `invalid ${dimension} for ${museum.id}`);
    }
    if (museum.status === "live") {
      assert(isNonEmptyString(museum.archive_type) && isNonEmptyString(museum.site_path), `live museum ${museum.id} needs archive_type/site_path`);
      assert(exists(museum.site_path), `live museum path missing: ${museum.site_path}`);
      live.push(museum);
    } else {
      assert(museum.archive_type === null && museum.site_path === null, `preparation museum ${museum.id} must have null archive_type/site_path`);
      preparation.push(museum);
    }
    museumIds.add(museum.id);
    museumOrders.get(museum.province).add(museum.order);
  }
  registryContext = { registry, live, preparation, provinceIds };
}

function metadataQa() {
  const requiredMeta = [
    ["name", "description"],
    ["property", "og:type"],
    ["property", "og:site_name"],
    ["property", "og:locale"],
    ["property", "og:title"],
    ["property", "og:description"],
    ["property", "og:url"],
    ["property", "og:image"],
    ["property", "og:image:alt"],
    ["name", "twitter:card"],
    ["name", "twitter:title"],
    ["name", "twitter:description"],
    ["name", "twitter:image"],
    ["name", "twitter:image:alt"],
  ];
  for (const page of PUBLIC_PAGES) {
    const parsed = parseHtmlPage(page);
    const title = getTitle(parsed.head, page.path);
    const description = requireOne(metaValues(parsed.head, "name", "description"), `${page.path} description`);
    const canonical = requireOne(linkTags(parsed.head, "canonical").map((tag) => tag.attrs.get("href") || ""), `${page.path} canonical`);
    assert(canonical === page.canonical, `${page.path} canonical mismatch`);
    const values = new Map();
    for (const [attribute, key] of requiredMeta) {
      const matches = metaValues(parsed.head, attribute, key);
      assert(matches.length === 1, `${page.path} ${attribute}=${key} count is ${matches.length}`);
      values.set(`${attribute}:${key}`, matches[0]);
    }
    assert(values.get("property:og:type") === "website", `${page.path} og:type mismatch`);
    assert(values.get("property:og:site_name") === "Ad Fontes · Museum Atlas", `${page.path} og:site_name mismatch`);
    assert(values.get("property:og:locale") === "zh_CN", `${page.path} og:locale mismatch`);
    assert(values.get("property:og:title") === title && values.get("name:twitter:title") === title, `${page.path} title metadata mismatch`);
    assert(values.get("property:og:description") === description && values.get("name:twitter:description") === description, `${page.path} description metadata mismatch`);
    assert(values.get("property:og:url") === canonical, `${page.path} og:url mismatch`);
    assert(values.get("name:twitter:card") === "summary_large_image", `${page.path} twitter:card mismatch`);
    const ogImage = values.get("property:og:image");
    const twitterImage = values.get("name:twitter:image");
    assert(ogImage === twitterImage, `${page.path} social image URLs differ`);
    assert(isNonEmptyString(values.get("property:og:image:alt")) && isNonEmptyString(values.get("name:twitter:image:alt")), `${page.path} social image alt missing`);
    safePublicImageUrl(ogImage, page.path, "og:image");
    safePublicImageUrl(twitterImage, page.path, "twitter:image");
  }
}

function atlasQa() {
  assert(registryContext, "registry QA did not produce a registry context");
  const atlasPage = PUBLIC_PAGES.find((page) => page.id === "museum-atlas");
  const html = readRepo(atlasPage.path);
  assert(countMatches(html, /\.\.\/\.\.\/museum-registry\.json/g) === 1, "Atlas registry reference count is not one");
  assert(countMatches(html, /id=["']museum-registry-renderer["']/gi) === 1, "Atlas registry renderer is missing");
  const staticMarkup = html.slice(0, firstScriptOffset(html));
  assert(elementsWithAttribute(staticMarkup, "data-registry-stat", "header-summary").length === 1, "Atlas header summary mount count is not one");
  assert(elementsWithAttribute(staticMarkup, "data-registry-stat", "opening-summary").length === 1, "Atlas opening summary mount count is not one");
  assert(elementsWithAttribute(staticMarkup, "data-registry-stat", "province-count").length === 1, "Atlas province-count mount count is not one");
  const listMounts = elementsWithAttribute(staticMarkup, "data-registry-museums");
  const countMounts = elementsWithAttribute(staticMarkup, "data-registry-province-count");
  const provinceIds = [...registryContext.provinceIds].sort();
  assert(JSON.stringify(listMounts.map((tag) => tag.attrs.get("data-registry-museums")).sort()) === JSON.stringify(provinceIds), "Atlas museum hook IDs differ from registry provinces");
  assert(JSON.stringify(countMounts.map((tag) => tag.attrs.get("data-registry-province-count")).sort()) === JSON.stringify(provinceIds), "Atlas count hook IDs differ from registry provinces");
  const cards = findMuseumCards(staticMarkup);
  assert(cards.length === registryContext.registry.museums.length, `Atlas fallback card count ${cards.length} != ${registryContext.registry.museums.length}`);
  const liveCards = cards.filter((card) => card.name === "a");
  const preparationCards = cards.filter((card) => card.name === "article");
  assert(liveCards.length === registryContext.live.length, `Atlas linked card count ${liveCards.length} != ${registryContext.live.length}`);
  assert(preparationCards.length === registryContext.preparation.length, `Atlas preparation card count ${preparationCards.length} != ${registryContext.preparation.length}`);
  for (const museum of registryContext.live) {
    const matching = liveCards.filter((card) => resolveAtlasTarget(card.attrs.get("href"), atlasPage.path) === museum.site_path);
    assert(matching.length === 1, `Atlas fallback link count for ${museum.id} is ${matching.length}`);
    assert(textContent(matching[0].inner).includes(`OPEN / ${museum.archive_type}`), `Atlas fallback status missing for ${museum.id}`);
  }
  for (const museum of registryContext.preparation) {
    const matching = preparationCards.filter((card) => textContent(card.inner).includes(museum.name));
    assert(matching.length === 1, `Atlas preparation fallback card count for ${museum.id} is ${matching.length}`);
    assert(textContent(matching[0].inner).includes("IN PREPARATION"), `Atlas preparation status missing for ${museum.id}`);
  }
  const provinceCounts = new Map();
  for (const province of registryContext.registry.provinces) {
    const mount = listMounts.find((tag) => tag.attrs.get("data-registry-museums") === province.id);
    const block = extractBlock(staticMarkup, mount);
    const provinceCards = findMuseumCards(block.inner);
    const expected = registryContext.registry.museums.filter((museum) => museum.province === province.id);
    const expectedLive = expected.filter((museum) => museum.status === "live");
    const expectedPreparation = expected.filter((museum) => museum.status === "preparation");
    assert(provinceCards.length === expected.length, `Atlas province ${province.id} card count mismatch`);
    assert(provinceCards.filter((card) => card.name === "a").length === expectedLive.length, `Atlas province ${province.id} live count mismatch`);
    assert(provinceCards.filter((card) => card.name === "article").length === expectedPreparation.length, `Atlas province ${province.id} preparation count mismatch`);
    provinceCounts.set(province.id, expected.length);
  }
  const expectedHeader = `${pad2(registryContext.registry.provinces.length)} 省份 · ${pad2(registryContext.registry.museums.length)} 座馆 · ${pad2(registryContext.live.length)} 个已上线专题`;
  const expectedOpening = `${chineseInteger(registryContext.registry.museums.length)}座博物馆 · ${chineseInteger(registryContext.live.length)}座专题已上线`;
  assert(findSingleMountText(staticMarkup, "data-registry-stat", "header-summary") === expectedHeader, "Atlas header fallback text mismatch");
  assert(findSingleMountText(staticMarkup, "data-registry-stat", "opening-summary") === expectedOpening, "Atlas opening fallback text mismatch");
  assert(findSingleMountText(staticMarkup, "data-registry-stat", "province-count") === pad2(registryContext.registry.provinces.length), "Atlas cover province count mismatch");
  for (const [province, count] of provinceCounts) {
    assert(findSingleMountText(staticMarkup, "data-registry-province-count", province) === `${pad2(count)} 座`, `Atlas province fallback count mismatch: ${province}`);
  }
  const legacyTokens = ["maplibre", "maplibregl", "model-viewer", "three.module", "three.js", ".glb", ".gltf"];
  const lower = html.toLowerCase();
  for (const token of legacyTokens) assert(!lower.includes(token), `Atlas contains forbidden legacy/3D token: ${token}`);
  assert(/(?:searchParams|URLSearchParams)[\s\S]{0,180}province|province[\s\S]{0,180}(?:searchParams|URLSearchParams)/i.test(html), "Atlas province query-state logic is missing");
  assert(/addEventListener\s*\(\s*["']popstate["']/i.test(html), "Atlas popstate listener is missing");
  assert(/(?:window\.)?history\.(?:pushState|replaceState)\s*\(/i.test(html), "Atlas History API usage is missing");
}

function atlasReturnLinksQa() {
  assert(registryContext, "registry QA did not produce a registry context");
  const atlasPath = "modules/museum-atlas/index.html";
  for (const museum of registryContext.live) {
    const html = readRepo(museum.site_path);
    const tags = scanStartTags(html).filter((tag) => tag.name === "a" && tag.attrs.has("href"));
    const matches = tags.filter((tag) => resolveAtlasTarget(tag.attrs.get("href"), museum.site_path) === atlasPath);
    assert(matches.length === 1, `${museum.id} Atlas return anchor count is ${matches.length}`);
    const url = new URL(matches[0].attrs.get("href"), `${PUBLIC_BASE}${museum.site_path}`);
    assert(url.searchParams.get("province") === museum.province, `${museum.id} Atlas return province query mismatch`);
    assert(!/^(?:javascript:|#?$)/i.test(matches[0].attrs.get("href") || ""), `${museum.id} Atlas return is not an actual link`);
  }
}

function deepLinkQa() {
  const sources = [
    "app.js",
    "modules/qinhan/app.js",
    "modules/shaanxi-archaeology-museum/photo-catalog.js",
    "modules/baoji/app.js",
    "modules/xian-museum/app.js",
    "modules/shaanxi-history/app.js",
    "guobo-museum/app.js",
  ];
  for (const relativePath of sources) {
    const source = readRepo(relativePath);
    const clean = stripJsComments(source);
    assert(countMatches(clean, /(?:window\.)?addEventListener\s*\(\s*["']popstate["']/g) === 1, `${relativePath} must have exactly one popstate listener`);
    assert(/(?:window\.)?history\.(?:pushState|replaceState)\s*\(/.test(clean) || /(?:window\.)?history\[[^\]]+\]\s*\(/.test(clean) && /(?:pushState|replaceState)/.test(clean), `${relativePath} has no History API pushState`);
    assert(/(?:new\s+)?URLSearchParams\s*\([^)]*\)[\s\S]{0,160}(?:get\s*\(|has\s*\()["']item["']/i.test(clean) || /searchParams\.get\s*\(["']item["']/i.test(clean), `${relativePath} has no item query-state handling`);
    assert(/new\s+URL\s*\(|URLSearchParams|\.searchParams\b/.test(clean), `${relativePath} has no URL/searchParams manipulation`);
  }
}

function parseShaanxiCatalogue() {
  const raw = readRepo("modules/shaanxi-history/data.js");
  const match = /^\s*window\.SHAANXI_DATA\s*=\s*([\s\S]*?)\s*;\s*$/.exec(raw);
  assert(match, "Shaanxi data.js wrapper is not the expected JSON assignment");
  try {
    return { raw, data: JSON.parse(match[1]) };
  } catch (error) {
    fail(`Shaanxi data.js JSON parse failed: ${error.message}`);
  }
}

function shaanxiHistoryQa() {
  const parsed = parseShaanxiCatalogue();
  const details = readJson("modules/shaanxi-history/item-details.json");
  const app = readRepo("modules/shaanxi-history/app.js");
  const index = readRepo("modules/shaanxi-history/index.html");
  assert(Array.isArray(parsed.data.items) && parsed.data.items.length > 0, "Shaanxi catalogue items must be non-empty");
  assert(parsed.data.items.length >= 296, `Shaanxi catalogue has only ${parsed.data.items.length} items`);
  const catalogueIds = new Set();
  for (const item of parsed.data.items) {
    assert(isNonEmptyString(item.id) && !catalogueIds.has(item.id), `duplicate/empty Shaanxi catalogue id: ${item.id}`);
    assert(Object.prototype.hasOwnProperty.call(item, "photoCount") && Object.prototype.hasOwnProperty.call(item, "sourceCount"), `Shaanxi catalogue counts missing for ${item.id}`);
    assert(!Object.prototype.hasOwnProperty.call(item, "photos") && !Object.prototype.hasOwnProperty.call(item, "essay") && !Object.prototype.hasOwnProperty.call(item, "evidence") && !Object.prototype.hasOwnProperty.call(item, "sources"), `Shaanxi catalogue still contains detail payload for ${item.id}`);
    catalogueIds.add(item.id);
  }
  exactKeys(details, ["schema_version", "items"], "Shaanxi detail root");
  assert(details.schema_version === 1 && isPlainObject(details.items), "Shaanxi detail schema is invalid");
  const detailIds = new Set(Object.keys(details.items));
  assert(JSON.stringify([...catalogueIds].sort()) === JSON.stringify([...detailIds].sort()), "Shaanxi catalogue/detail ID sets differ");
  for (const id of detailIds) {
    const detail = details.items[id];
    exactKeys(detail, ["photos", "essay", "evidence", "sources"], `Shaanxi detail ${id}`);
    assert(Array.isArray(detail.photos) && Array.isArray(detail.essay) && typeof detail.evidence === "string" && Array.isArray(detail.sources), `Shaanxi detail shape invalid for ${id}`);
    const catalogue = parsed.data.items.find((item) => item.id === id);
    assert(catalogue.photoCount === detail.photos.length, `Shaanxi photoCount mismatch for ${id}`);
    assert(catalogue.sourceCount === detail.sources.length, `Shaanxi sourceCount mismatch for ${id}`);
  }
  assert(nodeFs.statSync(repoPath("modules/shaanxi-history/data.js")).size < 300000, "Shaanxi data.js exceeds 300000 bytes");
  assert(!/<(?:script|link)\b[^>]*(?:item-details\.json|(?:preload|prefetch)[^>]*item-details)/i.test(index), "Shaanxi index contains item-details preload/script/prefetch");
  assert(countMatches(app, /["'`]item-details\.json[^"'`]*/g) === 1, "Shaanxi app must contain exactly one detail payload URL");
  assert(/itemDetailsPromise/.test(app) && /itemDetailsPromise\s*=/.test(app), "Shaanxi app lost shared in-flight detail state");
  assert(/validateItemDetails/.test(app) && /schema_version/.test(app) && /Incomplete detail payload/.test(app), "Shaanxi app lost detail validation");
  assert(/openRequestGeneration/.test(app) && countMatches(app, /requestToken\s*!==\s*openRequestGeneration/g) >= 2, "Shaanxi app lost pending-open race protection");
  const scriptSrcs = scanStartTags(index).filter((tag) => tag.name === "script" && tag.attrs.has("src")).map((tag) => resolveRepoReference(tag.attrs.get("src"), "modules/shaanxi-history/index.html"));
  assert(scriptSrcs.includes("modules/shaanxi-history/data.js") && scriptSrcs.includes("modules/shaanxi-history/app.js"), "Shaanxi index must load data.js and app.js");
}

function beilinMobileQa() {
  const index = readRepo("modules/beilin/index.html");
  const mobile = readRepo("modules/beilin/mobile.css");
  const links = scanStartTags(index).filter((tag) => tag.name === "link" && (tag.attrs.get("rel") || "").toLowerCase().split(/\s+/).includes("stylesheet"));
  const mobileLinks = links.filter((tag) => resolveRepoReference(tag.attrs.get("href"), "modules/beilin/index.html") === "modules/beilin/mobile.css");
  assert(mobileLinks.length === 1, `Beilin mobile stylesheet link count is ${mobileLinks.length}`);
  const url = new URL(mobileLinks[0].attrs.get("href"), `${PUBLIC_BASE}modules/beilin/index.html`);
  assert(url.search.length > 1, "Beilin mobile stylesheet link has no cache revision query");
  for (const id of ["beilin-mobile-overrides", "beilin-mobile-polish-v2", "beilin-mobile-final"]) assert(!index.includes(id), `historical Beilin inline id remains: ${id}`);
  assert(countMatches(index, /<style\b[^>]*\bid=["']museum-brand-emblem["']/gi) === 1, "Beilin museum-brand-emblem inline style count is not one");
  assert(/<noscript\s*>\s*<style>[^<]*\.beilin-intro\s*\{[^}]*display\s*:\s*none/i.test(index), "Beilin noscript intro fallback is missing");
  assert(!/<\/?style\b/i.test(mobile), "Beilin mobile.css contains style tags");
  parseCssBraces(mobile);
}

function localResourcesQa() {
  for (const page of PUBLIC_PAGES) {
    const html = readRepo(page.path);
    for (const tag of scanStartTags(html)) {
      let attribute = null;
      if (tag.name === "script") attribute = "src";
      else if (tag.name === "img" || tag.name === "iframe") attribute = "src";
      else if (tag.name === "link") {
        const rel = (tag.attrs.get("rel") || "").toLowerCase().split(/\s+/);
        if (rel.includes("stylesheet") || rel.includes("icon") || rel.includes("preload")) attribute = "href";
      }
      if (!attribute || !tag.attrs.has(attribute)) continue;
      const reference = tag.attrs.get(attribute);
      const local = resolveRepoReference(reference, page.path);
      if (local) assert(exists(local), `${page.path} local ${attribute} is missing: ${reference} -> ${local}`);
    }
  }
}

function javascriptSyntaxQa() {
  const required = [
    "app.js",
    "modules/qinhan/app.js",
    "modules/shaanxi-archaeology-museum/photo-catalog.js",
    "modules/baoji/app.js",
    "modules/xian-museum/app.js",
    "modules/shaanxi-history/app.js",
    "guobo-museum/app.js",
  ];
  const external = new Set(required);
  const inlineBlocks = [];
  for (const page of PUBLIC_PAGES) {
    const html = readRepo(page.path);
    for (const tag of scanStartTags(html)) {
      if (tag.name !== "script") continue;
      const src = tag.attrs.get("src");
      if (src) {
        const local = resolveRepoReference(src, page.path);
        if (local && local.toLowerCase().endsWith(".js")) external.add(local);
      } else {
        const closePattern = /<\/script\s*>/ig;
        closePattern.lastIndex = tag.end;
        const closing = closePattern.exec(html);
        if (!closing) fail(`${page.path} has unclosed inline script`);
        const type = (tag.attrs.get("type") || "").toLowerCase();
        if (!type || type === "text/javascript" || type === "application/javascript" || type === "module" || type === "text/ecmascript") {
          inlineBlocks.push({ page: page.path, source: html.slice(tag.end, closing.index) });
        }
      }
    }
  }
  const tempRoot = nodeFs.mkdtempSync(path.join(os.tmpdir(), "museum-qa-"));
  try {
    for (const relativePath of external) {
      const target = repoPath(relativePath);
      assert(nodeFs.existsSync(target), `external local JavaScript missing: ${relativePath}`);
      checkNodeSyntax(target, relativePath);
    }
    inlineBlocks.forEach((block, index) => {
      const target = path.join(tempRoot, `inline-${index}.mjs`);
      nodeFs.writeFileSync(target, block.source, "utf8");
      checkNodeSyntax(target, `${block.page} inline script ${index + 1}`);
    });
  } finally {
    nodeFs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runSection(name, callback) {
  try {
    callback();
    passedSections.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

runSection("registry", registryQa);
runSection("metadata", metadataQa);
runSection("atlas-registry", atlasQa);
runSection("atlas-return-links", atlasReturnLinksQa);
runSection("deep-links", deepLinkQa);
runSection("shaanxi-history-split", shaanxiHistoryQa);
runSection("beilin-mobile-css", beilinMobileQa);
runSection("local-resources", localResourcesQa);
runSection("javascript-syntax", javascriptSyntaxQa);

if (failures.length === 0) {
  console.log(`QA PASS: ${passedSections.length} sections`);
  process.exitCode = 0;
} else {
  console.error(`QA FAIL: ${failures.length} section(s)`);
  process.exitCode = 1;
}
