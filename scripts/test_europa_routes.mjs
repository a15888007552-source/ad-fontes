import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { ARCHIVES, archiveItems, parseRoute, serializeRoute, resolveRoute, createRouteController } from "../modules/europa/js/routes.mjs";

const root = new URL("../modules/europa/", import.meta.url);
const read = relative => JSON.parse(fs.readFileSync(new URL(relative, root), "utf8"));
const data = Object.fromEntries(["works", "versions", "sources", "performances", "recordings", "receptions"].map(name => [name, read(`data/research/${name}.json`)]));
const persons = Object.fromEntries(data.works.map(work => [work.personId, { i: work.personId, n: work.personId, e: "modern" }]));
const views = read("data/views.json").VIEWS;
const resolve = route => resolveRoute(route, { data, persons, views });
const work = data.works.find(row => row.id === "work:buso-doktor-faust");

test("legacy person and view fragments retain their public meaning", () => {
  assert.deepEqual(parseRoute("#m=buso"), { kind: "person", person: "buso" });
  for (const view of views) assert.equal(resolve(parseRoute(`#v=${view}`)).route.view, view);
  assert.equal(serializeRoute(parseRoute("#m=buso")), "#m=buso");
  assert.equal(serializeRoute(parseRoute("#v=musio")), "#v=musio");
  assert.deepEqual(parseRoute(""), { kind: "view", view: "alm" });
});

test("URLSearchParams preserves encoded IDs without throwing on malformed input", () => {
  const route = { kind: "work", work: "work:é &+/#", archive: "fontes", item: "source:字 & +" };
  assert.deepEqual(parseRoute(serializeRoute(route)), route);
  assert.doesNotThrow(() => resolve(parseRoute("#work=%E0%A4%A")));
  assert.deepEqual(parseRoute("#v=musio&m=buso&work=work%3Abuso-doktor-faust"), { kind: "work", work: work.id });
});

test("all seven existing works and five child archives resolve without new IDs", () => {
  for (const entry of data.works) {
    assert.equal(resolve({ kind: "work", work: entry.id }).work, entry);
    for (const archive of Object.keys(ARCHIVES)) {
      const route = { kind: "work", work: entry.id, archive };
      assert.deepEqual(resolve(parseRoute(serializeRoute(route))).route, route);
      for (const item of archiveItems(entry, archive, data)) {
        const linked = resolve({ ...route, item: item.id });
        assert.equal(linked.item, item);
        assert.deepEqual(parseRoute(serializeRoute(linked.route)), linked.route);
      }
    }
  }
});

test("empty archives remain addressable and are distinguishable from missing works", () => {
  const route = { kind: "work", work: data.works[0].id, archive: "versions" };
  const result = resolve(route);
  assert.equal(result.error, undefined);
  assert.deepEqual(archiveItems(result.work, route.archive, data), []);
  assert.equal(resolve({ kind: "work", work: "missing" }).error, "档案不存在");
  assert.equal(resolve({ kind: "person", person: "missing" }).error, "人物档案不存在");
});

test("unknown archives and missing/cross-archive items recover to their actual parent", () => {
  for (const archive of ["wrong", "__proto__", "constructor", ""]) {
    const result = resolve({ kind: "work", work: work.id, archive, item: "bad" });
    assert.deepEqual(result.route, { kind: "work", work: work.id });
    assert.equal(result.normalized, true);
    assert.ok(result.notice);
  }
  for (const item of ["bad", "", data.recordings[0].id]) {
    const result = resolve({ kind: "work", work: work.id, archive: "versions", item });
    assert.deepEqual(result.route, { kind: "work", work: work.id, archive: "versions" });
    assert.ok(result.notice);
  }
  assert.equal(resolve({ kind: "work", work: work.id, item: "bad" }).route.item, undefined);
  assert.equal(resolve({ kind: "view", view: 'bad"]' }).route.view, "alm");
});

