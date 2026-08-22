(() => {
  "use strict";

  const MODULE_PREFIX = "modules/shaanxi-archaeology-museum/";
  const PUBLIC_BASE = "https://pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev";
  const COMPLETE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

  function shaanxiArchaeologyMediaUrl(path) {
    if (path === null || path === undefined) return path;

    const value = String(path);
    if (!value || COMPLETE_URL.test(value)) return value;

    const normalized = value.replace(/^\.\//, "");
    let repoPath;

    if (normalized.startsWith(MODULE_PREFIX)) {
      repoPath = normalized;
    } else if (normalized.startsWith("assets/") || normalized.startsWith("review/")) {
      repoPath = `${MODULE_PREFIX}${normalized}`;
    } else {
      return value;
    }

    if (typeof window.resolveMediaUrl !== "function") return value;
    return window.resolveMediaUrl(repoPath, {
      mode: "external",
      baseUrl: PUBLIC_BASE,
    });
  }

  window.shaanxiArchaeologyMediaUrl = shaanxiArchaeologyMediaUrl;
})();
