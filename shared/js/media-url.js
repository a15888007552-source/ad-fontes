/*
 * Vendor-neutral media URL resolution.
 *
 * The resolver is intentionally not wired into existing pages in this phase.
 * Its default mode returns the exact local value that the page already uses.
 */
(function (root) {
  "use strict";

  var COMPLETE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

  function trimTrailingSlashes(value) {
    return value.replace(/\/+$/, "");
  }

  function resolveMediaUrl(path, options) {
    if (path === null || path === undefined) {
      return path;
    }

    var value = String(path);
    if (COMPLETE_URL.test(value)) {
      return value;
    }

    var settings = options || {};
    var mode = settings.mode || "local";
    if (mode !== "external" || !settings.baseUrl) {
      return value;
    }

    var baseUrl = trimTrailingSlashes(String(settings.baseUrl));
    if (!baseUrl) {
      return value;
    }

    /*
     * Do not normalize the path portion. Keeping ./ and ../ verbatim preserves
     * the caller's relative-path semantics, while the query and hash remain
     * byte-for-byte part of the original value.
     */
    return baseUrl + "/" + value.replace(/^\/+/, "");
  }

  if (root) {
    root.resolveMediaUrl = resolveMediaUrl;
    root.MediaUrl = root.MediaUrl || {};
    root.MediaUrl.resolveMediaUrl = resolveMediaUrl;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { resolveMediaUrl: resolveMediaUrl };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
