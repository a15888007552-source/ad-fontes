#!/usr/bin/env node
/**
 * Proceedings phase A: compact, deterministic preservation baseline.
 * Generate once: node scripts/validate_proceedings_baseline.mjs --write --source-ref <commit>
 * Validate:      node scripts/validate_proceedings_baseline.mjs
 * Phase A only:  node scripts/validate_proceedings_baseline.mjs --check-source
 *
 * Uses Node standard libraries only. No browser, network, or asset rewrites.
 * Source fingerprints are historical provenance; --check-source additionally
 * checks them. The normal check pins every data field, record order, original
 * byline, schedule grouping, image path, search result, rendered text/media,
 * original static-shell region text, and original DOM ID inventory.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE = path.join(ROOT, 'modules/proceedings');
const SOURCE = path.join(MODULE, 'index.html');
const MANIFEST = path.join(MODULE, 'baseline.manifest.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const normalizeSpace = value => String(value).replace(/\s+/gu, ' ').trim();

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}
const semanticHash = value => sha(JSON.stringify(stable(value)));

function textLeaves(value, at = '') {
  if (typeof value === 'string') return [[at, normalizeSpace(value)]];
  if (Array.isArray(value)) return value.flatMap((item, i) => textLeaves(item, `${at}[${i}]`));
  if (value && typeof value === 'object') return Object.keys(value).sort().flatMap(key => textLeaves(value[key], `${at}.${key}`));
  return [];
}

function decodeEntities(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, code) => {
    if (code[0] === '#') return String.fromCodePoint(parseInt(code.slice(code[1].toLowerCase() === 'x' ? 2 : 1), code[1].toLowerCase() === 'x' ? 16 : 10));
    return {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '}[code.toLowerCase()];
  });
}

function renderedSnapshot(html) {
  // Keep all authored/rendered text. Only HTML markup and whitespace normalize.
  // UI additions must be reviewed separately; do not regenerate this manifest.
  const text = normalizeSpace(decodeEntities(html.replace(/<[^>]*>/g, ' ')));
  const media = [...html.matchAll(/<(?:img|source)\b[^>]*\bsrc=["']([^"']*)["'][^>]*>/gi)].map(match => decodeEntities(match[1]));
  return {textSha256: sha(text), mediaSha256: semanticHash(media), mediaCount: media.length};
}

function authoredShell(html) {
  const source = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const ids = [], stack = [], regions = new Map(), outside = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const token of source.match(/<[^>]*>|[^<]+/g) || []) {
    if (token.startsWith('<!') || token.startsWith('<?')) continue;
    if (token.startsWith('</')) {
      const tag = token.match(/^<\/\s*([^\s>]+)/)?.[1].toLowerCase();
      const index = stack.map(frame => frame.tag).lastIndexOf(tag);
      if (index >= 0) stack.splice(index);
    } else if (token.startsWith('<')) {
      const tag = token.match(/^<\s*([^\s/>]+)/)?.[1].toLowerCase();
      if (!tag) continue;
      const attrs = Object.fromEntries([...token.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), decodeEntities(match[2] ?? match[3])]));
      if (attrs.id) ids.push(attrs.id);
      const classes = (attrs.class || '').split(/\s+/);
      let region = stack.at(-1)?.region || null;
      if (!region) {
        const key = tag === 'title' ? 'title' : ['proceedings-opening', 'lightbox'].includes(attrs.id) ? '#' + attrs.id : tag === 'header' && classes.includes('topbar') ? 'header.topbar' : tag === 'nav' && classes.includes('tabs') ? 'nav.tabs' : tag === 'footer' ? 'footer' : null;
        if (key) {
          if (regions.has(key)) throw new Error(`Duplicate authored shell region: ${key}`);
          region = {key, chunks: []};
          regions.set(key, region);
        }
      }
      if (!voidTags.has(tag) && !/\/\s*>$/.test(token)) stack.push({tag, region});
    } else {
      const region = stack.at(-1)?.region;
      (region ? region.chunks : outside).push(decodeEntities(token));
    }
  }
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate authored DOM IDs');
  const authored = [...regions.values()].map(region => ({key: region.key, textSha256: sha(normalizeSpace(region.chunks.join(' ')))}));
  const unassigned = normalizeSpace(outside.join(' '));
  if (unassigned) authored.push({key: 'other-authored-text', textSha256: sha(unassigned)});
  return {regions: authored, textSha256: semanticHash(authored), domIds: ids};
}

function collectSources() {
  const html = fs.readFileSync(SOURCE, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(match => {
    const src = match[1].match(/\bsrc=["']([^"']+)["']/i);
    if (!src) return match[2];
    const resolved = path.resolve(MODULE, src[1]);
    if (!resolved.startsWith(MODULE + path.sep)) throw new Error(`Script outside proceedings module: ${src[1]}`);
    return fs.readFileSync(resolved, 'utf8');
  });
  function assignment(name) {
    const prefix = `window.${name}=`;
    const candidates = scripts.filter(script => script.trimStart().startsWith(prefix));
    if (candidates.length !== 1) throw new Error(`Expected one explicit JSON assignment for ${name}`);
    const raw = candidates[0].trim().slice(prefix.length).replace(/;\s*$/, '');
    return JSON.parse(raw);
  }
  const appSources = scripts.filter(script => /const App\s*=\s*\{/.test(script));
  if (appSources.length !== 1) throw new Error('Expected one original App renderer');
  return {html, scripts, appSource: appSources[0], data: assignment('SITE_DATA'), images: assignment('IMAGES')};
}

function renderer(sources) {
  const nodes = new Map();
  const getNode = id => {
    if (!nodes.has(id)) nodes.set(id, {innerHTML: '', textContent: '', value: '', scrollTop: 0, addEventListener() {}, classList: {add() {}, remove() {}}});
    return nodes.get(id);
  };
  const context = vm.createContext({
    window: {IMAGES: sources.images},
    document: {addEventListener() {}, getElementById: getNode},
  });
  // Execute the reviewed repository renderer without its DOMContentLoaded init.
  // This is an output harness, not a security sandbox for arbitrary code.
  vm.runInContext(sources.appSource + '\n;globalThis.baselineApp = App;', context, {timeout: 5000});
  const app = context.baselineApp;
  app.data = sources.data;
  app.talks = sources.data.talks;
  for (const method of ['renderOverview', 'renderKeynotes', 'renderAll', 'renderSchedule', 'renderPhotos', 'renderThemes']) app[method]();
  const views = Object.fromEntries([...nodes].filter(([id]) => id.startsWith('view-')).map(([id, node]) => [id, renderedSnapshot(node.innerHTML)]));
  views['photo-grid'] = renderedSnapshot(getNode('pgrid').innerHTML);
  const details = new Map();
  for (const talk of sources.data.talks) {
    app.openPanel(talk.id);
    details.set(talk.id, renderedSnapshot(getNode('panel').innerHTML));
  }
  const searches = {};
  for (const q of ['杨燕迪', '达尔豪斯', '歌剧', '库尔塔格']) {
    app.filters = {type: '', day: '', cat: '', q};
    searches[q] = app.applyFilters().map(talk => talk.id);
  }
  return {views, details, searches, stats: app.stats()};
}

function scheduleGroups(talks) {
  const groups = [];
  // Match renderSchedule's current grouping: all keynotes on a day are one
  // display block; other records group by the literal day/period/room strings.
  function add(members, type) {
    const first = members[0];
    groups.push({reference: `display-${first.id}`, day: first.day, period: first.period, room: first.room, type, memberIds: members.map(talk => talk.id), chairs: [...new Set(members.map(talk => talk.chair).filter(Boolean))], groupThemes: [...new Set(members.map(talk => talk.group_theme).filter(Boolean))]});
  }
  // Retain the renderer's two-day order and Set insertion order, including
  // its placement of the lunchtime poster groups after other listed periods.
  for (const day of ['06-26', '06-27']) {
    const dayTalks = talks.filter(talk => talk.day === day);
    const keynote = dayTalks.filter(talk => talk.session_type === 'keynote');
    if (keynote.length) add(keynote, 'keynote');
    for (const period of new Set(dayTalks.map(talk => talk.period).filter(Boolean))) {
      const periodTalks = dayTalks.filter(talk => talk.period === period && talk.session_type !== 'keynote');
      for (const room of new Set(periodTalks.map(talk => talk.room).filter(Boolean))) {
        add(periodTalks.filter(talk => talk.room === room), 'room-period');
      }
    }
  }
  return groups;
}

export function buildBaseline() {
  const sources = collectSources();
  const {data, images} = sources;
  const talks = data.talks;
  if (!Array.isArray(talks) || !talks.length) throw new Error('Missing talk corpus');
  if (talks.some(talk => typeof talk.id !== 'string' || !talk.id)) throw new Error('Missing source ID');
  if (new Set(talks.map(talk => talk.id)).size !== talks.length) throw new Error('Duplicate source IDs');
  const imagePaths = Object.keys(images).sort();
  const mappedPaths = Object.values(images);
  const missing = [...new Set([...imagePaths, ...mappedPaths])].filter(relative => {
    if (typeof relative !== 'string' || !relative.startsWith('assets/')) throw new Error(`Unexpected image path: ${relative}`);
    const resolved = path.resolve(MODULE, relative);
    return !resolved.startsWith(MODULE + path.sep) || !fs.existsSync(resolved);
  });
  if (missing.length) throw new Error(`Missing local assets: ${missing.join(', ')}`);
  const talkIds = new Set(talks.map(talk => talk.id));
  for (const photo of data.photo_stream) {
    if (photo.talk_id && !talkIds.has(photo.talk_id)) throw new Error(`Unknown photo talk ID: ${photo.talk_id}`);
    if (!Object.hasOwn(images, photo.file)) throw new Error(`Photo absent from image mapping: ${photo.file}`);
  }
  for (const talk of talks) {
    for (const image of [...(talk.slides || []), ...(talk.photos || []).map(photo => photo.file)]) {
      if (!Object.hasOwn(images, image)) throw new Error(`Talk image absent from mapping: ${talk.id} / ${image}`);
    }
  }
  const rendered = renderer(sources);
  const groups = scheduleGroups(talks);
  const bylines = talks.map(talk => ({recordId: talk.id, name: talk.name, affiliation: talk.affiliation}));
  const fieldSets = [];
  const records = talks.map(talk => {
    const fields = Object.keys(talk).sort();
    let fieldSet = fieldSets.findIndex(existing => JSON.stringify(existing) === JSON.stringify(fields));
    if (fieldSet < 0) {fieldSet = fieldSets.length; fieldSets.push(fields);}
    return {id: talk.id, fieldSet, semanticSha256: semanticHash(talk), normalizedTextSha256: semanticHash(textLeaves(talk)), detail: rendered.details.get(talk.id)};
  });
  return {
    fingerprints: {
      normalization: 'CRLF line endings converted to LF; all other source characters retained.',
      sourceHtmlSha256: sha(sources.html.replace(/\r\n/g, '\n')),
      inlineStylesSha256: semanticHash([...sources.html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1].replace(/\r\n/g, '\n'))),
      appScriptSha256: sha(sources.appSource.replace(/\r\n/g, '\n')),
      otherScriptsSha256: semanticHash(sources.scripts.filter(script => script !== sources.appSource && !/^\s*window\.(SITE_DATA|IMAGES)=/.test(script)).map(script => script.replace(/\r\n/g, '\n'))),
    },
    corpus: {
      siteDataSha256: semanticHash(data), imagesSha256: semanticHash(images), normalizedSourceTextSha256: semanticHash(textLeaves(data)),
      topLevelFields: Object.keys(data).sort(), conference: data.conference,
      counts: {...rendered.stats, presentations: talks.filter(talk => talk.session_type !== 'poster').length, summary: talks.filter(talk => talk.summary).length, contextNote: talks.filter(talk => talk.context_note).length, photoStream: data.photo_stream.length, uniqueLocalImages: imagePaths.length, slideDecks: talks.filter(talk => talk.slides?.length).length, scheduleDisplayGroups: groups.length, sourceBylineRecords: bylines.length},
      countDefinitions: {presentations: 'Non-poster original talk records; keynote + formal.', scheduleDisplayGroups: 'Existing calendar display groups, not authority-controlled conference sessions.', sourceBylineRecords: 'One original name/affiliation byline per talk record, not an independently established person authority.'},
      bylines: {sha256: semanticHash(bylines), uniqueNames: new Set(bylines.map(byline => byline.name)).size, uniqueNameAffiliationPairs: new Set(bylines.map(byline => JSON.stringify([byline.name, byline.affiliation]))).size},
      fieldSets, records, scheduleDisplayGroups: groups,
      unscheduledRecordIds: talks.filter(talk => !talk.day || !talk.period || !talk.room).map(talk => talk.id),
      imagePaths, imageMappingIsIdentity: Object.entries(images).every(([key, value]) => key === value),
      photoStreamSha256: semanticHash(data.photo_stream),
      renderedViews: rendered.views, fixedSearchResults: rendered.searches,
      authoredShell: authoredShell(sources.html),
    },
  };
}

function firstDifference(expected, actual, at = 'corpus') {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return null;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return `${at}: length ${expected.length} -> ${actual.length}`;
    for (let i = 0; i < expected.length; i++) {const diff = firstDifference(expected[i], actual[i], `${at}[${i}]`); if (diff) return diff;}
  } else if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
    for (const key of keys) {const diff = firstDifference(expected[key], actual[key], `${at}.${key}`); if (diff) return diff;}
  }
  return `${at}: values differ`;
}

export function validateAgainst(expected, actual, checkSource = false) {
  const oldShell = expected.corpus.authoredShell, currentShell = actual.corpus.authoredShell;
  if (!oldShell || !currentShell) throw new Error('Authored static-shell baseline is required');
  for (const id of oldShell.domIds) {
    if (!currentShell.domIds.includes(id)) throw new Error(`Original DOM ID missing: ${id}`);
  }
  const regions = oldShell.regions.map(original => {
    const current = currentShell.regions.find(region => region.key === original.key);
    if (!current) throw new Error(`Authored shell region missing: ${original.key}`);
    return current;
  });
  // New navigation/status controls may live outside the original regions and
  // may introduce new IDs. None of the original region text or IDs may vanish.
  const projectedShell = {regions, textSha256: semanticHash(regions), domIds: oldShell.domIds};
  const diff = firstDifference(expected.corpus, {...actual.corpus, authoredShell: projectedShell});
  if (diff) throw new Error(`Preservation baseline mismatch: ${diff}`);
  if (checkSource && firstDifference(expected.provenance.fingerprints, actual.fingerprints, 'fingerprints')) throw new Error('Source bytes changed; this is not a baseline-only phase A change');
}

function main() {
  const args = process.argv.slice(2);
  const snapshot = buildBaseline();
  if (args.includes('--write')) {
    if (fs.existsSync(MANIFEST)) throw new Error('Baseline already exists. Do not regenerate it to bless a mismatch.');
    const sourceRef = args[args.indexOf('--source-ref') + 1];
    if (!args.includes('--source-ref') || !sourceRef) throw new Error('--write requires the original --source-ref <commit>');
    const commit = execFileSync('git', ['rev-parse', `${sourceRef}^{commit}`], {cwd: ROOT, encoding: 'utf8'}).trim();
    const original = execFileSync('git', ['show', `${commit}:modules/proceedings/index.html`], {cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
    if (sha(original.replace(/\r\n/g, '\n')) !== sha(fs.readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n'))) throw new Error('Source reference does not match the current proceedings page');
    const manifest = {schemaVersion: 1, provenance: {sourceCommit: commit, sourcePath: 'modules/proceedings/index.html', fingerprints: snapshot.fingerprints}, corpus: snapshot.corpus};
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('Created modules/proceedings/baseline.manifest.json');
  } else {
    const expected = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    if (expected.schemaVersion !== 1) throw new Error('Unsupported baseline schema version');
    validateAgainst(expected, snapshot, args.includes('--check-source'));
    console.log('PASS: proceedings data, original IDs/order/fields, text/media output, source bylines, calendar display groups, fixed searches, local asset paths, authored shell text, and original DOM IDs match baseline.');
  }
  console.log(JSON.stringify(snapshot.corpus.counts));
  console.log(`SITE_DATA semantic SHA256: ${snapshot.corpus.siteDataSha256}`);
  console.log(`Normalized source-text SHA256: ${snapshot.corpus.normalizedSourceTextSha256}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {main();} catch (error) {console.error(error.message); process.exitCode = 1;}
}
