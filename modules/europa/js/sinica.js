const SINICA_DATA = Object.assign(
  {},
  ...(await Promise.all([
    "./data/sinica/entries.json",
    "./data/sinica/relations.json",
    "./data/sinica/periods.json",
    "./data/sinica/events.json",
    "./data/sinica/sources.json",
    "./data/sinica/geo.json",
    "./data/sinica/media.json",
    "./data/sinica/views.json"
  ].map(async url => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      console.error("[sinica] data load failed", url, error);
      throw error;
    }
  })))
);

const BAYIN = SINICA_DATA.BAYIN;
const CANAL = SINICA_DATA.CANAL;
const CITY = SINICA_DATA.CITY;
const CITYBLD = SINICA_DATA.CITYBLD;
const COASTP = SINICA_DATA.COASTP;
const EP = SINICA_DATA.EP;
const EPYR = SINICA_DATA.EPYR;
const GLOSS = SINICA_DATA.GLOSS;
const GREATWALL = SINICA_DATA.GREATWALL;
const HISTDEEP = SINICA_DATA.HISTDEEP;
const HISTEVENTS = SINICA_DATA.HISTEVENTS;
const L = SINICA_DATA.L;
const LINEAGES = SINICA_DATA.LINEAGES;
const M = SINICA_DATA.M;
const PORTRAITS = SINICA_DATA.PORTRAITS;
const REGIONS = SINICA_DATA.REGIONS;
const REIGN = SINICA_DATA.REIGN;
const RIVERS = SINICA_DATA.RIVERS;
const SCHOL = SINICA_DATA.SCHOL;
const SEAS = SINICA_DATA.SEAS;
const TORD = SINICA_DATA.TORD;
const TYPES = SINICA_DATA.TYPES;
const VIEWDESC = SINICA_DATA.VIEWDESC;
const VIEWS = SINICA_DATA.VIEWS;
const YUEXUE = SINICA_DATA.YUEXUE;

const EPC={"yuangu":"#B08D2E","qinhan":"#B14A32","weijin":"#5F7E5B","suitang":"#D98E2B","songyuan":"#42807E","mingqing":"#2C4C8A","xiandai":"#C7202F"};





