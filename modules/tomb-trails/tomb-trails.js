const museumLabels={qinhan:'秦汉馆',xian:'西安博物院',history:'陕西历史博物馆',archaeology:'陕西考古博物馆',baoji:'宝鸡青铜器博物院',beilin:'西安碑林博物馆'};
const museumKeys={qinhan:'qinhan','xian-museum':'xian','shaanxi-history':'history','shaanxi-archaeology-museum':'archaeology',baoji:'baoji',beilin:'beilin'};
const state={all:[],items:[],index:0};
if(new URLSearchParams(location.search).get('embed')==='1')document.body.classList.add('is-embedded');
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
  const host=$('#slides');
  host.innerHTML=state.items.map((p,i)=>`<article class="slide" data-index="${i}" aria-label="${i+1} / ${state.items.length}"><div class="slide-visual">${p.image?`<figure class="site-image"><img src="${esc(p.image)}" alt="${esc(p.name)}相关现场图" loading="${i<2?'eager':'lazy'}" decoding="async"><figcaption>${esc(p.credit||'图像来源与性质待补充')}</figcaption></figure>`:`<div class="site-image image-pending" role="img" aria-label="${esc(p.name)}现场图待核"><span>现场图待核</span><small>未找到能确认对应地点的图像，本条不使用替代文物照</small></div>`}</div><div class="slide-meta"><span class="slide-index">${String(i+1).padStart(2,'0')} / ${String(state.items.length).padStart(2,'0')}</span><h3>${esc(p.name)}</h3><p class="kind">${esc(p.museumName)} · ${esc(p.kind)}</p><dl class="facts"><div><dt>墓主／遗址</dt><dd>${esc(p.history)}</dd></div><div><dt>发现与发掘</dt><dd>${esc(p.date)}。${esc(p.discovery)}</dd></div><div><dt>馆藏关联</dt><dd>${esc(p.objects)}</dd></div><div><dt>研究意义</dt><dd>${esc(p.value)}</dd></div></dl><div class="source-links">${(p.source||[]).map(s=>`<a href="${esc(s[1])}" target="_blank" rel="noreferrer">${esc(s[0])} ↗</a>`).join('')}</div></div></article>`).join('');
  $('#trail-count').textContent=`${state.items.length} 个地点`;
  $('#position').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(state.items.length).padStart(2,'0')}`;
  host.scrollTo({left:host.clientWidth*state.index,behavior:'auto'});
}
function move(delta){if(!state.items.length)return;state.index=(state.index+delta+state.items.length)%state.items.length;$('#slides').scrollTo({left:$('#slides').clientWidth*state.index,behavior:'smooth'});$('#position').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(state.items.length).padStart(2,'0')}`;}
function filter(m){state.items=m==='all'?state.all:state.all.filter(p=>p.museum===m);state.index=0;render();document.querySelectorAll('.museum-tab').forEach(b=>b.classList.toggle('is-active',b.dataset.museum===m));}
$('#prev').addEventListener('click',()=>move(-1));
$('#next').addEventListener('click',()=>move(1));
document.querySelectorAll('.museum-tab').forEach(b=>b.addEventListener('click',()=>filter(b.dataset.museum)));
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);});
$('#slides').addEventListener('scroll',()=>{const el=$('#slides');const i=Math.round(el.scrollLeft/el.clientWidth);if(i!==state.index&&i>=0&&i<state.items.length){state.index=i;$('#position').textContent=`${String(i+1).padStart(2,'0')} / ${String(state.items.length).padStart(2,'0')}`;}});
fetch('./tomb-trails-data.json').then(r=>r.json()).then(data=>{state.all=data.map(p=>({...p,museum:museumKeys[p.museum]||p.museum}));const requested=new URLSearchParams(location.search).get('museum');filter(requested&&Object.keys(museumLabels).includes(requested)?requested:'all');}).catch(err=>{$('#slides').innerHTML=`<p class="load-error">专题资料读取失败：${esc(err.message)}</p>`;});
