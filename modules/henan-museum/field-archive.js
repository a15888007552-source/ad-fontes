(() => {
  'use strict';

  const archive = window.HENAN_FIELD_ARCHIVE || { sourceCount: 817, groups: [] };
  // The entrance photograph is retained as background material, not a collection object.
  const groups = Array.isArray(archive.groups) ? archive.groups.filter(group => group.id !== 'A-001' && (group.photos?.some(photo => photo.role !== 'label') || group.image)) : [];
  const grid = document.querySelector('#field-grid');
  const filters = document.querySelector('#field-filters');
  const search = document.querySelector('#field-search');
  const status = document.querySelector('#field-status');
  const more = document.querySelector('#field-more');
  const dialog = document.querySelector('#artifact-dialog');
  if (!grid || !filters || !search || !status || !more || !dialog) return;

  const elements = {
    title: dialog.querySelector('#artifact-dialog-title'), era: dialog.querySelector('#artifact-dialog-era'),
    lead: dialog.querySelector('#artifact-dialog-lead'), facts: dialog.querySelector('#artifact-dialog-facts'),
    image: dialog.querySelector('#artifact-dialog-image'), stage: dialog.querySelector('#artifact-dialog-stage'),
    credit: dialog.querySelector('#artifact-dialog-credit'), count: dialog.querySelector('#artifact-dialog-count'),
    thumbs: dialog.querySelector('#artifact-dialog-thumbs'), previous: dialog.querySelector('#artifact-gallery-prev'),
    next: dialog.querySelector('#artifact-gallery-next'), zoom: dialog.querySelector('#artifact-gallery-zoom'),
    prose: dialog.querySelector('#artifact-dialog-prose'), inscription: dialog.querySelector('#artifact-inscription'),
    inscriptionOriginal: dialog.querySelector('#artifact-inscription-original'),
    inscriptionTranslation: dialog.querySelector('#artifact-inscription-translation'),
    inscriptionNote: dialog.querySelector('#artifact-inscription-note'), sources: dialog.querySelector('#artifact-dialog-sources'),
  };

  const pageSize = 9;
  const previousPage = more.cloneNode(false);
  previousPage.id = 'field-previous';
  previousPage.textContent = '上一页';
  more.before(previousPage);
  let imageObserver;
  let revealObserver;
  let imageQueue = [];
  let activeLoads = 0;

  function drainImages() {
    while (activeLoads < 2 && imageQueue.length) {
      const img = imageQueue.shift();
      if (!img.isConnected || !img.dataset.src) continue;
      activeLoads++;
      const done = () => { activeLoads--; drainImages(); };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      img.src = img.dataset.src;
      delete img.dataset.src;
    }
  }
  function observeImages() {
    imageObserver?.disconnect();
    imageQueue = [];
    const images = grid.querySelectorAll('img[data-src]');
    if (!('IntersectionObserver' in window)) { imageQueue.push(...images); drainImages(); return; }
    imageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        imageObserver.unobserve(entry.target);
        imageQueue.push(entry.target);
      });
      drainImages();
    }, { rootMargin: '100px 0px' });
    images.forEach(img => imageObserver.observe(img));
  }

  const state = {
    filter: 'all', query: '', page: 0, activeGroup: null, activePhotos: [], activePhoto: 0,
    lastOpener: null, scale: 1, offsetX: 0, offsetY: 0, dragging: false, pointerId: null,
    dragStartX: 0, dragStartY: 0, dragOriginX: 0, dragOriginY: 0,
    swipeStartX: 0, swipeStartY: 0, swiping: false,
  };
  const roleLabels = {
    front: '正面', side: '侧面', back: '背面', detail: '局部', inscription: '铭文 / 刻辞',
    label: '展签 / 介绍', environment: '展厅关系', other: '现场照片', online: '开放图片', phone: '手机补拍',
  };
  const paragraphHeadings = ['身份与来处', '器形与工艺', '历史现场'];

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const photoStem = filename => String(filename || '').replace(/\.[^.]+$/, '');
  const photoPath = (photo, kind = 'web') => {
    if (!photo) return '';
    const originals = window.HENAN_ORIGINAL_PHOTOS;
    if (originals && photo.filename) return originals.base + encodeURIComponent(photo.filename);
    if (originals?.assets[photo.asset]) return originals.assets[photo.asset];
    if (kind === 'thumb' && photo.thumb) return photo.thumb;
    if (kind === 'web' && photo.web) return photo.web;
    if (photo.asset) return photo.asset;
    const stem = photoStem(photo.filename);
    return stem ? `assets/photos/${kind === 'thumb' ? 'thumbs' : kind}/${stem}.webp` : '';
  };
  const photoRole = photo => roleLabels[photo?.role] || photo?.role || '现场照片';

  function objectPhotos(group) {
    const values = Array.isArray(group.photos) ? group.photos.filter(photo => photo.role !== 'label' && photoPath(photo)) : [];
    if (values.length) return values;
    return [{ asset: group.image, role: group.origin === '开放图片' ? 'online' : 'front', credit: group.credit, alt: group.alt }].filter(photo => photo.asset);
  }

  function featuredPhoto(group) {
    const photos = objectPhotos(group);
    return photos.find(photo => photo.featured)
      || photos.find(photo => !['label', 'environment'].includes(photo.role))
      || photos[0];
  }

  function groupTags(group) {
    const tags = new Set(Array.isArray(group.tags) ? group.tags : []);
    if (group.category) tags.add(group.category);
    if (group.musicFocus) tags.add('music');
    if (group.tombFocus) tags.add('tomb');
    if (group.inscription || group.inscriptionFocus) tags.add('inscription');
    return tags;
  }

  function searchableText(group) {
    const paragraphs = (group.paragraphs || []).map(item => typeof item === 'string' ? item : `${item.heading || ''} ${item.text || ''}`).join(' ');
    const inscription = group.inscription ? `${group.inscription.original || ''} ${group.inscription.translation || ''} ${group.inscription.note || ''}` : '';
    return [group.title, group.era, group.material, group.provenance, group.findspot, group.lead, paragraphs, inscription, ...(group.tags || [])].join(' ').toLowerCase();
  }

  function matches(group) {
    return (state.filter === 'all' || groupTags(group).has(state.filter))
      && (!state.query || searchableText(group).includes(state.query));
  }

  function leadFor(group) {
    if (group.lead) return group.lead;
    const first = group.paragraphs?.[0];
    return (typeof first === 'string' ? first : first?.text) || '器物、细节与展签按现场拍摄顺序合并归档。';
  }

  function renderCounts() {
    document.querySelectorAll('[data-field-source-count]').forEach(node => { node.textContent = String(archive.sourceCount || 817); });
    document.querySelectorAll('[data-field-group-count]').forEach(node => { node.textContent = String(groups.length); });
    filters.querySelectorAll('[data-field-filter]').forEach(button => {
      const key = button.dataset.fieldFilter;
      const count = key === 'all' ? groups.length : groups.filter(group => groupTags(group).has(key)).length;
      const target = button.querySelector('span');
      if (target) target.textContent = String(count);
    });
  }

  function renderCard(group, index) {
    const photo = featuredPhoto(group);
    const photos = objectPhotos(group);
    const origin = group.origin || (photos.some(item => item.role === 'online') ? '开放图片' : '本次实拍');
    return `<button class="field-card" type="button" data-artifact="${escapeHTML(group.id)}" aria-haspopup="dialog" aria-label="打开${escapeHTML(group.title)}的完整图集与研究说明" style="--field-position:${escapeHTML(group.position || 'center')}">
      <figure><img data-src="${escapeHTML(photoPath(photo, 'thumb') || photoPath(photo))}" alt="${escapeHTML(photo.alt || `${group.title} · ${photoRole(photo)}`)}" width="520" height="520" loading="eager" decoding="async"><span class="field-card-number">${String(group.number || index + 1).padStart(2, '0')}</span><span class="field-card-photo-count">${photos.length} 张</span><span class="field-card-origin">${escapeHTML(origin)}</span></figure>
      <div><small>${escapeHTML(group.era || '年代待核')} / ${escapeHTML(group.material || group.categoryLabel || '器物')}</small><h3>${escapeHTML(group.title || '待核器物')}</h3><p class="field-card-summary">${escapeHTML(leadFor(group))}</p><p><span>${escapeHTML(group.provenance || group.findspot || '展签与照片序列待核')}</span><span aria-hidden="true">↗</span></p></div>
    </button>`;
  }

  function render() {
    const matched = groups.filter(matches);
    const shown = matched.slice(state.page * pageSize, (state.page + 1) * pageSize);
    grid.innerHTML = shown.length ? shown.map(renderCard).join('') : '<p class="field-empty">没有找到相符器物。可以换一个器名、年代或出土地再试。</p>';
    status.textContent = `第 ${matched.length ? state.page + 1 : 0} / ${Math.ceil(matched.length / pageSize)} 页 · 共 ${matched.length} 件`;
    previousPage.hidden = state.page === 0;
    more.hidden = (state.page + 1) * pageSize >= matched.length;
    more.textContent = '下一页 →';
    bindReveal();
    observeImages();
  }

  function bindReveal() {
    revealObserver?.disconnect();
    const cards = [...grid.querySelectorAll('.field-card')];
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cards.forEach(card => card.classList.add('is-field-visible'));
      return;
    }
    const observer = revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-field-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -28px 0px' });
    cards.forEach((card, index) => {
      card.classList.add('field-reveal');
      card.style.setProperty('--field-delay', `${(index % 3) * 65}ms`);
      observer.observe(card);
    });
  }

  function normalizeParagraphs(group) {
    const values = Array.isArray(group.paragraphs) ? group.paragraphs.filter(item => typeof item === 'string' ? item.trim() : item?.text?.trim()).slice(0, 3) : [];
    return values.map((item, index) => typeof item === 'string'
      ? { heading: paragraphHeadings[index], text: item }
      : { heading: item.heading || paragraphHeadings[index], text: item.text || '' });
  }

  function renderFacts(group, photos) {
    const facts = [
      ['年代', group.era || '待核'], ['材质 / 器类', group.material || group.categoryLabel || '待核'],
      ['出土或来源', group.provenance || group.findspot || '待核'],
      ['现场记录', `${photos.length} 张 · ${[...new Set(photos.map(photoRole))].join(' → ')}`],
    ];
    elements.facts.innerHTML = facts.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
  }

  function renderProse(group) {
    elements.prose.innerHTML = normalizeParagraphs(group).map(item => `<section><h3>${escapeHTML(item.heading)}</h3><p>${escapeHTML(item.text)}</p></section>`).join('');
  }

  function renderInscription(group) {
    const inscription = group.inscription;
    const shouldShow = Boolean(inscription?.original);
    elements.inscription.hidden = !shouldShow;
    if (!shouldShow) return;
    elements.inscriptionOriginal.textContent = inscription.original;
    elements.inscriptionTranslation.textContent = inscription.translation || '此处仅录可确认文字，不补残缺字。';
    elements.inscriptionNote.textContent = [inscription.note, inscription.status].filter(Boolean).join('；') || '依据现场展签与器物原片。';
  }

  function renderSources(group) {
    const sources = Array.isArray(group.sources) ? group.sources : (group.source ? [{ label: '资料出处', url: group.source }] : []);
    elements.sources.innerHTML = sources.map((source, index) => `<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer"><span><small>${String(index + 1).padStart(2, '0')} / SOURCE</small><br>${escapeHTML(source.label || source.url)}</span><i aria-hidden="true">↗</i></a>`).join('');
  }

  function resetZoom() {
    Object.assign(state, { scale: 1, offsetX: 0, offsetY: 0, dragging: false, swiping: false });
    elements.stage.classList.remove('is-zoomed', 'is-dragging');
    elements.stage.style.setProperty('--gallery-scale', '1');
    elements.stage.style.setProperty('--pan-x', '0px');
    elements.stage.style.setProperty('--pan-y', '0px');
    elements.zoom.setAttribute('aria-pressed', 'false');
    elements.zoom.textContent = '放大细看 ＋';
  }

  function applyZoom() {
    const isZoomed = state.scale > 1.01;
    elements.stage.classList.toggle('is-zoomed', isZoomed);
    elements.stage.style.setProperty('--gallery-scale', String(state.scale));
    elements.stage.style.setProperty('--pan-x', `${state.offsetX}px`);
    elements.stage.style.setProperty('--pan-y', `${state.offsetY}px`);
    elements.zoom.setAttribute('aria-pressed', String(isZoomed));
    elements.zoom.textContent = isZoomed ? '还原全图 −' : '放大细看 ＋';
  }

  function setPhoto(index) {
    const total = state.activePhotos.length;
    if (!total) return;
    state.activePhoto = (index + total) % total;
    const photo = state.activePhotos[state.activePhoto];
    resetZoom();
    elements.image.src = photoPath(photo, 'web');
    elements.image.alt = photo.alt || `${state.activeGroup.title} · ${photoRole(photo)}`;
    elements.image.style.objectPosition = photo.position || 'center';
    elements.credit.textContent = photo.credit || `${photoRole(photo)} · ${photo.filename || state.activeGroup.title}`;
    elements.count.textContent = `${String(state.activePhoto + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    elements.previous.disabled = total < 2; elements.next.disabled = total < 2;
    [...elements.thumbs.children].forEach((thumb, thumbIndex) => {
      const preview = thumb.querySelector('img');
      if (thumbIndex === state.activePhoto && preview?.dataset.src) {
        preview.src = preview.dataset.src;
        delete preview.dataset.src;
      }
      thumb.classList.toggle('is-active', thumbIndex === state.activePhoto);
      thumb.setAttribute('aria-current', thumbIndex === state.activePhoto ? 'true' : 'false');
    });
    elements.thumbs.children[state.activePhoto]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  function renderGallery(group, photos) {
    elements.thumbs.innerHTML = photos.map((photo, index) => `<button class="artifact-dialog-thumb" type="button" data-photo-index="${index}" aria-label="查看第${index + 1}张：${escapeHTML(photoRole(photo))}"><img data-src="${escapeHTML(photoPath(photo, 'thumb'))}" alt="" decoding="async"><span>${escapeHTML(photoRole(photo))}</span></button>`).join('');
    setPhoto(0);
  }

  function syncUrl(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('item', id); else url.searchParams.delete('item');
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function fitDialogTitle() {
    if (!dialog.open) return;
    const title = elements.title;
    title.style.removeProperty('font-size');
    const size = parseFloat(getComputedStyle(title).fontSize);
    if (title.scrollWidth > title.clientWidth && title.clientWidth > 0) {
      title.style.fontSize = `${Math.floor(size * title.clientWidth / title.scrollWidth * 0.98)}px`;
    }
  }
  window.addEventListener('resize', fitDialogTitle);
  document.fonts?.ready.then(fitDialogTitle);

  function openGroup(group, opener, updateUrl = true) {
    const photos = objectPhotos(group);
    state.activeGroup = group; state.activePhotos = photos; state.lastOpener = opener || document.activeElement;
    elements.era.textContent = `${group.era || '年代待核'} / ${group.material || group.categoryLabel || '器物'}`;
    elements.title.textContent = group.title || '待核器物'; elements.lead.textContent = leadFor(group);
    renderFacts(group, photos); renderProse(group); renderInscription(group); renderSources(group); renderGallery(group, photos);
    if (updateUrl) syncUrl(group.id);
    if (!dialog.open) dialog.showModal();
    fitDialogTitle();
  }

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-field-filter]');
    if (!button) return;
    state.filter = button.dataset.fieldFilter; state.page = 0;
    filters.querySelectorAll('[data-field-filter]').forEach(item => item.classList.toggle('is-active', item === button));
    render();
  });
  search.addEventListener('input', () => { state.query = search.value.trim().toLowerCase(); state.page = 0; render(); });
  function turnPage(step) {
    state.page += step;
    render();
    grid.scrollIntoView({ block: 'start' });
  }
  more.addEventListener('click', () => turnPage(1));
  previousPage.addEventListener('click', () => turnPage(-1));
  grid.addEventListener('click', event => {
    const card = event.target.closest('[data-artifact]');
    if (!card) return;
    const group = groups.find(item => item.id === card.dataset.artifact);
    if (group) openGroup(group, card);
  });
  elements.thumbs.addEventListener('click', event => {
    const button = event.target.closest('[data-photo-index]');
    if (button) setPhoto(Number(button.dataset.photoIndex));
  });
  elements.previous.addEventListener('click', () => setPhoto(state.activePhoto - 1));
  elements.next.addEventListener('click', () => setPhoto(state.activePhoto + 1));
  elements.zoom.addEventListener('click', () => {
    if (state.scale > 1.01) resetZoom(); else { state.scale = 2.25; applyZoom(); }
  });
  elements.image.addEventListener('dblclick', () => {
    if (state.scale > 1.01) resetZoom(); else { state.scale = 2.25; applyZoom(); }
  });
  elements.stage.addEventListener('wheel', event => {
    if (!dialog.open) return;
    const next = Math.min(4, Math.max(1, state.scale + (event.deltaY < 0 ? .2 : -.2)));
    if (next === state.scale) return;
    event.preventDefault(); state.scale = next;
    if (state.scale === 1) resetZoom(); else applyZoom();
  }, { passive: false });
  elements.stage.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    if (state.scale <= 1.01) {
      state.swiping = true;
      state.swipeStartX = event.clientX;
      state.swipeStartY = event.clientY;
      return;
    }
    Object.assign(state, { dragging: true, pointerId: event.pointerId, dragStartX: event.clientX, dragStartY: event.clientY, dragOriginX: state.offsetX, dragOriginY: state.offsetY });
    elements.stage.setPointerCapture?.(event.pointerId); elements.stage.classList.add('is-dragging');
  });
  elements.stage.addEventListener('pointermove', event => {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    state.offsetX = state.dragOriginX + event.clientX - state.dragStartX;
    state.offsetY = state.dragOriginY + event.clientY - state.dragStartY;
    applyZoom();
  });
  const finishDrag = event => {
    if (state.swiping) {
      const dx = event.clientX - state.swipeStartX;
      const dy = event.clientY - state.swipeStartY;
      state.swiping = false;
      if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy)) setPhoto(state.activePhoto + (dx < 0 ? 1 : -1));
      return;
    }
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    state.dragging = false; elements.stage.classList.remove('is-dragging');
    if (elements.stage.hasPointerCapture?.(event.pointerId)) elements.stage.releasePointerCapture(event.pointerId);
    state.pointerId = null;
  };
  elements.stage.addEventListener('pointerup', finishDrag); elements.stage.addEventListener('pointercancel', finishDrag);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); setPhoto(state.activePhoto - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); setPhoto(state.activePhoto + 1); }
  });
  dialog.addEventListener('close', () => {
    elements.image.src = ''; resetZoom(); syncUrl(''); state.lastOpener?.focus?.({ preventScroll: true });
  });

  renderCounts(); render();
  const initialId = new URLSearchParams(window.location.search).get('item');
  const initialGroup = groups.find(group => group.id === initialId);
  if (initialGroup) requestAnimationFrame(() => openGroup(initialGroup, null, false));
})();
