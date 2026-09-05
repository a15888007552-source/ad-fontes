(() => {
  'use strict';

  const data = window.BAOJI_DATA || { site: {}, treasures: [] };
  const highlights = window.MuseumHighlights.create("baoji");
  const photoData = window.BAOJI_PHOTO_INDEX || { sourceCount: 625, groups: [], photos: [] };
  const unavailablePhotoNames = new Set([
    'DSC_3390.JPG',
    'DSC_3619.JPG',
    'DSC_3875.JPG',
    'DSC_3881.JPG',
  ]);
  const groupVisualFallbacks = Object.freeze({
    'photo-group-3619': {
      path: 'assets/generated/fallback-zuyi-gui-v1.webp',
      label: '本条目暂无器物本体影像',
    },
    'photo-group-3881': {
      path: 'assets/generated/fallback-pottery-weight-v1.webp',
      label: '本条目暂无器物本体影像',
    },
  });
  const state = {
    filter: 'all',
    query: '',
    visible: 36,
    groups: highlights.apply(Array.isArray(photoData.groups) ? photoData.groups : []),
  };
  let revealObserver = null;
  let activeDetailId = null;
  let lastFocusedElement = null;
  let restoreFocusAfterDialogClose = true;
  let introDeferred = false;
  let introInitialized = false;
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

  function photoIsAvailable(photo) {
    const filename = filenameOf(photo).toUpperCase();
    return Boolean(filename) && !unavailablePhotoNames.has(filename);
  }

  function availableGroupPhotos(group) {
    return (group?.photos || []).filter(photoIsAvailable);
  }

  function groupVisualFallback(group) {
    return groupVisualFallbacks[group?.id] || null;
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

  function detailById(id) {
    const key = String(id || '');
    const treasure = treasureById(key);
    if (treasure) {
      return {
        type: 'treasure',
        id: treasure.id,
        treasure,
        group: groupForTreasure(treasure.id) || null,
      };
    }
    const group = state.groups.find((item) => item.id === key) || null;
    if (!group) return null;
    if (group.treasureId) {
      const linkedTreasure = treasureById(group.treasureId);
      if (linkedTreasure) {
        return {
          type: 'treasure',
          id: linkedTreasure.id,
          treasure: linkedTreasure,
          group,
        };
      }
    }
    return {
      type: 'group',
      id: group.id,
      group,
      treasure: null,
    };
  }

  function getDetailFromLocation() {
    const id = new URLSearchParams(window.location.search).get('item');
    return id ? detailById(id) : null;
  }

  function syncItemToUrl(id) {
    const url = new URL(window.location.href);
    const current = url.searchParams.get('item');
    if (id) {
      const next = String(id);
      if (current === next) return;
      url.searchParams.set('item', next);
    } else {
      if (!current) return;
      url.searchParams.delete('item');
    }
    window.history.pushState(
      { item: id ? String(id) : null },
      '',
      url.pathname + url.search + url.hash
    );
  }

  function objectPhoto(group) {
    const photos = availableGroupPhotos(group);
    const valid = (photo) => photo && !photo.isLabel && photo.role !== 'label' && photo.role !== 'environment';
    if (photoIsAvailable(group?.featured) && valid(group.featured)) return group.featured;
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

  function detailArchiveField(label, value, keepSlot = false) {
    const normalized = value == null ? "" : String(value).trim();
    if (!normalized && keepSlot) return '<div class="detail-archive-field" hidden aria-hidden="true"></div>';
    if (!normalized) return "";
    return '<div class="detail-archive-field"><span class="detail-archive-label">'
      + escapeHTML(label)
      + '</span><strong class="detail-archive-value">'
      + escapeHTML(normalized)
      + '</strong></div>';
  }

  function detailArchiveMarkup(item, extraFields = []) {
    const objectNo = item.number ? "BRZ-" + item.number : item.id;
    const archiveFields = [
      ["文物编号", objectNo],
      ["类别", item.category || item.categoryLabel],
      ["时代", item.era],
      ["材质", item.material],
      ["出土地点", item.findspot],
      ["尺寸", item.dimensions],
    ];
    return '<section class="detail-archive-fields" aria-label="文物档案">'
      + '<h3 class="detail-archive-heading"><span>ARTIFACT ARCHIVE</span><small>文物档案</small></h3>'
      + '<div class="detail-archive-grid">'
      + archiveFields.map(([label, value]) => detailArchiveField(label, value, true)).join("")
      + extraFields.map(([label, value]) => detailArchiveField(label, value)).join("")
      + '</div></section>';
  }


  function galleryMarkup(values, mainValue, captionPrefix = '', fallback = null, title = '') {
    if (!values.length && fallback) {
      return `<div class="dialog-image-stack dialog-image-stack--fallback">
        <div class="zoom-stage zoom-stage--fallback" style="--fallback-art:url('${escapeHTML(fallback.path)}')" role="img" aria-label="${escapeHTML(`${title}：本条目暂无器物本体影像`)}">
          <span class="dialog-fallback-note">${escapeHTML(fallback.label)}</span>
        </div>
        <p class="dialog-image-caption">条目信息据现场展签著录，具体形制仍待其他材料核对</p>
      </div>`;
    }
    if (!values.length) return '<p class="dialog-image-caption">本条目暂无器物本体影像</p>';
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
    const clean = (value) => String(value || '')
      .split(String.fromCharCode(10)).join(' ')
      .split(String.fromCharCode(13)).join(' ')
      .split('  ').join(' ')
      .trim();
    const stripLeadPunctuation = (value) => String(value || '')
      .replace(/^[\s:：，,、；;。．·—–-]+/, '')
      .trim();
    const stripTitle = (value) => {
      let text = clean(value);
      const prefixes = [clean(group.title), '此鼎：', '此器：', '本件：', '此物：'].filter(Boolean);
      prefixes.some((prefix) => {
        if (!text.startsWith(prefix)) return false;
        text = stripLeadPunctuation(text.slice(prefix.length));
        if (prefix === clean(group.title) && text.startsWith('的')) text = text.slice(1).trim();
        return true;
      });
      ['历史信息：', '历史关联：', '形制与工艺：', '形制：', '工艺：', '观看重点：', '资料价值：'].some((prefix) => {
        if (!text.startsWith(prefix)) return false;
        text = stripLeadPunctuation(text.slice(prefix.length));
        return true;
      });
      return stripLeadPunctuation(text);
    };
    const isTemplate = (value, needles) => {
      const text = clean(value);
      return !text || needles.some((needle) => text.includes(needle));
    };
    const genericHistory = ['卡片名称取自后置介绍牌', '宝鸡青铜文明的现场序列'];
    const genericObject = ['本组照片保留', '形制判断以器身轮廓', '纹饰和可能的刻划应以局部照片为准', '本组没有稳定可核对的铭文释文'];
    const genericViewing = ['先看主图建立整体轮廓', '照片编号区分不同现场单元'];
    const genericSignificance = ['价值不只在于“年代久远”'];
    const typeNote = (title) => {
      const text = clean(title);
      const notes = [
        {
          token: '甗',
          opening: '甗由上部甑和下部鬲组合而成，炊煮功能可从两部分的连接、箅孔与足部观察；具体用途仍要结合器形和出土组合判断。',
          viewing: '先看甑、鬲两部分的连接和箅孔，再看鬲足、耳部以及纹饰分布。'
        },
        {
          token: '鬲',
          opening: '鬲以袋足、腹部和口沿为主要识别部位，袋足有利于直接受火；用途判断应结合足部形态、器壁和同出器物。',
          viewing: '按口沿、腹部、袋足的顺序查看，再放大足部连接和纹饰。'
        },
        {
          token: '鼎',
          opening: '鼎以腹、耳、足为主要识别部位，基本用途可从炊煮或盛食讨论；是否承担祭祀功能，要结合器形、铭文和出土组合判断。',
          viewing: '按腹、耳、足的顺序查看，再放大纹带和可能的铭文位置。'
        },
        {
          token: '簋',
          opening: '簋是盛放黍稷等熟食的礼器，圈足、腹部、耳部和盖钮是判断形制的关键；礼仪位置还要结合铭文与组合关系说明。',
          viewing: '先看腹部与圈足，再看耳部、盖钮和纹饰是否连续。'
        },
        {
          token: '觚',
          opening: '觚以细长器身、喇叭形口沿和高圈足为主要特征，常见于酒礼器组合；具体年代以展签和器形比较为准。',
          viewing: '从口沿向下看器身收放，再看圈足、纹带和局部磨损。'
        },
        {
          token: '爵',
          opening: '爵的流、尾、鋬和三足共同构成器形，通常从温酒或饮酒礼器讨论；用途与礼制位置不能只凭单张照片确定。',
          viewing: '先看流、尾和鋬的关系，再看三足、柱与纹饰。'
        },
        {
          token: '尊',
          opening: '尊以较大的腹部、口沿和圈足构成基本形制，常用于酒礼语境；器类和时代仍需与展签、纹饰及组合材料互证。 ',
          viewing: '先看口沿、腹部和圈足，再放大肩部纹饰与可能的铭文。'
        },
        {
          token: '卣',
          opening: '卣是有提梁的酒器，提梁、盖、腹部和圈足是观察重点；是否属于特定礼仪组合，需结合出土信息判断。',
          viewing: '按提梁、盖、腹部、圈足的顺序查看，再看器身纹饰。'
        },
        {
          token: '罍',
          opening: '罍以较大的腹部、肩部和圈足构成器形，常在酒礼和储酒语境中讨论；纹饰与铭文有助于缩小判断范围。',
          viewing: '先看器身比例，再看肩部、圈足和纹带的连接。'
        },
        {
          token: '壶',
          opening: '壶的口、颈、肩、腹和圈足共同决定器形，功能需在盛酒、储液等可能性之间结合器形与组合判断。',
          viewing: '按口沿、颈部、肩部、腹部和圈足顺序观察，再看纹饰。'
        },
        {
          token: '盘',
          opening: '盘以浅腹、折沿和圈足为主要形制线索，可能与盥洗或礼仪使用有关；具体功能应以器形和出土组合为依据。',
          viewing: '先看盘面、折沿和腹部，再看圈足、底部与铭文位置。'
        },
        {
          token: '盂',
          opening: '盂以宽口、深腹和圈足构成基本形制，盛水、盛食或礼仪用途需要结合器形和组合判断。',
          viewing: '从口沿向腹部观察器身比例，再看圈足和内外纹饰。'
        },
        {
          token: '钟',
          opening: '钟的扁体、枚、篆带和钲部是判断形制与悬挂方式的主要线索；音列和编钟关系不能只凭一件器物推定。',
          viewing: '先看钟体正侧面，再看枚、篆带、钲部和铭文局部。'
        },
        {
          token: '铙',
          opening: '铙以钟体、口沿和悬挂部位为主要观察对象，使用方式需结合器形、尺寸和同出器物判断。',
          viewing: '先看钟体与口沿，再看悬挂部位、枚饰和铭文。'
        },
        {
          token: '戈',
          opening: '戈由援、内和穿等部位构成，刃部与装柄方式是判断其功能的关键；具体使用情境仍需结合出土信息。',
          viewing: '按援、内、穿的顺序查看，再放大刃部和铸造痕迹。'
        },
        {
          token: '剑',
          opening: '剑的剑身、脊、刃部和柄部共同构成形制，长度与装具可帮助讨论其使用方式；年代以展签和比较材料为准。',
          viewing: '先看剑身整体，再看脊、刃部、柄部和装具残留。'
        },
        {
          token: '镞',
          opening: '镞的锋、翼、铤或穿是观察和分类的主要部位，具体配属的箭杆与使用场景不能仅凭器体确定。',
          viewing: '先看锋部和翼部，再看铤、穿及表面锈蚀。'
        },
        {
          token: '矛',
          opening: '矛以骹、叶和锋部为主要形制线索，装柄方式可从骹部和穿孔观察；战斗或仪仗用途需要材料互证。',
          viewing: '按锋、叶、骹的顺序观察，再看穿孔、刃部和锈蚀。'
        },
        {
          token: '戟',
          opening: '戟兼具刺击与勾杀的形制线索，援、刺和内部连接关系是观察重点；具体组合关系需结合出土资料。',
          viewing: '先看刺、援和内的连接，再看刃部和装柄部位。'
        },
        {
          token: '镜',
          opening: '铜镜主要从镜面、镜背、钮和纹饰带观察，纹样与钮座可用于器类和时代比较；功能解释不超出照片与展签信息。',
          viewing: '先看镜面与镜背，再放大钮座、纹饰带和边缘。'
        },
        {
          token: '璧',
          opening: '璧以扁平圆体和中央穿孔为基本形制，玉质、孔壁和边缘加工可用于观察制作与使用痕迹。',
          viewing: '先看整体轮廓与孔部，再看边缘、表面和局部磨痕。'
        },
        {
          token: '玉',
          opening: '玉器的材质、形制和穿孔或切割痕迹是可见的判断线索；用途与身份需结合展签和同出关系说明。',
          viewing: '先看轮廓、孔部和厚薄，再放大边缘加工与表面痕迹。'
        }
      ];
      return notes.find((note) => text.includes(note.token)) || null;
    };
    const factRows = [
      ['时代', facts.period],
      ['来源 / 出土', facts.findspot],
      ['收藏单位', facts.collection],
      ['尺寸', facts.dimensions],
    ].filter(([, value]) => clean(value));
    const factsMarkup = factRows.length
      ? '<div class="research-facts">' + factRows.map(([label, value]) => '<div class="research-fact"><span>' + escapeHTML(label) + '</span><b>' + escapeHTML(value) + '</b></div>').join('') + '</div>'
      : '';
    const history = stripTitle(research.history);
    const objectText = [research.form, research.decoration, research.inscription]
      .map(stripTitle)
      .filter((value) => value && !isTemplate(value, genericObject))
      .join(' ');
    const note = typeNote(group.title);
    const firstParts = [];
    if (history && !isTemplate(history, genericHistory)) firstParts.push(history);
    if (objectText) firstParts.push(objectText);
    if (!firstParts.length && note) firstParts.push(note.opening);
    const factBits = [];
    if (clean(facts.period)) factBits.push('展签所示时代为' + clean(facts.period));
    if (clean(facts.findspot)) factBits.push('来源记录为' + clean(facts.findspot));
    if (factBits.length) firstParts.push(factBits.join('；') + '。');
    if (!firstParts.length) firstParts.push('这件器物的现场记录以展签、照片顺序和可见形制为限。');
    const viewing = stripTitle(research.viewing);
    const significance = stripTitle(research.significance);
    const secondParts = [];
    if (viewing && !isTemplate(viewing, genericViewing)) secondParts.push(viewing);
    if (significance && !isTemplate(significance, genericSignificance)) secondParts.push(significance);
    if (!secondParts.length && note) secondParts.push(note.viewing);
    if (!secondParts.length) secondParts.push('照片按现场拍摄顺序保留，器物图与展签图分开读取；需要确认的名称和铭文应回看原图。');
    let evidence = clean(research.evidence)
      .split('名称依据后置介绍牌与照片顺序校正。').join('')
      .split('名称依据后置介绍牌与照片顺序校正').join('')
      .trim();
    if (!evidence) evidence = '展签照片与器物照片共同用于核对本条名称、时代和来源；具体铭文释读仍需对照清晰拓片或正式图录。';
    return '<div class="research-essay">' + factsMarkup
      + '<p class="research-essay-paragraph research-essay-paragraph--opening">' + escapeHTML(firstParts.join(' ')) + '</p>'
      + '<p class="research-essay-paragraph research-essay-paragraph--closing">' + escapeHTML(secondParts.join(' ')) + '</p>'
      + '<p class="research-evidence"><b>资料边界</b>' + escapeHTML(evidence) + '</p></div>';
  }

  function openTreasure(item, {
    syncUrl = false,
    focusClose = true,
    rememberFocus = true,
  } = {}) {
    if (!item) return;
    const group = groupForTreasure(item.id);
    const reviewed = group && highlights.get(group);
    if (reviewed) item = {...item, displayName: reviewed.canonical_title, lead: reviewed.card_tagline, description: reviewed.intro, sources: [...(item.sources || []), ...reviewed.sources.map(source => [source.title, source.url])]};
    const values = galleryForTreasure(item, group);
    const dialogContent = $('#dialog-content');
    if (!dialogContent) return;
    activeDetailId = item.id;
    const title = item.displayName || item.name;
    dialogContent.innerHTML = `<div class="dialog-header"><div><p class="dialog-kicker">${escapeHTML(item.number)} / TREASURE INDEX · ${escapeHTML(item.category)}</p><h2 id="dialog-title">${escapeHTML(title)}<small>${escapeHTML(item.pinyin)}</small></h2></div><p class="dialog-lead">${escapeHTML(item.lead)}</p></div>
      ${detailArchiveMarkup(item, [["COLLECTION / 现藏", item.collection]])}
      <div class="dialog-body-grid"><div>${galleryMarkup(values, values[0], `点击缩略图切换现场证据 · ${filenameOf(values[0])}`)}</div><div class="dialog-copy">${treasureEssayMarkup(item)}</div></div>
      ${inscriptionMarkup(item)}
      ${group?.labelText ? `<p class="ocr-note">现场展签 OCR 候选：${escapeHTML(group.labelText)}。此段仅用于辅助检索，未把 OCR 结果直接当作正式释文。</p>` : ''}
      ${sourcesMarkup(item)}`;
    bindGallery();
    showDialog({
      itemId: item.id,
      syncUrl,
      focusClose,
      rememberFocus,
    });
  }

  function genericSequenceMarkup(group, values = availableGroupPhotos(group)) {
    const photos = values.slice(0, 8);
    if (!photos.length) return '';
    return `<div class="photo-sequence">${photos.map((photo) => `<figure><img src="${escapeHTML(photoPath(photo, 'thumb'))}" alt="${escapeHTML(group.title)} · ${escapeHTML(photoRole(photo.role))}" loading="lazy" /><figcaption>${escapeHTML(photoRole(photo.role))}${photo.cropThumb ? ' · 人工裁切' : ''}<br />${escapeHTML(filenameOf(photo))}</figcaption></figure>`).join('')}</div>`;
  }

  function openGroup(group, {
    syncUrl = false,
    focusClose = true,
    rememberFocus = true,
  } = {}) {
    if (!group) return;
    if (group.treasureId) {
      const item = treasureById(group.treasureId);
      if (item) {
        openTreasure(item, { syncUrl, focusClose, rememberFocus });
        return;
      }
    }
    const dialogContent = $('#dialog-content');
    activeDetailId = group.id;
    const photos = availableGroupPhotos(group);
    const main = objectPhoto(group) || photos[0] || null;
    const fallback = groupVisualFallback(group);
    const sequence = group.sequenceLabel || (group.sequenceStart ? `${group.sequenceStart}—${group.sequenceEnd}` : '现场照片');
    const unitNote = Number(group.unitCount || 1) > 1 ? `；同名器物合并 ${group.unitCount} 组现场照片` : '';
    dialogContent.innerHTML = `<div class="dialog-header"><div><p class="dialog-kicker">${escapeHTML(group.number || 'PHOTO GROUP')} / ${escapeHTML(group.categoryLabel || '其他器物')}</p><h2 id="dialog-title">${escapeHTML(group.title || '器物卡片')}<small>${escapeHTML(sequence)}</small></h2></div><p class="dialog-lead">${escapeHTML(group.summary || '现场展签与照片序列记录。')}${escapeHTML(unitNote)}</p></div>
      <div class="dialog-facts"><div class="dialog-fact"><span class="dialog-fact-label">类别</span><span class="dialog-fact-value">${escapeHTML(group.categoryLabel || '其他器物')}</span></div><div class="dialog-fact"><span class="dialog-fact-label">照片数</span><span class="dialog-fact-value">${photos.length} 张</span></div><div class="dialog-fact"><span class="dialog-fact-label">音乐重点</span><span class="dialog-fact-value">${group.musicFocus ? '是 · 乐器 / 礼乐' : '否'}</span></div><div class="dialog-fact"><span class="dialog-fact-label">证据状态</span><span class="dialog-fact-value">${escapeHTML(group.status || '现场展签 / 照片顺序')}</span></div></div>
      <div class="dialog-body-grid"><div>${galleryMarkup(photos, main, main ? `现场顺序 · ${filenameOf(main)}` : '', fallback, group.title || '器物条目')}</div><div class="dialog-copy">${researchMarkup(group)}</div></div>
      ${genericSequenceMarkup(group, photos)}
      ${group.highlightSources?.length ? sourcesMarkup({sources: group.highlightSources}) : ''}`;
    const groupFacts = dialogContent.querySelector(".dialog-facts");
    if (groupFacts) groupFacts.outerHTML = detailArchiveMarkup(group, [["PHOTO / 照片数", `${photos.length} 张`], ["CONTEXT / 音乐重点", group.musicFocus ? '是 · 乐器 / 礼乐' : '否'], ["EVIDENCE / 证据状态", group.status || '现场展签 / 照片顺序']]);
    bindGallery();
    showDialog({
      itemId: group.id,
      syncUrl,
      focusClose,
      rememberFocus,
    });
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

  function showDialog({
    itemId = null,
    syncUrl = false,
    focusClose = true,
    rememberFocus = true,
  } = {}) {
    const dialog = $('#detail-dialog');
    if (!dialog) return;
    const dialogAlreadyOpen = dialog.open || dialog.hasAttribute('open');
    if (rememberFocus) lastFocusedElement = document.activeElement;
    else lastFocusedElement = null;
    if (!dialogAlreadyOpen) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', 'open');
    }
    if (itemId) activeDetailId = String(itemId);
    if (focusClose) dialog.querySelector('[data-dialog-close]')?.focus();
    if (syncUrl && itemId) syncItemToUrl(itemId);
  }

  function handleDialogClose() {
    activeDetailId = null;
    const restore = restoreFocusAfterDialogClose ? lastFocusedElement : null;
    lastFocusedElement = null;
    restoreFocusAfterDialogClose = true;
    if (restore && typeof restore.focus === 'function') restore.focus();
  }

  function closeDialog({
    syncUrl = false,
    restoreFocus = true,
  } = {}) {
    const dialog = $('#detail-dialog');
    if (!dialog) return;
    const dialogIsOpen = dialog.open || dialog.hasAttribute('open');
    if (!dialogIsOpen) return;
    restoreFocusAfterDialogClose = restoreFocus;
    if (syncUrl) syncItemToUrl(null);
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      handleDialogClose();
    }
  }

  function openDetailFromLocation({ focusClose = false } = {}) {
    const detail = getDetailFromLocation();
    if (!detail) {
      closeDialog({
        syncUrl: false,
        restoreFocus: false,
      });
      return false;
    }
    const dialog = $('#detail-dialog');
    const dialogIsOpen = dialog?.open || dialog?.hasAttribute('open');
    if (dialogIsOpen && activeDetailId === detail.id) return true;
    if (detail.type === 'treasure') {
      openTreasure(detail.treasure, {
        syncUrl: false,
        focusClose,
        rememberFocus: false,
      });
    } else {
      openGroup(detail.group, {
        syncUrl: false,
        focusClose,
        rememberFocus: false,
      });
    }
    return true;
  }

  function groupMatches(group) {
    const filterMatch = state.filter === 'all' || (state.filter === 'music' ? group.musicFocus : group.category === state.filter);
    if (!filterMatch) return false;
    const query = state.query.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      group.title,
      highlights.aliases(group),
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

  function filteredGroups() { return highlights.select(state.groups.filter(groupMatches), {query: state.query, filtered: state.filter !== "all"}); }

  function archiveCardMarkup(group) {
    if (group._editorialOnly) return highlights.card(group);
    const featured = objectPhoto(group);
    const availablePhotos = availableGroupPhotos(group);
    const fallback = groupVisualFallback(group);
    const music = group.musicFocus;
    const range = group.sequenceShortLabel || group.sequenceLabel || (group.sequenceStart ? `${group.sequenceStart}—${group.sequenceEnd}` : '现场');
    const cropNote = featured && featured.cropThumb ? ' · 裁切图' : '';
    const media = featured
      ? `<div class="archive-card-media"><img src="${escapeHTML(photoPath(featured, 'thumb'))}" alt="${escapeHTML(group.title || '现场照片')}" loading="lazy" decoding="async" /><span class="archive-card-label">${escapeHTML(`${range}${cropNote}`)}</span></div>`
      : fallback
        ? `<div class="archive-card-media archive-card-media--fallback" style="--fallback-art:url('${escapeHTML(fallback.path)}')" role="img" aria-label="${escapeHTML(`${group.title || '器物条目'}：本条目暂无器物本体影像`)}"><span class="archive-card-fallback-note">${escapeHTML(fallback.label)}</span><span class="archive-card-label">${escapeHTML(range)}</span></div>`
      : `<div class="archive-card-media archive-card-media--evidence"><span>暂无器物主图</span><small>${escapeHTML(range)} · 仅保留现场证据</small></div>`;
    const unitNote = Number(group.unitCount || 1) > 1 ? ` · ${group.unitCount}组` : '';
    return `<article class="archive-card${music ? ' archive-card--music' : ''}${featured || fallback ? '' : ' archive-card--evidence'}"><button type="button" data-group-id="${escapeHTML(group.id)}" aria-label="打开${escapeHTML(group.title || '器物卡片')}详情">${media}<div class="archive-card-body"><div class="archive-card-top"><h3 title="${escapeHTML(group.title || '器物卡片')}">${escapeHTML(group.title || '器物卡片')}</h3>${music ? '<span class="music-badge">♫ MUSIC</span>' : ''}</div><div class="archive-card-meta"><span>${escapeHTML(group.categoryLabel || '其他器物')}</span><span>${availablePhotos.length} 张${unitNote}</span></div>${highlights.badge(group)}<p class="archive-card-summary">${escapeHTML(group.summary || '现场器物照片按顺序归档')}</p></div></button></article>`;
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
    highlights.mount(document.querySelector("#archive-grid"), () => { state.visible = 36; renderArchive(); });
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
    $$('[data-group-id]', target).forEach((button) => button.addEventListener('click', () => {
      const group = state.groups.find((item) => item.id === button.dataset.groupId);
      if (group) {
        openGroup(group, {
          syncUrl: true,
          focusClose: true,
          rememberFocus: true,
        });
      }
    }));
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
      if (Array.isArray(remote.groups)) state.groups = highlights.apply(remote.groups);
      updateFilterCounts();
      renderArchive();
      const shouldResolveInitial = introDeferred;
      const fallbackDetail = getDetailFromLocation();
      if (shouldResolveInitial) {
        if (fallbackDetail) skipIntro();
        else startIntro();
      }
      if (fallbackDetail) openDetailFromLocation({ focusClose: shouldResolveInitial });
    } catch (error) {
      const status = $('#archive-status');
      if (status) status.textContent = '照片目录未加载；请通过本地服务器打开本专题，或先阅读四件禁出文物卡片。';
      renderArchive();
      if (introDeferred) startIntro();
    }
  }

  function initDialog() {
    $('#treasure-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-treasure-id]');
      if (button) {
        openTreasure(treasureById(button.dataset.treasureId), {
          syncUrl: true,
          focusClose: true,
          rememberFocus: true,
        });
      }
    });
    $('[data-dialog-close]')?.addEventListener('click', () => closeDialog({
      syncUrl: true,
      restoreFocus: true,
    }));
    const dialog = $('#detail-dialog');
    dialog?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        closeDialog({
          syncUrl: true,
          restoreFocus: true,
        });
      }
    });
    dialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog({
        syncUrl: true,
        restoreFocus: true,
      });
    });
    dialog?.addEventListener('close', handleDialogClose);
    window.addEventListener('popstate', () => {
      openDetailFromLocation({ focusClose: false });
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

  function startIntro() {
    if (introInitialized) return;
    introDeferred = false;
    introInitialized = true;
    initIntro();
  }

  function skipIntro() {
    introDeferred = false;
    introInitialized = true;
    $('.intro-curtain')?.remove();
    document.body.classList.add('intro-complete');
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
    const initialDetail = getDetailFromLocation();
    const hasItemParam = new URLSearchParams(window.location.search).has('item');
    if (initialDetail) skipIntro();
    else if (hasItemParam && state.groups.length === 0) introDeferred = true;
    else startIntro();
    renderTreasureCards();
    initDialog();
    initFilters();
    initHeader();
    initRevealEffects();
    updateFilterCounts();
    scheduleArchiveInit();
    observeReveals();
    if (initialDetail) openDetailFromLocation({ focusClose: true });
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
