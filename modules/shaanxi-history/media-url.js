(function (root) {
  "use strict";

  const MODULE_PREFIX = "modules/shaanxi-history/";
  const R2_PUBLIC_BASE = "https://pub-2f296678a1134f0fa45cf651ddd6f956.r2.dev";
  const resolve = root && root.resolveMediaUrl;

  if (typeof resolve !== "function") {
    console.error("[shaanxi-history] shared media resolver is unavailable");
    return;
  }

  const isCompleteUrl = (value) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);

  function toRepoRelativePath(path) {
    let value = String(path);
    value = value.replace(/^(?:\.\/)+/, "");
    if (value.startsWith(MODULE_PREFIX)) return value;
    return MODULE_PREFIX + value.replace(/^\/+/, "");
  }

  function shaanxiHistoryMediaUrl(path) {
    if (path === null || path === undefined) return path;

    const value = String(path);
    if (isCompleteUrl(value)) return resolve(value);

    return resolve(toRepoRelativePath(value), {
      mode: "external",
      baseUrl: R2_PUBLIC_BASE,
    });
  }

  root.shaanxiHistoryMediaUrl = shaanxiHistoryMediaUrl;
  root.ShaanxiHistoryMedia = root.ShaanxiHistoryMedia || {};
  root.ShaanxiHistoryMedia.baseUrl = R2_PUBLIC_BASE;
  root.ShaanxiHistoryMedia.resolve = shaanxiHistoryMediaUrl;
})(typeof globalThis !== "undefined" ? globalThis : this);
