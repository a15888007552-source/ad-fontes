/* External data bootstrap. Legacy JSON blocks are deliberately never read. */
(function () {
  'use strict';
  const app = window.ProceedingsApp;
  const notice = document.getElementById('proceedings-data-notice');
  const status = document.getElementById('proceedings-data-status');
  const retry = document.getElementById('proceedings-data-retry');
  const main = document.querySelector('main');
  const navigation = [...document.querySelectorAll('header.topbar,nav.tabs')];
  if (!app || typeof app.init !== 'function' || typeof app.go !== 'function' || typeof window.ProceedingsData?.load !== 'function') {
    state('error');
    notice.hidden = false;
    status.textContent = '阅读界面未能载入，请重新载入页面。';
    retry.textContent = '重新载入页面';
    retry.hidden = false;
    retry.addEventListener('click', () => window.location.reload());
    document.getElementById('proceedings-opening-skip')?.click();
    retry.focus();
    window.ProceedingsReady = Promise.resolve(false);
    return;
  }
  const originalGo = app.go;
  let ready = false, initializationStarted = false, initializing = false, inFlight = null;
  app.go = function (...args) { return ready || initializing ? originalGo.apply(this, args) : false; };
  function state(value) {
    document.documentElement.dataset.proceedingsState = value;
    main.setAttribute('aria-busy', String(value === 'loading'));
  }
  function load() {
    if (ready) return Promise.resolve(true);
    if (inFlight) return inFlight;
    if (initializationStarted) {window.location.reload(); return Promise.resolve(false);}
    state('loading');
    notice.hidden = false;
    retry.hidden = true;
    status.textContent = '正在读取会议资料…';
    inFlight = Promise.resolve().then(async function () {
      try {
        const loaded = await window.ProceedingsData.load(new URL('data/', window.location.href));
        window.SITE_DATA = loaded.data;
        window.IMAGES = loaded.images;
        window.ProceedingsReferences = {sessions: loaded.sessions, speakers: loaded.speakers};
        initializationStarted = true;
        initializing = true;
        app.init();
        initializing = false;
        ready = true;
        app.ready = true;
        app.go = originalGo;
        navigation.forEach(element => element.removeAttribute('inert'));
        state('ready');
        status.textContent = '会议资料已载入。';
        notice.hidden = true;
        window.dispatchEvent(new CustomEvent('proceedings:ready'));
        return true;
      } catch (_) {
        initializing = false;
        state('error');
        status.textContent = initializationStarted ? '阅读界面未能初始化，请重新载入页面。' : '会议资料未能载入。请检查连接后重试。';
        retry.textContent = initializationStarted ? '重新载入页面' : '重试读取资料';
        retry.hidden = false;
        document.getElementById('proceedings-opening-skip')?.click();
        retry.focus();
        return false;
      }
    }).finally(() => {inFlight = null;});
    return inFlight;
  }
  retry.addEventListener('click', () => {window.ProceedingsReady = load();});
  window.ProceedingsReady = load();
})();