test("failed research loading is recoverable without disabling legacy views or people", () => {
  const unavailable = route => resolveRoute(route, { data: {}, persons, views, researchReady: false });
  assert.equal(unavailable({ kind: "work", work: work.id }).retry, true);
  assert.ok(unavailable({ kind: "person", person: work.personId }).person);
  assert.equal(unavailable({ kind: "view", view: "musio" }).error, undefined);
});

test("prototype keys and malformed own records cannot masquerade as people or work owners", () => {
  for (const id of ["constructor", "__proto__", "toString", "valueOf"]) {
    assert.equal(resolve({ kind: "person", person: id }).error, "人物档案不存在");
    const result = resolveRoute({ kind: "work", work: "bad-owner" }, { persons, views, data: { works: [{ id: "bad-owner", personId: id }] } });
    assert.equal(result.error, "档案不存在");
  }
  for (const invalid of [null, [], {}, () => {}, { i: "bad" }, { i: "wrong", n: "Name", e: "modern" }]) {
    assert.equal(resolveRoute({ kind: "person", person: "bad" }, { persons: { bad: invalid }, views, data }).error, "人物档案不存在");
  }
});

test("actual locate handler preserves selection and waits for view rendering before map/timeline/network focus", async () => {
  const source = fs.readFileSync(new URL("js/index.js", root), "utf8");
  const implementation = source.match(/async function locateMusician\(id,target\)\{[\s\S]*?(?=\nfunction renderPerson\()/)[0];
  assert.match(source, /if\(!options\.preserveSelection\)clearSelection\(\)/);
  for (const target of ["map", "tl", "net"]) {
    const events = [];
    let release;
    const rendered = new Promise(resolve => { release = resolve; });
    const sandbox = {
      byId: { buso: { i: "buso", n: "Busoni", c: ["Rome"] } },
      CITY: { Rome: [1, 2] }, L: [], selectedId: null,
      routeController: { requested: { kind: "view", view: target } },
      setView: (view, options) => { assert.equal(view, target); assert.equal(options.preserveSelection, true); events.push("requested"); return rendered; },
      fitRoute: () => {}, renderChips: () => {}, renderMap: () => events.push("map"),
      syncMapUI: () => {}, cityPanel: () => {}, syncSelection: () => {},
      requestAnimationFrame: callback => callback(), focusTimeline: () => events.push("tl"),
      netLegend: () => {}, $: () => ({ click() {} }), init2D: async () => {},
      net2d: { focus: () => events.push("net") }, announceSelection: () => {}
    };
    const locate = vm.runInNewContext(`${implementation}; locateMusician`, sandbox);
    const operation = locate("buso", target);
    assert.equal(sandbox.selectedId, "buso");
    assert.deepEqual(events, ["requested"]);
    release(true);
    await operation;
    assert.deepEqual(events, ["requested", target]);
    assert.equal(sandbox.selectedId, "buso");
  }
});

test("initialization/refresh replaces; user navigation pushes; back and forward restore six states", async () => {
  const history = [];
  const rendered = [];
  const controller = createRouteController({ ready: async () => {}, resolve, render: result => { rendered.push(result.route); return true; }, write: (route, mode) => history.push({ hash: serializeRoute(route), mode }) });
  const sequence = [
    { kind: "person", person: work.personId },
    { kind: "work", work: work.id },
    { kind: "work", work: work.id, archive: "versions" },
    { kind: "work", work: work.id },
    { kind: "person", person: work.personId }
  ];
  await controller.navigate(sequence[0], { mode: "replace" });
  for (const route of sequence.slice(1)) await controller.navigate(route);
  assert.deepEqual(history.map(entry => entry.mode), ["replace", "push", "push", "push", "push"]);
  for (const route of sequence.slice(0, -1).reverse()) {
    await controller.navigate(parseRoute(serializeRoute(route)), { mode: "replace" });
    assert.deepEqual(controller.current, route);
  }
  for (const route of sequence.slice(1)) await controller.navigate(route, { mode: "replace" });
  for (const archive of Object.keys(ARCHIVES)) await controller.navigate({ kind: "work", work: work.id, archive }, { mode: "replace" });
  assert.equal(rendered.length, history.length);
  assert.ok(history.slice(5).every(entry => entry.mode === "replace"));
});

test("pending JSON prevents premature writes and stale navigation cannot replace a later request", async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const writes = [];
  const controller = createRouteController({ ready: () => pending, resolve, render: () => true, write: route => writes.push(route) });
  const first = controller.navigate({ kind: "work", work: work.id });
  const latest = controller.navigate({ kind: "work", work: work.id, archive: "reception" }, { mode: "replace" });
  assert.equal(writes.length, 0);
  release();
  assert.equal(await first, false);
  assert.equal(await latest, true);
  assert.deepEqual(writes, [{ kind: "work", work: work.id, archive: "reception" }]);
});

test("stalled research does not block actual controller person/view navigation or revive an older work", async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const writes = [];
  let researchWaits = 0;
  const controller = createRouteController({
    ready: () => { researchWaits++; return pending; },
    resolve,
    render: () => true,
    write: route => writes.push(route)
  });
  const waitingWork = controller.navigate({ kind: "work", work: work.id });
  const person = { kind: "person", person: work.personId };
  const view = { kind: "view", view: "musio" };
  const promptly = promise => Promise.race([
    promise,
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error("legacy route blocked on research")), 100); timer.unref(); })
  ]);
  assert.equal(await promptly(controller.navigate(person)), true);
  assert.deepEqual(controller.current, person);
  assert.equal(await promptly(controller.navigate(view)), true);
  assert.deepEqual(controller.current, view);
  assert.equal(researchWaits, 1, "only the work route may request research readiness");
  assert.deepEqual(writes, [person, view]);
  release();
  assert.equal(await waitingWork, false);
  assert.deepEqual(controller.current, view);
  assert.deepEqual(writes, [person, view]);
});

