(() => {
  'use strict';

  const root = document.querySelector('#bronze-use-atlas');
  const atlas = window.BAOJI_BRONZE_ATLAS;
  const visuals = window.BAOJI_BRONZE_ATLAS_VISUALS;
  const copyBook = window.BAOJI_BRONZE_ATLAS_COPY;
  if (!root || !atlas || !visuals || !copyBook) return;

  const track = root.querySelector('[data-atlas-track]');
  const viewport = root.querySelector('[data-atlas-viewport]');
  const previous = root.querySelector('[data-atlas-prev]');
  const next = root.querySelector('[data-atlas-next]');
  const card = root.querySelector('[data-atlas-card]');
  const dots = root.querySelector('[data-atlas-dots]');
  const counter = root.querySelector('[data-atlas-current]');
  const search = root.querySelector('[data-atlas-search]');
  const searchInput = root.querySelector('[data-atlas-search-input]');
  const searchOptions = root.querySelector('[data-atlas-search-options]');
  const groups = Array.isArray(window.BAOJI_PHOTO_INDEX?.groups) ? window.BAOJI_PHOTO_INDEX.groups : [];
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const typeById = new Map(atlas.types.map((type) => [type.id, type]));
  const copyBySlug = new Map((copyBook.records || []).map((record) => [record.slug, record.copy || {}]));
  const categoryById = new Map(atlas.categories.map((category) => [category.id, category]));
  const typesByCategory = new Map(atlas.categories.map((category) => [category.id, atlas.types.filter((type) => type.categoryId === category.id)]));
  const visualById = new Map(visuals.records.map((record) => [record.typeId, record]));
  const debugMode = new URLSearchParams(window.location.search).get(visuals.debugQuery || 'atlasDebug') === '1';
  root.classList.toggle('atlas-debug', debugMode);

  const bannedMeta = /先看|再看|最后|先从|再观察|最后追问|我们可以看到|这里展示|本页|本模块|读者|为了理解|读法|HOW TO READ|追问/iu;
  const legacyHistorical = {
    ding: [{ source: '《史记·封禅书》', quote: '禹收九牧之金，铸九鼎。' }],
    li: [{ source: '《说文解字》', quote: '鬲，鼎属也。' }],
    yan: [{ source: '《周礼·考工记》', quote: '陶人为甗，实二鬴。' }],
    gui: [{ source: '《诗经·秦风·权舆》', quote: '每食四簋。' }],
    dou: [{ source: '《左传·昭公三年》', quote: '四升为豆。' }],
    yu: [{ source: '《说文解字》', quote: '盂，饮器也。' }],
    jue: [{ source: '《礼记·明堂位》', quote: '夏后氏以琖，殷以斝，周以爵。' }],
    gu: [{ source: '《说文解字》', quote: '觚，乡饮酒之爵也。' }],
    zhi: [{ source: '《韩诗说》', quote: '三升曰觯。' }],
    zun: [{ source: '《诗经·鲁颂·閟宫》', quote: '牺尊将将。' }],
    you: [{ source: '《诗经·大雅·江汉》', quote: '厘尔圭瓒，秬鬯一卣。' }],
    hu: [{ source: '《礼记·少仪》', quote: '尊壶者面其鼻。' }],
    pan: [{ source: '《礼记·内则》', quote: '进盥，少者奉盘，长者奉水，请沃盥，盥卒授巾。' }],
    he: [{ source: '王国维《说盉》', quote: '盉者，盖和水于酒之器，所以节酒之厚薄者也。' }]
  };
  const mono = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const sentenceList = (value) => String(value || '').match(/[^。！？]+[。！？]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
  const publicText = (value) => sentenceList(value).filter((sentence) => !bannedMeta.test(sentence)).join('');

  function excerpt(value, sentenceCount = 3, maxLength = 430) {
    const text = sentenceList(publicText(value)).slice(0, sentenceCount).join('');
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  }

  function fileName(value) { return typeof value === 'string' ? value : value?.filename || value?.name || ''; }
  function localGroups(type) { return (type.localBaojiGroupIds || []).map((id) => groupById.get(id)).filter(Boolean); }
  function photoURL(group) {
    const filename = fileName(group?.featured).replace(/\.JPG$/i, '.jpg');
    return filename ? `assets/photos/thumbs/${encodeURIComponent(filename)}` : '';
  }
  function typeAssetURL(type) {
    const asset = visualById.get(type.id)?.asset || '';
    return asset ? `bronze-use-atlas/${asset}` : '';
  }
  function heroURL(type) {
    const category = categoryById.get(type.categoryId) || {};
    const asset = visualById.get(type.id)?.cardHeroAsset
      || type.visualAssetSet?.hero
      || type.visualAssetOverride
      || (type.visualAsset !== category.background ? type.visualAsset : '')
      || category.background
      || '';
    return asset ? `bronze-use-atlas/${asset}` : typeAssetURL(type);
  }

  function objectMarkup(type) {
    const visual = visualById.get(type.id);
    if (!visual) return '';
    const filename = visual.asset.split('/').pop();
    const scene = visuals.scenes?.[type.categoryId];
    if (scene?.backgroundContainsObjects && visual.sceneRect) {
      const rect = visual.sceneRect;
      return `<button class="atlas-object atlas-object--hotspot" type="button" data-type-id="${mono(type.id)}" style="--object-x:${rect.x}%;--object-y:${rect.y}%;--object-width:${rect.width}%;--object-height:${rect.height}%;--object-z:4" aria-label="打开${mono(type.nameZh)}完整器型卡">
        <span class="atlas-debug-label"><b>${mono(type.id)} · ${mono(type.nameZh)}</b><small>${mono(filename)}</small></span>
      </button>`;
    }
    return `<button class="atlas-object atlas-object--${mono(visual.framing)}" type="button" data-type-id="${mono(type.id)}" style="--object-x:${visual.scenePosition.x}%;--object-y:${visual.scenePosition.y}%;--object-width:${visual.sceneScale}%;--object-z:${visual.sceneZIndex}" aria-label="打开${mono(type.nameZh)}完整器型卡">
      <img src="bronze-use-atlas/${mono(visual.asset)}" alt="${mono(type.nameZh)} · ${mono(visual.canonicalForm)}" loading="lazy" />
      ${type.materialClass !== 'bronze' ? `<span class="atlas-material-badge">${mono(type.materialClass === 'mixed' ? 'STONE / JADE' : type.materialClass.toUpperCase())}</span>` : ''}
      <span class="atlas-debug-label"><b>${mono(type.id)} · ${mono(type.nameZh)}</b><small>${mono(filename)}</small></span>
    </button>`;
  }

  track.innerHTML = atlas.categories.map((category, index) => {
    const categoryTypes = typesByCategory.get(category.id) || [];
    const scene = visuals.scenes?.[category.id];
    const backgroundStyle = scene?.backgroundContainsObjects ? ` style="--atlas-scene-image:url('${mono(category.background)}')"` : '';
    return `<article class="atlas-slide atlas-slide--${mono(category.theme)}${scene?.backgroundContainsObjects ? ' atlas-slide--scene' : ''}"${backgroundStyle} aria-roledescription="slide" aria-label="${index + 1} / ${atlas.categories.length} · ${mono(category.nameZh)}">
      <div class="atlas-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="atlas-plate-label"><small>${String(index + 1).padStart(2, '0')} / ${String(categoryTypes.length).padStart(2, '0')} TYPES</small><h3>${mono(category.nameZh)}<span>${mono(category.nameEn)}</span></h3></div>
      <div class="atlas-object-layer">${categoryTypes.map((type) => objectMarkup(type)).join('')}</div>
    </article>`;
  }).join('');

  dots.innerHTML = atlas.categories.map((category, index) => `<button class="atlas-dot" type="button" data-atlas-index="${index}" aria-label="转到${mono(category.nameZh)}" aria-current="${index === 0}"></button>`).join('');
  searchOptions.innerHTML = atlas.types.map((type) => `<option value="${mono(type.nameZh)}">${mono(type.reading || type.romanization)} · ${mono(type.nameEn)}</option>`).join('');

  function actionDescription(action, type, useText) {
    const direct = sentenceList(publicText(useText)).find((sentence) => sentence.includes(action));
    if (direct) return direct;
    if (/受火|加热|煮|烹|温/.test(action)) return '热量由器底或受热部传入器腹，用于炊煮或温热。';
    if (/蒸/.test(action)) return '上下器体分层配合，蒸汽穿过内部通道加热食物。';
    if (/盛|贮|容|纳/.test(action)) return '器腹承担容纳，口沿与盖合结构控制盛放状态。';
    if (/注|斟|倾/.test(action)) return '器身倾斜后，液体由流口或口沿导出。';
    if (/挹|取/.test(action)) return '勺体或取用部探入容器，将液体或食物分取并转移。';
    if (/饮/.test(action)) return '口沿尺度与持握结构共同限定饮用姿态。';
    if (/提|携|持|奉/.test(action)) return '提梁、耳部或柄部承担持握与转移时的受力。';
    if (/悬|系/.test(action)) return '钮、耳或系孔连接外部构件并承担器体重量。';
    if (/击|奏|发声|和/.test(action)) return '槌击或摇动使器壁振动，并产生可传播的声音。';
    if (/量|校|定/.test(action)) return '器内容量、铭文与校准关系共同构成度量依据。';
    if (/承水|洗|接/.test(action)) return '器体承接上方注下的水，构成洗濯或转移过程。';
    if (/照/.test(action)) return '器面反射光线，背部钮或持握部控制照面角度。';
    if (/明|点燃|承油/.test(action)) return '燃料置于承托部，点燃后形成稳定光源。';
    if (/熏|散香|焚香/.test(action)) return '香料受热后，气流由镂孔或器口带出香气。';
    if (/驾|装|固|连接/.test(action)) return '孔、扣与接合面把构件固定在车舆、马具或建筑节点上。';
    if (/承|置|稳定|高置/.test(action)) return '足部、座面或承托构件抬高并稳定器身。';
    return `${action}由${type.nameZh}的器形、连接方式与具体使用语境共同限定。`;
  }

  function functionSpec(type, copy) {
    const map = {
      music: ['声音与声学', '器体、悬挂与击奏方式共同决定声音的产生与传播。'],
      measures: ['容量与度量', '容量、铭文与校准关系共同构成度量功能。'],
      'ritual-accessories': ['承置与取用', '承托、挹取、传递与奉持发生在器物组合之间。'],
      'daily-life': ['日常使用', '照面、照明、受热或散香等动作构成日常功能。'],
      'chariot-harness': ['装配与行用', '构件依附于车舆和马具系统，连接位置决定实际功能。'],
      architecture: ['连接与固定', '套接面、固定孔与受力方向共同形成建筑节点。'],
      other: ['对象功能', '持握、系挂、装饰与使用语境需按具体对象分别判断。']
    };
    const [title, fallback] = map[type.categoryId] || ['用途与内容', type.shortFunction];
    return { title, text: excerpt(copy['用途'], 3, 420) || fallback };
  }

  function ritualParagraphs(type, copy) {
    const sentences = sentenceList(publicText(copy['礼仪与制度']));
    if (sentences.length > 1) {
      const split = Math.ceil(sentences.length / 2);
      return [sentences.slice(0, split).join(''), sentences.slice(split).join('')].filter(Boolean).slice(0, 2);
    }
    const research = localGroups(type)[0]?.research || {};
    return [sentences.join('') || publicText(research.history || type.notes), publicText(research.significance || '')].filter(Boolean).slice(0, 2);
  }

  function relationButtons(type) {
    const relations = (type.relationTypeIds || []).map((id) => typeById.get(id)).filter(Boolean).slice(0, 6);
    return relations.map((relation) => `<button class="atlas-related-type" type="button" data-related-type="${mono(relation.id)}"><span>${mono(relation.nameZh)}</span><small>${mono(relation.romanization)}</small></button>`).join('');
  }

  function recordCards(type) {
    const records = localGroups(type).slice(0, 3);
    if (records.length) return records.map((group) => {
      const facts = group.labelFacts || {};
      const value = publicText(group.research?.significance || group.summary || group.description || '馆藏记录为器型判断提供可核对的对象材料。');
      return `<article class="atlas-object-record">
        <img src="${mono(photoURL(group))}" alt="${mono(group.title || type.nameZh)} · 宝鸡馆藏记录" loading="lazy" />
        <div><p class="atlas-record-code">BAOJI OBJECT / ${mono(group.id)}</p><h6>${mono(group.title || type.nameZh)}</h6>
        <dl><div><dt>年代</dt><dd>${mono(facts.period || group.era || '资料待核')}</dd></div><div><dt>出土地</dt><dd>${mono(facts.findspot || '资料待核')}</dd></div><div><dt>收藏单位</dt><dd>${mono(facts.collection || '中国青铜器博物院')}</dd></div></dl>
        <p>${mono(excerpt(value, 2, 240))}</p></div></article>`;
    }).join('');
    const sources = (type.sourceIds || []).map((id) => ({ id, source: atlas.sources?.[id] })).filter((item) => item.source && item.source.href).slice(0, 3);
    return sources.map(({ id, source }) => `<article class="atlas-reference-record"><p class="atlas-record-code">FORMAL REFERENCE / ${mono(id)}</p><h6>${mono(source.institution || '正式馆藏机构')}</h6><p>${mono(source.label || `${type.nameZh}的正式器例参照。`)}</p><a href="${mono(source.href)}" target="_blank" rel="noreferrer">查看来源 ↗</a></article>`).join('') || `<article class="atlas-reference-record"><h6>${mono(type.nameZh)} · 正式器例</h6><p>具体器例需结合正式馆藏目录与考古资料核对。</p></article>`;
  }

  function sourceLinks(type) {
    return (type.sourceIds || []).map((id) => ({ id, source: atlas.sources?.[id] })).filter((item) => item.source).map(({ id, source }) => source.href
      ? `<li><a href="${mono(source.href)}" target="_blank" rel="noreferrer"><span>${mono(id)}</span>${mono(source.label || source.institution)}</a></li>`
      : `<li><span><b>${mono(id)}</b>${mono(source.label || source.institution)}</span></li>`).join('');
  }

  function historicalPassages(copy, type) {
    const text = String(copy['史料记载'] || '');
    const passages = [];
    const pattern = /((?:《[^》]+》|[^。；，]{1,16}(?:铭文|诏书)))[^"“。]{0,32}["“]([^"”]+)["”]/g;
    for (const match of text.matchAll(pattern)) {
      const source = match[1].trim().replace(/^[，。；：:\s]+|[，。；：:\s]+$/g, '');
      const quote = match[2].trim();
      if (source && quote && !passages.some((item) => item.source === source && item.quote === quote)) passages.push({ source, quote });
      if (passages.length === 3) break;
    }
    return passages.length ? passages : (legacyHistorical[type.id] || []);
  }

  const contextualImageTypes = new Set(['ding', 'li', 'yan', 'gui', 'dou', 'yu', 'jue', 'gu', 'zhi', 'zun', 'you', 'hu', 'pan', 'he', 'jia', 'fangyi', 'fang-wine', 'zhong-wine', 'biannao', 'diaodou', 'ji-weapon', 'ge-weapon', 'yue-weapon', 'mao-weapon', 'jian-weapon', 'dao-weapon', 'nuji', 'zu-arrowhead']);

  function sectionImageAsset(type, imageKind) {
    const category = categoryById.get(type.categoryId) || {};
    const slug = type.slug || type.id;
    if (contextualImageTypes.has(slug)) return `assets/context/${slug}/${slug}-section-${imageKind}.png`;
    return type.visualAssetSet?.[imageKind]
      || type.visualAssetSet?.hero
      || type.visualAssetOverride
      || (type.visualAsset !== category.background ? type.visualAsset : '')
      || category.background
      || '';
  }

  function sectionOpen(type, section, imageKind = section, extraClass = '') {
    const classes = `atlas-card-section atlas-card-section-visual${extraClass ? ` ${extraClass}` : ''}`;
    const image = ` style="--atlas-section-image:url('${mono(sectionImageAsset(type, imageKind))}')"`;
    return `<section class="${classes}" data-card-section="${mono(section)}"${image}>`;
  }

  let current = 0;
  let wheelLocked = false;
  let pointerStart = null;
  let returnFocus = null;
  viewport.tabIndex = 0;

  function setQuery(typeId) {
    const url = new URL(window.location.href);
    if (typeId) url.searchParams.set('atlasType', typeId); else url.searchParams.delete('atlasType');
    url.hash = 'bronze-use-atlas';
    history.replaceState(null, '', url);
  }

  function clearHighlight() { root.querySelectorAll('.atlas-object.is-active').forEach((node) => node.classList.remove('is-active')); }
  function hotspotFor(typeId) { return Array.from(root.querySelectorAll('[data-type-id]')).find((node) => node.dataset.typeId === typeId) || null; }

  function closeCard(restoreFocus = true) {
    card.hidden = true;
    card.innerHTML = '';
    root.classList.remove('atlas-card-open');
    clearHighlight();
    setQuery('');
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
  }

  function update(index, options = {}) {
    current = Math.max(0, Math.min(atlas.categories.length - 1, index));
    track.style.transform = `translate3d(-${current * 100}%,0,0)`;
    counter.textContent = String(current + 1).padStart(2, '0');
    previous.disabled = current === 0;
    next.disabled = current === atlas.categories.length - 1;
    root.querySelectorAll('[data-atlas-index]').forEach((dot) => dot.setAttribute('aria-current', String(Number(dot.dataset.atlasIndex) === current)));
    if (!options.keepCard && !card.hidden) closeCard(false);
  }

  function renderCard(typeId, trigger) {
    const type = typeById.get(typeId);
    if (!type) return;
    const copy = copyBySlug.get(type.slug) || {};
    const research = localGroups(type)[0]?.research || {};
    const formText = excerpt(copy['形制与工艺'] || research.form, 3, 470) || `${type.nameZh}的器口、器腹、足部与连接部位共同构成基本形制。`;
    const useText = publicText(copy['使用方式']);
    const actions = (type.actionKeywords || []).slice(0, 4);
    const functionBlock = functionSpec(type, copy);
    const rituals = ritualParagraphs(type, copy);
    const combination = excerpt(copy['器物组合'] || research.significance, 3, 420) || `${type.nameZh}与相关器型共同构成功能分工和陈设组合。`;
    const historical = historicalPassages(copy, type);
    returnFocus = trigger || hotspotFor(typeId) || returnFocus;
    clearHighlight();
    hotspotFor(typeId)?.classList.add('is-active');
    card.innerHTML = `<button class="atlas-card-close" type="button" data-card-close aria-label="关闭完整器型卡">×</button>
      <div class="atlas-card-hero"><img src="${mono(heroURL(type))}" alt="${mono(type.nameZh)} canonical type visual" /><div class="atlas-card-hero-copy"><p class="atlas-card-kicker">${mono(type.categoryZh)} · ${mono(type.materialClass === 'bronze' ? 'CANONICAL VISUAL' : 'ADJACENT MATERIAL')}</p><h4>${mono(type.nameZh)}<span>${type.reading ? `读作 ${mono(type.reading)} · ` : ''}${mono(type.romanization)} · ${mono(type.nameEn)}</span></h4><p class="atlas-card-function">${mono(type.shortFunction)}</p><div class="atlas-card-badges"><span>${mono(type.materialClass.toUpperCase())}</span><span>${mono(type.inventoryStatus)}</span></div></div></div>
      <div class="atlas-card-intro">${type.quickGuide ? `<div class="atlas-card-quick-guide"><strong>器名小注</strong><p>${mono(type.quickGuide)}</p></div>` : ''}<p>${mono(excerpt(copy['总介绍'] || research.history || research.significance, 3, 450) || publicText(type.notes))}</p><div class="atlas-card-keywords">${(type.formKeywords || []).slice(0, 5).map((word) => `<span>${mono(word)}</span>`).join('')}</div></div>
      ${sectionOpen(type, 'form')}<h5>形制与工艺</h5><p>${mono(formText)}</p></section>
      ${sectionOpen(type, 'action')}<h5>器用与动作</h5><ol class="atlas-card-actions">${(actions.length ? actions : ['使用']).map((action) => `<li><strong>${mono(action)}</strong><span>${mono(actionDescription(action, type, useText))}</span></li>`).join('')}</ol></section>
      ${sectionOpen(type, 'function', 'contents')}<h5>${mono(functionBlock.title)}</h5><p>${mono(functionBlock.text)}</p><p class="atlas-card-facts">${mono((type.contentKeywords || []).join(' · '))}</p></section>
      ${sectionOpen(type, 'ritual', 'ritual', 'atlas-card-ritual')}<h5>礼仪与制度</h5>${rituals.map((paragraph) => `<p>${mono(paragraph)}</p>`).join('')}</section>
      ${sectionOpen(type, 'relations')}<h5>器物组合</h5><p>${mono(combination)}</p><div class="atlas-related-types">${relationButtons(type)}</div></section>
      <section class="atlas-card-section" data-card-section="records"><h5>代表器物</h5><div class="atlas-object-records">${recordCards(type)}</div></section>
      <section class="atlas-card-section atlas-card-history" data-card-section="history"><h5>史料</h5>${historical.map((item) => `<blockquote><p>${mono(item.quote)}</p><cite>出处：${mono(item.source)}</cite></blockquote>`).join('')}</section>`;
    card.hidden = false;
    card.scrollTop = 0;
    root.classList.add('atlas-card-open');
    setQuery(typeId);
  }

  function openType(typeId, trigger) {
    const type = typeById.get(typeId);
    if (!type) return;
    const categoryIndex = atlas.categories.findIndex((category) => category.id === type.categoryId);
    update(categoryIndex, { keepCard: true });
    renderCard(typeId, trigger || hotspotFor(typeId));
  }

  function findType(value) {
    const needle = String(value || '').trim().toLowerCase().replace(/[\s·/_-]/g, '');
    if (!needle) return null;
    return atlas.types.find((type) => [type.id, type.slug, type.nameZh, type.nameEn, type.romanization, type.reading].some((field) => String(field || '').toLowerCase().replace(/[\s·/_-]/g, '') === needle))
      || atlas.types.find((type) => [type.nameZh, type.nameEn, type.romanization, type.reading].some((field) => String(field || '').toLowerCase().replace(/[\s·/_-]/g, '').includes(needle)));
  }

  previous.addEventListener('click', () => update(current - 1));
  next.addEventListener('click', () => update(current + 1));
  dots.addEventListener('click', (event) => { const button = event.target.closest('[data-atlas-index]'); if (button) update(Number(button.dataset.atlasIndex)); });
  track.addEventListener('click', (event) => { const button = event.target.closest('[data-type-id]'); if (button) openType(button.dataset.typeId, button); });
  card.addEventListener('click', (event) => {
    if (event.target.closest('[data-card-close]')) { closeCard(true); return; }
    const relation = event.target.closest('[data-related-type]');
    if (relation) openType(relation.dataset.relatedType, hotspotFor(relation.dataset.relatedType));
  });
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    const type = findType(searchInput.value);
    if (type) { openType(type.id, hotspotFor(type.id)); searchInput.value = type.nameZh; }
  });

  viewport.addEventListener('wheel', (event) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 18) return;
    const direction = delta > 0 ? 1 : -1;
    const canMove = direction > 0 ? current < atlas.categories.length - 1 : current > 0;
    if (!canMove) return;
    event.preventDefault();
    if (wheelLocked) return;
    wheelLocked = true;
    update(current + direction);
    window.setTimeout(() => { wheelLocked = false; }, 650);
  }, { passive: false });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' && current > 0 && !event.target.closest('.atlas-type-card')) { event.preventDefault(); update(current - 1); }
    if (event.key === 'ArrowRight' && current < atlas.categories.length - 1 && !event.target.closest('.atlas-type-card')) { event.preventDefault(); update(current + 1); }
    if (event.key === 'Escape' && !card.hidden) closeCard(true);
  });
  viewport.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, y: event.clientY }; });
  viewport.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && current < atlas.categories.length - 1) update(current + 1);
    if (dx > 0 && current > 0) update(current - 1);
  });

  update(0);
  const requestedType = new URLSearchParams(window.location.search).get('atlasType');
  if (requestedType && typeById.has(requestedType)) requestAnimationFrame(() => { openType(requestedType, hotspotFor(requestedType)); root.scrollIntoView({ block: 'start' }); });
  root.dataset.atlasReady = 'true';
})();
