/* Reviewed editorial overlays. Native records, photo order and media resolvers remain authoritative. */
(() => {
  'use strict';
  const norm = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s《》〈〉（）()·，。:：;；“”‘’'"\-—_/]/g, '');
  const eligible = entry => !!entry && entry.is_highlight === true && ((entry.content_review === 'passed'
    && entry.record_binding === 'verified' && entry.object_identity === 'verified' && entry.photo_match === 'verified')
    || (entry.publication_approval === 'user_approved' && entry.content_review === 'editorial_accepted'));
  const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rank = entry => eligible(entry) ? entry.curatorial_rank : Infinity;
  const relevance = (item, query) => {
    const q = norm(query), title = norm(item.title || item.name);
    if (!q) return 0;
    if (title === q) return 1000;
    if ((item.aliases || []).some(alias => norm(alias) === q)) return 900;
    return title.includes(q) ? 600 : 100;
  };
  function create(museumId) {
    const rows = (window.MUSEUM_HIGHLIGHTS || []).filter(row => row.museum_id === museumId && eligible(row));
    const byId = new Map(rows.map(row => [String(row.record_id), row]));
    const textRecords = rows.filter(row => row.record_kind === 'editorial_only').map(row => ({id:row.record_id,title:row.canonical_title,name:row.canonical_title,period:row.period,period_label:row.period,summary:row.card_tagline,aliases:row.aliases,category:'文物介绍',_editorialOnly:true}));
    function supplement(row, detail = false) {
      if (!row?.supplement_image) return '<span class="museum-editorial-photo-note">暂无对应照片</span>';
      const asset = row.supplement_image;
      const url = new URL(/^(?:https?:)?\/\//i.test(asset.path) ? asset.path : '../../' + asset.path, document.baseURI).href;
      const img = `<img src="${escape(url)}" alt="${escape(row.canonical_title + ' · ' + asset.caption)}" loading="${detail ? 'eager' : 'lazy'}" decoding="async">`;
      return detail ? `<figure class="museum-editorial-image"><a href="${escape(url)}" target="_blank" rel="noopener">${img}</a><figcaption>${escape(asset.caption)} · <a href="${escape(url)}" target="_blank" rel="noopener">查看原图 ↗</a></figcaption></figure>` : `<span class="museum-editorial-cover">${img}</span>`;
    }
    let textDialog;
    function openText(id, sync = true) {
      const row = byId.get(id); if (!row || row.record_kind !== 'editorial_only') return;
      if (!textDialog) { textDialog = document.createElement('dialog'); textDialog.className = 'museum-editorial-dialog'; document.body.append(textDialog); textDialog.addEventListener('close', () => { const url = new URL(location.href); url.searchParams.delete('editorial'); history.replaceState(null,'',url); }); }
      textDialog.innerHTML = `<button type="button" class="museum-editorial-close" aria-label="关闭文物介绍">关闭 ×</button><p>重点文物 · ${escape(row.period)}</p><h2>${escape(row.canonical_title)}</h2><p class="museum-editorial-tagline">${escape(row.card_tagline)}</p>${supplement(row, true)}<p>${escape(row.intro)}</p><div class="museum-editorial-sources">${row.sources.map(s=>`<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a>`).join('')}</div>`;
      textDialog.querySelector('button').addEventListener('click',()=>textDialog.close());
      if (!textDialog.open) textDialog.showModal();
      if (sync) { const url = new URL(location.href); url.searchParams.set('editorial',id); history.pushState(null,'',url); }
    }
    document.addEventListener('click', event => { const button = event.target.closest('[data-museum-editorial]'); if (button && byId.has(button.dataset.museumEditorial)) { event.preventDefault(); event.stopImmediatePropagation(); openText(button.dataset.museumEditorial); } }, true);
    document.addEventListener('keydown', event => {
      const opener = event.target.closest('[data-museum-editorial][role="button"]');
      if (opener && ['Enter',' '].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); openText(opener.dataset.museumEditorial); }
    }, true);
    const initialText = new URL(location.href).searchParams.get('editorial');
    if (initialText) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',()=>openText(initialText,false),{once:true}); else setTimeout(()=>openText(initialText,false),0); }
    let nativeCardSeed;
    const nativeCardsById = new Map();
    function card(item, renderNative, node = false) {
      if (!item._editorialOnly) return null;
      const row = byId.get(item.id);
      const adapted = {...structuredClone(nativeCardsById.get(row.supplement_image?.related_record_id) || nativeCardSeed), ...item, _editorialOnly:false,
        era:item.period, period_label:item.period, card_excerpt:item.summary, cardLead:item.summary,
        featured:false, special_status:null, music_focus:null, musicFocus:false, tags:[],
        origin:'', site:'', material:'', sequence:row.curatorial_rank, index:row.curatorial_rank};
      const rendered = renderNative(adapted, row.curatorial_rank - 1);
      const template = document.createElement('template');
      if (typeof rendered === 'string') template.innerHTML = rendered;
      else template.content.append(rendered);
      const root = template.content.firstElementChild;
      const opener = root.matches('button,[role="button"]') ? root : root.querySelector('button');
      opener.dataset.museumEditorial = item.id;
      const asset = row.supplement_image;
      const url = new URL(/^(?:https?:)?\/\//i.test(asset.path) ? asset.path : '../../' + asset.path, document.baseURI).href;
      root.querySelectorAll('img').forEach(image => {
        image.removeAttribute('srcset'); image.removeAttribute('sizes');
        image.src = url; image.alt = item.title + ' · ' + asset.caption;
        image.loading = 'lazy'; image.decoding = 'async'; image.onerror = null;
      });
      root.querySelectorAll('[style]').forEach(element => {
        if (element.style.backgroundImage) element.style.backgroundImage = 'none';
      });
      root.querySelectorAll('.card-photo-count,.artifact-photo-count').forEach(element => element.textContent='配图 1');
      root.querySelectorAll('.card-number').forEach(element => element.textContent=String(row.curatorial_rank).padStart(2,'0'));
      root.querySelectorAll('.archive-card-label').forEach(element => element.textContent=asset.caption);
      root.querySelectorAll('.archive-card-meta').forEach(element => element.textContent=item.period + ' · 配图 1');
      root.querySelectorAll('.card-metrics').forEach(element => element.textContent='配图 1');
      root.querySelectorAll('.image-process,.card-flags').forEach(element => element.remove());
      root.querySelectorAll('.artifact-card-footer span:first-child').forEach(element => element.textContent='配图 1');
      return node ? root : root.outerHTML;
    }
    let mode = 'recommended', controls, lastQuery = '';
    const get = item => byId.get(String(item.id));
    function apply(records) {
      if (!nativeCardSeed && records.length) nativeCardSeed = structuredClone(records[0]);
      records.forEach(record => nativeCardsById.set(record.id, structuredClone(record)));
      records.forEach(item => {
        const row = get(item);
        if (!row || item._highlightApplied) return;
        item._highlightApplied = true;
        item.aliases = [...new Set([...(item.aliases || []), ...(row.aliases || [])])];
        const sources = row.sources.map(s => ({label: s.title, url: s.url}));
        if (museumId === 'beilin') {
          item.name = row.canonical_title; item.period_label = row.period; item.card_excerpt = row.card_tagline;
          item.research = {...item.research, history: row.intro, sources: [...(item.research?.sources || []), ...sources.map(s => ({...s, layer: 'museum_official_collection_page'}))]};
        } else {
          item.title = row.canonical_title;
          item.summary = row.card_tagline;
          if (['baoji', 'qinhan', 'shangqiu-museum'].includes(museumId)) item.era = row.period;
          else item.period = row.period;
          if (museumId === 'baoji') { item.research = {...item.research, history: row.intro}; item.highlightSources = sources.map(s => [s.label, s.url]); }
          if (museumId === 'qinhan') { item.interpretation = row.intro; item.sources = [...new Set([...(item.sources || []), ...sources.map(s => s.url)])]; }
          if (museumId === 'shaanxi-history') { item.cardLead = row.card_tagline; item.essay = [{heading: '文物介绍', text: row.intro}, ...(item.essay || []).slice(1)]; item.sources = [...(item.sources || []), ...sources]; }
          if (museumId === 'xian-museum') { item.sections = [{heading: '文物介绍', text: row.intro}, ...(item.sections || []).slice(1)]; item.sources = [...(item.sources || []), ...sources]; }
          if (museumId === 'shangqiu-museum') { item.paragraphs = [row.intro, ...(item.paragraphs || []).slice(1)]; item.sources = [item.sources, ...sources.map(s => `${s.label}：${s.url}`)].filter(Boolean).join('\n'); }
          if (museumId === 'shaanxi-archaeology') { item.description = row.intro; item.highlightSources = sources; }
        }
      });
      return records;
    }
    function select(records, {query = '', filtered = false, manualSort = false} = {}) {
      if (lastQuery && !query.trim()) mode = 'recommended';
      lastQuery = query.trim();
      let output = [...records];
      if (!filtered) output.push(...textRecords.filter(item => !output.some(other=>other.id===item.id) && (!query.trim() || norm([item.title,item.period,item.summary,...item.aliases].join(' ')).includes(norm(query)))));
      if (mode === 'highlights') output = output.filter(item => get(item));
      if (query.trim()) output.sort((a, b) => relevance(b, query) - relevance(a, query) || rank(get(a)) - rank(get(b)));
      else if (!manualSort) output.sort((a, b) => rank(get(a)) - rank(get(b)));
      if (!query.trim() && !filtered && mode === 'recommended' && rows.length) output = output.filter(item => get(item)).sort((a,b) => rank(get(a)) - rank(get(b))).slice(0, 6);
      if (controls) controls.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.highlightMode === mode)));
      return output;
    }
    function mount(anchor, render) {
      if (!anchor || controls || !rows.length) return;
      controls = document.createElement('div'); controls.className = 'museum-highlight-controls'; controls.setAttribute('aria-label', '文物浏览范围');
      for (const [value, label] of [['recommended', '重点文物'], ['highlights', `查看全部重点（${rows.length}）`], ['all', '全部文物']]) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.highlightMode = value;
        button.textContent = label; button.setAttribute('aria-pressed', String(mode === value));
        button.addEventListener('click', () => { mode = value; render(); }); controls.append(button);
      }
      const toolbarSelectors = {
        beilin:'#catalogControls .control-row', baoji:'.archive-toolbar .filter-list',
        qinhan:'.archive-tools .category-filters', 'xian-museum':'.filter-shell .primary-filters',
        'shaanxi-history':'.filter-shell .primary-filters', 'shangqiu-museum':'.catalog-tools .filter-row',
        'shaanxi-archaeology':'.artifact-catalog-toolbar'
      };
      const toolbar = document.querySelector(toolbarSelectors[museumId]);
      if (toolbar) {
        const trailing = toolbar.querySelector('#clearFilters,[data-artifact-count]');
        if (trailing) trailing.before(controls); else toolbar.append(controls);
      }
    }
    return {apply, select, mount, get, card, reset: () => { mode = 'recommended'; lastQuery = ''; }, aliases: item => (item.aliases || []).join(' '), badge: item => get(item) ? '<span class="museum-highlight-badge">重点文物</span>' : ''};
  }
  window.MuseumHighlights = {create, eligible, relevance, norm};
})();
