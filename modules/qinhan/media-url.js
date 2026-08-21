(() => {
  "use strict";

  const MODULE_PREFIX = "modules/qinhan/";
  const PUBLIC_BASE = "https://ad-fontes-media.gusgumee777.workers.dev";
  const COMPLETE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

  function qinhanMediaUrl(path) {
    if (path === null || path === undefined) return path;

    const value = String(path);
    if (!value || COMPLETE_URL.test(value)) return value;

    const normalized = value.replace(/^\.\//, "");
    const repoPath = normalized.startsWith(MODULE_PREFIX)
      ? normalized
      : normalized.startsWith("assets/")
        ? `${MODULE_PREFIX}${normalized}`
        : normalized;

    return resolveMediaUrl(repoPath, { mode: "external", baseUrl: PUBLIC_BASE });
  }

  window.qinhanMediaUrl = qinhanMediaUrl;
})();