test("requested route exposes pending work so late person enrichment cannot clobber it", async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const controller = createRouteController({ ready: () => pending, resolve, render: () => true, write: () => {} });
  const person = { kind: "person", person: work.personId };
  await controller.navigate(person);
  const next = { kind: "work", work: work.id, archive: "versions" };
  const navigating = controller.navigate(next);
  assert.deepEqual(controller.current, person);
  assert.deepEqual(controller.requested, next);
  release();
  assert.equal(await navigating, true);
  assert.deepEqual(controller.current, next);
});

test("unsuccessful renderer never commits URL and invalid archive normalization only replaces", async () => {
  const writes = [];
  const blocked = createRouteController({ ready: async () => {}, resolve, render: () => false, write: (...args) => writes.push(args) });
  assert.equal(await blocked.navigate({ kind: "work", work: work.id }), false);
  assert.equal(writes.length, 0);
  const recover = createRouteController({ ready: async () => {}, resolve, render: () => true, write: (...args) => writes.push(args) });
  await recover.navigate({ kind: "work", work: work.id, archive: "wrong" });
  assert.deepEqual(writes, [[{ kind: "work", work: work.id }, "replace"]]);
});

test("entry IDs are exposed by all existing renderers and all fragment writes use one controller", () => {
  const source = fs.readFileSync(new URL("js/index.js", root), "utf8");
  assert.equal((source.match(/data-archive-item="/g) || []).length, 5);
  assert.equal((source.match(/history\.pushState\(/g) || []).length, 1);
  assert.equal((source.match(/history\.replaceState\(/g) || []).length, 1);
  assert.doesNotMatch(source, /function setHash|location\.hash\s*=/);
  assert.match(source, /addEventListener\("popstate",readHash\)/);
  assert.match(source, /addEventListener\("hashchange",readHash\)/);
});
