// Europa's stable public fragment format. This module has no DOM dependencies.
export const ARCHIVES = Object.freeze({
  versions: { label: "版本谱系", collection: "versions", refs: "versionRefs" },
  fontes: { label: "原始史料", collection: "sources", refs: "sourceRefs" },
  performances: { label: "演出史", collection: "performances", refs: "performanceRefs" },
  recordings: { label: "录音史", collection: "recordings", refs: "recordingRefs" },
  reception: { label: "接受史", collection: "receptions", refs: "receptionRefs" }
});

export function parseRoute(hash = "") {
  const params = new URLSearchParams(String(hash).replace(/^#/, ""));
  if (params.has("work")) {
    const route = { kind: "work", work: params.get("work") };
    if (params.has("archive")) route.archive = params.get("archive");
    if (params.has("item")) route.item = params.get("item");
    return route;
  }
  if (params.has("m")) return { kind: "person", person: params.get("m") };
  return { kind: "view", view: params.get("v") || "alm" };
}

export function serializeRoute(route) {
  const params = new URLSearchParams();
  if (route.kind === "work") {
    params.set("work", route.work);
    if (route.archive) params.set("archive", route.archive);
    if (route.archive && route.item) params.set("item", route.item);
  } else if (route.kind === "person") params.set("m", route.person);
  else params.set("v", route.view || "alm");
  return `#${params}`;
}

export function archiveItems(work, archive, data) {
  const definition = Object.hasOwn(ARCHIVES, archive) && ARCHIVES[archive];
  if (!definition) return [];
  const rows = data[definition.collection] || [];
  // Preserve the existing version renderer's WORK relation, not invented IDs.
  if (archive === "versions") return rows.filter(row => row.workId === work.id);
  const refs = new Set(work[definition.refs] || []);
  return rows.filter(row => refs.has(row.id));
}

function personRecord(persons, id) {
  if (typeof id !== "string" || !Object.hasOwn(persons, id)) return null;
  const person = persons[id];
  return person && typeof person === "object" && !Array.isArray(person)
    && person.i === id && typeof person.n === "string" && person.n.trim()
    && typeof person.e === "string" && person.e.trim() ? person : null;
}

export function resolveRoute(input, { persons, views, data, researchReady = true }) {
  const route = { ...input };
  if (route.kind === "view") {
    if (views.includes(route.view)) return { route };
    return { route: { kind: "view", view: "alm" }, notice: "该视图不存在，已返回年鉴。", normalized: true };
  }
  if (route.kind === "person") {
    const person = personRecord(persons, route.person);
    return person ? { route, person }
      : { route, error: "人物档案不存在", detail: "请检查地址，或返回年鉴选择人物。" };
  }
  if (!researchReady) return { route, error: "研究档案暂时无法加载", detail: "请重试，或返回年鉴继续浏览人物。", retry: true };
  const work = (data.works || []).find(row => row.id === route.work);
  const person = work && personRecord(persons, work.personId);
  if (!work || !person) return { route, error: "档案不存在", detail: "未找到此作品档案。请检查地址，或返回年鉴选择人物与作品。" };
  const result = { route, work, person };
  if (Object.hasOwn(route, "archive") && !Object.hasOwn(ARCHIVES, route.archive)) {
    delete route.archive;
    delete route.item;
    return { ...result, notice: "该档案类别不存在，已返回作品。", normalized: true };
  }
  if (Object.hasOwn(route, "item")) {
    const item = route.archive && archiveItems(work, route.archive, data).find(row => row.id === route.item);
    if (item) result.item = item;
    else {
      delete route.item;
      result.notice = route.archive ? "此档案中没有该条目，现显示完整档案。" : "条目地址需指定档案类别，现显示作品。";
      result.normalized = true;
    }
  }
  return result;
}

// The renderer must succeed before a URL is committed. A later navigation wins
// if an earlier one is still waiting for research JSON (including Back/Forward).
export function createRouteController({ ready, resolve, render, write }) {
  let sequence = 0;
  let current = { kind: "view", view: "alm" };
  let requested = { ...current };
  return {
    get current() { return { ...current }; },
    get requested() { return { ...requested }; },
    async navigate(route, options = {}) {
      const ticket = ++sequence;
      requested = { ...route };
      // Persons and top-level views already have their data. An optional,
      // stalled research request must never disable their legacy navigation.
      if (route.kind === "work") await ready(route);
      if (ticket !== sequence) return false;
      const result = resolve(route);
      if (await render(result, options) === false || ticket !== sequence) return false;
      current = { ...result.route };
      write(current, result.normalized ? "replace" : options.mode || "push");
      return true;
    }
  };
}
