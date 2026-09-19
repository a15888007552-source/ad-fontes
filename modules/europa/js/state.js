const VIEW_MAP = {
  alm: "annals",
  annals: "annals",
  tl: "timeline",
  timeline: "timeline",
  map: "map",
  net: "constellation",
  constellation: "constellation",
  lin: "genealogy",
  genealogy: "genealogy",
  hist: "history",
  history: "history",
  musio: "musicology",
  musicology: "musicology",
  gl: "terms",
  terms: "terms",
  bib: "bibliography",
  bibliography: "bibliography",
  real: "places",
  places: "places",
  roam: "wander",
  wander: "wander",
};

function normalizeView(value) {
  if (!value || typeof value !== "string") return value;
  return VIEW_MAP[value] || value;
}

const state = {
  currentView: null,
  selectedPersonId: null,
  selectedRelationId: null,
  selectedPlaceId: null,
  selectedEventId: null,
  hoveredPersonId: null,
  hoveredRelationId: null,
  comparePersonIds: [],
  searchQuery: "",
  filters: {},
};

const arrayKeys = new Set(["comparePersonIds"]);
const objectKeys = new Set(["filters"]);
const listeners = new Set();

function copyValue(key, value) {
  if (key === "currentView") return normalizeView(value);
  if (arrayKeys.has(key)) return Array.isArray(value) ? [...value] : [];
  if (objectKeys.has(key)) return value && typeof value === "object" ? { ...value } : {};
  return value;
}

function sameValue(key, previous, next) {
  if (arrayKeys.has(key)) {
    return Array.isArray(previous) && Array.isArray(next)
      && previous.length === next.length
      && previous.every((value, index) => Object.is(value, next[index]));
  }
  if (objectKeys.has(key)) {
    const previousKeys = Object.keys(previous || {});
    const nextKeys = Object.keys(next || {});
    return previousKeys.length === nextKeys.length
      && previousKeys.every((name) => Object.is(previous[name], next[name]));
  }
  return Object.is(previous, next);
}

function getState() {
  return {
    ...state,
    comparePersonIds: [...state.comparePersonIds],
    filters: { ...state.filters },
  };
}

function notify(nextState, previousState, meta) {
  listeners.forEach((listener) => {
    try {
      listener(nextState, previousState, meta);
    } catch (error) {
      console.error("[EuropaState] subscriber error:", error);
    }
  });
}

function setState(patch, meta = {}) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return getState();

  const previousState = getState();
  let changed = false;

  Object.keys(patch).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(state, key)) {
      console.warn("[EuropaState] unknown key:", key);
      return;
    }

    const incoming = patch[key];
    const next = objectKeys.has(key)
      ? { ...state[key], ...(incoming && typeof incoming === "object" ? incoming : {}) }
      : copyValue(key, incoming);

    if (sameValue(key, state[key], next)) return;
    state[key] = next;
    changed = true;
  });

  if (!changed) return previousState;
  const nextState = getState();
  notify(nextState, previousState, { ...meta });
  return nextState;
}

function subscribe(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function unsubscribe(listener) {
  listeners.delete(listener);
}

function resetSelection(meta = {}) {
  return setState({
    selectedPersonId: null,
  }, {
    source: meta.source || "state",
    reason: meta.reason || "reset-selection",
    ...meta,
  });
}

export const EuropaState = {
  getState,
  setState,
  subscribe,
  unsubscribe,
  resetSelection,
};

if (typeof window !== "undefined") window.EuropaState = EuropaState;
