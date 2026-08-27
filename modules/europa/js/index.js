import { initRealMapView, stopRealMapView } from "./map-real.js";

const EUROPA_DATA = Object.assign(
  {},
  ...(await Promise.all([
    "./data/persons.json",
    "./data/relations.json",
    "./data/periods.json",
    "./data/sources.json",
    "./data/assets.json",
    "./data/geo.json",
    "./data/views.json"
  ].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Europa data load failed (${response.status}): ${url}`);
    return response.json();
  })))
);

const ADDITIONS_20260809 = EUROPA_DATA.ADDITIONS_20260809;
const ADDITION_CITIES_20260809 = EUROPA_DATA.ADDITION_CITIES_20260809;
const ADDITION_LINKS_20260809 = EUROPA_DATA.ADDITION_LINKS_20260809;
const ADDITION_PORTRAITS_20260809 = EUROPA_DATA.ADDITION_PORTRAITS_20260809;
const ART = EUROPA_DATA.ART;
const ART2 = EUROPA_DATA.ART2;
const BORDERS = EUROPA_DATA.BORDERS;
const BRIDGE = EUROPA_DATA.BRIDGE;
const BRIDGE2 = EUROPA_DATA.BRIDGE2;
const BRIDGE2CITY = EUROPA_DATA.BRIDGE2CITY;
const BRIDGE2L = EUROPA_DATA.BRIDGE2L;
const BRIDGECITY = EUROPA_DATA.BRIDGECITY;
const BRIDGEL = EUROPA_DATA.BRIDGEL;
const CITY = EUROPA_DATA.CITY;
const CITY2 = EUROPA_DATA.CITY2;
const CITYINFO = EUROPA_DATA.CITYINFO;
const COASTP = EUROPA_DATA.COASTP;
const EP = EUROPA_DATA.EP;
const EPCITE = EUROPA_DATA.EPCITE;
const GLOSS = EUROPA_DATA.GLOSS;
const HISTDEEP = EUROPA_DATA.HISTDEEP;
const HISTEVENTS = EUROPA_DATA.HISTEVENTS;
const L = EUROPA_DATA.L;
const LINEAGES = EUROPA_DATA.LINEAGES;
const LINKS2 = EUROPA_DATA.LINKS2;
const M = EUROPA_DATA.M;
const MUSIO_CN = EUROPA_DATA.MUSIO_CN;
const MUSIO_SCOPE = EUROPA_DATA.MUSIO_SCOPE;
const MUSIO_TEXT = EUROPA_DATA.MUSIO_TEXT;
const MUSIO_THESIS = EUROPA_DATA.MUSIO_THESIS;
const MUSIO_TURN = EUROPA_DATA.MUSIO_TURN;
const MUSIO_WEST = EUROPA_DATA.MUSIO_WEST;
const NEWM = EUROPA_DATA.NEWM;
const NORTON_CARD_NOTES = EUROPA_DATA.NORTON_CARD_NOTES;
const NORTON_GUIDE = EUROPA_DATA.NORTON_GUIDE;
const PATCH = EUROPA_DATA.PATCH;
const PILGRIM = EUROPA_DATA.PILGRIM;
const PORTRAITS = EUROPA_DATA.PORTRAITS;
const REGIONS = EUROPA_DATA.REGIONS;
const RIVERS = EUROPA_DATA.RIVERS;
const SCHOL = EUROPA_DATA.SCHOL;
const US_COAST = EUROPA_DATA.US_COAST;
const VIEWS = EUROPA_DATA.VIEWS;
const YFIX = EUROPA_DATA.YFIX;

/* ══════════ 注入资产（构建时由 merge.py 填充） ══════════ */





/* 2026-08-09 · 欧罗巴音乐家年鉴补编：七位人物与同源关系数据（含奇科尼亚） */




Object.assign(PORTRAITS,ADDITION_PORTRAITS_20260809);
const IMGV="v12";for(const _k in PORTRAITS){if(PORTRAITS[_k].u.indexOf("?")<0)PORTRAITS[_k].u+="?"+IMGV;}








GLOSS.push(
{term:"断代史",orig:"period history",def:"以相对完整的历史时期为单位，集中考察该时期音乐风格、制度、体裁和文化语境的著述方式。诺顿断代史中译本总序强调，中世纪、文艺复兴、巴洛克、古典、浪漫、二十世纪已成为西方音乐史研究的基本分期，但每一分期的边界和命名仍会引发争议。",ref:"诺顿音乐断代史中译本总序",ep:"modern"},
{term:"礼仪记忆",orig:"liturgical memory",def:"中世纪音乐不能只按作品目录理解；圣咏首先嵌入每日时辰、弥撒、节期和修院教育之中。记谱之前的口传训练、礼仪秩序和共同记忆构成了圣咏的真实载体。",ref:"Hoppin《中世纪音乐》",ep:"medieval"},
{term:"通奏低音",orig:"basso continuo",def:"巴洛克时期贯穿声乐与器乐的低音-和声实践；它既是伴奏技术，也是把单声旋律、和声逻辑和即兴实践结合起来的制度。",ref:"Hill《巴洛克音乐》",ep:"baroque"},
{term:"音乐修辞",orig:"musical rhetoric",def:"巴洛克音乐常以演说、情感说服和戏剧姿态来理解声音组织；歌剧、协奏风格、宣叙调、咏叹调和宫廷仪式都体现音乐作为修辞行动的一面。",ref:"Hill《巴洛克音乐》",ep:"baroque"},
{term:"奏鸣原则",orig:"sonata principle",def:"古典时期器乐中以调性对比、主题陈述、展开与再现组织大规模时间的原则。它不是固定公式，而是一套能制造期待、冲突和解决的戏剧语法。",ref:"Downs《古典音乐》",ep:"classical"},
{term:"公共音乐会",orig:"public concert",def:"十八世纪后期逐渐扩张的市民听众制度，使音乐从宫廷与教会专属场域进入售票、出版、评论和业余演奏共同塑造的公共空间。",ref:"Downs《古典音乐》",ep:"classical"},
{term:"绝对音乐 / 标题音乐",orig:"absolute music / program music",def:"十九世纪音乐批评的核心对立：前者强调器乐的自律形式，后者强调文学、图像、戏剧或哲学纲领。二者的争论塑造了浪漫主义的审美地图。",ref:"Plantinga《浪漫音乐》",ep:"romantic"},
{term:"动机网络",orig:"Leitmotiv network",def:"瓦格纳以后，主导动机不只是角色标签，而是让戏剧、记忆、欲望和管弦织体互相牵连的结构机制；十九世纪后半叶的音乐叙事由此获得新的连续性。",ref:"Plantinga《浪漫音乐》",ep:"romantic"},
{term:"多中心现代性",orig:"multiple modernities",def:"二十世纪音乐不宜只写成一条从调性到无调性、从序列到先锋的单线进步史；民族现代主义、爵士、电声、电影、流行文化和后现代并置构成多个中心。",ref:"Morgan《二十世纪音乐》",ep:"modern"},
{term:"技术媒介",orig:"technological mediation",def:"录音、广播、电影、电声设备和计算机不仅扩大音色材料，也改变作曲、传播、聆听和音乐作品存在方式，是二十世纪音乐史的重要变量。",ref:"Morgan《二十世纪音乐》",ep:"modern"}
);






/* ══════════ 基础数据 ══════════ */








/* ══════════ 桥接音乐家（补师承谱系之关键环节） ══════════ */




/* ══════════ 补编音乐家（游吟诗人 · Trecento · 女作曲家 · 战后欧洲） ══════════ */




/* ══════════ 数据合并 ══════════ */
BRIDGE.forEach(m=>M.push(m));
BRIDGEL.forEach(l=>L.push(l));
BRIDGE2.forEach(m=>M.push(m));
BRIDGE2L.forEach(l=>L.push(l));
for(const cn in BRIDGE2CITY){if(!CITY[cn])CITY[cn]=BRIDGE2CITY[cn]}
for(const cn in BRIDGECITY){if(!CITY[cn])CITY[cn]=BRIDGECITY[cn]}
NEWM.forEach(m=>M.push(m));
LINKS2.forEach(l=>{if(l&&l.length>=3)L.push(l)});
for(const cn in CITY2){if(!CITY[cn])CITY[cn]=CITY2[cn]}
ADDITIONS_20260809.forEach(m=>M.push(m));
ADDITION_LINKS_20260809.forEach(l=>{if(l&&l.length>=3)L.push(l)});
for(const cn in ADDITION_CITIES_20260809){if(!CITY[cn])CITY[cn]=ADDITION_CITIES_20260809[cn]}

const byId=Object.fromEntries(M.map(m=>[m.i,m]));
for(const id in PATCH){const m=byId[id];if(m)Object.assign(m,PATCH[id])}
for(const id in NORTON_CARD_NOTES){const m=byId[id];if(m)Object.assign(m,NORTON_CARD_NOTES[id])}
for(const k in SCHOL){if(SCHOL[k]&&SCHOL[k].essay&&EP[k])EP[k].intro=SCHOL[k].essay}
const EPK=Object.keys(EP);
const $=s=>document.querySelector(s);
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const RESEARCH_DATA_FILES=["works","versions","sources","performances","recordings","receptions"];
const RESEARCH_STATUS_LABEL=Object.freeze({complete:"完整",incomplete:"未完成",reconstructed:"重构",fragmentary:"残缺",disputed:"有争议",unknown:"未定"});
const VERSION_TYPE_LABEL=Object.freeze({authorial_state:"作者状态",completion:"补写完成",publication_state:"出版状态"});
const VERSION_STATUS_LABEL=Object.freeze({extant:"存世",fragmentary:"残缺"});
const VERSION_ROLE_LABEL=Object.freeze({composer:"作曲者", "composer and pre-publication reviser":"作曲者与出版前修订者",completer:"完成者", "posthumous publishing and editorial agents":"身后出版与编辑责任者"});
const FONTES_SOURCE_TYPE_LABEL=Object.freeze({autograph_manuscript:"亲笔手稿",printed_score:"印刷谱本",libretto:"剧本文本",other:"其他史料"});
const FONTES_CREATOR_ROLE_LABEL=Object.freeze({author:"作者",composer:"作曲者",publisher:"出版者", "named author":"署名作者", "composer and autograph contributor":"作曲者、亲笔材料贡献者", "completer and copyist":"完成者、抄写者"});
const FONTES_DATING_CERTAINTY_LABEL=Object.freeze({certain:"确定",approximate:"约定",range:"区间"});
const FONTES_LANGUAGE_LABEL=Object.freeze({de:"德语",la:"拉丁语",en:"英语",it:"意大利语",fr:"法语"});
const PERFORMANCE_TYPE_LABEL=Object.freeze({first_complete_performance:"首次完整演出",premiere:"首演",other:"其他演出"});
const PERFORMANCE_PARTICIPANT_ROLE_LABEL=Object.freeze({composer:"作曲者",conductor:"指挥",singer:"歌者",patron:"赞助者",other:"其他参与",director:"导演",designer:"设计者"});
const PERFORMANCE_INSTITUTION_ROLE_LABEL=Object.freeze({festival:"音乐节",theatre:"剧院",opera_house:"歌剧院",ensemble:"演出团体",church:"教堂",concert_hall:"音乐厅"});
const PERFORMANCE_DATING_CERTAINTY_LABEL=Object.freeze({certain:"确定"});
const PERFORMANCE_STATE_LABEL=Object.freeze({complete_cycle:"完整周期",complete_version:"完整演出形态",reconstructed_completion:"重构完成形态",excerpt:"片段演出"});
const RECORDING_TYPE_LABEL=Object.freeze({studio:"录音室录音",live:"现场录音",broadcast:"广播录音"});
const RECORDING_PARTICIPANT_ROLE_LABEL=Object.freeze({composer:"作曲者",conductor:"指挥",singer:"歌者",chorus:"合唱",ensemble_member:"乐团 / 合奏",speaker:"朗诵者"});
const RECORDING_CREDIT_ROLE_LABEL=Object.freeze({"recording company":"录音公司","recording producer":"制作人","recording engineer":"录音工程师","balance engineer":"平衡工程师",broadcaster:"广播机构","recording archive":"录音档案机构"});
const RECORDING_DURATION_STATUS_LABEL=Object.freeze({complete:"完整",surviving_only:"现存形态",approximate:"约数"});
const RECORDING_SURVIVAL_STATUS_LABEL=Object.freeze({extant_complete:"现存完整",extant_partial:"现存不完整"});
const RECORDING_DATING_CERTAINTY_LABEL=Object.freeze({certain:"确定"});
const RECEPTION_TYPE_LABEL=Object.freeze({controversy:"争议",canonization:"经典化",contemporary_criticism:"同时代批评",version_reassessment:"版本重估"});
const RECEPTION_SCOPE_LABEL=Object.freeze({immediate:"即时接受",short_term:"短期接受",retrospective:"回溯性接受"});
const RECEPTION_INTERPRETIVE_CERTAINTY_LABEL=Object.freeze({strong:"较强",partial:"部分"});
const RECEPTION_DATING_CERTAINTY_LABEL=Object.freeze({certain:"确定",range:"区间"});
const RECEPTION_ACTOR_ROLE_LABEL=Object.freeze({critic:"批评者",audience_group:"观众群体",other:"其他参与",scholar:"学者",institution:"机构",performer:"演出参与者",editor:"编辑者",publisher:"出版者"});
const RECEPTION_INSTITUTION_TYPE_LABEL=Object.freeze({theatre:"剧院",journal:"期刊",newspaper:"报纸",other:"其他机构",publisher:"出版机构"});
const RECEPTION_TARGET_RELATION_LABEL=Object.freeze({critical_response_to:"批评回应",reframes:"重新框定",canonizes:"经典化",institutionalizes:"制度化",reassesses:"重新评估",public_realization_of:"公开实现",public_completion_state:"公开完成状态",reassesses_authorship:"重新评估作者归属"});
const RECEPTION_TARGET_ENTITY_TYPE_LABEL=Object.freeze({work:"WORK",version:"VERSION",performance:"PERFORMANCE",recording:"RECORDING"});
let researchDataReady=false;
let researchWorks=[];
let researchData=Object.create(null);
function researchEscape(value){return String(value??"").replace(/[&<>\"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[ch]));}
function researchField(value,fallback="—"){
  const text=String(value??"").trim();
  return text?researchEscape(text):fallback;
}
function researchStatusLabel(status){return RESEARCH_STATUS_LABEL[String(status||"unknown")]||RESEARCH_STATUS_LABEL.unknown}
function researchVersionTypeLabel(type){return VERSION_TYPE_LABEL[String(type||"")]||"未定类型"}
function researchVersionStatusLabel(status){return VERSION_STATUS_LABEL[String(status||"")]||"未定"}
function researchVersionRoleLabel(role){return VERSION_ROLE_LABEL[String(role||"")]||"未定责任"}
function researchRefCount(work,key){return Array.isArray(work?.[key])?work[key].length:0}
function researchWorksForPerson(personId){return researchWorks.filter(work=>work&&work.personId===personId)}
function researchVersionsForWork(workId){
  const versions=Array.isArray(researchData.versions)?researchData.versions:[];
  return versions.map((version,index)=>({version,index})).filter(({version})=>version&&version.workId===workId).sort((a,b)=>{
    const ad=Number(a.version.dateStart),bd=Number(b.version.dateStart);
    const av=Number.isFinite(ad)?ad:Number.POSITIVE_INFINITY,bv=Number.isFinite(bd)?bd:Number.POSITIVE_INFINITY;
    return av-bv||a.index-b.index;
  }).map(({version})=>version);
}
function researchSourcesForWork(work){
  const sources=Array.isArray(researchData.sources)?researchData.sources:[];
  const bySourceId=new Map(sources.filter(source=>source&&source.id).map(source=>[source.id,source]));
  const refs=Array.isArray(work?.sourceRefs)?work.sourceRefs:[];
  return refs.map(sourceRef=>{
    const source=bySourceId.get(sourceRef);
    if(!source)console.warn("[AD FONTES] Unresolved WORK→SOURCE reference",{workId:work?.id,sourceRef});
    return source||null;
  }).filter(Boolean);
}
function researchPerformancesForWork(work){
  const performances=Array.isArray(researchData.performances)?researchData.performances:[];
  const byPerformanceId=new Map(performances.filter(performance=>performance&&performance.id).map(performance=>[performance.id,performance]));
  const refs=Array.isArray(work?.performanceRefs)?work.performanceRefs:[];
  return refs.map(performanceRef=>{
    const performance=byPerformanceId.get(performanceRef);
    if(!performance)console.warn("[AD FONTES] Unresolved WORK→PERFORMANCE reference",{workId:work?.id,performanceRef});
    return performance||null;
  }).filter(Boolean);
}
function researchRecordingsForWork(work){
  const recordings=Array.isArray(researchData.recordings)?researchData.recordings:[];
  const byRecordingId=new Map(recordings.filter(recording=>recording&&recording.id).map(recording=>[recording.id,recording]));
  const refs=Array.isArray(work?.recordingRefs)?work.recordingRefs:[];
  return refs.map(recordingRef=>{
    const recording=byRecordingId.get(recordingRef);
    if(!recording)console.warn("[AD FONTES] Unresolved WORK→RECORDING reference",{workId:work?.id,recordingRef});
    return recording||null;
  }).filter(Boolean);
}
function researchReceptionsForWork(work){
  const receptions=Array.isArray(researchData.receptions)?researchData.receptions:[];
  const byReceptionId=new Map(receptions.filter(reception=>reception&&reception.id).map(reception=>[reception.id,reception]));
  const refs=Array.isArray(work?.receptionRefs)?work.receptionRefs:[];
  return refs.map(receptionRef=>{
    const reception=byReceptionId.get(receptionRef);
    if(!reception)console.warn("[AD FONTES] Unresolved WORK→RECEPTION reference",{workId:work?.id,receptionRef});
    return reception||null;
  }).filter(Boolean);
}
function researchSourceTypeLabel(type){return FONTES_SOURCE_TYPE_LABEL[String(type||"")]||"未定类型"}
function researchCreatorRoleLabel(role){return FONTES_CREATOR_ROLE_LABEL[String(role||"")]||"责任未定"}
function researchDatingLabel(source){
  const dating=source?.dating||{};
  const certainty=FONTES_DATING_CERTAINTY_LABEL[String(dating.certainty||"")]||"未定";
  const note=String(dating.note??"").trim();
  return note?`${certainty} · ${researchEscape(note)}`:certainty;
}
function researchLanguageLabel(language){
  const codes=(Array.isArray(language)?language:[language]).map(code=>String(code??"").trim()).filter(Boolean);
  return codes.length?researchEscape(codes.map(code=>FONTES_LANGUAGE_LABEL[code]||code).join("、")):"—";
}
function researchPerformanceTypeLabel(type){return PERFORMANCE_TYPE_LABEL[String(type||"")]||"未定类型"}
function researchPerformanceParticipantRoleLabel(role){return PERFORMANCE_PARTICIPANT_ROLE_LABEL[String(role||"")]||"角色未定"}
function researchPerformanceInstitutionRoleLabel(role){return PERFORMANCE_INSTITUTION_ROLE_LABEL[String(role||"")]||"性质未定"}
function researchPerformanceDatingLabel(performance){
  const dating=performance?.dating||{};
  const certainty=PERFORMANCE_DATING_CERTAINTY_LABEL[String(dating.certainty||"")]||"未定";
  const note=String(dating.note??"").trim();
  return note?`${certainty} · ${researchEscape(note)}`:certainty;
}
function researchPerformanceStateLabel(state){return PERFORMANCE_STATE_LABEL[String(state||"")]||"状态未定"}
function researchPerformanceMatchLabel(value){
  if(value===true)return "已建立精确对应";
  if(value===false)return "未形成完整对应";
  return "当前未建立确定对应";
}
function researchRecordingTypeLabel(type){return RECORDING_TYPE_LABEL[String(type||"")]||"未定类型"}
function researchRecordingParticipantRoleLabel(role){return RECORDING_PARTICIPANT_ROLE_LABEL[String(role||"")]||"角色未定"}
function researchRecordingCreditRoleLabel(role){return RECORDING_CREDIT_ROLE_LABEL[String(role||"")]||"责任未定"}
function researchRecordingDurationStatusLabel(status){return RECORDING_DURATION_STATUS_LABEL[String(status||"")]||"状态未定"}
function researchRecordingSurvivalStatusLabel(status){return RECORDING_SURVIVAL_STATUS_LABEL[String(status||"")]||"状态未定"}
function researchRecordingDatingLabel(recording){
  const dating=recording?.dating||{};
  const certainty=RECORDING_DATING_CERTAINTY_LABEL[String(dating.certainty||"")]||"未定";
  const note=String(dating.note??"").trim();
  return note?`${certainty} · ${researchEscape(note)}`:certainty;
}
function researchReceptionTypeLabel(type){return RECEPTION_TYPE_LABEL[String(type||"")]||"未定类型"}
function researchReceptionScopeLabel(scope){return RECEPTION_SCOPE_LABEL[String(scope||"")]||"未定范围"}
function researchReceptionInterpretiveCertaintyLabel(certainty){return RECEPTION_INTERPRETIVE_CERTAINTY_LABEL[String(certainty||"")]||"未定"}
function researchReceptionDatingLabel(reception){
  const dating=reception?.dating||{};
  const certainty=RECEPTION_DATING_CERTAINTY_LABEL[String(dating.certainty||"")]||"未定";
  const note=String(dating.note??"");
  return note.trim()?`${certainty} · ${researchEscape(note)}`:certainty;
}
function researchReceptionActorRoleLabel(role){return RECEPTION_ACTOR_ROLE_LABEL[String(role||"")]||"角色未定"}
function researchReceptionInstitutionTypeLabel(type){return RECEPTION_INSTITUTION_TYPE_LABEL[String(type||"")]||"性质未定"}
function researchReceptionTargetRelationLabel(relation){return RECEPTION_TARGET_RELATION_LABEL[String(relation||"")]||researchField(relation)}
function researchReceptionTargetEntityTypeLabel(entityType){return RECEPTION_TARGET_ENTITY_TYPE_LABEL[String(entityType||"")]||"ENTITY"}
function researchReceptionTargetEntity(entityType,entityId){
  if(entityType==="work")return researchWorks.find(item=>item&&item.id===entityId)||null;
  if(entityType==="version"){
    const versions=Array.isArray(researchData.versions)?researchData.versions:[];
    return versions.find(item=>item&&item.id===entityId)||null;
  }
  if(entityType==="performance"){
    const performances=Array.isArray(researchData.performances)?researchData.performances:[];
    return performances.find(item=>item&&item.id===entityId)||null;
  }
  if(entityType==="recording"){
    const recordings=Array.isArray(researchData.recordings)?researchData.recordings:[];
    return recordings.find(item=>item&&item.id===entityId)||null;
  }
  return null;
}
function researchProvenanceLabel(provenance){
  return provenance==="not yet established"?"尚未建立":researchField(provenance);
}
function researchUrl(value){
  const text=String(value??"").trim();
  if(!text)return "";
  try{
    const url=new URL(text,location.href);
    return /^https?:$/.test(url.protocol)?researchEscape(text):"";
  }catch(error){return ""}
}
function renderFontesCreator(items){
  const rows=(Array.isArray(items)?items:[]).map(item=>{
    const person=item?.personId?byId[item.personId]:null;
    const name=person?researchField(person.n):researchField(item?.name||item?.personId);
    return `<li><span>${name}</span><small>${researchCreatorRoleLabel(item?.role)}</small></li>`;
  }).join("");
  return rows?`<ul class="work-archive-fontes-creators">${rows}</ul>`:"—";
}
function renderFontesLinks(source){
  const catalogue=String(source?.catalogueUrl??"").trim();
  const digital=String(source?.digitalUrl??"").trim();
  const manifest=String(source?.iiifManifest??"").trim();
  const links=[];
  const pushLink=(url,label)=>{const safeUrl=researchUrl(url);if(safeUrl)links.push(`<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`)};
  if(catalogue&&digital&&catalogue===digital)pushLink(catalogue,"馆藏与数字入口");
  else{
    if(catalogue)pushLink(catalogue,"馆藏目录");
    if(digital)pushLink(digital,"数字替代物");
  }
  if(manifest)pushLink(manifest,"IIIF Manifest");
  if(!links.length&&!digital)return "";
  return `<div class="work-archive-fontes-links">${links.join("")}${digital?`<p class="work-archive-fontes-digital-note">数字入口用于访问当前可核验的替代物或机构页面，不等于原件本身。</p>`:""}</div>`;
}
function renderFontesEvidence(source,work){
  const evidence=(Array.isArray(source?.evidenceFor)?source.evidenceFor:[]).filter(item=>item?.entityType==="work"&&item?.entityId===work.id);
  return evidence.length?`<section class="work-archive-fontes-evidence"><h6>为何进入此 WORK</h6><ul>${evidence.map(item=>`<li>${researchField(item?.evidenceNote)}</li>`).join("")}</ul></section>`:"";
}
function renderFontesField(label,value,wide=false){
  return `<div class="work-archive-fontes-field${wide?" work-archive-fontes-field-wide":""}"><dt>${label}</dt><dd>${value}</dd></div>`;
}
function renderFontesEntry(source,index,work){
  return `<article class="work-archive-fontes-entry">
    <header class="work-archive-fontes-entry-head"><span class="work-archive-fontes-number">FONS ${String(index+1).padStart(2,"0")}</span><h5 class="work-archive-fontes-title">${researchField(source.title)}</h5><div class="work-archive-fontes-original">${researchField(source.originalTitle)}</div></header>
    <dl class="work-archive-fontes-fields">
      ${renderFontesField("材料类型",researchSourceTypeLabel(source.sourceType))}
      ${renderFontesField("断代",researchField(source.date))}
      ${renderFontesField("断代依据",researchDatingLabel(source))}
      ${renderFontesField("责任者",renderFontesCreator(source.creator))}
      ${renderFontesField("收藏机构",researchField(source.repository))}
      ${renderFontesField("地点",researchField(source.repositoryPlace))}
      ${renderFontesField("馆藏号",researchField(source.shelfmark))}
      ${renderFontesField("所属馆藏",researchField(source.collection))}
      ${renderFontesField("材料形态",researchField(source.physicalDescription),true)}
      ${renderFontesField("页叶 / 数量",researchField(source.extent))}
      ${renderFontesField("语言",researchLanguageLabel(source.language))}
      ${renderFontesField("持久标识",researchField(source.persistentId))}
      ${renderFontesField("递藏 / 来源",researchProvenanceLabel(source.provenance),true)}
      ${renderFontesField("权利说明",researchField(source.rights?.statement),true)}
    </dl>
    ${renderFontesEvidence(source,work)}
    ${renderFontesLinks(source)}
    <section class="work-archive-fontes-criticism"><h6>史料批判</h6><p>${researchField(source.sourceCriticism)}</p></section>
  </article>`;
}
function renderVersionResponsibility(items,unlinked=false){
  const rows=(Array.isArray(items)?items:[]).map(item=>{
    const person=!unlinked&&item?.personId?byId[item.personId]:null;
    const name=unlinked?researchField(item?.name):person?researchField(person.n):researchField(item?.name||item?.personId);
    return `<li><span>${name}</span><small>${researchVersionRoleLabel(item?.role)}</small></li>`;
  }).join("");
  return rows?`<ul class="work-archive-version-responsibility">${rows}</ul>`:`<span class="work-archive-version-empty">—</span>`;
}
function renderRecordingField(label,value,wide=false){
  return `<div class="work-archive-recording-field${wide?" work-archive-recording-field-wide":""}"><dt>${label}</dt><dd>${value}</dd></div>`;
}
function renderRecordingParticipants(items){
  const rows=(Array.isArray(items)?items:[]).map(item=>{
    const personId=item?.personId!=null?item.personId:null;
    const person=personId!=null?byId[personId]:null;
    if(personId!=null&&!person)console.warn("[AD FONTES] Unresolved RECORDING participant person reference",{personId});
    const name=person?researchField(person.n):researchField(item?.name);
    return `<li><span>${name}</span><small>${researchRecordingParticipantRoleLabel(item?.role)}</small></li>`;
  }).join("");
  return rows?`<ul class="work-archive-recording-people">${rows}</ul>`:"—";
}
function renderRecordingCredits(items){
  const rows=(Array.isArray(items)?items:[]).map(item=>`<li><span>${researchField(item?.name)}</span><small>${researchRecordingCreditRoleLabel(item?.role)}</small></li>`).join("");
  return rows?`<ul class="work-archive-recording-credits">${rows}</ul>`:"—";
}
function renderRecordingVersion(versionId){
  if(versionId==null)return `<span class="work-archive-recording-version-empty">当前未建立对应 VERSION</span>`;
  const versions=Array.isArray(researchData.versions)?researchData.versions:[];
  const version=versions.find(item=>item&&item.id===versionId);
  if(!version){
    console.warn("[AD FONTES] Unresolved RECORDING→VERSION reference",{versionId});
    return `<span class="work-archive-recording-version-empty">当前未建立对应 VERSION</span>`;
  }
  return `<span class="work-archive-recording-version"><strong>${researchField(version.label)}</strong><small>${researchField(version.originalLabel)}</small></span>`;
}
function renderRecordingPerformance(performanceId){
  if(performanceId==null)return `<span class="work-archive-recording-performance-empty">当前未建立对应 PERFORMANCE</span>`;
  const performances=Array.isArray(researchData.performances)?researchData.performances:[];
  const performance=performances.find(item=>item&&item.id===performanceId);
  if(!performance){
    console.warn("[AD FONTES] Unresolved RECORDING→PERFORMANCE reference",{performanceId});
    return `<span class="work-archive-recording-performance-empty">当前未建立对应 PERFORMANCE</span>`;
  }
  return `<span class="work-archive-recording-performance"><strong>${researchField(performance.title)}</strong><small>${researchField(performance.date)}</small></span>`;
}
function renderRecordingDuration(duration){
  const value=duration||{};
  return `<div class="work-archive-recording-duration"><p class="work-archive-recording-duration-status"><span>状态：</span>${researchRecordingDurationStatusLabel(value.status)}</p><p class="work-archive-recording-duration-display">${researchField(value.display)}</p><p class="work-archive-recording-duration-note"><span>说明：</span>${researchField(value.note)}</p></div>`;
}
function renderRecordingEntry(recording,index){
  const relationshipToPerformance=String(recording?.relationshipToPerformance??"").trim();
  return `<article class="work-archive-recording-entry">
    <header class="work-archive-recording-entry-head"><div><span class="work-archive-recording-number">RECORDING ${String(index+1).padStart(2,"0")}</span><h5 class="work-archive-recording-title">${researchField(recording.title)}</h5></div><div class="work-archive-recording-date">${researchField(recording.recordingDate)}</div></header>
    <dl class="work-archive-recording-fields">
      ${renderRecordingField("录音类型",researchRecordingTypeLabel(recording.recordingType))}
      ${renderRecordingField("录音日期",researchField(recording.recordingDate))}
      ${renderRecordingField("断代依据",researchRecordingDatingLabel(recording))}
      ${renderRecordingField("录音场所",researchField(recording.recordingVenue))}
      ${renderRecordingField("城市",researchField(recording.place))}
      ${renderRecordingField("政体 / 地域",researchField(recording.countryOrPolity))}
      ${renderRecordingField("关联 VERSION",renderRecordingVersion(recording.versionId))}
      ${renderRecordingField("关联 PERFORMANCE",renderRecordingPerformance(recording.performanceId))}
      ${renderRecordingField("载体",researchField(recording.recordingMedium))}
      ${renderRecordingField("录音技术",researchField(recording.recordingTechnology))}
      ${renderRecordingField("声道",researchField(recording.channels))}
      ${renderRecordingField("保存状态",researchRecordingSurvivalStatusLabel(recording.survivalStatus))}
    </dl>
    <section class="work-archive-recording-section"><h6>参与者</h6>${renderRecordingParticipants(recording.participants)}</section>
    <section class="work-archive-recording-section"><h6>制作 / 录音责任</h6>${renderRecordingCredits(recording.recordingCredits)}</section>
    <section class="work-archive-recording-section"><h6>时长</h6>${renderRecordingDuration(recording.duration)}</section>
    <section class="work-archive-recording-section"><h6>技术说明</h6><p>${researchField(recording.technicalNote)}</p></section>
    <section class="work-archive-recording-section"><h6>版本关系说明</h6><p>${researchField(recording.relationshipToVersion)}</p></section>
    ${relationshipToPerformance?`<section class="work-archive-recording-section"><h6>演出关系说明</h6><p>${researchField(relationshipToPerformance)}</p></section>`:""}
    <section class="work-archive-recording-section work-archive-recording-history"><h6>历史语境</h6><p>${researchField(recording.historicalContext)}</p></section>
    <section class="work-archive-recording-section work-archive-recording-significance"><h6>录音史意义</h6><p>${researchField(recording.recordingSignificance)}</p></section>
  </article>`;
}
function renderReceptionField(label,value,wide=false){
  return `<div class="work-archive-reception-field${wide?" work-archive-reception-field-wide":""}"><dt>${label}</dt><dd>${value}</dd></div>`;
}
function renderReceptionActors(items){
  const rows=(Array.isArray(items)?items:[]).map(item=>{
    const personId=item?.personId??null;
    const person=personId?byId[personId]:null;
    if(personId&&!person)console.warn("[AD FONTES] Unresolved RECEPTION actor person reference",{personId});
    const name=person?researchField(person.n):researchField(item?.name);
    return `<li><span>${name}</span><small>${researchReceptionActorRoleLabel(item?.role)}</small></li>`;
  }).join("");
  return rows?`<ul class="work-archive-reception-actors">${rows}</ul>`:"—";
}
function renderReceptionInstitutions(items){
  const rows=(Array.isArray(items)?items:[]).map(item=>{
    const name=researchField(item?.name);
    const type=researchReceptionInstitutionTypeLabel(item?.type);
    const role=researchField(item?.role);
    return `<li><span>${name}</span><small>${type} · ${role}</small></li>`;
  }).join("");
  return rows?`<ul class="work-archive-reception-institutions">${rows}</ul>`:"—";
}
function renderReceptionTarget(target){
  const entityType=String(target?.entityType??"");
  const entityId=String(target?.entityId??"");
  const entity=researchReceptionTargetEntity(entityType,entityId);
  if(!entity)console.warn("[AD FONTES] Unresolved RECEPTION target reference",{entityType,entityId});
  let primary="当前未建立对应实体";
  let secondary="";
  if(entity){
    if(entityType==="work"){
      primary=researchField(entity.title);
      secondary=researchField(entity.originalTitle);
    }else if(entityType==="version"){
      primary=researchField(entity.label);
      secondary=researchField(entity.originalLabel);
    }else if(entityType==="performance"){
      primary=researchField(entity.title);
      secondary=researchField(entity.date);
    }else if(entityType==="recording"){
      primary=researchField(entity.title);
      secondary=researchField(entity.recordingDate);
    }
  }
  const secondaryMarkup=secondary?`<small>${secondary}</small>`:"";
  return `<li class="work-archive-reception-target"><span class="work-archive-reception-target-type">${researchReceptionTargetEntityTypeLabel(entityType)}</span><div class="work-archive-reception-target-entity"><strong>${primary}</strong>${secondaryMarkup}</div><small class="work-archive-reception-target-relation">${researchReceptionTargetRelationLabel(target?.relation)}</small></li>`;
}
function renderReceptionTargets(targetRefs){
  const rows=(Array.isArray(targetRefs)?targetRefs:[]).map(renderReceptionTarget).join("");
  return rows?`<ul class="work-archive-reception-targets">${rows}</ul>`:"—";
}
function renderReceptionEntry(reception,index){
  return `<article class="work-archive-reception-entry">
    <header class="work-archive-reception-entry-head"><div><span class="work-archive-reception-number">RECEPTION ${String(index+1).padStart(2,"0")}</span><h5 class="work-archive-reception-title">${researchField(reception?.title)}</h5></div><time class="work-archive-reception-date">${researchField(reception?.date)}</time></header>
    <dl class="work-archive-reception-fields">
      ${renderReceptionField("接受类型",researchReceptionTypeLabel(reception?.receptionType))}
      ${renderReceptionField("接受范围",researchReceptionScopeLabel(reception?.receptionScope))}
      ${renderReceptionField("日期",researchField(reception?.date))}
      ${renderReceptionField("断代依据",researchReceptionDatingLabel(reception))}
      ${renderReceptionField("地点",researchField(reception?.place))}
      ${renderReceptionField("解释把握度",researchReceptionInterpretiveCertaintyLabel(reception?.interpretiveCertainty))}
    </dl>
    <section class="work-archive-reception-section"><h6>参与者</h6>${renderReceptionActors(reception?.actors)}</section>
    <section class="work-archive-reception-section"><h6>相关机构</h6>${renderReceptionInstitutions(reception?.institutions)}</section>
    <section class="work-archive-reception-section"><h6>指向对象</h6>${renderReceptionTargets(reception?.targetRefs)}</section>
    <section class="work-archive-reception-section work-archive-reception-response"><h6>文献所见</h6><p>${researchField(reception?.documentedResponse)}</p></section>
    <section class="work-archive-reception-section work-archive-reception-interpretive"><h6>解释转向</h6><p>${researchField(reception?.interpretiveShift)}</p></section>
    <section class="work-archive-reception-section work-archive-reception-boundary"><h6>解释边界</h6><p>${researchField(reception?.interpretiveNote)}</p></section>
    <section class="work-archive-reception-section work-archive-reception-history"><h6>历史语境</h6><p>${researchField(reception?.historicalContext)}</p></section>
    <section class="work-archive-reception-section work-archive-reception-significance"><h6>接受史意义</h6><p>${researchField(reception?.receptionSignificance)}</p></section>
  </article>`;
}
function renderPersonWorks(m){
  if(!researchDataReady)return "";
  const works=researchWorksForPerson(m.i);
  if(!works.length)return "";
  return `<section class="person-work-archive" aria-labelledby="person-work-archive-title">
    <div class="person-work-archive-head"><div><h5 id="person-work-archive-title" class="person-work-archive-title">作品与版本</h5><div class="person-work-archive-latin">OPERA ET VERSIONES</div></div><span class="person-work-archive-count">${works.length} 部 WORK</span></div>
    <div class="person-work-list">${works.map(work=>`<article class="person-work-entry">
      <div class="person-work-entry-meta"><div><h6 class="person-work-entry-title">${researchField(work.title)}</h6><div class="person-work-entry-original">${researchField(work.originalTitle)}</div></div><span class="person-work-entry-status">${researchStatusLabel(work.status)}</span></div>
      <div class="person-work-entry-details"><span>${researchField(work.date)}</span><span>${researchField(work.genre)}</span></div>
      <p class="person-work-entry-summary">${researchField(work.summary)}</p>
      <button type="button" class="person-work-open" data-work-open="${researchField(work.id,"")}">打开档案 <span aria-hidden="true">→</span></button>
    </article>`).join("")}</div>
  </section>`;
}
function researchIndexValue(count){return count?String(count):"尚未建立"}
function renderWorkArchiveIndex(work){
  const items=[["版本","VERSION","versionRefs"],["原始史料","FONTES","sourceRefs"],["演出","PERFORMANCE","performanceRefs"],["录音","RECORDING","recordingRefs"],["接受史","RECEPTION","receptionRefs"]];
  return `<div class="work-archive-index">${items.map(([label,archiveLabel,key])=>{
    const count=researchRefCount(work,key);
    const body=`<span>${label}</span><small>${archiveLabel}</small><b>${researchIndexValue(count)}</b>`;
    if(key==="versionRefs"&&count>0)return `<button type="button" class="work-archive-index-item work-archive-index-button" data-version-open="${researchField(work.id,"")}" aria-label="打开版本谱系">${body}</button>`;
    if(key==="sourceRefs"&&count>0)return `<button type="button" class="work-archive-index-item work-archive-index-button" data-fontes-open="${researchField(work.id,"")}" aria-label="打开原始史料">${body}</button>`;
    if(key==="performanceRefs"&&count>0)return `<button type="button" class="work-archive-index-item work-archive-index-button" data-performance-open="${researchField(work.id,"")}" aria-label="打开演出史">${body}</button>`;
    if(key==="recordingRefs"&&count>0)return `<button type="button" class="work-archive-index-item work-archive-index-button" data-recording-open="${researchField(work.id,"")}" aria-label="打开录音史">${body}</button>`;
    if(key==="receptionRefs"&&count>0)return `<button type="button" class="work-archive-index-item work-archive-index-button" data-reception-open="${researchField(work.id,"")}" aria-label="打开接受史">${body}</button>`;
    return `<div class="work-archive-index-item">${body}</div>`;
  }).join("")}</div>`;
}
function renderVersionLineageEntry(version,index){
  return `<article class="work-archive-version-entry">
    <span class="work-archive-version-node" aria-hidden="true"></span>
    <div class="work-archive-version-head"><div><span class="work-archive-version-number">VERSION ${String(index+1).padStart(2,"0")}</span><h5 class="work-archive-version-label">${researchField(version.label)}</h5><div class="work-archive-version-original">${researchField(version.originalLabel)}</div></div><div class="work-archive-version-date">${researchField(version.date)}</div></div>
    <dl class="work-archive-version-fields">
      <div class="work-archive-version-field"><dt>类型</dt><dd>${researchVersionTypeLabel(version.versionType)}</dd></div>
      <div class="work-archive-version-field"><dt>状态</dt><dd>${researchVersionStatusLabel(version.status)}</dd></div>
      <div class="work-archive-version-field"><dt>人物责任</dt><dd>${renderVersionResponsibility(version.responsibility)}</dd></div>
      <div class="work-archive-version-field"><dt>未建人物责任</dt><dd>${renderVersionResponsibility(version.unlinkedResponsibility,true)}</dd></div>
      <div class="work-archive-version-field work-archive-version-field-wide"><dt>变更范围</dt><dd>${researchField(version.scopeOfChange)}</dd></div>
      <div class="work-archive-version-field work-archive-version-field-wide"><dt>与 WORK 的关系</dt><dd>${researchField(version.relationshipToWork)}</dd></div>
    </dl>
  </article>`;
}
function openWorkArchive(workId,opts={}){
  if(!researchDataReady)return;
  const work=researchWorks.find(item=>item&&item.id===workId);
  const person=work&&byId[work.personId];
  const dg=$("#dlg");
  const wrap=$("#dwrap");
  if(!work||!person||!dg||!wrap)return;
  const storedPersonScroll=Number(dg.dataset.personScroll);
  const personScroll=Number.isFinite(Number(opts.personScroll))?Number(opts.personScroll):Number.isFinite(storedPersonScroll)?storedPersonScroll:wrap.scrollTop||0;
  const restoreScroll=Number.isFinite(Number(opts.restoreScroll))?Number(opts.restoreScroll):null;
  dg.dataset.kind="work";
  dg.dataset.m=person.i;
  dg.dataset.work=work.id;
  dg.dataset.personScroll=String(personScroll);
  delete dg.dataset.workScroll;
  dg.setAttribute("aria-labelledby","work-archive-title");
  const source=dg.dataset.source||"年鉴名录";
  wrap.innerHTML=`<div class="work-archive-view">
    <div class="work-archive-nav"><button type="button" class="work-archive-back" id="work-archive-back">← 返回人物</button><button type="button" class="dclose work-archive-close" id="dx" aria-label="关闭详情">✕</button></div>
    <header class="work-archive-header"><span class="work-archive-kicker">WORK ARCHIVE · OVERVIEW</span><h4 id="work-archive-title">${researchField(work.title)}</h4><div class="work-archive-original">${researchField(work.originalTitle)}</div><div class="work-archive-meta">${researchField(work.date)} · ${researchField(work.genre)}</div><span class="work-archive-status">${researchStatusLabel(work.status)}</span></header>
    <div class="work-archive-identity"><div><span>编目</span><b>${researchField(work.catalogue)}</b></div><div><span>归属人物</span><b>${researchField(person.n)}</b></div></div>
    <section class="work-archive-section"><h5>摘 要</h5><p>${researchField(work.summary)}</p></section>
    <section class="work-archive-section"><h5>历史语境</h5><p>${researchField(work.historicalContext)}</p></section>
    <section class="work-archive-section"><h5>为何值得研究</h5><p>${researchField(work.whyThisWorkMatters)}</p></section>
    <section class="work-archive-section"><h5>研究问题</h5><ul class="work-archive-questions">${(Array.isArray(work.researchQuestions)?work.researchQuestions:[]).map(question=>`<li>${researchField(question)}</li>`).join("")||"<li>当前未建档</li>"}</ul></section>
    <section class="work-archive-section work-archive-section-index"><h5>档案索引</h5><p class="work-archive-index-note">计数仅指当前已建档记录；空缺不表示历史上不存在。</p>${renderWorkArchiveIndex(work)}</section>
  </div>`;
  if(!dg.open)dg.show();
  $("#work-archive-back").onclick=()=>openM(person.i,source,{restoreScroll:personScroll});
  $("#dx").onclick=()=>dg.close();
  $("#dwrap").querySelectorAll("[data-version-open]").forEach(b=>b.onclick=()=>openVersionLineage(b.dataset.versionOpen));
  $("#dwrap").querySelectorAll("[data-fontes-open]").forEach(b=>b.onclick=()=>openFontes(b.dataset.fontesOpen));
  $("#dwrap").querySelectorAll("[data-performance-open]").forEach(b=>b.onclick=()=>openPerformance(b.dataset.performanceOpen));
  $("#dwrap").querySelectorAll("[data-recording-open]").forEach(b=>b.onclick=()=>openRecording(b.dataset.recordingOpen));
  $("#dwrap").querySelectorAll("[data-reception-open]").forEach(b=>b.onclick=()=>openReception(b.dataset.receptionOpen));
  requestAnimationFrame(()=>{
    if(restoreScroll!=null)wrap.scrollTop=restoreScroll;
    const focusTarget=opts.focusFontes===true?wrap.querySelector("[data-fontes-open]"):opts.focusVersion===true?wrap.querySelector("[data-version-open]"):opts.focusPerformance===true?wrap.querySelector("[data-performance-open]"):opts.focusRecording===true?wrap.querySelector("[data-recording-open]"):opts.focusReception===true?wrap.querySelector("[data-reception-open]"):$("#work-archive-back");
    focusTarget?.focus({preventScroll:true});
    if(restoreScroll!=null)requestAnimationFrame(()=>{wrap.scrollTop=restoreScroll});
  });
}
function renderPerformanceField(label,value,wide=false){
  return `<div class="work-archive-performance-field${wide?" work-archive-performance-field-wide":""}"><dt>${label}</dt><dd>${value}</dd></div>`;
}
function renderPerformanceParticipants(items){
  const rows=(Array.isArray(items)?items:[]).map(item=>{
    const person=item?.personId?byId[item.personId]:null;
    if(item?.personId&&!person)console.warn("[AD FONTES] Unresolved PERFORMANCE participant person reference",{personId:item.personId});
    const name=person?researchField(person.n):researchField(item?.name);
    return `<li><span>${name}</span><small>${researchPerformanceParticipantRoleLabel(item?.role)}</small></li>`;
  }).join("");
  return rows?`<ul class="work-archive-performance-people">${rows}</ul>`:"—";
}
function renderPerformanceInstitutions(items){
  const rows=(Array.isArray(items)?items:[]).map(item=>`<li><span>${researchField(item?.name)}</span><small>${researchPerformanceInstitutionRoleLabel(item?.role)}</small></li>`).join("");
  return rows?`<ul class="work-archive-performance-institutions">${rows}</ul>`:"—";
}
function renderPerformanceProgramme(programme){
  const items=Array.isArray(programme?.items)?programme.items:[];
  const rows=items.map(item=>`<li><span class="work-archive-performance-programme-order">${researchField(item?.order)}</span><span class="work-archive-performance-programme-label">${researchField(item?.label)}</span><time class="work-archive-performance-programme-date">${researchField(item?.date)}</time></li>`).join("");
  return rows?`<div class="work-archive-performance-programme"><p class="work-archive-performance-programme-format"><span>节目形态</span> ${researchField(programme?.format)}</p><ol class="work-archive-performance-programme-items">${rows}</ol></div>`:"—";
}
function renderPerformanceVersion(versionId){
  if(versionId==null)return `<span class="work-archive-performance-version-empty">当前未建立对应 VERSION</span>`;
  const versions=Array.isArray(researchData.versions)?researchData.versions:[];
  const version=versions.find(item=>item&&item.id===versionId);
  if(!version){
    console.warn("[AD FONTES] Unresolved PERFORMANCE→VERSION reference",{versionId});
    return `<span class="work-archive-performance-version-empty">当前未建立对应 VERSION</span>`;
  }
  return `<span class="work-archive-performance-version"><strong>${researchField(version.label)}</strong><small>${researchField(version.originalLabel)}</small></span>`;
}
function renderPerformanceEntry(performance,index){
  const state=performance?.performanceState||{};
  return `<article class="work-archive-performance-entry">
    <header class="work-archive-performance-entry-head"><div><span class="work-archive-performance-number">PERFORMANCE ${String(index+1).padStart(2,"0")}</span><h5 class="work-archive-performance-title">${researchField(performance.title)}</h5></div><div class="work-archive-performance-date">${researchField(performance.date)}</div></header>
    <dl class="work-archive-performance-fields">
      ${renderPerformanceField("演出类型",researchPerformanceTypeLabel(performance.performanceType))}
      ${renderPerformanceField("日期",researchField(performance.date))}
      ${renderPerformanceField("断代依据",researchPerformanceDatingLabel(performance))}
      ${renderPerformanceField("场所",researchField(performance.venue))}
      ${renderPerformanceField("城市",researchField(performance.place))}
      ${renderPerformanceField("政体 / 地域",researchField(performance.countryOrPolity))}
      ${renderPerformanceField("制作标识",researchField(performance.productionLabel))}
      ${renderPerformanceField("关联 VERSION",renderPerformanceVersion(performance.versionId))}
      ${renderPerformanceField("与 VERSION 的对应",researchPerformanceMatchLabel(state.matchesVersionExactly),true)}
    </dl>
    <section class="work-archive-performance-section"><h6>参与者</h6>${renderPerformanceParticipants(performance.participants)}</section>
    <section class="work-archive-performance-section"><h6>机构</h6>${renderPerformanceInstitutions(performance.institutions)}</section>
    <section class="work-archive-performance-section"><h6>节目</h6>${renderPerformanceProgramme(performance.programme)}</section>
    <section class="work-archive-performance-section"><h6>演出状态</h6><p>${researchPerformanceStateLabel(state.state)}</p></section>
    <section class="work-archive-performance-section"><h6>状态说明</h6><p>${researchField(state.note)}</p></section>
    <section class="work-archive-performance-section work-archive-performance-history"><h6>历史现场</h6><p>${researchField(performance.historicalContext)}</p></section>
    <section class="work-archive-performance-section work-archive-performance-significance"><h6>演出史意义</h6><p>${researchField(performance.performanceSignificance)}</p></section>
  </article>`;
}
function openPerformance(workId){
  if(!researchDataReady)return;
  const work=researchWorks.find(item=>item&&item.id===workId);
  const person=work&&byId[work.personId];
  const performances=researchPerformancesForWork(work);
  const dg=$("#dlg");
  const wrap=$("#dwrap");
  if(!work||!person||!performances.length||!dg||!wrap)return;
  const personScroll=Number.isFinite(Number(dg.dataset.personScroll))?Number(dg.dataset.personScroll):0;
  const workScroll=wrap.scrollTop||0;
  const source=dg.dataset.source||"年鉴名录";
  dg.dataset.kind="performance";
  dg.dataset.m=person.i;
  dg.dataset.work=work.id;
  dg.dataset.personScroll=String(personScroll);
  dg.dataset.workScroll=String(workScroll);
  dg.setAttribute("aria-labelledby","performance-title");
  wrap.innerHTML=`<div class="work-archive-view work-archive-performance-view">
    <div class="work-archive-nav"><button type="button" class="work-archive-back" id="performance-back">← 返回作品</button><button type="button" class="dclose work-archive-close" id="dx" aria-label="关闭详情">✕</button></div>
    <header class="work-archive-header work-archive-performance-header"><span class="work-archive-kicker">WORK ARCHIVE · PERFORMANCE</span><h4 id="performance-title">演出史</h4><div class="work-archive-original">PERFORMANCE</div><div class="work-archive-meta">${researchField(work.title)} · ${researchField(work.originalTitle)}</div></header>
    <div class="work-archive-performance-context"><span>归属 WORK</span><strong>${researchField(work.title)}</strong><small>${researchField(work.originalTitle)}</small></div>
    <p class="work-archive-performance-intro">作品一旦进入演出现场，便不再只是总谱的兑现。此处只列与该 WORK 明确建立关系的演出；日期、场所、参与者、节目与版本责任分别保留。</p>
    <section class="work-archive-performance-list">${performances.map(renderPerformanceEntry).join("")}</section>
  </div>`;
  if(!dg.open)dg.show();
  $("#performance-back").onclick=()=>openWorkArchive(work.id,{personScroll,restoreScroll:workScroll,focusPerformance:true});
  $("#dx").onclick=()=>dg.close();
  requestAnimationFrame(()=>$("#performance-back")?.focus());
}
function openRecording(workId){
  if(!researchDataReady)return;
  const work=researchWorks.find(item=>item&&item.id===workId);
  const person=work&&byId[work.personId];
  const recordings=researchRecordingsForWork(work);
  const dg=$("#dlg");
  const wrap=$("#dwrap");
  if(!work||!person||!recordings.length||!dg||!wrap)return;
  const personScroll=Number.isFinite(Number(dg.dataset.personScroll))?Number(dg.dataset.personScroll):0;
  const workScroll=wrap.scrollTop||0;
  const source=dg.dataset.source||"年鉴名录";
  dg.dataset.kind="recording";
  dg.dataset.m=person.i;
  dg.dataset.work=work.id;
  dg.dataset.personScroll=String(personScroll);
  dg.dataset.workScroll=String(workScroll);
  dg.setAttribute("aria-labelledby","recording-title");
  wrap.innerHTML=`<div class="work-archive-view work-archive-recording-view">
    <div class="work-archive-nav"><button type="button" class="work-archive-back" id="recording-back">← 返回作品</button><button type="button" class="dclose work-archive-close" id="dx" aria-label="关闭详情">✕</button></div>
    <header class="work-archive-header work-archive-recording-header"><span class="work-archive-kicker">WORK ARCHIVE · RECORDING</span><h4 id="recording-title">录音史</h4><div class="work-archive-original">RECORDING</div><div class="work-archive-meta">${researchField(work.title)} · ${researchField(work.originalTitle)}</div></header>
    <div class="work-archive-recording-context"><span>归属 WORK</span><strong>${researchField(work.title)}</strong><small>${researchField(work.originalTitle)}</small></div>
    <p class="work-archive-recording-intro">录音把作品从一次性的现场转入可复制、剪辑、保存与再发行的声音制度。此处只列与该 WORK 明确建立关系的录音；版本、演出、媒介、技术与保存状态分别保留。</p>
    <section class="work-archive-recording-list">${recordings.map(renderRecordingEntry).join("")}</section>
  </div>`;
  if(!dg.open)dg.show();
  $("#recording-back").onclick=()=>openWorkArchive(work.id,{personScroll,restoreScroll:workScroll,focusRecording:true});
  $("#dx").onclick=()=>dg.close();
  requestAnimationFrame(()=>$("#recording-back")?.focus());
}
function openReception(workId){
  if(!researchDataReady)return;
  const work=researchWorks.find(item=>item&&item.id===workId);
  const person=work&&byId[work.personId];
  const receptions=researchReceptionsForWork(work);
  const dg=$("#dlg");
  const wrap=$("#dwrap");
  if(!work||!person||!receptions.length||!dg||!wrap)return;
  const personScroll=Number.isFinite(Number(dg.dataset.personScroll))?Number(dg.dataset.personScroll):0;
  const workScroll=wrap.scrollTop||0;
  dg.dataset.kind="reception";
  dg.dataset.m=person.i;
  dg.dataset.work=work.id;
  dg.dataset.personScroll=String(personScroll);
  dg.dataset.workScroll=String(workScroll);
  dg.setAttribute("aria-labelledby","reception-title");
  wrap.innerHTML=`<div class="work-archive-view work-archive-reception-view">
    <div class="work-archive-nav"><button type="button" class="work-archive-back" id="reception-back">← 返回作品</button><button type="button" class="dclose work-archive-close" id="dx" aria-label="关闭详情">✕</button></div>
    <header class="work-archive-header work-archive-reception-header"><span class="work-archive-kicker">WORK ARCHIVE · RECEPTION</span><h4 id="reception-title">接受史</h4><div class="work-archive-original">RECEPTION</div><div class="work-archive-meta">${researchField(work.title)} · ${researchField(work.originalTitle)}</div></header>
    <div class="work-archive-reception-context"><span>归属 WORK</span><strong>${researchField(work.title)}</strong><small>${researchField(work.originalTitle)}</small></div>
    <p class="work-archive-reception-intro">作品进入公共判断之后，接受史记录的不是一条从争议通向经典的直线。此处只列与该 WORK 明确建立关系的接受节点，并把可直接文献化的反应、研究者的解释转向及其证据强度分开保存。</p>
    <section class="work-archive-reception-list">${receptions.map(renderReceptionEntry).join("")}</section>
  </div>`;
  if(!dg.open)dg.show();
  $("#reception-back").onclick=()=>openWorkArchive(work.id,{personScroll,restoreScroll:workScroll,focusReception:true});
  $("#dx").onclick=()=>dg.close();
  requestAnimationFrame(()=>$("#reception-back")?.focus());
}
function openFontes(workId){
  if(!researchDataReady)return;
  const work=researchWorks.find(item=>item&&item.id===workId);
  const person=work&&byId[work.personId];
  const sources=researchSourcesForWork(work);
  const dg=$("#dlg");
  const wrap=$("#dwrap");
  if(!work||!person||!sources.length||!dg||!wrap)return;
  const personScroll=Number.isFinite(Number(dg.dataset.personScroll))?Number(dg.dataset.personScroll):0;
  const workScroll=wrap.scrollTop||0;
  const source=dg.dataset.source||"年鉴名录";
  dg.dataset.kind="fontes";
  dg.dataset.m=person.i;
  dg.dataset.work=work.id;
  dg.dataset.personScroll=String(personScroll);
  dg.dataset.workScroll=String(workScroll);
  dg.setAttribute("aria-labelledby","fontes-title");
  wrap.innerHTML=`<div class="work-archive-view work-archive-fontes-view">
    <div class="work-archive-nav"><button type="button" class="work-archive-back" id="fontes-back">← 返回作品</button><button type="button" class="dclose work-archive-close" id="dx" aria-label="关闭详情">✕</button></div>
    <header class="work-archive-header work-archive-fontes-header"><span class="work-archive-kicker">WORK ARCHIVE · FONTES</span><h4 id="fontes-title">原始史料</h4><div class="work-archive-original">FONTES</div><div class="work-archive-meta">${researchField(work.title)} · ${researchField(work.originalTitle)}</div></header>
    <div class="work-archive-fontes-context"><span>归属 WORK</span><strong>${researchField(work.title)}</strong><small>${researchField(work.originalTitle)}</small></div>
    <p class="work-archive-fontes-intro">此处只列与该 WORK 明确建立关系的史料见证；手稿、印刷本、馆藏记录与数字替代物各有证据边界，不相互替代。</p>
    <section class="work-archive-fontes-list">${sources.map((sourceItem,index)=>renderFontesEntry(sourceItem,index,work)).join("")}</section>
  </div>`;
  if(!dg.open)dg.show();
  $("#fontes-back").onclick=()=>openWorkArchive(work.id,{personScroll,restoreScroll:workScroll,focusFontes:true});
  $("#dx").onclick=()=>dg.close();
  requestAnimationFrame(()=>$("#fontes-back")?.focus());
}
function openVersionLineage(workId){
  if(!researchDataReady)return;
  const work=researchWorks.find(item=>item&&item.id===workId);
  const person=work&&byId[work.personId];
  const versions=researchVersionsForWork(workId);
  const dg=$("#dlg");
  const wrap=$("#dwrap");
  if(!work||!person||!versions.length||!dg||!wrap)return;
  const personScroll=Number.isFinite(Number(dg.dataset.personScroll))?Number(dg.dataset.personScroll):0;
  const workScroll=wrap.scrollTop||0;
  const source=dg.dataset.source||"年鉴名录";
  dg.dataset.kind="version";
  dg.dataset.m=person.i;
  dg.dataset.work=work.id;
  dg.dataset.personScroll=String(personScroll);
  dg.dataset.workScroll=String(workScroll);
  dg.setAttribute("aria-labelledby","version-lineage-title");
  wrap.innerHTML=`<div class="work-archive-view work-archive-version-view">
    <div class="work-archive-nav"><button type="button" class="work-archive-back" id="version-lineage-back">← 返回作品</button><button type="button" class="dclose work-archive-close" id="dx" aria-label="关闭详情">✕</button></div>
    <header class="work-archive-header work-archive-version-header"><span class="work-archive-kicker">WORK ARCHIVE · VERSION LINEAGE</span><h4 id="version-lineage-title">版本谱系</h4><div class="work-archive-original">VERSIONES</div><div class="work-archive-meta">${researchField(work.title)} · ${researchField(work.originalTitle)}</div></header>
    <div class="work-archive-version-context"><span>归属 WORK</span><strong>${researchField(work.title)}</strong><small>${researchField(work.originalTitle)}</small></div>
    <section class="work-archive-version-lineage" aria-label="版本谱系条目">${versions.map(renderVersionLineageEntry).join("")}</section>
  </div>`;
  if(!dg.open)dg.show();
  $("#version-lineage-back").onclick=()=>openWorkArchive(work.id,{personScroll,restoreScroll:workScroll,focusVersion:true});
  $("#dx").onclick=()=>dg.close();
  requestAnimationFrame(()=>$("#version-lineage-back")?.focus());
}
async function loadResearchData(){
  try{
    const entries=await Promise.all(RESEARCH_DATA_FILES.map(async name=>{
      const response=await fetch(`./data/research/${name}.json`);
      if(!response.ok)throw new Error(`Europa research data load failed (${response.status}): ${name}`);
      const value=await response.json();
      if(!Array.isArray(value))throw new Error(`Europa research data is not an array: ${name}`);
      return [name,value];
    }));
    researchData=Object.fromEntries(entries);
    researchWorks=researchData.works||[];
    researchDataReady=true;
    const dg=$("#dlg");
    if(dg.open&&dg.dataset.kind==="musician"&&dg.dataset.m){
      const scroll=$("#dwrap")?.scrollTop||0;
      openM(dg.dataset.m,dg.dataset.source||"年鉴名录",{restoreScroll:scroll});
    }
  }catch(error){
    researchDataReady=false;
    researchWorks=[];
    console.warn("[AD FONTES] WORK archive data unavailable; original Europa UI remains active.",error);
  }
}
const chronograph=$("#chronograph");
let chronographFrame=0;
function paintChronograph(){
  chronographFrame=0;
  const root=document.documentElement,max=Math.max(0,root.scrollHeight-innerHeight);
  const progress=max?Math.min(1,Math.max(0,scrollY/max)):0;
  chronograph.style.transform=`scaleX(${progress.toFixed(4)})`;
}
function queueChronograph(){if(!chronographFrame)chronographFrame=requestAnimationFrame(paintChronograph)}
addEventListener("scroll",queueChronograph,{passive:true});
addEventListener("resize",queueChronograph,{passive:true});
document.addEventListener("visibilitychange",()=>{
  document.documentElement.classList.toggle("motion-paused",document.hidden);
  if(!document.hidden)queueChronograph();
});

/* ══════════ 师承谱系 ══════════ */


/* ══════════ 重要历史事件脉络 ══════════ */


/* 年代解析 */

function py(part){const mm=part.match(/\d{3,4}|\d+/);if(!mm)return null;let v=+mm[0];if(part.includes("前"))v=-v;return v}
function yrs(m){if(YFIX[m.i])return YFIX[m.i];const ps=m.d.split(/[–—\-]/);let a=py(ps[0]),b=ps.length>1?py(ps[ps.length-1]):null;if(a==null)return[1500,1560];if(b==null||b<a&&b>0&&a>1000)b=a+55;return[a,b]}

function med(m,sz){
  const init=(m.o.match(/[A-ZÀ-Þ]/g)||["?"]).slice(0,3).join("");
  return `<svg class="med" width="${sz}" height="${sz}" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="30" fill="none" stroke="var(--acc)" stroke-width="1.6"/>
  <circle cx="32" cy="32" r="25.5" fill="none" stroke="var(--acc2)" stroke-width=".8" stroke-dasharray="3 3"/>
  <text x="32" y="38.5" text-anchor="middle" font-family="Palatino Linotype,Georgia,serif" font-size="17" letter-spacing="1" fill="var(--acc)">${init}</text></svg>`}
function pic(m,h){
  const p=PORTRAITS[m.i];
  return `<div class="pic" style="height:${h}px">${p?`<img loading="lazy" decoding="async" src="${p.u}" alt="${m.n}肖像">`:med(m,Math.min(64,h-40)+20>84?84:64)}</div>`}

function firstSentence(text,max=132){
  const clean=String(text||"").replace(/\s+/g," ").trim();
  const hit=clean.match(/^.*?[。！？](?=.|$)/);
  const out=(hit?hit[0]:clean).trim();
  return out.length>max?out.slice(0,max).replace(/[，、；：\s]+$/g,"")+"……":out;
}
function lastSentence(text,max=180){
  const clean=String(text||"").replace(/\s+/g," ").trim();
  const parts=clean.split(/(?<=[。！？])/).filter(Boolean);
  const out=(parts.at(-1)||clean).trim();
  return out.length>max?out.slice(0,max).replace(/[，、；：\s]+$/g,"")+"……":out;
}
function renderChapterIntro(e){
  const paras=String(e.intro||"").split(/\n\n+/).map(p=>p.trim()).filter(Boolean);
  const labels=["断代与问题","建制、媒介与传播","史学视角与关键判断","历史回声"];
  const chars=paras.join("").replace(/\s/g,"").length;
  return `<div class="reading-guide">
    <div class="read-summary"><span class="read-kicker">本章先读 · ABSTRACT</span><p>${firstSentence(paras.join(" "))}</p>
      <div class="read-meta"><span>约 ${Math.max(2,Math.ceil(chars/500))} 分钟</span><span>${paras.length} 个阅读层次</span><span>正文 ${chars} 字</span></div></div>
    <div class="read-sections">${paras.map((p,i)=>`<section class="read-section"><h3>${labels[i]||`论题 ${i+1}`}</h3><p>${p}</p></section>`).join("")}</div>
    <aside class="read-takeaway"><b>关键结论 · TAKEAWAY</b><p>${lastSentence(paras.join(" "))}</p></aside>
  </div>`;
}
function debateSummary(text){return firstSentence(text,116)}
function stateHTML(kicker,title,body,actions=""){
  return `<div class="viz-state-copy"><span class="viz-state-kicker">${kicker}</span><b>${title}</b>${body?`<p>${body}</p>`:""}</div>${actions?`<div class="state-actions">${actions}</div>`:""}`;
}

$("#stats").textContent=`${M.length} 位音乐家 · ${L.length} 条关系 · ${Object.keys(CITY).length} 座城市 · ${GLOSS.length} 条术语 · 七个时代`;

/* ══════════ 年鉴 ══════════ */
let curEp="greek";
function renderEpnav(){$("#epnav").innerHTML=EPK.map(k=>`<button data-ep="${k}" class="${k===curEp?'on':''}"><b>${EP[k].zh}</b><i>${EP[k].en}</i></button>`).join("")}
let io=null;
function observe(){
  if(RM)return;
  io&&io.disconnect();
  io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add("in");io.unobserve(x.target)}}),{threshold:.08});
  document.querySelectorAll(".card:not(.in)").forEach(c=>io.observe(c));
}
function renderNorton(ep){
  const n=NORTON_GUIDE&&NORTON_GUIDE[ep];
  if(!n)return "";
  const lis=arr=>(arr||[]).map(x=>`<li>${x}</li>`).join("");
  return `<section class="norton">
    <div class="nhead"><div class="ntag">NORTON PERIOD HISTORY</div>
      <h3>${n.cn}</h3><div class="nmeta">${n.book}<br>${n.period}<br>${n.path}</div>
      <p class="nthesis"><b>核心判断 · THESIS</b>${n.thesis}</p></div>
    <div class="nbody"><div class="ncols">
      <div><h4>FOCUS · 史学重心</h4><ul>${lis(n.focus)}</ul></div>
      <div><h4>PROBLEMATA · 阅读问题</h4><ul>${lis(n.questions)}</ul></div>
      <div class="nroute"><h4>ROUTE · 断代线索</h4>${(n.route||[]).map(x=>`<span>${x}</span>`).join("")}<p class="mapnote">${n.cite}</p></div>
    </div></div></section>`;
}
/* 时代右栏配画（公有领域传世名作，与篇首画各异；均标注出处） */

function renderChapterRail(ep,e){
  const events=(e.events||[]).slice(0,3);
  const topics=(e.subs||[]).slice(0,6);
  const sideArt=ART2[ep];
  const hasExtension=Boolean(sideArt&&sideArt.extension);
  return `<div class="eprail">
    <blockquote class="quote">「${e.quote}」<small>—— ${e.qs}</small></blockquote>
    ${sideArt?`<figure class="artfig${hasExtension?" artfig--extended":""}">
      <div class="artstage${hasExtension?" artstage--extended":" artstage--matte"}">
        ${hasExtension?`<img class="art-extension" loading="lazy" decoding="async" src="${sideArt.extension}" alt="" aria-hidden="true">`:""}
        <div class="art-original-frame"><img class="art-original" loading="lazy" decoding="async" src="${sideArt.u}" alt="${sideArt.title}"></div>
      </div>
      <figcaption><b>${sideArt.title}</b>　${sideArt.artist}，${sideArt.year}${sideArt.c?`<br>${sideArt.c}`:""}${hasExtension?`<br><span class="art-provenance">原作保持完整比例，未裁切、未改绘；外围为 AI 生成展示背景，不属于历史作品。</span>`:""}</figcaption>
    </figure>`:""}
    <section class="eprail-card"><span class="eprail-kicker">CHAPTER ROUTE · 本章路线</span><h3>${e.zh}的时间坐标</h3><ul class="eprail-list">${events.map(v=>`<li><b>${v[0]}</b><span>${v[1]}</span></li>`).join("")}</ul><p class="eprail-more">前三个节点 · 完整大事记见下方</p></section>
    <section class="eprail-card eprail-note"><span class="eprail-kicker">KEYWORDS · 阅读关键词</span><p class="eprail-keywords">${topics.map(x=>`<span class="term-chip">${x}</span>`).join("")}</p></section>
    <p class="eprail-more">主题词用于定位下方的史学争鸣与音乐家名录。</p>
  </div>`;
}
function renderAlm(){
  const e=EP[curEp];
  const ms=M.filter(m=>m.e===curEp).sort((a,b)=>yrs(a)[0]-yrs(b)[0]);
  const art=ART[curEp];
  const deb=(SCHOL[curEp]&&SCHOL[curEp].debates)||[];
  $("#v-alm").innerHTML=`
  ${art?`<div class="hero" style="background-image:url('${art.u}')"><div class="heropan" style="background-image:url('${art.u}')"></div>
    <div class="heroinner"><div class="span">${e.span}</div>
      <div class="herolat">${e.en}</div><h2>${e.zh}</h2></div>
    <div class="artcredit">底图 — 《${art.title}》 ${art.artist}，${art.year}</div></div>`:""}
  <div class="ephead">
    <div class="epcopy">
      <div class="theme">本章视觉主题 — <b>${e.theme}</b>${art&&art.note?`；篇首画 — ${art.note}`:""}</div>
      ${EPCITE[curEp]?`<div class="theme">本章文献 — ${EPCITE[curEp]}</div>`:""}
      ${renderChapterIntro(e)}
    </div>
    ${renderChapterRail(curEp,e)}
  </div>
  ${renderNorton(curEp)}
  <div class="motif ${curEp}"></div>
  <h3 class="rub">CHRONICA · 时代大事记</h3>
  <div class="events">${e.events.map(v=>`<div><b>${v[0]}</b><span>${v[1]}</span></div>`).join("")}</div>
  ${deb.length?`<h3 class="rub">CONTROVERSIAE · 史学争鸣（先看观点，按需展开论据）</h3>
  <div class="debates">${deb.map((d,i)=>`<details class="debate"><summary><span class="debate-kicker">观点 ${String(i+1).padStart(2,"0")}</span><h4>${d.t}</h4><p class="debate-summary">${debateSummary(d.b)}</p><span class="debate-more">展开论据与参考文献</span></summary><div class="debate-body"><p>${d.b}</p><span class="ref">${d.ref||""}</span></div></details>`).join("")}</div>`:""}
  <h3 class="rub">MUSICI · 音乐家名录（${ms.length}人 · 按生年为序 · 点击开传）</h3>
  <div class="grid">${ms.map(m=>`
    <article class="card" data-m="${m.i}" tabindex="0" role="button" aria-label="${m.n}">
      ${m.b?'<span class="badge">◈ 重点</span>':""}${pic(m,172)}
      <div class="cbody"><h4>${m.n}</h4><div class="orig">${m.o}</div><div class="dts">${m.d}</div>
      <p>${(m.k||"").split("；")[0].split("：")[0]}</p>
      ${m.norton?`<span class="nortonmark">Norton note</span><span class="nortonbrief">${m.norton.split("；")[0].slice(0,82)}${m.norton.length>82?"…":""}</span>`:""}
      <span class="sch">${m.s}</span></div>
    </article>`).join("")}</div>`;
  observe();syncSelection();queueChronograph();
}

/* ══════════ 音乐学发展 · 数据 ══════════ */
const MUSIO_GRP={found:"前史与学科奠基",syst:"体系 · 分析 · 阐释",comp:"比较音乐学 → 民族音乐学",struct:"社会史 · 结构史 · 批判理论",new:"新音乐学 · 表演 · 全球转向",cn:"中国的西方音乐学接受"};
const MUSIO_FIG=[
{i:"bur",n:"查尔斯·伯尼",o:"Charles Burney",d:"1726–1814",nat:"英",grp:"found",k:"以周游列国的见闻写成四卷《音乐通史》(1776–89)，与霍金斯同名史书并峙，开启英语世界叙事式的音乐史书写。",w:["《音乐通史》(1776–1789)","《法意音乐见闻录》"],bio:"英国管风琴师、音乐史家。1770–72年两度游历欧陆,遍访拉莫、格鲁克、C.P.E.巴赫、帕多瓦的塔尔蒂尼与博洛尼亚的马蒂尼神父,把见闻写成生动的《法意音乐见闻录》,再据以完成四卷《音乐通史》(1776–89)。他以旅行者与鉴赏家的眼光叙述音乐,与霍金斯枯燥的编年史相映成趣;其女范妮·伯尼是著名小说家。雷诺兹为他所绘的肖像,是十八世纪音乐文化的名片。",c:["伦敦"]},
{i:"fork",n:"福克尔",o:"Johann Nikolaus Forkel",d:"1749–1818",nat:"德",grp:"found",k:"哥廷根大学音乐总监；《音乐通史》(1788–1801,未竟)是德语世界最早的体系性音乐史，《巴赫传》(1802)开作曲家传记研究之先——被尊为'音乐史学之父'。",w:["《约翰·塞巴斯蒂安·巴赫传》(1802)","《音乐通史》(1788–1801)"],bio:"哥廷根大学音乐总监,德语音乐学的奠基者。其《音乐通史》(1788–1801)虽未竟,却是最早以体系眼光统摄的音乐史;1802年的《巴赫传》第一次为一位作曲家立传,并以近乎宣言的笔调呼吁德意志民族珍视巴赫这份'民族遗产'。他被后世尊为'音乐史学之父'。"},
{i:"feti",n:"费蒂斯",o:"François-Joseph Fétis",d:"1784–1871",nat:"比",grp:"found",k:"八卷《音乐家通用传记》奠定传记辞书体例；提出调性(tonalité)的历史演化说，是最早以理论框架统摄音乐史者。",w:["《音乐家通用传记》(1835–44)","《音乐通史》"],bio:"比利时音乐学家、布鲁塞尔音乐学院院长、《音乐评论报》创办人。八卷《音乐家通用传记》奠定了传记辞书的体例;他更提出调性(tonalité)是历史地演化的,以'调性阶段说'把纷繁的音乐史纳入一个理论框架,是最早以系统理论统摄音乐史者。",c:["巴黎"]},
{i:"chry",n:"克里桑德",o:"Friedrich Chrysander",d:"1826–1901",nat:"德",grp:"found",k:"独力编订亨德尔全集，以来源批判(Quellenkritik)确立现代学术校勘版的标准；1885年与施皮塔、阿德勒共创《音乐学季刊》。",w:["《亨德尔全集》","《音乐学季刊》(创办)"],bio:"德国音乐学家,现代校勘版的立法者。独力编订《亨德尔全集》,以来源批判(Quellenkritik)确立学术乐谱的标准;1885年与施皮塔、阿德勒共同创办《音乐学季刊》,为学科提供了第一份专业阵地。",c:["汉堡"]},
{i:"spit",n:"施皮塔",o:"Philipp Spitta",d:"1841–1894",nat:"德",grp:"found",k:"两卷《巴赫传》(1873–80)以档案考据重建作曲家生平与作品谱系，实证音乐学的丰碑。",w:["《约翰·塞巴斯蒂安·巴赫》(1873–1880)"],bio:"德国音乐史家。两卷《约翰·塞巴斯蒂安·巴赫》(1873–80)以档案考据重建作曲家的生平、作品谱系与时代语境,是实证音乐学的丰碑,至今仍是巴赫研究的起点。他与克里桑德、阿德勒共创《音乐学季刊》。",c:["柏林"]},
{i:"adle",n:"圭多·阿德勒",o:"Guido Adler",d:"1855–1941",nat:"奥",grp:"found",k:"1885年《音乐学的范围、方法与目标》为学科立宪，划分'历史的'与'体系的'两大分支；主编《奥地利音乐史文献》(DTÖ)，风格史(Stilgeschichte)方法的旗手。",w:["《音乐学的范围、方法与目标》(1885)","《音乐史中的风格》(1911)"],bio:"维也纳学派的组织者,现代音乐学的'立法者'。1885年《音乐学的范围、方法与目标》一文为学科划界,分出'历史的'与'体系的'两大支;他主编《奥地利音乐纪念碑》大型史料丛刊,以风格批判(Stilkritik)把音乐史写成风格的演化史。",c:["维也纳"]},
{i:"riem",n:"胡戈·里曼",o:"Hugo Riemann",d:"1849–1919",nat:"德",grp:"syst",k:"功能和声理论与节奏句法理论的建立者，皇皇《音乐辞典》与多卷《音乐史手册》使体系音乐学蔚为大观。",w:["《音乐辞典》(1882起)","《和声学简明教程》","《音乐史手册》"],bio:"多产的体系音乐学家。以功能和声理论(主—下属—属)为和声学立法,提出终止式与乐句对称的节奏理论,编纂影响深远的《音乐词典》。其体系化的雄心塑造了德语音乐理论的面貌——虽多有争议,却是绕不开的坐标。",c:["莱比锡"]},
{i:"kret",n:"克雷奇马尔",o:"Hermann Kretzschmar",d:"1848–1924",nat:"德",grp:"syst",k:"倡'音乐解释学'(musikalische Hermeneutik)，主张由音乐把握其情感与观念内容，阐释学派之先声。",w:["《音乐会指南》","《音乐解释学新动议》(1902)"],bio:"'音乐诠释学'(Hermeneutik)的倡导者。主张音乐分析不应止于形式,而要追问其情感内容与表现;以《音乐会导赏》普及交响与声乐名作,把听众的理解纳入学术视野,是体系与历史之间的桥梁。",c:["莱比锡"]},
{i:"sche",n:"申克",o:"Heinrich Schenker",d:"1868–1935",nat:"奥",grp:"syst",k:"创申克分析法，以基本结构(Ursatz)与层级简化揭示调性作品的有机统一，深刻塑造英美音乐理论。",w:["《自由作曲》(1935)","《和声学》","《对位法》"],bio:"维也纳理论家,以'申克分析'重塑了对调性音乐的理解。他认为一切杰作都是一个基本结构(Ursatz)的层层展开,以分层图表(Schichten)揭示表层音符背后的深层线条与和声骨架。其方法虽带精英主义色彩,却成为英美理论教学的支柱。",c:["维也纳"]},
{i:"stum",n:"施图姆普夫",o:"Carl Stumpf",d:"1848–1936",nat:"德",grp:"comp",k:"《音乐心理学》(Tonpsychologie)开音乐认知研究，创柏林音响档案馆，比较音乐学的奠基者之一。",w:["《音乐心理学》(1883–90)","《音乐的起源》(1911)"],bio:"柏林的哲学家、心理学家,音乐心理学与比较音乐学的开创者。创办柏林音响档案馆(Phonogramm-Archiv),以蜡筒录音采集世界各地的音乐;其《音乐心理学》研究协和感的知觉基础,把音乐带入实验科学的视野。",c:["柏林"]},
{i:"horn",n:"霍恩博斯特尔",o:"Erich M. von Hornbostel",d:"1877–1935",nat:"奥",grp:"comp",k:"柏林比较音乐学派领袖，与萨克斯共创'霍恩博斯特尔–萨克斯'乐器分类法(1914)，以录音研究非欧音乐——现代民族音乐学之源。",w:["《乐器分类》(1914,与C.Sachs)","柏林音响档案馆研究"],bio:"柏林比较音乐学派的核心。与萨克斯合订沿用至今的乐器分类法(Hornbostel–Sachs),主持柏林音响档案馆,以录音与测音研究非欧洲音乐的音律与结构。他把'音乐'的概念从欧洲扩展到全人类,是民族音乐学的直接前身;犹太身份使他在1933年后被迫流亡。",c:["柏林","纽约"]},
{i:"bess",n:"贝塞勒",o:"Heinrich Besseler",d:"1900–1969",nat:"德",grp:"struct",k:"提出'应用音乐/呈现音乐'(Umgangs-/Darbietungsmusik)之辨，把音乐的社会存在方式引入史学；中世纪与巴赫研究大家。",w:["《中世纪与文艺复兴的音乐》(1931)","《巴赫时代的听》"],bio:"德国中世纪与文艺复兴音乐的权威。提出音乐'听赏方式'(Musikhören)的历史类型、区分'礼仪音乐'与'表现音乐',以社会与功能的眼光重写早期音乐史。其学术因与纳粹时期的纠葛而复杂,却深刻影响了达尔豪斯一代。",c:["莱比锡"]},
{i:"dahl",n:"卡尔·达尔豪斯",o:"Carl Dahlhaus",d:"1928–1989",nat:"德",grp:"struct",k:"二十世纪最具影响的音乐史学家：《音乐史学原理》辨结构史与事件史，《十九世纪音乐》以'双重文化'重写断代，《绝对音乐的理念》解构美学范畴——为'音乐史何以可能'提供系统回答。",w:["《音乐史学原理》(1977)","《十九世纪音乐》(1980)","《绝对音乐的理念》(1978)"],b:1,bio:"二十世纪下半叶最具影响力的音乐学家。以《音乐史学基础》反思学科方法,以《十九世纪音乐》《绝对音乐的观念》《和声调性之生成》重写浪漫主义与调性的历史;他把结构史学与观念史引入音乐学,主张音乐史是'问题的历史'而非'大师的序列'。",c:["柏林"]},
{i:"kerm",n:"约瑟夫·克尔曼",o:"Joseph Kerman",d:"1924–2014",nat:"美",grp:"new",k:"1985年《沉思音乐》(英版名 Musicology)痛陈实证主义之弊、召唤'作为批评的音乐学'——公认新音乐学的引爆点。",w:["《作为戏剧的歌剧》(1956)","《沉思音乐》(1985)"],b:1,bio:"美国音乐学家,'新音乐学'的引信。1985年《沉思音乐:面对音乐学的挑战》批评实证主义音乐学回避批评与阐释,呼吁一门敢于价值判断、与文学批评对话的学科;他本人以《作为戏剧的歌剧》示范了这种批评性。",c:["旧金山"]},
{i:"trei",n:"特赖特勒",o:"Leo Treitler",d:"1931–生",nat:"美",grp:"new",k:"以口传理论重审格里高利圣咏的成文性，并反省音乐史的书写方式本身。",w:["《音乐与历史想象》(1989)"],bio:"美国中世纪音乐与史学理论家。研究格里高利圣咏中口传与记谱的关系,并以一系列尖锐的方法论文章追问'音乐史如何书写'——历史、文本与阐释三者的纠缠。",c:["纽约"]},
{i:"mccl",n:"苏珊·麦克拉蕊",o:"Susan McClary",d:"1946–生",nat:"美",grp:"new",k:"《阴性终止》(1991)以性别与身体政治读解音乐结构，女性主义音乐学的旗帜。",w:["《阴性终止：音乐、性别与性》(1991)","《传统的约束》"],bio:"'新音乐学'的旗手,把性别、身体与社会意义引入音乐分析。1991年《阴性终止》论证连调性与曲式都携带性别与权力的编码,引发激烈争论,永久改变了音乐学所能谈论的对象。",c:["洛杉矶"]},
{i:"tom",n:"加里·汤姆林森",o:"Gary Tomlinson",d:"1951–生",nat:"美",grp:"new",k:"以福柯式知识考古与人类学写《文艺复兴魔法中的音乐》，把'他者'与文化史引入研究。",w:["《文艺复兴魔法中的音乐》(1993)","《歌剧的隐喻》"],bio:"美国音乐学家,把新历史主义与人类学引入音乐研究。以《文艺复兴魔法中的音乐》重构音乐的文化语境,晚近更以《音乐性的一千年》追问人类音乐能力的深层演化史。",c:["费城"]},
{i:"taru",n:"塔鲁斯金",o:"Richard Taruskin",d:"1945–2022",nat:"美",grp:"new",k:"五卷《牛津西方音乐史》以一人之力重写通史，力主'接受者创造历史'，破除风格自律与本真演奏的神话。",w:["《牛津西方音乐史》(2005)","《文本与行动》(1995)"],b:1,bio:"当代最博学也最好辩的音乐学家。五卷《牛津西方音乐史》以'谁为谁而写、为何而写'的社会史眼光重述整部西方音乐;他对斯特拉文斯基八声性的研究、对'本真表演'与音乐民族主义的批判,重塑了几代人的问题意识。",c:["纽约"]}];
const MUSIO_CNFIG=[
{i:"wgj",n:"王光祈",o:"Wang Guangqi",d:"1892–1936",k:"五四之子、留学柏林师从比较音乐学派；《东西乐制之研究》《中国音乐史》以比较方法奠定中国现代音乐学。",w:["《东西乐制之研究》(1926)","《中国音乐史》(1934)"],bio:"中国比较音乐学的先驱。留学柏林,受霍恩博斯特尔一派影响,以《东西乐制之研究》《中国音乐史》把中国乐律纳入世界音乐的比较框架,主张以音乐'谐和民族感情'。",c:["柏林"]},
{i:"xym",n:"萧友梅",o:"Xiao Youmei",d:"1884–1940",k:"留德获莱比锡博士，1927年创办国立音乐院(上海音专)，建制化地把西方音乐学与专业教育引入中国。",w:["《普通乐学》","创办国立音专(1927)"],bio:"中国专业音乐教育的奠基者。莱比锡音乐学博士,1927年创办国立音乐院(上海音乐学院前身),把德奥的音乐学与作曲教学建制引入中国。",c:["莱比锡"]},
{i:"yry",n:"于润洋",o:"Yu Runyang",d:"1932–2015",k:"中央音乐学院一代宗师，以现象学与马克思主义治音乐美学，倡'音乐学分析'(技术—美学—历史—文化四位一体)，主编《西方音乐通史》。",w:["《音乐美学史学论稿》","《西方音乐通史》(主编)","《悲情肖邦》"],b:1,bio:"中国音乐美学与'音乐学分析'的代表。以《音乐美学史学论稿》与《歌剧〈特里斯坦与伊索尔德〉前奏曲与终曲的音乐学分析》确立了融形式分析与历史—美学阐释于一体的方法,深刻影响了当代中国的西方音乐研究。"},
{i:"yyd",n:"杨燕迪",o:"Yang Yandi",d:"1963–生",k:"当代西方音乐史与音乐学译介的领军者，推动达尔豪斯、克尔曼等的引入与音乐批评学建设。",w:["音乐学译介与批评论著","《乐声悠扬》"],bio:"中国当代音乐学家、音乐批评家。以对西方音乐经典的阐释、音乐学方法论的引介与活跃的音乐批评写作,推动中国的西方音乐研究与国际学界对话。"}];



/* ══════════ 深读人名互链 ══════════ */
/* 别名索引：全名 + "·"后的简称；歧义者（多人共享，如"巴赫""施特劳斯"）不入索引 */
const XALIAS={};
(function(){
  const cnt={};
  const add=(nm,id)=>{if(!nm||nm.length<2)return;(cnt[nm]=cnt[nm]||new Set()).add(id)};
  M.forEach(m=>{add(m.n,m.i);const seg=m.n.split("·").pop();if(seg!==m.n)add(seg,m.i)});
  for(const nm in cnt){if(cnt[nm].size===1)XALIAS[nm]=[...cnt[nm]][0]}
})();
const XNAMES=Object.keys(XALIAS).sort((a,b)=>b.length-a.length);
const XRE=XNAMES.length?new RegExp(XNAMES.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g"):null;
function xlink(txt,selfId){
  if(!txt||!XRE)return txt;
  return txt.replace(XRE,nm=>{const id=XALIAS[nm];
    return (id&&id!==selfId)?`<span class="xlink" data-m="${id}">${nm}</span>`:nm});
}
/* 传记导航序：全体按生年 */
const NAVORDER=[...M].sort((a,b)=>yrs(a)[0]-yrs(b)[0]).map(m=>m.i);

/* ══════════ URL 锚点 ══════════ */
function setHash(h){try{history.replaceState(null,"",h?("#"+h):location.pathname+location.search)}catch(e){}}
function readHash(){
  const h=decodeURIComponent(location.hash.replace(/^#/,""));
  if(!h)return;
  if(h.startsWith("m=")){const id=h.slice(2);if(byId[id])openM(id,"URL 直达");return}
  if(h.startsWith("v=")){const v=h.slice(2);const b=document.querySelector(`#views button[data-v="${v}"]`);if(b)b.click();return}
}

/* ══════════ 人物选择与右侧详情 ══════════ */
let selectedId=null,selectedSource="",selectedCity=null,selectionToastTimer=0;
function relationIds(id){
  const out=new Set();
  L.forEach(l=>{if(l[0]===id)out.add(l[1]);else if(l[1]===id)out.add(l[0])});
  return out;
}
function announceSelection(m,rels,source){
  const toast=$("#selection-toast");if(!toast)return;
  toast.innerHTML=`已选中 <b>${m.n}</b> · ${m.d} · ${rels.length} 条人物关系${source?` · 来源：${source}`:""}`;
  toast.classList.add("show");clearTimeout(selectionToastTimer);
  selectionToastTimer=setTimeout(()=>toast.classList.remove("show"),3000);
}
function syncSelection(){
  const rel=selectedId?relationIds(selectedId):new Set();
  document.querySelectorAll("[data-m]").forEach(el=>{
    el.classList.toggle("is-selected",!!selectedId&&el.dataset.m===selectedId);
    el.classList.toggle("is-related",!!selectedId&&el.dataset.m!==selectedId&&rel.has(el.dataset.m));
  });
  if(net2d)net2d.applyFilter();
  if(net3d&&typeof apply3DSelection==="function")apply3DSelection();
}
function clearSelection(){selectedId=null;selectedSource="";syncSelection()}
function focusTimeline(id){
  const box=$("#tlbox"),bar=box&&box.querySelector(`.tlbar[data-m="${id}"]`);if(!box||!bar)return;
  const x=+bar.getAttribute("x"),y=+bar.getAttribute("y");
  box.scrollTo({left:Math.max(0,x-box.clientWidth*.38),top:Math.max(0,y-box.clientHeight*.42),behavior:RM?"auto":"smooth"});
}
function locateMusician(id,target){
  const m=byId[id];if(!m)return;
  selectedId=id;
  if(target==="map"){
    mapFilter="all";mapYear=null;routeOf=id;selectedCity=(m.c||[]).find(c=>CITY[c])||null;fitRoute(id);
    setView("map");renderChips();renderMap();syncMapUI();if(selectedCity)cityPanel(selectedCity);
  }else if(target==="tl"){
    setView("tl");syncSelection();requestAnimationFrame(()=>focusTimeline(id));
  }else if(target==="net"){
    netFilter="all";setView("net");netLegend();$("#tog2d").click();
    Promise.resolve(init2D()).then(()=>{syncSelection();net2d?.focus?.(id)});
  }
  announceSelection(m,L.filter(l=>l[0]===id||l[1]===id),`详情面板 → ${target==="map"?"舆图":target==="tl"?"年表":"星丛"}`);
}
function openM(id,source="年鉴名录",opts={}){
  const m=byId[id];if(!m)return;
  const restoreScroll=Number.isFinite(Number(opts.restoreScroll))?Number(opts.restoreScroll):null;
  const rels=L.filter(l=>l[0]===id||l[1]===id);
  const rel=rels.map(l=>{const o=byId[l[0]===id?l[1]:l[0]];if(!o)return"";
    return `<li><b>${l[2]}</b> · <a data-m="${o.i}">${o.n}</a><br><small style="color:var(--mut)">${l[3]||""}</small></li>`}).join("");
  const cs=(m.c||[]).filter(c=>CITY[c]);
  const p=PORTRAITS[m.i];
  const ni=NAVORDER.indexOf(id);
  selectedId=id;selectedSource=source;
  $("#dwrap").innerHTML=`
  <div class="dhead">
    <div><span class="selection-kicker"><i></i>已选中音乐家</span><h4 id="detail-title">${m.n}</h4><div class="orig">${m.o}</div>
    <div class="meta">${m.d} · ${EP[m.e].zh} · ${m.s}</div><div class="selection-reason">由“${source}”定位；关联人物与路径已同步高亮。</div></div>
    <div class="dnav"><button id="dprev" title="上一位（←）">‹ 前</button><button id="dnext" title="下一位（→）">后 ›</button></div>
    <button class="dclose" id="dx" aria-label="关闭详情">✕</button></div>
  <div class="quickfacts"><div><span>时间</span><b>${m.d}</b></div><div><span>地点</span><b>${cs.slice(0,2).join(" · ")||"资料未记"}</b></div><div><span>身份 / 流派</span><b>${m.s||EP[m.e].zh}</b></div></div>
  <div class="detail-actions"><button class="detail-action" data-locate="map" ${cs.length?"":"disabled"}>在地图中定位</button><button class="detail-action" data-locate="tl">在年表中定位</button><button class="detail-action" data-locate="net">在星图中定位</button></div>
  <div class="dcols"><div>
    ${p?`<figure class="pfig"><img loading="lazy" decoding="async" src="${p.u}" alt="${m.n}肖像"><figcaption>${p.c}</figcaption></figure>`:med(m,84)}
    ${m.bio?`<h5>简介 · 生平</h5><p class="biop">${xlink(m.bio,id)}</p>`:""}
    <h5>贡献 / 术语</h5><p>${xlink(m.k,id)}</p>
    <h5>声音与风格</h5><p>${xlink(m.t,id)}</p>
    <h5>代表作品</h5><ul class="works">${(m.w||[]).map(w=>`<li>${w}</li>`).join("")||"<li>资料待补</li>"}</ul>
    ${m.norton?`<details class="detail-expand"><summary>诺顿断代史札记</summary><div class="nortoncard"><p>${xlink(m.norton,id)}</p></div></details>`:""}
    ${m.deep?`<details class="detail-expand"><summary>展开深读</summary><div><p>${xlink(m.deep,id)}</p></div></details>`:""}
    <p class="imslp"><a href="https://imslp.org/index.php?title=Special:Search&search=${encodeURIComponent((m.o||m.n).replace(/[()]/g,""))}&fulltext=Search" target="_blank" rel="noopener">🎼 IMSLP · 检索公版乐谱与录音 ↗</a></p>
    ${m.nsrc?`<p class="nortonline">诺顿断代史定位 — ${m.nsrc}</p>`:""}
    ${m.cite?`<p class="citeline">文献定位 — ${m.cite}</p>`:""}
    <h5>活动轨迹 · ${cs.join(" → ")||"—"}</h5>
    ${cs.length?`<div class="routebox">${miniMap(cs)}</div>`:""}
    <h5>相关人物与关系（${rels.length}）</h5><ul class="conn">${rel||"<li>暂无已编关系</li>"}</ul>
  </div></div>${renderPersonWorks(m)}`;
  const dg=$("#dlg");
  if(dg.open&&!(["musician","work","version","fontes","performance"].includes(dg.dataset.kind)))dg.close();
  delete dg.dataset.work;delete dg.dataset.personScroll;delete dg.dataset.workScroll;
  dg.dataset.ep=m.e;dg.dataset.kind="musician";dg.dataset.m=id;dg.dataset.source=source;dg.setAttribute("aria-labelledby","detail-title");
  if(!dg.open)dg.show();
  setHash("m="+id);syncSelection();announceSelection(m,rels,source);
  $("#dx").onclick=()=>dg.close();
  $("#dprev").onclick=()=>openM(NAVORDER[(ni-1+NAVORDER.length)%NAVORDER.length],"前一位");
  $("#dnext").onclick=()=>openM(NAVORDER[(ni+1)%NAVORDER.length],"后一位");
  $("#dwrap").querySelectorAll("[data-m]").forEach(a=>a.onclick=()=>openM(a.dataset.m,"相关人物"));
  $("#dwrap").querySelectorAll("[data-locate]").forEach(b=>b.onclick=()=>locateMusician(id,b.dataset.locate));
  $("#dwrap").querySelectorAll("[data-work-open]").forEach(b=>b.onclick=()=>openWorkArchive(b.dataset.workOpen));
  if(restoreScroll!=null)requestAnimationFrame(()=>{const wrap=$("#dwrap");if(wrap)wrap.scrollTop=restoreScroll});
}

/* ══════════ 投影与海岸 ══════════ */
const MW=1840,MH=1460;
/* 经度变换:欧洲(≥-11°)原样;大西洋(-66°~-11°)压缩;美洲(≤-66°)整体东移——把美国拉到欧洲近旁,免得隔着半个大洋 */
const LONX=lon=>lon>=-11?lon:(lon<=-66?lon+40:-26+(lon+66)/55*15);
const PX=(lon,lat)=>[(LONX(lon)+11)*34+30,(66-lat)*44+20];
function pstr(pts){return "M"+pts.map(p=>{const q=PX(p[0],p[1]);return q[0].toFixed(0)+" "+q[1].toFixed(0)}).join("L")+"Z"}
const LANDPATH=COASTP.map(poly=>`<path class="land" d="${pstr(poly)}"/>`).join("");
/* 北美大陆(粗略轮廓,供流亡作曲家的跨洋轨迹落点) */

const US_LANDPATH=`<path class="land" d="${pstr(US_COAST)}"/>`;
function fitRoute(id){const m=byId[id];if(!m)return;const cs=(m.c||[]).filter(c=>CITY[c]);if(cs.length<2)return;
  const xs=cs.map(c=>PX(CITY[c][0],CITY[c][1]));
  const minx=Math.min(...xs.map(p=>p[0])),maxx=Math.max(...xs.map(p=>p[0])),miny=Math.min(...xs.map(p=>p[1])),maxy=Math.max(...xs.map(p=>p[1]));
  const padX=(maxx-minx)*0.16+150,padY=(maxy-miny)*0.16+150;let w=(maxx-minx)+2*padX,hh=(maxy-miny)+2*padY;
  const asp=MW/MH;if(w/hh<asp)w=hh*asp;else hh=w/asp;
  vb={x:(minx+maxx)/2-w/2,y:(miny+maxy)/2-hh/2,w,h:hh};}
const lstr=pts=>"M"+pts.map(p=>{const q=PX(p[0],p[1]);return q[0].toFixed(0)+" "+q[1].toFixed(0)}).join("L");
const BORDERPATH=(BORDERS.lines||[]).map(l=>`<path class="border" d="${lstr(l)}"/>`).join("");
const RIVERPATH=(RIVERS.lines||[]).map(l=>`<path class="river" d="${lstr(l)}"/>`).join("");


/* ══════════ 舆图 ══════════ */
let mapFilter="all",routeOf=null,vb={x:0,y:0,w:MW,h:MH},mapReady=false;
function cityList(){
  const idx={};
  M.forEach(m=>{if(mapFilter!=="all"&&m.e!==mapFilter)return;
    if(mapYear!=null){const y=yrs(m);const b=Math.max(y[0]+12,y[0]);if(!(b<=mapYear&&mapYear<=y[1]))return;}
    (m.c||[]).forEach(c=>{if(!CITY[c])return;(idx[c]=idx[c]||[]).push(m)})});
  if(mapFilter==="all"&&mapYear==null){(typeof MUSIO_CNFIG!=="undefined"?MUSIO_FIG.concat(MUSIO_CNFIG):MUSIO_FIG).forEach(f=>{(f.c||[]).forEach(c=>{if(!CITY[c])return;(idx[c]=idx[c]||[]).push(f)})});}
  return idx}
/* ══════ 舆图增强 · 时间轴 / 重心 / 迁徙流向 / 朝圣地 ══════ */
let mapYear=null,mapFlows=false,mapPil=false,mapPlay=null,mapBounds=null;

function ymSpan(){if(mapBounds)return mapBounds;let lo=9999,hi=-9999;M.forEach(m=>{const y=yrs(m);if(y[0]<lo)lo=y[0];if(y[1]>hi)hi=y[1]});lo=Math.floor(lo/10)*10;hi=Math.ceil(hi/10)*10;return mapBounds=[lo,hi]}
function ymLabel(y){return y<0?"前"+(-y)+"年":y+"年"}
function mapFlowLayer(){
  if(!mapFlows)return"";
  const sc=vb.w/MW,agg={};
  M.forEach(m=>{if(mapFilter!=="all"&&m.e!==mapFilter)return;const cs=(m.c||[]).filter(c=>CITY[c]);for(let i=0;i<cs.length-1;i++){if(cs[i]===cs[i+1])continue;const k=cs[i]+"|"+cs[i+1];agg[k]=(agg[k]||0)+1}});
  const keys=Object.keys(agg);if(!keys.length)return"";
  const max=Math.max.apply(null,keys.map(k=>agg[k]));
  return`<g class="flows">`+keys.map(k=>{const kk=k.split("|"),p=PX(CITY[kk[0]][0],CITY[kk[0]][1]),q=PX(CITY[kk[1]][0],CITY[kk[1]][1]);
    const dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1,bend=Math.min(len*.16,130);
    const cx=(p[0]+q[0])/2 - dy/len*bend,cy=(p[1]+q[1])/2 + dx/len*bend;
    const w=(1+3.4*Math.sqrt(agg[k]/max))*sc;
    return`<path class="flow" d="M${p[0].toFixed(0)} ${p[1].toFixed(0)}Q${cx.toFixed(0)} ${cy.toFixed(0)} ${q[0].toFixed(0)} ${q[1].toFixed(0)}" style="stroke-width:${w.toFixed(2)}"/>`}).join("")+`</g>`}
function mapTopLayer(){
  const sc=vb.w/MW;let out="";
  if(mapPil){out+=`<g class="pilg">`+Object.keys(PILGRIM).filter(c=>CITY[c]).map(c=>{const q=PX(CITY[c][0],CITY[c][1]);
    return`<circle class="pilr" cx="${q[0].toFixed(0)}" cy="${q[1].toFixed(0)}" r="${(15*sc).toFixed(1)}" style="stroke-width:${(1.7*sc).toFixed(2)}"/><text class="pilstar" x="${q[0].toFixed(0)}" y="${(q[1]-17*sc).toFixed(1)}" style="font-size:${(15*sc).toFixed(1)}px">✦</text>`}).join("")+`</g>`}
  if(mapYear!=null){const idx=cityList();let sx=0,sy=0,n=0;
    Object.keys(idx).forEach(c=>{const w=idx[c].length,q=PX(CITY[c][0],CITY[c][1]);sx+=q[0]*w;sy+=q[1]*w;n+=w});
    if(n){const cx=sx/n,cy=sy/n,r=11*sc;
      out+=`<g class="cent"><circle class="centhalo" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(27*sc).toFixed(1)}"/><path class="centd" d="M${cx.toFixed(0)} ${(cy-r).toFixed(1)}L${(cx+r).toFixed(1)} ${cy.toFixed(0)}L${cx.toFixed(0)} ${(cy+r).toFixed(1)}L${(cx-r).toFixed(1)} ${cy.toFixed(0)}Z"/><text class="centlab" x="${cx.toFixed(0)}" y="${(cy-31*sc).toFixed(1)}" style="font-size:${(15*sc).toFixed(1)}px">重心 · ${ymLabel(mapYear)}</text></g>`}}
  return out}
function syncMapUI(){
  const sp=ymSpan(),sl=$("#myear"),lab=$("#mylab"),off=$("#mtloff"),fl=$("#mflows"),pi=$("#mpil");
  if(!sl)return;
  sl.min=sp[0];sl.max=sp[1];
  if(mapYear==null){lab.textContent="全时段";off.hidden=true;$("#mplay").textContent="▶"}
  else{sl.value=mapYear;lab.textContent=ymLabel(mapYear);off.hidden=false}
  fl.classList.toggle("on",mapFlows);pi.classList.toggle("on",mapPil)}
function mapStop(){if(mapPlay){clearInterval(mapPlay);mapPlay=null;$("#mplay").textContent="▶"}}
function resetMap(global=false){
  mapStop();mapFilter="all";mapYear=null;routeOf=null;selectedCity=null;
  if(global)vb={x:0,y:0,w:MW,h:MH};
  renderChips();syncMapUI();renderMap();
}
function renderMapState(idx){
  const state=$("#mapstate"),count=Object.keys(idx).length;if(!state)return;
  if(!count){
    state.hidden=false;
    state.innerHTML=stateHTML("空结果 · EMPTY","当前条件下没有可显示的城市",`${mapYear!=null?ymLabel(mapYear)+"与":""}${mapFilter!=="all"?EP[mapFilter].zh+"筛选":"筛选条件"}没有命中驻留记录。可清除筛选或返回全局视图。`,`<button class="state-action" data-map-reset>清除筛选</button><button class="state-action" data-map-global>返回全局视图</button>`);
  }else if(routeOf&&byId[routeOf]){
    state.hidden=false;
    state.innerHTML=stateHTML("联动路径 · ROUTE",`正在显示：${byId[routeOf].n}`,`舆图已按其活动城市取景，并以序号标出行迹。共 ${new Set((byId[routeOf].c||[]).filter(c=>CITY[c])).size} 个地点。`,`<button class="state-action" data-map-clear-route>清除行迹</button><button class="state-action" data-map-global>返回全局视图</button>`);
  }else if(mapYear!=null){
    state.hidden=false;
    state.innerHTML=stateHTML("时间切片 · SLICE",ymLabel(mapYear),`显示这一年仍在世且已有地点记录的音乐家；地图菱形标出加权活动重心。`,`<button class="state-action" data-map-reset>清除时间筛选</button>`);
  }else state.hidden=true;
  state.querySelectorAll("[data-map-reset]").forEach(b=>b.onclick=()=>resetMap(false));
  state.querySelectorAll("[data-map-global]").forEach(b=>b.onclick=()=>resetMap(true));
  state.querySelectorAll("[data-map-clear-route]").forEach(b=>b.onclick=()=>{routeOf=null;selectedCity=null;renderChips();renderMap()});
}
function mapUI(){
  const sp=ymSpan(),sl=$("#myear");
  syncMapUI();
  sl.oninput=()=>{mapStop();mapYear=+sl.value;syncMapUI();renderMap()};
  $("#mtloff").onclick=()=>{mapStop();mapYear=null;syncMapUI();renderMap()};
  $("#mflows").onclick=()=>{mapFlows=!mapFlows;syncMapUI();renderMap()};
  $("#mpil").onclick=()=>{mapPil=!mapPil;syncMapUI();renderMap()};
  $("#mplay").onclick=()=>{
    if(mapPlay){mapStop();return}
    if(mapYear==null||mapYear>=sp[1])mapYear=sp[0];
    const step=Math.max(1,Math.round((sp[1]-sp[0])/280));
    $("#mplay").textContent="⏸";
    mapPlay=setInterval(()=>{mapYear+=step;if(mapYear>=sp[1]){mapYear=sp[1];syncMapUI();renderMap();mapStop();return}syncMapUI();renderMap()},70)}}
function initMapView(){
  renderChips();mapUI();
  if(mapReady){renderMap();return}
  $("#mapstate").hidden=false;$("#mapstate").innerHTML=stateHTML("轻量初始化 · MAP","正在绘制音乐舆图","海岸、城市与迁徙层将在下一帧合成，页面导航仍可立即使用。");
  $("#mapbox").innerHTML=`<div class="viz-loading"><div class="viz-skeleton"><div class="viz-skeleton-orbit" aria-hidden="true"></div><p>正在铺陈海陆与城市坐标……</p></div></div>`;
  requestAnimationFrame(()=>{mapReady=true;renderMap();syncSelection()});
}
function renderMap(){
  const idx=cityList(),sc=vb.w/MW;
  renderMapState(idx);
  let dots="",labs="",route="";
  const routeCities=new Set(routeOf&&byId[routeOf]?(byId[routeOf].c||[]).filter(c=>CITY[c]):[]);
  if(routeOf&&byId[routeOf]){
    const cl=[...routeCities];
    const ps=cl.map(c=>PX(CITY[c][0],CITY[c][1]));
    if(ps.length>1)route=`<path class="route" style="stroke-width:${(2.8*sc).toFixed(2)}" d="M${ps.map(p=>p.map(v=>v.toFixed(0)).join(" ")).join("L")}"/>`;
    route+=cl.map((c,j)=>{const[x,y]=PX(CITY[c][0],CITY[c][1]);
      return `<circle class="stopc" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(11*sc).toFixed(1)}" style="stroke-width:${(1.8*sc).toFixed(2)}"/><text class="stopt" x="${x.toFixed(0)}" y="${(y+4.2*sc).toFixed(1)}" style="font-size:${(12*sc).toFixed(1)}px">${j+1}</text>`}).join("");
  }
  /* 标签防碰撞：按重要度排序，贪心放置，四方向退让，放不下则略去 */
  const zoomed=vb.w<MW*.6,zoomed2=vb.w<MW*.34;
  const fs=13.5*sc,placed=[];
  const ents=Object.keys(idx).map(c=>({c,n:idx[c].length,p:PX(CITY[c][0],CITY[c][1])}))
    .sort((a,b)=>(routeCities.has(b.c)-routeCities.has(a.c))||(b.n-a.n));
  for(const e of ents){const n=e.n,[x,y]=e.p;
    dots+=`<circle class="cityd${selectedCity===e.c?" is-selected-city":""}" data-c="${e.c}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${((4+Math.min(n,9)*1.7)*sc).toFixed(1)}" style="stroke-width:${(1.4*sc).toFixed(2)}"><title>${e.c} · ${n}人</title></circle>`;
    const want=routeCities.has(e.c)||zoomed2||(zoomed&&n>=2)||n>=4||["雅典","卑尔根","圣彼得堡","那不勒斯","拜罗伊特","莫斯科"].includes(e.c);
    if(!want)continue;
    const w=e.c.length*fs*1.08+6*sc,h=fs*1.4;
    const cand=[[x+10*sc,y+4.5*sc],[x-w-10*sc,y+4.5*sc],[x+2*sc,y-11*sc],[x+2*sc,y+19*sc]];
    let pos=null;
    for(const[cx,cy]of cand){const bx={x:cx,y:cy-h*.8,w,h};
      if(!placed.some(b=>bx.x<b.x+b.w&&bx.x+bx.w>b.x&&bx.y<b.y+b.h&&bx.y+bx.h>b.y)){placed.push(bx);pos=[cx,cy];break}}
    if(!pos)continue;
    labs+=`<text class="citylab${selectedCity===e.c?" is-selected-city":""}" data-c="${e.c}" x="${pos[0].toFixed(0)}" y="${pos[1].toFixed(0)}" style="font-size:${fs.toFixed(1)}px;stroke-width:${(3.2*sc).toFixed(1)};${routeCities.has(e.c)?'font-weight:700;':''}">${e.c}</text>`}
  $("#mapbox").innerHTML=`
  <div class="mapbtns"><button id="mzi" aria-label="放大">＋</button><button id="mzo" aria-label="缩小">－</button><button id="mzr" aria-label="复位">⟲</button><button id="mzus" aria-label="跳往美洲" title="美洲(流亡作曲家的新大陆)">🌎</button></div>
  <svg id="msvg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" role="img" aria-label="欧洲音乐地理">
   <rect class="sea" x="-4300" y="-300" width="6700" height="${MH+900}"/>
   ${[25,30,35,40,45,50,55,60,65].map(la=>`<path class="grat" d="M-4300 ${PX(0,la)[1].toFixed(0)}H${MW}"/>`).join("")}
   ${[-120,-110,-100,-90,-80,-70,-10,0,10,20,30,40].map(lo=>`<path class="grat" d="M${PX(lo,50)[0].toFixed(0)} -300V2000"/>`).join("")}
   ${LANDPATH}${US_LANDPATH}
   <g style="stroke-width:${(1.7*sc).toFixed(2)}">${RIVERPATH}</g>
   <g style="stroke-width:${(1.1*sc).toFixed(2)}">${BORDERPATH}</g>
   <g>${REGIONS.map(r=>{const q=PX(r[1],r[2]);return `<text class="region" x="${q[0].toFixed(0)}" y="${q[1].toFixed(0)}" text-anchor="middle" style="font-size:${(21*sc).toFixed(1)}px;letter-spacing:${(6*sc).toFixed(1)}px">${r[0]}</text>`}).join("")}</g>
   <g>${(RIVERS.names||[]).map(r=>{const q=PX(r.x,r.y);return `<text class="rivlab" x="${q[0].toFixed(0)}" y="${q[1].toFixed(0)}" style="font-size:${(12.5*sc).toFixed(1)}px;stroke-width:${(2.6*sc).toFixed(1)}">${r.n}</text>`}).join("")}</g>
   <text x="${MW-460}" y="${MH-40}" font-family="Palatino Linotype,serif" font-style="italic" font-size="34" fill="#8A7F58">EVROPA · MARE MVSICAE</text>
   ${route}${mapFlowLayer()}${dots}${labs}${mapTopLayer()}</svg>`;
  const svg=$("#msvg");
  svg.querySelectorAll("[data-c]").forEach(el=>el.addEventListener("click",ev=>{if(!panMoved)cityPanel(el.dataset.c)}));
  bindPan(svg);
}
let panMoved=false;
function bindPan(svg){
  let pd=null;
  svg.addEventListener("pointerdown",e=>{pd={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y,id:e.pointerId,cap:false};panMoved=false});
  svg.addEventListener("pointermove",e=>{if(!pd)return;const r=svg.getBoundingClientRect();
    const dx=(e.clientX-pd.x)*vb.w/r.width,dy=(e.clientY-pd.y)*vb.h/r.height;
    if(Math.abs(e.clientX-pd.x)+Math.abs(e.clientY-pd.y)>4){panMoved=true;if(!pd.cap){pd.cap=true;svg.classList.add("panning");try{svg.setPointerCapture(pd.id)}catch(_){}}}
    if(panMoved){vb.x=pd.vx-dx;vb.y=pd.vy-dy;svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`)}});
  const up=()=>{pd=null;svg.classList.remove("panning");if(panMoved)renderMap()};
  svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",up);
  svg.addEventListener("wheel",e=>{e.preventDefault();zoomAt(e,e.deltaY>0?1.22:0.82)},{passive:false});
  $("#mzi").onclick=()=>{zoomC(.78)};$("#mzo").onclick=()=>{zoomC(1.28)};
  $("#mzr").onclick=()=>{vb={x:0,y:0,w:MW,h:MH};renderMap()};
  $("#mzus").onclick=()=>{vb={x:-2680,y:640,w:2200,h:1746};renderMap()};
}
function zoomAt(e,f){
  const svg=$("#msvg"),r=svg.getBoundingClientRect();
  const px=vb.x+(e.clientX-r.left)/r.width*vb.w, py=vb.y+(e.clientY-r.top)/r.height*vb.h;
  vb.w*=f;vb.h*=f;vb.w=Math.max(180,Math.min(vb.w,MW*1.4));vb.h=vb.w*MH/MW;
  vb.x=px-(px-vb.x)*f;vb.y=py-(py-vb.y)*f;renderMap();
}
function zoomC(f){const c={clientX:0,clientY:0};const svg=$("#msvg"),r=svg.getBoundingClientRect();c.clientX=r.left+r.width/2;c.clientY=r.top+r.height/2;zoomAt(c,f)}
/* 城市专题:代表建筑照片(CC/公有领域,注明作者与许可)+ 音乐史小传 */

CITYINFO["克罗梅日什"]={
  imgs:[
    {img:"kromeriz",landmark:"克罗梅日什大主教宫",cr:"Txllxt TxllxT · CC BY-SA 4.0"},
    {img:"kromeriz2",landmark:"花园（Květná zahrada）柱廊",cr:"Radosław Botev · CC BY 3.0 pl"},
    {img:"kromeriz3",landmark:"圣莫里茨教堂与议会广场",cr:"Sylwia Botev · CC BY 3.0 pl"}
  ],
  hist:"克罗梅日什的城市记忆以奥洛穆茨历任主教营建的大主教宫与花园为核心，二者于1998年列入世界遗产；圣莫里茨教堂则保留了这座主教城市的中世纪宗教建筑层次。比贝尔在1660年代供职于奥洛穆茨主教的克罗梅日什宫廷，今当地音乐档案保存着他的早期作品手稿。"
};
CITYINFO["帕多瓦"]={
  imgs:[
    {img:"padua",landmark:"帕多瓦河谷草地广场（Prato della Valle）",cr:"Didier Descouens"},
    {img:"padua2",landmark:"圣儒斯蒂娜圣殿（Basilica di Santa Giustina）",cr:"Didier Descouens"},
    {img:"padua3",landmark:"理性宫（Palazzo della Ragione）",cr:"Didier Descouens"}
  ],
  hist:"帕多瓦是威尼托的大学与教会之城；奇科尼亚约1401年起在大教堂任职，晚期作品与乐理论在此汇聚法国新艺术与意大利十四世纪传统。"
};
function cityGallery(c,info){
  const arr=info.imgs||[{img:info.img,landmark:info.landmark,cr:info.cr,medium:info.medium}];
  if(!arr[0]||!arr[0].img)return"";
  const multi=arr.length>1;
  const slides=arr.map((a,i)=>`<figure class="cityfig cityslide${i===0?" on":""}" data-i="${i}"><img loading="lazy" decoding="async" src="assets/city/${a.img}.jpg?${IMGV}" alt="${c} · ${a.landmark||""}"><figcaption><b>${a.landmark||c}</b> · ${a.medium||"摄影"} ${a.cr}</figcaption></figure>`).join("");
  return `<div class="citygal" data-n="${arr.length}" data-cur="0">${slides}${multi?`<span class="galcount">1 / ${arr.length}</span><button class="galnav galprev" aria-label="上一张">‹</button><button class="galnav galnext" aria-label="下一张">›</button><div class="galdots">${arr.map((a,i)=>`<span class="galdot${i===0?" on":""}" data-i="${i}"></span>`).join("")}</div>`:""}</div>`;
}
function bindGallery(){
  const gal=$("#mappanel").querySelector(".citygal");if(!gal)return;
  const n=+gal.dataset.n;if(n<2)return;
  const show=k=>{k=(k%n+n)%n;gal.dataset.cur=k;
    gal.querySelectorAll(".cityslide").forEach(s=>s.classList.toggle("on",+s.dataset.i===k));
    gal.querySelectorAll(".galdot").forEach(s=>s.classList.toggle("on",+s.dataset.i===k));
    const cc=gal.querySelector(".galcount");if(cc)cc.textContent=(k+1)+" / "+n;};
  const p=gal.querySelector(".galprev"),nx=gal.querySelector(".galnext");
  if(p)p.onclick=()=>show(+gal.dataset.cur-1);
  if(nx)nx.onclick=()=>show(+gal.dataset.cur+1);
  gal.querySelectorAll(".galdot").forEach(d=>d.onclick=()=>show(+d.dataset.i));
  let sx=null;
  gal.addEventListener("touchstart",e=>{sx=e.touches[0].clientX},{passive:true});
  gal.addEventListener("touchend",e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40)show(+gal.dataset.cur+(dx<0?1:-1));sx=null},{passive:true});
}
function cityPanel(c){
  const idx=cityList(),ms=(idx[c]||[]).sort((a,b)=>yrs(a)[0]-yrs(b)[0]);
  const info=CITYINFO[c];
  selectedCity=c;
  document.querySelectorAll("#msvg [data-c]").forEach(el=>el.classList.toggle("is-selected-city",el.dataset.c===c));
  $("#mappanel").innerHTML=`<h4>${c}</h4><div style="font:11px var(--sans);letter-spacing:.15em;color:var(--mut)">${CITY[c][1].toFixed(1)}°N · ${CITY[c][0].toFixed(1)}°E</div>
  ${info?cityGallery(c,info):""}
  ${PILGRIM[c]?`<div class="pilbadge">✦ 音乐朝圣地</div>`:""}
  ${info?`<div class="cityhist">${info.hist}</div>`:(PILGRIM[c]?`<div class="lore" style="border-left-color:var(--gold,#B98A2E)">${PILGRIM[c]}</div>`:"")}
  ${!info&&CITY[c][2]?`<div class="lore">${CITY[c][2]}</div>`:""}
  <ul>${ms.map(m=>{return !byId[m.i]?`<li><a data-mf="${m.i}">${m.n}</a> <span style="color:var(--mut);font-size:11px">${m.d}</span><small style="color:var(--acc)">音乐学家</small></li>`:`<li><a data-m="${m.i}">${m.n}</a> <span style="color:var(--mut);font-size:11px">${m.d}</span><small>${m.s} · <a data-r="${m.i}" style="color:#8E2C3B">绘其行迹 →</a></small></li>`;}).join("")||"<li>此筛选条件下暂无驻留者；可在上方清除筛选。</li>"}</ul>`;
  $("#mappanel").querySelectorAll("a[data-m]").forEach(a=>a.onclick=()=>openM(a.dataset.m,"音乐舆图"));
  $("#mappanel").querySelectorAll("a[data-mf]").forEach(a=>a.onclick=()=>openMusioFig(a.dataset.mf));
  $("#mappanel").querySelectorAll("a[data-r]").forEach(a=>a.onclick=()=>{routeOf=a.dataset.r;selectedId=routeOf;fitRoute(routeOf);renderChips();renderMap();syncSelection();announceSelection(byId[routeOf],L.filter(l=>l[0]===routeOf||l[1]===routeOf),"音乐舆图 · 绘其行迹")});
  bindGallery();
  if(window.innerWidth<=920)$("#mappanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderChips(){
  $("#mapchips").innerHTML=`<button class="chip ${mapFilter==="all"?"on":""}" data-f="all">全部时代</button>`+
   EPK.map(k=>`<button class="chip ${mapFilter===k?"on":""}" data-f="${k}">${EP[k].zh}</button>`).join("")+
   (routeOf?`<button class="chip" data-f="__clr">✕ 清除行迹（${byId[routeOf]?.n||""}）</button>`:"");
  $("#mapchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{
    if(b.dataset.f==="__clr"){routeOf=null;selectedCity=null}else{mapFilter=b.dataset.f;routeOf=null;selectedCity=null;if(typeof mapStop==="function"){mapStop();mapYear=null}}
    renderChips();renderMap();if(typeof syncMapUI==="function")syncMapUI()});
}
function miniMap(cs){
  const ps=cs.map(c=>PX(CITY[c][0],CITY[c][1]));
  const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);
  let cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  let w=Math.max(560,(Math.max(...xs)-Math.min(...xs))*2.2),h=w*0.72;
  let x0=Math.max(-100,Math.min(cx-w/2,MW-w+100)),y0=Math.max(-100,Math.min(cy-h/2,MH-h+100));
  const sc=w/MW*2.2;
  const line=ps.length>1?`<path class="route" style="stroke-width:${(w/220).toFixed(1)}" d="M${ps.map(p=>p.join(" ")).join("L")}"/>`:"";
  return `<svg viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}"><rect class="sea" x="-200" y="-200" width="${MW+400}" height="${MH+400}"/>${LANDPATH}${line}
  ${ps.map((p,j)=>`<circle class="cityd" cx="${p[0]}" cy="${p[1]}" r="${(w/70).toFixed(1)}"/><text x="${(p[0]+w/50).toFixed(0)}" y="${(p[1]+w/110).toFixed(0)}" font-size="${(w/28).toFixed(0)}" font-family="serif" fill="#4A422A" paint-order="stroke" stroke="#EDE6CE" stroke-width="${(w/160).toFixed(1)}">${cs[j]}</text>`).join("")}</svg>`}

/* ══════════ 年表 ══════════ */
const EPC={greek:"#C8722A",medieval:"#1F3A93",ren:"#8C3B2E",baroque:"#C9A227",classical:"#3F5F93",romantic:"#8A5A78",modern:"#D23B22"};
const SEG=[[-700,600,.115],[600,1400,.42],[1400,2030,.92]];
function tx(y){let x=52;for(const[a,b,k]of SEG){if(y<=a)break;x+=(Math.min(y,b)-a)*k}return x}
let tlDone=false;
function renderTL(){
  if(tlDone){syncSelection();return}tlDone=true;
  const rows=[...M].sort((a,b)=>yrs(a)[0]-yrs(b)[0]);
  const lanes=[];
  rows.forEach(m=>{const[b,d]=yrs(m);const lw=m.n.length*14+16;
    let li=lanes.findIndex(v=>v<tx(b)-6);
    if(li<0){li=lanes.length;lanes.push(0)}
    m._lane=li;lanes[li]=tx(d)+lw});
  const H=lanes.length*23+74,W=tx(2030)+230;
  const bands={greek:[-700,500],medieval:[500,1400],ren:[1400,1600],baroque:[1600,1750],classical:[1730,1815],romantic:[1815,1900],modern:[1890,2010]};
  let g="";
  for(const k in bands){const[a,b]=bands[k];
    g+=`<rect x="${tx(a).toFixed(0)}" y="0" width="${(tx(b)-tx(a)).toFixed(0)}" height="${H}" fill="${EPC[k]}" opacity=".07"/>
    <text x="${(tx(a)+6).toFixed(0)}" y="17" font-size="11.5" letter-spacing="2" fill="${EPC[k]}" font-family="Segoe UI,sans-serif" font-weight="700">${EP[k].zh}</text>`}
  const ticks=[-600,-400,-200,0,200,400,600,800,1000,1100,1200,1300,1400,1500,1600,1650,1700,1750,1800,1850,1900,1950,2000];
  ticks.forEach(y=>{g+=`<line x1="${tx(y).toFixed(0)}" y1="26" x2="${tx(y).toFixed(0)}" y2="${H-18}" stroke="#C6BA92" stroke-width=".6" stroke-dasharray="2 5"/>
    <text x="${tx(y).toFixed(0)}" y="${H-4}" font-size="10" fill="#77704F" text-anchor="middle" font-family="Segoe UI,sans-serif">${y<0?"前"+(-y):y}</text>`});
  let bars="";
  rows.forEach(m=>{const[b,d]=yrs(m);const y=m._lane*23+40,x1=tx(b),x2=Math.max(tx(d),x1+7);
    bars+=`<rect class="tlbar" data-m="${m.i}" x="${x1.toFixed(0)}" y="${y}" width="${(x2-x1).toFixed(0)}" height="12" rx="6" fill="${EPC[m.e]}" ${m.b?'stroke="#35301F" stroke-width="1.2"':""} opacity=".92"/>
    <text class="tlname" data-m="${m.i}" x="${(x2+6).toFixed(0)}" y="${y+10.5}" font-size="12" fill="#35301F">${m.n}</text>`});
  $("#tlbox").innerHTML=`<svg width="${W}" height="${H}" role="img" aria-label="音乐家生命年表">${g}${bars}</svg>`;
  const tip=$("#tltip");
  $("#tlbox").querySelectorAll("[data-m]").forEach(el=>{
    el.addEventListener("click",()=>openM(el.dataset.m,"生命年表"));
    el.addEventListener("mousemove",e=>{const m=byId[el.dataset.m];
      tip.style.display="block";tip.style.left=(e.clientX+16)+"px";tip.style.top=(e.clientY+14)+"px";
      tip.innerHTML=`<b>${m.n}</b> ${m.d}<br>${m.s}`});
    el.addEventListener("mouseleave",()=>tip.style.display="none");
  });
  syncSelection();
}

/* ══════════ 星丛 ══════════ */
const RELC={"师承":"#A8842C","影响":"#5B7DA8","对峙":"#A2453A","知交":"#5F7E5B","亲缘":"#7B5A78","其他":"#8A8272"};
function relCat(t){
  if(/师|徒|学统|衣钵|教父/.test(t))return"师承";
  if(/对峙|竞争|论战|戏仿/.test(t))return"对峙";
  if(/父子|翁婿|夫妇|亲缘/.test(t))return"亲缘";
  if(/知交|同盟|交游|同侪|师友|庇护|提携|举荐|资助|景仰|朝圣|私淑/.test(t))return"知交";
  return"影响"}
let net2d=null,net3d=null,netFilter="all";
function netData(){
  const deg={};L.forEach(l=>{deg[l[0]]=(deg[l[0]]||0)+1;deg[l[1]]=(deg[l[1]]||0)+1});
  const nodes=M.map(m=>({id:m.i,m,deg:deg[m.i]||0}));
  const links=L.filter(l=>byId[l[0]]&&byId[l[1]]).map(l=>({source:l[0],target:l[1],cat:relCat(l[2]),t:l[2],note:l[3]||""}));
  return{nodes,links};
}
function netLegend(){
  $("#netleg").innerHTML=EPK.map(k=>`<span><i style="background:${EPC[k]}"></i>${EP[k].zh}</span>`).join("")+
    Object.entries(RELC).filter(([k])=>k!=="其他").map(([k,c])=>`<span><s style="border-color:${c}"></s>${k}</span>`).join("")+
    `<span><i style="background:none;border:1.4px solid #35301F"></i>重点条目</span>`;
  $("#netchips").innerHTML=`<button class="chip ${netFilter==="all"?"on":""}" data-f="all">全部</button>`+
    EPK.map(k=>`<button class="chip ${netFilter===k?"on":""}" data-f="${k}">${EP[k].zh}</button>`).join("");
  $("#netchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{
    netFilter=b.dataset.f;netLegend();
    if(net2d)net2d.applyFilter();
    if(net3d)apply3DSelection();
  });
}
const VIZ_ASSETS={d3:"assets/js/d3.v7.9.0.min.js",graph3d:"assets/js/3d-force-graph-1.80.0.min.js"};
const vizLoads={};let net2dLoading=null,net3dLoading=null;
function loadVizScript(key,test){
  if(test())return Promise.resolve();
  if(vizLoads[key])return vizLoads[key];
  vizLoads[key]=new Promise((resolve,reject)=>{
    const s=document.createElement("script");s.src=VIZ_ASSETS[key];s.async=true;s.dataset.viz=key;
    s.onload=()=>{if(test())resolve();else{delete vizLoads[key];reject(new Error(`${key} 已下载但未成功初始化`))}};
    s.onerror=()=>{delete vizLoads[key];reject(new Error(`${key} 资源加载失败`))};
    document.head.appendChild(s);
  });
  return vizLoads[key];
}
function setNetState(html){const state=$("#netstate");state.hidden=!html;if(html)state.innerHTML=html}
function netSkeleton(label){return `<div class="viz-loading"><div class="viz-skeleton"><div class="viz-skeleton-orbit" aria-hidden="true"></div><p>${label}<br>图谱引擎仅在进入本视图时载入，首屏无需承担这部分开销。</p></div></div>`}
function renderNetFallback(message){
  const box=$("#netwrap2d"),rank=netData().nodes.sort((a,b)=>b.deg-a.deg).slice(0,12);
  box.innerHTML=`<div class="empty-state"><b>图谱暂未就绪</b><p>${message}。你仍可从关系度最高的人物继续阅读；也可以重试平面模式。</p><div class="state-actions" style="justify-content:center"><button class="state-action" data-net-retry>重试平面星图</button></div><div class="chips" style="justify-content:center">${rank.map(n=>`<button class="chip" data-m="${n.id}">${n.m.n} · ${n.deg}</button>`).join("")}</div></div>`;
  box.querySelector("[data-net-retry]")?.addEventListener("click",()=>{net2dLoading=null;init2D()});
  box.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>openM(b.dataset.m,"星图降级名录"));
}
async function init2D(){
  if(net2d)return net2d;
  if(net2dLoading)return net2dLoading;
  const box=$("#netwrap2d");box.innerHTML=netSkeleton("正在布置平面星图……");
  setNetState(stateHTML("按需载入 · LAZY","正在载入平面图谱引擎","完成后将自动显示节点；此过程不会阻塞年鉴正文。"));
  net2dLoading=loadVizScript("d3",()=>typeof d3!=="undefined").then(()=>{
    box.innerHTML="";build2D();setNetState("");return net2d;
  }).catch(err=>{
    console.warn("2D graph init failed",err);setNetState(stateHTML("降级模式 · FALLBACK","平面图谱没有成功载入","已保留可点击的人物名录；可重试，或继续使用地图、年表与师承谱系。",`<button class="state-action" data-net-retry-state>重试平面模式</button>`));
    renderNetFallback(err.message);$("#netstate [data-net-retry-state]")?.addEventListener("click",()=>{net2dLoading=null;init2D()});return null;
  }).finally(()=>{if(!net2d)net2dLoading=null});
  return net2dLoading;
}
function build2D(){
  const box=$("#netwrap2d");
  const W=Math.max(box.clientWidth,900),H=740;
  const {nodes,links}=netData();
  const rr=d=>9+Math.min(d.deg,12)*1.5;
  const svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  const defs=svg.append("defs");
  const portraitNodes=new Set(nodes.filter(n=>PORTRAITS[n.id]&&(n.m.b||n.deg>=5)).map(n=>n.id));
  nodes.forEach(n=>{if(portraitNodes.has(n.id)){
    const p=defs.append("pattern").attr("id","pt-"+n.id).attr("width",1).attr("height",1).attr("patternContentUnits","objectBoundingBox");
    p.append("image").attr("href",PORTRAITS[n.id].u).attr("width",1).attr("height",1).attr("preserveAspectRatio","xMidYMin slice")}});
  const root=svg.append("g");
  const lk=root.append("g").selectAll("path").data(links).join("path")
    .attr("fill","none").attr("stroke",d=>RELC[d.cat]).attr("stroke-width",1.1).attr("opacity",.42);
  const nd=root.append("g").selectAll("g").data(nodes).join("g").attr("class","n2node").attr("data-m",d=>d.id).style("cursor","pointer");
  nd.append("circle").attr("r",rr)
    .attr("fill",d=>portraitNodes.has(d.id)?`url(#pt-${d.id})`:EPC[d.m.e])
    .attr("stroke",d=>EPC[d.m.e]).attr("stroke-width",d=>d.m.b?3.2:1.8);
  nd.append("text").attr("class","n2lab").attr("y",d=>rr(d)+14).attr("text-anchor","middle")
    .attr("font-size",12.5).attr("font-weight",d=>d.m.b?700:400)
    .text(d=>d.m.n).attr("display",d=>(d.deg>=6||d.m.b)?null:"none");
  const sim=d3.forceSimulation(nodes).alphaDecay(.065)
    .force("link",d3.forceLink(links).id(d=>d.id).distance(84).strength(.45))
    .force("charge",d3.forceManyBody().strength(-260))
    .force("center",d3.forceCenter(W/2,H/2))
    .force("collide",d3.forceCollide().radius(d=>rr(d)+10))
    .force("x",d3.forceX(W/2).strength(.045)).force("y",d3.forceY(H/2).strength(.075));
  const draw=()=>{
    lk.attr("d",d=>{const sx=d.source.x,sy=d.source.y,ex=d.target.x,ey=d.target.y;
      return `M${sx},${sy}Q${(sx+ex)/2+(sy-ey)*.13},${(sy+ey)/2+(ex-sx)*.13} ${ex},${ey}`});
    nd.attr("transform",d=>`translate(${d.x},${d.y})`)};
  sim.stop();for(let i=0;i<90;i++)sim.tick();draw();sim.on("tick",draw).alpha(.18).restart();
  /* 初始自动取景 */
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const bx0=Math.min(...xs)-46,bx1=Math.max(...xs)+46,by0=Math.min(...ys)-46,by1=Math.max(...ys)+46;
  const k=Math.min(W/(bx1-bx0),H/(by1-by0),1.5);
  const zm=d3.zoom().scaleExtent([.3,4.5]).on("zoom",e=>root.attr("transform",e.transform));
  svg.call(zm).call(zm.transform,d3.zoomIdentity.translate((W-k*(bx0+bx1))/2,(H-k*(by0+by1))/2).scale(k));
  nd.call(d3.drag()
    .on("start",(e,d)=>{if(!e.active)sim.alphaTarget(.22).restart();d.fx=d.x;d.fy=d.y})
    .on("drag",(e,d)=>{d.fx=e.x;d.fy=e.y})
    .on("end",(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));
  const tip=$("#tltip");
  const vis=d=>netFilter==="all"||d.m.e===netFilter;
  function applyFilter(){
    const rel=selectedId?relationIds(selectedId):new Set();
    nd.classed("is-selected",d=>d.id===selectedId).classed("is-related",d=>!!selectedId&&rel.has(d.id));
    nd.attr("opacity",d=>!vis(d)?.08:!selectedId?1:(d.id===selectedId||rel.has(d.id)?1:.1));
    lk.attr("opacity",l=>{const ok=vis(l.source)&&vis(l.target);if(!ok)return .035;if(!selectedId)return .42;return l.source.id===selectedId||l.target.id===selectedId?.96:.035})
      .attr("stroke-width",l=>selectedId&&(l.source.id===selectedId||l.target.id===selectedId)?2.8:1.1);
    nd.select("text").attr("display",d=>(vis(d)&&(d.deg>=6||d.m.b||d.id===selectedId||rel.has(d.id)))?null:"none");
  }
  nd.on("mouseenter",(e,d)=>{
    const nb=new Set();links.forEach(l=>{if(l.source.id===d.id)nb.add(l.target.id);if(l.target.id===d.id)nb.add(l.source.id)});
    nd.attr("opacity",o=>o.id===d.id||nb.has(o.id)?1:.13);
    lk.attr("opacity",l=>l.source.id===d.id||l.target.id===d.id?.95:.05)
      .attr("stroke-width",l=>l.source.id===d.id||l.target.id===d.id?2.2:1.1);
    nd.select("text").attr("display",o=>(o.id===d.id||nb.has(o.id)||o.deg>=6||o.m.b)?null:"none");
    const rl=links.filter(l=>l.source.id===d.id||l.target.id===d.id).slice(0,6)
      .map(l=>`${l.t}·${(l.source.id===d.id?l.target:l.source).m.n}`).join("；");
    tip.style.display="block";tip.innerHTML=`<b>${d.m.n}</b> ${d.m.d}<br>${rl}`})
  .on("mousemove",e=>{tip.style.left=(e.clientX+16)+"px";tip.style.top=(e.clientY+14)+"px"})
  .on("mouseleave",()=>{tip.style.display="none";applyFilter()})
  .on("click",(e,d)=>{if(!e.defaultPrevented)openM(d.id,"平面星图")});
  function focus(id){const d=nodes.find(n=>n.id===id);if(!d)return;const k=1.85,t=d3.zoomIdentity.translate(W/2-d.x*k,H/2-d.y*k).scale(k);svg.transition().duration(RM?0:420).call(zm.transform,t)}
  net2d={applyFilter,focus,sim};applyFilter();netLegend();syncSelection();
}
function apply3DSelection(){
  if(!net3d)return;
  const vis=d=>netFilter==="all"||d.m.e===netFilter,rel=selectedId?relationIds(selectedId):new Set();
  net3d.nodeColor(d=>!vis(d)?"#24242D":d.id===selectedId?"#F1D36B":selectedId&&!rel.has(d.id)?"#33343F":EPC[d.m.e])
    .linkVisibility(l=>{const s=l.source.id||l.source,t=l.target.id||l.target,ok=netFilter==="all"||((l.source.m?l.source.m.e:byId[s]?.e)===netFilter&&(l.target.m?l.target.m.e:byId[t]?.e)===netFilter);return ok&&(!selectedId||s===selectedId||t===selectedId)})
    .linkWidth(l=>{const s=l.source.id||l.source,t=l.target.id||l.target;return selectedId&&(s===selectedId||t===selectedId)?2.8:(l.cat==="师承"?1.35:.55)})
    .linkOpacity(selectedId ? .78 : .38);
}
async function init3D(){
  if(net3d)return true;
  if(net3dLoading)return net3dLoading;
  try{const probe=document.createElement("canvas");if(!probe.getContext("webgl2")&&!probe.getContext("webgl"))return false}catch(_){return false}
  setNetState(stateHTML("按需载入 · WEBGL","正在载入立体星丛","3D 引擎仅在你主动点击后下载；如设备不支持，将自动回到平面模式。"));
  net3dLoading=loadVizScript("graph3d",()=>typeof ForceGraph3D!=="undefined").then(()=>build3D()).catch(err=>{
    console.warn("3D init failed",err);net3d=null;return false;
  }).finally(()=>{net3dLoading=null});
  return net3dLoading;
}
function build3D(){
  try{
    const el=$("#net3d");
    el.innerHTML="<div class=\"hint3d\">拖拽旋转 · 滚轮缩放 · 点击节点打开详情</div>";
    const {nodes,links}=netData();
    const vis=d=>netFilter==="all"||d.m.e===netFilter;
    const graph=ForceGraph3D()(el)
      .width(el.clientWidth||1200).height(690)
      .backgroundColor("#0E0C14")
      .nodeVal(d=>2+Math.min(d.deg,12))
      .nodeColor(d=>vis(d)?EPC[d.m.e]:"#2A2A33")
      .nodeOpacity(.95)
      .nodeLabel(d=>`<div style="text-align:center;font-family:'Segoe UI','Microsoft YaHei',sans-serif;background:rgba(14,12,20,.94);padding:9px 12px;border:1px solid #6B5B36;border-radius:2px;max-width:210px">${PORTRAITS[d.id]?`<img loading="lazy" decoding="async" src="${PORTRAITS[d.id].u}" style="width:90px;display:block;margin:0 auto 6px" alt="">`:""}<b style="color:#E9D9A8;font-size:14px">${d.m.n}</b><br><span style="color:#C9BFA0;font-size:11.5px">${d.m.d} · ${d.m.s}</span></div>`)
      .linkColor(l=>RELC[l.cat]).linkOpacity(.4)
      .linkWidth(l=>l.cat==="师承"?1.5:.6)
      .linkVisibility(l=>netFilter==="all"||(l.source.m&&vis(l.source)&&vis(l.target)))
      .linkDirectionalParticles(l=>l.cat==="影响"||l.cat==="师承"?2:0)
      .linkDirectionalParticleWidth(1.7).linkDirectionalParticleSpeed(.0045)
      .onNodeClick(d=>openM(d.id,"立体星丛"));
    if(typeof graph.warmupTicks==="function")graph.warmupTicks(45);
    if(typeof graph.cooldownTicks==="function")graph.cooldownTicks(110);
    net3d=graph.graphData({nodes,links});apply3DSelection();setNetState("");
    return true;
  }catch(err){console.warn("3D init failed",err);net3d=null;return false}
}
$("#tog2d").onclick=()=>{$("#tog2d").classList.add("on");$("#tog3d").classList.remove("on");
  $("#net3d").style.display="none";$("#netwrap2d").style.display="block";net3d?.pauseAnimation?.();init2D()};
$("#tog3d").onclick=async()=>{
  const b=$("#tog3d");b.disabled=true;b.textContent="正在载入 3D…";
  $("#netwrap2d").style.display="none";$("#net3d").style.display="block";
  const ok=await init3D();b.disabled=false;b.textContent="立体星丛 · 3D";
  if(!ok){$("#net3d").style.display="none";$("#netwrap2d").style.display="block";$("#tog2d").classList.add("on");b.classList.remove("on");
    setNetState(stateHTML("性能降级 · FALLBACK","此设备未能启动 3D 模式","已自动返回平面星图；人物、关系和定位功能均可继续使用。",`<button class="state-action" data-net-back2d>使用平面星图</button>`));
    $("#netstate [data-net-back2d]")?.addEventListener("click",()=>{$("#tog2d").click();setNetState("")});await init2D();return}
  b.classList.add("on");$("#tog2d").classList.remove("on");net3d?.resumeAnimation?.();apply3DSelection()};

/* ══════════ 术语 GLOSSARIUM ══════════ */
let glFilter="all";
function renderGloss(){
  $("#glchips").innerHTML=`<button class="chip ${glFilter==="all"?"on":""}" data-f="all">全部（${GLOSS.length}）</button>`+
    EPK.map(k=>`<button class="chip ${glFilter===k?"on":""}" data-f="${k}">${EP[k].zh}</button>`).join("");
  $("#glchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{glFilter=b.dataset.f;renderGloss()});
  const gs=GLOSS.filter(g=>glFilter==="all"||g.ep===glFilter);
  $("#glgrid").innerHTML=gs.map(g=>`<div class="gcard" style="--gc:${EPC[g.ep]||"#8A8272"}">
    <span class="gep">${EP[g.ep]?EP[g.ep].zh:""}</span><h4>${g.term}</h4><span class="orig">${g.orig||""}</span>
    <p>${g.def}</p><span class="ref">${g.ref||""}</span></div>`).join("")||
    `<div class="empty-state"><b>这一时代暂无术语条目</b><p>这不是加载失败：当前筛选尚未收录对应概念。可以清除筛选，返回完整术语库。</p><button class="state-action" data-gl-reset>返回全部术语</button></div>`;
  $("#glgrid [data-gl-reset]")?.addEventListener("click",()=>{glFilter="all";renderGloss()});
}

/* ══════════ 师承谱系 STEMMA ══════════ */
function nodeFace(m){
  const p=PORTRAITS[m.i];
  return p?`<img loading="lazy" decoding="async" src="${p.u}" alt="${m.n}肖像">`:med(m,74);
}
let linFilter="all";
function renderLineage(){
  const trails=linFilter==="all"?LINEAGES:LINEAGES.filter(x=>x.id===linFilter);
  $("#linchips").innerHTML=`<button class="chip ${linFilter==="all"?"on":""}" data-l="all">总览（${LINEAGES.length}）</button>`+
    LINEAGES.map(x=>`<button class="chip ${linFilter===x.id?"on":""}" data-l="${x.id}">${x.t.replace(/[、—].*$/,"").replace(/^从/,"")}</button>`).join("");
  $("#linchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{linFilter=b.dataset.l;renderLineage()});
  $("#linwrap").innerHTML=trails.map(tr=>{
    const col=EPC[tr.ep];
    const ids=tr.nodes.filter(id=>byId[id]);
    let flow="";
    ids.forEach((id,i)=>{
      const m=byId[id];
      flow+=`<div class="linnode" data-m="${id}"><div class="lnpic">${nodeFace(m)}</div>
        <span class="lnname">${m.n}</span><span class="lndate">${m.d}</span></div>`;
      if(i<ids.length-1){
        const nx=ids[i+1],e=L.find(l=>(l[0]===id&&l[1]===nx)||(l[0]===nx&&l[1]===id));
        const rel=e?e[2]:"接续";
        flow+=`<div class="linconn"><span class="lcrel">${rel}</span><span class="lcarrow">▸</span></div>`;
      }
    });
    return `<div class="lintrail" style="--tc:${col}">
      <div class="linhead"><h4>${tr.t}</h4><p>${tr.m}</p></div>
      <div class="linflow">${flow}</div></div>`;
  }).join("");
  $("#linwrap").querySelectorAll(".linnode").forEach(n=>n.onclick=()=>openM(n.dataset.m,"师承谱系"));
  syncSelection();
}

/* ══════════ 史脉 HISTORIA ══════════ */
let histFilter="all";
function histFace(m){
  const p=PORTRAITS[m.i];
  return p?`<img loading="lazy" decoding="async" src="${p.u}" alt="">`:`<span class="hmini">${(m.o.match(/[A-ZÀ-Þ]/g)||["?"])[0]}</span>`;
}
function renderHist(){
  $("#histchips").innerHTML=`<button class="chip ${histFilter==="all"?"on":""}" data-h="all">全部（${HISTEVENTS.length}）</button>`+
    EPK.map(k=>`<button class="chip ${histFilter===k?"on":""}" data-h="${k}">${EP[k].zh}</button>`).join("");
  $("#histchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{histFilter=b.dataset.h;renderHist()});
  const evs=HISTEVENTS.filter(e=>histFilter==="all"||e.e===histFilter).sort((a,b)=>a.y-b.y);
  $("#histwrap").innerHTML=evs.map((ev,i)=>{
    const col=EPC[ev.e],side=i%2===0?"left":"right";
    const yl=ev.y<0?"前"+(-ev.y):(ev.y<1000?"公元"+ev.y:ev.y)+"";
    const mus=(ev.m||[]).filter(id=>byId[id]).map(id=>{const m=byId[id];
      return `<span class="hm" data-m="${id}">${histFace(m)}<span>${m.n}</span></span>`}).join("");
    const hasDeep=HISTDEEP[ev.y]||HISTDEEP[String(ev.y)];
    return `<div class="hevent ${side}" style="--ec:${col}">
      <div class="hdot"></div><div class="hyear">${yl}</div>
      <div class="hcard" data-y="${ev.y}">
        <div class="hmeta"><span class="hep">${EP[ev.e].zh}</span> · 📍 ${ev.l}</div>
        <h4>${ev.t}</h4><p>${ev.d}</p>
        ${mus?`<div class="hmus">${mus}</div>`:""}
        ${hasDeep?`<button class="hmore" data-y="${ev.y}">读前因后果 ▾</button>`:""}
      </div></div>`;
  }).join("");
  $("#histwrap").querySelectorAll(".hm").forEach(n=>n.onclick=e=>{e.stopPropagation();openM(n.dataset.m,"历史事件")});
  $("#histwrap").querySelectorAll(".hmore,.hcard").forEach(el=>el.onclick=e=>{
    if(e.target.closest(".hm"))return;
    const y=el.dataset.y;if(y&&(HISTDEEP[y]||HISTDEEP[+y]))openHist(+y)});
  syncSelection();
}
function openHist(y){
  const ev=HISTEVENTS.find(e=>e.y===y);if(!ev)return;
  const dp=HISTDEEP[y]||HISTDEEP[String(y)];if(!dp)return;
  const col=EPC[ev.e];
  const yl=ev.y<0?"公元前 "+(-ev.y):(ev.y<1000?"公元 "+ev.y:ev.y+" 年");
  const mus=(ev.m||[]).filter(id=>byId[id]).map(id=>{const m=byId[id];
    return `<span class="hm" data-m="${id}">${histFace(m)}<span>${m.n}</span></span>`}).join("");
  const seg=(cls,label,txt)=>txt?`<div class="hseg ${cls}"><h5>${label}</h5><p>${xlink(txt)}</p></div>`:"";
  $("#dwrap").innerHTML=`
  <div class="dhead" style="border-color:${col}">
    <div><div class="hdmeta" style="color:${col}">${EP[ev.e].zh} · ${yl} · 📍 ${ev.l}</div>
    <h4 style="margin-top:4px">${ev.t}</h4></div>
    <button class="dclose" id="dx" aria-label="关闭">✕</button></div>
  <div class="histdeep" style="--ec:${col}">
    <p class="hlead">${ev.d}</p>
    ${seg("back","前因 · 背景",dp.back)}
    ${seg("unfold","经过 · 关键",dp.unfold)}
    ${seg("after","后果 · 影响",dp.after)}
    ${seg("verdict","史学评价",dp.verdict)}
    ${mus?`<h5 class="hmustitle">牵涉音乐家</h5><div class="hmus">${mus}</div>`:""}
    ${dp.cite?`<p class="citeline">文献定位 — ${dp.cite}</p>`:""}
  </div>`;
  const dg=$("#dlg");if(dg.open)dg.close();dg.dataset.kind="history";dg.removeAttribute("aria-labelledby");dg.showModal();
  $("#dx").onclick=()=>dg.close();
  $("#dwrap").querySelectorAll("[data-m]").forEach(n=>n.onclick=()=>openM(n.dataset.m,"历史事件深读"));
}

/* ══════════ 音乐学发展 ══════════ */
/* 把工作流写的中国学者 note 折进基础数据，弹窗与卡片共用 */
((MUSIO_CN&&MUSIO_CN.figures)||[]).forEach(x=>{const f=MUSIO_CNFIG.find(y=>y.i===x.i);if(f&&x.note)f.note=x.note});
const MUSIO_BY=Object.fromEntries([...MUSIO_FIG,...MUSIO_CNFIG].map(f=>[f.i,f]));
function musioFace(f,sz){
  const p=PORTRAITS[f.i];
  return p?`<img loading="lazy" decoding="async" src="${p.u}" alt="${f.n}">`:med({i:f.i,o:f.o||f.n},sz||64);
}
let musioDone=false;
function renderMusio(){
  const w=MUSIO_WEST||{},cn=MUSIO_CN||{};
  const essay=(w.essay||"音乐学(Musikwissenschaft)作为一门独立学科，成形于十九世纪的德语世界：它把启蒙时代的音乐史书写、实证考据与美学思辨熔铸为系统的知识。1885年阿德勒为其立宪，划分'历史的'与'体系的'两支；此后一个世纪，它在实证、风格史、阐释与批评之间反复辩难，直至达尔豪斯的结构史学与克尔曼引发的'新音乐学'。").split(/\n\n+/);
  const concepts=w.concepts||[];
  const scopes=MUSIO_SCOPE||[];
  const cnEssay=(cn.essay||"二十世纪初，西方音乐学经由留学生传入中国：王光祈在柏林师从比较音乐学派，萧友梅以莱比锡的博士学位奠定专业音乐教育的建制。于润洋一代则在音乐美学与'音乐学分析'上确立了本土的方法自觉。").split(/\n\n+/);
  const cnFigs=MUSIO_CNFIG.map(f=>{const extra=(cn.figures||[]).find(x=>x.i===f.i);return {...f,note:extra&&extra.note}});
  const figCard=f=>`<div class="mfig" data-mf="${f.i}">
    <div class="mfpic">${musioFace(f,72)}</div>
    <div class="mfbody"><h4>${f.n}${f.b?' <span class="mstar">◈</span>':''}</h4><div class="mforig">${f.o}　${f.d}${f.nat?'　·　'+f.nat:''}</div>
    <p>${(f.k||"").split("；")[0].split("：")[0].slice(0,58)}…</p></div></div>`;
  let groups="";
  for(const g in MUSIO_GRP){if(g==="cn")continue;
    const fs=MUSIO_FIG.filter(f=>f.grp===g);if(!fs.length)continue;
    groups+=`<h3 class="rub mgrp">${MUSIO_GRP[g]}</h3><div class="mfgrid">${fs.map(figCard).join("")}</div>`;}
  $("#musiowrap").innerHTML=`
  <div class="musiohero"><div class="mhero-in"><div class="mlat">MUSICOLOGIA</div><h2>音乐学的历史脉络</h2>
    <div class="msub">从档案、作品与风格史，到批判、表演、声音研究与全球音乐史：一门学科如何不断重新发明自己的对象。</div>
    <div class="mheronote">ARS DOCUMENTORUM · HISTORIA STRUCTURARUM · CRITICA SONORUM</div></div></div>
  <div class="mintro">${essay.map(p=>`<p>${p}</p>`).join("")}</div>
  <div class="mthesis"><b>THEMA · 核心论断</b><p>${MUSIO_THESIS||""}</p></div>
  ${scopes.length?`<div class="mscope">${scopes.map(s=>`<div><b>${s[0]}</b><span>${s[1]}</span></div>`).join("")}</div>`:""}

  <h3 class="rub">EVOLUTIO · 演进脉络</h3>
  <div class="mturns">${MUSIO_TURN.map(t=>`<div class="mturn"><div class="mty">${t[0]}</div><div class="mtb"><b>${t[1]}</b><span>${t[2]}</span></div></div>`).join("")}</div>

  <h3 class="rub">SCHOLARES · 学派与学者（点击开传）</h3>
  ${groups}

  ${concepts.length?`<h3 class="rub">CONCEPTUS · 史学核心概念</h3>
  <div class="mconc">${concepts.map(c=>`<div class="mcard"><h4>${c.term}</h4><span class="orig">${c.orig||""}</span><p>${c.def}</p><span class="ref">${c.ref||""}</span></div>`).join("")}</div>`:""}

  <h3 class="rub">OPERA · 里程碑著作</h3>
  <div class="mtexts">${MUSIO_TEXT.map(t=>`<div class="mtext"><div class="mtyr">${t[2]}</div><div><b>${t[0]}</b>《${t[1]}》<span>${t[3]}</span></div></div>`).join("")}</div>

  <div class="mcn">
    <h3 class="rub">SINICA · 中国的西方音乐学接受</h3>
    <div class="mintro">${cnEssay.map(p=>`<p>${p}</p>`).join("")}</div>
    <div class="mfgrid">${cnFigs.map(f=>`<div class="mfig" data-mf="${f.i}">
      <div class="mfpic">${musioFace(f,72)}</div>
      <div class="mfbody"><h4>${f.n}${f.b?' <span class="mstar">◈</span>':''}</h4><div class="mforig">${f.o}　${f.d}</div>
      <p>${(f.note||f.k||"").slice(0,60)}…</p></div></div>`).join("")}</div>
  </div>
  <p class="mapnote" style="margin-top:24px">※ 本栏综合阿德勒、达尔豪斯、克尔曼、麦克拉蕊、汤姆林森、塔鲁斯金等音乐学史与方法论脉络；中国接受一节据王光祈、萧友梅、于润洋等学科建制与方法论讨论整理。学者肖像优先使用本地“缺失的图片”补图；其余无可靠图像者以纹章代之。</p>`;
  $("#musiowrap").querySelectorAll(".mfig").forEach(el=>el.onclick=()=>openMusioFig(el.dataset.mf));
}
function openMusioFig(id){
  const f=MUSIO_BY[id];if(!f)return;
  const p=PORTRAITS[f.i];
  $("#dwrap").innerHTML=`
  <div class="dhead">
    <div><h4>${f.n}</h4><div class="orig">${f.o}</div>
    <div class="meta">${f.d}${f.nat?" · "+f.nat:""} · 音乐学家</div></div>
    <button class="dclose" id="dx" aria-label="关闭">✕</button></div>
  <div class="dcols"><div>
    ${f.bio?`<h5>生 平</h5><p>${xlink(f.bio)}</p>`:""}
    ${f.note?`<h5>贡 献</h5><p>${xlink(f.note)}</p><h5>补 述</h5><p>${xlink(f.k)}</p>`:`<h5>贡 献</h5><p>${xlink(f.k)}</p>`}
    <h5>代表著作</h5><ul class="works">${(f.w||[]).map(x=>`<li>${x}</li>`).join("")}</ul>
  </div><div>
    ${p?`<figure class="pfig"><img loading="lazy" decoding="async" src="${p.u}" alt="${f.n}"><figcaption>${p.c}</figcaption></figure>`:med({i:f.i,o:f.o},84)}
  </div></div>`;
  const dg=$("#dlg");if(dg.open)dg.close();dg.dataset.ep="atlas";dg.dataset.kind="musicology";dg.removeAttribute("aria-labelledby");dg.showModal();
  dg.dataset.m="";
  $("#dx").onclick=()=>dg.close();
  $("#dwrap").querySelectorAll("[data-m]").forEach(a=>a.onclick=()=>openM(a.dataset.m,"音乐学人物关系"));
}

/* ══════════ 搜索 ══════════ */
const qi=$("#q"),sres=$("#sres");
qi.addEventListener("input",()=>{
  const q=qi.value.trim().toLowerCase();
  if(!q){sres.style.display="none";return}
  const hits=M.filter(m=>(m.n+m.o+(m.s||"")+(m.w||[]).join("")+(m.k||"")).toLowerCase().includes(q)).slice(0,14);
  sres.innerHTML=hits.map(m=>{const p=PORTRAITS[m.i];
    return `<div data-m="${m.i}">${p?`<img loading="lazy" decoding="async" src="${p.u}" alt="">`:`<span style="width:32px;text-align:center;color:var(--acc)">◉</span>`}<div><span class="sn">${m.n}</span><small>${m.d} · ${EP[m.e].zh} · ${m.s}</small></div></div>`}).join("")||`<div class="empty-mini"><b>没有找到匹配条目</b><small>可尝试姓氏、作品名或流派；也可以一键清除检索。</small><button class="state-action" data-search-clear>清除检索</button></div>`;
  sres.style.display="block";
  sres.querySelectorAll("[data-m]").forEach(d=>d.onclick=()=>{sres.style.display="none";qi.value="";openM(d.dataset.m,"检索结果")});
  sres.querySelector("[data-search-clear]")?.addEventListener("click",()=>{qi.value="";sres.style.display="none";qi.focus()});
});
document.addEventListener("click",e=>{if(!e.target.closest(".search"))sres.style.display="none"});
qi.addEventListener("keydown",e=>{if(e.key==="Escape"){sres.style.display="none";qi.blur()}});

/* ══════════ 导航 ══════════ */

function setView(v){
  const b=document.querySelector(`#views button[data-v="${v}"]`);if(!b)return;
  document.querySelectorAll("#views button").forEach(x=>x.classList.toggle("on",x===b));
  document.querySelectorAll(".view").forEach(s=>s.classList.remove("on"));
  $("#v-"+v).classList.add("on");
  const themed=v==="alm";
  $("#app").dataset.ep=themed?curEp:"atlas";
  $("#epnav").style.display=themed?"flex":"none";
  if(v!=="real")stopRealMapView();
  if(v!=="map"&&typeof mapStop==="function")mapStop();
  if(v!=="net")net3d?.pauseAnimation?.();
  if(v==="map")initMapView();
  if(v==="real")initRealMapView();
  if(v==="tl")renderTL();
  if(v==="net"){netLegend();if($("#tog3d").classList.contains("on"))net3d?.resumeAnimation?.();else init2D()}
  if(v==="lin")renderLineage();
  if(v==="hist")renderHist();
  if(v==="musio"&&!musioDone){renderMusio();musioDone=true}
  if(v==="gl")renderGloss();
  syncSelection();
  setHash("v="+v);
  queueChronograph();
}
$("#views").addEventListener("click",e=>{const b=e.target.closest("button");if(b)setView(b.dataset.v)});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-open-view]");
  if(!b)return;
  e.preventDefault();
  setView(b.dataset.openView);
  window.scrollTo({top:0,behavior:RM?"auto":"smooth"});
});
$("#epnav").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  curEp=b.dataset.ep;$("#app").dataset.ep=curEp;renderEpnav();renderAlm();window.scrollTo({top:0});
});
document.addEventListener("click",e=>{const c=e.target.closest(".card");if(c)openM(c.dataset.m,"年鉴名录")});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.closest){const c=e.target.closest(".card");if(c)openM(c.dataset.m,"年鉴名录")}});

/* ══════════ 随机漫游 ══════════ */
$("#roam").onclick=()=>{const i=Math.floor((performance.now()*131.77)%NAVORDER.length);openM(NAVORDER[i],"随机漫游")};

/* ══════════ 导览 / 凡例卡 ══════════ */
const VIEWDESC=[["年 鉴","七时代分章：篇首名画、导论小论文、大事记、史学争鸣与音乐家名录卡片。"],
["年 表","全体音乐家按生卒排成生命横道，时代色带贯穿。"],
["舆 图","真实经纬度投影的欧洲音乐史研究地图：国界、河流、拉丁地名；点城市见驻留者与典故。卫星实景地图见“实 景”。"],
["星 丛","师承与影响之网：平面 D3 力导向 + WebGL 立体星丛，节点为肖像。"],
["师 承",`${LINEAGES.length}条传统脉络的谱系带，肖像节点＋关系箭头。`],
["史 脉",`${HISTEVENTS.length}个重要历史事件的垂直时间轴，点开读前因—经过—后果—史学评价。`],
["术 语",`${GLOSS.length}条核心概念，逐条注原语与文献出处。`],
  ["文 献","编纂所据的权威著作与凡例。"],
  ["实 景","MapLibre 卫星、街道与地形底图；放大到城市后显示建筑、音乐场所、学院、大学和故居。"]];
$("#introgrid").innerHTML=VIEWDESC.map(v=>`<div><b>${v[0]}</b><span>${v[1]}</span></div>`).join("");
const intro=$("#intro");
function showIntro(){if(!intro.open)intro.showModal()}
function closeIntro(){try{intro.close()}catch(e){}try{localStorage.setItem("annales_seen","1")}catch(e){}}
$("#introx").onclick=closeIntro;$("#introgo").onclick=closeIntro;
$("#helpbtn").onclick=showIntro;
intro.addEventListener("cancel",()=>{try{localStorage.setItem("annales_seen","1")}catch(e){}});

/* ══════════ 弹窗关闭清锚点 ══════════ */
$("#dlg").addEventListener("close",()=>{const dg=$("#dlg");if(dg.dataset.m&&(["musician","work","version","fontes","performance","recording","reception"].includes(dg.dataset.kind)))clearSelection();delete dg.dataset.m;delete dg.dataset.kind;delete dg.dataset.work;delete dg.dataset.personScroll;delete dg.dataset.workScroll;delete dg.dataset.source;dg.removeAttribute("aria-labelledby");setHash(currentView());});
function currentView(){const on=document.querySelector("#views button.on");return on?"v="+on.dataset.v:""}

/* ══════════ 键盘导航 ══════════ */
document.addEventListener("keydown",e=>{
  if(/^(INPUT|TEXTAREA)$/.test(e.target.tagName))return;
  const dlg=$("#dlg");
  if(dlg.open&&dlg.dataset.kind){
    if(e.key==="Escape"){e.preventDefault();dlg.close()}
    else if(dlg.dataset.kind==="musician"&&e.key==="ArrowLeft"){e.preventDefault();$("#dprev")?.click()}
    else if(dlg.dataset.kind==="musician"&&e.key==="ArrowRight"){e.preventDefault();$("#dnext")?.click()}
    return;
  }
  if(intro.open)return;
  if(e.key>="1"&&e.key<="9"){setView(VIEWS[+e.key-1]);}
  else if(e.key==="r"||e.key==="R"){$("#roam").click()}
  else if(e.key==="?"||e.key==="/"){e.preventDefault();showIntro()}
});

/* ══════════ URL 锚点 / 前进后退 ══════════ */
window.addEventListener("popstate",()=>{if(!location.hash){$("#dlg").open&&$("#dlg").close()}else readHash()});

/* ══════════ 启动 ══════════ */
renderEpnav();renderAlm();loadResearchData();
queueChronograph();
if(location.hash){readHash()}
else{let seen;try{seen=localStorage.getItem("annales_seen")}catch(e){}if(!seen)setTimeout(showIntro,4600)}
