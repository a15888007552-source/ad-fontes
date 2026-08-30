/** Pure syntax tests: no browser, application, or corpus dependencies. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {VIEW_IDS, parseHash, serializeRoute} = require('../modules/proceedings/routes.js');

test('the empty fragment opens overview; serialization remains explicit', () => {
  for (const hash of ['', '#']) assert.deepEqual(parseHash(hash), {kind: 'view', id: 'overview'});
  assert.deepEqual(parseHash(), {kind: 'view', id: 'overview'});
  assert.equal(serializeRoute(parseHash('')), '#view=overview');
});

test('every original view and each entity route round-trips', () => {
  assert.deepEqual(VIEW_IDS, ['overview', 'keynote', 'all', 'schedule', 'photos', 'themes']);
  const routes = [
    ...VIEW_IDS.map(id => ({kind: 'view', id})),
    {kind: 'presentation', id: 't000'}, {kind: 'presentation', id: 't219'},
    {kind: 'poster', id: 't140'}, {kind: 'session', id: 'session-t000'},
    {kind: 'speaker', id: 'speaker-t000'},
  ];
  for (const route of routes) {
    const hash = '#' + route.kind + '=' + encodeURIComponent(route.id);
    assert.equal(serializeRoute(route), hash);
    assert.deepEqual(parseHash(hash), route);
  }
});

test('URI decoding is strict and valid encoded IDs canonicalize', () => {
  for (const [hash, expected] of [
    ['#view=%61ll', '#view=all'],
    ['#presentation=%74000', '#presentation=t000'],
    ['#session=session%2Dt000', '#session=session-t000'],
  ]) assert.equal(serializeRoute(parseHash(hash)), expected);
  for (const hash of [
    '#view=%', '#view=%2', '#view=%GG', '#view=%C0%AF',
    '#presentation=t000%', '#presentation=%ED%A0%80', '#speaker=%E0%A4%A',
  ]) assert.deepEqual(parseHash(hash), {kind: 'invalid', hash});
});

test('single-key grammar rejects unknown, duplicate, legacy, and trailing fields', () => {
  for (const hash of [
    'view=all', '#all', '#?view=all', '##view=all', '#view', '#view=',
    '#view=all&view=all', '#view=all&poster=t140', '#view=all&',
    '#view=all&&', '#view=all;poster=t140', '#view=all=all',
    '#unknown=t000', '#m=t000', '#v=all', '#%76iew=all', '#VIEW=all',
    '#view=all#poster=t140', '#view=all%26poster%3Dt140',
  ]) assert.deepEqual(parseHash(hash), {kind: 'invalid', hash});
});

test('view names cannot resolve through Object prototype properties', () => {
  for (const id of ['constructor', '__proto__', 'prototype', 'toString', 'hasOwnProperty']) {
    const hash = '#view=' + id;
    assert.deepEqual(parseHash(hash), {kind: 'invalid', hash});
    assert.throws(() => serializeRoute({kind: 'view', id}), TypeError);
  }
});

test('only source-derived identifier shapes are accepted, not corpus membership', () => {
  // t194 need not exist; a syntactically valid ID in the wrong partition also
  // remains unchanged. The DOM controller owns both membership decisions.
  for (const hash of ['#presentation=t194', '#presentation=t140', '#poster=t000', '#speaker=speaker-t999']) {
    assert.notEqual(parseHash(hash).kind, 'invalid');
    assert.equal(serializeRoute(parseHash(hash)), hash);
  }
  for (const hash of [
    '#presentation=t00', '#presentation=t0000', '#presentation=T000', '#presentation=000',
    '#poster=poster-t140', '#session=t000', '#speaker=session-t000', '#speaker=speaker-t00',
    '#presentation=t000+', '#presentation=t000%20', '#presentation=t000%0A',
    '#presentation=../t000', '#presentation=t000%2F', '#view=all%00',
  ]) assert.deepEqual(parseHash(hash), {kind: 'invalid', hash});
});

test('invalid non-string inputs remain identifiable; serializer rejects bad routes', () => {
  for (const hash of [null, 0, false, {}, []]) assert.deepEqual(parseHash(hash), {kind: 'invalid', hash});
  for (const route of [
    null, undefined, [], {}, 'all', {kind: 'view'}, {id: 'all'},
    {kind: 'unknown', id: 't000'}, {kind: 'constructor', id: 't000'},
    {kind: 'view', id: null}, {kind: 'view', id: ''}, {kind: 'view', id: 'unknown'},
    {kind: 'presentation', id: 0}, {kind: 'session', id: 't000'},
    Object.create({kind: 'view', id: 'all'}),
  ]) assert.throws(() => serializeRoute(route), TypeError);
});

test('the same frozen API is available as a browser global without DOM or data', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../modules/proceedings/routes.js', import.meta.url), 'utf8'), context);
  const api = context.ProceedingsRoutes;
  assert.ok(Object.isFrozen(api));
  assert.ok(Object.isFrozen(api.VIEW_IDS));
  assert.equal(api.serializeRoute(api.parseHash('#speaker=speaker-t000')), '#speaker=speaker-t000');
  assert.equal(JSON.stringify(api.parseHash('#view=constructor')), JSON.stringify({kind: 'invalid', hash: '#view=constructor'}));
  assert.deepEqual(Object.keys(api).sort(), ['VIEW_IDS', 'parseHash', 'serializeRoute']);
});
