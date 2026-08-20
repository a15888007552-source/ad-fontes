const museumLabels={qinhan:'秦汉馆',xian:'西安博物院',history:'陕西历史博物馆',archaeology:'陕西考古博物馆',baoji:'宝鸡青铜器博物院',beilin:'西安碑林博物馆'};
const museumIntros={qinhan:'秦汉馆以考古资料为实证，把秦汉文明的制度创建、城市与陵墓、技术与交流放在同一条历史线上。这里的墓葬与遗址，不是帝国叙事的插图，而是观察国家组织、物资供给、军事秩序和地下空间如何互相配合的材料。',xian:'西安博物院由博物馆、唐荐福寺遗址和小雁塔共同组成，城市史、佛教遗址与出土文物在同一园区相遇。这里的地点尤其适合追问：一座塔、一处寺院和一批墓葬器物，如何共同保存唐长安的城市生活与跨区域交流。',history:'陕西历史博物馆的唐墓壁画来自二十多座唐墓，近六百幅、逾千平方米；它们把仪仗、服饰、建筑、乐舞和狩猎留在明确的墓葬语境中。这里关注的不只是“盛唐气象”，还包括壁画如何被揭取、修复、保存，以及图像证据的边界。',archaeology:'陕西考古博物馆把考古学史、文化谱系、重大考古发现和文物保护科技放在同一套展陈里。这里的墓地和遗址不只展示出土物，也展示地层、聚落、实验与保护工作怎样把零散遗存组织成可检验的历史证据。',baoji:'宝鸡青铜器博物院集中收藏、研究和展示周秦青铜文化。眉县杨家村、庄白、石鼓山、鱼国墓地等材料，让青铜礼器不再只是孤立的“国宝”，而能与家族、墓地、铭文、车马和周王朝的政治秩序一起阅读。',beilin:'西安碑林博物馆以碑石、墓志、石刻造像和陵墓石刻为核心，保存的是被刻在石头上的身份、纪功、信仰与书写。这里的墓葬材料必须同时看原石、拓本、出土地和后来的收藏迁移，才能避免把一块碑误读成完整的历史现场。'};
const museumSources={qinhan:'https://www.sxhm.com/about.html',xian:'https://www.xabwy.com/index.html',history:'https://www.sxhm.com/info/news/detail/15874.html',archaeology:'https://wwj.shaanxi.gov.cn/zfxxgk/fdzdgknr/zzjg/zsdw/202011/t20201110_2008472.html',baoji:'https://www.bjqtm.com/',beilin:'https://www.beilin-museum.com/'};
const museumKeys={qinhan:'qinhan','xian-museum':'xian','shaanxi-history':'history','shaanxi-archaeology-museum':'archaeology',baoji:'baoji',beilin:'beilin'};
const state={all:[],items:[],index:0};
if(new URLSearchParams(location.search).get('embed')==='1')document.body.classList.add('is-embedded');
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sourceHosts=[
  ['bmy.com.cn','秦始皇帝陵博物院｜考古资料'],['hylae.com','汉景帝阳陵博物院｜馆方资料'],
  ['ncha.gov.cn','国家文物局｜遗产资料'],['wwj.baoji.gov.cn','宝鸡市文物局｜官方资料'],
  ['wwj.shaanxi.gov.cn','陕西省文物局｜文物资料'],
  ['dfz.shaanxi.gov.cn','陕西地方志｜历史资料'],['kaogu.cssn.cn','中国考古网｜考古资料'],
  ['cssn.cn','中国社会科学网｜研究资料'],['xabwy.com','西安博物院｜馆方资料'],
  ['sxhm.com','陕西历史博物馆｜馆方资料'],['shxkgy.cn','陕西省考古研究院｜考古资料'],
  ['bjqtm.com','宝鸡青铜器博物院｜馆方资料'],['beilin-museum.com','西安碑林博物馆｜馆方资料'],
  ['dpm.org.cn','故宫博物院｜馆藏资料'],['chnmuseum.cn','中国国家博物馆｜展览资料'],
  ['chinanews.com.cn','中国新闻网｜采访与发掘资料'],['cctv.com','央视网｜报道资料'],
  ['cntv.cn','央视网｜报道资料'],['news.cn','新华网｜报道资料'],['xinhuanet.com','新华网｜报道资料'],
  ['wikipedia.org','Wikipedia｜辅助资料']
];
function sourceLabel(source){
  const label=source?.[0]||'资料链接';
  if(label!=='原资料链接')return label;
  try{const host=new URL(source?.[1]||'',location.href).hostname.replace(/^www\./,'');const match=sourceHosts.find(([domain])=>host===domain||host.endsWith(`.${domain}`));return match?.[1]||'公开资料｜原文';}catch{return '公开资料｜原文';}
}
function render(){
  const host=$('#slides');
  host.innerHTML=state.items.map((p,i)=>{const image=/^(?:https?:\/\/|(?:\.\/)?assets\/)/.test(p.image||'')?`<figure class="site-image"><img src="${esc(p.image)}" alt="${esc(p.name)}相关现场图" loading="${i<2?'eager':'lazy'}" decoding="async"><figcaption>${esc(p.credit||'图像来源与性质待补充')}</figcaption></figure>`:`<div class="site-image image-pending" role="img" aria-label="${esc(p.name)}现场图待核"><span>现场图待核</span><small>未找到能确认对应地点的图像，本条不使用替代文物照</small></div>`;return `<article class="slide" data-index="${i}" aria-label="${i+1} / ${state.items.length}"><div class="slide-visual">${image}</div><div class="slide-meta"><span class="slide-index">${String(i+1).padStart(2,'0')} / ${String(state.items.length).padStart(2,'0')}</span><h3>${esc(p.name)}</h3><p class="kind">${esc(p.museumName)} · ${esc(p.kind)}</p><dl class="facts"><div><dt>墓主／遗址</dt><dd>${esc(p.history)}</dd></div><div><dt>发现与发掘</dt><dd>${esc(p.date)}。${esc(p.discovery)}</dd></div><div><dt>馆藏关联</dt><dd>${esc(p.objects)}</dd></div><div><dt>为什么重要</dt><dd>${esc(p.importance||p.value)}</dd></div></dl><div class="source-links">${(p.source||[]).map(s=>`<a href="${esc(s[1])}" target="_blank" rel="noreferrer">${esc(sourceLabel(s))} ↗</a>`).join('')}</div></div></article>`}).join('');
  $('#trail-count').textContent=`${state.items.length} 个地点`;
  $('#position').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(state.items.length).padStart(2,'0')}`;
  host.scrollTo({left:host.clientWidth*state.index,behavior:'auto'});
}
function move(delta){if(!state.items.length)return;state.index=(state.index+delta+state.items.length)%state.items.length;$('#slides').scrollTo({left:$('#slides').clientWidth*state.index,behavior:'smooth'});$('#position').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(state.items.length).padStart(2,'0')}`;}
function filter(m){state.items=m==='all'?state.all:state.all.filter(p=>p.museum===m);state.index=0;document.body.dataset.museum=m;$('#museum-intro').textContent=m==='all'?'六馆合览把帝陵、寺院、唐墓壁画、史前聚落、周秦墓地和碑刻材料放在同一条“从地下到展柜”的证据链上。先看地点，再看墓葬组合、出土过程和馆藏关联；AI背景图只负责建立视觉气氛，具体历史判断仍以每页来源为准。':museumIntros[m];const source=$('#museum-source');const allView=m==='all';$('#hero-note').firstChild.textContent=allView?'六馆合览 · 六张AI背景图仅作视觉设计，不作考古现场证据':`${museumLabels[m]} · AI生成背景图仅作视觉设计，不作考古现场证据 · `;source.hidden=allView;if(!allView){source.href=museumSources[m];source.textContent='馆方／主管部门资料 ↗';}render();document.querySelectorAll('.museum-tab').forEach(b=>b.classList.toggle('is-active',b.dataset.museum===m));}
$('#prev').addEventListener('click',()=>move(-1));
$('#next').addEventListener('click',()=>move(1));
document.querySelectorAll('.museum-tab').forEach(b=>b.addEventListener('click',()=>filter(b.dataset.museum)));
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);});
$('#slides').addEventListener('scroll',()=>{const el=$('#slides');const i=Math.round(el.scrollLeft/el.clientWidth);if(i!==state.index&&i>=0&&i<state.items.length){state.index=i;$('#position').textContent=`${String(i+1).padStart(2,'0')} / ${String(state.items.length).padStart(2,'0')}`;}});
fetch('./tomb-trails-data.json').then(r=>r.json()).then(data=>{state.all=data.map(p=>({...p,museum:museumKeys[p.museum]||p.museum}));const requested=new URLSearchParams(location.search).get('museum');filter(requested&&Object.keys(museumLabels).includes(requested)?requested:'all');}).catch(err=>{$('#slides').innerHTML=`<p class="load-error">专题资料读取失败：${esc(err.message)}</p>`;});

