(() => {
  'use strict';

  const legacySlug = document.body.dataset.typeSlug;
  if (legacySlug) {
    const destination = new URL('../../../index.html', document.baseURI);
    destination.searchParams.set('atlasType', legacySlug);
    destination.hash = 'bronze-use-atlas';
    window.location.replace(destination.href);
    return;
  }

  const atlas = window.BAOJI_BRONZE_ATLAS;
  const copyBook = window.BAOJI_BRONZE_ATLAS_COPY;
  if (!atlas || !copyBook) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const groups = Array.isArray(window.BAOJI_PHOTO_INDEX?.groups) ? window.BAOJI_PHOTO_INDEX.groups : [];
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const typeById = new Map(atlas.types.map((type) => [type.id, type]));
  const categoryById = new Map(atlas.categories.map((category) => [category.id, category]));
  const copyBySlug = new Map((copyBook.records || []).map((record) => [record.slug, record]));
  const slug = document.body.dataset.typeSlug;
  const type = typeById.get(slug);
  if (!type) return;

  const category = categoryById.get(type.categoryId) || {};
  const copyRecord = copyBySlug.get(slug) || {};
  const copy = copyRecord.copy || {};
  const pageRoot = '../../';
  const moduleRoot = '../../../';
  const atlasBase = new URL('../../index.html', document.baseURI);

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function fileName(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.filename || value.name || '';
  }

  function localGroupFor(item) {
    return (item.localBaojiGroupIds || []).map((id) => groupById.get(id)).find(Boolean) || null;
  }

  function resolveURL(value) {
    if (!value) return '';
    try {
      return new URL(value, document.baseURI).href;
    } catch (_error) {
      return value;
    }
  }

  function photoURL(group) {
    const filename = fileName(group?.featured || group?.photos?.[0]).replace(/\.JPG$/i, '.jpg');
    return filename ? resolveURL(`${moduleRoot}assets/photos/thumbs/${encodeURIComponent(filename)}`) : '';
  }

  function assetURL(asset) {
    if (!asset) return '';
    return resolveURL(asset.startsWith('assets/') ? `${pageRoot}${asset}` : asset);
  }

  function detailURL(detailPage) {
    if (!detailPage) return '';
    try {
      return new URL(detailPage, atlasBase).href;
    } catch (_error) {
      return detailPage;
    }
  }

  function heroURL() {
    const explicitAsset = type.visualAssetSet?.hero || type.visualAssetOverride || type.categoryVisualSet?.hero || (type.visualAsset !== category.background ? type.visualAsset : '');
    return assetURL(explicitAsset || photoURL(localGroupFor(type)) || category.background);
  }

  function sectionURL(key) {
    return assetURL(type.visualAssetSet?.[key] || type.categoryVisualSet?.[key] || heroURL());
  }

  function shortLead(text, max = 260) {
    const source = String(text || '').trim();
    if (!source) return `${type.nameZh}的器形、功能与组合关系，需结合具体器例、时代与出土语境判断。`;
    const sentences = source.match(/[^。！？]+[。！？]?/g) || [source];
    const lead = sentences.slice(0, 2).join('').trim();
    return lead.length > max ? `${lead.slice(0, max - 1)}…` : lead;
  }

  function publicText(value) {
    const blocked = /AI辅助|AI生成|图谱应|图谱可|网页应|网页可|页面应|页面可|动作图|复原图|本页|本模块|读者|按现场顺序归档|详情页按名称/iu;
    return (String(value || '').match(/[^。！？]+[。！？]?/g) || []).map((item) => item.trim()).filter((item) => item && !blocked.test(item)).join('');
  }

  function textBlock(text, fallback) {
    return `<div class="detail-context-copy"><p>${escapeHTML(text || fallback)}</p></div>`;
  }

  function keywordChips(values) {
    return (values || []).slice(0, 5).map((value) => `<span class="detail-chip">${escapeHTML(value)}</span>`).join('');
  }

  function relationCards() {
    const relations = (type.relationTypeIds || []).map((id) => typeById.get(id)).filter(Boolean).slice(0, 6);
    if (!relations.length) return '<p class="detail-context-copy">当前条目暂无已挂接的比较对象。</p>';
    return `<div class="detail-relations">${relations.map((relation, index) => `
      <a class="detail-relation" href="${escapeHTML(detailURL(relation.detailPage))}">
        <small>0${index + 1} / ${escapeHTML(relation.categoryEn || 'RELATED')}</small>
        <strong>${escapeHTML(relation.nameZh)}</strong>
      </a>
    `).join('')}</div>`;
  }

  function recordCards() {
    const localGroups = (type.localBaojiGroupIds || []).map((id) => groupById.get(id)).filter(Boolean).slice(0, 3);
    if (localGroups.length) return `<div class="detail-record-grid">${localGroups.map((group, index) => {
      const image = photoURL(group);
      const facts = group.labelFacts || {};
      const note = group.titleSource === '现场展签与器形复核'
        ? [group.research?.significance, group.research?.history].map((value) => publicText(value)).find(Boolean) || ''
        : '';
      return `<article class="detail-record-card">
        ${image ? `<img class="detail-record-media" src="${escapeHTML(image)}" alt="${escapeHTML(group.title || type.nameZh)} · 宝鸡现场档案照片" loading="lazy" />` : ''}
        <p class="detail-record-label">宝鸡馆藏实物 / 0${index + 1}</p>
        <h3>${escapeHTML(group.title || type.nameZh)}</h3>
        <div class="detail-record-facts">
          <span>GROUP<strong>${escapeHTML(group.id)}</strong></span>
          <span>PERIOD<strong>${escapeHTML(facts.period || '待核')}</strong></span>
          <span>COLLECTION<strong>${escapeHTML(facts.collection || '待核')}</strong></span>
        </div>
        ${note ? `<p class="detail-record-note">${escapeHTML(note)}</p>` : ''}
      </article>`;
    }).join('')}</div>`;
    const crossObjects = (type.crossMuseumObjects || []).slice(0, 2);
    if (crossObjects.length) return `<div class="detail-record-grid">${crossObjects.map((object, index) => {
      const image = object.image ? resolveURL(`${moduleRoot}${object.image}`) : '';
      return `<article class="detail-record-card">
        ${image ? `<img class="detail-record-media" src="${escapeHTML(image)}" alt="${escapeHTML(object.title)} · ${escapeHTML(object.museum)}" loading="lazy" />` : ''}
        <p class="detail-record-label">跨馆器例 / 0${index + 1}</p>
        <h3>${escapeHTML(object.title)}</h3>
        <div class="detail-record-facts">
          <span>PERIOD<strong>${escapeHTML(object.period || '待核')}</strong></span>
          <span>COLLECTION<strong>${escapeHTML(object.museum || '待核')}</strong></span>
          <span>TYPE<strong>${escapeHTML(type.nameZh)}</strong></span>
        </div>
        ${object.note ? `<p class="detail-record-note">${escapeHTML(object.note)}</p>` : ''}
        ${object.href ? `<p class="detail-record-note"><a href="${escapeHTML(resolveURL(`${moduleRoot}${object.href}`))}" target="_blank" rel="noreferrer">打开馆藏页 ↗</a></p>` : ''}
      </article>`;
    }).join('')}</div>`;
    return `<div class="detail-record-grid detail-record-grid--empty">
      <article class="detail-record-card">
        <p class="detail-record-label">器类参照</p>
        <h3>${escapeHTML(type.nameZh)} · 器例资料</h3>
        <p class="detail-record-note">当前尚未关联宝鸡本地实拍，器物判断以正式馆藏目录与考古资料为依据。</p>
      </article>
    </div>`;
  }

  function sourceLinks() {
    const researchLinks = (copyRecord.sources || []).map((source, index) => ({ id: `RESEARCH-${String(index + 1).padStart(2, '0')}`, source: { href: source.url || source.href || '', label: source.label || source.institution || source.title || '正式资料来源' } }));
    const registeredLinks = (type.sourceIds || []).map((id) => ({ id, source: atlas.sources?.[id] })).filter((item) => item.source);
    const seen = new Set();
    const links = [...researchLinks, ...registeredLinks].filter((item) => {
      const key = item.source?.href || `${item.id}:${item.source?.label || ''}`;
      if (!item.source || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
    if (!links.length) return '<li><span>来源待核</span><span>器物资料尚待补充具体来源。</span></li>';
    return links.map(({ id, source }) => `<li>
      ${source.href ? `<a href="${escapeHTML(source.href)}" target="_blank" rel="noreferrer">${escapeHTML(id)}</a>` : `<span>${escapeHTML(id)}</span>`}
      <span>${escapeHTML(source.label || source.institution || '正式器例资料')}</span>
    </li>`).join('');
  }

  function actionDescription(action) {
    if (/受火|加热|煮|烹|温/.test(action)) return '受热部位与热源的关系决定器物的工作状态。';
    if (/盛|贮|容|纳/.test(action)) return '器腹承担容纳，口沿与盖合结构控制盛放状态。';
    if (/蒸/.test(action)) return '上下分层与蒸汽通道共同完成蒸制。';
    if (/注|斟|倾/.test(action)) return '流、口沿与持握部位共同控制液体方向。';
    if (/饮/.test(action)) return '口沿尺度与持握方式构成取用条件。';
    if (/悬/.test(action)) return '钮、耳或悬挂构件承担器体重量。';
    if (/击|和|声/.test(action)) return '器体受击发声，形制与编列关系影响音响组合。';
    if (/量|校|定/.test(action)) return '容量、铭文与校准关系共同构成度量依据。';
    if (/照|明/.test(action)) return '器面或燃烧结构决定照面与照明方式。';
    if (/熏/.test(action)) return '受热、通气与散香结构共同形成使用路径。';
    if (/驾|系|接|固|装/.test(action)) return '孔、扣与接合面将构件固定在所属系统中。';
    if (/承|奉|置|陈|持|取/.test(action)) return '足部、座面或持握部位维持承托与转移动作。';
    if (/饰/.test(action)) return '纹饰面与安装位置共同构成装饰关系。';
    return `${action}由器物的形制、连接方式与具体语境共同限定。`;
  }

  const actions = (type.actionKeywords || []).slice(0, 4);
  const actionItems = (actions.length ? actions : ['观察', '置放', '取用', '判断']).map((action, index) => `
    <li>
      <strong>${escapeHTML(action)}</strong>
      <span>${escapeHTML(actionDescription(action))}</span>
    </li>
  `).join('');

  const formText = copy['形制与工艺'];
  const purposeText = copy['用途'];
  const useText = copy['使用方式'];
  const ritualText = copy['礼仪与制度'];
  const historyText = copy['史料记载'];
  const combinationText = copy['器物组合'];
  const functionalSection = {
    'music': { code: '04 / SOUND & ACOUSTICS', title: '声音与声学', en: 'SOUND / ACOUSTICS', primary: '声音关键词', lead: '乐器的功能不能只用“内容物”解释；器体、悬挂、击奏方式与声音传播共同构成它的使用路径。' },
    'ritual-accessories': { code: '04 / HOLD & SERVE', title: '承置与取用', en: 'HOLD / SERVE', primary: '动作关键词', lead: '承器与取用器的作用体现在器物之间：它们支撑、挹取、传递或奉持，不应套用容器的内容物逻辑。' },
    'daily-life': { code: '04 / DAILY USE', title: '日常使用', en: 'DAILY / DOMESTIC', primary: '使用关键词', lead: '镜、灯、炉与熏炉等生活器具，应从照面、照明、受热和散香等具体动作进入。' },
    'chariot-harness': { code: '04 / FITTING & USE', title: '装配与行用', en: 'FITTING / USE', primary: '装配关键词', lead: '车马器的功能依附于车舆和马具系统，连接、系固与装饰的位置比孤立器名更重要。' },
    'architecture': { code: '04 / JOIN & FIX', title: '连接与固定', en: 'JOIN / FIX', primary: '构件关键词', lead: '建筑铜构件不以盛放内容物为功能核心，而应观察套接、固定、受力和建筑部位之间的关系。' },
    'measures': { code: '04 / CAPACITY', title: '容量与度量', en: 'CAPACITY / MEASURE', primary: '度量关键词', lead: '量器的核心不是盛放食物，而是以容量、铭文和校准关系进入度量衡制度。' },
    'other': { code: '04 / OBJECT USE', title: '对象功能', en: 'OBJECT / USE', primary: '功能关键词', lead: '其他器具只保留功能明确的对象，并把持握、系挂、装饰或使用语境分别说明。' },
    default: { code: '04 / CONTENTS', title: '用途与内容', en: 'FUNCTION / CONTENT', primary: '内容关键词', lead: shortLead(purposeText || type.shortFunction, 320) }
  }[type.categoryId] || {
    code: '04 / CONTENTS', title: '用途与内容', en: 'FUNCTION / CONTENT', primary: '内容关键词', lead: shortLead(purposeText || type.shortFunction, 320)
  };

  document.title = `${type.nameZh} · ${type.nameEn} · 青铜器用图谱`;
  document.documentElement.style.setProperty('--hero-bg', `url("${heroURL()}")`);
  document.querySelector('meta[name="description"]')?.setAttribute('content', `${type.nameZh}：${type.shortFunction}。从器形、动作与礼仪语境阅读青铜器。`);

  const detail = $('#detail-content');
  detail.innerHTML = `
    <section class="detail-hero" style="--hero-bg:url('${escapeHTML(heroURL())}')" aria-labelledby="detail-title">
      <div class="detail-hero-inner">
        <p class="detail-kicker">${escapeHTML(type.categoryEn || category.nameEn || 'BRONZE USE ATLAS')} · OBJECT STUDY</p>
        <h1 id="detail-title">${escapeHTML(type.nameZh)}<span>${escapeHTML(type.romanization)} · ${escapeHTML(type.nameEn)}</span></h1>
        <p class="detail-hero-deck">${escapeHTML(shortLead(copy['总介绍'] || type.notes))}</p>
        <div class="detail-keywords">${keywordChips(type.formKeywords)}</div>
        <div class="detail-hero-meta" aria-label="器型档案摘要">
          <span><strong>OBJECT TYPE</strong> ${escapeHTML(type.nameZh)}</span>
          <span><strong>CATEGORY</strong> ${escapeHTML(type.categoryZh || category.nameZh || type.categoryId)}</span>
          <span><strong>BAOJI RECORDS</strong> ${String(type.localBaojiGroupIds?.length || 0).padStart(2, '0')}</span>
        </div>
      </div>
    </section>

    <section class="detail-section" style="--section-bg:url('${escapeHTML(sectionURL('form'))}')" aria-labelledby="form-title">
      <div class="detail-section-inner">
        <div class="detail-section-heading">
          <div><p class="detail-section-code">02 / FORM</p><h2 id="form-title">形制与工艺<span>FORM / CRAFT</span></h2></div>
          <div><p class="detail-section-lead">${escapeHTML(shortLead(formText, 320))}</p><div class="detail-keywords">${keywordChips(type.formKeywords)}</div></div>
        </div>
        ${textBlock(formText, '形制特征需结合器口、器腹、足部或连接部位观察，不能只凭器名判断。')}
      </div>
    </section>

    <section class="detail-section" style="--section-bg:url('${escapeHTML(sectionURL('action'))}')" aria-labelledby="action-title">
      <div class="detail-section-inner">
        <div class="detail-section-heading">
          <div><p class="detail-section-code">03 / ACTION CHAIN</p><h2 id="action-title">器用与动作<span>USE / ACTION</span></h2></div>
          <p class="detail-section-lead">${escapeHTML(shortLead(useText || type.shortFunction, 320))}</p>
        </div>
        <ol class="detail-action-chain">${actionItems}</ol>
        ${textBlock(useText, '具体动作仍需结合器物形制、组合关系与使用语境判断。')}
      </div>
    </section>

    <section class="detail-section" style="--section-bg:url('${escapeHTML(sectionURL('contents'))}')" aria-labelledby="contents-title">
      <div class="detail-section-inner">
        <div class="detail-section-heading">
          <div><p class="detail-section-code">${escapeHTML(functionalSection.code)}</p><h2 id="contents-title">${escapeHTML(functionalSection.title)}<span>${escapeHTML(functionalSection.en)}</span></h2></div>
          <p class="detail-section-lead">${escapeHTML(functionalSection.lead)}</p>
        </div>
        <div class="detail-content-grid">
          <article class="detail-data-block"><h3>核心功能</h3><p>${escapeHTML(type.shortFunction)}</p></article>
          <article class="detail-data-block"><h3>${escapeHTML(functionalSection.primary)}</h3><p>${escapeHTML((type.contentKeywords || []).join(' · '))}</p></article>
        </div>
        ${textBlock(purposeText, '用途判断应回到器形、时代、组合关系与相关史料，避免把单一解释扩大为所有器例的固定结论。')}
      </div>
    </section>

    <section class="detail-section" style="--section-bg:url('${escapeHTML(sectionURL('ritual'))}')" aria-labelledby="ritual-title">
      <div class="detail-section-inner">
        <div class="detail-section-heading">
          <div><p class="detail-section-code">05 / RITUAL &amp; INSTITUTION</p><h2 id="ritual-title">礼仪与制度<span>CONTEXT / ORDER</span></h2></div>
          <p class="detail-section-lead">${escapeHTML(shortLead(ritualText || type.notes, 320))}</p>
        </div>
        ${textBlock(ritualText, '礼仪意义随时代、地区与器物组合而变化，具体判断需依正式材料。')}
        <div class="detail-data-block"><h3>器型边界</h3><p>${escapeHTML(type.notes)}</p></div>
      </div>
    </section>

    <section class="detail-section" style="--section-bg:url('${escapeHTML(sectionURL('relations'))}')" aria-labelledby="relations-title">
      <div class="detail-section-inner">
        <div class="detail-section-heading">
          <div><p class="detail-section-code">06 / RELATION MAP</p><h2 id="relations-title">器物组合<span>RELATION / SYSTEM</span></h2></div>
          <p class="detail-section-lead">器物很少只凭单件孤立理解。组合关系可以提示功能分工与礼仪场景，但不表示每件器物必然同时出现。</p>
        </div>
        ${relationCards()}
        ${textBlock(combinationText, '本器可与相邻类型、承托或取用器具放在同一组合关系中比较。')}
      </div>
    </section>

    <section class="detail-section" id="archive-records" style="--section-bg:url('${escapeHTML(sectionURL('evidence'))}')" aria-labelledby="archive-title">
      <div class="detail-section-inner">
        <div class="detail-section-heading">
          <div><p class="detail-section-code">07 / BAOJI RECORDS</p><h2 id="archive-title">馆藏与器例<span>OBJECT / RECORD</span></h2></div>
          <p class="detail-section-lead">以宝鸡现场记录或正式参照器例对读类型条目；照片记录与历史解释各自承担不同证据功能。</p>
        </div>
        ${recordCards()}
      </div>
    </section>

    <section class="detail-section" style="--section-bg:url('${escapeHTML(sectionURL('evidence'))}')" aria-labelledby="evidence-title">
      <div class="detail-section-inner">
        <div class="detail-section-heading">
          <div><p class="detail-section-code">08 / EVIDENCE</p><h2 id="evidence-title">史料与边界<span>SOURCES / SCOPE</span></h2></div>
          <p class="detail-section-lead">古籍、铭文、考古报告与馆藏对象需要互相校读；史料中的名称和器形之间不总是一一对应。</p>
        </div>
        <div class="detail-evidence-grid">
          ${textBlock(historyText, '史料记载需与器形、年代和出土语境合读。')}
          <div class="detail-evidence-block"><p class="detail-source-label">SOURCE REGISTER</p><ul class="detail-source-list">${sourceLinks()}</ul></div>
        </div>
      </div>
    </section>
  `;
  document.documentElement.dataset.detailReady = 'true';
})();
