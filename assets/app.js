(function () {
  "use strict";

  const sourceData = window.ANNALES_DATA;
  const rightsGate = window.RIGHTS_GATE;
  if (!sourceData || !rightsGate) throw new Error("Catalog and rights gate must load before the application.");

  const evaluatedResources = sourceData.resources.map((resource) => ({ resource, gate: rightsGate.evaluate(resource) }));
  const rejectedResources = evaluatedResources.filter((entry) => !entry.gate.admission.allowed);
  const data = {
    ...sourceData,
    resources: evaluatedResources.filter((entry) => entry.gate.admission.allowed).map((entry) => entry.resource)
  };
  const scoreLeads = Array.isArray(window.ANNALES_SCORE_LEADS) ? window.ANNALES_SCORE_LEADS : [];
  const recordingLeads = Array.isArray(window.ANNALES_RECORDING_LEADS) ? window.ANNALES_RECORDING_LEADS : [];
  const workPaths = Array.isArray(window.ANNALES_WORK_PATHS) ? window.ANNALES_WORK_PATHS : [];
  const performanceEvents = Array.isArray(window.ANNALES_PERFORMANCE_EVENTS) ? window.ANNALES_PERFORMANCE_EVENTS : [];
  window.ANNALES_REJECTED_RESOURCES = Object.freeze(rejectedResources.map((entry) => ({
    id: entry.resource?.id || null,
    blockers: entry.gate.admission.blockers.map((blocker) => blocker.id)
  })));
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const typeLabels = { score: "乐谱", recording: "录音", writing: "著作" };
  const evidenceTrackLabels = {
    "biography": "生平/事实",
    "letters-and-self-presentation": "书信/自述",
    "aesthetics-and-poetics": "美学/诗学",
    "works-and-versions": "作品/版本",
    "performance-and-recordings": "演奏/录音",
    "reception-and-scholarship": "接受史/学者解释",
    "rights-and-access": "权利/访问"
  };
  const evidenceKindLabels = {
    primary: "一手材料",
    scholarship: "学者解释",
    "biography-with-source-critique": "传记材料批评",
    "primary-edited-correspondence": "编校书信",
    "primary-original-edition": "原始版著作",
    "primary-digital-edition": "数字编辑",
    "contemporary-witness-portrait": "同时代见证",
    "contemporary-critical-biography": "同时代评论",
    "secondary-work-source-study": "二手版本研究",
    "modern-secondary-musicology": "现代音乐学",
    "modern-secondary-open-access": "开放获取二手研究",
    "primary-digital-edition-letter": "数字版书信",
    "primary-quote-via-secondary": "二手文献中的一手转引",
    "primary-public-self-interview": "公开自述",
    "primary-letter-in-edited-volume": "编校书信中的自述",
    "catalogue-fact": "馆藏目录事实",
    "primary-digital-item-catalogue": "数字对象目录",
    "score-file-candidate": "谱本候选",
    "holograph-score-file-candidate": "手稿谱本候选",
    "composer-performance-discography": "作曲家演奏目录"
  };
  const visibilityLabels = {
    "public-link": "公开来源链接",
    "public-bibliography": "公开书目",
    "private-research": "本地私人研究材料"
  };
  const evidenceLayerLabels = {
    original: "原文观点 / 一手材料",
    scholar: "学者解释 / 二手研究",
    record: "机构记录 / 目录材料",
    unclassified: "证据层级待人工标注"
  };
  const statusClasses = { review: "status-review", link: "status-link", permission: "status-permission", open: "status-open" };
  const agentSummaries = window.MUSICIAN_AGENT_SUMMARIES || {};
  const agentEvidence = window.MUSICIAN_AGENT_EVIDENCE || {};
  const agentRuntime = window.MUSICIAN_AGENT_RUNTIME || null;
  const agentGateway = window.MUSICIAN_AGENT_GATEWAY || null;
  const mobileQuery = window.matchMedia("(max-width: 820px)");
  const validViews = new Set(["home", "atlas", "beilin", "scores", "recordings", "writings", "rights"]);
  const resourceKinds = new Set(["score", "recording", "writing"]);
  const atlasViews = Object.freeze([
    { id: "alm", label: "年鉴", description: "七时代分章与音乐家名录。" },
    { id: "tl", label: "年表", description: "按生卒年代展开音乐家生命横道。" },
    { id: "map", label: "舆图", description: "以城市、驻留与行迹阅读欧洲音乐地理。" },
    { id: "net", label: "星丛", description: "师承与影响关系的二维及三维网络。" },
    { id: "lin", label: "师承", description: "八条传统脉络组成的谱系带。" },
    { id: "hist", label: "史脉", description: "重要历史事件与音乐史进程的纵向时间轴。" },
    { id: "musio", label: "音乐学", description: "音乐学学科、方法与代表著述。" },
    { id: "gl", label: "术语", description: "核心音乐史概念、原语与文献出处。" },
    { id: "bib", label: "文献", description: "年鉴编纂所据文献与凡例。" }
  ]);
  const atlasViewIds = new Set(atlasViews.map((view) => view.id));
  const atlasPersonIds = Object.freeze({
    busoni: "buso",
    debussy: "debu",
    schoenberg: "scho",
    mahler: "mahl",
    stravinsky: "stra",
    dvorak: "dvor",
    beethoven: "beet"
  });

  function classifyEvidenceLayer(item) {
    if (item?.evidenceLayer && evidenceLayerLabels[item.evidenceLayer]) return item.evidenceLayer;
    if (agentRuntime?.classifyEvidenceLayer) return agentRuntime.classifyEvidenceLayer(item);
    const value = [item?.claimOrigin, item?.kind, item?.sourceLabel, item?.track].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
    if (/institutional|catalog|catalogue|finding.?aid|archive|database|metadata|reuse.?policy|score.?file|sound.?catalog|discograph|edition.?lead|file.?candidate|modern.?edition.?boundary|digital.?research.?platform/.test(value)) return "record";
    const mediatedSecondary = /secondary|scholar|biograph|critical|analysis|history|corroboration|reference|textbook|translation|mediated|via.?secondary|modern.?musicology/.test(value);
    if (/witness|contemporary.?witness/.test(value) && !mediatedSecondary) return "original";
    if (mediatedSecondary) return "scholar";
    if (/primary|self|autobiograph|correspondence|letter|original|digital.?edition|public.?text/.test(value)) return "original";
    return "unclassified";
  }

  function shortenEvidenceClaim(value, maxLength = 180) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  function evidenceLayerText(evidence, layer) {
    const items = (evidence || []).filter((item) => classifyEvidenceLayer(item) === layer).slice(0, 2);
    if (!items.length) return "当前问题匹配的公开证据中暂无这一层；不以其他层级代替。";
    return items.map((item) => `${shortenEvidenceClaim(item.claim)}（${item.sourceLabel} · ${item.locator}）`).join("；");
  }

  function evidenceLayerSections(evidence, options = {}) {
    const sections = [
      [evidenceLayerLabels.original, evidenceLayerText(evidence, "original")],
      [evidenceLayerLabels.scholar, evidenceLayerText(evidence, "scholar")],
      [evidenceLayerLabels.record, evidenceLayerText(evidence, "record")]
    ];
    if ((evidence || []).some((item) => classifyEvidenceLayer(item) === "unclassified")) {
      sections.push([evidenceLayerLabels.unclassified, evidenceLayerText(evidence, "unclassified")]);
    }
    sections.push(["AI 推断", options.notAnswerable
      ? "本次回答状态为 not_answerable；不生成独立于证据的模型推断。"
      : evidence?.length
      ? "本地回答只对已通过公开引用闸门的证据做受限归纳；没有 sourceRef 与定位的模型推断不会写成事实。"
      : "当前没有通过公开引用闸门的证据；不生成模型推断。"]);
    return sections;
  }

  const state = {
    view: "home",
    atlasLoaded: false,
    beilinLoaded: false,
    atlasView: "alm",
    atlasPersonId: null,
    atlasBridgeObserver: null,
    detailReturnView: "home",
    detailResourceId: null,
    detailTrigger: null,
    detailScrollY: 0,
    personDetailId: null,
    personDetailTrigger: null,
    personDetailScrollY: 0,
    personDetailReturnView: "home",
    personDetailCarouselScrollLeft: 0,
    personDetailCarouselPosition: 0,
    carouselActivePersonId: null,
    carouselPosition: 0,
    carouselTarget: 0,
    carouselAnimationTimer: 0,
    carouselVelocity: 0,
    carouselMotionMode: "idle",
    carouselPointer: null,
    carouselCameraPointer: { x: 0, y: 0, targetX: 0, targetY: 0, frame: 0, rect: null },
    carouselDragRenderFrame: 0,
    carouselTransition: null,
    carouselRenderCache: {
      grid: null,
      cards: [],
      geometry: null,
      cameraTransform: "",
      activeIndex: null
    },
    carouselWheelTimer: null,
    carouselSuppressClickUntil: 0,
    restoreAfterRoute: false,
    personRestoreAfterRoute: false,
    activeFilters: { score: "全部", recording: "全部", writing: "全部" },
    searchQuery: "",
    searchFilter: "all",
    searchSort: "relevance"
  };

  const searchTypeLabels = { person: "人物", era: "时期", score: "乐谱", "score-lead": "谱本候选", recording: "录音", "recording-lead": "录音候选", performance: "演出/事件", work: "作品路径", writing: "著作", evidence: "人物证据", rights: "权利" };

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("zh-CN").replace(/[\s·—–_，。、《》“”'"()（）:：]/g, "");
  }

  function personFor(resource) {
    return data.people.find((person) => person.id === resource.personId);
  }

  function workPathPerson(path) {
    return data.people.find((person) => person.id === path?.personId);
  }

  function performanceEventFor(eventId) {
    return performanceEvents.find((event) => event.id === eventId) || null;
  }

  function performanceEventsForPath(path) {
    return performanceEvents.filter((event) => event.workPathId === path?.id);
  }

  const genericWorkPathMatchValues = new Set([
    "首演", "演出", "演出事件", "事件", "指挥", "作曲家", "乐团", "作品", "版本", "乐谱", "录音", "候选", "交响曲", "管弦乐",
    "premiere", "performance", "event", "conductor", "composer", "orchestra", "work", "version", "score", "recording"
  ].map(normalize));

  function workPathMatchesQuery(path, person, query) {
    const q = normalize(query);
    if (!q) return true;
    const personTerms = [
      person?.name,
      person?.latin,
      ...(person?.keywords || [])
    ].map(normalize).filter((value) => value.length >= 2);
    let specificQuery = q;
    for (const term of personTerms) specificQuery = specificQuery.split(term).join("");
    const eventValues = performanceEventsForPath(path).flatMap((event) => [event.title, event.workTitle, event.date, event.dateLabel, event.institution, event.versionLabel, ...(event.keywords || []), ...(event.participants || []).map((participant) => participant.name), event.location?.venue, event.location?.city, event.location?.country]);
    const specificValues = [path.title, path.originalTitle, path.dateLabel, ...(path.workNumbers || []), ...(path.genres || []), ...(path.instrumentation || []), ...(path.keywords || []), ...(path.nodes || []).map((node) => node.label), ...eventValues]
      .map(normalize)
      .filter((value) => value.length >= 2 && !genericWorkPathMatchValues.has(value));
    if (specificValues.some((value) => specificQuery.includes(value))) return true;

    let residual = specificQuery;
    residual = residual.replace(/智能体|研究|请回答|帮我|查找|找|关于|作品|版本|版本链|乐谱|总谱|谱本|声乐谱|钢琴谱|候选|路径|链条|的|和|与|及|吗|呢/g, "");
    return residual.length === 0;
  }

  function workPathsForPerson(person, query = "") {
    const paths = workPaths.filter((path) => path.personId === person?.id);
    return String(query || "").trim()
      ? paths.filter((path) => workPathMatchesQuery(path, person, query))
      : paths;
  }

  function agentFor(person) {
    return person ? agentSummaries[person.id] || { status: "queued", label: "等待来源编组", detail: "尚未建立来源约束的音乐家智能体档案。", seedCount: 0, nextReading: "等待人工建立阅读队列" } : null;
  }

  function evidenceFor(person) {
    return person ? agentEvidence[person.id] || { status: "no-evidence", answerableTopics: [], notYetAnswerable: ["尚未建立来源约束的证据卡。"], evidence: [] } : { evidence: [] };
  }

  function statusPill(resource) {
    return `<span class="status-pill ${statusClasses[resource.status] || "status-review"}">${escapeHtml(resource.statusLabel)}</span>`;
  }

  function evaluationFor(resource) {
    return rightsGate.evaluate(resource);
  }

  function gatePill(resource) {
    const allowed = evaluationFor(resource).open.allowed;
    return `<span class="gate-pill ${allowed ? "gate-open" : "gate-closed"}"><i aria-hidden="true"></i>${allowed ? "开放证据通过" : "开放闸门关闭"}</span>`;
  }

  function valueOrMissing(value) {
    if (Array.isArray(value)) return value.length ? value.map(escapeHtml).join("、") : '<span class="missing-value">未登记</span>';
    return value === null || value === undefined || String(value).trim() === ""
      ? '<span class="missing-value">未登记</span>'
      : escapeHtml(value);
  }

  function personLink(person) {
    return person
      ? `<button class="dossier-person-link" type="button" data-person-id="${escapeHtml(person.id)}">${escapeHtml(person.name)} ↗</button>`
      : '<span class="missing-value">待关联</span>';
  }

  function searchMatchMeta(match) {
    if (!match) return "";
    const fields = match.fields?.length ? match.fields.join(" · ") : "相关记录";
    return `<div class="search-match-meta"><span>命中字段：${escapeHtml(fields)}</span><b>${escapeHtml(searchTypeLabels[match.kind] || "记录")}</b></div>`;
  }

  function personCard(person, options = {}) {
    const matchMeta = options?.match ? searchMatchMeta(options.match) : "";
    const portrait = person.portrait
      ? `<img src="${escapeHtml(person.portrait)}" alt="${escapeHtml(person.portraitAlt || `${person.name}肖像`)}" loading="lazy" draggable="false" referrerpolicy="no-referrer">`
      : `<span class="person-card-fallback" aria-hidden="true">${escapeHtml(person.initial)}</span>`;
    return `
      <a class="person-card${options?.match ? " person-card-search" : ""}" href="#person/${encodeURIComponent(person.id)}" draggable="false" role="listitem" aria-label="进入${escapeHtml(person.name)}的人物档案" data-person-id="${person.id}" data-initial="${escapeHtml(person.initial)}" style="--person-color:${person.color}">
        <div class="person-card-media">
          ${portrait}
          <span class="person-card-film-index" aria-hidden="true">${escapeHtml(person.initial)}</span>
          <span class="person-card-media-line" aria-hidden="true"></span>
        </div>
        <div class="person-card-shade"></div>
        <div class="person-card-content">
          ${matchMeta}
           <div class="person-card-top"><span>${escapeHtml(person.era)}</span><span>${escapeHtml(person.years)}</span></div>
           <div class="person-card-copy">
             <h3>${escapeHtml(person.name)}<small>${escapeHtml(person.latin)}</small></h3>
           </div>
           <div class="person-card-bottom"><span class="person-card-open">进入人物档案 <b aria-hidden="true">↗</b></span></div>
         </div>
       </a>`;
  }

  function resourceRow(resource) {
    const person = personFor(resource);
    const icon = resource.type === "score" ? "𝄞" : resource.type === "recording" ? "◉" : "¶";
    return `
      <article class="resource-row" tabindex="0" role="button" aria-label="查看${escapeHtml(resource.title)}的证据卷宗" data-resource-id="${resource.id}">
        <span class="resource-icon" aria-hidden="true">${icon}</span>
        <div class="resource-title"><strong>${escapeHtml(resource.title)}</strong><small>${escapeHtml(resource.subtitle)}</small></div>
        <span class="resource-meta">${escapeHtml(person?.name || typeLabels[resource.type])}</span>
        <span class="resource-date">${escapeHtml(resource.date)}</span>
        <span class="resource-row-state">${statusPill(resource)}${gatePill(resource)}</span>
      </article>`;
  }

  function catalogCard(resource, options = {}) {
    const person = personFor(resource);
    const matchMeta = options?.match ? searchMatchMeta(options.match) : "";
    return `
      <article class="catalog-card" tabindex="0" role="button" aria-label="查看${escapeHtml(resource.title)}的证据卷宗" data-resource-id="${resource.id}">
        ${matchMeta}
        <div class="catalog-card-top"><span class="type">${typeLabels[resource.type].toUpperCase()}</span>${statusPill(resource)}</div>
        <h3>${escapeHtml(resource.title)}</h3>
        <p>${escapeHtml(resource.description)}</p>
        <dl>
          <div><dt>关联人物</dt><dd>${escapeHtml(person?.name || "待关联")}</dd></div>
          <div><dt>日期</dt><dd>${escapeHtml(resource.date)}</dd></div>
          <div><dt>版本</dt><dd>${escapeHtml(resource.edition)}</dd></div>
          <div><dt>当前开放</dt><dd>${escapeHtml(resource.access)}</dd></div>
        </dl>
        <div class="catalog-gate">${gatePill(resource)}<span>查看证据卷宗 →</span></div>
      </article>`;
  }

  function evidenceSearchCard(item, options = {}) {
    const person = data.people.find((candidate) => candidate.id === item.personId);
    const matchMeta = options?.match ? searchMatchMeta(options.match) : "";
    const layer = evidenceLayerLabels[classifyEvidenceLayer(item)] || evidenceLayerLabels.unclassified;
    const visibility = visibilityLabels[item.visibility] || item.visibility || "公开可见性待登记";
    return '<article class="evidence-search-card" tabindex="0" role="button" aria-label="打开' + escapeHtml(person?.name || "人物") + '的人物证据" data-person-id="' + escapeHtml(item.personId) + '" data-evidence-id="' + escapeHtml(item.id) + '">' +
      matchMeta +
      '<div class="evidence-search-card-top"><span>' + escapeHtml(evidenceTrackLabels[item.track] || "人物研究") + '</span><span>' + escapeHtml(layer) + '</span></div>' +
      '<h3>' + escapeHtml(shortenEvidenceClaim(item.claim, 240)) + '</h3>' +
      '<p class="evidence-search-boundary"><strong>边界：</strong>' + escapeHtml(shortenEvidenceClaim(item.boundary, 180)) + '</p>' +
      '<div class="evidence-search-meta"><span>' + escapeHtml(person?.name || "待关联") + '</span><span>' + escapeHtml(visibility) + '</span></div>' +
      '<div class="evidence-search-source">' + escapeHtml(item.sourceLabel) + ' · ' + escapeHtml(item.locator) + '</div>' +
      '<div class="evidence-search-open">打开人物页中的 AI 对话与证据 →</div>' +
      '</article>';
  }

  function scoreLeadCard(lead, options = {}) {
    const person = personFor(lead);
    const matchMeta = options?.match ? searchMatchMeta(options.match) : "";
    return `
      <article class="score-lead-card" data-score-lead-id="${escapeHtml(lead.id)}">
        ${matchMeta}
        <div class="score-lead-top"><span>谱本候选 · FILE #${escapeHtml(lead.fileId)}</span><span class="lead-status-pill">CANDIDATE · DO NOT HOST</span></div>
        <h3>${escapeHtml(lead.workTitle)}</h3>
        <p class="score-lead-part">${escapeHtml(lead.part)}</p>
        <dl class="score-lead-meta">
          <div><dt>关联人物</dt><dd>${escapeHtml(person?.name || "待关联")}</dd></div>
          <div><dt>具体版本</dt><dd>${escapeHtml(lead.edition)}</dd></div>
          <div><dt>文件信息</dt><dd>${escapeHtml(String(lead.pageCount))} 页 · ${escapeHtml(lead.displayedFileSize)}</dd></div>
          <div><dt>页面权利标签</dt><dd>${escapeHtml(lead.imslpRightsLabel)}</dd></div>
        </dl>
        <p class="score-lead-boundary"><strong>当前边界：</strong>${escapeHtml(lead.territoryNote)}</p>
        <p class="score-lead-file-state"><strong>文件证据：</strong>${escapeHtml(lead.fileEvidenceStatus)}；尚无可用于站内托管的真实文件签名与 SHA-256。</p>
        <div class="score-lead-actions">
          <a href="${escapeHtml(lead.pageUrl)}" target="_blank" rel="noopener noreferrer">打开 IMSLP 作品页 ↗</a>
          <a href="${escapeHtml(lead.filePageUrl)}" target="_blank" rel="noopener noreferrer">打开文件页 ↗</a>
        </div>
      </article>`;
  }

  function recordingLeadCard(lead, options = {}) {
    const person = personFor(lead);
    const matchMeta = options?.match ? searchMatchMeta(options.match) : "";
    const recordIdentifier = lead.matrix ? `MATRIX ${lead.matrix}` : `馆藏 ${lead.catalogueId || "待登记"}`;
    const catalogueNumbers = [
      lead.catalogueId ? `馆藏 ${lead.catalogueId}` : "",
      ...(lead.catalogueNumbers || []).map((number) => `发行号 ${number}`)
    ].filter(Boolean).join(" · ") || "未登记发行号";
    const performanceLine = [
      ...(lead.performers || []),
      lead.conductor ? `指挥：${lead.conductor}` : "",
      lead.ensemble && !(lead.performers || []).includes(lead.ensemble) ? lead.ensemble : ""
    ].filter(Boolean).join("；");
    return `
      <article class="recording-lead-card" data-recording-lead-id="${escapeHtml(lead.id)}">
        ${matchMeta}
        <div class="score-lead-top"><span>录音候选 · ${escapeHtml(recordIdentifier)}</span><span class="lead-status-pill">CANDIDATE · DO NOT HOST</span></div>
        <h3>${escapeHtml(lead.workTitle)}</h3>
        <p class="score-lead-part">${escapeHtml(performanceLine || "演奏者待登记")}</p>
        <dl class="score-lead-meta">
          <div><dt>关联人物</dt><dd>${escapeHtml(person?.name || lead.composerName || "待关联")}</dd></div>
          <div><dt>录音日期 / 地点</dt><dd>${escapeHtml(lead.recordingDate)} · ${escapeHtml(lead.recordingPlace || "未登记")}</dd></div>
          <div><dt>标签 / 矩阵</dt><dd>${escapeHtml(lead.label || "未登记")} · ${escapeHtml(recordIdentifier)}</dd></div>
          <div><dt>发行 / 馆藏号</dt><dd>${escapeHtml(catalogueNumbers)}</dd></div>
          <div><dt>载体</dt><dd>${escapeHtml(lead.format || "未登记")}</dd></div>
          <div><dt>来源目录</dt><dd>${escapeHtml(lead.sourceTitle)}</dd></div>
        </dl>
        <p class="score-lead-boundary"><strong>权利边界：</strong>${escapeHtml(lead.rightsLabel)}；${escapeHtml(lead.territoryNote)}</p>
        <p class="score-lead-file-state"><strong>数字层状态：</strong>${escapeHtml(lead.digitalSourceStatus)}；当前没有站内音频文件、播放或下载许可。</p>
        <div class="score-lead-actions">
          <a href="${escapeHtml(lead.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开权威目录来源 ↗</a>
        </div>
      </article>`;
  }

  function performanceEventLocation(event) {
    const location = event?.location || {};
    return [location.venue, location.city, location.country].filter(Boolean).join(" · ") || "地点待登记";
  }

  function performanceEventParticipants(event) {
    const participants = (event?.participants || []).map((participant) => `${participant.role}：${participant.name}`);
    return participants.length ? participants.join("；") : "当前机构记录未列出演出参与者";
  }

  function performanceEventParticipantNames(event) {
    const participants = (event?.participants || []).map((participant) => participant.name).filter(Boolean);
    return participants.length ? participants.join(" · ") : "参与者未登记";
  }

  function performanceEventCard(event, options = {}) {
    if (!event) return "";
    const matchMeta = options?.match ? searchMatchMeta(options.match) : "";
    const compact = options?.compact === true;
    return `<article class="performance-event-card ${compact ? "is-compact" : ""}" data-performance-event-id="${escapeHtml(event.id)}">
      ${matchMeta}
      <div class="performance-event-top"><span>演出事件 · ${escapeHtml(event.eventLabel || "演出")}</span><span>${escapeHtml(event.dateLabel || event.date || "日期待登记")}</span></div>
      <h3>${escapeHtml(event.title)}</h3>
      <p class="performance-event-work">${escapeHtml(event.workTitle || "作品待登记")}</p>
      ${compact
        ? `<p class="performance-event-compact-summary"><span>地点 / 机构：</span>${escapeHtml(performanceEventLocation(event))} · ${escapeHtml(event.institution || "机构待登记")}<br><span>参与者：</span>${escapeHtml(performanceEventParticipantNames(event))}<br><span>版本层：</span>${escapeHtml(event.versionLabel || "版本关系待登记")}</p>`
        : `<dl class="performance-event-meta">
          <div><dt>地点 / 机构</dt><dd>${escapeHtml(performanceEventLocation(event))} · ${escapeHtml(event.institution || "机构待登记")}</dd></div>
          <div><dt>参与者</dt><dd>${escapeHtml(performanceEventParticipants(event))}</dd></div>
          <div><dt>版本层</dt><dd>${escapeHtml(event.versionLabel || "版本关系待登记")}</dd></div>
        </dl>`}
      ${compact ? "" : `<p class="performance-event-claim"><strong>记录：</strong>${escapeHtml(event.claim || "当前只有事件导航记录")}</p>`}
      <p class="performance-event-boundary"><strong>边界：</strong>${escapeHtml(event.boundary || "事件记录不等于谱面、录音或托管许可。")}</p>
      <div class="performance-event-actions"><a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开机构来源 ↗</a></div>
    </article>`;
  }

  function workPathNode(node) {
    if (node.kind === "evidence") {
      return `<div class="work-path-node work-path-node-evidence">
        <span class="work-path-node-kind">证据节点</span>
        <strong>${escapeHtml(node.label || "作品 / 版本证据")}</strong>
        <small>已登记来源关系；证据正文按公开可见性闸门单独处理。</small>
      </div>`;
    }
    if (node.kind === "resource") {
      const resource = data.resources.find((candidate) => candidate.id === node.resourceId);
      return `<div class="work-path-node work-path-node-resource">
        <span class="work-path-node-kind">生产资源</span>
        <strong>${escapeHtml(node.label || "生产资源卷宗")}</strong>
        ${resource
          ? `<button class="work-path-node-action" type="button" data-resource-id="${escapeHtml(resource.id)}">${escapeHtml(resource.title)} · ${escapeHtml(resource.statusLabel)} · 查看证据卷宗 →</button>`
          : `<small>该生产资源未通过当前入库闸门，不能从作品路径打开。</small>`}
      </div>`;
    }
    if (node.kind === "score-lead") {
      const lead = scoreLeads.find((candidate) => candidate.id === node.leadId);
      if (!lead || lead.hostStatus !== "candidate-do-not-host" || !lead.pageUrl || !lead.filePageUrl) return "";
      return `<div class="work-path-node work-path-node-score">
        <span class="work-path-node-kind">谱本候选</span>
        <strong>${escapeHtml(node.label || "谱本候选")}</strong>
        <small>${escapeHtml(lead.workTitle)} · FILE #${escapeHtml(lead.fileId)} · candidate-do-not-host</small>
        <div class="work-path-node-links"><a href="${escapeHtml(lead.pageUrl)}" target="_blank" rel="noopener noreferrer">作品页 ↗</a><a href="${escapeHtml(lead.filePageUrl)}" target="_blank" rel="noopener noreferrer">文件页 ↗</a></div>
      </div>`;
    }
    if (node.kind === "recording-lead") {
      const lead = recordingLeads.find((candidate) => candidate.id === node.leadId);
      if (!lead || lead.hostStatus !== "candidate-do-not-host" || !lead.sourceUrl) return "";
      const identifier = lead.matrix ? `matrix ${lead.matrix}` : `馆藏 ${lead.catalogueId || "待登记"}`;
      return `<div class="work-path-node work-path-node-recording">
        <span class="work-path-node-kind">录音候选</span>
        <strong>${escapeHtml(node.label || "录音候选")}</strong>
        <small>${escapeHtml(lead.workTitle)} · ${escapeHtml(identifier)} · candidate-do-not-host</small>
        <div class="work-path-node-links"><a href="${escapeHtml(lead.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开权威目录 ↗</a></div>
      </div>`;
    }
    if (node.kind === "performance-event") {
      const event = performanceEventFor(node.eventId);
      if (!event || event.eventType !== "premiere" && event.eventType !== "version-premiere") return "";
      return `<div class="work-path-node work-path-node-performance">
        <span class="work-path-node-kind">演出事件</span>
        <strong>${escapeHtml(node.label || event.title)}</strong>
        <small>${escapeHtml(event.dateLabel || event.date)} · ${escapeHtml(performanceEventLocation(event))}</small>
        <details class="performance-event-disclosure">
          <summary>展开事件记录 →</summary>
          ${performanceEventCard(event, { compact: true })}
        </details>
      </div>`;
    }
    return "";
  }

  function workPathCard(path, options = {}) {
    const person = workPathPerson(path);
    const matchMeta = options?.match ? searchMatchMeta(options.match) : "";
    const nodes = (path.nodes || []).map(workPathNode).filter(Boolean).join('<span class="work-path-arrow" aria-hidden="true">→</span>');
    const genres = (path.genres || []).join(" · ") || "待标注";
    const instrumentation = (path.instrumentation || []).join(" · ") || "待标注";
    return `<article class="work-path-card" data-work-path-id="${escapeHtml(path.id)}">
      ${matchMeta}
      <div class="work-path-card-top"><span>作品—版本路径</span><span>${escapeHtml(path.dateLabel)}</span></div>
      <h3>${escapeHtml(path.title)}</h3>
      <p class="work-path-original">${escapeHtml(path.originalTitle)}${path.workNumbers?.length ? ` · ${escapeHtml(path.workNumbers.join(" · "))}` : ""}</p>
      <div class="work-path-taxonomy"><span><b>体裁</b>${escapeHtml(genres)}</span><span><b>编制</b>${escapeHtml(instrumentation)}</span></div>
      <div class="work-path-meta"><span>关联人物：${escapeHtml(person?.name || "待关联")}</span><span>${escapeHtml((path.nodes || []).length)} 个已登记节点 · ${escapeHtml(performanceEventsForPath(path).length)} 条演出事件</span></div>
      <div class="work-path-chain" aria-label="人物到来源节点的研究路径">${nodes}</div>
      <p class="work-path-boundary"><strong>边界：</strong>${escapeHtml(path.boundary)}</p>
    </article>`;
  }

  function checklist(title, result, compact = false) {
    const rows = result.checks.map((item) => `
      <li class="gate-check ${item.passed ? "is-pass" : "is-blocked"}">
        <span aria-hidden="true">${item.passed ? "✓" : "×"}</span>
        <div><strong>${escapeHtml(item.label)}</strong>${compact ? "" : `<small>${escapeHtml(item.detail)}</small>`}</div>
      </li>`).join("");
    return `
      <section class="dossier-section gate-section">
        <div class="dossier-section-heading"><h3>${escapeHtml(title)}</h3><span>${result.allowed ? "通过" : `${result.blockers.length} 项受阻`}</span></div>
        <ul class="gate-checklist">${rows}</ul>
      </section>`;
  }

  function evidenceLink(value, label) {
    if (!rightsGate.hasHttpUrl(value)) return `<span class="evidence-link is-missing"><b>${escapeHtml(label)}</b><small>未登记 URL</small></span>`;
    return `<a class="evidence-link" href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer"><b>${escapeHtml(label)}</b><small>打开机构页面 ↗</small></a>`;
  }

  function rightsLayerRows(resource) {
    const layers = resource.rightsLayers || {};
    const definitions = [
      ["01", "作品", "composition"],
      ["02", "版本", "edition"],
      ["03", "表演", "performance"],
      ["04", "录音", "recording"],
      ["05", "地域", "territory"]
    ];
    return definitions.map(([number, label, key]) => {
      const layer = layers[key];
      const layerStatus = layer?.status || "missing";
      const layerLabel = layer?.label;
      return `
        <div class="dossier-rights-layer" data-layer-status="${escapeHtml(layerStatus)}">
          <b>${number}</b><strong>${label}</strong><span><i aria-hidden="true"></i>${valueOrMissing(layerLabel)}</span>
        </div>`;
    }).join("");
  }

  function fileEvidenceSection(resource) {
    const file = resource.fileEvidence || {};
    const verified = file.status === "verified";
    const fileRows = verified
      ? `
        <div><dt>同源文件</dt><dd>${evidenceLink(file.sourceFileUrl, "打开来源文件")}</dd></div>
        <div><dt>本地证据文件</dt><dd>${valueOrMissing(file.localPath)}</dd></div>
        <div><dt>类型 / 大小</dt><dd>${valueOrMissing(file.mimeType)} · ${valueOrMissing(file.bytes)} bytes</dd></div>
        <div><dt>真实文件签名</dt><dd><code>${escapeHtml(file.signature)}</code></dd></div>
        <div><dt>SHA-256</dt><dd><code class="hash-value">${escapeHtml(file.sha256)}</code></dd></div>
        <div><dt>校验方法</dt><dd>${valueOrMissing(file.verification)}</dd></div>`
      : `
        <div><dt>文件状态</dt><dd><span class="missing-value">${escapeHtml(file.status || "未登记")}</span></dd></div>
        <div><dt>无法确认原因</dt><dd>${valueOrMissing(file.missingReason)}</dd></div>`;
    return `
      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>同源文件与签名</h3><span>${verified ? "文件已校验" : "不得伪造"}</span></div>
        <dl class="dossier-metadata file-evidence-metadata">${fileRows}</dl>
      </section>`;
  }

  function reviewQueueSection(resource) {
    const queue = resource.reviewQueue || {};
    const missing = Array.isArray(queue.missing) ? queue.missing : [];
    const blockers = Array.isArray(queue.blockers) ? queue.blockers : [];
    return `
      <section class="dossier-section review-queue-section">
        <div class="dossier-section-heading"><h3>人工审阅队列</h3><span>${escapeHtml(queue.status || "未登记")}</span></div>
        <p class="dossier-description"><strong>缺失项：</strong>${missing.length ? missing.map(escapeHtml).join("、") : "未登记"}</p>
        <p class="dossier-description"><strong>下一步人工动作：</strong>${valueOrMissing(queue.nextHumanAction)}</p>
        <p class="dossier-description"><strong>当前阻断：</strong>${blockers.length ? blockers.map(escapeHtml).join("、") : "未登记"}</p>
      </section>`;
  }

  function accessAction(resource, gate) {
    if (gate.open.allowed) {
      return `<a class="button button-light dossier-primary-action" href="${escapeHtml(resource.assetUrl)}" target="_blank" rel="noopener">${escapeHtml(resource.access)} ↗</a>`;
    }
    if (gate.external.allowed) {
      return `<a class="button button-light dossier-primary-action" href="${escapeHtml(resource.sourceUrl)}" target="_blank" rel="noopener noreferrer">前往合法来源 ↗</a>`;
    }
    const firstBlocker = gate.open.blockers[0]?.label || "证据不完整";
    return `<button class="button button-disabled dossier-primary-action" type="button" disabled aria-disabled="true">证据未齐，禁止开放</button><small>首项阻断：${escapeHtml(firstBlocker)}</small>`;
  }

  function renderResourceDetail(resource) {
    const gate = evaluationFor(resource);
    const person = personFor(resource);
    const blockerLabels = gate.open.blockers.map((item) => item.label);
    const decisionLabel = gate.decision.allowed ? "证据判定已完成" : "证据判定未完成";
    const openLabel = gate.open.allowed ? "允许站内开放" : "站内开放受阻";

    $("#resource-detail-kicker").textContent = `${typeLabels[resource.type].toUpperCase()} · RESOURCE DOSSIER`;
    $("#resource-detail-title").textContent = resource.title;
    $("#resource-detail-summary").textContent = resource.subtitle;
    $("#resource-detail-body").innerHTML = `
      <div class="dossier-status-line">
        ${statusPill(resource)}
        ${gatePill(resource)}
        <span class="dossier-record-id">${escapeHtml(resource.id)}</span>
      </div>

      <section class="gate-overview" aria-label="闸门判定总览">
        <div class="gate-overview-card ${gate.admission.allowed ? "is-pass" : "is-blocked"}"><span>入库闸门</span><strong>${gate.admission.allowed ? "已准入" : "拒绝入库"}</strong><small>${gate.admission.allowed ? "权利状态与核心字段已登记" : `${gate.admission.blockers.length} 项核心字段缺失`}</small></div>
        <div class="gate-overview-card ${gate.decision.allowed ? "is-pass" : "is-blocked"}"><span>证据判定</span><strong>${decisionLabel}</strong><small>${gate.decision.allowed ? "来源、权利、地域与责任人可回链" : `${gate.decision.blockers.length} 项证据仍缺失`}</small></div>
        <div class="gate-overview-card ${gate.open.allowed ? "is-pass" : "is-blocked"}"><span>开放闸门</span><strong>${openLabel}</strong><small>${gate.open.allowed ? "具体文件与哈希均已固定" : `不会生成播放、预览或下载入口`}</small></div>
      </section>

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>目录与版本</h3><span>最小记录单位</span></div>
        <dl class="dossier-metadata">
          <div><dt>关联人物</dt><dd>${personLink(person)}</dd></div>
          <div><dt>创作 / 出版日期</dt><dd>${valueOrMissing(resource.date)}</dd></div>
          <div><dt>具体版本 / 载体</dt><dd>${valueOrMissing(resource.edition)}</dd></div>
          <div><dt>当前法域说明</dt><dd>${valueOrMissing(resource.jurisdiction)}</dd></div>
          <div><dt>目标地域</dt><dd>${valueOrMissing(resource.territories)}</dd></div>
          <div><dt>访问方式</dt><dd>${valueOrMissing(resource.access)}</dd></div>
          <div><dt>复核日期</dt><dd>${valueOrMissing(resource.reviewedAt)}</dd></div>
          <div><dt>复核责任人</dt><dd>${valueOrMissing(resource.reviewedBy)}</dd></div>
        </dl>
        <p class="dossier-description">${escapeHtml(resource.description)}</p>
      </section>

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>五层权利台账</h3><span>不从年代自动推断</span></div>
        <div class="dossier-rights-grid">${rightsLayerRows(resource)}</div>
      </section>

      ${checklist("入库字段检查", gate.admission, true)}
      ${checklist("开放证据检查", gate.open)}

      ${fileEvidenceSection(resource)}
      ${reviewQueueSection(resource)}

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>证据链</h3><span>${gate.decision.allowed ? "可回链" : "尚未闭合"}</span></div>
        <div class="evidence-links">
          ${evidenceLink(resource.sourceUrl, "载体 / 来源记录")}
          ${evidenceLink(resource.rightsEvidenceUrl, "权利 / 许可依据")}
        </div>
        <div class="evidence-gap"><b>当前证据缺口</b><p>${escapeHtml(resource.evidenceGap)}</p></div>
        ${blockerLabels.length ? `<p class="blocker-summary"><strong>全部开放阻断项：</strong>${blockerLabels.map(escapeHtml).join("、")}</p>` : ""}
      </section>

      <footer class="dossier-actions">
        <div>${accessAction(resource, gate)}</div>
        <button class="text-button" type="button" data-view="rights">回到权利台账 →</button>
      </footer>`;
  }

  function personResourceCards(person) {
    const resources = data.resources.filter((resource) => resource.personId === person.id);
    if (!resources.length) return '<p class="dossier-description">当前目录还没有直接关联到这位人物的生产资源；可先从时期和作品关键词继续检索。</p>';
    return `<div class="person-resource-list">${resources.map((resource) => `
      <button class="person-resource-card" type="button" data-resource-id="${escapeHtml(resource.id)}">
        <span class="person-resource-type">${escapeHtml(typeLabels[resource.type])}</span>
        <strong>${escapeHtml(resource.title)}</strong>
        <small>${escapeHtml(resource.date)} · ${escapeHtml(resource.edition)}</small>
        <span class="person-resource-state">${statusPill(resource)}${gatePill(resource)}</span>
      </button>`).join("")}</div>`;
  }

  function personScoreLeadCards(person) {
    const leads = scoreLeads.filter((lead) => lead.personId === person.id);
    if (!leads.length) return '<p class="dossier-description">当前没有已登记的谱本候选线索。</p>';
    return `<div class="person-lead-list">${leads.map((lead) => scoreLeadCard(lead)).join("")}</div>`;
  }

  function personRecordingLeadCards(person) {
    const leads = recordingLeads.filter((lead) => lead.personId === person.id);
    if (!leads.length) return '<p class="dossier-description">当前没有已登记的 item-level 录音候选线索。</p>';
    return `<div class="person-lead-list">${leads.map((lead) => recordingLeadCard(lead)).join("")}</div>`;
  }

  function personWorkPathCards(person) {
    const paths = workPathsForPerson(person);
    if (!paths.length) return '<p class="dossier-description">当前没有已登记的作品—版本路径。</p>';
    return `<div class="work-path-grid">${paths.map((path) => workPathCard(path)).join("")}</div>`;
  }

  function publicEvidenceCards(person) {
    const dossier = evidenceFor(person);
    const publicEvidence = publicEvidenceOnly(dossier.evidence || []);
    if (!publicEvidence.length) return '<p class="dossier-description">当前没有可公开展示的证据卡；私研材料数量会保留在统计中，但不会进入公开档案 DOM。</p>';
    const featuredEvidence = [];
    const featuredIds = new Set();
    ["original", "scholar", "record", "unclassified"].forEach((layer) => {
      const match = publicEvidence.find((item) => classifyEvidenceLayer(item) === layer && !featuredIds.has(item.id));
      if (match) {
        featuredEvidence.push(match);
        featuredIds.add(match.id);
      }
    });
    publicEvidence.forEach((item) => {
      if (featuredEvidence.length < 4 && !featuredIds.has(item.id)) {
        featuredEvidence.push(item);
        featuredIds.add(item.id);
      }
    });
    return `<div class="person-evidence-list">${featuredEvidence.map((item) => `
      <article class="person-evidence-card">
        <div><b>${escapeHtml(evidenceTrackLabels[item.track] || item.track)}</b><span class="person-evidence-layer">${escapeHtml(evidenceLayerLabels[classifyEvidenceLayer(item)] || "证据层级待人工标注")}</span><span>${escapeHtml(visibilityLabels[item.visibility] || item.visibility)}</span></div>
        <p>${escapeHtml(item.claim)}</p>
        <small>${escapeHtml(item.sourceLabel)} · ${escapeHtml(item.locator)}</small>
        ${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开公开来源 ↗</a>` : ""}
      </article>`).join("")}</div>`;
  }

  function renderPersonDetail(person) {
    const agent = agentFor(person);
    const agentPrompt = agent?.starterQuestions?.[0] || `${person.name}有哪些已登记的作品和来源？`;
    const dossier = evidenceFor(person);
    const evidence = dossier.evidence || [];
    const publicCount = publicEvidenceOnly(evidence).length;
    const privateCount = evidence.filter((item) => item.visibility === "private-research").length;
    const relatedResources = data.resources.filter((resource) => resource.personId === person.id);
    const relatedWorkPaths = workPathsForPerson(person);
    const scoreLeadCount = scoreLeads.filter((lead) => lead.personId === person.id).length;
    const recordingLeadCount = recordingLeads.filter((lead) => lead.personId === person.id).length;
    const statusLabel = agent.status === "pilot" ? "来源约束试运行" : agent.label;
    const portraitMarkup = person.portrait
      ? `<img src="${escapeHtml(person.portrait)}" alt="${escapeHtml(person.portraitAlt || `${person.name}肖像`)}" referrerpolicy="no-referrer">`
      : `<span class="person-profile-fallback" aria-hidden="true">${escapeHtml(person.initial)}</span>`;
    const portraitCredit = person.portraitSource
      ? `<a href="${escapeHtml(person.portraitSource)}" target="_blank" rel="noopener noreferrer">肖像来源 · Wikimedia Commons ↗</a>`
      : "";

    $("#person-detail-kicker").textContent = `${person.era.toUpperCase()} · PERSON DOSSIER`;
    $("#person-detail-title").textContent = person.name;
    $("#person-detail-summary").textContent = `${person.latin} · ${person.years}`;
    $("#person-detail-body").innerHTML = `
      <div class="dossier-status-line">
        <span class="person-era-pill">${escapeHtml(person.era)}</span>
        <span class="agent-status-pill"><i aria-hidden="true"></i>音乐家智能体 · ${escapeHtml(statusLabel)}</span>
        <span class="dossier-record-id">${escapeHtml(person.id)}</span>
      </div>

      <div class="person-dossier-jumpbar" aria-label="人物页快捷跳转">
        <button type="button" data-person-anchor="ai">直达 AI 对话</button>
        <button type="button" data-person-anchor="bio">查看生平 / 贡献</button>
        <button type="button" data-person-anchor="portfolio">打开作品集</button>
      </div>
      <div class="person-chat-bridge" aria-hidden="true"></div>

      <section class="person-profile-hero" style="--person-color:${escapeHtml(person.color)}" aria-label="${escapeHtml(person.name)}人物简介">
        <div class="person-profile-portrait">${portraitMarkup}</div>
        <div class="person-profile-copy">
          <span class="person-profile-kicker">SELECTED MASTER · ${escapeHtml(person.era)}</span>
          <h3>${escapeHtml(person.name)}</h3>
          <p class="person-profile-latin">${escapeHtml(person.latin)} · ${escapeHtml(person.years)}</p>
          <p class="person-profile-summary">${escapeHtml(person.summary)}</p>
          <div class="person-profile-actions">
            <button class="button button-accent" type="button" data-person-agent="${escapeHtml(person.id)}"><span aria-hidden="true">✦</span> 和 ${escapeHtml(person.name)} 对话</button>
            <button class="button button-ghost" type="button" data-person-portfolio="scores">打开作品集</button>
          </div>
          <div class="person-profile-credit">${portraitCredit}</div>
        </div>
      </section>

       <div class="person-core-grid" aria-label="人物三大入口">
         <section class="person-ai-portal person-core-card" aria-label="人物 AI 对话入口" id="person-ai-entry">
           <div class="person-ai-panel">
             <div class="person-ai-copy">
               <span class="person-profile-kicker">AI CONVERSATION · SOURCE-BOUND</span>
               <h3>AI 对话</h3>
               <p>像聊天一样直接问这位音乐家：作品、版本、美学、书信和录音都可以，但回答必须回到证据卡、页码和来源边界。</p>
               <div class="person-chat-status"><i aria-hidden="true"></i>已连接来源约束智能体 · public evidence only</div>
             </div>
             <div class="person-chat-preview" aria-label="对话示意" role="status" aria-live="polite">
               <div class="person-chat-preview-top"><span>最近对话</span><small>source-bound · public evidence only</small></div>
               <div class="person-chat-thread">
                 <div class="person-chat-bubble person-chat-bubble-user">${escapeHtml(agentPrompt)}</div>
                 <div class="person-chat-bubble person-chat-bubble-assistant">我会先核对作品、版本、页码与证据卡；证据不足时会直接返回 not_answerable。</div>
               </div>
               <div class="person-chat-typing" aria-hidden="true"><span></span><span></span><span></span></div>
             </div>
           </div>
           <form class="person-chat-compose" data-person-chat-form>
             <label class="sr-only" for="person-chat-input-${escapeHtml(person.id)}">输入与 ${escapeHtml(person.name)} 有关的问题</label>
             <textarea id="person-chat-input-${escapeHtml(person.id)}" class="person-chat-input" rows="3" data-person-chat-input placeholder="例如：${escapeHtml(agentPrompt)}"></textarea>
             <div class="person-chat-actions">
               <div class="person-chat-chips" aria-label="快捷追问">
                 <button type="button" data-person-chat-preset="请先给我一段关于这位人物的来源约束开场回答。">开场概览</button>
                 <button type="button" data-person-chat-preset="请优先回答与作品版本和页码相关的问题。">版本与页码</button>
                 <button type="button" data-person-chat-preset="如果证据不足，请直接说明 not_answerable。">证据边界</button>
               </div>
               <button class="button button-light" type="submit">打开对话 ↗</button>
             </div>
           </form>
         </section>

         <section class="person-overview-grid person-core-card" aria-label="生平与贡献" id="person-bio-entry">
           <div class="person-overview-copy">
             <span class="person-profile-kicker">BIOGRAPHIA · CONTRIBUTION</span>
             <h3>生平 / 贡献</h3>
             <p>${escapeHtml(person.summary)}</p>
             <button class="inline-query-link" type="button" data-search-query="${escapeHtml(person.era)}">沿 ${escapeHtml(person.era)} 继续检索 →</button>
           </div>
           <dl class="person-profile-stats">
             <div><dt>作品路径</dt><dd>${relatedWorkPaths.length}</dd><small>人物 → 作品 → 版本</small></div>
             <div><dt>谱本候选</dt><dd>${scoreLeadCount}</dd><small>外部研究入口</small></div>
             <div><dt>录音候选</dt><dd>${recordingLeadCount}</dd><small>矩阵 / 馆藏线索</small></div>
           </dl>
         </section>

         <section class="person-portfolio-overview person-core-card" aria-labelledby="person-portfolio-title" id="person-portfolio-entry">
           <div class="dossier-section-heading"><div><span class="person-profile-kicker">CATALOGUS · PORTFOLIO</span><h3 id="person-portfolio-title">作品集</h3></div><span>乐谱 · 录音 · 著作</span></div>
           <div class="portfolio-entry-grid">
             <button class="portfolio-entry" type="button" data-person-portfolio="scores"><span class="portfolio-entry-icon" aria-hidden="true">𝄞</span><strong>乐谱</strong><small>具体作品、版本与谱本候选</small><b>进入目录 ↗</b></button>
             <button class="portfolio-entry" type="button" data-person-portfolio="recordings"><span class="portfolio-entry-icon" aria-hidden="true">◉</span><strong>录音</strong><small>历史录音、矩阵号与馆藏线索</small><b>进入目录 ↗</b></button>
             <button class="portfolio-entry" type="button" data-person-portfolio="writings"><span class="portfolio-entry-icon" aria-hidden="true">¶</span><strong>著作</strong><small>美学、书信与音乐学研究</small><b>进入目录 ↗</b></button>
           </div>
         </section>
       </div>

      <section class="person-path" aria-label="研究路径">
        <div class="person-path-step"><b>01</b><strong>人物</strong><small>${escapeHtml(person.name)}</small></div>
        <span aria-hidden="true">→</span>
        <div class="person-path-step"><b>02</b><strong>作品 / 版本</strong><small>${relatedWorkPaths.length} 条路径 · ${relatedResources.length} 条资源卷宗</small></div>
        <span aria-hidden="true">→</span>
        <div class="person-path-step"><b>03</b><strong>证据卷宗</strong><small>${publicCount} 条公开卡片</small></div>
        <span aria-hidden="true">→</span>
        <div class="person-path-step"><b>04</b><strong>年鉴九视图</strong><small>回到时间与关系场</small></div>
      </section>

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>人物索引</h3><span>来源字段，不替代传记判断</span></div>
        <dl class="dossier-metadata">
          <div><dt>中文名</dt><dd>${escapeHtml(person.name)}</dd></div>
          <div><dt>拉丁转写</dt><dd>${escapeHtml(person.latin)}</dd></div>
          <div><dt>生卒年字段</dt><dd>${escapeHtml(person.years)}</dd></div>
          <div><dt>时期标签</dt><dd><button class="inline-query-link" type="button" data-search-query="${escapeHtml(person.era)}">${escapeHtml(person.era)} · 检索 →</button></dd></div>
        </dl>
        <p class="dossier-description">${escapeHtml(person.summary)}</p>
      </section>

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>作品—版本路径</h3><span>人物 → 作品 → 版本 → 来源节点</span></div>
        ${personWorkPathCards(person)}
      </section>

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>关联资源</h3><span>点开进入独立资源卷宗</span></div>
        ${personResourceCards(person)}
      </section>

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>候选谱本线索</h3><span>外链研究入口 · 不进入生产资源</span></div>
        ${personScoreLeadCards(person)}
      </section>

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>候选录音线索</h3><span>矩阵 / 馆藏入口 · 不进入生产资源</span></div>
        ${personRecordingLeadCards(person)}
      </section>

      <section class="dossier-section">
        <div class="dossier-section-heading"><h3>公开证据轨道</h3><span>公开 ${publicCount} 条 · 私研 ${privateCount} 条</span></div>
        ${publicEvidenceCards(person)}
        ${privateCount ? '<p class="private-evidence-boundary">私研材料已计数但不在公开档案中渲染，也不会进入公开模型请求。</p>' : ""}
      </section>

      <section class="dossier-section person-boundary-section">
        <div class="dossier-section-heading"><h3>研究边界</h3><span>下一步由证据决定</span></div>
        <p class="dossier-description"><strong>智能体状态：</strong>${escapeHtml(agent.detail || "已建立来源约束的研究入口")}</p>
        <p class="dossier-description"><strong>尚未回答：</strong>${escapeHtml((dossier.notYetAnswerable || []).join("；") || "暂无单独登记")}</p>
        <p class="dossier-description"><strong>下一步阅读：</strong>${escapeHtml(agent.nextReading || "等待人工建立阅读队列")}</p>
      </section>

      <footer class="dossier-actions">
        <div>
          <button class="button button-light dossier-primary-action" type="button" data-person-agent="${escapeHtml(person.id)}">询问人物智能体 ↗</button>
          <button class="text-button" type="button" data-atlas-person="${escapeHtml(person.id)}">在年鉴中定位此人 →</button>
        </div>
        <button class="text-button" type="button" data-search-query="${escapeHtml(person.years)}">按生卒年检索</button>
      </footer>`;

    const dialog = $("#person-detail");
    const jumpTargets = {
      ai: $("#person-ai-entry", dialog),
      bio: $("#person-bio-entry", dialog),
      portfolio: $("#person-portfolio-entry", dialog)
    };
    $$('[data-person-anchor]', dialog).forEach((button) => {
      button.addEventListener('click', () => {
        const target = jumpTargets[button.dataset.personAnchor];
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, { once: true });
    });
    $$('[data-person-chat-preset]', dialog).forEach((button) => {
      button.addEventListener('click', () => {
        const input = $('#person-chat-input-' + person.id, dialog);
        if (input) {
          input.value = button.dataset.personChatPreset || '';
          input.focus({ preventScroll: true });
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, { once: true });
    });
    const chatForm = $('[data-person-chat-form]', dialog);
    if (chatForm) {
      chatForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = $('#person-chat-input-' + person.id, dialog);
        if (!input) return;
        const message = input.value.trim();
        if (!message) return;
        closePersonDetail({ restoreView: false });
        askLibrarian(`${person.name}：${message}`);
      });
    }
  }

  function openResourceDetail(resourceId, options = {}) {
    const resource = data.resources.find((item) => item.id === resourceId);
    if (!resource) {
      toast("该记录未通过入库闸门，或不存在");
      return;
    }
    closePersonDetail({ restoreView: false });
    if (!options.preserveReturnView) {
      state.detailReturnView = state.view;
      state.detailTrigger = document.activeElement;
      state.detailScrollY = window.scrollY;
    }
    renderResourceDetail(resource);
    const dialog = $("#resource-detail");
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("resource-detail-open");
    state.detailResourceId = resource.id;
    if (options.updateHash !== false) history.pushState({ annalesResource: resource.id }, "", `#resource/${encodeURIComponent(resource.id)}`);
    window.setTimeout(() => $("#close-resource-detail").focus(), 0);
  }

  function restoreDetailContext() {
    const trigger = state.detailTrigger;
    window.scrollTo({ top: state.detailScrollY, behavior: "auto" });
    window.setTimeout(() => (trigger?.isConnected ? trigger : $("#main-content")).focus({ preventScroll: true }), 0);
  }

  function closeResourceDetail(options = {}) {
    const dialog = $("#resource-detail");
    if (dialog.open) dialog.close();
    document.body.classList.remove("resource-detail-open");
    if (options.restoreView !== false && location.hash.startsWith("#resource/")) {
      if (history.state?.annalesResource === state.detailResourceId) {
        state.restoreAfterRoute = true;
        history.back();
        return;
      }
      showView(state.detailReturnView || "home", { focus: false, scroll: false });
      restoreDetailContext();
    }
  }

  function restorePersonContext() {
    const trigger = state.personDetailTrigger;
    window.scrollTo({ top: state.personDetailScrollY, behavior: "auto" });
    if (state.personDetailReturnView === "home") {
      const position = Number.isFinite(state.personDetailCarouselPosition)
        ? state.personDetailCarouselPosition
        : state.personDetailCarouselScrollLeft;
      restoreDepthCarouselPosition(position);
    }
    window.setTimeout(() => (trigger?.isConnected ? trigger : $("#main-content")).focus({ preventScroll: true }), 0);
  }

  function openPersonDetail(personId, options = {}) {
    const person = data.people.find((item) => item.id === personId);
    if (!person) {
      toast("该人物档案不存在");
      return;
    }
    closeResourceDetail({ restoreView: false });
    if (!options.preserveReturnView) {
      state.personDetailReturnView = state.view;
      state.personDetailTrigger = document.activeElement;
      state.personDetailScrollY = window.scrollY;
      state.personDetailCarouselPosition = state.carouselPosition;
      state.personDetailCarouselScrollLeft = state.carouselPosition;
    }
    renderPersonDetail(person);
    const dialog = $("#person-detail");
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("person-detail-open");
    state.personDetailId = person.id;
    if (options.updateHash !== false) history.pushState({ annalesPerson: person.id }, "", `#person/${encodeURIComponent(person.id)}`);
    window.setTimeout(() => $("#close-person-detail").focus(), 0);
  }

  function closePersonDetail(options = {}) {
    const dialog = $("#person-detail");
    if (dialog.open) dialog.close();
    document.body.classList.remove("person-detail-open");
    if (options.restoreView !== false && location.hash.startsWith("#person/")) {
      if (history.state?.annalesPerson === state.personDetailId) {
        state.personRestoreAfterRoute = true;
        history.back();
        return;
      }
      showView(state.personDetailReturnView || "home", { focus: false, scroll: false });
      restorePersonContext();
    }
  }

  function wrapCarouselIndex(value) {
    const count = data.people.length;
    if (!count) return 0;
    return ((value % count) + count) % count;
  }

  function carouselIndexFromPosition(position = state.carouselPosition) {
    return wrapCarouselIndex(Math.round(position));
  }

  function carouselDistance(index, position) {
    const count = data.people.length;
    let distance = index - position;
    if (count > 1) {
      distance = ((distance % count) + count) % count;
      if (distance > count / 2) distance -= count;
    }
    return distance;
  }

  function carouselGeometry(grid) {
    const width = Math.max(grid.clientWidth || window.innerWidth || 960, 320);
    const mobile = mobileQuery.matches;
    // The reference motion is a dense film-strip: the active card is only one
    // step larger than its neighbours, while 6–8 portraits remain in view.
    // Keep the step independent from the card's visual scale so the same
    // composition survives a desktop-to-phone resize.
    const cardWidth = mobile
      ? Math.min(150, Math.max(118, width * 0.34))
      : Math.min(284, Math.max(204, width * 0.21));
    const cardHeight = mobile
      ? Math.min(Math.max(cardWidth * 2.35, 280), 340)
      : Math.min(510, Math.max(340, cardWidth * 1.78));
    return {
      cardWidth,
      cardHeight,
      spread: mobile ? Math.min(108, Math.max(82, cardWidth * 0.78)) : Math.min(218, Math.max(146, cardWidth * 0.76)),
      depth: mobile ? 22 : 40,
      tilt: mobile ? 3 : 4.5,
      perspective: mobile ? 900 : 1250
    };
  }

  function clampUnit(value) {
    return Math.max(-1, Math.min(1, Number(value) || 0));
  }

  function invalidateCarouselRenderCache() {
    const cache = state.carouselRenderCache;
    cache.geometry = null;
    cache.cameraTransform = "";
    cache.activeIndex = null;
  }

  function ensureCarouselRenderCache(grid) {
    const cache = state.carouselRenderCache;
    if (!grid) return cache;
    const cards = $$(".person-card", grid);
    const sameCards = cache.grid === grid
      && cache.cards.length === cards.length
      && cache.cards.every((entry, index) => entry.card === cards[index]);
    if (!sameCards) {
      cache.grid = grid;
      cache.cards = cards.map((card, index) => ({
        card,
        index,
        depthState: null,
        isCenter: null,
        transform: "",
        opacity: "",
        zIndex: "",
        pointerEvents: ""
      }));
      cache.geometry = null;
      cache.cameraTransform = "";
      cache.activeIndex = null;
      cache.cards.forEach(({ card, index }) => {
        const delay = -(index * 1.37 + (index % 2) * 0.29).toFixed(2);
        card.style.setProperty("--portrait-delay", `${delay}s`);
        card.style.removeProperty("filter");
      });
    }
    if (!cache.geometry) {
      cache.geometry = carouselGeometry(grid);
      grid.style.setProperty("--depth-card-width", `${cache.geometry.cardWidth}px`);
      grid.style.setProperty("--depth-card-height", `${cache.geometry.cardHeight}px`);
      grid.style.setProperty("--depth-perspective", `${cache.geometry.perspective}px`);
    }
    return cache;
  }

  function writeCarouselCameraTransform(grid, cache, transform) {
    if (cache.cameraTransform === transform) return;
    cache.cameraTransform = transform;
    // Camera coordinates used to be written as inherited custom properties.
    // That invalidated the style of every descendant on every drag frame.
    // One direct compositor transform keeps the same rig while confining the
    // update to the rail layer itself.
    grid.style.transform = transform;
  }

  function updateCarouselCameraRig(grid, geometry, now = performance.now()) {
    if (!grid || !geometry) return;
    const cache = state.carouselRenderCache;
    const motionSpeed = Math.min(1, Math.abs(state.carouselVelocity) / 4.5);
    const driftPhase = state.carouselPosition * 0.35 + now / 5200;
    const mobile = mobileQuery.matches;
    const microDriftX = Math.sin(driftPhase) * (mobile ? 0.14 : 0.28) + Math.sin(driftPhase * 0.57 + 0.7) * (mobile ? 0.08 : 0.16);
    const microDriftY = Math.cos(driftPhase * 0.82) * (mobile ? 0.07 : 0.15);
    const microRoll = Math.sin(driftPhase * 0.72) * (mobile ? 0.018 : 0.03);
    const microScale = 1 + Math.sin(driftPhase * 0.46) * (mobile ? 0.0007 : 0.0011);
    const pointerRig = state.carouselCameraPointer || { x: 0, y: 0 };
    const pointerCameraX = pointerRig.x * (mobile ? 1.6 : 4.4);
    const pointerCameraY = pointerRig.y * (mobile ? 0.7 : 1.55);
    const pointerRoll = pointerRig.x * (mobile ? 0.055 : 0.13);
    const velocityX = Math.max(-7, Math.min(7, state.carouselVelocity * (mobile ? 0.7 : 1.05)));
    const cameraX = velocityX + microDriftX + pointerCameraX;
    const cameraY = -(motionSpeed * (mobile ? 0.72 : 1.42)) + microDriftY + pointerCameraY;
    const cameraRoll = Math.max(-0.48, Math.min(0.48, -state.carouselVelocity * (mobile ? 0.03 : 0.052) + microRoll + pointerRoll));
    const cameraScale = 1 + motionSpeed * (mobile ? 0.0018 : 0.0036) + (microScale - 1);
    const transform = `translate3d(${cameraX.toFixed(2)}px, ${cameraY.toFixed(2)}px, 0) rotateZ(${cameraRoll.toFixed(3)}deg) scale(${cameraScale.toFixed(4)})`;
    writeCarouselCameraTransform(grid, cache, transform);
  }

  function scheduleCarouselCameraPointer() {
    const grid = $("#people-grid");
    const rig = state.carouselCameraPointer;
    if (!grid || !rig || rig.frame) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      rig.x = 0;
      rig.y = 0;
      rig.targetX = 0;
      rig.targetY = 0;
      const cache = ensureCarouselRenderCache(grid);
      updateCarouselCameraRig(grid, cache.geometry);
      return;
    }
    const tick = () => {
      const currentGrid = $("#people-grid");
      if (!currentGrid || currentGrid !== grid) {
        rig.frame = 0;
        return;
      }
      const follow = mobileQuery.matches ? 0.19 : 0.145;
      rig.x += (rig.targetX - rig.x) * follow;
      rig.y += (rig.targetY - rig.y) * follow;
      const cache = ensureCarouselRenderCache(currentGrid);
      updateCarouselCameraRig(currentGrid, cache.geometry);
      const settled = Math.abs(rig.targetX - rig.x) < 0.002 && Math.abs(rig.targetY - rig.y) < 0.002;
      if (!settled) {
        rig.frame = window.requestAnimationFrame(tick);
        return;
      }
      rig.x = rig.targetX;
      rig.y = rig.targetY;
      updateCarouselCameraRig(currentGrid, cache.geometry);
      rig.frame = 0;
    };
    rig.frame = window.requestAnimationFrame(tick);
  }

  function updateCarouselCameraPointer(event) {
    const grid = $("#people-grid");
    const rig = state.carouselCameraPointer;
    if (!grid || !rig || event.pointerType === "touch" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    // Pointer moves can arrive faster than a paint. Reusing the stable shell
    // bounds avoids a forced layout read after the previous frame's transform
    // writes; resize/leave invalidates the snapshot below.
    if (!rig.rect || !rig.rect.width || !rig.rect.height) {
      const rect = grid.getBoundingClientRect();
      rig.rect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }
    const rect = rig.rect;
    if (!rect.width || !rect.height) return;
    rig.targetX = clampUnit((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
    rig.targetY = clampUnit((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
    scheduleCarouselCameraPointer();
  }

  function resetCarouselCameraPointer() {
    const rig = state.carouselCameraPointer;
    if (!rig) return;
    rig.targetX = 0;
    rig.targetY = 0;
    rig.rect = null;
    scheduleCarouselCameraPointer();
  }

  function layoutDepthCarousel(position = state.carouselPosition) {
    const grid = $("#people-grid");
    if (!grid) return;
    const cache = ensureCarouselRenderCache(grid);
    if (!cache.cards.length) return;
    const { geometry } = cache;
    const now = performance.now();
    updateCarouselCameraRig(grid, geometry, now);
    const motionSpeed = Math.min(1, Math.abs(state.carouselVelocity) / 4.5);
    const driftPhase = state.carouselPosition * 0.35 + now / 5200;
    cache.cards.forEach((meta, index) => {
      const { card } = meta;
      const distance = carouselDistance(index, position);
      const absoluteDistance = Math.abs(distance);
      const temporalLag = state.carouselMotionMode === "idle"
        ? 0
        : 0.018 + (index % 4) * 0.0045 + Math.min(0.014, absoluteDistance * 0.003);
      const phaseDrift = Math.sin(driftPhase + index * 0.82) * (state.carouselMotionMode === "idle" ? 0.02 : 0.065) + Math.cos(driftPhase * 0.74 + index * 0.31) * 0.02;
      const depthDistance = distance + state.carouselVelocity * temporalLag * 0.72 + phaseDrift * 0.14;
      const opticalDistance = distance + state.carouselVelocity * temporalLag * 1.2 + phaseDrift * 0.2;
      const depthAbsoluteDistance = Math.abs(depthDistance);
      const opticalAbsoluteDistance = Math.abs(opticalDistance);
      const depthRatio = Math.min(1, depthAbsoluteDistance / 3.15);
      const depthCurve = Math.pow(depthRatio, 1.12);
      const tilt = -geometry.tilt * Math.tanh(depthDistance * 0.9);
      const scale = Math.max(0.83, 1 - depthAbsoluteDistance * 0.045 - depthCurve * 0.012 + phaseDrift * 0.0025);
      const lift = Math.min(mobileQuery.matches ? 13 : 19, depthAbsoluteDistance * (mobileQuery.matches ? 2.8 : 4.2) + depthCurve * (mobileQuery.matches ? 1.2 : 2.2) + phaseDrift * 0.5);
      const opacity = opticalAbsoluteDistance < 0.5
        ? 1
        : opticalAbsoluteDistance < 1.5
          ? 0.9
          : opticalAbsoluteDistance < 2.5
            ? 0.72
            : Math.max(0.46, 0.63 - (opticalAbsoluteDistance - 2.5) * 0.1);
      const roll = -Math.sign(depthDistance) * Math.min(0.72, depthAbsoluteDistance * 0.18) + phaseDrift * 0.06;
      const pitch = Math.min(1.35, depthCurve * 1.35 + Math.max(-0.08, Math.min(0.08, phaseDrift * 0.05)));
      const travelDepth = motionSpeed * (absoluteDistance < 0.5 ? (mobileQuery.matches ? 2.2 : 4.5) : -(mobileQuery.matches ? 0.55 : 1.2));
      const visible = absoluteDistance <= 3.9;
      const isCenter = absoluteDistance < 0.5;
      const depthState = isCenter ? "center" : absoluteDistance < 1.35 ? "near" : absoluteDistance < 2.45 ? "mid" : "far";
      const transform = `translate(-50%, -50%) translateX(${(distance * geometry.spread).toFixed(2)}px) translateY(${lift.toFixed(2)}px) translateZ(${(-Math.min(geometry.depth * 3.5, geometry.depth * (depthAbsoluteDistance * 0.72 + depthAbsoluteDistance * depthAbsoluteDistance * 0.16)) + travelDepth).toFixed(2)}px) rotateY(${tilt.toFixed(2)}deg) rotateZ(${roll.toFixed(2)}deg) rotateX(${pitch.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      const opacityValue = opacity.toFixed(3);
      const zIndex = depthState === "center"
        ? "1000"
        : depthState === "near"
          ? `900${distance > 0 ? "1" : "0"}`
          : depthState === "mid"
            ? `800${distance > 0 ? "1" : "0"}`
            : `700${distance > 0 ? "1" : "0"}`;
      const pointerEvents = visible && opacity > 0.05 ? "auto" : "none";
      if (meta.transform !== transform) {
        card.style.transform = transform;
        meta.transform = transform;
      }
      if (meta.opacity !== opacityValue) {
        card.style.opacity = opacityValue;
        meta.opacity = opacityValue;
      }
      if (meta.zIndex !== zIndex) {
        card.style.zIndex = zIndex;
        meta.zIndex = zIndex;
      }
      if (meta.pointerEvents !== pointerEvents) {
        card.style.pointerEvents = pointerEvents;
        meta.pointerEvents = pointerEvents;
      }
      if (meta.depthState !== depthState) {
        card.dataset.depth = depthState;
        card.classList.toggle("is-near", depthState === "near");
        card.classList.toggle("is-mid", depthState === "mid");
        card.classList.toggle("is-far", depthState === "far");
        meta.depthState = depthState;
      }
      if (meta.isCenter !== isCenter) {
        card.classList.toggle("is-center", isCenter);
        card.setAttribute("aria-current", isCenter ? "true" : "false");
        card.tabIndex = isCenter ? 0 : -1;
        meta.isCenter = isCenter;
      }
    });
    const activeIndex = carouselIndexFromPosition(position);
    if (cache.activeIndex !== activeIndex) {
      cache.activeIndex = activeIndex;
      syncCarouselActive(position);
    }
  }

  function setHomeTheme(person, options = {}) {
    const home = $("#view-home");
    if (!home || !person) return;
    const index = Math.max(0, data.people.findIndex((item) => item.id === person.id));
    state.carouselActivePersonId = person.id;
    home.style.setProperty("--active-person-color", person.color);
    home.dataset.activePerson = person.id;
    $("#home-active-index").textContent = String(index + 1).padStart(2, "0");
    $("#home-active-name").textContent = person.name;
    $("#home-active-meta").textContent = `${person.latin} · ${person.years}`;
    $("#carousel-position").textContent = `${String(index + 1).padStart(2, "0")} / ${String(data.people.length).padStart(2, "0")}`;
    $$("#people-carousel-dots button").forEach((dot) => {
      const active = dot.dataset.carouselPerson === person.id;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
    if (options.scroll) focusPeopleCarousel(index, options);
  }

  function syncCarouselActive(position = state.carouselPosition) {
    const person = data.people[carouselIndexFromPosition(position)];
    if (person && person.id !== state.carouselActivePersonId) setHomeTheme(person);
  }

  function setCarouselMotion(mode = "idle") {
    state.carouselMotionMode = mode;
    const grid = $("#people-grid");
    if (!grid) return;
    grid.dataset.motion = mode;
    grid.classList.toggle("is-dragging", mode === "dragging");
    grid.classList.toggle("is-flinging", mode === "flinging");
    grid.classList.toggle("is-settling", mode === "settling");
    grid.closest(".person-hall-stage")?.classList.toggle("carousel-in-motion", mode !== "idle");
  }

  function scheduleCarouselDepthRender() {
    if (state.carouselDragRenderFrame) return;
    state.carouselDragRenderFrame = window.requestAnimationFrame(() => {
      state.carouselDragRenderFrame = 0;
      layoutDepthCarousel(state.carouselPosition);
    });
  }

  function cancelCarouselAnimation() {
    if (state.carouselAnimationTimer) {
      window.clearTimeout(state.carouselAnimationTimer);
      state.carouselAnimationTimer = 0;
    }
    if (state.carouselDragRenderFrame) {
      window.cancelAnimationFrame(state.carouselDragRenderFrame);
      state.carouselDragRenderFrame = 0;
    }
  }

  function estimatedCarouselTransitionPosition() {
    const transition = state.carouselTransition;
    if (!transition) return state.carouselPosition;
    const ratio = Math.max(0, Math.min(1, (performance.now() - transition.startedAt) / transition.duration));
    const eased = 1 - Math.pow(1 - ratio, 3);
    return transition.from + (transition.to - transition.from) * eased;
  }

  function interruptCarouselTransition() {
    if (!state.carouselTransition) return;
    const position = estimatedCarouselTransitionPosition();
    state.carouselTransition = null;
    cancelCarouselAnimation();
    state.carouselPosition = position;
    state.carouselTarget = position;
    state.carouselVelocity = 0;
    setCarouselMotion("idle");
    layoutDepthCarousel(position);
  }

  function restoreDepthCarouselPosition(position = 0) {
    cancelCarouselAnimation();
    const numericPosition = Number.isFinite(Number(position)) ? Number(position) : 0;
    state.carouselPosition = numericPosition;
    state.carouselTarget = numericPosition;
    state.carouselVelocity = 0;
    state.carouselTransition = null;
    state.carouselCameraPointer.x = 0;
    state.carouselCameraPointer.y = 0;
    state.carouselCameraPointer.targetX = 0;
    state.carouselCameraPointer.targetY = 0;
    state.carouselCameraPointer.rect = null;
    setCarouselMotion("idle");
    layoutDepthCarousel(numericPosition);
  }

  function animateDepthCarousel(target, options = {}) {
    cancelCarouselAnimation();
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const startPosition = state.carouselPosition;
    const initialVelocity = Number.isFinite(Number(options.initialVelocity)) ? Number(options.initialVelocity) : 0;
    const mode = options.mode || "settling";
    state.carouselTarget = target;
    const immediate = options.behavior === "auto" || reduced;
    if (immediate) {
      state.carouselPosition = wrapCarouselIndex(target);
      state.carouselTarget = state.carouselPosition;
      state.carouselVelocity = 0;
      state.carouselTransition = null;
      setCarouselMotion("idle");
      layoutDepthCarousel(state.carouselPosition);
      return;
    }
    if (Math.abs(target - startPosition) < 0.0001) {
      state.carouselPosition = wrapCarouselIndex(target);
      state.carouselTarget = state.carouselPosition;
      state.carouselVelocity = 0;
      state.carouselTransition = null;
      setCarouselMotion("idle");
      layoutDepthCarousel(state.carouselPosition);
      return;
    }

    const distance = Math.abs(target - startPosition);
    const velocityTrim = Math.min(180, Math.abs(initialVelocity) * 20);
    const duration = mode === "flinging"
      ? Math.max(500, Math.min(820, 720 - velocityTrim + Math.min(100, Math.max(0, distance - 1) * 55)))
      : Math.max(560, Math.min(760, 680 + Math.min(80, Math.max(0, distance - 1) * 45)));
    // The cards are rendered once at the destination and the browser interpolates
    // their compositor-friendly transforms. Dragging remains rAF-driven, but
    // arrows, keys, dots, wheel impulses and release settling share this path.
    $("#people-grid")?.style.setProperty("--carousel-transition-duration", `${duration}ms`);
    setCarouselMotion(mode);
    state.carouselVelocity = Math.max(-7.5, Math.min(7.5, initialVelocity));
    state.carouselPosition = target;
    layoutDepthCarousel(target);
    state.carouselTransition = { from: startPosition, to: target, startedAt: performance.now(), duration };

    state.carouselAnimationTimer = window.setTimeout(() => {
      state.carouselAnimationTimer = 0;
      state.carouselTransition = null;
      state.carouselPosition = wrapCarouselIndex(state.carouselTarget);
      state.carouselTarget = state.carouselPosition;
      state.carouselVelocity = 0;
      layoutDepthCarousel(state.carouselPosition);
      setCarouselMotion("idle");
    }, reduced ? 1 : duration);
  }

  function focusPeopleCarousel(index, options = {}) {
    const count = data.people.length;
    if (!count) return;
    interruptCarouselTransition();
    const desired = wrapCarouselIndex(index);
    const base = Math.round(state.carouselPosition);
    let delta = desired - wrapCarouselIndex(base);
    if (count > 1) {
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;
    }
    animateDepthCarousel(base + delta, options);
  }

  function movePeopleCarousel(direction) {
    const currentIndex = carouselIndexFromPosition();
    focusPeopleCarousel(currentIndex + direction);
  }

  function bindPeopleCarousel() {
    const grid = $("#people-grid");
    if (!grid || grid.dataset.bound === "true") return;
    grid.dataset.bound = "true";

    grid.addEventListener("dragstart", (event) => event.preventDefault());
    grid.addEventListener("pointermove", updateCarouselCameraPointer, { passive: true });
    grid.addEventListener("pointerleave", resetCarouselCameraPointer, { passive: true });
    grid.addEventListener("selectstart", (event) => {
      if (state.carouselPointer?.moved) event.preventDefault();
    });

    const finishPointer = (event) => {
      const pointer = state.carouselPointer;
      if (!pointer || pointer.id !== event.pointerId) return;
      state.carouselPointer = null;
      resetCarouselCameraPointer();
      grid.classList.remove("is-dragging");
      if (grid.hasPointerCapture?.(event.pointerId)) grid.releasePointerCapture(event.pointerId);
      if (pointer.moved) {
        state.carouselSuppressClickUntil = Date.now() + 260;
        const projected = state.carouselPosition + Math.max(-1.6, Math.min(1.6, pointer.velocity * 0.18));
        animateDepthCarousel(Math.round(projected), { mode: "flinging", initialVelocity: pointer.velocity * 0.56 });
      } else {
        animateDepthCarousel(Math.round(state.carouselPosition), { mode: "settling" });
      }
    };

    grid.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      interruptCarouselTransition();
      cancelCarouselAnimation();
      if (state.carouselWheelTimer) {
        window.clearTimeout(state.carouselWheelTimer);
        state.carouselWheelTimer = null;
      }
      state.carouselVelocity = 0;
      state.carouselPointer = {
        id: event.pointerId,
        startX: event.clientX,
        startPosition: state.carouselPosition,
        lastPosition: state.carouselPosition,
        lastTime: performance.now(),
        velocity: 0,
        moved: false
      };
      setCarouselMotion("dragging");
    }, { passive: false });
    grid.addEventListener("pointermove", (event) => {
      const pointer = state.carouselPointer;
      if (!pointer || pointer.id !== event.pointerId) return;
      const deltaX = event.clientX - pointer.startX;
      if (Math.abs(deltaX) > 6) pointer.moved = true;
      if (!pointer.moved) return;
      if (!grid.hasPointerCapture?.(event.pointerId)) {
        try {
          grid.setPointerCapture?.(event.pointerId);
        } catch {
          // A pointer can be cancelled between pointermove and capture; keep the drag state recoverable.
        }
      }
      event.preventDefault();
      const geometry = ensureCarouselRenderCache(grid).geometry;
      const nextPosition = pointer.startPosition - deltaX / Math.max(160, geometry.spread);
      const now = performance.now();
      const deltaSeconds = Math.max(0.008, (now - pointer.lastTime) / 1000);
      const rawVelocity = (nextPosition - pointer.lastPosition) / deltaSeconds;
      const smoothedVelocity = pointer.velocity * 0.72 + rawVelocity * 0.28;
      pointer.velocity = Math.max(-7.5, Math.min(7.5, smoothedVelocity));
      pointer.lastPosition = nextPosition;
      pointer.lastTime = now;
      state.carouselPosition = nextPosition;
      scheduleCarouselDepthRender();
    }, { passive: false });
    grid.addEventListener("pointerup", finishPointer);
    grid.addEventListener("pointercancel", finishPointer);
    grid.addEventListener("wheel", (event) => {
      if (event.ctrlKey || data.people.length < 2) return;
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!raw) return;
      event.preventDefault();
      interruptCarouselTransition();
      const geometry = ensureCarouselRenderCache(grid).geometry;
      const impulse = raw / Math.max(300, geometry.spread * 1.35) * 4.2;
      const velocity = Math.max(-7, Math.min(7, state.carouselVelocity + impulse));
      const projected = state.carouselPosition + Math.max(-1.8, Math.min(1.8, velocity * 0.16));
      animateDepthCarousel(Math.round(projected), { mode: "flinging", initialVelocity: velocity * 0.72 });
      if (state.carouselWheelTimer) window.clearTimeout(state.carouselWheelTimer);
      state.carouselWheelTimer = window.setTimeout(() => {
        state.carouselWheelTimer = null;
        const settleTarget = Math.round(state.carouselPosition + state.carouselVelocity * 0.08);
        animateDepthCarousel(settleTarget, { mode: "settling", initialVelocity: state.carouselVelocity * 0.16 });
      }, 170);
    }, { passive: false });
    grid.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); movePeopleCarousel(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); movePeopleCarousel(1); }
      if (event.key === "Home") { event.preventDefault(); focusPeopleCarousel(0); }
      if (event.key === "End") { event.preventDefault(); focusPeopleCarousel(data.people.length - 1); }
    });
    window.addEventListener("resize", () => {
      invalidateCarouselRenderCache();
      state.carouselCameraPointer.rect = null;
      scheduleCarouselDepthRender();
    }, { passive: true });
    $("#people-carousel-prev")?.addEventListener("click", () => movePeopleCarousel(-1));
    $("#people-carousel-next")?.addEventListener("click", () => movePeopleCarousel(1));
    $$("#people-carousel-dots button").forEach((dot) => dot.addEventListener("click", () => {
      const index = data.people.findIndex((person) => person.id === dot.dataset.carouselPerson);
      if (index >= 0) focusPeopleCarousel(index);
    }));
    const initialIndex = Math.max(0, data.people.findIndex((item) => item.id === state.carouselActivePersonId));
    state.carouselPosition = initialIndex;
    state.carouselTarget = initialIndex;
    state.carouselVelocity = 0;
    state.carouselCameraPointer.x = 0;
    state.carouselCameraPointer.y = 0;
    state.carouselCameraPointer.targetX = 0;
    state.carouselCameraPointer.targetY = 0;
    setCarouselMotion("idle");
    layoutDepthCarousel(initialIndex);
  }

  function renderHome() {
    if ($("#people-count")) $("#people-count").textContent = data.people.length;
    $("#people-grid").innerHTML = data.people.map(personCard).join("");
    $("#people-carousel-dots").innerHTML = data.people.map((person, index) => `<button type="button" data-carousel-person="${escapeHtml(person.id)}" aria-label="选择 ${escapeHtml(person.name)}" aria-current="${index === 0 ? "true" : "false"}"></button>`).join("");
     if ($("#quick-prompts")) $("#quick-prompts").innerHTML = data.quickPrompts.map((prompt) => `<button class="prompt-chip" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("");
  }

  function renderCatalogs() {
    ["score", "recording", "writing"].forEach((type) => {
      const filters = ["全部", ...new Set(data.resources.filter((item) => item.type === type).map((item) => item.statusLabel))];
      const bar = $(`[data-filter-for="${type}"]`);
      bar.innerHTML = filters.map((label, index) => `<button class="filter-chip ${index === 0 ? "is-active" : ""}" type="button" data-filter-type="${type}" data-filter="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join("");
      renderFilteredCatalog(type);
    });
    renderScoreLeads();
    renderRecordingLeads();
  }

  function renderScoreLeads() {
    const target = $("#score-leads");
    if (!target) return;
    target.innerHTML = scoreLeads.length
      ? scoreLeads.map((lead) => scoreLeadCard(lead)).join("")
      : '<div class="empty-state">当前没有已登记的外部谱本候选。</div>';
  }

  function renderRecordingLeads() {
    const target = $("#recording-leads");
    if (!target) return;
    target.innerHTML = recordingLeads.length
      ? recordingLeads.map((lead) => recordingLeadCard(lead)).join("")
      : '<div class="empty-state">当前没有已登记的外部录音候选。</div>';
  }

  function renderFilteredCatalog(type) {
    const selected = state.activeFilters[type];
    const resources = data.resources.filter((item) => item.type === type && (selected === "全部" || item.statusLabel === selected));
    const target = $(`#${type}-catalog`);
    target.innerHTML = resources.length ? resources.map(catalogCard).join("") : `<div class="empty-state">当前筛选下没有记录。</div>`;
  }

  function renderRights() {
    const completedDecisions = data.resources.filter((resource) => evaluationFor(resource).decision.allowed).length;
    $("#rights-decision-count").textContent = completedDecisions;
    $("#rights-table-body").innerHTML = data.resources.map((resource) => `
      <tr>
        <td><button class="table-record-link" type="button" data-resource-id="${resource.id}">${escapeHtml(resource.title)}</button></td>
        <td>${typeLabels[resource.type]}</td>
        <td>${statusPill(resource)}</td>
        <td>${gatePill(resource)}</td>
        <td>${escapeHtml(resource.access)}</td>
        <td>${escapeHtml(resource.evidenceGap)}</td>
      </tr>`).join("");
  }

  function atlasViewRecord(viewId = state.atlasView) {
    return atlasViews.find((view) => view.id === viewId) || atlasViews[0];
  }

  function atlasPersonRecord(personId = state.atlasPersonId) {
    return data.people.find((person) => person.id === personId) || null;
  }

  function atlasRouteHash(viewId = state.atlasView, personId = state.atlasPersonId) {
    const view = atlasViewIds.has(viewId) ? viewId : atlasViews[0].id;
    const person = atlasPersonRecord(personId);
    const personSegment = person && atlasPersonIds[person.id] ? `/person/${encodeURIComponent(person.id)}` : "";
    return `#atlas/${view}${personSegment}`;
  }

  function atlasFrameFragment() {
    const person = atlasPersonRecord();
    const legacyPersonId = person ? atlasPersonIds[person.id] : null;
    return legacyPersonId ? `m=${encodeURIComponent(legacyPersonId)}` : `v=${encodeURIComponent(atlasViewRecord().id)}`;
  }

  function syncAtlasShell(options = {}) {
    const view = atlasViewRecord();
    const person = atlasPersonRecord();
    state.atlasView = view.id;
    $$('[data-atlas-view]').forEach((button) => {
      const active = button.dataset.atlasView === view.id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $("#atlas-current-view-label").textContent = view.label;
    $("#atlas-current-path").textContent = person
      ? `人物档案 / ${person.name} / 年鉴核心 / ${view.label}`
      : `年鉴核心 / ${view.label}`;
    $("#atlas-current-description").textContent = person
      ? `${view.description} 当前保留 ${person.name} 的人物上下文。`
      : view.description;
    const returnButton = $("#atlas-return-person");
    returnButton.hidden = !person;
    returnButton.textContent = person ? `返回${person.name}档案 →` : "返回人物档案 →";
    returnButton.dataset.atlasReturnPersonId = person?.id || "";
    if (options.updateHash && state.view === "atlas") {
      const nextHash = atlasRouteHash();
      if (location.hash !== nextHash) {
        const method = options.historyMode === "push" ? "pushState" : "replaceState";
        history[method]({ annalesAtlas: view.id, annalesAtlasPerson: person?.id || null }, "", nextHash);
      }
    }
  }

  function bindAtlasFrameBridge() {
    state.atlasBridgeObserver?.disconnect();
    state.atlasBridgeObserver = null;
    const frame = $("#atlas-frame");
    try {
      const frameDocument = frame.contentDocument;
      const frameButtons = $$(`#views button[data-v]`, frameDocument);
      const frameDialog = $("#dlg", frameDocument);
      if (!frameButtons.length) return;
      const syncFromFrame = () => {
        const activeButton = frameButtons.find((button) => button.classList.contains("on"));
        const nextView = activeButton?.dataset.v;
        const legacyPersonId = frameDialog?.open ? frameDialog.dataset.m : "";
        const nextPersonId = Object.keys(atlasPersonIds).find((personId) => atlasPersonIds[personId] === legacyPersonId) || null;
        let changed = false;
        if (nextView && atlasViewIds.has(nextView) && nextView !== state.atlasView) {
          state.atlasView = nextView;
          changed = true;
        }
        if (nextPersonId !== state.atlasPersonId) {
          state.atlasPersonId = nextPersonId;
          changed = true;
        }
        if (changed) syncAtlasShell({ updateHash: true });
      };
      const observer = new MutationObserver(syncFromFrame);
      frameButtons.forEach((button) => observer.observe(button, { attributes: true, attributeFilter: ["class"] }));
      if (frameDialog) observer.observe(frameDialog, { attributes: true, attributeFilter: ["open", "data-m"] });
      state.atlasBridgeObserver = observer;
      syncFromFrame();
    } catch {
      toast("年鉴已载入；当前浏览器未开放同源视图同步");
    }
  }

  function syncAtlasFrameRoute() {
    if (!state.atlasLoaded) return;
    const frame = $("#atlas-frame");
    try {
      const frameWindow = frame.contentWindow;
      const person = atlasPersonRecord();
      const legacyPersonId = person ? atlasPersonIds[person.id] : null;
      if (typeof frameWindow.setView === "function") frameWindow.setView(atlasViewRecord().id);
      if (legacyPersonId && typeof frameWindow.openM === "function") {
        frameWindow.openM(legacyPersonId);
      } else if (!legacyPersonId) {
        const dialog = frameWindow.document?.getElementById("dlg");
        if (dialog?.open) dialog.close();
      }
    } catch {
      frame.src = `${frame.dataset.src}?v=0.2.18#${atlasFrameFragment()}`;
    }
  }

  function setAtlasView(viewId, options = {}) {
    if (!atlasViewIds.has(viewId)) return;
    state.atlasView = viewId;
    if (options.preservePerson !== true) state.atlasPersonId = null;
    syncAtlasShell({ updateHash: options.updateHash !== false, historyMode: options.historyMode });
    if (options.syncFrame !== false) syncAtlasFrameRoute();
  }

  function openAtlasForPerson(personId) {
    const person = data.people.find((item) => item.id === personId);
    if (!person || !atlasPersonIds[person.id]) {
      toast("该人物尚未与旧年鉴条目建立映射");
      return;
    }
    state.atlasView = "alm";
    state.atlasPersonId = person.id;
    closePersonDetail({ restoreView: false });
    showView("atlas", { updateHash: false, focus: false });
    history.pushState({ annalesAtlas: state.atlasView, annalesAtlasPerson: person.id }, "", atlasRouteHash());
    syncAtlasShell();
    syncAtlasFrameRoute();
  }

  async function copyAtlasLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      toast("当前年鉴深链已复制");
    } catch {
      toast("无法自动复制；可从地址栏复制当前深链");
    }
  }

  function loadAtlas(force = false) {
    const frame = $("#atlas-frame");
    if (!state.atlasLoaded || force) {
      $("#atlas-placeholder").hidden = false;
      const reload = force ? `&reload=${Date.now()}` : "";
      frame.src = `${frame.dataset.src}?v=0.2.18${reload}#${atlasFrameFragment()}`;
      state.atlasLoaded = true;
      return;
    }
    syncAtlasFrameRoute();
  }

  function loadBeilin(force = false) {
    const frame = $("#beilin-frame");
    if (!state.beilinLoaded || force) {
      $("#beilin-placeholder").hidden = false;
      const source = new URL(frame.dataset.src, location.href);
      if (force) source.searchParams.set("reload", String(Date.now()));
      frame.src = source.href;
      state.beilinLoaded = true;
    }
  }

  function showView(view, options = {}) {
    closeResourceDetail({ restoreView: false });
    closePersonDetail({ restoreView: false });
    state.view = view;
    state.searchQuery = "";
    state.searchFilter = "all";
    state.searchSort = "relevance";
    $("#global-search-input").value = "";
    $("#search-results").hidden = true;
    $$('[data-view-panel]').forEach((panel) => {
      const active = panel.dataset.viewPanel === view;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    document.body.classList.toggle("home-mode", view === "home");
    document.body.classList.toggle("module-view-mode", view === "atlas" || view === "beilin");
    $$(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
    document.body.classList.remove("nav-open");
    document.body.classList.remove("search-open");
    document.body.classList.remove("librarian-open");
    $("#nav-toggle").setAttribute("aria-expanded", "false");
    $("#search-toggle").setAttribute("aria-expanded", "false");
    syncLibrarianAccessibility();
    if (view === "atlas") {
      syncAtlasShell();
      loadAtlas();
    }
    if (view === "beilin") loadBeilin();
    if (options.updateHash !== false) history.replaceState(null, "", view === "atlas" ? atlasRouteHash() : `#${view}`);
    if (options.focus !== false) $("#main-content").focus({ preventScroll: true });
    if (options.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function valueMatchesQuery(value, q) {
    const normalizedValue = normalize(value);
    if (!normalizedValue) return false;
    const queryHasDigit = /\d/.test(q);
    const valueHasDigit = /\d/.test(normalizedValue);
    const allowsReverseContainment = (normalizedValue.length >= 4 || /[\u3400-\u9fff]/.test(normalizedValue)) && (!queryHasDigit || valueHasDigit);
    return normalizedValue.includes(q) || (allowsReverseContainment && q.includes(normalizedValue));
  }

  function buildMatch(kind, item, q, fields) {
    const matchedFields = fields.filter((field) => field.values.some((value) => valueMatchesQuery(value, q)));
    if (!matchedFields.length) return null;
    const score = matchedFields.reduce((total, field) => total + field.weight, 0);
    return { kind, item, score, fields: matchedFields.map((field) => field.label), matchedFieldIds: matchedFields.map((field) => field.id) };
  }

  function matchPassesFilter(match, filter) {
    if (filter === "all" || match.kind === filter) return true;
    if (filter === "score" && match.kind === "score-lead") return true;
    if (filter === "recording" && match.kind === "recording-lead") return true;
    if (filter === "era") return match.matchedFieldIds?.includes("era");
    if (filter === "rights") return match.matchedFieldIds?.includes("rights");
    return false;
  }

  function rankMatches(query, options = {}) {
    const q = normalize(query);
    if (!q) return [];
    const people = data.people.map((person) => buildMatch("person", person, q, [
      { id: "name", label: "人物名", values: [person.name, person.latin], weight: 8 },
      { id: "keywords", label: "别名/关键词", values: person.keywords, weight: 5 },
      { id: "era", label: "时期/简介", values: [person.era, person.years, person.summary], weight: 2 }
    ])).filter(Boolean);
    const resources = data.resources.map((resource) => {
      const person = personFor(resource);
      return buildMatch(resource.type, resource, q, [
        { id: "title", label: "作品/资源名", values: [resource.title, resource.subtitle], weight: 8 },
        { id: "person", label: "关联人物", values: [person?.name, person?.latin], weight: 6 },
        { id: "version", label: "版本/年代", values: [resource.edition, resource.date], weight: 5 },
        { id: "type", label: "类型/状态", values: [typeLabels[resource.type], resource.statusLabel, resource.access], weight: 3 },
        { id: "source", label: "来源/馆藏编号", values: [resource.sourceTitle, resource.sourceProvider, resource.rightsEvidenceSummary], weight: 4 },
        { id: "rights", label: "权利/访问", values: [resource.status, resource.statusLabel, resource.access, resource.jurisdiction, resource.territories, resource.evidenceGap, resource.rightsEvidenceSummary], weight: 3 },
        { id: "keywords", label: "关键词/说明", values: [resource.description, ...(resource.keywords || [])], weight: 2 }
      ]);
    }).filter(Boolean);
    const leads = scoreLeads.map((lead) => buildMatch("score-lead", lead, q, [
      { id: "title", label: "作品/资源名", values: [lead.workTitle, lead.part], weight: 8 },
      { id: "person", label: "关联人物", values: [personFor(lead)?.name, personFor(lead)?.latin], weight: 6 },
      { id: "version", label: "版本/年代", values: [lead.edition], weight: 5 },
      { id: "source", label: "来源/馆藏编号", values: ["IMSLP", lead.fileId, lead.pageUrl, lead.filePageUrl, lead.sourceAttribution], weight: 4 },
      { id: "rights", label: "权利/访问", values: [lead.imslpRightsLabel, lead.territoryNote, lead.hostStatus, lead.fileEvidenceStatus], weight: 3 }
    ])).filter(Boolean);
    const recordingMatches = recordingLeads.map((lead) => buildMatch("recording-lead", lead, q, [
      { id: "title", label: "作品/录音名", values: [lead.workTitle, lead.composerName], weight: 8 },
      { id: "performers", label: "演奏/指挥/乐团", values: [...(lead.performers || []), lead.conductor, lead.ensemble], weight: 6 },
      { id: "date", label: "日期/地点", values: [lead.recordingDate, lead.recordingPlace], weight: 5 },
      { id: "source", label: "来源/矩阵/馆藏号", values: [lead.sourceTitle, lead.sourceLocator, lead.sourceUrl, lead.matrix, lead.catalogueId, ...(lead.catalogueNumbers || [])], weight: 4 },
      { id: "rights", label: "权利/访问", values: [lead.rightsLabel, lead.territoryNote, lead.hostStatus, lead.digitalSourceStatus], weight: 3 }
    ])).filter(Boolean);
    const workMatches = workPaths.map((path) => {
      const person = workPathPerson(path);
      return buildMatch("work", path, q, [
        { id: "title", label: "作品/原题", values: [path.title, path.originalTitle], weight: 10 },
        { id: "number", label: "作品号/编号", values: path.workNumbers, weight: 8 },
        { id: "person", label: "关联人物", values: [person?.name, person?.latin], weight: 6 },
        { id: "genre", label: "体裁", values: path.genres, weight: 7 },
        { id: "instrumentation", label: "编制/乐器", values: path.instrumentation, weight: 7 },
        { id: "version", label: "年代/版本", values: [path.dateLabel, ...(path.keywords || [])], weight: 5 },
        { id: "source", label: "来源节点", values: (path.nodes || []).flatMap((node) => [node.label, node.kind]), weight: 4 },
        { id: "rights", label: "权利边界", values: [path.boundary], weight: 3 }
      ]);
    }).filter(Boolean);
    const performanceMatches = performanceEvents.map((event) => {
      const person = data.people.find((candidate) => candidate.id === event.personId);
      return buildMatch("performance", event, q, [
        { id: "title", label: "事件/作品名", values: [event.title, event.workTitle, event.eventLabel], weight: 10 },
        { id: "date", label: "日期", values: [event.date, event.dateLabel], weight: 8 },
        { id: "place", label: "地点/机构", values: [performanceEventLocation(event), event.institution], weight: 7 },
        { id: "participants", label: "参与者", values: (event.participants || []).flatMap((participant) => [participant.role, participant.name]), weight: 6 },
        { id: "person", label: "关联人物", values: [person?.name, person?.latin], weight: 6 },
        { id: "version", label: "版本关系", values: [event.versionLabel, ...(event.keywords || [])], weight: 5 },
        { id: "source", label: "来源/定位", values: [event.sourceTitle, event.sourceUrl, event.locator], weight: 4 },
        { id: "rights", label: "访问边界", values: [event.visibility, event.boundary], weight: 2 }
      ]);
    }).filter(Boolean);
    const evidenceMatches = Object.entries(agentEvidence).flatMap(([personId, record]) => {
      const person = data.people.find((candidate) => candidate.id === personId);
      return (record?.evidence || [])
        .filter((item) => item.visibility === "public-link" || item.visibility === "public-bibliography")
        .map((item) => buildMatch("evidence", { ...item, personId }, q, [
          { id: "claim", label: "证据论断/边界", values: [item.claim, item.boundary], weight: 8 },
          { id: "person", label: "关联人物", values: [person?.name, person?.latin], weight: 6 },
          { id: "source", label: "来源/定位", values: [item.sourceLabel, item.sourceRef, item.locator], weight: 5 },
          { id: "track", label: "研究轨道", values: [evidenceTrackLabels[item.track], item.track], weight: 3 },
          { id: "layer", label: "来源层级", values: [evidenceLayerLabels[classifyEvidenceLayer(item)], item.kind, item.claimOrigin], weight: 3 },
          { id: "rights", label: "访问边界", values: [item.visibility, item.boundary], weight: 2 }
        ])).filter(Boolean);
    });
    const filter = options.filter || state.searchFilter;
    const matches = [...people, ...resources, ...leads, ...recordingMatches, ...performanceMatches, ...workMatches, ...evidenceMatches].filter((match) => matchPassesFilter(match, filter));
    const sort = options.sort || state.searchSort;
    return matches.sort((a, b) => {
      if (sort === "name") return String(a.item.name || a.item.title || a.item.workTitle || a.item.originalTitle || "").localeCompare(String(b.item.name || b.item.title || b.item.workTitle || b.item.originalTitle || ""), "zh-CN");
      if (sort === "date") return String(b.item.date || b.item.dateLabel || b.item.recordingDate || b.item.years || "").localeCompare(String(a.item.date || a.item.dateLabel || a.item.recordingDate || a.item.years || ""), "zh-CN");
      return b.score - a.score;
    });
  }

  function searchEmptyState(query) {
    const prompts = data.quickPrompts.slice(0, 3).map((prompt) => `<button class="filter-chip" type="button" data-prompt="${escapeHtml(prompt)}">试试：${escapeHtml(prompt)}</button>`).join("");
    return `<div class="empty-state search-empty"><strong>没有直接匹配</strong><p>“${escapeHtml(query)}” 尚未命中当前目录。可以缩短关键词，补充作品号/年代，或把问题交给 AI 馆员。</p><div class="search-empty-actions">${prompts}</div></div>`;
  }

  function syncSearchControls(query, count) {
    $("#search-result-count").textContent = count;
    $("#search-query-label").textContent = `条记录 · “${query}”`;
    $$('[data-search-filter]').forEach((button) => button.classList.toggle("is-active", button.dataset.searchFilter === state.searchFilter));
    $("#search-sort").value = state.searchSort;
  }

  function globalSearch(query, options = {}) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) return;
    state.searchQuery = cleanQuery;
    const matches = rankMatches(cleanQuery);
    closeResourceDetail({ restoreView: false });
    closePersonDetail({ restoreView: false });
    $$('[data-view-panel]').forEach((panel) => { panel.hidden = true; panel.classList.remove("is-active"); });
    document.body.classList.remove("home-mode");
    const results = $("#search-results");
    results.hidden = false;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("is-active"));
    syncSearchControls(cleanQuery, matches.length);
    $("#search-summary").textContent = matches.length
      ? `按 ${state.searchFilter === "all" ? "全部类型" : searchTypeLabels[state.searchFilter]} 检索；结果卡会标出命中的字段。`
      : `当前筛选下没有匹配；可以换一个字段或交给 AI 馆员改写问题。`;
    $("#search-results-grid").innerHTML = matches.length
      ? matches.map((match) => match.kind === "person" ? personCard(match.item, { match }) : match.kind === "score-lead" ? scoreLeadCard(match.item, { match }) : match.kind === "recording-lead" ? recordingLeadCard(match.item, { match }) : match.kind === "performance" ? performanceEventCard(match.item, { match }) : match.kind === "work" ? workPathCard(match.item, { match }) : match.kind === "evidence" ? evidenceSearchCard(match.item, { match }) : catalogCard(match.item, { match })).join("")
      : searchEmptyState(cleanQuery);
    if (options.updateHash !== false) history.replaceState({ annalesSearch: cleanQuery }, "", `#search/${encodeURIComponent(cleanQuery)}`);
    if (options.focus !== false) $("#main-content").focus({ preventScroll: true });
    if (options.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function personMatchesQuery(person, normalizedQuery) {
    const chineseName = String(person.name || "");
    const latinName = String(person.latin || "");
    const chineseSurname = chineseName.split(/[·\s]/).filter(Boolean).pop() || chineseName;
    const latinSurname = latinName.split(/\s+/).filter(Boolean).pop() || latinName;
    return [chineseName, latinName, chineseSurname, latinSurname]
      .map((term) => normalize(term))
      .filter((term) => term && term.length >= 2)
      .some((term) => normalizedQuery.includes(term));
  }

  function peopleMatchingQuery(query) {
    const normalizedQuery = normalize(query);
    return data.people.filter((person) => personMatchesQuery(person, normalizedQuery));
  }

  function isComparisonQuery(query) {
    return agentRuntime?.comparisonRequested?.(query) || /比较|对照|差异|区别|异同|compare|comparison|contrast|difference/i.test(String(query || ""));
  }

  function classifyQuestion(query) {
    const q = normalize(query);
    if (/乐谱|总谱|声乐谱|钢琴谱|partitur|score/.test(q)) return "score";
    if (/录音|唱片|播放|phonograph|recording|1920/.test(q)) return "recording";
    if (/美学|思想|主义|观念|古典|理论|aesthetic/.test(q)) return "ideas";
    return "search";
  }

  function agentQuestionKind(query) {
    const q = normalize(query);
    if (/美学|思想|主义|观念|古典|理论|形式|和声|十二音|印象|民族/.test(q)) return "aesthetics";
    if (/书信|通信|自述|档案|来往/.test(q)) return "letters";
    if (/生平|经历|传记|出生|时期|性格|人物/.test(q)) return "biography";
    if (/权利|版权|许可|授权|公版|公共版权|开放|托管|再利用|下载条件|地域|法域|rights|copyright|licen[cs]e|publicdomain|openaccess/.test(q)) return "rights";
    if (/录音|唱片|播放|recording|phonograph/.test(q)) return "recording";
    if (/版本|修订|校样|作品|乐谱|总谱|谱本|声乐谱|钢琴谱|手稿|原稿|展映|首演|分谱|首版|出版|版本史|时间线|馆藏号|目录号|对象|比较|对照|差异|区别|异同|分别能证明|能证明|score|premiere|manuscript|firstedition|catalogue|[ed]\d{7}|#\d{4,6}|eb\d{3,}|partb\d+/.test(q)) return "works";
    return "overview";
  }

  function publicEvidenceOnly(items) {
    if (agentRuntime?.publicEvidenceOnly) return agentRuntime.publicEvidenceOnly(items);
    return (items || [])
      .filter((item) => item.visibility === "public-link" || item.visibility === "public-bibliography")
      .map((item) => ({
        id: item.id,
        track: item.track,
        kind: item.kind,
        claim: item.claim,
        boundary: item.boundary,
        sourceRef: item.sourceRef,
        sourceLabel: item.sourceLabel,
        locator: item.locator,
        visibility: item.visibility,
        sourceUrl: item.sourceUrl || null,
        verification: item.verification || null,
        claimOrigin: item.claimOrigin || null,
        evidenceLayer: classifyEvidenceLayer(item),
        humanReviewed: item.humanReviewed === true,
        aiGenerated: item.aiGenerated === true
      }));
  }

  function publicAgentContext(personId, query) {
    return agentRuntime?.buildContext(personId, query, { exposure: "public" }) || null;
  }

  function validateLocalAgentAnswer(evidence, context) {
    if (!context || !agentRuntime?.validateModelAnswer) return { valid: false, reason: "validator-unavailable", citedSourceRefs: [], citedLocators: [] };
    if (context.exposure !== "public") return { valid: false, reason: "non-public-context", citedSourceRefs: [], citedLocators: [] };
    const safeContextEvidence = publicEvidenceOnly(context.evidence || []);
    if (safeContextEvidence.length !== (context.evidence || []).length) return { valid: false, reason: "private-evidence-in-public-context", citedSourceRefs: [], citedLocators: [] };
    const safeEvidence = publicEvidenceOnly(evidence);
    if (safeEvidence.length !== (evidence || []).length) return { valid: false, reason: "private-evidence-in-local-answer", citedSourceRefs: [], citedLocators: [] };
    if (context.answerability?.status === "not_answerable") {
      const payload = JSON.stringify({ status: "not_answerable", answer: "本次不生成该主题的事实性结论。", claims: [] });
      return agentRuntime.validateModelAnswer(payload, context, { requireStructuredClaims: true });
    }
    if (!safeEvidence.length) return { valid: false, reason: "no-public-evidence", citedSourceRefs: [], citedLocators: [] };
    const payload = {
      answer: safeEvidence.map((item) => item.claim).join("；"),
      claims: safeEvidence.map((item) => ({
        text: item.claim,
        citations: [{ evidenceId: item.id, sourceRef: item.sourceRef, locator: item.locator }],
        supportingPhrases: [{ evidenceId: item.id, phrase: String(item.claim || "").slice(0, 80) }]
      }))
    };
    return agentRuntime.validateModelAnswer(JSON.stringify(payload), context, { requireStructuredClaims: true });
  }

  function comparisonAgentAnswer(people, query) {
    const runtimeContext = agentRuntime?.buildComparisonContext?.(people.map((person) => person.id), query, { exposure: "public" });
    const kind = runtimeContext?.questionKind || agentQuestionKind(query);
    const notAnswerable = runtimeContext?.answerability?.status === "not_answerable";
    const selected = runtimeContext?.evidence ? publicEvidenceOnly(runtimeContext.evidence) : [];
    const candidateEvidence = notAnswerable ? [] : selected.slice(0, 8);
    const localValidation = validateLocalAgentAnswer(candidateEvidence, runtimeContext);
    const evidence = localValidation.valid && !notAnswerable ? candidateEvidence : [];
    const names = people.map((person) => person.name).join(" 与 ");
    const groupLabels = new Map(people.map((person) => [person.id, person.name]));
    const comparisonText = runtimeContext?.comparison?.groups?.map((group) => `${groupLabels.get(group.id) || group.id}：${group.evidence.map((entry) => `${entry.sourceLabel} · ${entry.locator}`).join("；") || "暂无公开证据"}`).join("  VS  ") || "暂无可并列的公开证据组";
    const claimText = notAnswerable && localValidation.valid
      ? "本次不生成该主题的事实性结论。"
      : localValidation.valid
      ? localValidation.answerText
      : "跨人物本地回答未通过公开证据引用闸门，因此不展示无来源比较。";
    const locatorText = evidence.length ? evidence.map((item) => `${item.sourceLabel} · ${item.locator}`).join("；") : "暂无可回链定位";
    const sourceRefText = [...new Set(evidence.map((item) => item.sourceRef))].join("；") || "暂无 sourceRef";
    const boundaryText = [...new Set([
      ...(evidence.map((item) => item.boundary)),
      ...(runtimeContext?.notYetAnswerable || [])
    ])].slice(0, 5).join("；");
    const matchedWorkPaths = kind === "works"
      ? people.flatMap((person) => {
        const matched = workPathsForPerson(person, query);
        return (matched.length ? matched : workPathsForPerson(person)).slice(0, 3);
      })
      : [];
    const leadSources = kind === "works"
      ? scoreLeads.filter((lead) => matchedWorkPaths.some((path) => (path.scoreLeadIds || []).includes(lead.id))).slice(0, 5)
      : [];
    const recordingSources = kind === "recording"
      ? recordingLeads.filter((lead) => people.some((person) => person.id === lead.personId)).slice(0, 5)
      : kind === "works"
      ? recordingLeads.filter((lead) => matchedWorkPaths.some((path) => (path.recordingLeadIds || []).includes(lead.id))).slice(0, 5)
      : [];
    const followUpPrompts = [
      "继续分别核对两位人物的原始材料与学者解释。",
      "把这次比较拆成作品/版本、接受史和权利三层。",
      "哪些相似或差异仍需人工逐页、逐条来源核验？"
    ];
    const lead = notAnswerable && localValidation.valid
      ? `${names}的比较问题触发了当前证据边界；不把未回答主题包装成事实结论。`
      : runtimeContext?.comparison?.enabled
      ? `${names}的比较问题已形成跨人物证据框架；下方只并列公开来源，不把相似性或差异性写成未核验结论。`
      : `${names}暂时没有足够的同类公开证据形成跨人物比较。`;
    return {
      lead,
      sections: [
        ["问题类型", { aesthetics: "美学/思想", letters: "书信/自述", biography: "生平/人物", works: "作品/版本", recording: "历史录音", rights: "权利/访问", overview: "研究状态" }[kind]],
        ["比较框架", comparisonText],
        ["比较边界", runtimeContext?.comparison?.boundary || "暂无"],
        ...(notAnswerable ? [["回答状态", "not_answerable · 不生成事实性结论"], ["原因", runtimeContext.answerability.reason], ["下一步人工动作", runtimeContext.answerability.nextHumanAction]] : []),
        ...evidenceLayerSections(evidence, { notAnswerable }),
        ["当前证据", claimText],
        ["来源定位", locatorText],
        ["来源登记", sourceRefText],
        ["证据覆盖", runtimeContext?.coverage ? `总计 ${runtimeContext.coverage.totalEvidence} 张；当前问题匹配 ${runtimeContext.coverage.selectedEvidence} 张；公开 ${runtimeContext.coverage.publicEvidence} 张 / 私研 ${runtimeContext.coverage.privateEvidence} 张` : "暂无覆盖统计"],
        ["不能越界", boundaryText || "不得把跨人物并列框架写成未经来源支撑的共同结论"],
        ["下一步核验", runtimeContext?.comparison?.nextHumanAction || "先补同类公开证据"]
      ],
      sources: data.resources.filter((resource) => people.some((person) => person.id === resource.personId) && resourceKinds.has(resource.type) && (kind === "recording" ? resource.type === "recording" : kind === "works" ? matchedWorkPaths.some((path) => (path.resourceIds || []).includes(resource.id)) : false)).slice(0, 5),
      leadSources,
      recordingSources,
      workPaths: matchedWorkPaths,
      evidence,
      localValidation,
      prompts: followUpPrompts
    };
  }

  function agentAnswer(person, query) {
    const agent = agentFor(person);
    const dossier = evidenceFor(person);
    const runtimeContext = publicAgentContext(person.id, query);
    const kind = runtimeContext?.questionKind || agentQuestionKind(query);
    const comparison = runtimeContext?.comparison?.enabled ? runtimeContext.comparison : null;
    const trackMap = {
      aesthetics: new Set(["aesthetics-and-poetics", "reception-and-scholarship"]),
      letters: new Set(["letters-and-self-presentation"]),
      biography: new Set(["biography", "letters-and-self-presentation"]),
      works: new Set(["works-and-versions", "letters-and-self-presentation", "performance-and-recordings"]),
      recording: new Set(["performance-and-recordings"]),
      rights: new Set(["rights-and-access"]),
      overview: null
    };
    const selected = runtimeContext?.evidence
      ? publicEvidenceOnly(runtimeContext.evidence)
      : publicEvidenceOnly(dossier.evidence).filter((item) => !trackMap[kind] || trackMap[kind].has(item.track));
    const notAnswerable = runtimeContext?.answerability?.status === "not_answerable";
    const maxEvidence = kind === "works" ? 6 : 5;
    const candidateEvidence = notAnswerable ? [] : selected.length
      ? selected.slice(0, maxEvidence)
      : kind === "overview" ? publicEvidenceOnly(dossier.evidence).slice(0, 4) : [];
    const localValidation = validateLocalAgentAnswer(candidateEvidence, runtimeContext);
    const evidence = localValidation.valid && !notAnswerable ? candidateEvidence : [];
    const isPersonalityQuestion = /性格|人格|心理|气质|为人|个性/.test(normalize(query));
    const claimText = notAnswerable && localValidation.valid
      ? "本次不生成该主题的事实性结论。"
      : localValidation.valid
      ? localValidation.answerText
      : "本地回答未通过引用、定位或公开可见性校验，因此不展示无来源结论。";
    const locatorText = evidence.length
      ? evidence.map((item) => `${item.sourceLabel} · ${item.locator}`).join("；")
      : "暂无可回链定位";
    const boundaryText = [...new Set([
      ...(evidence.map((item) => item.boundary)),
      ...(dossier.notYetAnswerable || [])
    ])].slice(0, 4).join("；");
    const visibilityText = [...new Set(evidence.map((item) => visibilityLabels[item.visibility] || item.visibility))].join("、") || "暂无来源可见性记录";
    const sourceRefText = [...new Set(evidence.map((item) => item.sourceRef))].join("；") || "暂无 sourceRef";
    const comparisonText = comparison
      ? comparison.groups.map((group) => `${group.label}：${group.evidence.map((entry) => `${entry.sourceLabel} · ${entry.locator}`).join("；")}`).join("  VS  ")
      : "暂无两个可区分的证据层；不生成确定性差异结论";
    const followUpPrompts = [...new Set([
      ...(comparison ? ["继续核对这两个版本分别有哪些页码或对象定位？", "哪些差异仍需人工逐页比对，不能由目录摘要推出？"] : kind === "works" ? ["把这条作品路径中的版本、谱本和边界逐项展开。"] : []),
      ...(agent.starterQuestions || [])
    ])].slice(0, 4);
    const evidenceIds = new Set(evidence.map((item) => item.id));
    const evidenceBoundWorkPaths = kind === "works" && evidenceIds.size
      ? workPathsForPerson(person).filter((path) => (path.evidenceRefs || []).some((id) => evidenceIds.has(id)))
      : [];
    const queryMatchedWorkPaths = kind === "works" ? workPathsForPerson(person, query) : [];
    const matchedWorkPaths = kind === "works"
      ? (evidenceBoundWorkPaths.length ? evidenceBoundWorkPaths : queryMatchedWorkPaths).slice(0, 4)
      : [];
    const matchedPerformanceEvents = kind === "works"
      ? matchedWorkPaths.flatMap((path) => performanceEventsForPath(path)).slice(0, 4)
      : [];
    const leadSources = kind === "works"
      ? scoreLeads.filter((lead) => matchedWorkPaths.some((path) => (path.scoreLeadIds || []).includes(lead.id))).slice(0, 3)
      : [];
    const recordingSources = kind === "works"
      ? recordingLeads.filter((lead) =>
          matchedWorkPaths.some((path) => (path.recordingLeadIds || []).includes(lead.id)) ||
          evidence.some((item) => item.sourceRef === lead.id)
        ).slice(0, 3)
      : kind === "recording"
      ? recordingLeads.filter((lead) => lead.personId === person.id).slice(0, 3)
      : [];
    const recordingLeadText = recordingSources.map((lead) => lead.workTitle + " · " + (lead.matrix ? "matrix " + lead.matrix : "馆藏 " + (lead.catalogueId || "待登记")) + " · " + lead.sourceTitle).join("；");
    const lead = notAnswerable && localValidation.valid
      ? `${person.name}智能体暂不把这个问题回答成性格或心理结论；先保留证据缺口和人工动作。`
      : comparison
      ? `${person.name}的比较问题已形成证据约束框架；下方并列作品/版本记录与谱本/扫描候选，但不把层级差异写成未经逐页核验的谱面结论。`
      : kind === "recording" && recordingSources.length
      ? person.name + "的历史录音候选已找到 " + recordingSources.length + " 条；下方只展示目录元数据和权威来源，不把候选当作可播放音频。"
      : kind === "works" && matchedWorkPaths.length
      ? person.name + "的作品—版本路径已匹配 " + matchedWorkPaths.length + " 条，其中登记了 " + matchedPerformanceEvents.length + " 条演出事件；下方按节点连接事件、谱本候选和生产资源卷宗，候选仍不等于可托管文件。"
      : kind === "works"
      ? person.name + "的作品问题没有命中已登记的具体版本路径；不以相邻作品或模型记忆补齐。"
      : !localValidation.valid
      ? `${person.name}智能体没有展示未通过公开证据引用闸门的本地回答。`
      : isPersonalityQuestion
      ? `${person.name}智能体目前只报告有来源的自我呈现或学者描述，不把性格写成心理诊断。`
      : `${person.name}智能体已用 ${evidence.length} 条证据卡回应这一问题；每条都保留来源定位和访问边界。`;
    return {
      lead,
      sections: [
        ["问题类型", { aesthetics: "美学/思想", letters: "书信/自述", biography: "生平/人物", works: "作品/版本", recording: "历史录音", rights: "权利/访问", overview: "研究状态" }[kind]],
        ...(comparison ? [["比较框架", comparisonText], ["比较边界", comparison.boundary], ["下一步核验", comparison.nextHumanAction]] : []),
        ...(kind === "works" ? [["作品路径", matchedWorkPaths.length ? matchedWorkPaths.map((path) => path.title + " · " + path.dateLabel).join("；") : "暂无命中的作品—版本路径"], ["演出事件", matchedPerformanceEvents.length ? matchedPerformanceEvents.map((event) => `${event.title} · ${event.dateLabel} · ${performanceEventLocation(event)}`).join("；") : "当前路径暂无独立演出事件记录"]] : []),
         ...(kind === "recording" ? [["候选录音", recordingLeadText || "暂无可回链的矩阵/馆藏候选"]] : []),
         ...(notAnswerable ? [["回答状态", "not_answerable · 不生成事实性结论"], ["原因", runtimeContext.answerability.reason], ["下一步人工动作", runtimeContext.answerability.nextHumanAction]] : []),
         ...evidenceLayerSections(evidence, { notAnswerable }),
         ["智能体状态", `${agent.label} · ${agent.seedCount} 条种子来源`],
        ["当前证据", claimText],
        ["来源定位", locatorText],
        ["来源登记", sourceRefText],
        ["可见性", visibilityText],
        ["证据覆盖", runtimeContext?.coverage ? `总计 ${runtimeContext.coverage.totalEvidence} 张；当前问题匹配 ${runtimeContext.coverage.selectedEvidence} 张；公开 ${runtimeContext.coverage.publicEvidence} 张 / 私研 ${runtimeContext.coverage.privateEvidence} 张` : "旧版上下文未提供覆盖统计"],
        ["不能越界", boundaryText],
        ["尚未回答", (dossier.notYetAnswerable || []).join("；") || "暂无单独登记"],
        ["下一步阅读", agent.nextReading]
      ],
      sources: notAnswerable || !["works", "recording", "rights"].includes(kind)
        ? []
        : data.resources.filter((resource) => {
          if (resource.personId !== person.id || !resourceKinds.has(resource.type)) return false;
          if (kind === "rights") return true;
          if (kind === "recording") return resource.type === "recording";
          return matchedWorkPaths.some((path) => (path.resourceIds || []).includes(resource.id));
        }).slice(0, 3),
      leadSources,
      recordingSources,
      workPaths: matchedWorkPaths,
      performanceEvents: matchedPerformanceEvents,
      evidence,
      localValidation,
      prompts: followUpPrompts
    };
  }

  function librarianAnswer(query) {
    const normalizedQuery = normalize(query);
    const matchedPeople = peopleMatchingQuery(query);
    const agentPerson = matchedPeople[0];
    if (matchedPeople.length >= 2 && isComparisonQuery(query) && agentRuntime?.buildComparisonContext) {
      return comparisonAgentAnswer(matchedPeople.slice(0, 3), query);
    }
    if (agentPerson && /智能体|agent|研究|research|生平|性格|personality|美学|aesthetic|思想|idea|理论|theory|书信|letter|自述|版本|version|修订|revision|手稿|原稿|展映|首演|分谱|首版|出版|版本史|时间线|馆藏号|目录号|对象|分别能证明|能证明|比较|对照|差异|区别|异同|作品|乐谱|总谱|谱本|声乐谱|钢琴谱|score|premiere|manuscript|firstedition|catalogue|演奏|录音|著作|作曲|交响|时期|period|人物|biograph|权利|版权|许可|授权|公版|开放|托管|rights|copyright|licen[cs]e|hcb[a-z0-9]+|frbnf\d+|[ed]\d{7}|ppn\d+|partb\d+|\d{5,6}/.test(normalizedQuery)) {
      return agentAnswer(agentPerson, query);
    }
    const kind = classifyQuestion(query);
    const ranked = rankMatches(query);
    const sourceKind = { score: "score", recording: "recording", ideas: "writing" }[kind] || null;
    const resources = ranked
      .filter((match) => resourceKinds.has(match.kind) && (!sourceKind || match.kind === sourceKind))
      .map((match) => match.item)
      .slice(0, 3);
    const people = ranked.filter((match) => match.kind === "person").map((match) => match.item);
    const sources = resources;
    const leadSources = kind === "score"
      ? ranked.filter((match) => match.kind === "score-lead").map((match) => match.item).slice(0, 3)
      : [];
    const recordingSources = kind === "recording"
      ? ranked.filter((match) => match.kind === "recording-lead").map((match) => match.item).slice(0, 3)
      : [];
    const workPathMatches = ranked
      .filter((match) => match.kind === "work")
      .map((match) => match.item)
      .slice(0, 4);
    let lead;
    let sections;

    if (kind === "score") {
      lead = sources.length || leadSources.length
        ? `目录中找到 ${sources.length} 条生产记录和 ${leadSources.length} 条外部谱本线索。候选仍未完成版本、文件和地域核验，因此站内不提供下载按钮。`
        : "当前目录没有匹配乐谱；需要先补作品号、编制或版本线索。";
      sections = [
        ["检索事实", sources.map((item) => item.title).join("；") || "暂无已入目录的生产资源"],
        ["作品路径", workPathMatches.map((path) => path.title + " · " + path.dateLabel).join("；") || "暂无命中的作品—版本路径"],
        ["候选谱本", leadSources.map((item) => `${item.workTitle} · file #${item.fileId}`).join("；") || "暂无可回链的 IMSLP 候选"],
        ["版本判断", "必须核对校订、编曲、版式与数字化来源，不能只看作曲家卒年。"],
        ["下一步", "先打开候选的作品页和文件页；完成同源文件签名、SHA-256、地域及人工复核后，才可能进入生产资源。"]
      ];
    } else if (kind === "recording") {
      lead = sources.length || recordingSources.length
        ? `目录中找到 ${sources.length} 条生产录音记录和 ${recordingSources.length} 条具体录音候选。候选只回链到矩阵/馆藏来源，当前不提供播放或下载。`
        : "当前目录没有匹配的具体录音；需要先补演奏者、指挥、矩阵号、唱片号或馆藏号。";
      sections = [
        ["原始记录", sources.map((item) => item.title).join("；") || "暂无已入目录的生产录音资源"],
        ["作品路径", workPathMatches.map((path) => path.title + " · " + path.dateLabel).join("；") || "暂无命中的作品—版本路径"],
        ["具体录音候选", recordingSources.map((item) => `${item.workTitle} · ${item.matrix ? `matrix ${item.matrix}` : `馆藏 ${item.catalogueId || "待登记"}`}`).join("；") || "暂无可回链的 DAHR / 博物馆馆藏候选"],
        ["权利层", "底层作品、表演、录音制作者、母带/数字修复和目标地域需分别确认。"],
        ["下一步", "打开候选的权威目录来源，核对 item-level 记录；只有取得同源音频、真实签名、SHA-256、地域证据和真人签字后，才可能进入生产资源。"]
      ];
    } else if (kind === "ideas") {
      const who = people[0]?.name || "相关人物";
      lead = `已把问题关联到${who}及 ${sources.length} 条书目候选。当前语料只有书目级信息，尚无稳定页码锚点。`;
      sections = [
        ["原文观点", "待接入可核查原文后生成；不以模型记忆替代引文。"],
        ["学者解释", "待接入明确的二手文献、版本和页码后分列。"],
        ["AI 推断", "暂不输出确定性结论；允许显示带标签的研究假设。"]
      ];
    } else {
      lead = ranked.length ? `找到 ${ranked.length} 条相关记录。我先给出最接近的目录线索。` : "当前示范目录没有直接匹配。可以补充人物、作品号、年代或资源类型。";
      sections = [["目录线索", ranked.slice(0, 3).map((match) => match.item.title || match.item.name || match.item.workTitle || "候选记录").join("；") || "暂无"], ["证据状态", "未接入的资料不会被包装成确定答案。"]];
    }

    return { lead, sections, sources, leadSources, recordingSources, workPaths: workPathMatches };
  }

  function appendMessage(role, content) {
    const article = document.createElement("article");
    article.className = `message message-${role}`;
    article.innerHTML = role === "assistant"
      ? `<span class="message-avatar" aria-hidden="true">Æ</span><div>${content}</div>`
      : `<div><p>${escapeHtml(content)}</p></div>`;
    $("#conversation").appendChild(article);
    $("#conversation").scrollTop = $("#conversation").scrollHeight;
  }

  async function askLibrarian(query) {
    const clean = query.trim();
    if (!clean) return;
    openLibrarian();
    appendMessage("user", clean);
    const answer = librarianAnswer(clean);
    const sectionHtml = answer.sections.map(([label, text]) => `<div class="answer-section"><b>${escapeHtml(label)}</b><span>${escapeHtml(text)}</span></div>`).join("");
    const promptHtml = (answer.prompts || []).length
      ? `<div class="answer-prompts"><small>继续追问这个智能体</small>${answer.prompts.map((prompt) => `<button type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("")}</div>`
      : "";
    window.setTimeout(() => appendMessage("assistant", `<p><strong>${escapeHtml(answer.lead)}</strong></p><div class="answer-sections">${sectionHtml}</div>${promptHtml}`), 180);
    renderSources(answer.sources);
    renderLeadSources(answer.leadSources || []);
    renderRecordingLeadSources(answer.recordingSources || []);
    renderWorkPathSources(answer.workPaths || []);
    renderResearchEvidence(answer.evidence || []);

    const matchedPeople = peopleMatchingQuery(clean);
    const matchedPerson = matchedPeople.length === 1 ? matchedPeople[0] : null;
    if (!agentGateway?.enabled || !matchedPerson) return;
    const remote = await agentGateway.answer(matchedPerson.id, clean);
    const remoteContext = publicAgentContext(matchedPerson.id, clean);
    const remoteValidation = remote?.status === "ok" && remote.answer && remoteContext && agentRuntime?.validateModelAnswer
      ? agentRuntime.validateModelAnswer(remote.answer, remoteContext, { requireStructuredClaims: true })
      : null;
    if (remote?.status === "ok" && remoteValidation?.valid) {
      const remoteCitations = [...new Map((remoteValidation.claims || []).flatMap((claim) => claim.citations || []).map((citation) => [`${citation.evidenceId}|${citation.sourceRef}|${citation.locator}`, citation])).values()]
        .map((citation) => `${citation.sourceRef} · ${citation.locator}`).join("；") || "已通过证据卡反查，但没有可显示的 citation";
      appendMessage("assistant", `<p><strong>来源约束模型回答</strong></p><p>${escapeHtml(remoteValidation.answerText)}</p><small>模型仅收到已筛选的公开证据 context；绑定来源：${escapeHtml(remoteCitations)}</small>`);
    } else if (remote?.status === "ok") {
      appendMessage("assistant", `<p><strong>模型回答未通过引用校验</strong></p><p>本次不展示没有同时绑定公开证据、sourceRef 和页码/网页定位的模型答案；先使用上方本地证据回答，并把该问题加入人工抽查队列。</p>`);
    } else if (remote?.status === "citation_required") {
      appendMessage("assistant", `<p><strong>模型回答未通过引用校验</strong></p><p>本次不展示没有同时绑定 sourceRef 和页码/网页定位的模型答案；先使用上方本地证据回答，并把该问题加入人工抽查队列。</p>`);
    } else if (remote?.status === "not_answerable") {
      appendMessage("assistant", `<p><strong>模型也遵守未回答边界</strong></p><p>当前主题没有被包装成事实性结论；请按上方列出的人工动作补齐材料后再问。</p>`);
    } else if (remote?.status === "unconfigured") {
      toast("在线模型尚未配置，已使用本地证据回答");
    }
  }

  function renderSources(sources) {
    const tray = $("#source-tray");
    tray.hidden = sources.length === 0;
    $("#source-count").textContent = `${sources.length} 条`;
    $("#source-items").innerHTML = sources.map((source) => `<button class="source-item" type="button" data-resource-id="${source.id}"><strong>${escapeHtml(source.title)}</strong><small>${escapeHtml(source.statusLabel)} · ${escapeHtml(source.evidenceGap)}</small></button>`).join("");
  }

  function renderLeadSources(leads = []) {
    const tray = $("#lead-source-tray");
    if (!tray) return;
    const safeLeads = leads
      .map((lead) => scoreLeads.find((candidate) => candidate.id === lead?.id))
      .filter((lead) => lead && lead.hostStatus === "candidate-do-not-host" && lead.pageUrl && lead.filePageUrl);
    tray.hidden = safeLeads.length === 0;
    $("#lead-source-count").textContent = `${safeLeads.length} 条`;
    $("#lead-source-items").innerHTML = safeLeads.map((lead) => `
      <article class="lead-source-item">
        <div class="lead-source-item-top"><strong>${escapeHtml(lead.workTitle)}</strong><span>CANDIDATE · DO NOT HOST</span></div>
        <small>${escapeHtml(lead.part || "部位待登记")} · FILE #${escapeHtml(lead.fileId)} · ${escapeHtml(lead.edition)}</small>
        <div class="lead-source-links">
          <a href="${escapeHtml(lead.pageUrl)}" target="_blank" rel="noopener noreferrer">作品页 ↗</a>
          <a href="${escapeHtml(lead.filePageUrl)}" target="_blank" rel="noopener noreferrer">文件页 ↗</a>
        </div>
      </article>`).join("");
  }

  function renderRecordingLeadSources(leads = []) {
    const tray = $("#recording-source-tray");
    if (!tray) return;
    const safeLeads = leads
      .map((lead) => recordingLeads.find((candidate) => candidate.id === lead?.id))
      .filter((lead) => lead && lead.hostStatus === "candidate-do-not-host" && lead.sourceUrl);
    tray.hidden = safeLeads.length === 0;
    $("#recording-source-count").textContent = String(safeLeads.length) + " 条";
    $("#recording-source-items").innerHTML = safeLeads.map((lead) => {
      const catalogueNumbers = Array.isArray(lead.catalogueNumbers) ? lead.catalogueNumbers.filter(Boolean).join(" / ") : "";
      const identifier = (lead.matrix ? "MATRIX " + lead.matrix : "馆藏 " + (lead.catalogueId || "待登记")) + (catalogueNumbers ? " · " + catalogueNumbers : "");
      return [
        '<article class="lead-source-item recording-source-item">',
        '<div class="lead-source-item-top"><strong>', escapeHtml(lead.workTitle), '</strong><span>CANDIDATE · DO NOT HOST</span></div>',
        '<small>', escapeHtml(identifier), ' · ', escapeHtml(lead.recordingDate), ' · ', escapeHtml(lead.sourceTitle), '</small>',
        '<div class="lead-source-links"><a href="', escapeHtml(lead.sourceUrl), '" target="_blank" rel="noopener noreferrer">打开目录来源 ↗</a></div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderWorkPathSources(paths = []) {
    const tray = $("#work-path-source-tray");
    if (!tray) return;
    const safePaths = paths
      .map((path) => workPaths.find((candidate) => candidate.id === path?.id))
      .filter((path) => path && path.personId && path.nodes?.length);
    tray.hidden = safePaths.length === 0;
    $("#work-path-source-count").textContent = safePaths.length + " 条";
    $("#work-path-source-items").innerHTML = safePaths.map((path) => workPathCard(path)).join("");
  }

  function renderResearchEvidence(evidence = []) {
    const tray = $("#research-tray");
    if (!tray) return;
    const safeEvidence = publicEvidenceOnly(evidence);
    tray.hidden = safeEvidence.length === 0;
    $("#research-count").textContent = `${safeEvidence.length} 条`;
    $("#research-items").innerHTML = safeEvidence.map((item) => {
      const sourceAction = item.sourceUrl
        ? `<a class="research-source-link" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a>`
        : `<span class="research-source-private">仅本地研究材料</span>`;
      const trackLabel = evidenceTrackLabels[item.track] || item.track;
      const kindLabel = evidenceKindLabels[item.kind] || item.kind;
      const visibilityLabel = visibilityLabels[item.visibility] || item.visibility || "未登记可见性";
      return `<article class="research-evidence-item" data-evidence-id="${escapeHtml(item.id)}">
        <div class="research-evidence-meta"><b>${escapeHtml(trackLabel)}</b><span>${escapeHtml(kindLabel)} · ${escapeHtml(visibilityLabel)}</span></div>
        <p>${escapeHtml(item.claim)}</p>
        <small><strong>边界：</strong>${escapeHtml(item.boundary)}</small>
        <div class="research-evidence-foot"><span>${escapeHtml(item.sourceLabel)} · ${escapeHtml(item.locator)} · ${escapeHtml(item.verification)}</span>${sourceAction}</div>
        <small class="research-evidence-ref"><strong>sourceRef：</strong>${escapeHtml(item.sourceRef)}</small>
      </article>`;
    }).join("");
  }

  function openLibrarian() {
    document.body.classList.add("librarian-open");
    syncLibrarianAccessibility();
    if (mobileQuery.matches) window.setTimeout(() => $("#librarian-input").focus(), 220);
  }

  function closeLibrarian() {
    document.body.classList.remove("librarian-open");
    syncLibrarianAccessibility();
  }

  function syncLibrarianAccessibility() {
    const mobile = mobileQuery.matches;
    const navHidden = mobile && !document.body.classList.contains("nav-open");
    const searchHidden = mobile && !document.body.classList.contains("search-open");
    const librarianHidden = mobile && !document.body.classList.contains("librarian-open");
    const states = [
      [$("#side-nav"), navHidden, $("#nav-toggle")],
      [$("#global-search"), searchHidden, $("#search-toggle")],
      [$("#librarian"), librarianHidden, $("#open-librarian")]
    ];
    for (const [panel, hidden, fallback] of states) {
      panel.inert = hidden;
      panel.setAttribute("aria-hidden", String(hidden));
      if (hidden && panel.contains(document.activeElement)) fallback.focus();
    }
    $("#nav-toggle").setAttribute("aria-expanded", String(!navHidden && mobile));
    $("#search-toggle").setAttribute("aria-expanded", String(!searchHidden && mobile));
    $("#open-librarian").setAttribute("aria-expanded", String(!librarianHidden));
  }

  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("is-visible");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => node.classList.remove("is-visible"), 2200);
  }

  function viewForResource(resource) {
    return { score: "scores", recording: "recordings", writing: "writings" }[resource.type] || "home";
  }

  function routeFromHash() {
    const raw = location.hash.slice(1);
    if (raw === "atlas" || raw.startsWith("atlas/")) {
      const segments = raw.split("/");
      const requestedView = segments[1] || "alm";
      state.atlasView = atlasViewIds.has(requestedView) ? requestedView : "alm";
      state.atlasPersonId = null;
      if (segments[2] === "person" && segments[3]) {
        try {
          const personId = decodeURIComponent(segments.slice(3).join("/"));
          if (atlasPersonRecord(personId) && atlasPersonIds[personId]) state.atlasPersonId = personId;
        } catch {
          state.atlasPersonId = null;
        }
      }
      const restorePerson = state.personRestoreAfterRoute || $("#person-detail").open;
      showView("atlas", { updateHash: false, focus: !restorePerson, scroll: !restorePerson });
      syncAtlasShell();
      const canonicalHash = atlasRouteHash();
      if (location.hash !== canonicalHash) history.replaceState({ annalesAtlas: state.atlasView, annalesAtlasPerson: state.atlasPersonId }, "", canonicalHash);
      if (restorePerson) {
        state.personRestoreAfterRoute = false;
        restorePersonContext();
      }
      return;
    }
    if (raw.startsWith("search/")) {
      let query;
      try {
        query = decodeURIComponent(raw.slice("search/".length));
      } catch {
        showView("home");
        toast("检索链接编码无效，已返回首页");
        return;
      }
      if (!query.trim()) {
        showView("home");
        return;
      }
      $("#global-search-input").value = query;
      globalSearch(query, { updateHash: false, focus: false, scroll: false });
      if (state.restoreAfterRoute || state.personRestoreAfterRoute) {
        const restorePerson = state.personRestoreAfterRoute;
        state.restoreAfterRoute = false;
        state.personRestoreAfterRoute = false;
        restorePerson ? restorePersonContext() : restoreDetailContext();
      }
      return;
    }
    if (raw.startsWith("person/")) {
      let personId;
      try {
        personId = decodeURIComponent(raw.slice("person/".length));
      } catch {
        showView("home");
        toast("人物链接编码无效，已返回首页");
        return;
      }
      const person = data.people.find((item) => item.id === personId);
      if (!person) {
        showView("home");
        toast("人物链接无效，档案可能尚未入库");
        return;
      }
      const returnView = state.personDetailReturnView || "home";
      state.personDetailReturnView = returnView;
      showView(returnView, { updateHash: false, focus: false, scroll: false });
      openPersonDetail(personId, { updateHash: false, preserveReturnView: true });
      return;
    }
    if (raw.startsWith("resource/")) {
      let resourceId;
      try {
        resourceId = decodeURIComponent(raw.slice("resource/".length));
      } catch {
        showView("rights");
        toast("详情链接编码无效，已返回权利台账");
        return;
      }
      const resource = data.resources.find((item) => item.id === resourceId);
      if (!resource) {
        showView("rights");
        toast("详情链接无效，记录可能已被入库闸门拒绝");
        return;
      }
      const returnView = viewForResource(resource);
      state.detailReturnView = returnView;
      showView(returnView, { updateHash: false, focus: false, scroll: false });
      openResourceDetail(resourceId, { updateHash: false, preserveReturnView: true });
      return;
    }
    const nextView = validViews.has(raw) ? raw : "home";
    const restorePerson = state.personRestoreAfterRoute || $("#person-detail").open;
    const restoreContext = state.restoreAfterRoute || restorePerson || $("#resource-detail").open;
    showView(nextView, { updateHash: raw !== nextView, focus: !restoreContext, scroll: !restoreContext });
    if (restoreContext) {
      state.restoreAfterRoute = false;
      state.personRestoreAfterRoute = false;
      restorePerson ? restorePersonContext() : restoreDetailContext();
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (state.carouselSuppressClickUntil > Date.now()) {
        state.carouselSuppressClickUntil = 0;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const viewTrigger = event.target.closest("[data-view]");
      const linkTrigger = event.target.closest("[data-view-link]");
      if (viewTrigger) {
        if (event.target.closest("#person-detail")) closePersonDetail({ restoreView: false });
        if (viewTrigger.dataset.view === "atlas") {
          state.atlasView = "alm";
          state.atlasPersonId = null;
        }
        showView(viewTrigger.dataset.view);
      }
      if (linkTrigger) { event.preventDefault(); showView(linkTrigger.dataset.viewLink); }

      const atlasViewTrigger = event.target.closest("[data-atlas-view]");
      if (atlasViewTrigger) setAtlasView(atlasViewTrigger.dataset.atlasView);

      const atlasPersonTrigger = event.target.closest("[data-atlas-person]");
      if (atlasPersonTrigger) openAtlasForPerson(atlasPersonTrigger.dataset.atlasPerson);

      const atlasReturnPerson = event.target.closest("#atlas-return-person");
      if (atlasReturnPerson?.dataset.atlasReturnPersonId) openPersonDetail(atlasReturnPerson.dataset.atlasReturnPersonId);

      const prompt = event.target.closest("[data-prompt]");
      if (prompt) askLibrarian(prompt.dataset.prompt);

      const resource = event.target.closest("[data-resource-id]");
      if (resource) openResourceDetail(resource.dataset.resourceId);

      const personAgent = event.target.closest("[data-person-agent]");
      if (personAgent) {
        const record = data.people.find((item) => item.id === personAgent.dataset.personAgent);
        if (record) {
          if (event.target.closest("#person-detail")) closePersonDetail({ restoreView: false });
          askLibrarian(`${record.name}，请回答我关于${record.name}的研究问题，并只使用已通过公开引用闸门的证据。`);
        }
      }

      const searchQuery = event.target.closest("[data-search-query]");
      if (searchQuery) {
        closePersonDetail({ restoreView: false });
        globalSearch(searchQuery.dataset.searchQuery, { focus: false, scroll: false });
      }

      const person = event.target.closest("[data-person-id]");
      if (person) {
        const carouselCard = person.closest("#people-grid");
        if (carouselCard) {
          state.personDetailReturnView = state.view;
          state.personDetailTrigger = person;
          state.personDetailScrollY = window.scrollY;
          state.personDetailCarouselPosition = state.carouselPosition;
          state.personDetailCarouselScrollLeft = state.carouselPosition;
        } else {
          event.preventDefault();
          const record = data.people.find((item) => item.id === person.dataset.personId);
          if (record) openPersonDetail(record.id);
        }
      }

      const portfolio = event.target.closest("[data-person-portfolio]");
      if (portfolio) {
        closePersonDetail({ restoreView: false });
        showView(portfolio.dataset.personPortfolio);
      }

      const filter = event.target.closest("[data-filter-type]");
      if (filter) {
        const type = filter.dataset.filterType;
        state.activeFilters[type] = filter.dataset.filter;
        $$(`[data-filter-type="${type}"]`).forEach((chip) => chip.classList.toggle("is-active", chip === filter));
        renderFilteredCatalog(type);
      }

      const searchFilter = event.target.closest("[data-search-filter]");
      if (searchFilter && state.searchQuery) {
        state.searchFilter = searchFilter.dataset.searchFilter;
        globalSearch(state.searchQuery, { updateHash: false, focus: false, scroll: false });
      }
    });

    document.addEventListener("keydown", (event) => {
      const atlasTab = event.target.closest?.("[data-atlas-view]");
      if (atlasTab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const tabs = $$('[data-atlas-view]');
        const currentIndex = tabs.indexOf(atlasTab);
        const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
        return;
      }
      const person = event.target.closest?.("[data-person-id]");
      if (person && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); person.click(); }
      const resource = event.target.closest?.("[data-resource-id]");
      if (resource && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); resource.click(); }
      if (event.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { event.preventDefault(); document.body.classList.remove("nav-open"); document.body.classList.add("search-open"); syncLibrarianAccessibility(); $("#global-search-input").focus(); }
      if (event.key === "Escape") {
        if ($("#person-detail").open) {
          event.preventDefault();
          closePersonDetail();
          return;
        }
        if ($("#resource-detail").open) {
          event.preventDefault();
          closeResourceDetail();
          return;
        }
        closeLibrarian();
        document.body.classList.remove("nav-open", "search-open");
        $("#nav-toggle").setAttribute("aria-expanded", "false");
        $("#search-toggle").setAttribute("aria-expanded", "false");
        syncLibrarianAccessibility();
      }
    });

    $("#librarian-form").addEventListener("submit", (event) => { event.preventDefault(); const input = $("#librarian-input"); askLibrarian(input.value); input.value = ""; });
    $("#global-search-input").addEventListener("input", (event) => {
      const query = event.target.value.trim();
      if (query.length > 1) globalSearch(query, { focus: false, scroll: false });
      else if (!query) showView(state.view, { focus: false, scroll: false });
    });
    $("#search-sort").addEventListener("change", (event) => {
      state.searchSort = event.target.value;
      if (state.searchQuery) globalSearch(state.searchQuery, { updateHash: false, focus: false, scroll: false });
    });
    $("#open-librarian").addEventListener("click", openLibrarian);
    $("#home-ai-entry")?.addEventListener("click", openLibrarian);
    $("#close-librarian").addEventListener("click", closeLibrarian);
    $("#close-resource-detail").addEventListener("click", () => closeResourceDetail());
    $("#resource-detail").addEventListener("cancel", (event) => { event.preventDefault(); closeResourceDetail(); });
    $("#resource-detail").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeResourceDetail(); });
    $("#close-person-detail").addEventListener("click", () => closePersonDetail());
    $("#person-detail").addEventListener("cancel", (event) => { event.preventDefault(); closePersonDetail(); });
    $("#person-detail").addEventListener("click", (event) => { if (event.target === event.currentTarget) closePersonDetail(); });
    $("#search-toggle").addEventListener("click", () => {
      const open = document.body.classList.toggle("search-open");
      $("#search-toggle").setAttribute("aria-expanded", String(open));
      if (open) {
        document.body.classList.remove("nav-open");
        $("#nav-toggle").setAttribute("aria-expanded", "false");
      }
      syncLibrarianAccessibility();
      if (open) $("#global-search-input").focus();
    });
    $("#nav-toggle").addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      $("#nav-toggle").setAttribute("aria-expanded", String(open));
      if (open) {
        document.body.classList.remove("search-open");
        $("#search-toggle").setAttribute("aria-expanded", "false");
      }
      syncLibrarianAccessibility();
    });
    $("#copy-atlas-link").addEventListener("click", copyAtlasLink);
    $("#reload-atlas").addEventListener("click", () => { loadAtlas(true); toast("正在重新载入年鉴核心"); });
    $("#fullscreen-atlas").addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await $("#atlas-frame").requestFullscreen();
      } catch { toast("浏览器未允许全屏，请在新窗口打开"); }
    });
    $("#atlas-frame").addEventListener("load", () => {
      $("#atlas-placeholder").hidden = true;
      bindAtlasFrameBridge();
      syncAtlasShell({ updateHash: true });
    });
    $("#reload-beilin").addEventListener("click", () => {
      loadBeilin(true);
      toast("正在重新载入碑林文物模块");
    });
    $("#fullscreen-beilin").addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await $("#beilin-frame").requestFullscreen();
      } catch {
        toast("浏览器未允许全屏，可使用“单独打开”");
      }
    });
    $("#beilin-frame").addEventListener("load", () => {
      $("#beilin-placeholder").hidden = true;
    });
    mobileQuery.addEventListener?.("change", syncLibrarianAccessibility);
    bindPeopleCarousel();
    window.addEventListener("hashchange", routeFromHash);
  }

  function init() {
    renderHome();
    renderCatalogs();
    renderRights();
    bindEvents();
    syncLibrarianAccessibility();
    routeFromHash();
    if (rejectedResources.length) {
      console.error("Resources rejected by admission gate:", window.ANNALES_REJECTED_RESOURCES);
      toast(`${rejectedResources.length} 条记录因缺失权利状态未入库`);
    }
  }

  init();
})();
