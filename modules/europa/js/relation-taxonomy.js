/*
 * The source dictionary keeps its compact, historical labels in relations.json.
 * This module gives the constellation view an explicit analytical vocabulary
 * without rewriting the data used by the other Europa views.
 */
export const EVIDENCE_STATUS=Object.freeze({
  documented:{label:'documented · 已文献化',opacity:1,pattern:'solid'},
  'strongly-supported':{label:'strongly-supported · 依据较强',opacity:.75,pattern:'solid'},
  historiographical:{label:'historiographical · 史学构造',opacity:.55,pattern:'dashed'},
  comparative:{label:'comparative · 分析性并置',opacity:.35,pattern:'dot-dash'}
});

export const EVIDENCE_CODE=Object.freeze({documented:0,'strongly-supported':1,historiographical:2,comparative:3});

export const RELATION_STYLE=Object.freeze({
  '师承':{kind:0,color:'#e3bd68',name:'明确的师生传递',directional:true},
  '影响':{kind:1,color:'#70b9d9',name:'作品、文献或接受史影响',directional:true},
  '接续':{kind:2,color:'#b5c1c5',name:'后世传统的延续定位',directional:true},
  '知交':{kind:3,color:'#69c1a2',name:'真实交往、通信或合作',directional:false},
  '亲缘':{kind:4,color:'#bc8bd1',name:'家庭或血缘关系',directional:false},
  '对立':{kind:5,color:'#d97883',name:'论争、竞争或审美冲突',directional:false},
  '比较':{kind:6,color:'#a8b0b4',name:'研究者的分析性并置',directional:false},
  '待核':{kind:7,color:'#777f84',name:'尚未完成归类的关系',directional:false,review:true}
});

/* Every source label currently present in relations.json is listed here.
 * A new source label must be added deliberately instead of inheriting 影响. */
const LABEL_CATEGORY=Object.freeze({
  '师承':'师承','师友':'师承','师徒':'师承',
  '影响':'影响','改编':'影响','呼应':'影响','分析':'影响','景仰':'影响','先声':'接续',
  '接续':'接续','承继':'接续','传承':'接续','传述':'接续','传统':'接续','复兴':'接续','学统':'接续','衣钵':'接续','私淑':'影响',
  '知交':'知交','交游':'知交','同侪':'比较','同乡':'比较','同盟':'知交','同时':'比较','提携':'知交','举荐':'知交','资助':'知交','庇护':'知交','朝圣':'影响',
  '亲缘':'亲缘','父子':'亲缘','翁婿':'亲缘','夫妇':'亲缘',
  '对峙':'对立','竞争':'对立','论战':'对立','戏仿':'对立',
  '比较':'比较'
});

/* These rows need an interpretation at row level, because the compact source
 * label is too broad or the note itself says that the relation is not literal. */
const OVERRIDES=Object.freeze({
  'tall|gabr':{cat:'比较',evidence:'comparative',direction:'undirected',review:'说明明确写作“非史实交往……可并观”，仅保留为分析性并置。'},
  'sasa|lisz':{source:'lisz',target:'sasa',cat:'影响',evidence:'strongly-supported',direction:'lisz->sasa',review:'方向按说明调整为李斯特的交响诗与循环主题影响圣桑；仍需研究者核对具体作品与来源。'},
  'rims|scri':{cat:'接续',evidence:'historiographical',direction:'rims->scri',review:'说明只有“俄派学统的旁支”，没有直接师生证据，禁止标作师承。'},
  'pale|vict':{cat:'待核',evidence:'historiographical',direction:'pale->vict',review:'说明使用“或曾从其学”，尚不足以归入明确师承。'},
  'pach|bach':{cat:'影响',evidence:'strongly-supported',direction:'pach->bach',review:'实际说明是巴赫经其兄受教的间接联系，不应理解为帕赫贝尔亲自教巴赫。'},
  'rims|stra':{cat:'影响',evidence:'strongly-supported',direction:'rims->stra',review:'“私淑”表示间接学习，不等同于正式师承。'},
  'sati|poul':{cat:'影响',evidence:'historiographical',direction:'sati->poul',review:'“精神教父”是影响性称谓，不足以证明正式师生关系。'},
  'tele|cpeb':{cat:'知交',evidence:'documented',direction:'tele->cpeb',review:'教父与推荐关系属于社会交往，非血缘或正式师承。'},
  'lisz|smet':{cat:'影响',evidence:'strongly-supported',direction:'lisz->smet',review:'“提携并私淑”不等于正式师承。'},
  'mach|cico':{cat:'接续',evidence:'historiographical',direction:'mach->cico'},
  'land|cico':{cat:'接续',evidence:'historiographical',direction:'land->cico'},
  'cico|dufa':{cat:'接续',evidence:'historiographical',direction:'cico->dufa'},
  'sapp|terp':{cat:'接续',evidence:'historiographical',direction:'sapp->terp',review:'“同岛先后两代”是传统定位，不能推出两人的现实交往。'},
  'ligi|kurt':{cat:'知交',evidence:'documented',direction:'undirected'},
  'berl|lisz':{cat:'知交',evidence:'strongly-supported',direction:'undirected'},
  'muso|rims':{cat:'知交',evidence:'documented',direction:'undirected'},
  'cacc|mont':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'ocke|obre':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'obre|josq':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'ligi|boul':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'marc|bern':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'dowl|byrd':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'lull|jacq':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'stock|berio':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'nono|schn':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'pend|luto':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'gore|pend':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'stra|prok':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'banc|peri':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'bibe|corel':{cat:'比较',evidence:'comparative',direction:'undirected'},
  'bibe|bach':{cat:'接续',evidence:'historiographical',direction:'bibe->bach',review:'说明明确写作“并非确证师承”，仅作为技术前史。'},
  'leon|pero':{cat:'接续',evidence:'historiographical',direction:'leon->pero',review:'“圣母院乐派两代”是传统定位，不等同于已证实的个人师承。'},
  'asca|vinc':{cat:'接续',evidence:'historiographical',direction:'asca->vinc',review:'说明标为“传统归属”，应按那不勒斯乐派的承续阅读。'},
  'will|gabr':{cat:'接续',evidence:'historiographical',direction:'will->gabr',review:'说明只写乐派的奠基与传承，未给出直接师生证据。'}
});

