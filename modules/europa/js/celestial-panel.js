/* Celestial control panel: a collapsible extension of the existing
   galaxy-controls. Owns user settings (persisted to localStorage), the debug
   trigger grid, legendary-event toasts and the auto-performance probe. Pure
   DOM + callbacks — no rendering, no RAF, no cosmic scheduling of its own. */

const STORE_KEY = 'europa-celestial-settings-v1';
const PERF_ORDER = ['LOW', 'NORMAL', 'HIGH'];

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function saveSettings(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {}
}

export function createCelestialPanel({ root, cosmic, snapshot }) {
  const saved = loadSettings() || {};
  const settings = {
    enabled: saved.enabled !== false,
    rarity: { common: saved.rarity?.common !== false, rare: saved.rarity?.rare !== false, legendary: saved.rarity?.legendary !== false },
    density: typeof saved.density === 'number' ? saved.density : 1,
    intensity: typeof saved.intensity === 'number' ? saved.intensity : 1,
    performance: ['LOW', 'NORMAL', 'HIGH'].includes(saved.performance) ? saved.performance : 'NORMAL',
    performanceAuto: !!saved.performanceAuto,
    chains: saved.chains !== false,
    notify: !!saved.notify,
  };

  const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const footer = root.querySelector('.galaxy-footer');
  const controls = root.querySelector('.galaxy-controls');
  const panel = document.createElement('div');
  panel.className = 'celestial-panel';
  panel.hidden = true;
  panel.innerHTML = `
   <div class="cp-status" role="status">天象 · —</div>
   <div class="cp-section cp-main">
    <label class="cp-row"><span>天体事件</span><button type="button" role="switch" data-set="enabled" aria-pressed="${settings.enabled}"><i></i></button></label>
    <label class="cp-row"><span>常见事件</span><button type="button" role="switch" data-set="rarity.common" aria-pressed="${settings.rarity.common}"><i></i></button></label>
    <label class="cp-row"><span>稀有事件</span><button type="button" role="switch" data-set="rarity.rare" aria-pressed="${settings.rarity.rare}"><i></i></button></label>
    <label class="cp-row"><span>传奇事件</span><button type="button" role="switch" data-set="rarity.legendary" aria-pressed="${settings.rarity.legendary}"><i></i></button></label>
    <label class="cp-row"><span>事件密度</span><input type="range" data-set="density" min="0.4" max="2" step="0.1" value="${settings.density}" aria-label="事件密度"></label>
    <label class="cp-row"><span>视觉强度</span><input type="range" data-set="intensity" min="0.4" max="1.5" step="0.05" value="${settings.intensity}" aria-label="视觉强度"></label>
    <label class="cp-row"><span>事件链</span><button type="button" role="switch" data-set="chains" aria-pressed="${settings.chains}"><i></i></button></label>
    <label class="cp-row"><span>传奇提示</span><button type="button" role="switch" data-set="notify" aria-pressed="${settings.notify}"><i></i></button></label>
    <label class="cp-row"><span>自动性能</span><button type="button" role="switch" data-set="performanceAuto" aria-pressed="${settings.performanceAuto}"><i></i></button></label>
    <label class="cp-row"><span>性能档</span><button type="button" data-perf-step aria-label="性能档位，当前 ${settings.performance}">${settings.performance}</button></label>
   </div>
   <div class="cp-section cp-debug">
    <button type="button" class="cp-debug-toggle" aria-expanded="false">调试触发 ▦</button>
    <div class="cp-debug-body" hidden>
     <div class="cp-grid" data-grid="events"></div>
     <div class="cp-grid" data-grid="chains"></div>
     <div class="cp-grid">
      <button type="button" data-act="stop-all">STOP ALL</button>
      <button type="button" data-act="reset-sky">RESET SKY</button>
      <button type="button" data-act="random">随机事件</button>
     </div>
    </div>
   </div>`;
  if (footer) footer.insertBefore(panel, footer.firstChild);
  else root.appendChild(panel);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'galaxy-cel-toggle';
  toggle.dataset.tooltip = '天体事件';
  toggle.setAttribute('aria-label', '天体事件面板');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '✦';
  if (controls) controls.appendChild(toggle);
  else if (footer) footer.appendChild(toggle);

  const DEBUG_TRIGGERS = [
    ['meteor', '流星群'], ['meteor-shower', '流星雨'], ['fireball', '火流星'],
    ['comet-flyby', '彗星'], ['aurora', '极光'], ['blood-moon', '血月'],
    ['collapse', '超新星'], ['pulsar', '脉冲星'], ['tidal-disruption-event', '黑洞/TDE'],
    ['kilonova', '千新星'], ['gamma-ray-burst', '伽马暴'], ['milky-way-bloom', '银河'],
  ];
  const CHAIN_BUTTONS = [['stellar-death', '恒星之死'], ['black-hole-feast', '黑洞盛宴'], ['galaxy-night', '银河之夜']];
  const grid = panel.querySelector('[data-grid="events"]');
  for (const [id, label] of DEBUG_TRIGGERS) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.dataset.trigger = id;
    b.onclick = () => { const r = cosmic.trigger(id, { force: true }); if (!r.ok) flashStatus(REASON_TEXT[r.reason] || ('无法触发：' + r.reason)); };
    grid.appendChild(b);
  }
  const cgrid = panel.querySelector('[data-grid="chains"]');
  for (const [id, label] of CHAIN_BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.dataset.chain = id;
    b.onclick = () => { const r = cosmic.startChain(id); if (!r.ok) flashStatus(REASON_TEXT[r.reason] || ('无法启动：' + r.reason)); };
    cgrid.appendChild(b);
  }
  panel.querySelector('[data-act="stop-all"]').onclick = () => { cosmic.stopAllChains(); cosmic.stopAllEvents?.(); };
  panel.querySelector('[data-act="reset-sky"]').onclick = () => cosmic.resetSky();
  panel.querySelector('[data-act="random"]').onclick = () => {
    const ids = cosmic.listEvents?.() || [];
    const pool = ids.filter(id => {
      const def = cosmic.getRegistry?.().events.find(e => e.id === id);
      return def && def.enabled && settings.rarity[def.rarity] && settings.enabled;
    });
    if (pool.length) { const r = cosmic.trigger(pool[Math.floor(Math.random() * pool.length)], { force: true }); if (!r.ok) flashStatus(REASON_TEXT[r.reason] || '无法触发'); } else flashStatus('当前没有已启用的事件');
  };

  /* toast for legendary notifications */
  const toast = document.createElement('div');
  toast.className = 'celestial-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  root.appendChild(toast);
  let toastTimer = 0;
  function showToast(def) {
    if (!settings.notify || !settings.enabled) return;
    toast.textContent = `天体事件 · ${def.label}`;
    toast.hidden = false;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove('show'); toast.hidden = true; }, 3000);
  }

  function apply() {
    cosmic.configure({
      enabled: settings.enabled,
      rarity: { ...settings.rarity },
      density: settings.density,
      intensity: settings.intensity,
      performance: settings.performance,
      chainsEnabled: settings.chains,
    });
    saveSettings(JSON.parse(JSON.stringify(settings)));
  }
  apply();

  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-set]');
    if (!b || b.tagName !== 'BUTTON') return;
    const key = b.dataset.set;
    if (key === 'enabled') settings.enabled = !settings.enabled;
    else if (key.startsWith('rarity.')) settings.rarity[key.split('.')[1]] = !settings.rarity[key.split('.')[1]];
    else if (key === 'chains') settings.chains = !settings.chains;
    else if (key === 'notify') settings.notify = !settings.notify;
    else if (key === 'performanceAuto') settings.performanceAuto = !settings.performanceAuto;
    b.setAttribute('aria-pressed', String(settings.enabled && (key === 'enabled' ? settings.enabled : key.startsWith('rarity.') ? settings.rarity[key.split('.')[1]] : key === 'chains' ? settings.chains : key === 'notify' ? settings.notify : settings.performanceAuto)));
    apply();
  });
  panel.querySelector('[data-perf-step]').onclick = e => {
    const i = PERF_ORDER.indexOf(settings.performance);
    settings.performance = PERF_ORDER[(i + 1) % PERF_ORDER.length];
    settings.performanceAuto = false;
    panel.querySelector('[data-set="performanceAuto"]').setAttribute('aria-pressed', 'false');
    e.currentTarget.textContent = settings.performance;
    e.currentTarget.setAttribute('aria-label', '性能档位，当前 ' + settings.performance);
    apply();
  };
  panel.querySelectorAll('input[type=range][data-set]').forEach(input => {
    input.addEventListener('input', () => {
      settings[input.dataset.set] = parseFloat(input.value);
      apply();
    });
  });
  const debugToggle = panel.querySelector('.cp-debug-toggle');
  const debugBody = panel.querySelector('.cp-debug-body');
  debugToggle.onclick = () => {
    const open = debugBody.hidden;
    debugBody.hidden = !open;
    debugToggle.setAttribute('aria-expanded', String(open));
    debugToggle.textContent = open ? '调试触发 ▦' : '调试触发 ▴';
  };
  panel.addEventListener('click', () => updateStatus());
  toggle.onclick = () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };

  const statusEl = panel.querySelector('.cp-status');
  let statusFlashTimer = 0;
  let statusFlashActive = false;
  /* refusal reason → one-line user feedback on cp-status (no alert, no toast) */
  const REASON_TEXT = {
    'master-off': '天象已关',
    'paused': '当前已暂停',
    'reduced-motion': '减少动态模式下不可触发',
    'view-not-applicable': '请切回3D全景',
    'scene-not-ready': '请切回3D全景',
    'rarity-disabled': '该类别事件已关闭',
    'disabled': '该事件已停用',
    'concurrency': '同时进行的事件已达上限',
    'type-concurrent': '同类事件已达上限',
    'exclusive-group': '互斥事件进行中',
    'legendary-exclusive': '传奇事件进行中',
    'recovery': '恢复期内暂不触发',
    'event-cap': '事件已达硬性上限',
    'chain-disabled': '该事件链已停用',
    'chains-disabled': '事件链已关闭',
    'already-running': '该事件链已在运行',
    'destroyed': '天体系统已销毁',
    'unknown-event': '未知事件',
  };
  function updateStatus() {
    if (statusFlashActive) return;
    let snap = null;
    try { snap = snapshot && snapshot(); } catch (e) { snap = null; }
    /* celestialApplicable mirrors the cosmic host gate (filter==='all' && !mode());
       the 2D relation view is read from the page flag since the paused 3D
       instance keeps filter==='all' */
    const flat = document.body.classList.contains('galaxy-flat-view');
    const applicable = snap ? !!snap.celestialApplicable : true;
    const paused = !!snap && !!snap.paused;
    let text;
    if (!settings.enabled) text = '天象已关';
    else if (flat) text = '2D关系网 · 天象待机';
    else if (!applicable) text = '时代视图 · 天象待机';
    else if (reducedMotion) text = '减少动态 · 天象冻结';
    else if (paused) text = '全景 · 已暂停';
    else text = '全景 · 运行中';
    statusEl.textContent = '天象 · ' + text;
    statusEl.classList.toggle('warn', flat || !applicable || paused || reducedMotion || !settings.enabled);
    const debugOff = flat || !applicable || paused || reducedMotion || !settings.enabled;
    panel.querySelectorAll('[data-grid] button').forEach(b => {
      b.disabled = debugOff;
      b.title = debugOff ? '天象仅在 3D 全景运行（非暂停/非减少动态）' : '';
    });
  }
  function flashStatus(message) {
    clearTimeout(statusFlashTimer);
    statusFlashActive = true; // a refusal flash must not be overwritten early
    statusEl.textContent = '天象 · ' + message;
    statusEl.classList.add('warn');
    statusFlashTimer = setTimeout(() => { statusFlashActive = false; updateStatus(); }, 2600);
  }
  updateStatus();

  /* auto performance: probe the EXISTING frame diagnostics (galaxySnapshot
     p95) with hysteresis; UI-level monitor, cleared on destroy */
  let downgradeStreak = 0, upgradeStreak = 0, lastSwitch = 0;
  const autoTimer = setInterval(() => {
    updateStatus();
    if (!settings.performanceAuto) return;
    let p95 = null;
    try { p95 = snapshot()?.frameTiming?.p95; } catch {}
    if (!p95 || !isFinite(p95)) return;
    const now = Date.now();
    if (now - lastSwitch < 12000) return;
    const i = PERF_ORDER.indexOf(settings.performance);
    if (p95 > 30) { downgradeStreak++; upgradeStreak = 0; } else if (p95 < 15) { upgradeStreak++; downgradeStreak = 0; } else { downgradeStreak = 0; upgradeStreak = 0; }
    if (downgradeStreak >= 2 && i > 0) {
      settings.performance = PERF_ORDER[i - 1]; lastSwitch = now; downgradeStreak = 0;
      panel.querySelector('[data-perf-step]').textContent = settings.performance; apply();
    } else if (upgradeStreak >= 4 && i < PERF_ORDER.indexOf('NORMAL')) {
      settings.performance = PERF_ORDER[i + 1]; lastSwitch = now; upgradeStreak = 0;
      panel.querySelector('[data-perf-step]').textContent = settings.performance; apply();
    }
  }, 1500);

  return {
    showToast,
    getSettings: () => JSON.parse(JSON.stringify(settings)),
    destroy() {
      clearInterval(autoTimer);
      clearTimeout(toastTimer);
      clearTimeout(statusFlashTimer);
      toggle.remove();
      panel.remove();
      toast.remove();
    }
  };
}
