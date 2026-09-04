import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, '..');
const context = { window: {} };
vm.createContext(context);

for (const file of [
  path.join(moduleRoot, 'data', 'bronze-use-atlas-types.js'),
  path.join(moduleRoot, 'data', 'bronze-use-atlas-visuals.js')
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const atlas = context.window.BAOJI_BRONZE_ATLAS;
const visuals = context.window.BAOJI_BRONZE_ATLAS_VISUALS;
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const typeById = new Map(atlas.types.map((type) => [type.id, type]));
const recordsByType = new Map();

for (const record of visuals.records) {
  if (!recordsByType.has(record.typeId)) recordsByType.set(record.typeId, []);
  recordsByType.get(record.typeId).push(record);
  assert(typeById.has(record.typeId), `scene object has no inventory type: ${record.typeId}`);
  assert(record.categoryId === typeById.get(record.typeId)?.categoryId, `category mismatch: ${record.typeId}`);
  assert(fs.existsSync(path.join(here, record.asset.replace(/^assets[\\/]/, 'assets/'))), `missing asset: ${record.asset}`);
  assert(record.cardHeroAsset && fs.existsSync(path.join(here, record.cardHeroAsset.replace(/^assets[\\/]/, 'assets/'))), `missing card hero asset: ${record.typeId}`);
  assert(!/\.(?:jpe?g|webp)$/i.test(record.cardHeroAsset || ''), `card hero must use non-photo visual: ${record.typeId}`);
  assert(record.verified === true, `unverified visual: ${record.typeId}`);
}

for (const type of atlas.types.filter((item) => item.displayInAtlas)) {
  assert(recordsByType.get(type.id)?.length === 1, `type must appear exactly once: ${type.id}`);
}

const assetOwners = new Map();
for (const record of visuals.records) {
  if (!assetOwners.has(record.asset)) assetOwners.set(record.asset, []);
  assetOwners.get(record.asset).push(record.typeId);
}
for (const [asset, owners] of assetOwners) assert(owners.length === 1, `duplicate asset ${asset}: ${owners.join(', ')}`);

for (const category of atlas.categories) {
  const expected = atlas.types.filter((type) => type.displayInAtlas && type.categoryId === category.id).map((type) => type.id).sort();
  const actual = [...(visuals.scenes[category.id]?.objectTypeIds || [])].sort();
  assert(JSON.stringify(expected) === JSON.stringify(actual), `scene inventory mismatch: ${category.id}`);
  const expectsEmbeddedObjects = true;
  assert(visuals.scenes[category.id]?.backgroundContainsObjects === expectsEmbeddedObjects, `scene background mode mismatch: ${category.id}`);
}

const mandatoryMusic = ['zhong', 'bianzhong', 'bo', 'bianbo', 'nao', 'zheng', 'duo', 'ling', 'chenyu', 'judiao', 'tonggu', 'qing', 'bianqing'];
for (const id of mandatoryMusic) assert(recordsByType.get(id)?.length === 1, `missing mandatory music type: ${id}`);
assert(typeById.get('qing')?.materialClass !== 'bronze', 'qing must not be counted as bronze');
assert(typeById.get('bianqing')?.materialClass !== 'bronze', 'bianqing must not be counted as bronze');
assert(atlas.types.filter((type) => type.categoryId === 'weapons').length === 8, 'weapon type count must be 8');

const dun = visuals.records.find((record) => record.typeId === 'dun');
assert(dun?.shapeClass === 'globular-covered-food-vessel', 'dun must be globular and covered');
assert(!/rectangular|square|box/.test(`${dun?.shapeClass} ${dun?.canonicalForm}`), 'dun must not be rectangular');

const atlasJs = fs.readFileSync(path.join(here, 'atlas.js'), 'utf8');
const atlasCss = fs.readFileSync(path.join(here, 'atlas.css'), 'utf8');
assert(!atlasJs.includes('atlas-hotspot'), 'legacy atlas-hotspot remains in atlas.js');
assert(!atlasCss.includes('.atlas-hotspot'), 'legacy atlas-hotspot remains in atlas.css');
assert(!atlasJs.includes('class="atlas-plate"'), 'legacy category plate remains interactive');

const result = {
  pass: failures.length === 0,
  categories: atlas.categories.length,
  displayTypes: visuals.records.length,
  bronzeTypes: visuals.records.filter((record) => record.materialClass === 'bronze').length,
  adjacentMaterialTypes: visuals.records.filter((record) => record.materialClass !== 'bronze').length,
  uniqueAssets: assetOwners.size,
  weaponTypes: atlas.types.filter((type) => type.categoryId === 'weapons').length,
  failures
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
