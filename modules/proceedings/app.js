/* ============================================================
   西方音乐学会第八届年会 · 数字纪要 — 前端应用
   ============================================================ */
'use strict';

const CATS = {
  '中国视野与自主知识体系':'自主','音乐史学与方法论':'史学','音乐美学与哲学':'美学',
  '歌剧研究':'歌剧','巴洛克与古乐':'巴洛克','作曲家与作品研究':'作曲家',
  '音乐社会学':'社会学','接受史':'接受史','全球音乐史':'全球',
  '中西比较与文明互鉴':'中西','表演研究':'表演','20世纪与现当代音乐':'现当代',
  '流行音乐与跨界':'流行'
};
const catColor = name => `var(--cat-${CATS[name]||'其他'})`;
const TYPE_LABEL = {keynote:'主旨发言',formal:'分会场发言',poster:'论文述要展板'};
const esc = s => (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const App = {
  data:null, talks:[], filters:{type:'',day:'',cat:'',q:''}, lb:{list:[],i:0},

  init(){
    this.data = window.SITE_DATA || {talks:[]};
    this.talks = (this.data.talks||[]).map((t,i)=>({id:t.id||('t'+i), ...t}));
    // 顶部统计
    const s=this.stats();
    document.getElementById('topStat').textContent = `${s.total} 场 · ${s.slides} 幻灯 · ${s.photos} 照片`;
    document.getElementById('footNote').textContent = this.data.conference
      ? `${this.data.conference.title} · ${this.data.conference.host} · ${this.data.conference.dates}` : '';
    // tabs
    document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>this.go(b.dataset.tab));
    // search
    const si=document.getElementById('search');
    let deb; si.addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>{
      this.filters.q=si.value.trim();
      if(this.filters.q && this.cur!=='all') this.go('all'); else this.renderAll();
    },160);});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){this.closeLB();this.closePanel();}
      if(this.lbOpen){if(e.key==='ArrowLeft')this.lbNav(-1);if(e.key==='ArrowRight')this.lbNav(1);}
    });
    this.renderers={overview:()=>this.renderOverview(),keynote:()=>this.renderKeynotes(),all:()=>this.renderAll(),
      schedule:()=>this.renderSchedule(),photos:()=>this.renderPhotos(),themes:()=>this.renderThemes()};
    this._rendered={};
    this.go('overview');
  },

  src(p){ return (window.IMAGES&&window.IMAGES[p])||p; },
  thumb(p){
    if(!p) return p;
    if(window.IMAGES) return window.IMAGES[p]||p;
    if(p.indexOf('assets/photos/')===0) return p.replace('assets/photos/','assets/photos_thumb/');
    if(p.indexOf('assets/slides/')===0) return p.replace('assets/slides/','assets/slides_thumb/').replace(/\.png$/i,'.jpg');
    return p;
  },

  stats(){
    const t=this.talks;
    const slides=t.reduce((a,x)=>a+((x.slides||[]).length),0);
    const photos=t.reduce((a,x)=>a+((x.photos||[]).length),0);
    return {
      total:t.length,
      keynote:t.filter(x=>x.session_type==='keynote').length,
      formal:t.filter(x=>x.session_type==='formal').length,
      poster:t.filter(x=>x.session_type==='poster').length,
      slides, photos,
      abstracts:t.filter(x=>x.abstract_full).length
    };
  },

  go(tab){
    this.cur=tab;
    if(!this._rendered[tab] && this.renderers[tab]){ this.renderers[tab](); this._rendered[tab]=true; }
    document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+tab).classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  },

  /* ---------------- 概览 ---------------- */
  renderOverview(){
    const c=this.data.conference||{}, s=this.stats();
    const catCounts=this.catCounts();
    const el=document.getElementById('view-overview');
    el.innerHTML=`
    <div class="hero">
      <div class="kicker">Society of Western Music in China · 8th Annual Conference</div>
      <div class="hero-year">2026 · 北京</div>
      <h1>中国音乐家协会西方音乐学会<br>第八届年会</h1>
      <div class="meta">
        <span><b>主办</b>　${esc(c.host||'')}</span>
        <span><b>会期</b>　${esc(c.dates||'')}</span>
        <span><b>会场</b>　${esc(c.venue||'')}</span>
      </div>
      ${this.data.overview_lead?`<p class="lead">${esc(this.data.overview_lead)}</p>`:''}
    </div>
    <div class="stats">
      <div class="stat"><div class="num">${s.total}</div><div class="lbl">发言与展板</div></div>
      <div class="stat"><div class="num">${s.keynote}</div><div class="lbl">主旨发言</div></div>
      <div class="stat"><div class="num">${s.formal}</div><div class="lbl">分会场发言</div></div>
      <div class="stat"><div class="num">${s.poster}</div><div class="lbl">论文述要展板</div></div>
      <div class="stat"><div class="num">${s.slides}</div><div class="lbl">幻灯片存档</div></div>
      <div class="stat"><div class="num">${s.photos}</div><div class="lbl">现场照片</div></div>
    </div>
    ${this.data.narrative?`
    <section>
      <h2 class="section-title">会议综述<span class="en">Synopsis</span></h2>
      <div class="narrative">${this.data.narrative}</div>
    </section>`:''}
    <section>
      <h2 class="section-title">主题分布<span class="en">Thematic Distribution</span></h2>
      <p class="section-desc">点击任一主题可在「全部发言」中筛选。</p>
      <div class="treemap">${catCounts.map(([name,n])=>`
        <div class="tm-cell" style="background:${catColor(name)}" onclick="App.filterCat('${esc(name)}')">
          <div class="tm-name">${esc(name)}</div>
          <div class="tm-count"><b>${n}</b> 场</div>
        </div>`).join('')}</div>
    </section>`;
  },

  catCounts(){
    const m={};
    this.talks.forEach(t=>(t.categories||[]).forEach(c=>m[c]=(m[c]||0)+1));
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },

  filterCat(name){this.filters={type:'',day:'',cat:name,q:''};document.getElementById('search').value='';this.go('all');this.renderAll();},

  /* ---------------- 主旨发言 ---------------- */
  renderKeynotes(){
    const ks=this.talks.filter(t=>t.session_type==='keynote');
    const el=document.getElementById('view-keynote');
    el.innerHTML=`
    <section>
      <h2 class="section-title">主旨发言<span class="en">Keynote Addresses</span></h2>
      <p class="section-desc">2026年6月26日上午 · 琴房楼演奏厅 · 主持人：何宽钊。八位学者就"中国自主知识体系建构下的西方音乐研究"这一总主题作主旨发言。</p>
      <div class="keynote-grid">
        ${ks.map((t,i)=>`
        <div class="kcard" onclick="App.openPanel('${t.id}')">
          <div class="k-idx">主旨 ${String(i+1).padStart(2,'0')}</div>
          <h3>${esc(t.title)}</h3>
          <div class="k-author">${esc(t.name)}</div>
          <div class="k-aff">${esc(t.affiliation)}</div>
          ${t.thesis?`<div class="k-thesis">${esc(t.thesis)}</div>`:(t.summary?`<div class="k-thesis">${esc(t.summary).slice(0,110)}…</div>`:'')}
          <div class="k-foot">
            ${(t.slides&&t.slides.length)?`<span>▤ ${t.slides.length} 页幻灯</span>`:''}
            ${(t.categories||[]).slice(0,2).map(c=>`<span>${esc(c)}</span>`).join('')}
          </div>
        </div>`).join('')||'<p class="empty">主旨发言解读生成中……</p>'}
      </div>
    </section>`;
  },

  /* ---------------- 全部发言（筛选+检索） ---------------- */
  renderAll(){
    const el=document.getElementById('view-all');
    const f=this.filters, cats=this.catCounts();
    const typeCounts={keynote:0,formal:0,poster:0};
    this.talks.forEach(t=>typeCounts[t.session_type]!=null&&typeCounts[t.session_type]++);
    const filtered=this.applyFilters();
    el.innerHTML=`
    <section>
      <h2 class="section-title">全部发言<span class="en">All Presentations</span></h2>
      <div class="filters">
        <div class="filter-row">
          <span class="flabel">类型</span>
          <span class="chip ${f.type===''?'active':''}" onclick="App.setF('type','')">全部</span>
          ${Object.entries(TYPE_LABEL).map(([k,v])=>`<span class="chip ${f.type===k?'active':''}" onclick="App.setF('type','${k}')">${v}<span class="c-count">${typeCounts[k]||0}</span></span>`).join('')}
        </div>
        <div class="filter-row">
          <span class="flabel">会期</span>
          <span class="chip ${f.day===''?'active':''}" onclick="App.setF('day','')">全部</span>
          <span class="chip ${f.day==='06-26'?'active':''}" onclick="App.setF('day','06-26')">6月26日</span>
          <span class="chip ${f.day==='06-27'?'active':''}" onclick="App.setF('day','06-27')">6月27日</span>
        </div>
        <div class="filter-row">
          <span class="flabel">主题</span>
          <span class="chip cat ${f.cat===''?'active':''}" onclick="App.setF('cat','')">全部</span>
          ${cats.map(([name,n])=>`<span class="chip cat ${f.cat===name?'active':''}" style="${f.cat===name?`background:${catColor(name)};border-color:${catColor(name)}`:''}" onclick="App.setF('cat','${esc(name)}')">${esc(name)}<span class="c-count">${n}</span></span>`).join('')}
        </div>
      </div>
      <p class="result-count">共 ${filtered.length} 条${f.q?`　·　检索"${esc(f.q)}"`:''}${f.cat?`　·　主题「${esc(f.cat)}」`:''}</p>
      <div class="grid">${filtered.map(t=>this.card(t)).join('')||'<p class="empty">未找到匹配结果。</p>'}</div>
    </section>`;
  },

  setF(k,v){this.filters[k]=(this.filters[k]===v?'':v);this.renderAll();},

  applyFilters(){
    const f=this.filters, q=f.q.toLowerCase();
    return this.talks.filter(t=>{
      if(f.type&&t.session_type!==f.type)return false;
      if(f.day&&t.day!==f.day)return false;
      if(f.cat&&!(t.categories||[]).includes(f.cat))return false;
      if(q){
        const hay=[t.name,t.affiliation,t.title,t.summary,t.abstract_full,t.thesis,(t.keywords||[]).join(' '),(t.categories||[]).join(' '),(t.figures_cited||[]).join(' ')].join(' ').toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    });
  },

  card(t){
    const col=catColor((t.categories||[])[0]);
    const badges=[];
    if(t.slides&&t.slides.length)badges.push('<span class="badge-mini" title="含发言人完整幻灯片">▤</span>');
    if(t.photos&&t.photos.length)badges.push('<span class="badge-mini" title="含现场照片">▦</span>');
    if(t.abstract_full)badges.push('<span class="badge-mini" title="含论文述要">§</span>');
    const meta=[t.day?('6月'+t.day.slice(3)+'日'):'',t.room,t.period].filter(Boolean);
    return `<div class="card ${t.spotlight?'spotlight':''}" onclick="App.openPanel('${t.id}')" style="--cat-其他:${col}">
      <div class="c-top">
        <span class="c-type type-${t.session_type}">${TYPE_LABEL[t.session_type]||''}</span>
        <span class="c-badges">${badges.join('')}</span>
      </div>
      <h3>${esc(t.title)}</h3>
      <div><span class="c-author">${esc(t.name)}</span></div>
      <div class="c-aff">${esc(t.affiliation)}</div>
      ${t.summary?`<p class="c-summary">${esc(t.summary)}</p>`:(t.context_note?`<p class="c-summary c-context">${esc(t.context_note)}</p>`:'')}
      ${(t.categories||t.keywords)?`<div class="c-foot">${(t.categories||[]).map(c=>`<span class="c-tag" style="background:${catColor(c)}22;color:${catColor(c)}">${esc(c)}</span>`).join('')}${(t.keywords||[]).slice(0,3).map(k=>`<span class="c-tag">${esc(k)}</span>`).join('')}</div>`:''}
      ${meta.length?`<div class="c-meta"><span>${meta.map(esc).join('</span><span>')}</span></div>`:''}
    </div>`;
  },

  /* ---------------- 详情面板 ---------------- */
  openPanel(id){
    const t=this.talks.find(x=>x.id===id);if(!t)return;
    const p=document.getElementById('panel');
    const meta=[];
    if(t.day)meta.push(`<span><b>日期</b> 6月${t.day.slice(3)}日</span>`);
    if(t.period)meta.push(`<span><b>时段</b> ${esc(t.period)}</span>`);
    if(t.room)meta.push(`<span><b>会场</b> ${esc(t.room)}</span>`);
    if(t.chair)meta.push(`<span><b>主持</b> ${esc(t.chair)}</span>`);
    if(t.group_theme)meta.push(`<span><b>分组</b> ${esc(t.group_theme)}</span>`);
    if(t.seq)meta.push(`<span><b>序号</b> ${esc(t.seq)}</span>`);
    const secs=[];
    if(t.thesis)secs.push(`<h4>核心论点</h4><p class="p-thesis">${esc(t.thesis)}</p>`);
    if(t.summary)secs.push(`<h4>学术提要${t.summary_src==='photo'?'<span class="src-note">据现场幻灯片整理</span>':''}</h4><div class="p-summary">${esc(t.summary)}</div>`);
    if(!t.summary&&t.context_note)secs.push(`<h4>研究背景 · 选题脉络<span class="src-note">编者导读</span></h4><div class="p-context">${esc(t.context_note)}</div>`);
    if(t.argument_structure&&t.argument_structure.length)secs.push(`<h4>论证结构</h4><ul class="arg-list">${t.argument_structure.map(a=>`<li><span class="arg-sec">${esc(a.section)}</span>${(a.points&&a.points.length)?`<ul class="arg-pts">${a.points.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</li>`).join('')}</ul>`);
    if(t.slides&&t.slides.length)secs.push(`<h4>发言人幻灯片 · ${t.slides.length} 页</h4><p class="gallery-note">点击放大浏览。</p><div class="gallery slides">${t.slides.map((s,i)=>`<img loading="lazy" src="${esc(this.thumb(s))}" onclick="App.openLB('slides','${t.id}',${i})">`).join('')}</div>`);
    if(t.photos&&t.photos.length)secs.push(`<h4>现场照片 · ${t.photos.length} 张</h4><p class="gallery-note">与会者现场拍摄的投影幻灯片，按拍摄顺序与发言内容自动匹配（同一时段相邻发言主题相近时，个别照片归属或有出入）。点击放大。</p><div class="gallery">${t.photos.map((ph,i)=>`<img loading="lazy" src="${esc(this.thumb(ph.file))}" onclick="App.openLB('photos','${t.id}',${i})">`).join('')}</div>`);
    if(t.abstract_full)secs.push(`<h4>论文述要（原文）</h4><div class="p-abstract">${this.paras(t.abstract_full)}</div>`);
    if(t.notable_quotes&&t.notable_quotes.length)secs.push(`<h4>幻灯片摘句</h4><ul class="quote-list">${t.notable_quotes.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>`);
    if(t.figures_cited&&t.figures_cited.length)secs.push(`<h4>涉及人物与文献</h4><div class="cited">${t.figures_cited.map(x=>`<span class="c-item">${esc(x)}</span>`).join('')}</div>`);
    if(t.music_examples&&t.music_examples.length)secs.push(`<h4>作品与谱例</h4><div class="cited">${t.music_examples.map(x=>`<span class="c-item">${esc(x)}</span>`).join('')}</div>`);
    if(t.keywords&&t.keywords.length)secs.push(`<h4>关键词</h4><div class="taglist">${t.keywords.map(k=>`<span class="t">${esc(k)}</span>`).join('')}</div>`);
    if(t.categories&&t.categories.length)secs.push(`<h4>主题归类</h4><div class="taglist">${t.categories.map(c=>`<span class="t" style="background:${catColor(c)}22;color:${catColor(c)};border-color:${catColor(c)}55">${esc(c)}</span>`).join('')}</div>`);

    p.innerHTML=`
      <div class="panel-head">
        <button class="close" onclick="App.closePanel()">×</button>
        <span class="p-type type-${t.session_type}" style="color:#fff">${TYPE_LABEL[t.session_type]||''}</span>
        <h2>${esc(t.title)}</h2>
        <div class="p-author">${esc(t.name)}</div>
        <div class="p-aff">${esc(t.affiliation)}</div>
        ${meta.length?`<div class="p-meta">${meta.join('')}</div>`:''}
      </div>
      <div class="panel-body">${secs.join('')||'<p class="empty">该发言暂无可展示的详细内容（仅存会程信息）。</p>'}</div>`;
    document.getElementById('overlay').classList.add('open');
    p.classList.add('open');p.scrollTop=0;
  },
  closePanel(){document.getElementById('panel').classList.remove('open');document.getElementById('overlay').classList.remove('open');},
  paras(txt){return String(txt).split(/\n{1,}|(?<=。)\s{2,}/).filter(s=>s.trim()).map(s=>`<p>${esc(s.trim())}</p>`).join('')||`<p>${esc(txt)}</p>`;},

  /* ---------------- 灯箱 ---------------- */
  openLB(kind,id,i){
    const t=this.talks.find(x=>x.id===id);if(!t)return;
    const list=(kind==='slides'?t.slides.map(s=>({src:s,cap:''})):t.photos.map((p,k)=>({src:p.file,cap:'照片 #'+(p.id||k+1)})));
    this.lb={list,i};this.lbOpen=true;
    document.getElementById('lightbox').classList.add('open');this.lbShow();
  },
  lbShow(){const {list,i}=this.lb;if(!list[i])return;document.getElementById('lbImg').src=this.src(list[i].src);document.getElementById('lbCap').textContent=`${list[i].cap||''}　${i+1} / ${list.length}`;},
  lbNav(d){this.lb.i=(this.lb.i+d+this.lb.list.length)%this.lb.list.length;this.lbShow();},
  closeLB(){document.getElementById('lightbox').classList.remove('open');this.lbOpen=false;},

  /* ---------------- 会程日历 ---------------- */
  renderSchedule(){
    const el=document.getElementById('view-schedule');
    const days=[['06-26','2026年6月26日（星期五）'],['06-27','2026年6月27日（星期六）']];
    let html=`<section><h2 class="section-title">会程日历<span class="en">Programme</span></h2>
      <p class="section-desc">按日期、时段与会场排列全部发言。点击任一条目查看详情。</p>`;
    days.forEach(([d,label])=>{
      const dt=this.talks.filter(t=>t.day===d);
      if(!dt.length)return;
      html+=`<div class="schedule-day"><div class="sch-daytitle">${label}</div>`;
      // group by period then room
      const periods=[...new Set(dt.map(t=>t.period).filter(Boolean))];
      // keynotes first
      const kn=dt.filter(t=>t.session_type==='keynote');
      if(kn.length){html+=`<div class="sch-block"><div class="sch-slot">主旨发言 · ${esc(kn[0].period||'')}</div><div class="sch-room"><div class="rname"><span>${esc(kn[0].room||'琴房楼演奏厅')}</span></div>${kn.map(t=>this.schTalk(t)).join('')}</div></div>`;}
      periods.forEach(per=>{
        const pt=dt.filter(t=>t.period===per&&t.session_type!=='keynote');
        if(!pt.length)return;
        const rooms=[...new Set(pt.map(t=>t.room).filter(Boolean))];
        html+=`<div class="sch-block"><div class="sch-slot">${esc(per)}</div>`;
        rooms.forEach(r=>{
          const rt=pt.filter(t=>t.room===r);
          const chair=rt.find(t=>t.chair)?.chair;
          html+=`<div class="sch-room"><div class="rname"><span>${esc(r)}</span>${chair?`<span class="chair">主持：${esc(chair)}</span>`:''}</div>${rt.map(t=>this.schTalk(t)).join('')}</div>`;
        });
        html+=`</div>`;
      });
      html+=`</div>`;
    });
    html+=`</section>`;
    el.innerHTML=html;
  },
  schTalk(t){
    const b=[];
    if(t.slides&&t.slides.length)b.push('▤');if(t.photos&&t.photos.length)b.push('▦');if(t.abstract_full)b.push('§');
    return `<div class="sch-talk" onclick="App.openPanel('${t.id}')">
      <span class="st-name">${esc(t.name)}</span>
      <span class="st-title">${esc(t.title)}</span>
      <span class="st-badges">${b.join(' ')}</span></div>`;
  },

  /* ---------------- 现场照片序览 ---------------- */
  renderPhotos(){
    const el=document.getElementById('view-photos');
    const stream=this.data.photo_stream||[];
    const matched=stream.filter(s=>s.talk_id).length;
    el.innerHTML=`<section>
      <h2 class="section-title">现场照片序览<span class="en">Field Photographs</span></h2>
      <p class="section-desc">与会者在会场拍摄的 ${stream.length} 张幻灯片照片（已去重），按拍摄先后排列，并经文字识别自动匹配至相应发言（已匹配 ${matched} 张）。可输入作曲家、概念或发言人筛选；点击查看大图与识别文字。</p>
      <div class="filters"><div class="filter-row"><span class="flabel">筛选</span>
        <input id="pfilter" placeholder="如：瓦格纳 / 达尔豪斯 / 库尔塔格 / 王茜……" style="flex:1;min-width:200px;padding:7px 12px;border:1px solid var(--line-strong);border-radius:8px;background:var(--paper);font-family:var(--sans);font-size:13px">
      </div></div>
      <p class="result-count" id="pcount"></p>
      <div class="pgrid" id="pgrid"></div>
    </section>`;
    const input=document.getElementById('pfilter');
    let deb; input.addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>this.drawPhotos(input.value.trim()),150);});
    this.drawPhotos('');
  },
  drawPhotos(q){
    const stream=this.data.photo_stream||[];
    q=q.toLowerCase();
    const list=q?stream.filter(s=>((s.talk_name||'')+' '+(s.talk_title||'')+' '+(s.keywords||[]).join(' ')+' '+(s.text||'')).toLowerCase().includes(q)):stream;
    this._pstream=list;
    document.getElementById('pcount').textContent=`共 ${list.length} 张`;
    document.getElementById('pgrid').innerHTML=list.map((s,i)=>`
      <figure class="pcell" onclick="App.openStreamLB(${i})">
        <img loading="lazy" src="${esc(App.thumb(s.file))}">
        <figcaption>${s.talk_name?`<b>${esc(s.talk_name)}</b>`:'<span class="pnone">未归入</span>'}<span class="ptype">${esc(s.type||'')}</span></figcaption>
      </figure>`).join('')||'<p class="empty">无匹配照片。</p>';
  },
  openStreamLB(i){
    const list=(this._pstream||[]).map(s=>({src:s.file,cap:`#${s.id}　${s.talk_name?('▸ '+s.talk_name+' · '+(s.talk_title||'')):'未归入具体发言'}${s.text?('　—　'+s.text):''}`,talk_id:s.talk_id}));
    this.lb={list,i};this.lbOpen=true;
    document.getElementById('lightbox').classList.add('open');this.lbShow();
  },

  /* ---------------- 主题地图 ---------------- */
  renderThemes(){
    const el=document.getElementById('view-themes');
    const cats=this.catCounts();
    const svg=this.mindmapSVG(cats);
    el.innerHTML=`<section>
      <h2 class="section-title">主题地图<span class="en">Intellectual Map</span></h2>
      <p class="section-desc">本届年会以"中国自主知识体系建构下的西方音乐研究"为总主题，辐射出方法论、断代、体裁、美学与跨文化诸多论域。节点大小对应发言数量，点击可筛选。</p>
      <div class="mindmap-wrap">${svg}</div>
    </section>
    <section>
      <h2 class="section-title">各主题发言<span class="en">By Theme</span></h2>
      <div class="treemap">${cats.map(([name,n])=>`
        <div class="tm-cell" style="background:${catColor(name)}" onclick="App.filterCat('${esc(name)}')">
          <div class="tm-name">${esc(name)}</div><div class="tm-count"><b>${n}</b> 场</div>
        </div>`).join('')}</div>
    </section>`;
  },
  mindmapSVG(cats){
    const W=960,H=620,cx=W/2,cy=H/2;
    const max=Math.max(...cats.map(c=>c[1]),1);
    const R=230;
    let nodes='',links='';
    cats.forEach(([name,n],i)=>{
      const ang=(-Math.PI/2)+(i/cats.length)*Math.PI*2;
      const x=cx+Math.cos(ang)*R, y=cy+Math.sin(ang)*R;
      const r=16+22*(n/max);
      const col=catColor(name);
      links+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${col}" stroke-width="1.4" opacity=".4"/>`;
      const tx=cx+Math.cos(ang)*(R+r+8), ty=cy+Math.sin(ang)*(R+r+8);
      const anchor=Math.cos(ang)>0.25?'start':(Math.cos(ang)<-0.25?'end':'middle');
      nodes+=`<g class="mm-node" style="cursor:pointer" onclick="App.filterCat('${esc(name)}')">
        <circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity=".9"/>
        <text x="${x}" y="${y+5}" text-anchor="middle" fill="#fff" font-size="15" font-family="'Songti SC','Source Han Serif SC',STSong,SimSun,serif" font-weight="700">${n}</text>
        <text x="${tx}" y="${ty+4}" text-anchor="${anchor}" fill="#3a332c" font-size="13" font-family="var(--sans)">${esc(name)}</text>
      </g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${links}
      <circle cx="${cx}" cy="${cy}" r="86" fill="#7a2620"/>
      <text x="${cx}" y="${cy-8}" text-anchor="middle" fill="#fff" font-size="15" font-family="'Songti SC','Source Han Serif SC',STSong,SimSun,serif" font-weight="700">中国自主知识体系</text>
      <text x="${cx}" y="${cy+14}" text-anchor="middle" fill="#f0d5cd" font-size="13" font-family="'Songti SC','Source Han Serif SC',STSong,SimSun,serif">建构下的西方音乐研究</text>
      ${nodes}
    </svg>`;
  },

};

window.ProceedingsApp = App;
