/* Optional enhancements for the public finding aid and site entrance. */
(function () {
  'use strict';
  function legacyBeilinTarget(pathname) {
    var match = /^(\/ad-fontes)?\/modules\/modules\/beilin(?:\/(?:index\.html|main\.html)?)?$/.exec(pathname);
    return match ? (match[1] || '') + '/modules/beilin/index.html' : null;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { legacyBeilinTarget: legacyBeilinTarget };
  }
  if (typeof document === 'undefined') return;
  var root = document.documentElement;
  var preference = null;
  try { preference = localStorage.getItem('ad-fontes-theme'); } catch (_) {}
  if (preference === 'light' || preference === 'dark') root.dataset.theme = preference;
  function isDark() {
    return root.dataset.theme ? root.dataset.theme === 'dark' :
      !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function ready() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      function describe() {
        button.setAttribute('aria-pressed', String(isDark()));
        button.setAttribute('aria-label', isDark() ? '启用浅色阅读主题' : '启用深色阅读主题');
      }
      describe();
      button.addEventListener('click', function () {
        root.dataset.theme = isDark() ? 'light' : 'dark';
        try { localStorage.setItem('ad-fontes-theme', root.dataset.theme); } catch (_) {}
        describe();
      });
    });
    var missingPath = document.getElementById('missing-path');
    if (missingPath) {
      missingPath.textContent = location.pathname;
      var target = legacyBeilinTarget(location.pathname);
      if (target) location.replace(target + location.search + location.hash);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