function inferredEvidence(cat,label,note){
  if(cat==='比较')return'comparative';
  const text=`${label} ${note||''}`;
  if(cat==='师承'&&/师从|门生|门下|从其学|弟子|学生|教其|受教|教作曲|学院/.test(text))return'documented';
  if(cat==='亲缘'&&/父子|翁婿|夫妇|家族/.test(text))return'documented';
  if(cat==='知交'&&/书信|通信|挚友|合作|同场|相遇|并肩|友谊|同窗|同道/.test(text))return'documented';
  if(/非史实|非个人|并观|两极|并行|分析性|风格史|谱系|学统|传统|血脉|两代|隔代|前史|继起|先声|旁支|承接|一脉/.test(text))return'historiographical';
  return'strongly-supported';
}

export function normalizeRelation(row){
  const [rawSource,rawTarget,label,note='']=Array.isArray(row)?row:[];
  const key=`${rawSource}|${rawTarget}`;
  const override=OVERRIDES[key]||{};
  const mapped=override.cat||LABEL_CATEGORY[label];
  const cat=mapped||'待核';
  const evidence=override.evidence||inferredEvidence(cat,label,note);
  const source=override.source||rawSource,target=override.target||rawTarget;
  const directional=override.direction==='undirected'?false:(override.direction?true:!!RELATION_STYLE[cat]?.directional);
  return{
    source,target,rawSource,rawTarget,rawLabel:label,cat,
    note:String(note||''),evidence:EVIDENCE_STATUS[evidence]?evidence:'historiographical',
    evidenceCode:EVIDENCE_CODE[evidence]??2,directional,
    review:override.review||(!mapped?`未找到“${label}”的关系分类映射。`:'')
  };
}

export function relationSwatch(category){
  const kind=RELATION_STYLE[category]?.kind??RELATION_STYLE['待核'].kind;
  const paths=[
    '<path d="M1 8H40"/><path class="rel-mover" d="m32 4 7 4-7 4"/>',
    '<path class="rel-wave" d="M1 8Q5 0 9 8T17 8T25 8T33 8T41 8"/><path class="rel-mover" d="m32 4 7 4-7 4"/>',
    '<path class="rel-dash" d="M1 8H40"/><path class="rel-mover" d="m32 4 7 4-7 4"/>',
    '<path d="M1 4H43M1 12H43"/><circle class="rel-mover" cx="7" cy="4" r="2"/><circle class="rel-return" cx="37" cy="12" r="2"/>',
    '<path d="M1 3C8 3 8 13 15 13S22 3 29 3 36 13 43 13M1 13C8 13 8 3 15 3S22 13 29 13 36 3 43 3"/>',
    '<path class="rel-zigzag" d="M1 8H8L12 3 17 13 22 3 27 13 32 8H43"/><path class="rel-return" d="m11 4-7 4 7 4"/>',
    '<path class="rel-dotdash" d="M1 8H43"/><circle cx="9" cy="8" r="1.6"/><circle cx="27" cy="8" r="1.6"/>'
  ];
  return `<svg class="rel-swatch rel-style-${kind}" viewBox="0 0 44 16" aria-hidden="true">${paths[kind]||paths[6]}</svg>`;
}
