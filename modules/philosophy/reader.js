(function () {
  'use strict';
  const tabs = [...document.querySelectorAll('#tabs button')];
  const views = [...document.querySelectorAll('.view')];
  const search = document.getElementById('search');
  const count = document.getElementById('count');
  const status = document.getElementById('reader-status');
  const title = document.title;
  const names = tabs.map(button => button.dataset.view);
  const searchable = [...document.querySelectorAll('.searchable')];
  const originalText = new Map(searchable.map(el => [el, (el.textContent + ' ' + (el.dataset.tags || '')).toLowerCase()]));
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  let currentTarget = '';

  function filter() {
    const q = search.value.trim().toLowerCase();
    const active = document.querySelector('.view.on');
    let matches = 0;
    searchable.forEach(el => {
      const hit = !q || originalText.get(el).includes(q);
      el.classList.toggle('search-hidden', !hit);
      if (hit && active.contains(el)) matches++;
    });
    count.textContent = q ? matches + ' 个匹配项（当前栏目）' : '输入关键词开始检索';
  }

  function writeRoute(id, mode) {
    const url = new URL(location.href);
    url.hash = id;
    if (search.value.trim()) url.searchParams.set('q', search.value.trim());
    else url.searchParams.delete('q');
    if (url.href !== location.href) history[mode + 'State'](null, '', url);
  }

  function show(id, mode, scroll) {
    let target = document.getElementById(id);
    let name = names.includes(id) ? id : target?.closest('.view')?.id.replace('view-', '');
    if (!name || !names.includes(name)) {
      name = 'desk';
      target = null;
      status.textContent = id ? '未找到该阅读位置，已返回阅读台；可从栏目或检索继续。' : '';
    } else status.textContent = '';
    tabs.forEach(button => {
      const active = button.dataset.view === name;
      button.classList.toggle('on', active);
      button.setAttribute('aria-pressed', String(active));
    });
    views.forEach(view => view.classList.toggle('on', view.id === 'view-' + name));
    currentTarget = target ? target.id : name;
    filter();
    if (target?.classList.contains('search-hidden')) {
      target.classList.remove('search-hidden');
      status.textContent = '已定位引用页；该页不在当前关键词的匹配项内。';
    }
    const label = target?.querySelector('.folio,h3')?.cloneNode(true);
    label?.querySelectorAll('button').forEach(button => button.remove());
    document.title = (label ? label.textContent.trim() : tabs.find(button => button.dataset.view === name).textContent) + ' · ' + title;
    if (mode) writeRoute(currentTarget, mode);
    if (scroll) {
      if (target) target.scrollIntoView({behavior: motion(), block: 'start'});
      else window.scrollTo({top: document.getElementById('tabs').offsetTop - 4, behavior: motion()});
    }
  }

  function restore() {
    search.value = new URL(location.href).searchParams.get('q') || '';
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { id = 'invalid'; }
    show(id || 'desk', null, Boolean(id));
  }
  tabs.forEach(button => button.addEventListener('click', () => show(button.dataset.view, 'push', true)));
  search.addEventListener('input', () => { filter(); writeRoute(currentTarget, 'replace'); });
  addEventListener('popstate', restore);
  addEventListener('hashchange', restore);

  async function copyCitation(id) {
    const el = document.getElementById(id);
    const label = el?.querySelector('.folio,h3')?.cloneNode(true);
    label?.querySelectorAll('button').forEach(button => button.remove());
    const url = new URL(document.querySelector('link[rel="canonical"]').href);
    url.hash = id;
    const section = el?.closest('.view')?.id || ('view-' + id);
    const book = ['view-translation', 'view-notes'].includes(section) ? '，《绝对音乐的理念》译读' : '';
    const sectionLabel = tabs.find(button => 'view-' + button.dataset.view === section)?.textContent;
    const text = 'AD FONTES，Musica Philosophica' + book + (label ? '，' + label.textContent.trim() : (sectionLabel ? '，' + sectionLabel : '')) + '。' + url.href;
    try { await navigator.clipboard.writeText(text); status.textContent = '引用已复制。'; }
    catch (_) { status.textContent = '无法自动复制，请复制以下引用：' + text; }
  }
  document.querySelectorAll('.page[id],.note-page[id],.chapter-banner[id]').forEach(el => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-reference';
    button.textContent = '复制引用';
    button.addEventListener('click', () => copyCitation(el.id));
    el.querySelector('.folio,h3').append(button);
  });
  document.getElementById('copy-citation').addEventListener('click', () => copyCitation(currentTarget));
  document.getElementById('print-reading').addEventListener('click', () => window.print());

  const root = document.documentElement;
  try { const saved = localStorage.getItem('philosophica-theme'); if (saved === 'light' || saved === 'dark') root.dataset.theme = saved; } catch (_) {}
  document.getElementById('theme').addEventListener('click', () => {
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme:dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('philosophica-theme', root.dataset.theme); } catch (_) {}
  });

  const pages = [...document.querySelectorAll('.page')];
  let current = 0;
  function go(delta) {
    const visible = pages.filter(page => !page.classList.contains('search-hidden'));
    if (!visible.length) return;
    const start = Math.max(0, visible.indexOf(pages[current]));
    const page = visible[Math.max(0, Math.min(visible.length - 1, start + delta))];
    current = pages.indexOf(page);
    show(page.id, 'push', true);
  }
  document.getElementById('prev').addEventListener('click', () => go(-1));
  document.getElementById('next').addEventListener('click', () => go(1));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) current = pages.indexOf(entry.target); }), {rootMargin: '-25% 0px -65%'});
  pages.forEach(page => observer.observe(page));
  const top = document.getElementById('toTop');
  addEventListener('scroll', () => top.classList.toggle('show', scrollY > 700), {passive: true});
  top.addEventListener('click', () => scrollTo({top: 0, behavior: motion()}));
  restore();
})();
