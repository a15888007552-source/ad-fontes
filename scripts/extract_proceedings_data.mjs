#!/usr/bin/env node
/** Phase B mechanical extraction and phase E preservation check.
 * node scripts/extract_proceedings_data.mjs --write  (first generation only)
 * node scripts/extract_proceedings_data.mjs --check  (immutable ordered pins + deterministic comparison)
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ProceedingsData from '../modules/proceedings/data-loader.js';
import {buildBaseline, readOriginalData, validateAgainst} from './validate_proceedings_baseline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE = path.join(ROOT, 'modules/proceedings');
const DEST = path.join(MODULE, 'data');
const manifest = JSON.parse(fs.readFileSync(path.join(MODULE, 'baseline.manifest.json'), 'utf8'));
// Pinned before E from the original inert corpus, after exact equality with the
// six extracted files and the unchanged A baseline (source 7268426). Unlike the
// semantic baseline these retain object-property order. Do not regenerate them
// from current data: after E that would turn this check into self-comparison.
const ORIGINAL_ORDERED_JSON_SHA256 = Object.freeze({
  data: '5356cd94288af1866300ce3b912947600de5ed7c5c066d5f80bb8e8e9f319363',
  images: '1add182f8e95e0c4d19ff04b84613114ff6cf772d03d00f0ad7fa1eb5ab25bb3',
});
const orderedHash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const write = process.argv.includes('--write');
validateAgainst(manifest, buildBaseline(), write);
const {data, images, sourceKind} = readOriginalData();
if (write && sourceKind === 'external') throw new Error('Initial extraction requires the original embedded source; refusing to regenerate from extracted files');
assert.equal(orderedHash(data), ORIGINAL_ORDERED_JSON_SHA256.data, 'Original ordered SITE_DATA changed');
assert.equal(orderedHash(images), ORIGINAL_ORDERED_JSON_SHA256.images, 'Original ordered IMAGES changed');
const references = ProceedingsData.createReferenceIndices(data.talks);
const files = {
  conference: {schemaVersion: 1, fieldOrder: Object.keys(data), metadata: Object.fromEntries(Object.entries(data).filter(([key]) => !['talks', 'photo_stream'].includes(key))), recordOrder: data.talks.map(talk => talk.id)},
  presentations: data.talks.filter(talk => talk.session_type !== 'poster'),
  posters: data.talks.filter(talk => talk.session_type === 'poster'),
  sessions: references.sessions,
  speakers: references.speakers,
  media: {photo_stream: data.photo_stream, images},
};
const reconstructed = ProceedingsData.assemble(files);
assert.deepEqual(reconstructed.data, data, 'Reconstruction changed original data');
assert.deepEqual(reconstructed.images, images, 'Reconstruction changed image mapping');
assert.equal(JSON.stringify(reconstructed.data), JSON.stringify(data), 'Original data property/record order changed');
const outputs = Object.fromEntries(Object.entries(files).map(([name, value]) => [name + '.json', JSON.stringify(value, null, 2) + '\n']));
if (write) {
  for (const name of Object.keys(outputs)) if (fs.existsSync(path.join(DEST, name))) throw new Error('Refusing to overwrite extracted data: ' + name);
  fs.mkdirSync(DEST, {recursive: true});
  for (const [name, text] of Object.entries(outputs)) fs.writeFileSync(path.join(DEST, name), text, 'utf8');
} else {
  for (const [name, text] of Object.entries(outputs)) assert.equal(fs.readFileSync(path.join(DEST, name), 'utf8').replace(/\r\n/g, '\n'), text, 'Extracted JSON is not an exact deterministic extraction: ' + name);
}
console.log((write ? 'Created' : 'PASS: checked') + ' six JSON files; exact reconstruction preserves all 219 records, all fields, their order, and IMAGES.');
console.log('140 presentations; 79 posters; 36 calendar display groups; 219 source byline references; 401 photos; 589 image paths.');
