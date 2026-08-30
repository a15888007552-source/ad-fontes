/** Browser-free checks for the external-data bootstrap; no protected material. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const loader = require('../modules/proceedings/data-loader.js');
const moduleRoot = new URL('../modules/proceedings/', import.meta.url);
const source = fs.readFileSync(new URL('bootstrap.js', moduleRoot), 'utf8');
const bundle = Object.fromEntries(loader.FILES.map(name => [name, JSON.parse(fs.readFileSync(new URL('data/' + name + '.json', moduleRoot), 'utf8'))]));
const loaded = loader.assemble(bundle);

function harness(load, failInit = false, missingDependency = '') {
  const events = [], goCalls = [], lookups = [];
  let initCalls = 0, reloads = 0;
  function node(inert = false) {
    const listeners = new Map(), attributes = new Map(inert ? [['inert', '']] : []);
    return {
      attributes, hidden: false, focused: false, clicks: 0, textContent: '',
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: name => attributes.delete(name),
      addEventListener: (name, callback) => listeners.set(name, callback),
      focus() { this.focused = true; },
      click() { this.clicks++; listeners.get('click')?.(); },
    };
  }
  const notice = node(), status = node(), retry = node(), skip = node(), main = node();
  const navigation = [node(true), node(true)];
  const nodes = {'proceedings-data-notice': notice, 'proceedings-data-status': status, 'proceedings-data-retry': retry, 'proceedings-opening-skip': skip};
  const app = {
    _rendered: {},
    go(view) { goCalls.push(view); this._rendered[view] = true; return view; },
    init() {initCalls++; if (failInit) throw new Error('Initialization failed'); this.go('overview');},
  };
  const originalGo = app.go;
  const document = {
    documentElement: {dataset: {}},
    getElementById(id) {lookups.push(id); assert.ok(!id.startsWith('proceedings-legacy-'), 'bootstrap must not read inert data'); return nodes[id];},
    querySelector(selector) {assert.equal(selector, 'main'); return main;},
    querySelectorAll(selector) {assert.equal(selector, 'header.topbar,nav.tabs'); return navigation;},
  };
  const window = {
    ProceedingsApp: app, ProceedingsData: {load},
    location: {href: 'https://example.invalid/modules/proceedings/index.html', reload() {reloads++;}},
    dispatchEvent(event) {events.push(event.type);},
  };
  if (missingDependency === 'app') delete window.ProceedingsApp;
  if (missingDependency === 'loader') delete window.ProceedingsData;
  vm.runInNewContext(source, {window, document, URL, CustomEvent: class {constructor(type) {this.type = type;}}}, {filename: 'bootstrap.js'});
  return {window, document, app, originalGo, notice, status, retry, skip, main, navigation, events, goCalls, lookups, counts: () => ({initCalls, reloads})};
}

function checkPending(test) {
  assert.equal(test.document.documentElement.dataset.proceedingsState, 'loading');
  assert.equal(test.main.attributes.get('aria-busy'), 'true');
  assert.ok(test.navigation.every(element => element.attributes.has('inert')));
  assert.equal(test.app.go('schedule'), false);
  assert.deepEqual(test.goCalls, []);
  assert.equal(test.retry.hidden, true);
}
function checkReady(test) {
  assert.equal(test.document.documentElement.dataset.proceedingsState, 'ready');
  assert.equal(test.main.attributes.get('aria-busy'), 'false');
  assert.equal(test.window.SITE_DATA, loaded.data);
  assert.equal(test.window.IMAGES, loaded.images);
  assert.equal(test.window.ProceedingsReferences.sessions, loaded.sessions);
  assert.equal(test.window.ProceedingsReferences.speakers, loaded.speakers);
  assert.equal(test.app.ready, true);
  assert.equal(test.app.go, test.originalGo);
  assert.equal(test.notice.hidden, true);
  assert.ok(test.navigation.every(element => !element.attributes.has('inert')));
  assert.deepEqual(test.events, ['proceedings:ready']);
  assert.deepEqual(test.goCalls, ['overview']);
  assert.deepEqual(Object.keys(test.app._rendered), ['overview']);
  assert.equal(test.counts().initCalls, 1);
}

let resolvePending, fetchCalls = 0;
const pendingData = new Promise(resolve => {resolvePending = resolve;});
const pending = harness(base => {fetchCalls++; assert.equal(String(base), 'https://example.invalid/modules/proceedings/data/'); return pendingData;});
checkPending(pending);
const firstAttempt = pending.window.ProceedingsReady;
pending.retry.click(); pending.retry.click();
assert.equal(pending.window.ProceedingsReady, firstAttempt);
await Promise.resolve();
assert.equal(fetchCalls, 1);
resolvePending(loaded);
assert.equal(await firstAttempt, true);
checkReady(pending);
pending.retry.click();
assert.equal(await pending.window.ProceedingsReady, true);
assert.equal(fetchCalls, 1);
assert.equal(pending.counts().initCalls, 1);
assert.equal(pending.app.go('schedule'), 'schedule');

let malformed = true, requests = 0;
const recoverable = harness(base => loader.load(base, async url => {
  requests++;
  const name = String(url).split('/').at(-1).replace('.json', '');
  return {ok: true, json: async () => malformed && name === 'conference' ? JSON.parse('{') : bundle[name]};
}));
assert.equal(await recoverable.window.ProceedingsReady, false);
assert.equal(recoverable.document.documentElement.dataset.proceedingsState, 'error');
assert.equal(recoverable.main.attributes.get('aria-busy'), 'false');
assert.equal(recoverable.window.SITE_DATA, undefined);
assert.equal(recoverable.counts().initCalls, 0);
assert.equal(recoverable.app.go('all'), false);
assert.ok(recoverable.navigation.every(element => element.attributes.has('inert')));
assert.equal(recoverable.retry.hidden, false);
assert.equal(recoverable.retry.focused, true);
assert.equal(recoverable.skip.clicks, 1);
malformed = false;
recoverable.retry.click();
assert.equal(await recoverable.window.ProceedingsReady, true);
assert.equal(requests, 12);
assert.equal(recoverable.counts().initCalls, 1);
assert.equal(recoverable.window.SITE_DATA.talks.length, 219);
assert.equal(recoverable.document.documentElement.dataset.proceedingsState, 'ready');

let synchronousFailure = true;
const synchronous = harness(() => {if (synchronousFailure) throw new Error('Synchronous loader failure'); return loaded;});
assert.equal(await synchronous.window.ProceedingsReady, false);
synchronousFailure = false;
synchronous.retry.click();
assert.equal(await synchronous.window.ProceedingsReady, true);
checkReady(synchronous);

let initFetches = 0;
const brokenInit = harness(async () => {initFetches++; return loaded;}, true);
assert.equal(await brokenInit.window.ProceedingsReady, false);
assert.equal(brokenInit.document.documentElement.dataset.proceedingsState, 'error');
assert.equal(brokenInit.retry.textContent, '重新载入页面');
assert.equal(brokenInit.app.go('all'), false);
assert.deepEqual(brokenInit.events, []);
assert.ok(brokenInit.navigation.every(element => element.attributes.has('inert')));
brokenInit.retry.click();
assert.equal(await brokenInit.window.ProceedingsReady, false);
assert.deepEqual(brokenInit.counts(), {initCalls: 1, reloads: 1});
assert.equal(initFetches, 1);

for (const dependency of ['app', 'loader']) {
  let unexpectedLoad = false;
  const missing = harness(() => {unexpectedLoad = true; return loaded;}, false, dependency);
  assert.equal(await missing.window.ProceedingsReady, false);
  assert.equal(missing.document.documentElement.dataset.proceedingsState, 'error');
  assert.equal(missing.main.attributes.get('aria-busy'), 'false');
  assert.equal(missing.retry.textContent, '重新载入页面');
  assert.equal(missing.retry.hidden, false);
  assert.equal(missing.retry.focused, true);
  assert.equal(missing.skip.clicks, 1);
  assert.ok(missing.navigation.every(element => element.attributes.has('inert')));
  assert.equal(unexpectedLoad, false);
  assert.deepEqual(missing.events, []);
  missing.retry.click();
  assert.deepEqual(missing.counts(), {initCalls: 0, reloads: 1});
}

console.log('PASS proceedings bootstrap: pending guard, in-flight deduplication, external data, once-only init, malformed-JSON/synchronous retry, init-failure/missing-dependency reload; no browser launched');
