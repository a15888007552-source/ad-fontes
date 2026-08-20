(() => {
  'use strict';

  const data = window.BAOJI_DATA || { site: {}, treasures: [] };
  const photoData = window.BAOJI_PHOTO_INDEX || { sourceCount: 625, groups: [], photos: [] };
  const state = {
    filter: 'all',
    query: '',
    visible: 36,
    groups: Array.isArray(photoData.groups) ? photoData.groups : [],
  };
  let revealObserver = null;
  const revealSelector = '.section-heading, .profile-story, .stat-panel, .quick-review, .treasure-card, .archive-card, .method-copy, .source-column, .site-footer';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function observeReveals(root = document) {
    if (!revealObserver) return;
    $$(revealSelector, root).forEach((node, index) => {
      if (node.dataset.revealBound === 'true') return;
      node.dataset.revealBound = 'true';
      node.classList.add('reveal');
      if (node.classList.contains('archive-card') || node.classList.contains('treasure-card')) {
        node.style.setProperty('--reveal-delay', `${(index % 4) * 55}ms`);
      }
      revealObserver.observe(node);
    });
  }

  function initRevealEffects() {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    observeReveals();
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function filenameOf(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.filename || value.name || '';
  }

  function photoPath(value, kind = 'web') {
    if (!value) return '';
    if (typeof value === 'object') {
      if (kind === 'crop' && value.cropWeb) return value.cropWeb;
      if (kind === 'thumb' && value.cropThumb) return value.cropThumb;
      if (kind === 'thumb' && value.thumb) return value.thumb;
      if (kind === 'web' && value.web) return value.web;
      if (value.path) return value.path;
    }
    const filename = filenameOf(value).replace(/\.JPG$/i, '.jpg');
    const folder = kind === 'thumb' ? 'thumbs' : kind;
    return filename ? `assets/photos/${folder}/${filename}` : '';
  }

  function photoRole(role) {
    const roles = { front: '正面', side: '侧面', back: '背面', detail: '局部 / 铭文', label: '展签 / 介绍', environment: '展厅环境', other: '现场照片' };
    return roles[role] || role || '现场照片';
  }

  function treasureById(id) {
    return (data.treasures || []).find((item) => item.id === id);
  }

  function groupForTreasure(id) {
    return state.groups.find((group) => group.treasureId === id);
  }

  function objectPhoto(group) {
    const photos = group?.photos || [];
    const valid = (photo) => photo && !photo.isLabel && photo.role !== 'label' && photo.role !== 'environment';
    if (valid(group?.featured)) return group.featured;
    return photos.find(valid) || null;
  }

  function renderTreasureCards() {
    const target = $('#treasure-grid');
    if (!target) return;
    target.innerHTML = (data.treasures || []).map((item) => {
      const title = item.displayName || item.name;
      const secondary = item.displayName && item.displayName !== item.name ? item.name : item.pinyin;
      const image = photoPath(item.heroImage, 'web');
      return `<article class="treasure-card">
        <button class="treasure-image-button" type="button" data-treasure-id="${escapeHTML(item.id)}" aria-label="打开${escapeHTML(title)}详情">
          <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}现场照片" loading="lazy" decoding="async" />
          <span class="image-zoom-label">点击放大 / READ OBJECT</span>
        </button>
        <div class="treasure-copy">
          <div><span class="card-code">${escapeHTML(item.number)} / TREASURE INDEX</span><h3>${escapeHTML(title)}<small>${escapeHTML(secondary)}</small></h3><p class="card-category">${escapeHTML(item.category)}</p><p class="card-lead">${escapeHTML(item.lead)}</p><div class="card-protection"><span class="card-protection-label">为何列入禁止出境目录</span><p>${escapeHTML(item.protectionReason)}</p></div></div>
          <div class="card-bottom"><span class="card-status">${escapeHTML(item.status)}</span><span class="card-open">打开详情 ↗</span></div>
        </div>
      </article>`;
    }).join('');
  }

  function galleryForTreasure(item, group) {
    const values = [];
    [item.heroImage, item.inscriptionImage].forEach((filename) => {
      if (filename && !values.some((photo) => filenameOf(photo) === filename)) values.push(filename);
    });
    (group?.photos || []).forEach((photo) => {
      if (values.length >= 8) return;
      if (!values.some((current) => filenameOf(current) === filenameOf(photo))) values.push(photo);
    });
    return values;
  }

  function factsMarkup(item) {
    const facts = [
      ['年代', item.era],
      ['出土 / 来源', item.findspot],
      ['现藏', item.collection],
      ['尺寸', item.dimensions],
    ];
    return `<div class="dialog-facts">${facts.map(([label, value]) => `<div class="dialog-fact"><span class="dialog-fact-label">${escapeHTML(label)}</span><span class="dialog-fact-value">${escapeHTML(value)}</span></div>`).join('')}</div>`;
  }

  function galleryMarkup(values, mainValue, captionPrefix = '') {
    if (!values.length) return '<p class="dialog-image-caption">暂无可用照片</p>';
    const mainIndex = Math.max(0, values.findIndex((value) => filenameOf(value) === filenameOf(mainValue)));
    return `<div class="dialog-image-stack">
      <div class="zoom-stage" data-zoom-stage tabindex="0" aria-label="文物主图，可双击或使用滚轮缩放，放大后可拖动查看">
        <img class="dialog-main-image" data-main-image src="${escapeHTML(photoPath(mainValue, 'web'))}" alt="现场照片" draggable="false" />
        <span class="zoom-hint" aria-hidden="true">双击放大 · 滚轮缩放 · 拖动查看</span>
        <button class="zoom-reset" data-zoom-reset type="button" aria-label="重置图片视图">重置视图</button>
      </div>
      <p class="dialog-image-caption" data-main-caption>${escapeHTML(captionPrefix || `${photoRole(mainValue?.role)} · ${filenameOf(mainValue)}`)}</p>
      <div class="dialog-thumbs">${values.map((value, index) => `<button class="dialog-thumb${index === mainIndex ? ' is-active' : ''}" type="button" data-gallery-image="${escapeHTML(photoPath(value, 'web'))}" data-gallery-caption="${escapeHTML(`${photoRole(value.role)} · ${filenameOf(value)}`)}"><img src="${escapeHTML(photoPath(value, 'thumb'))}" alt="${escapeHTML(photoRole(value.role))}" loading="lazy" /></button>`).join('')}</div>
    </div>`;
  }

  function inscriptionMarkup(item) {
    const inscription = item.inscription || {};
    return `<section class="inscription-panel" aria-labelledby="inscription-title">
      <header><h3 id="inscription-title">铭文阅读层</h3><span>${escapeHTML(inscription.count || '代表性摘引')}</span></header>
      <div class="inscription-columns">
        <div class="inscription-cell"><h4>照片 / 铭文局部证据</h4><img class="inscription-image" src="${escapeHTML(photoPath(item.inscriptionImage, 'web'))}" alt="${escapeHTML(item.name)}铭文局部照片" /><p class="ocr-note">此处使用现场照片中的铭文局部；字形、反光和缺损以原片与正式整理本为准。</p></div>
        <div class="inscription-cell"><h4>释文 · 代表性摘引</h4><p>${escapeHTML(inscription.excerpt || '暂无代表性摘引')}</p></div>
        <div class="inscription-cell"><h4>释文大意</h4><p>${escapeHTML(inscription.translation || '暂无释文大意')}</p><p class="ocr-note"><b>阅读提示：</b>${escapeHTML(inscription.reading || '')}</p></div>
      </div>
    </section>`;
  }

  function sourcesMarkup(item) {
    return `<div class="dialog-sources">${(item.sources || []).map(([label, url]) => `<a href="${escapeHTML(url)}" target="_blank" rel="noreferrer">${escapeHTML(label)} ↗</a>`).join('')}</div>`;
  }

  function treasureEssayMarkup(item) {
    const body = [item.description, item.collectionNote].filter((value) => String(value || '').trim()).join(' ');
    return `<div class="research-essay treasure-essay"><p class="research-essay-paragraph research-essay-paragraph--opening">${escapeHTML(body)}</p><p class="research-essay-paragraph research-essay-paragraph--closing">${escapeHTML(item.significance || '')}</p><div class="dialog-tags">${(item.tags || []).map((tag) => `<span class="dialog-tag">${escapeHTML(tag)}</span>`).join('')}</div></div>`;
  }

  function cleanLabelValue(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function labelField(text, label) {
    const match = String(text || '').match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[：:]\\s*([^\\n]+)`, 'i'));
    return cleanLabelValue(match ? match[1] : '');
  }

  function labelEnglishType(text) {
    const lines = String(text || '').split(/\r?\n/).map(cleanLabelValue).filter(Boolean);
    return lines.find((line) => /^[A-Za-z][A-Za-z0-9 .,'()\/-]{5,}$/.test(line) && !/^(collection|excavated|shang|late|early|western|eastern|period|hometown|according)/i.test(line)) || '';
  }

  function labelArchiveMarkup(group) {
    const raw = String(group.labelText || '').trim();
    if (!raw) return '<section class="label-archive"><h3>展签档案</h3><p class="ocr-note">本组尚未识别出可稳定读取的展签文字；请先按照片顺序查看器物与展签。</p></section>';
    const fields = [
      ['时代', labelField(raw, '时代') || labelField(raw, '年代')],
      ['来源 / 出土', labelField(raw, '来源') || labelField(raw, '出土')],
      ['收藏单位', labelField(raw, '收藏单位')],
      ['英文类名', labelEnglishType(raw)],
    ].filter(([, value]) => value);
    const factMarkup = fields.length ? `<div class="label-facts">${fields.map(([label, value]) => `<div class="label-fact"><span class="label-fact-label">${escapeHTML(label)}</span><span class="label-fact-value">${escapeHTML(value)}</span></div>`).join('')}</div>` : '';
    return `<section class="label-archive"><h3>展签档案 · 现场证据</h3>${factMarkup}<p class="ocr-note">以下字段由展签照片 OCR 候选整理，只用于快速检阅；标题、时代、出土地点和收藏单位仍应回看原展签或正式图录。</p><details class="label-raw"><summary>展开原始展签候选</summary><pre>${escapeHTML(raw)}</pre></details></section>`;
  }

    function researchMarkup(group) {
    const research = group.research || {};
    const facts = group.labelFacts || {};
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const sectionMarkup = (label, value, extraClass = '') => {
      const text = clean(value);
      if (!text) return '';
      const modifier = extraClass ? ` ${extraClass}` : '';
      return `<section class="research-block${modifier}"><h3>${escapeHTML(label)}</h3><p class="research-essay-paragraph">${escapeHTML(text)}</p></section>`;
    };
    const factRows = [
      ['时代', facts.period],
      ['来源 / 出土', facts.findspot],
      ['收藏单位', facts.collection],
      ['尺寸', facts.dimensions],
    ].filter(([, value]) => clean(value));
    const factsMarkup = factRows.length
      ? `<div class="research-facts">${factRows.map(([label, value]) => `<div class="research-fact"><span>${escapeHTML(label)}</span><b>${escapeHTML(value)}</b></div>`).join('')}</div>`
      : '';
    const objectText = [research.form, research.decoration, research.inscription].map(clean).filter(Boolean).join(' ');
    const evidence = clean(research.evidence) || '现场展签字段与照片序列共同构成本条定名依据；正式释读请回看原图。';
    return `<div class="research-essay">${factsMarkup}${sectionMarkup('历史关联', research.history)}${sectionMarkup('形制与工艺', objectText)}${sectionMarkup('观看重点', research.viewing)}${sectionMarkup('资料价值', research.significance)}<p class="research-evidence"><b>资料边界</b>${escapeHTML(evidence)}</p></div>`;
  }
  function openTreasure(item) {
    if (!item) return;
    const group = groupForTreasure(item.id);
    const values = galleryForTreasure(item, group);
    const dialogContent = $('#dialog-content');
    if (!dialogContent) return;
    const title = item.displayName || item.name;
    dialogContent.innerHTML = `<div class="dialog-header"><div><p class="dialog-kicker">${escapeHTML(item.number)} / TREASURE INDEX · ${escapeHTML(item.category)}</p><h2 id="dialog-title">${escapeHTML(title)}<small>${escapeHTML(item.pinyin)}</small></h2></div><p class="dialog-lead">${escapeHTML(item.lead)}</p></div>
      ${factsMarkup(item)}
      <div class="dialog-body-grid"><div>${galleryMarkup(values, values[0], `点击缩略图切换现场证据 · ${filenameOf(values[0])}`)}</div><div class="dialog-copy">${treasureEssayMarkup(item)}</div></div>
      ${inscriptionMarkup(item)}
      ${group?.labelText ? `<p class="ocr-note">现场展签 OCR 候选：${escapeHTML(group.labelText)}。此段仅用于辅助检索，未把 OCR 结果直接当作正式释文。</p>` : ''}
      ${sourcesMarkup(item)}`;
    bindGallery();
    showDialog();
  }

  function genericSequenceMarkup(group) {
    const photos = (group.photos || []).slice(0, 8);
    if (!photos.length) return '';
    return `<div class="photo-sequence">${photos.map((photo) => `<figure><img src="${escapeHTML(photoPath(photo, 'thumb'))}" alt="${escapeHTML(group.title)} · ${escapeHTML(photoRole(photo.role))}" loading="lazy" /><figcaption>${escapeHTML(photoRole(photo.role))}${photo.cropThumb ? ' · 人工裁切' : ''}<br />${escapeHTML(filenameOf(photo))}</figcaption></figure>`).join('')}</div>`;
  }

  function openGroup(group) {
    if (!group) return;
    if (group.treasureId) {
      const item = treasureById(group.treasureId);
      if (item) {
        openTreasure(item);
        return;
      }
    }
    const dialogContent = $('#dialog-content');
    const photos = group.photos || [];
    const main = objectPhoto(group) || photos[0];
    const sequence = group.sequenceLabel || (group.sequenceStart ? `${group.sequenceStart}—${group.sequenceEnd}` : '现场照片');
    const unitNote = Number(group.unitCount || 1) > 1 ? `；同名器物合并 ${group.unitCount} 组现场照片` : '';
    dialogContent.innerHTML = `<div class="dialog-header"><div><p class="dialog-kicker">${escapeHTML(group.number || 'PHOTO GROUP')} / ${escapeHTML(group.categoryLabel || '其他器物')}</p><h2 id="dialog-title">${escapeHTML(group.title || '器物卡片')}<small>${escapeHTML(sequence)}</small></h2></div><p class="dialog-lead">${escapeHTML(group.summary || '现场展签与照片序列记录。')}${escapeHTML(unitNote)}</p></div>
      <div class="dialog-facts"><div class="dialog-fact"><span class="dialog-fact-label">类别</span><span class="dialog-fact-value">${escapeHTML(group.categoryLabel || '其他器物')}</span></div><div class="dialog-fact"><span class="dialog-fact-label">照片数</span><span class="dialog-fact-value">${photos.length} 张</span></div><div class="dialog-fact"><span class="dialog-fact-label">音乐重点</span><span class="dialog-fact-value">${group.musicFocus ? '是 · 乐器 / 礼乐' : '否'}</span></div><div class="dialog-fact"><span class="dialog-fact-label">证据状态</span><span class="dialog-fact-value">${escapeHTML(group.status || '现场展签 / 照片顺序')}</span></div></div>
      <div class="dialog-body-grid"><div>${galleryMarkup(photos, main, `现场顺序 · ${filenameOf(main)}`)}</div><div class="dialog-copy">${researchMarkup(group)}</div></div>
      ${genericSequenceMarkup(group)}`;
    bindGallery();
    showDialog();
  }

  function bindGallery() {
    $$('.dialog-thumb').forEach((button) => {
      button.addEventListener('click', () => {
        const main = $('[data-main-image]');
        const caption = $('[data-main-caption]');
        if (main) {
          main.src = button.dataset.galleryImage;
          main.alt = button.dataset.galleryCaption || '现场照片';
        }
        if (caption) caption.textContent = button.dataset.galleryCaption || '';
        $$('.dialog-thumb').forEach((item) => item.classList.toggle('is-active', item === button));
        const zoomStage = $('[data-zoom-stage]');
        if (zoomStage) zoomStage.dispatchEvent(new Event('zoom-reset'));
      });
    });
    bindZoom();
  }

  function bindZoom() {
    const stage = $('[data-zoom-stage]');
    const image = $('[data-main-image]');
    const resetButton = $('[data-zoom-reset]');
    if (!stage || !image) return;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function limitOffset() {
      const limitX = Math.max(0, (scale - 1) * stage.clientWidth * .52);
      const limitY = Math.max(0, (scale - 1) * stage.clientHeight * .52);
      offsetX = clamp(offsetX, -limitX, limitX);
      offsetY = clamp(offsetY, -limitY, limitY);
    }

    function render() {
      limitOffset();
      image.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
      stage.classList.toggle('is-zoomed', scale > 1.01);
      stage.setAttribute('aria-label', scale > 1.01
        ? `文物主图，当前放大${scale.toFixed(1)}倍，可拖动查看，双击还原`
        : '文物主图，可双击或使用滚轮缩放，放大后可拖动查看');
    }

    function resetZoom() {
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      render();
    }

    function finishDrag(event) {
      if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      pointerId = null;
    }

    stage.addEventListener('zoom-reset', resetZoom);
    stage.addEventListener('dblclick', (event) => {
      if (event.target.closest('[data-zoom-reset]')) return;
      event.preventDefault();
      if (scale > 1.01) resetZoom();
      else {
        scale = 2.2;
        render();
      }
    });
    stage.addEventListener('wheel', (event) => {
      const nextScale = clamp(scale + (event.deltaY < 0 ? .18 : -.18), 1, 4);
      if (nextScale === scale) return;
      event.preventDefault();
      scale = nextScale;
      render();
    }, { passive: false });
    stage.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || scale <= 1.01 || event.target.closest('[data-zoom-reset]')) return;
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      originX = offsetX;
      originY = offsetY;
      stage.classList.add('is-dragging');
      stage.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    stage.addEventListener('pointermove', (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      offsetX = originX + event.clientX - startX;
      offsetY = originY + event.clientY - startY;
      render();
      event.preventDefault();
    });
    stage.addEventListener('pointerup', finishDrag);
    stage.addEventListener('pointercancel', finishDrag);
    stage.addEventListener('keydown', (event) => {
      if (event.target.closest('[data-zoom-reset]') || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      if (scale > 1.01) resetZoom();
      else {
        scale = 2.2;
        render();
      }
    });
    resetButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      resetZoom();
    });
    render();
  }

  function showDialog() {
    const dialog = $('#detail-dialog');
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', 'open');
  }

  function closeDialog() {
    const dialog = $('#detail-dialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function groupMatches(group) {
    const filterMatch = state.filter === 'all' || (state.filter === 'music' ? group.musicFocus : group.category === state.filter);
    if (!filterMatch) return false;
    const query = state.query.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      group.title,
      group.categoryLabel,
      group.labelEvidence,
      group.summary,
      group.sequenceLabel,
      group.sequenceStart,
      group.sequenceEnd,
      ...Object.values(group.research || {}),
      ...(group.photos || []).map((photo) => filenameOf(photo)),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function filteredGroups() { return state.groups.filter(groupMatches); }

  function archiveCardMarkup(group) {
    const featured = objectPhoto(group);
    const music = group.musicFocus;
    const range = group.sequenceShortLabel || group.sequenceLabel || (group.sequenceStart ? `${group.sequenceStart}—${group.sequenceEnd}` : '现场');
    const cropNote = featured && featured.cropThumb ? ' · 裁切图' : '';
    const media = featured
      ? `<div class="archive-card-media"><img src="${escapeHTML(photoPath(featured, 'thumb'))}" alt="${escapeHTML(group.title || '现场照片')}" loading="lazy" decoding="async" /><span class="archive-card-label">${escapeHTML(`${range}${cropNote}`)}</span></div>`
      : `<div class="archive-card-media archive-card-media--evidence"><span>暂无器物主图</span><small>${escapeHTML(range)} · 仅保留现场证据</small></div>`;
    const unitNote = Number(group.unitCount || 1) > 1 ? ` · ${group.unitCount}组` : '';
    return `<article class="archive-card${music ? ' archive-card--music' : ''}${featured ? '' : ' archive-card--evidence'}"><button type="button" data-group-id="${escapeHTML(group.id)}" aria-label="打开${escapeHTML(group.title || '器物卡片')}详情">${media}<div class="archive-card-body"><div class="archive-card-top"><h3 title="${escapeHTML(group.title || '器物卡片')}">${escapeHTML(group.title || '器物卡片')}</h3>${music ? '<span class="music-badge">♫ MUSIC</span>' : ''}</div><div class="archive-card-meta"><span>${escapeHTML(group.categoryLabel || '其他器物')}</span><span>${(group.photos || []).length} 张${unitNote}</span></div><p class="archive-card-summary">${escapeHTML(group.summary || '现场器物照片按顺序归档')}</p></div></button></article>`;
  }

  function updateFilterCounts() {
    const counts = {
      all: state.groups.length,
      ritual: state.groups.filter((group) => group.category === 'ritual').length,
      music: state.groups.filter((group) => group.musicFocus).length,
      weapon: state.groups.filter((group) => group.category === 'weapon').length,
      jade: state.groups.filter((group) => group.category === 'jade').length,
      ceramic: state.groups.filter((group) => group.category === 'ceramic').length,
      architecture: state.groups.filter((group) => group.category === 'architecture').length,
      inscription: state.groups.filter((group) => group.category === 'inscription').length,
      other: state.groups.filter((group) => group.category === 'other' || group.category === 'environment').length,
    };
    Object.entries(counts).forEach(([key, count]) => {
      const node = document.querySelector(`[data-filter-count="${key}"]`);
      if (node) node.textContent = count;
    });
  }

  function renderArchive() {
    const target = $('#archive-grid');
    const more = $('#archive-more');
    if (!target) return;
    const groups = filteredGroups();
    const visible = groups.slice(0, state.visible);
    target.innerHTML = visible.length ? visible.map(archiveCardMarkup).join('') : '<div class="archive-empty">没有找到与当前筛选相符的器物照片。试试清空搜索词，或切换到“全部”。</div>';
    if (more) more.hidden = groups.length <= state.visible;
    const status = $('#archive-status');
    if (status) {
      const photoCount = groups.reduce((sum, group) => sum + (group.photos || []).length, 0);
      status.textContent = state.groups.length ? `已整理 ${state.groups.length} 个器物卡片 · 当前筛选 ${groups.length} 张卡片 / ${photoCount} 张照片 · 原片总数 ${photoData.sourceCount || 625} 张` : '照片目录正在生成；四件禁出文物详情已可先行阅读。';
    }
    $$('[data-group-id]', target).forEach((button) => button.addEventListener('click', () => openGroup(state.groups.find((group) => group.id === button.dataset.groupId))));
    observeReveals(target);
  }

  async function loadPhotoIndex() {
    if (state.groups.length) {
      updateFilterCounts();
      renderArchive();
      return;
    }
    try {
      const response = await fetch('data/photo-index.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remote = await response.json();
      if (Array.isArray(remote.groups)) state.groups = remote.groups;
      updateFilterCounts();
      renderArchive();
    } catch (error) {
      const status = $('#archive-status');
      if (status) status.textContent = '照片目录未加载；请通过本地服务器打开本专题，或先阅读四件禁出文物卡片。';
      renderArchive();
    }
  }

  function initDialog() {
    $('#treasure-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-treasure-id]');
      if (button) openTreasure(treasureById(button.dataset.treasureId));
    });
    $('[data-dialog-close]')?.addEventListener('click', closeDialog);
    $('#detail-dialog')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) closeDialog();
    });
  }

  function initFilters() {
    $$('#filter-list [data-filter]').forEach((button) => button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      state.visible = 36;
      $$('#filter-list [data-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
      renderArchive();
    }));
    $('#archive-search')?.addEventListener('input', (event) => {
      state.query = event.target.value;
      state.visible = 36;
      renderArchive();
    });
    $('#load-more')?.addEventListener('click', () => {
      state.visible += 36;
      renderArchive();
    });
  }

  function initHeader() {
    const header = $('[data-header]');
    const progress = $('.scroll-progress span');
    if (!header && !progress) return;
    let frame = 0;
    const update = () => {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 32);
      if (progress) {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
      }
      frame = 0;
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  }

  function initIntro() {
    const intro = $('.intro-curtain');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!intro || reduced) {
      document.body.classList.add('intro-complete');
      intro?.remove();
      return;
    }
    const finish = (event) => {
      if (event.target !== intro || event.animationName !== 'intro-curtain-fade') return;
      document.body.classList.add('intro-complete');
      intro.removeEventListener('animationend', finish);
      intro.remove();
    };
    intro.addEventListener('animationend', finish);
  }

  function scheduleArchiveInit() {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => loadPhotoIndex(), reduced ? 0 : 2250);
  }

  function init() {
    initIntro();
    renderTreasureCards();
    initDialog();
    initFilters();
    initHeader();
    initRevealEffects();
    updateFilterCounts();
    scheduleArchiveInit();
    observeReveals();
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