let CITYGALLERY={};
let cityGalleryLoaded=false;
const CITYGALLERY_READY=fetch("assets/city/huaxia-gallery-data.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).then(d=>{CITYGALLERY=d||{};cityGalleryLoaded=true}).catch(()=>{cityGalleryLoaded=true});
const ART={};
const YFIX={};














/* ══════════ 通用 ══════════ */
const byId=Object.fromEntries(M.map(m=>[m.i,m]));
const EPK=Object.keys(EP);
const $=s=>document.querySelector(s);
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;

const TLABEL={
 "人":{bio:"生 平",k:"贡 献",t:"音乐特征",w:"代表作品",c:"活动轨迹"},
 "曲":{bio:"流 传",k:"地 位",t:"音乐特征",w:"存谱与要目",c:"流布之地"},
 "器":{bio:"形制沿革",k:"地 位",t:"声音与性格",w:"形制要目",c:"出土与流布"},
 "书":{bio:"成书与流传",k:"地 位",t:"要 旨",w:"篇目要目",c:"成书之地"},
 "制":{bio:"建制沿革",k:"地 位",t:"职能与规模",w:"要 目",c:"所在之地"}};
function firstChar(m){const s=(m.n||"").replace(/[《》]/g,"");return s.charAt(0)||"?"}
function med(m,sz){
  const p=PORTRAITS[m.i];
  const fs=Math.round(sz*.46);
  if(p)return `<div class="med y${m.y}" style="width:${sz}px;height:${sz}px"><img src="${p.u}" alt="${m.n}"></div>`;
  return `<div class="med y${m.y}" style="width:${sz}px;height:${sz}px;font-size:${fs}px">${firstChar(m)}</div>`;
}
/* 朝代/年号 → 代表年（仅当年代串无阿拉伯数字时启用，长名在前以便优先掩去） */

function scanNum(d){
  let s=d,sig=[];
  const push=(re,fn)=>{s=s.replace(re,(...a)=>{const off=a[a.length-2],g=a.slice(1,-2),y=fn(g);if(y!==null&&!isNaN(y))sig.push([off,y]);return " ".repeat(a[0].length)})};
  push(/距今约?(\d+)/g,g=>-(+g[0]-2000));
  push(/(前)?(\d+)[–—\-~至](\d+)\s*世纪/g,g=>{const base=(+g[1]-1)*100;return g[0]?-(base+100):base+1});
  push(/(前)?(\d+)\s*世纪/g,g=>{const base=(+g[1]-1)*100;return g[0]?-(base+100):base+1});
  push(/(前)?(\d{2,4})\s*年?/g,g=>{const v=+g[1];return g[0]?-v:v});
  return sig.sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
}
function scanReign(d){
  let s=d,sig=[];
  for(const [nm,y] of REIGN){let i;while((i=s.indexOf(nm))>=0){sig.push([i,y]);s=s.slice(0,i)+" ".repeat(nm.length)+s.slice(i+nm.length)}}
  return sig.sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
}
function yrs(m){
  if(YFIX[m.i])return YFIX[m.i];
  const [lo,hi]=EPYR[m.e],inr=y=>y>=lo-1400&&y<=hi+300;
  let sig=scanNum(m.d||"").filter(inr);
  if(!sig.length)sig=scanReign(m.d||"").filter(inr);
  let a=sig.length?sig[0]:lo;
  let b=sig.length>1?sig[sig.length-1]:null;
  if(b===null||b<a)b=Math.min(a+40,hi+150);
  return [a,b];
}
function setHash(h){try{history.replaceState(null,"",h?("#"+h):location.pathname+location.search)}catch(e){}}
function xlink(txt,selfId){
  if(!txt)return"";
  if(!XRE)return txt;
  return txt.replace(XRE,nm=>{const id=XALIAS[nm];if(!id||id===selfId)return nm;return `<a class="xl" data-m="${id}">${nm}</a>`});
}

/* 名号自动链接表 */
const XALIAS={};
(function(){
  const cnt={};
  const add=(nm,id)=>{if(!nm||nm.length<2)return;(cnt[nm]=cnt[nm]||new Set()).add(id)};
  M.forEach(m=>{add(m.n.replace(/[《》]/g,""),m.i);add(m.n,m.i)});
  Object.keys(cnt).forEach(nm=>{if(cnt[nm].size===1)XALIAS[nm]=[...cnt[nm]][0]});
})();
const XNAMES=Object.keys(XALIAS).sort((a,b)=>b.length-a.length);
const XRE=XNAMES.length?new RegExp(XNAMES.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g"):null;

const NAVORDER=[...M].sort((a,b)=>yrs(a)[0]-yrs(b)[0]).map(m=>m.i);

/* ══════════ 时代导航 ══════════ */
let curEp="yuangu";
function renderEpnav(){$("#epnav").innerHTML=EPK.map(k=>`<button data-ep="${k}" class="${k===curEp?'on':''}"><b>${EP[k].zh}</b><i>${EP[k].span}</i></button>`).join("");
  document.querySelectorAll("#epnav button").forEach(b=>b.onclick=()=>{curEp=b.dataset.ep;
    const onAlm=$("#v-alm").classList.contains("on");
    if(onAlm)$("#app").dataset.ep=curEp;
    renderEpnav();renderAlm();
    if(onAlm)window.scrollTo({top:0,behavior:RM?"auto":"smooth"})})}

function observe(){/* 卡片始终不透明；入场淡入改由纯CSS动画完成，绝不会卡在透明态 */}

/* ══════════ 年鉴（分章） ══════════ */
let typeFilter="all";
function cardHTML(m){
  return `<div class="card" data-m="${m.i}" tabindex="0">
    <div class="cbadge">${m.y}</div>
    <div class="chead">${med(m,54)}
      <div><h4>${m.n}</h4><div class="orig">${m.o||""}</div><div class="dts">${m.d}</div></div></div>
    <p class="k">${m.k}</p>
    <div class="s">${m.s}${m.ba?` · 八音之${m.ba}`:""}</div></div>`;
}
function renderAlm(){
  const e=EP[curEp];
  const ms=M.filter(m=>m.e===curEp&&(typeFilter==="all"||m.y===typeFilter)).sort((a,b)=>yrs(a)[0]-yrs(b)[0]);
  const sch=SCHOL[curEp]||{};
  const deb=sch.debates||[];
  const art=ART[curEp];
  $("#v-alm").innerHTML=`
  <div class="hero">${art?`<div class="heroart" style="background-image:url('${art.u}')"></div>`:`<div class="heroph">${e.en}</div>`}
    <div class="heroinner"><div class="span">${e.span}</div>
      <div class="herolat">${e.en}</div><h2>${e.zh}</h2></div>
    ${art?`<div class="artcredit">底图 — ${art.title||""} ${art.artist||""}</div>`:""}</div>
  <div class="ephead">
    <div>
      <p class="intro">${e.intro}</p>
      <div class="theme">本章视觉主题 — <b>${e.theme}</b></div>
    </div>
    <div>
      <div class="quotebox"><p>${e.quote}</p><span>${e.qs}</span></div>
      <div class="subs">${(e.subs||[]).map(s=>`<em>${s}</em>`).join("")}</div>
    </div>
  </div>
  <div class="events">${(e.events||[]).map(v=>`<div><b>${v[0]}</b><span>${v[1]}</span></div>`).join("")}</div>
  ${sch.essay?`<div class="scholbox"><h4>史料与史观</h4><p>${xlink(sch.essay)}</p></div>`:""}
  ${deb.length?`<div class="debates">${deb.map(d=>`<div class="debate"><h4>${d.t}</h4><p>${xlink(d.b)}</p><span class="ref">${d.ref||""}</span></div>`).join("")}</div>`:""}
  <div class="typechips">${["all",...TYPES].map(t=>`<button class="chip ${typeFilter===t?'on':''}" data-t="${t}">${t==="all"?"全部":t}</button>`).join("")}</div>
  <div class="grid">${ms.map(cardHTML).join("")}</div>`;
  document.querySelectorAll("#v-alm .typechips .chip").forEach(b=>b.onclick=()=>{typeFilter=b.dataset.t;renderAlm()});
  observe();
}

/* ══════════ 详情 ══════════ */
function openM(id){
  const m=byId[id];if(!m)return;
  const rels=L.filter(l=>l[0]===id||l[1]===id);
  const rel=rels.map(l=>{const o=byId[l[0]===id?l[1]:l[0]];if(!o)return"";
    return `<li><b>${l[2]}</b> · <a data-m="${o.i}">${o.n}</a><br><small style="color:var(--mut)">${l[3]||""}</small></li>`}).join("");
  const cs=(m.c||[]).filter(c=>CITY[c]);
  const p=PORTRAITS[m.i];
  const lb=TLABEL[m.y]||TLABEL["人"];
  const ni=NAVORDER.indexOf(id);
  $("#dwrap").innerHTML=`
  <div class="dhead">
    <div><h4>${m.n}</h4><div class="orig">${m.o||""}</div>
    <div class="meta">${m.d} · ${EP[m.e].zh} · ${m.s}${m.ba?` · 八音之${m.ba}`:""}</div></div>
    <div class="dnav"><button id="dprev" title="上一条（←）">‹ 前</button><button id="dnext" title="下一条（→）">后 ›</button></div>
    <button class="dclose" id="dx" aria-label="关闭">✕</button></div>
  <div class="dcols"><div>
    ${m.bio?`<h5>${lb.bio}</h5><p>${xlink(m.bio,id)}</p>`:""}
    <h5>${lb.k}</h5><p>${xlink(m.k,id)}</p>
    <h5>${lb.t}</h5><p>${xlink(m.t,id)}</p>
    ${m.deep?`<h5>深 读</h5><p>${xlink(m.deep,id)}</p>`:""}
    <h5>${lb.w}</h5><ul class="works">${(m.w||[]).map(w=>`<li>${w}</li>`).join("")}</ul>
    ${m.cite?`<p class="citeline">文献定位 — ${m.cite}</p>`:""}
  </div><div>
    ${p?`<figure class="pfig"><img src="${p.u}" alt="${m.n}"><figcaption>${p.c||""}</figcaption></figure>`:`<div class="bigmed" style="width:110px">${med(m,110)}</div>`}
    <h5>${lb.c} · ${cs.join(" → ")||"—"}</h5>
    ${cs.length?`<div class="routebox">${miniMap(cs)}</div>`:""}
    <h5>关系之网（${rels.length}）</h5>
    <ul class="conn">${rel||"<li>—</li>"}</ul>
  </div></div>`;
  const dg=$("#dlg");if(!dg.open)dg.showModal();
  dg.dataset.m=id;setHash("m="+id);
  $("#dx").onclick=()=>dg.close();
  $("#dprev").onclick=()=>openM(NAVORDER[(ni-1+NAVORDER.length)%NAVORDER.length]);
  $("#dnext").onclick=()=>openM(NAVORDER[(ni+1)%NAVORDER.length]);
  $("#dwrap").querySelectorAll("[data-m]").forEach(a=>a.onclick=()=>openM(a.dataset.m));
}

/* ══════════ 投影与舆图 ══════════ */
const MW=1840,MH=1370;
const PX=(lon,lat)=>[(lon-71.5)*28+16,(55.5-lat)*35+6];
function pstr(pts){return "M"+pts.map(p=>{const q=PX(p[0],p[1]);return q[0].toFixed(0)+" "+q[1].toFixed(0)}).join("L")+"Z"}
const lstr=pts=>"M"+pts.map(p=>{const q=PX(p[0],p[1]);return q[0].toFixed(0)+" "+q[1].toFixed(0)}).join("L");
const LANDPATH=COASTP.map(poly=>`<path class="land" d="${pstr(poly)}"/>`).join("");
const WALLPATH=`<path class="gwall" d="${lstr(GREATWALL)}"/>`;
const RIVERPATH=RIVERS.map(l=>`<path class="river" d="${lstr(l)}"/>`).join("");
const CANALPATH=`<path class="canal" d="${lstr(CANAL)}"/>`;
let mapFilter="all",routeOf=null,vb={x:0,y:0,w:MW,h:MH};
function cityList(){
  const idx={};
  M.filter(m=>mapFilter==="all"||m.e===mapFilter).forEach(m=>(m.c||[]).forEach(c=>{if(CITY[c])(idx[c]=idx[c]||[]).push(m)}));
  return idx;
}
function renderMap(){
  const idx=cityList(),sc=vb.w/MW;
  let dots="",labs="",route="";
  const routeCities=routeOf&&byId[routeOf]?(byId[routeOf].c||[]).filter(c=>CITY[c]):[];
  if(routeCities.length>1){
    const ps=routeCities.map(c=>PX(CITY[c][0],CITY[c][1]));
    route=`<path class="route" d="M${ps.map(p=>p.join(" ")).join("L")}"/>`;
  }
  const zoomed=vb.w<MW*.6,zoomed2=vb.w<MW*.34;
  const fs=14*sc,placed=[];
  const rc=new Set(routeCities);
  const ents=Object.keys(idx).map(c=>({c,n:idx[c].length,p:PX(CITY[c][0],CITY[c][1])})).sort((a,b)=>b.n-a.n);
  for(const e of ents){
    const [x,y]=e.p,n=e.n;
    const r=(4.5+Math.min(n,9)*1.1)*sc;
    dots+=`<circle class="cdot${routeOf&&!rc.has(e.c)?' dim':''}" data-c="${e.c}" cx="${x}" cy="${y}" r="${r}"><title>${e.c} · ${n}条</title></circle>`;
    const want=rc.has(e.c)||zoomed2||(zoomed&&n>=2)||n>=3||["长安","北京","杭州","上海","延安"].includes(e.c);
    if(!want)continue;
    const w=e.c.length*fs*1.08+6*sc,h=fs*1.4;
    const cand=[[x+10*sc,y+4.5*sc],[x-w-10*sc,y+4.5*sc],[x+2*sc,y-11*sc],[x+2*sc,y+19*sc]];
    let pos=null;
    for(const cd of cand){const box=[cd[0],cd[1]-h*.8,w,h];
      if(!placed.some(b=>!(box[0]>b[0]+b[2]||box[0]+box[2]<b[0]||box[1]>b[1]+b[3]||box[1]+box[3]<b[1]))){pos=cd;placed.push(box);break}}
    if(pos)labs+=`<text class="clab" data-c="${e.c}" x="${pos[0]}" y="${pos[1]}" font-size="${fs}">${e.c}</text>`;
  }
  const regs=REGIONS.map(r=>{const q=PX(r[1],r[2]);return `<text class="regionlab" x="${q[0]}" y="${q[1]}" font-size="${21*sc}">${r[0]}</text>`}).join("");
  const seas=SEAS.map(r=>{const q=PX(r[1],r[2]);return `<text class="sealab" x="${q[0]}" y="${q[1]}" font-size="${19*sc}">${r[0]}</text>`}).join("");
  $("#mapbox").innerHTML=`
  <div class="mapbtns"><button id="mzi" aria-label="放大">＋</button><button id="mzo" aria-label="缩小">－</button><button id="mzr" aria-label="复位" style="font-size:12px">复位</button></div>
  <svg id="msvg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid meet">
    ${LANDPATH}${WALLPATH}${RIVERPATH}${CANALPATH}${regs}${seas}${route}${dots}${labs}</svg>`;
  const svg=$("#msvg");
  svg.addEventListener("wheel",e=>{e.preventDefault();zoomAt(e,e.deltaY<0?.82:1.22)},{passive:false});
  bindPan(svg);
  $("#mzi").onclick=()=>zoomC(.78);$("#mzo").onclick=()=>zoomC(1.28);
  $("#mzr").onclick=()=>{vb={x:0,y:0,w:MW,h:MH};routeOf=null;renderMap()};
  svg.addEventListener("click",e=>{
    if(panMoved)return;
    const el=e.target.closest&&e.target.closest(".cdot,.clab");
    if(el&&el.dataset.c)cityPanel(el.dataset.c);
  });
}
let panMoved=false;
function bindPan(svg){
  let pd=null;
  svg.addEventListener("pointerdown",e=>{pd={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y};panMoved=false});
  svg.addEventListener("pointermove",e=>{if(!pd)return;const r=svg.getBoundingClientRect();
    const dx=(e.clientX-pd.x)*vb.w/r.width,dy=(e.clientY-pd.y)*vb.h/r.height;
    if(!panMoved&&Math.abs(e.clientX-pd.x)+Math.abs(e.clientY-pd.y)>4){panMoved=true;svg.classList.add("panning");try{svg.setPointerCapture(e.pointerId)}catch(_){}}
    if(panMoved){vb.x=pd.vx-dx;vb.y=pd.vy-dy;svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`)}});
  const up=()=>{pd=null;svg.classList.remove("panning");if(panMoved)renderMap()};
  svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",up);
}
function zoomAt(e,f){
  const svg=$("#msvg"),r=svg.getBoundingClientRect();
  const px=vb.x+(e.clientX-r.left)/r.width*vb.w, py=vb.y+(e.clientY-r.top)/r.height*vb.h;
  vb={x:px-(px-vb.x)*f,y:py-(py-vb.y)*f,w:vb.w*f,h:vb.h*f};renderMap();
}
function zoomC(f){const svg=$("#msvg"),r=svg.getBoundingClientRect();zoomAt({clientX:r.left+r.width/2,clientY:r.top+r.height/2},f)}
function cityBuildingImages(bld){
  if(Array.isArray(bld.imgs)&&bld.imgs.length)return bld.imgs.filter(img=>img&&img.src);
  if(bld.u)return [{src:bld.u,alt:bld.name,caption:bld.name,credit:"现有嵌入图像"}];
  return [];
}
function cityBuildingGallery(c,bld){
  const imgs=Array.isArray(CITYGALLERY[c])&&CITYGALLERY[c].length?CITYGALLERY[c]:cityBuildingImages(bld);
  const media=imgs.length?`<div class="bldgallery" role="region" aria-roledescription="carousel" aria-label="${c}代表建筑图集" tabindex="0" data-count="${imgs.length}" data-current="0">
    ${imgs.map((img,i)=>`<figure class="bldslide" data-slide="${i}" role="group" aria-roledescription="slide" aria-label="${i+1} / ${imgs.length}" ${i===0?"":"hidden"}><img loading="lazy" decoding="async" src="${img.src}" alt="${img.alt||`${c} · ${bld.name}`}"/>${img.caption||img.credit?`<figcaption>${img.caption?`<b>${img.caption}</b>`:""}${img.caption&&img.credit?" · ":""}${img.credit||""}</figcaption>`:""}</figure>`).join("")}
    ${imgs.length>1?`<span class="bldgalcount" aria-hidden="true">1 / ${imgs.length}</span><button type="button" class="bldgalnav bldgalprev" aria-label="${c}代表建筑：上一张图片">‹</button><button type="button" class="bldgalnav bldgalnext" aria-label="${c}代表建筑：下一张图片">›</button><div class="bldgaldots" aria-label="选择图片">${imgs.map((_,i)=>`<button type="button" class="bldgaldot" data-slide-to="${i}" aria-label="查看第 ${i+1} 张图片" aria-current="${i===0?"true":"false"}"></button>`).join("")}</div><span class="sr-only bldgalstatus" aria-live="polite" aria-atomic="true">第 1 张，共 ${imgs.length} 张</span>`:""}
  </div>`:`<div class="bldph" aria-hidden="true">🏛</div>`;
  return `<section class="bldcard" aria-label="${c}代表建筑">${media}<div class="bldmeta"><div class="bldlab">代表建筑</div><div class="bldname">${bld.name}</div><p>${bld.note||""}</p></div></section>`;
}
function bindCityBuildingGallery(root){
  const gallery=root.querySelector(".bldgallery");if(!gallery)return;
  const n=Number(gallery.dataset.count);if(n<2)return;
  const show=next=>{const current=(next%n+n)%n;gallery.dataset.current=String(current);gallery.querySelectorAll("[data-slide]").forEach(slide=>{slide.hidden=Number(slide.dataset.slide)!==current});gallery.querySelectorAll("[data-slide-to]").forEach(button=>button.setAttribute("aria-current",Number(button.dataset.slideTo)===current?"true":"false"));const count=gallery.querySelector(".bldgalcount");if(count)count.textContent=`${current+1} / ${n}`;const status=gallery.querySelector(".bldgalstatus");if(status)status.textContent=`第 ${current+1} 张，共 ${n} 张`};
  gallery.querySelector(".bldgalprev").onclick=()=>show(Number(gallery.dataset.current)-1);gallery.querySelector(".bldgalnext").onclick=()=>show(Number(gallery.dataset.current)+1);gallery.querySelectorAll("[data-slide-to]").forEach(button=>button.onclick=()=>show(Number(button.dataset.slideTo)));
  gallery.addEventListener("keydown",event=>{const current=Number(gallery.dataset.current);if(event.key==="ArrowLeft"){event.preventDefault();show(current-1)}else if(event.key==="ArrowRight"){event.preventDefault();show(current+1)}else if(event.key==="Home"){event.preventDefault();show(0)}else if(event.key==="End"){event.preventDefault();show(n-1)}});
  let touchStartX=null;gallery.addEventListener("touchstart",event=>{touchStartX=event.touches[0].clientX},{passive:true});gallery.addEventListener("touchend",event=>{if(touchStartX===null)return;const delta=event.changedTouches[0].clientX-touchStartX;if(Math.abs(delta)>40)show(Number(gallery.dataset.current)+(delta<0?1:-1));touchStartX=null},{passive:true});
}
function cityPanel(c){
  const idx=cityList(),ms=(idx[c]||[]).sort((a,b)=>yrs(a)[0]-yrs(b)[0]);
  const bld=(typeof CITYBLD!=="undefined")?CITYBLD[c]:null;
  const evs=(typeof HISTEVENTS!=="undefined"?HISTEVENTS:[]).filter(e=>e.l===c).sort((a,b)=>a.y-b.y);
  const TNAME={"人":"人物","器":"文物 · 乐器","曲":"作品","书":"乐书","制":"乐制 · 机构"};
  let groups="";
  TORD.forEach(t=>{
    const g=ms.filter(m=>m.y===t);if(!g.length)return;
    groups+=`<div class="cgrp"><div class="cgt">${TNAME[t]}</div>${g.map(m=>`<div class="mrow" data-m="${m.i}">${med(m,34)}<div><span class="sn">${m.n}</span><small>${m.d} · ${m.s}</small></div></div>`).join("")}</div>`;
  });
  const bldcard=bld?cityBuildingGallery(c,bld):"";
  const evbox=evs.length?`<div class="cgrp"><div class="cgt">此地大事</div>${evs.map(e=>{
    const yl=e.y<0?"前"+(-e.y):(e.y<1000?"公元"+e.y:e.y);
    return `<div class="cev"><b>${yl}</b><span>${e.t}</span></div>`}).join("")}</div>`:"";
  const panel=$("#mappanel");
  panel.innerHTML=`<h4>${c}</h4>
  <div class="ccoord">${CITY[c][1].toFixed(1)}°N · ${CITY[c][0].toFixed(1)}°E</div>
  <p class="cnote">${CITY[c][2]||""}</p>
  ${bldcard}
  <div id="maplist">${groups||"<p class='cnote' style='opacity:.6'>此过滤条件下暂无条目</p>"}${evbox}</div>`;
  panel.querySelectorAll("[data-m]").forEach(el=>el.onclick=()=>{routeOf=el.dataset.m;renderMap();openM(el.dataset.m)});
  bindCityBuildingGallery(panel);
  if(!cityGalleryLoaded)CITYGALLERY_READY.then(()=>{if($("#mappanel")===panel)cityPanel(c)});
}
function renderMapChips(){
  $("#mapchips").innerHTML=[["all","全部"],...EPK.map(k=>[k,EP[k].zh])].map(([k,z])=>`<button class="chip ${mapFilter===k?'on':''}" data-k="${k}">${z}</button>`).join("");
  $("#mapchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{mapFilter=b.dataset.k;renderMapChips();renderMap()});
}
function miniMap(cs){
  const ps=cs.map(c=>PX(CITY[c][0],CITY[c][1]));
  const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);
  let cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  let w=Math.max(620,(Math.max(...xs)-Math.min(...xs))*2.1),h=w*.7;
  let x0=Math.max(-80,Math.min(cx-w/2,MW-w+80)),y0=Math.max(-80,Math.min(cy-h/2,MH-h+80));
  const sc=w/MW*2.4;
  const line=ps.length>1?`<path class="route" style="stroke-width:${(w/240).toFixed(1)}" d="M${ps.map(p=>p.join(" ")).join("L")}"/>`:"";
  return `<svg viewBox="${x0} ${y0} ${w} ${h}">${LANDPATH}${RIVERPATH}${line}${ps.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${w/90}" class="cdot"/><text class="clab" x="${p[0]+w/70}" y="${p[1]+w/200}" font-size="${w/28}">${cs[i]}</text>`).join("")}</svg>`;
}

/* ══════════ 长河 ══════════ */
const SEG=[[-6200,-1200,.012],[-1200,500,.115],[500,2060,.66]];
function tx(y){let x=56;for(const[a,b,k]of SEG){if(y<=a)break;x+=(Math.min(y,b)-a)*k}return x}
let tlDone=false;
function renderTL(){
  if(tlDone)return;tlDone=true;
  const rows=[...M].sort((a,b)=>yrs(a)[0]-yrs(b)[0]);
  const lanes=[];
  const bars=[];
  rows.forEach(m=>{
    const [a,b]=yrs(m);
    let li=lanes.findIndex(v=>v<tx(a)-8);
    if(li<0){li=lanes.length;lanes.push(0)}
    lanes[li]=tx(b)+m.n.length*13+30;
    bars.push({m,a,b,li});
  });
  const H=lanes.length*23+92,W=tx(2060)+240;
  let g="";
  EPK.forEach(k=>{const[a,b]=EPYR[k];g+=`<rect x="${tx(a)}" y="40" width="${tx(b)-tx(a)}" height="${H-70}" fill="${EPC[k]}" opacity=".07"/><text x="${tx(a)+6}" y="30" font-size="13" fill="${EPC[k]}" font-family="var(--sans)" letter-spacing=".2em">${EP[k].zh}</text>`});
  const ticks=[-6000,-1000,-500,-221,220,589,960,1368,1600,1800,1900,1950,2000];
  ticks.forEach(y=>{const x=tx(y);g+=`<line x1="${x}" y1="40" x2="${x}" y2="${H-30}" stroke="var(--line)" stroke-width="1"/><text x="${x+3}" y="${H-14}" font-size="11" fill="var(--mut)" font-family="var(--sans)">${y<0?"前"+(-y):y}</text>`});
  let bl="";
  bars.forEach(({m,a,b,li})=>{
    const x1=tx(a),x2=Math.max(tx(b),x1+6),y=56+li*23;
    bl+=`<g class="tlbar" data-m="${m.i}"><rect x="${x1}" y="${y}" width="${x2-x1}" height="7" rx="3.5" fill="${EPC[m.e]}" opacity=".82"/><text class="tlname" x="${x2+7}" y="${y+8}">${m.n}<tspan fill="var(--mut)" font-size="10"> ${m.y}</tspan></text></g>`;
  });
  $("#tlbox").innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g}${bl}</svg>`;
  const tip=$("#tltip");
  $("#tlbox").querySelectorAll(".tlbar").forEach(el=>{
    el.addEventListener("click",()=>openM(el.dataset.m));
    el.addEventListener("mousemove",e=>{const m=byId[el.dataset.m];tip.style.display="block";tip.style.left=(e.clientX+14)+"px";tip.style.top=(e.clientY+10)+"px";tip.innerHTML=`<b>${m.n}</b> ${m.d}<br><span style="color:var(--mut)">${m.s}</span>`});
    el.addEventListener("mouseleave",()=>tip.style.display="none");
  });
}

/* ══════════ 关系之网 ══════════ */
const RELC={"师承":"#A8842C","师生":"#A8842C","影响":"#5B7DA8","对峙":"#A2453A","知交":"#5F7E5B","亲缘":"#7B5A78","父女":"#7B5A78","父子":"#7B5A78","君臣":"#8A5A2C","作曲":"#8C3B5E","制曲":"#8C3B5E","自度":"#8C3B5E","绝响":"#A2453A","接续":"#8A8272","承启":"#8A8272","其他":"#8A8272"};
function relCat(t){for(const k of Object.keys(RELC)){if(t.includes(k)||k.includes(t))return k}return "其他"}
let net2d=null,net3d=null,netFilter="all",netMode="2d";
function netData(){
  const deg={};L.forEach(l=>{deg[l[0]]=(deg[l[0]]||0)+1;deg[l[1]]=(deg[l[1]]||0)+1});
  const nodes=M.map(m=>({id:m.i,m,deg:deg[m.i]||0}));
  const links=L.filter(l=>byId[l[0]]&&byId[l[1]]).map(l=>({source:l[0],target:l[1],cat:relCat(l[2]),t:l[2],note:l[3]||""}));
  return {nodes,links};
}
function netLegend(){
  const cats={};L.forEach(l=>{cats[relCat(l[2])]=1});
  $("#netleg").innerHTML=Object.keys(cats).map(c=>`<span><i style="background:${RELC[c]}"></i>${c}</span>`).join("")+
    `<span style="margin-left:auto">节点色＝时代 · 大小＝关系数</span>`;
}
function renderNetChips(){
  $("#netchips").innerHTML=[["all","全部"],...EPK.map(k=>[k,EP[k].zh])].map(([k,z])=>`<button class="chip ${netFilter===k?'on':''}" data-k="${k}">${z}</button>`).join("");
  $("#netchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{netFilter=b.dataset.k;renderNetChips();if(netMode==="2d"){net2d=null;init2D()}else init3D(true)});
}
function init2D(){
  if(net2d)return;net2d=true;
  const box=$("#netwrap2d");box.innerHTML="";
  const W=Math.max(box.clientWidth||1100,900),H=760;
  const {nodes,links}=netData();
  const rr=d=>8+Math.min(d.deg,12)*1.4;
  const svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  const root=svg.append("g");
  const vis=d=>netFilter==="all"||d.m.e===netFilter;
  const lk=root.append("g").selectAll("path").data(links).join("path")
    .attr("fill","none").attr("stroke",d=>RELC[d.cat]).attr("stroke-width",1.3).attr("opacity",.55);
  const nd=root.append("g").selectAll("g").data(nodes).join("g").style("cursor","pointer");
  nd.append("circle").attr("r",rr).attr("fill",d=>EPC[d.m.e]).attr("opacity",.92)
    .attr("stroke","var(--bg)").attr("stroke-width",1.5);
  nd.append("text").text(d=>d.m.n.replace(/[《》]/g,"")).attr("text-anchor","middle").attr("dy",d=>rr(d)+13)
    .style("font","11.5px var(--sans)").style("fill","var(--ink)").style("paint-order","stroke").style("stroke","var(--bg)").style("stroke-width","2.5px");
  nd.append("text").text(d=>d.m.y).attr("text-anchor","middle").attr("dy",4)
    .style("font",`600 10px var(--sans)`).style("fill","var(--bg)").style("pointer-events","none");
  const sim=d3.forceSimulation(nodes)
    .force("link",d3.forceLink(links).id(d=>d.id).distance(72).strength(.5))
    .force("charge",d3.forceManyBody().strength(-210))
    .force("center",d3.forceCenter(W/2,H/2))
    .force("collide",d3.forceCollide().radius(d=>rr(d)+16))
    .stop();
  for(let i=0;i<220;i++)sim.tick();
  lk.attr("d",d=>`M${d.source.x} ${d.source.y}Q${(d.source.x+d.target.x)/2+(d.target.y-d.source.y)*.08} ${(d.source.y+d.target.y)/2-(d.target.x-d.source.x)*.08} ${d.target.x} ${d.target.y}`);
  nd.attr("transform",d=>`translate(${d.x},${d.y})`);
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const bx0=Math.min(...xs)-50,bx1=Math.max(...xs)+50,by0=Math.min(...ys)-50,by1=Math.max(...ys)+50;
  const k=Math.min(W/(bx1-bx0),H/(by1-by0),1.4);
  root.attr("transform",`translate(${W/2-k*(bx0+bx1)/2},${H/2-k*(by0+by1)/2}) scale(${k})`);
  const zm=d3.zoom().scaleExtent([.3,4.5]).on("zoom",e=>root.attr("transform",e.transform));
  svg.call(zm).call(zm.transform,d3.zoomIdentity.translate(W/2-k*(bx0+bx1)/2,H/2-k*(by0+by1)/2).scale(k));
  function applyFilter(){
    nd.attr("opacity",d=>vis(d)?1:.12);
    lk.attr("opacity",d=>vis({m:byId[d.source.id]})&&vis({m:byId[d.target.id]})?.55:.05);
  }
  applyFilter();
  const tip=$("#tltip");
  nd.on("click",(e,d)=>openM(d.id))
    .on("mousemove",(e,d)=>{tip.style.display="block";tip.style.left=(e.clientX+14)+"px";tip.style.top=(e.clientY+10)+"px";
      const rl=links.filter(l=>l.source.id===d.id||l.target.id===d.id).slice(0,6)
        .map(l=>`<span style="color:${RELC[l.cat]}">${l.t}</span> ${byId[l.source.id===d.id?l.target.id:l.source.id].n}`).join("<br>");
      tip.innerHTML=`<b>${d.m.n}</b> · ${d.m.d}<br>${rl||""}`})
    .on("mouseleave",()=>tip.style.display="none");
}
function init3D(rebuild){
  const el=$("#net3d");
  if(net3d&&!rebuild)return;
  el.querySelectorAll("canvas").length&&(el.innerHTML='<div class="hint3d">拖拽旋转 · 滚轮缩放 · 影响关系沿连线流动</div>');
  const {nodes,links}=netData();
  const vis=d=>netFilter==="all"||d.m.e===netFilter;
  net3d=ForceGraph3D()(el)
    .width(el.clientWidth||1100).height(720)
    .backgroundColor("rgba(0,0,0,0)")
    .graphData({nodes:nodes.filter(vis),links:links.filter(l=>{const a=byId[typeof l.source==="string"?l.source:l.source.id],b=byId[typeof l.target==="string"?l.target:l.target.id];return (netFilter==="all"||(a.e===netFilter&&b.e===netFilter))})})
    .nodeLabel(d=>`${d.m.n} · ${d.m.d}`)
    .nodeColor(d=>EPC[d.m.e])
    .nodeVal(d=>2+Math.min(d.deg,12))
    .linkColor(l=>RELC[l.cat]).linkOpacity(.45)
    .linkDirectionalParticles(RM?0:1.6).linkDirectionalParticleSpeed(.004)
    .onNodeClick(d=>openM(d.id));
  if(!RM){let ang=0;if(window._orbi)clearInterval(window._orbi);
    window._orbi=setInterval(()=>{if(netMode!=="3d"||!net3d)return;ang+=.0021;net3d.cameraPosition({x:600*Math.sin(ang),y:90,z:600*Math.cos(ang)})},40)}
}
$("#tog2d").onclick=()=>{netMode="2d";$("#tog2d").classList.add("on");$("#tog3d").classList.remove("on");$("#net3d").style.display="none";$("#netwrap2d").style.display="block";net2d=null;init2D()};
$("#tog3d").onclick=()=>{netMode="3d";$("#tog3d").classList.add("on");$("#tog2d").classList.remove("on");$("#netwrap2d").style.display="none";$("#net3d").style.display="block";init3D(true)};

/* ══════════ 谱系 ══════════ */
let linFilter="all";
function renderLinChips(){
  $("#linchips").innerHTML=[["all","全部"],...LINEAGES.map(t=>[t.id,t.t])].map(([k,z])=>`<button class="chip ${linFilter===k?'on':''}" data-k="${k}">${z}</button>`).join("");
  $("#linchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{linFilter=b.dataset.k;renderLinChips();renderLineage()});
}
function renderLineage(){
  const trails=linFilter==="all"?LINEAGES:LINEAGES.filter(x=>x.id===linFilter);
  $("#linwrap").innerHTML=trails.map(tr=>{
    const col=EPC[tr.ep];
    const ids=tr.nodes.filter(id=>byId[id]);
    let flow="";
    ids.forEach((id,i)=>{
      const m=byId[id];
      flow+=`<div class="linnode" data-m="${id}">${med(m,52)}<span>${m.n}</span><small>${m.d}</small></div>`;
      if(i<ids.length-1){
        const nx=ids[i+1],e=L.find(l=>(l[0]===id&&l[1]===nx)||(l[0]===nx&&l[1]===id));
        flow+=`<div class="linarr">→<small>${e?e[2]:"接续"}</small></div>`;
      }
    });
    return `<div class="lintrail" style="--tc:${col}">
      <div class="linhead"><h4>${tr.t}</h4><p>${tr.m}</p></div>
      <div class="linflow">${flow}</div></div>`;
  }).join("");
  $("#linwrap").querySelectorAll("[data-m]").forEach(el=>el.onclick=()=>openM(el.dataset.m));
}

/* ══════════ 器物志 ══════════ */
let baDone=false;
function renderBa(){
  if(baDone)return;baDone=true;
  const cats=BAYIN.cats||[];
  $("#bawrap").innerHTML=`
  <div class="bayinhero"><div class="mlat">ORGANOGRAPHIA · 八音</div><h2>器物志</h2>
    <div class="essay">${xlink(BAYIN.essay||"")}</div></div>
  ${cats.map(c=>{
    const ms=(c.ids||[]).map(id=>byId[id]).filter(Boolean);
    if(!ms.length)return"";
    return `<div class="bacat"><div class="bch">${c.cat}</div><div class="bnote">${c.note||""}</div></div>
    <div class="bagrid">${ms.map(cardHTML).join("")}</div>`}).join("")}`;
}

/* ══════════ 史境 ══════════ */
let histFilter="all";
function renderHistChips(){
  $("#histchips").innerHTML=[["all","全部"],...EPK.map(k=>[k,EP[k].zh])].map(([k,z])=>`<button class="chip ${histFilter===k?'on':''}" data-k="${k}">${z}</button>`).join("");
  $("#histchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{histFilter=b.dataset.k;renderHistChips();renderHist()});
}
function renderHist(){
  const evs=HISTEVENTS.filter(e=>histFilter==="all"||e.e===histFilter).sort((a,b)=>a.y-b.y);
  $("#histwrap").innerHTML='<div class="histline">'+evs.map((ev,i)=>{
    const col=EPC[ev.e],side=i%2===0?"left":"right";
    const yl=ev.y<0?"前"+(-ev.y):(ev.y<1000?"公元"+ev.y:ev.y)+"";
    const mus=(ev.m||[]).filter(id=>byId[id]).map(id=>{const m=byId[id];
      return `<span data-m="${id}" title="${m.n}">${med(m,34)}</span>`}).join("");
    const hasDeep=HISTDEEP[ev.y]||HISTDEEP[String(ev.y)];
    return `<div class="hrow ${side}" style="--hc:${col}">
      <div class="hmid"><div class="hdot"></div><div class="hyear">${yl}</div><div class="hstem"></div></div>
      <div class="hcard${hasDeep?' deep':''}" data-y="${ev.y}">
        <div class="hmeta"><span class="hep">${EP[ev.e].zh}</span> · 📍 ${ev.l||""}</div>
        <h4>${ev.t}</h4><p>${xlink(ev.b)}</p>
        <div class="hfaces">${mus}</div>
        ${hasDeep?'<div class="hmore">◈ 深读：背景 · 现场 · 回响</div>':""}
      </div></div>`;
  }).join("")+"</div>";
  $("#histwrap").querySelectorAll(".hfaces [data-m]").forEach(el=>el.onclick=e=>{e.stopPropagation();openM(el.dataset.m)});
  $("#histwrap").querySelectorAll(".hcard.deep").forEach(el=>el.onclick=()=>openHist(+el.dataset.y));
}
function openHist(y){
  const ev=HISTEVENTS.find(e=>e.y===y);if(!ev)return;
  const dp=HISTDEEP[y]||HISTDEEP[String(y)];if(!dp)return;
  const col=EPC[ev.e];
  const yl=ev.y<0?"公元前 "+(-ev.y):(ev.y<1000?"公元 "+ev.y:ev.y+" 年");
  const mus=(ev.m||[]).filter(id=>byId[id]).map(id=>{const m=byId[id];
    return `<span data-m="${id}" style="cursor:pointer" title="${m.n}">${med(m,40)}</span>`}).join("");
  const seg=(cls,label,txt)=>txt?`<div class="hseg ${cls}"><h5>${label}</h5><p>${xlink(txt)}</p></div>`:"";
  $("#dwrap").innerHTML=`
  <div class="dhead" style="border-color:${col}">
    <div><div class="hdmeta" style="color:${col}">${EP[ev.e].zh} · ${yl} · 📍 ${ev.l||""}</div>
    <h4>${ev.t}</h4></div>
    <button class="dclose" id="dx" aria-label="关闭">✕</button></div>
  <div class="histdeep" style="--ec:${col}">
    ${seg("","背 景",dp.back)}${seg("","现 场",dp.scene)}${seg("","回 响",dp.after)}
    ${dp.src?`<p class="citeline">史料 — ${dp.src}</p>`:""}
    <div class="hfaces" style="margin-top:14px">${mus}</div>
  </div>`;
  const dg=$("#dlg");if(!dg.open)dg.showModal();
  $("#dx").onclick=()=>dg.close();
  $("#dwrap").querySelectorAll("[data-m]").forEach(a=>a.onclick=()=>openM(a.dataset.m));
}

/* ══════════ 乐学 ══════════ */
let musioDone=false;
function renderMusio(){
  if(musioDone)return;musioDone=true;
  const Y=YUEXUE||{};
  const lv=(Y.lvlv||[]).map(x=>`<div class="lvcard" ${x.i?`data-m="${x.i}"`:""}>
    <div class="lvy">${x.d||""}</div><h4>${x.n}</h4><div class="lvt">${x.t||""}</div><p>${xlink(x.b||"")}</p></div>`).join("");
  const turns=(Y.turns||[]).map(t=>`<div class="mturn"><div class="mty">${t[0]}</div><p>${t[1]}</p></div>`).join("");
  const figs=(Y.cnfig||[]).map(f=>`<div class="mfig" ${f.i&&byId[f.i]?`data-m="${f.i}"`:`data-mf="${f.i||f.n}"`}>
    <div>${med({i:f.i,n:f.n,y:"人"},64)}</div>
    <div class="mfbody"><h4>${f.n}</h4><div class="mforig">${f.o||""} · ${f.d||""}${f.grp?` · ${f.grp}`:""}</div><p>${f.note||""}</p></div></div>`).join("");
  const texts=(Y.texts||[]).map(t=>`<div class="mtext"><div class="mtyr">${t[0]}</div><div><b>${t[1]}</b><br><span>${t[2]}</span></div></div>`).join("");
  $("#musiowrap").innerHTML=`
  <div class="musiohero"><div class="mlat">MUSICOLOGIA SINICA</div><h2>乐学两千年</h2>
    <div class="msub">上篇：律吕之学——从三分损益到新法密率，中国人用两千年算尽一个八度。下篇：现代之学——二十世纪，音乐史如何成为一门学科；本年鉴所据的四部书，即这门学科的四块基石。</div></div>
  <div class="mintro">${(Y.essay||[]).map(p=>`<p>${xlink(p)}</p>`).join("")}</div>
  ${Y.thesis?`<div class="mthesis"><b>THEMA · 核心论断</b><p>${Y.thesis}</p></div>`:""}
  <h3 class="rub">律吕之学</h3><p class="rubsub">生律之法的两千年接力。</p>
  <div class="lvgrid">${lv}</div>
  <h3 class="rub">修史之变</h3><p class="rubsub">二十世纪中国音乐史学的几次转向。</p>
  <div class="mturns">${turns}</div>
  <div class="mcn">
  <h3 class="rub">现代之学</h3><p class="rubsub">从王光祈到黄翔鹏：学科的建立，与本年鉴四部据本的作者们。</p>
  <div class="mintro">${(Y.cnEssay||[]).map(p=>`<p>${xlink(p)}</p>`).join("")}</div>
  <div class="mfgrid">${figs}</div></div>
  <h3 class="rub">乐书要籍</h3><p class="rubsub">先秦至二十世纪：十二部改变中国音乐知识形态的书。</p>
  <div class="mtexts">${texts}</div>`;
  $("#musiowrap").querySelectorAll("[data-m]").forEach(el=>el.onclick=()=>openM(el.dataset.m));
}

/* ══════════ 词表 ══════════ */
let glFilter="all";
function renderGlChips(){
  $("#glchips").innerHTML=[["all","全部"],...EPK.map(k=>[k,EP[k].zh])].map(([k,z])=>`<button class="chip ${glFilter===k?'on':''}" data-k="${k}">${z}</button>`).join("");
  $("#glchips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{glFilter=b.dataset.k;renderGlChips();renderGloss()});
}
function renderGloss(){
  const gs=GLOSS.filter(g=>glFilter==="all"||g.ep===glFilter);
  $("#glgrid").innerHTML=gs.map(g=>`<div class="gcard"><h4>${g.term}</h4><div class="orig">${g.orig||""}</div><p>${xlink(g.def)}</p><div class="gep">${EP[g.ep]?EP[g.ep].zh:""}</div></div>`).join("");
}

/* ══════════ 检索 ══════════ */
const qi=$("#q"),sres=$("#sres");
qi.addEventListener("input",()=>{
  const q=qi.value.trim().toLowerCase();
  if(!q){sres.style.display="none";return}
  const hits=M.filter(m=>(m.n+(m.o||"")+(m.s||"")+(m.w||[]).join("")+(m.k||"")).toLowerCase().includes(q)).slice(0,14);
  sres.innerHTML=hits.map(m=>`<div data-m="${m.i}"><span class="sm">${med(m,32)}</span><div><span class="sn">${m.n}</span><small>${m.d} · ${EP[m.e].zh} · ${m.s}</small></div></div>`).join("")||`<div><small>无结果</small></div>`;
  sres.style.display="block";
  sres.querySelectorAll("[data-m]").forEach(el=>el.onclick=()=>{sres.style.display="none";qi.value="";openM(el.dataset.m)});
});
document.addEventListener("click",e=>{if(!e.target.closest(".search"))sres.style.display="none"});

/* ══════════ 视图切换与路由 ══════════ */

function setView(v){
  const b=document.querySelector(`#views button[data-v="${v}"]`);if(!b)return;
  document.querySelectorAll("#views button").forEach(x=>x.classList.toggle("on",x===b));
  VIEWS.forEach(k=>$("#v-"+k).classList.toggle("on",k===v));
  const app=$("#app");
  app.dataset.ep=(v==="alm")?curEp:(v==="map"?"atlas":app.dataset.ep);
  if(v==="alm")app.dataset.ep=curEp;
  if(v==="map"){app.dataset.ep="atlas";renderMapChips();renderMap()}
  if(v==="tl")renderTL();
  if(v==="net"){renderNetChips();netLegend();if(netMode==="2d"){net2d=null;init2D()}else init3D(true)}
  if(v==="lin"){renderLinChips();renderLineage()}
  if(v==="ba")renderBa();
  if(v==="hist"){renderHistChips();renderHist()}
  if(v==="musio")renderMusio();
  if(v==="gl"){renderGlChips();renderGloss()}
  setHash("v="+v);
}
$("#views").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;setView(b.dataset.v);
});
document.addEventListener("click",e=>{const c=e.target.closest(".card");if(c)openM(c.dataset.m)});
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&e.target.closest){const c=e.target.closest(".card");if(c){openM(c.dataset.m);return}}
  const dlg=$("#dlg");
  if(dlg.open){
    if(e.key==="ArrowLeft"){const b=$("#dprev");b&&b.click()}
    if(e.key==="ArrowRight"){const b=$("#dnext");b&&b.click()}
  }
});
document.addEventListener("click",e=>{const a=e.target.closest("a.xl");if(a)openM(a.dataset.m)});
window.addEventListener("popstate",()=>{if(!location.hash){$("#dlg").open&&$("#dlg").close()}else readHash()});
function readHash(){
  const h=decodeURIComponent(location.hash.replace(/^#/,""));
  if(h.startsWith("v="))setView(h.slice(2));
  if(h.startsWith("m=")&&byId[h.slice(2)])openM(h.slice(2));
}

/* ══════════ 开卷与统计 ══════════ */

$("#introgrid").innerHTML=VIEWDESC.map(v=>`<div><b>${v[0]}</b><span>${v[1]}</span></div>`).join("");
const tcnt={};M.forEach(m=>tcnt[m.y]=(tcnt[m.y]||0)+1);
$("#stats").textContent=`${M.length} 条目 · ${TYPES.map(t=>t+(tcnt[t]||0)).join(" · ")} · ${L.length} 重关系`;
const intro=$("#intro");
function showIntro(){if(!intro.open)intro.showModal()}
function closeIntro(){try{intro.close()}catch(e){}try{localStorage.setItem("sinarum_seen","1")}catch(e){}}
$("#introx").onclick=closeIntro;$("#introgo").onclick=closeIntro;
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&intro.open)closeIntro()});

renderEpnav();renderAlm();
let seen=false;try{seen=!!localStorage.getItem("sinarum_seen")}catch(e){}
if(location.hash)readHash();else if(!seen)setTimeout(showIntro,__mirrorDirection?700:0);
