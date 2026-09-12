/* An astronomical reading of the existing Europa graph. Positions are editorial
   groupings by period; every interactive star and relationship comes from data. */
import {VOLUMES as ATLAS,FLOW_GLSL,EXTINCTION_GLSL,flowPoint,createStellarVolumes} from './stellar-volumes.js?v=20260911-epochs2';
import {bodyFor,createCelestialBodies,createMeteors,createDeepSky} from './celestial-bodies.js?v=20260911-depth3';
import {createRelationshipLines} from './relationship-lines.js?v=20260911-relations3';
import {relationSwatch,EVIDENCE_STATUS} from './relation-styles.js?v=20260911-relations3';
import {ERA_CORES,createEraCores} from './era-cores.js?v=20260911-depth2';
import {createEpochOverview} from './epoch-overview.js?v=20260911-depth2';
import {createCosmicEvents} from './cosmic-events.js?v=20260911-cosmic2';
import {createCelestialPanel} from './celestial-panel.js';
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STAR_NAMES={buso:'布索尼',berl:'柏辽兹',bach:'巴赫',beet:'贝多芬',moza:'莫扎特',hayd:'海顿',lisz:'李斯特',chop:'肖邦',schb:'舒伯特',schm:'舒曼',brah:'勃拉姆斯',wagn:'瓦格纳',verd:'威尔第',pucc:'普契尼',debu:'德彪西',rave:'拉威尔',mahl:'马勒',tcha:'柴科夫斯基',stra:'斯特拉文斯基',scho:'勋伯格',webe:'韦伯恩',mont:'蒙特威尔第',pale:'帕莱斯特里纳',josq:'若斯坎',dufa:'迪费',ocke:'奥克冈',coup:'库普兰',peri:'佩里',cpeb:'C. P. E. 巴赫',cweb:'韦伯',mach:'马肖'};
const WAYFINDERS=new Set(['bach','beet','moza','mont','josq','wagn','debu','stra','mahl','scho','schb','lisz']);
function rng(seed=91745){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(s){let x=2166136261;for(const c of s){x^=c.charCodeAt(0);x=Math.imul(x,16777619);}return x>>>0;}
function rgb(hex,lift=0){const n=parseInt(String(hex||'#acc4cb').replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255].map(x=>x*(1-lift)+lift);}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function project(p,m,w,h){const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],z=m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14],d=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return{x:(x/d*.5+.5)*w,y:(.5-y/d*.5)*h,z:z/d,d};}
function quadratic(a,b,c,t){const s=1-t;return[s*s*a[0]+2*s*t*b[0]+t*t*c[0],s*s*a[1]+2*s*t*b[1]+t*t*c[1],s*s*a[2]+2*s*t*b[2]+t*t*c[2]];}

export function createGalaxy(container,options){
 const {nodes:inputNodes,links:inputLinks,periods,colors,relationColors,portraits,onSelect}=options;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const random=rng();
 const gauss=()=>Math.sqrt(-2*Math.log(Math.max(random(),.00001)))*Math.cos(TAU*random());
 const root=document.getElementById('v-net');root.dataset.epoch='all';
 const $=id=>document.getElementById(id);
 const collapseIntro=()=>root.classList.add('intro-collapsed');
 const restoreIntro=()=>root.classList.remove('intro-collapsed');
 const celestialApplicableVal=()=>state.filter==='all'&&!mode();
 const state={active:false,paused:reduced,filter:'all',medievalPhase:'all',relationTypes:[],selectedId:null,focusId:null,coreFocus:false,hoverId:null,names:false,cruise:false,trail:[],via:null,time:0,atlasReady:false,atlasOpacity:0,atlasError:null};
 const medievalLate=new Set(['vitr','mach','land','jaco','cico']);
 let pendingVisit=null,lastPick=null;
 const home={yaw:-.90,pitch:.43,distance:1260,target:[0,18,0]};
 const camera={...home,target:[...home.target]},goal={...home,target:[...home.target]};
 let raf=0,last=0,width=1,height=1,dpr=1,dirty=true,matrix=null,drag=null,layoutDirty=true,destroyed=false,contextLost=false;
 /* STAGE 9B.1 contextual visual hierarchy: EXPLORE/FOCUS/RELATION derived
    from existing state (via → RELATION, focusId/coreFocus → FOCUS); targets
    are lerped ~300-700ms. Pure render intensity — no scheduling/lifecycle change. */
 const ctxDim = { e: 1, p: 1, c: 1, d: 1, o: 1, b: 1 };
 function ctxTargets() {
  if (state.via) return { e: .32, p: .5, c: .45, d: .6, o: .5, b: .34 };
  if (state.focusId || state.coreFocus) return { e: .45, p: .55, c: .55, d: .68, o: .62, b: .4 };
  return { e: 1, p: 1, c: 1, d: 1, o: 1, b: 1 };
 }
 function ctxStep(dt) {
  const t = ctxTargets(), k = Math.min(1, dt * 4.5);
  for (const key of ['e','p','c','d','o','b']) ctxDim[key] += (t[key] - ctxDim[key]) * k;
 }
 let geometryRevision=0,relationRevision=0,frameRevision=0,cameraEye=[0,0,1300],cameraBasis=null,longFrames=0,obstacles=[];
 const frameIntervals=[];
 container.innerHTML='<canvas class="galaxy-canvas" tabindex="0" aria-label="音乐家三维星丛。拖动旋转，滚轮缩放；方向键调整视角，加减键缩放。点选天体探索人物关联，双击阅读传记。"></canvas><div class="galaxy-shade"></div><div class="galaxy-grain" aria-hidden="true"></div><div class="galaxy-label-layer" aria-label="星丛中的音乐家"></div><div class="galaxy-hover" hidden></div><aside class="galaxy-focus-card" aria-live="polite" hidden></aside>';
 const canvas=container.querySelector('canvas'),labels=container.querySelector('.galaxy-label-layer'),hover=container.querySelector('.galaxy-hover'),card=container.querySelector('.galaxy-focus-card');
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
 if(!gl)throw new Error('WebGL is not available');
 const maxPoint=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
 const epochKeys=Object.keys(periods),groups=Object.fromEntries(epochKeys.map(k=>[k,inputNodes.filter(n=>n.m.e===k)]));
 const nodes=inputNodes.map(n=>({...n,shortName:STAR_NAMES[n.id]||n.m.n,position:[0,0,0],color:rgb(colors[n.m.e],.37),body:bodyFor(n),screen:null,label:null}));
 const surnameCounts=new Map();
 for(const n of nodes){const surname=n.m.n.split('·').at(-1),key=n.m.e+'|'+surname;surnameCounts.set(key,(surnameCounts.get(key)||0)+1);}
 for(const n of nodes)if(!STAR_NAMES[n.id]&&n.shortName.length>7&&n.shortName.includes('·')){const surname=n.shortName.split('·').at(-1);if(surnameCounts.get(n.m.e+'|'+surname)===1)n.shortName=surname;}
 const byId=new Map(nodes.map(n=>[n.id,n]));
 // Periods occupy adjoining arcs of a chronological spiral. Within a period,
 // deterministic jitter separates names without inventing additional relations.
 for(let k=0;k<epochKeys.length;k++){
  const group=groups[epochKeys[k]];
  group.forEach((item,i)=>{
   const n=byId.get(item.id),r=rng(hash(n.id));
   const u=(k+.13+.78*(i+.5)/Math.max(group.length,1))/epochKeys.length;
   const radius=105+Math.pow(u,.72)*435,arm=k%3;
   const angle=arm*TAU/3+Math.log(radius/38)*[1.67,1.56,1.74][arm]+(r()-.5)*.05;
   n.position=[Math.cos(angle)*radius,Math.sin(angle*1.3)*radius*.26+(r()-.5)*16,Math.sin(angle)*radius];
   n.color=rgb(colors[n.m.e],.42);
  });
 }
 for(const n of nodes)n.homePosition=[...n.position];
 const links=inputLinks.filter(l=>byId.has(l.source)&&byId.has(l.target)).map((l,index)=>{
  const source=byId.get(l.source),target=byId.get(l.target),a=source.position,c=target.position;
  const distance=Math.hypot(a[0]-c[0],a[2]-c[2]);
  const b=[(a[0]+c[0])*.48+(c[2]-a[2])*.065,Math.max(a[1],c[1])+22+distance*.16,(a[2]+c[2])*.48+(a[0]-c[0])*.065];
  return{...l,source,target,control:b,index,color:rgb(relationColors[l.cat],.24),points:Array.from({length:19},(_,i)=>quadratic(a,b,c,i/18))};
 });
 const adjacency=new Map(nodes.map(n=>[n.id,new Set()]));
 for(const l of links){adjacency.get(l.source.id).add(l.target.id);adjacency.get(l.target.id).add(l.source.id);}
 const priority=[...nodes].sort((a,b)=>(b.deg+(b.m.b?5:0))-(a.deg+(a.m.b?5:0)));
 for(const n of nodes){
  const b=document.createElement('button');b.type='button';b.className='galaxy-star-label'+(n.deg>=6||n.m.b?' is-major':'');b.innerHTML=`<span class="galaxy-name-text">${esc(n.shortName)}</span>`;b.dataset.person=n.id;b.setAttribute('aria-label',`${n.m.n}，${n.body.description}，${n.m.d}，探索人物`);b.style.setProperty('--star-color',colors[n.m.e]||'#c4d4dd');b.hidden=true;
  b.addEventListener('click',e=>{if(e.detail===0)visit(n.id);});b.addEventListener('pointerdown',pointerDown);
  b.addEventListener('pointerenter',()=>{if(!drag)hoverNode(n);});b.addEventListener('pointerleave',()=>{if(!drag){state.hoverId=null;hover.hidden=true;dirty=true;request();}});
  b.addEventListener('focus',()=>hoverNode(n));b.addEventListener('blur',()=>{state.hoverId=null;hover.hidden=true;dirty=true;request();});
  labels.appendChild(b);n.label=b;n.nameElement=b.firstElementChild;
 }
 function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(info);}return s;}
 function program(vs,fs){const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
 const pointProgram=program(`
 attribute vec3 aPosition;attribute vec3 aColor;attribute vec2 aStyle;
 uniform mat4 uMVP;uniform float uDPR;uniform float uPointLimit;uniform mediump float uStar;uniform float uOpacity;
 ${FLOW_GLSL}
 ${EXTINCTION_GLSL}
 varying vec3 vColor;varying float vOpacity;
 void main(){
  vec3 p=flow(aPosition);
  vec4 clip=uMVP*vec4(p,1.0);gl_Position=clip;
  gl_PointSize=clamp(aStyle.x*uDPR*1250.0/max(clip.w,100.0),1.0,uPointLimit);
  vColor=aColor;vOpacity=aStyle.y*mix(transmission(p),1.0,uStar)*uOpacity;
 }`, `
 precision mediump float;varying vec3 vColor;varying float vOpacity;uniform mediump float uStar;
 void main(){
  vec2 p=gl_PointCoord*2.0-1.0;float rr=dot(p,p);if(rr>1.0)discard;
  float halo=exp(-rr*5.0)*.21;
  float core=exp(-rr*70.0)*.95;
  float rays=(exp(-abs(p.x)*72.0-abs(p.y)*6.0)+exp(-abs(p.y)*72.0-abs(p.x)*6.0))*.16;
  float alpha=mix(exp(-rr*5.0)*.56,halo+core+rays,uStar)*vOpacity;
  gl_FragColor=vec4(vColor,alpha);
 }`);
 const lineProgram=program(`attribute vec3 aPosition;attribute vec4 aColor;uniform mat4 uMVP;uniform float uOpacity;uniform float uPulse;varying vec4 vColor;${FLOW_GLSL}${EXTINCTION_GLSL}void main(){vec3 p=flow(aPosition);gl_Position=uMVP*vec4(p,1.0);float phase=length(aPosition)*.019-uTime*1.7;float pulse=1.4+1.9*pow(max(0.0,cos(phase)),16.0);vColor=vec4(aColor.rgb,aColor.a*transmission(p)*uOpacity*mix(1.0,pulse,uPulse));}`,'precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vColor;}');
 const quadVertex='attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.0,1.0);}';
 const blurProgram=program(quadVertex,`precision mediump float;varying vec2 vUV;uniform sampler2D uImage;uniform vec2 uStep;uniform float uExtract;
 vec3 sampleLight(vec2 uv){vec3 c=texture2D(uImage,uv).rgb;return mix(c,max(c-.085,0.0)*smoothstep(.09,.40,max(c.r,max(c.g,c.b))),uExtract);}
 void main(){vec3 c=sampleLight(vUV)*.227027;c+=(sampleLight(vUV+uStep*1.384615)+sampleLight(vUV-uStep*1.384615))*.316216;c+=(sampleLight(vUV+uStep*3.230769)+sampleLight(vUV-uStep*3.230769))*.070270;gl_FragColor=vec4(c,1.0);}`);
 const compositeProgram=program(quadVertex,`precision mediump float;varying vec2 vUV;uniform sampler2D uScene;uniform sampler2D uGlow;uniform float uBloom;
 void main(){vec3 light=texture2D(uScene,vUV).rgb*1.75+texture2D(uGlow,vUV).rgb*uBloom;vec3 c=1.0-exp(-light*1.18);gl_FragColor=vec4(c,1.0);}`);
 const blurLoc={position:gl.getAttribLocation(blurProgram,'aPosition'),image:gl.getUniformLocation(blurProgram,'uImage'),step:gl.getUniformLocation(blurProgram,'uStep'),extract:gl.getUniformLocation(blurProgram,'uExtract')};
 const compositeLoc={position:gl.getAttribLocation(compositeProgram,'aPosition'),scene:gl.getUniformLocation(compositeProgram,'uScene'),glow:gl.getUniformLocation(compositeProgram,'uGlow'),bloom:gl.getUniformLocation(compositeProgram,'uBloom')};
 const pa={position:gl.getAttribLocation(pointProgram,'aPosition'),color:gl.getAttribLocation(pointProgram,'aColor'),style:gl.getAttribLocation(pointProgram,'aStyle')};
 const pu={};for(const name of ['uMVP','uDPR','uTime','uMode','uStar','uPointLimit','uEye','uOpacity'])pu[name]=gl.getUniformLocation(pointProgram,name);
 const la={position:gl.getAttribLocation(lineProgram,'aPosition'),color:gl.getAttribLocation(lineProgram,'aColor'),mvp:gl.getUniformLocation(lineProgram,'uMVP'),time:gl.getUniformLocation(lineProgram,'uTime'),mode:gl.getUniformLocation(lineProgram,'uMode'),eye:gl.getUniformLocation(lineProgram,'uEye'),opacity:gl.getUniformLocation(lineProgram,'uOpacity'),pulse:gl.getUniformLocation(lineProgram,'uPulse')};
 function buffer(data,usage=gl.STATIC_DRAW){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,usage);return b;}
 const atlas=createStellarVolumes(gl,buffer);
 const celestial=createCelestialBodies(gl,program,buffer,nodes),meteors=createMeteors(gl,program,buffer),deepSky=createDeepSky(gl,program,buffer),cosmic=createCosmicEvents(gl,program,buffer,{hostState:{viewApplicable:()=>state.filter==='all'&&!mode(),paused:()=>state.paused||!state.active||contextLost,reduced:()=>reduced}});
 const relationshipLines=createRelationshipLines(gl,program,buffer);
 const core=createEraCores(gl,program,buffer);
 const volumeKey=()=>state.filter==='medieval'&&state.medievalPhase==='late'?'medieval-late':state.filter;
 const mode=()=>ATLAS[volumeKey()]?.mode||0;
 const overview=createEpochOverview({gl,program,buffer,container,keys:epochKeys,periods,project,request,onPointerDown:pointerDown,onEnter:key=>{if(key==='medieval')state.medievalPhase='all';root.querySelector(`#netchips [data-f="${key}"]`)?.click();}});
 const world=p=>flowPoint(p,state.time,mode());
 const atlasNote=document.createElement('div');atlasNote.className='galaxy-atlas-note';atlasNote.hidden=true;root.querySelector('.galaxy-intro').appendChild(atlasNote);
 const credit=document.createElement('p');credit.className='galaxy-credit';credit.hidden=true;root.appendChild(credit);
 let coreLabelBox=null,coreScreens=[];
 function renderCoreNote(key){
  const c=ERA_CORES[key]||ERA_CORES.all,spec=ATLAS[key];atlasNote.hidden=false;
  atlasNote.innerHTML=`${state.filter==='medieval'?`<div class="galaxy-phase-picker" aria-label="中世纪人物范围"><button type="button" data-phase="all" aria-pressed="${state.medievalPhase==='all'}"><span>00</span> 完整中世纪</button><button type="button" data-phase="early" aria-pressed="${state.medievalPhase==='early'}"><span>01</span> Ars nova 之前</button><button type="button" data-phase="late" aria-pressed="${state.medievalPhase==='late'}"><span>02</span> Ars nova 与十四世纪</button></div><p class="galaxy-phase-context">${state.medievalPhase==='all'?'圣咏、游吟传统、早期复调与十四世纪新艺术人物全部展开':state.medievalPhase==='early'?'圣咏、游吟传统与早期复调':'法国新艺术与意大利十四世纪音乐'}</p>`:''}<span class="galaxy-plate-kicker">时代之核 · ${esc(c.theme)}</span><h3>${esc(c.name)}</h3><p>${esc(c.text)}</p><button type="button" class="galaxy-core-open">靠近核心 ↗</button>${spec?`<a class="galaxy-reference-link" href="${spec.source}" target="_blank" rel="noopener">天体参照 · ${esc(spec.code)} ↗</a>`:''}<span class="galaxy-plate-status"></span>`;
  atlasNote.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{if(state.medievalPhase===b.dataset.phase)return;state.medievalPhase=b.dataset.phase;pendingVisit=null;switchAtlas(volumeKey());options.onPhaseChange?.();});
  atlasNote.querySelector('.galaxy-core-open').onclick=()=>state.coreFocus?reset():focusCore();root.classList.add('has-era-core');
 }
 renderCoreNote('all');
 function rebuildLinks(){
  relationRevision++;
  for(const l of links){const a=l.source.position,c=l.target.position,d=Math.hypot(a[0]-c[0],a[1]-c[1],a[2]-c[2]);
   l.control=mode()?[(a[0]+c[0])*.5+(c[1]-a[1])*.045,(a[1]+c[1])*.5+(a[0]-c[0])*.045,Math.max(a[2],c[2])+15+d*.08]:[(a[0]+c[0])*.48+(c[2]-a[2])*.065,Math.max(a[1],c[1])+22+d*.16,(a[2]+c[2])*.48+(a[0]-c[0])*.065];
   l.points=Array.from({length:19},(_,i)=>quadratic(a,l.control,c,i/18));
  }
 }
 async function switchAtlas(key){
  const spec=ATLAS[key];state.atlasReady=false;state.atlasOpacity=0;state.atlasError=null;state.time=0;meteors.reset();cosmic.reset(0);container.dataset.epoch=state.filter;root.dataset.epoch=state.filter;root.dataset.medievalPhase=state.medievalPhase;container.setAttribute('aria-busy',spec?'true':'false');
  credit.hidden=true;core.select(key);renderCoreNote(key);
  if(spec){
   root.style.setProperty('--g-gold',spec.color);
   atlasNote.querySelector('.galaxy-plate-status').textContent='星群正在聚拢…';
   credit.innerHTML='';
  }else root.style.removeProperty('--g-gold');
  for(const n of nodes){n.position=[...n.homePosition];n.color=rgb(colors[n.m.e],.42);n.renderable=false;n.label.hidden=true;n.label.classList.remove('show-name');}
  dirty=true;reset();
  try{
   const layer=await atlas.select(key);if(destroyed||volumeKey()!==key)return;
   if(layer){atlas.assignNodes(nodes.filter(inFilter),layer,core.spec);state.atlasReady=true;atlasNote.querySelector('.galaxy-plate-status').textContent='';}
   rebuildLinks();dirty=true;layoutDirty=true;container.setAttribute('aria-busy','false');
   if(pendingVisit&&inFilter(byId.get(pendingVisit.id))){const p=pendingVisit;pendingVisit=null;state.trail=p.trail;state.via=p.via;focus(p.id,{preview:p.preview!==false});}
   request();
  }catch(error){if(volumeKey()!==key)return;state.atlasError=String(error.message||error);atlasNote.querySelector('.galaxy-plate-status').textContent='星群暂未展开，点击此处重试';atlasNote.querySelector('.galaxy-plate-status').onclick=()=>switchAtlas(key);container.setAttribute('aria-busy','false');request();}
 }
 const quad=buffer(new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]));
 function makeTarget(withDepth=false){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);let depth=null;if(withDepth){depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);}return{texture,framebuffer,depth};}
 const sceneTarget=makeTarget(true),glowA=makeTarget(),glowB=makeTarget();let glowWidth=1,glowHeight=1;
 function sizeTarget(target,w,h){gl.bindTexture(gl.TEXTURE_2D,target.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);if(target.depth){gl.bindRenderbuffer(gl.RENDERBUFFER,target.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);}}
 function drawQuad(location){gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,8,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(location);}
 function composeLight(){
  gl.disable(gl.BLEND);gl.useProgram(blurProgram);gl.uniform1i(blurLoc.image,0);gl.activeTexture(gl.TEXTURE0);gl.viewport(0,0,glowWidth,glowHeight);
  gl.bindFramebuffer(gl.FRAMEBUFFER,glowA.framebuffer);gl.bindTexture(gl.TEXTURE_2D,sceneTarget.texture);gl.uniform2f(blurLoc.step,3/canvas.width,0);gl.uniform1f(blurLoc.extract,1);drawQuad(blurLoc.position);
  gl.bindFramebuffer(gl.FRAMEBUFFER,glowB.framebuffer);gl.bindTexture(gl.TEXTURE_2D,glowA.texture);gl.uniform2f(blurLoc.step,0,1.4/glowHeight);gl.uniform1f(blurLoc.extract,0);drawQuad(blurLoc.position);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(compositeProgram);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sceneTarget.texture);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,glowB.texture);gl.uniform1i(compositeLoc.scene,0);gl.uniform1i(compositeLoc.glow,1);gl.uniform1f(compositeLoc.bloom,(mode()?1.15:.5)*ctxDim.b);drawQuad(compositeLoc.position);gl.activeTexture(gl.TEXTURE0);
 }
 const dust=[];
 function particle(x,y,z,r,g,b,size,opacity){dust.push(x,y,z,r,g,b,size,opacity);}
 // Fine spiral dust, with a cooler penumbra and a warmer central bulge.
 const dustCount=43000;
 for(let i=0;i<dustCount;i++){
  const t=random(),arm=i%3,radius=(22+Math.pow(t,.64)*590)*[1,.89,1.12][arm];
  const angle=arm*TAU/3+Math.log(radius/38)*[1.67,1.56,1.74][arm];
  const s=gauss()*(9+radius*.055),a=angle+s/radius;
  const x=Math.cos(a)*radius+gauss()*9,z=Math.sin(a)*radius+gauss()*9;
  const y=gauss()*(17+Math.pow(1-t,2)*48)+Math.sin(a*1.3)*radius*.26;
  const mix=clamp(radius/625+random()*.12,0,1),r=1.0-mix*.63,g=.87+mix*.02,b=.58+mix*.40;
  particle(x,y,z,r,g,b,.65+random()*2.7,(.30+random()*.42)*(1-t*.26));
 }
 for(let i=0;i<7800;i++){
  const r=Math.abs(gauss())*81,a=random()*TAU;
  particle(Math.cos(a)*r,gauss()*43,Math.sin(a)*r,1,.91,.73,1+random()*3.8,.22+random()*.26);
 }
 for(let i=0;i<1100;i++){
  const a=random()*TAU,r=100+random()*1000,y=(random()-.5)*950;
  particle(Math.cos(a)*r,y,Math.sin(a)*r,.68+random()*.24,.76+random()*.18,.82+random()*.17,.8+Math.pow(random(),4)*3.2,.14+random()*.54);
 }
 const dustBuffer=buffer(new Float32Array(dust));
 const nebula=[];
 for(let i=0;i<2900;i++){
  const t=random(),arm=i%3,radius=(20+Math.pow(t,.70)*575)*[1,.89,1.12][arm];
  const angle=arm*TAU/3+Math.log(radius/38)*[1.67,1.56,1.74][arm]+gauss()*.085;
  const mix=clamp(radius/600,0,1);
  nebula.push(Math.cos(angle)*radius,gauss()*28+Math.sin(angle*1.3)*radius*.26,Math.sin(angle)*radius,1-mix*.66,.78+mix*.07,.51+mix*.48,26+random()*38,.021+random()*.034);
 }
 for(let i=0;i<380;i++){const r=Math.abs(gauss())*57,a=random()*TAU;nebula.push(Math.cos(a)*r,gauss()*22,Math.sin(a)*r,1,.83,.60,30+random()*24,.019+random()*.016);}
 const nebulaBuffer=buffer(new Float32Array(nebula));
 // Light follows long, unequal strands through a warped disc. They describe the
 // galaxy's atmosphere; the independently stored relation curves remain data.
 const filaments=[];
 for(let arm=0;arm<3;arm++)for(let thread=0;thread<142;thread++){
  const offset=gauss()*.105,lift=gauss()*26,scale=.83+random()*.39,phase=random()*TAU;
  const steps=146;let previous=null;
  for(let j=0;j<=steps;j++){
   const t=j/steps,r=(31+Math.pow(t,.87)*595)*scale*[1,.89,1.12][arm];
   const angle=arm*TAU/3+Math.log(r/38)*[1.67,1.56,1.74][arm]+offset+Math.sin(t*7+phase)*.018;
   const y=lift*(.5+Math.sin(t*Math.PI)*.7)+Math.sin(angle*1.3)*r*.26+Math.sin(t*TAU+phase)*11;
   const p=[Math.cos(angle)*r,y,Math.sin(angle)*r];
   const mix=clamp(r/660,0,1),alpha=(.028+((thread%11===0)?.075:0))*Math.pow(Math.sin(Math.PI*t),.54);
   const c=[1-mix*.67,.88+mix*.015,.64+mix*.36,alpha];
   if(previous){filaments.push(...previous,...c,...p,...c);}previous=p;
  }
 }
 const filamentBuffer=buffer(new Float32Array(filaments));
 // A diffuse axial halo gives the nucleus a visible vertical body, even when
 // the disc is seen almost edge-on. Its threads taper into the surrounding dark.
 const axial=[];
 for(let strand=0;strand<128;strand++){
  const base=random()*28,phase=strand/128*TAU;let previous=null;
  for(let j=0;j<=164;j++){
   const y=-355+j/164*760,r=13+base+Math.pow(Math.abs(y)/355,1.8)*38;
   const angle=phase+y*.017+Math.sin(y*.013+phase)*.17;
   const p=[Math.cos(angle)*r,y,Math.sin(angle)*r];
   const t=Math.abs(y)/410,alpha=Math.pow(Math.max(0,1-t),.68)*(strand%9===0?.32:.11);
   const c=[1-t*.38,.91-t*.015,.71+t*.24,alpha];
   if(previous)axial.push(...previous,...c,...p,...c);previous=p;
  }
 }
 const axialBuffer=buffer(new Float32Array(axial));
 const lightflowData=new Float32Array(408*8),lightflowBuffer=buffer(lightflowData,gl.DYNAMIC_DRAW);
 function updateLightflow(){
  let i=0;
  for(let arm=0;arm<3;arm++)for(let stream=0;stream<12;stream++)for(let dot=0;dot<6;dot++){
   const t=(dot/6+stream*.081+state.time*.031)%1;
   const r=(31+Math.pow(t,.87)*595)*[1,.89,1.12][arm];
   const angle=arm*TAU/3+Math.log(r/38)*[1.67,1.56,1.74][arm]+(stream-5.5)*.013;
   const y=Math.sin(angle*1.3)*r*.26+(stream-5.5)*3;
   lightflowData.set([Math.cos(angle)*r,y,Math.sin(angle)*r,1-t*.52,.92,.74+t*.26,5.3,Math.sin(t*Math.PI)*.65],i++*8);
  }
  for(let k=0;k<192;k++){
   const t=(k*.618034+state.time*.039)%1,y=-355+t*760,phase=k/192*TAU,r=13+(k%13)*1.5+Math.pow(Math.abs(y)/355,1.8)*38,angle=phase+y*.017;
   lightflowData.set([Math.cos(angle)*r,y,Math.sin(angle)*r,1,.95,.79,5.4,Math.sin(t*Math.PI)*.68],i++*8);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,lightflowBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,lightflowData);
 }
 const orbits=[];
 for(const r of[180,330,480,650])for(let j=0;j<240;j++){if(j%3===0)continue;const a=j/240*TAU,b=(j+1)/240*TAU;orbits.push(Math.cos(a)*r,-160,Math.sin(a)*r,.23,.47,.54,.062,Math.cos(b)*r,-160,Math.sin(b)*r,.23,.47,.54,.062);}
 const orbitBuffer=buffer(new Float32Array(orbits));
 function activeId(){return state.hoverId||state.focusId||state.selectedId;}
 function inFilter(n){return !!n&&state.filter!=='all'&&n.m.e===state.filter&&(state.filter!=='medieval'||state.medievalPhase==='all'||medievalLate.has(n.id)===(state.medievalPhase==='late'));}
 function updateGeometry(){
  const active=activeId(),near=active?adjacency.get(active)||new Set():null;
  for(const n of nodes)n.emphasis=!active||n.id===active||near.has(n.id)?1:.20;
  relationshipLines.update(links.filter(l=>inFilter(l.source)&&inFilter(l.target)),{active,filter:state.filter,categories:state.relationTypes,chosen:state.via?.index,revision:relationRevision});
  geometryRevision++;dirty=false;
 }
 function getMatrix(){
  const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),ce=Math.cos(camera.pitch),se=Math.sin(camera.pitch);
  const z=[sy*ce,se,cy*ce],x=[cy,0,-sy],y=[-sy*se,ce,-cy*se];
  const distance=camera.distance*(width>760?Math.max(1,1350/width):Math.max(1,height/Math.max(width,1)*.94));
  const e=camera.target.map((v,i)=>v+z[i]*distance),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  cameraEye=e;
  cameraBasis={right:x,up:y,back:z,distance};
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1]);
  const f=1/Math.tan(42*Math.PI/360),aspect=width/height,near=10,far=5000;
  const center=width<760||document.body.classList.contains('galaxy-immersive')?0:width<1180?.035:.18;
  const p=new Float32Array([f/aspect,0,0,0,0,f,0,0,-center,.015,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
  return mul(p,view);
 }
 function resize(){
  if(!state.active)return;
  const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  width=rect.width;height=rect.height;
  const maxSize=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  dpr=Math.min(devicePixelRatio||1,1.5,maxSize/width,maxSize/height,Math.sqrt(3300000/(width*height)));
  const w=Math.round(width*dpr),h=Math.round(height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);glowWidth=Math.max(1,Math.round(w/4));glowHeight=Math.max(1,Math.round(h/4));sizeTarget(sceneTarget,w,h);sizeTarget(glowA,glowWidth,glowHeight);sizeTarget(glowB,glowWidth,glowHeight);}
  const mast=document.querySelector('header.mast');if(mast&&!document.body.classList.contains('galaxy-immersive'))root.style.setProperty('--galaxy-mast-height',Math.ceil(mast.getBoundingClientRect().height)+'px');
  readObstacles();
  const introBox=obstacles.find(o=>o.x<width*.20&&o.y<height*.3);overview.resize(width,height,home,introBox?introBox.x+introBox.w:width*.21,document.body.classList.contains('galaxy-immersive'));
  layoutDirty=false;
 }
 function drawPoints(b,count,star,dimOverride){
  gl.useProgram(pointProgram);gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.enableVertexAttribArray(pa.position);gl.vertexAttribPointer(pa.position,3,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(pa.color);gl.vertexAttribPointer(pa.color,3,gl.FLOAT,false,32,12);gl.enableVertexAttribArray(pa.style);gl.vertexAttribPointer(pa.style,2,gl.FLOAT,false,32,24);
  gl.uniformMatrix4fv(pu.uMVP,false,matrix);gl.uniform1f(pu.uDPR,dpr);gl.uniform1f(pu.uTime,state.time);gl.uniform1f(pu.uMode,mode());gl.uniform1f(pu.uStar,star);gl.uniform1f(pu.uPointLimit,maxPoint);gl.uniform3fv(pu.uEye,cameraEye);gl.uniform1f(pu.uOpacity,(mode()?state.atlasOpacity:.12)*(dimOverride??ctxDim.o));
  gl.drawArrays(gl.POINTS,0,count);gl.disableVertexAttribArray(pa.position);gl.disableVertexAttribArray(pa.color);gl.disableVertexAttribArray(pa.style);
 }
 function drawLines(b,count,dimOverride){
  gl.useProgram(lineProgram);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(la.position);gl.vertexAttribPointer(la.position,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(la.color);gl.vertexAttribPointer(la.color,4,gl.FLOAT,false,28,12);gl.uniformMatrix4fv(la.mvp,false,matrix);gl.uniform1f(la.time,state.time);gl.uniform1f(la.mode,mode());gl.uniform3fv(la.eye,cameraEye);gl.uniform1f(la.opacity,(mode()?state.atlasOpacity:1)*(dimOverride??ctxDim.o));gl.uniform1f(la.pulse,b===orbitBuffer?0:1);gl.drawArrays(gl.LINES,0,count);gl.disableVertexAttribArray(la.position);gl.disableVertexAttribArray(la.color);
 }
 function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
 function readObstacles(){
  const canvasRect=canvas.getBoundingClientRect();obstacles=[];
  for(const element of root.querySelectorAll('.galaxy-intro,.galaxy-epochs,.nettog,.galaxy-key,.galaxy-controls,.galaxy-caption,.galaxy-focus-card')){
   if(element.hidden||getComputedStyle(element).display==='none')continue;const r=element.getBoundingClientRect();if(r.width<1||r.height<1)continue;
   obstacles.push({x:r.left-canvasRect.left-10,y:r.top-canvasRect.top-8,w:r.width+20,h:r.height+16});
  }
 }
 function layoutLabels(){
  if(state.filter==='all'){return;}
   const active=activeId(),near=active?adjacency.get(active)||new Set():new Set(),focal=height/(2*Math.tan(42*Math.PI/360)),placed=[];
  for(const n of nodes){
   n.worldPosition=world(n.position);const p=n.screen=project(n.worldPosition,matrix,width,height);
   const bodyRadius=n.body.radius*focal/Math.max(100,p.d),extent=bodyRadius*(n.body.satellite?3.4:n.body.type===3?2.3:1.1)+4;
   const eclipsed=coreScreens.some(c=>p.d>c.d&&Math.hypot(p.x-c.x,p.y-c.y)+bodyRadius<c.radius*.94);
   n.hitRadius=Math.max(9,extent);n.screenRadius=bodyRadius;
   const box={x:p.x-extent,y:p.y-extent,w:extent*2,h:extent*2};
    // Keep the celestial body for every person in the selected era. UI panels
    // and label collision avoidance may hide its name, but must not delete the
    // underlying small planet or star from the scene.
    n.renderable=!eclipsed&&(!mode()||state.atlasReady)&&inFilter(n)&&p.d>100&&p.z<1;
    n.labelRenderable=n.renderable&&box.x>8&&box.y>12&&box.x+box.w<width-8&&box.y+box.h<height-10&&!obstacles.some(o=>overlap(box,o));
   if(n.label.hidden===n.labelRenderable)n.label.hidden=!n.labelRenderable;n.label.classList.remove('show-name');
   if(!n.labelRenderable)continue;
   const size=Math.max(18,Math.min(42,bodyRadius*2.2)),x=p.x-size/2,y=p.y-size/2,transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
   if(transform!==n.lastTransform){n.label.style.transform=transform;n.lastTransform=transform;}
   if(!n.lastHitSize||Math.abs(n.lastHitSize-size)>.7){n.label.style.width=size+'px';n.label.style.height=size+'px';n.lastHitSize=size;}
    n.labelOrigin={x,y};n.label.classList.toggle('is-focus',n.id===active);n.label.style.opacity=active&&n.id!==active&&!near.has(n.id)?'.32':'1';
  }
  let count=0;const candidates=active?[...priority].sort((a,b)=>(b.id===active?1:0)-(a.id===active?1:0)):priority;
  for(const n of candidates){
   const neighbor=state.focusId&&!card.hidden&&adjacency.get(state.focusId)?.has(n.id);
   if(!n.labelRenderable||!(state.names||n.id===state.focusId||n.id===state.selectedId||neighbor&&count<8)||count>=18)continue;
   const p=n.screen,r=n.screenRadius*(n.body.satellite?3.4:n.body.type===3?2.3:n.body.type===0?1.5:1.15),w=n.shortName.length*14+22,h=32;
   const options=[[p.x+r+10,p.y-h/2],[p.x-r-w-10,p.y-h/2],[p.x-w/2,p.y-r-h-10],[p.x-w/2,p.y+r+10]];
   for(const[x,y]of options){const box={x,y,w,h};if(x<10||y<10||x+w>width-10||y+h>height-10||obstacles.some(o=>overlap(box,o))||coreLabelBox&&overlap(box,coreLabelBox)||placed.some(o=>overlap(box,o)))continue;
    n.nameElement.style.transform=`translate(${(x-n.labelOrigin.x).toFixed(1)}px,${(y-n.labelOrigin.y).toFixed(1)}px)`;n.label.classList.add('show-name');placed.push(box);count++;break;
   }
  }
 }
 function cameraStep(dt){
  const factor=reduced?1:1-Math.exp(-dt*((state.focusId||state.coreFocus)&&!drag?3.8:7.5));let moving=false;
  for(const key of ['yaw','pitch','distance']){const diff=goal[key]-camera[key];if(Math.abs(diff)>.002)moving=true;camera[key]+=diff*factor;}
  for(let i=0;i<3;i++){const diff=goal.target[i]-camera.target[i];if(Math.abs(diff)>.01)moving=true;camera.target[i]+=diff*factor;}
  return moving;
 }
 function frame(now){
  raf=0;if(destroyed||!state.active||document.hidden||contextLost)return;
  if(last&&now-last<1000/60-.6){raf=requestAnimationFrame(frame);return;}
  const dt=last?Math.max(.001,(now-last)/1000):1/60;
  if(last){frameIntervals.push(dt*1000);if(frameIntervals.length>180)frameIntervals.shift();if(dt>.05)longFrames++;}last=now;
  if(!state.paused)state.time+=dt;
  if(state.cruise&&!state.paused){goal.yaw+=dt*.040;const base=ATLAS[volumeKey()]?.pitch??home.pitch;goal.pitch=base+Math.sin(state.time*.12)*.065;}
  if(state.atlasReady)state.atlasOpacity=Math.min(1,state.atlasOpacity+dt*1.7);
  ctxStep(dt);
  cosmic.setContextDim(ctxDim.e, ctxDim.p);
  const focused=byId.get(state.focusId);if(focused&&inFilter(focused))goal.target=world(focused.position);
  if(state.coreFocus)goal.target=core.center(state.time,mode());
  const moving=cameraStep(dt);if(layoutDirty)resize();if(dirty)updateGeometry();matrix=getMatrix();layoutCoreLabel();layoutLabels();overview.layout(matrix,width,height,state.filter==='all');
  gl.bindFramebuffer(gl.FRAMEBUFFER,sceneTarget.framebuffer);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.004,.007,.012,1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  deepSky.draw({matrix,dpr,time:state.time,basis:cameraBasis,eye:cameraEye,target:sceneTarget.framebuffer,width:canvas.width,height:canvas.height,dim:ctxDim.d,profile:ATLAS[volumeKey()]||home,profileKey:volumeKey(),center:width<760||document.body.classList.contains('galaxy-immersive')?0:width<1180?.035:.18});
  if(!mode()){
   const skyFrame={matrix,time:state.time,width,height,dpr,eye:cameraEye,basis:cameraBasis,cameraTarget:camera.target,home,center:width<760||document.body.classList.contains('galaxy-immersive')?0:width<1180?.035:.18,obstacles,clusters:overview.getState().groups};
   cosmic.drawPortals(skyFrame);
   overview.draw(matrix,state.time,dpr,ctxDim.o);
   cosmic.drawEvents(skyFrame);
  }else if(state.atlasReady){const v=atlas.active;drawPoints(v.fog,v.fogCount,0);drawPoints(v.dust,v.dustCount,0);drawLines(v.lines,v.lineCount,ctxDim.o);atlas.animate(state.time);drawPoints(v.streamBuffer,v.streams.length/8,1,ctxDim.e);}
  if(mode()&&state.atlasReady){const opacity=state.atlasOpacity,focal=height/(2*Math.tan(42*Math.PI/360))*dpr;core.draw({matrix,time:state.time,mode:mode(),basis:cameraBasis,eye:cameraEye,focal,dpr,opacity:opacity*ctxDim.c});relationshipLines.draw(matrix,state.time,mode(),canvas.width,canvas.height,dpr,opacity);celestial.draw({matrix,time:state.time,eye:cameraEye,focal,opacity,activeId:activeId()});meteors.draw(matrix,state.time,cameraBasis,camera.target);}composeLight();
  frameRevision++;
  if(!state.paused||moving||(state.atlasReady&&state.atlasOpacity<1))raf=requestAnimationFrame(frame);else last=0;
 }
 function request(){if(!raf&&state.active&&!document.hidden&&!destroyed&&!contextLost)raf=requestAnimationFrame(frame);}
 function layoutCoreLabel(){
  if(state.filter==='all'){coreScreens=[];return;}
  core.prepare(state.time,mode());const focal=height/(2*Math.tan(42*Math.PI/360));coreScreens=core.occluders.map(n=>{const p=project(n.worldPosition,matrix,width,height);return{...p,radius:n.body.radius*focal/Math.max(100,p.d)};}).filter(p=>p.d>100&&p.z<1);
  coreLabelBox=null;
 }
 function focusCore(){clearFocus();stopCruise();state.coreFocus=true;root.classList.add('is-core-observing');goal.target=core.center(state.time,mode());goal.distance=core.spec.kind===6?780:690;atlasNote.querySelector('.galaxy-core-open').textContent='返回全景 ↗';dirty=true;request();}
 function hitCore(x,y){return (!mode()||state.atlasReady)&&coreScreens.some(p=>Math.hypot(x-p.x,y-p.y)<Math.max(10,p.radius));}
 function showCard(n){
  const related=links.filter(l=>l.source.id===n.id||l.target.id===n.id).sort((a,b)=>{const an=a.source.id===n.id?a.target:a.source,bn=b.source.id===n.id?b.target:b.source;return Number(inFilter(bn))-Number(inFilter(an))||bn.deg-an.deg;});
  const portrait=portraits[n.id];
  const trail=state.trail.slice(-5),via=state.via,from=via&&byId.get(via.from);
  const categorySummary=[...new Set(related.map(l=>l.cat))].join(' · ');
  card.innerHTML=`<div class="gfc-topline"><span>关系阅读器</span><button type="button" class="gfc-close" aria-label="返回星丛全景">返回星丛 ↗</button></div><nav class="gfc-trail" aria-label="已探索的人物">${trail.map((id,i)=>`<button type="button" data-trail="${esc(id)}" ${id===n.id?'aria-current="step"':''}>${esc(byId.get(id).shortName)}</button>${i<trail.length-1?'<span>›</span>':''}`).join('')}</nav><div class="gfc-head">${portrait?`<img src="${esc(portrait.u)}" alt="${esc(n.m.n)}的肖像" loading="lazy" decoding="async">`:''}<div><h4 class="${n.shortName.length>5?'gfc-long-name':''}">${esc(n.shortName)}</h4>${n.shortName!==n.m.n?`<span class="gfc-fullname">${esc(n.m.n)}</span>`:''}</div></div><div class="gfc-dates">${esc(n.m.d)} · ${esc(periods[n.m.e]?.zh||'')}</div><div class="gfc-body-kind"><i style="background:rgb(${n.body.color.map(v=>Math.round(v*255)).join(',')})"></i>${esc(n.body.description)}</div><p class="gfc-summary">${esc(n.m.s||'')}</p><div class="gfc-stats"><strong>${related.length}</strong><span>条直接关系</span><small>${esc(categorySummary||'词典尚未归类')}</small></div>${from?`<div class="gfc-arrival"><small>由 ${esc(from.shortName)} 而来</small><strong>${esc(via.relation)}</strong>${via.note?`<p>${esc(via.note)}</p>`:''}</div>`:''}<button type="button" class="gfc-open">阅读传记与作品 <span>↗</span></button><div class="gfc-path-heading"><span>沿关联前往</span><small>${related.length} 条</small></div><div class="gfc-relations">${related.map(l=>{const to=l.source.id===n.id?l.target:l.source;const direction=l.directional?`${l.source.id===n.id?'→':'←'} ${l.source.id===n.id?'从当前人物指向对方':'对方指向当前人物'}`:'双向 / 无方向';const evidence=EVIDENCE_STATUS[l.evidence]?.label||l.evidence;return`<button type="button" class="gfc-route" data-relation="${l.index}" data-destination="${esc(to.id)}"><span class="gfc-route-swatch" style="--relation-color:${esc(relationColors[l.cat])}">${relationSwatch(l.cat)}</span><span><b>${esc(to.shortName)}</b><small><em>${esc(l.cat)}</em> · ${esc(evidence)} · ${esc(direction)}</small>${l.note?`<p>${esc(l.note)}</p>`:''}${l.review?`<p class="gfc-review">待核：${esc(l.review)}</p>`:''}</span><i>↗</i></button>`;}).join('')||'<p>词典中暂无已录人物关联。</p>'}</div>`;
  card.hidden=false;card.scrollTop=0;root.classList.add('is-observing');layoutDirty=true;card.querySelector('.gfc-close').onclick=reset;card.querySelector('.gfc-open').onclick=()=>choose(n);
  card.querySelectorAll('[data-relation]').forEach(b=>b.onclick=()=>{const l=links[Number(b.dataset.relation)];visit(b.dataset.destination,{from:n.id,to:b.dataset.destination,index:l.index,relation:l.t,note:l.note});});
  card.querySelectorAll('[data-trail]').forEach(b=>b.onclick=()=>{const i=state.trail.indexOf(b.dataset.trail);visit(b.dataset.trail,null,state.trail.slice(0,i+1));});
 }
 function visit(id,via=null,trail=null,preview=true){
   const n=byId.get(id);if(!n)return;
   collapseIntro();
   stopCruise();const path=trail||(via?[...state.trail,id].slice(-8):[id]);
  if(!inFilter(n)){pendingVisit={id,via,trail:path,preview};if(n.m.e==='medieval')state.medievalPhase=medievalLate.has(id)?'late':'early';if(state.filter===n.m.e){switchAtlas(volumeKey());options.onPhaseChange?.();}else root.querySelector(`#netchips [data-f="${n.m.e}"]`)?.click();return;}
  if(!state.atlasReady){pendingVisit={id,via,trail:path,preview};return;}
  state.trail=path;state.via=via;focus(id,{preview});
 }
 function focus(id,{preview=true}={}){
  const n=byId.get(id);if(!n)return;
  if(!inFilter(n)||!state.atlasReady){visit(id,null,null,preview);return;}
  state.focusId=id;state.coreFocus=false;root.classList.remove('is-core-observing');state.hoverId=null;hover.hidden=true;
  goal.target=world(n.position);goal.distance=width<760?850:680+Math.max(0,n.body.radius-18)*9;
  dirty=true;layoutDirty=true;if(preview){if(!state.trail.length)state.trail=[id];showCard(n);}else{card.hidden=true;root.classList.remove('is-observing');}request();
 }
 function choose(n){focus(n.id);onSelect(n.id);}
 function clearFocus(){restoreIntro();state.focusId=null;state.coreFocus=false;state.selectedId=null;state.hoverId=null;state.trail=[];state.via=null;card.hidden=true;hover.hidden=true;root.classList.remove('is-observing','is-core-observing');atlasNote.querySelector('.galaxy-core-open').textContent='靠近核心 ↗';dirty=true;layoutDirty=true;request();}
 function hitNode(x,y){let best=null,score=Infinity;for(const n of nodes){if(!n.renderable||!n.screen)continue;const d=Math.hypot(x-n.screen.x,y-n.screen.y),radius=Math.max(10,n.hitRadius);if(d<radius&&d/radius<score){best=n;score=d/radius;}}return best;}
 function positionHover(x,y){
  const rect=hover.getBoundingClientRect(),w=rect.width,h=rect.height,locations=[[x+25,y-15],[x-w-25,y-15],[x-w/2,y+28],[x-w/2,y-h-28]];
  let box=null;for(const [left,top]of locations){const b={x:clamp(left,10,width-w-10),y:clamp(top,10,height-h-10),w,h};if(!obstacles.some(o=>overlap(b,o))){box=b;break;}}
  if(!box)box={x:clamp(x-w/2,width*.28,width-w-10),y:clamp(y-h-28,10,height-h-10)};hover.style.left=box.x+'px';hover.style.top=box.y+'px';
 }
 function hoverNode(n){if(!n?.screen)return;state.hoverId=n.id;dirty=true;hover.innerHTML=`<b>${esc(n.m.n)}</b><small>${esc(n.m.d)} · ${esc(periods[n.m.e]?.zh||'')} · ${esc(n.body.description)}</small><span>${esc(n.m.s||'')}</span><small>点选探索关联 · 双击阅读传记</small>`;hover.hidden=false;positionHover(n.screen.x,n.screen.y);request();}
 function hitLink(x,y){
  if(!state.hoverId)return null;
  const active=activeId();let found=null,min=8;
  for(const l of links){
    if(!inFilter(l.source)||!inFilter(l.target)||state.relationTypes.length&&!state.relationTypes.includes(l.cat)||active&&(l.source.id!==active&&l.target.id!==active))continue;
   let prev=project(world(l.points[0]),matrix,width,height);
   for(let i=1;i<l.points.length;i++){
    const p=project(world(l.points[i]),matrix,width,height),vx=p.x-prev.x,vy=p.y-prev.y,len=vx*vx+vy*vy;
    const t=len?clamp(((x-prev.x)*vx+(y-prev.y)*vy)/len,0,1):0;
    const dist=Math.hypot(x-prev.x-t*vx,y-prev.y-t*vy);
    if(dist<min){found=l;min=dist;}prev=p;
   }
  }return found;
 }
 function pointerMove(e){
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(drag){
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.travel+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;
   goal.yaw-=dx*.0045;goal.pitch=clamp(goal.pitch+dy*.004,-1.45,1.45);hover.hidden=true;request();return;
  }
  if(e.pointerType==='touch'||!matrix)return;
  if(state.filter==='all'){const key=overview.hit(x,y);overview.hover(key);canvas.style.cursor=key?'pointer':'grab';hover.hidden=true;request();return;}
  const n=hitNode(x,y),old=state.hoverId;state.hoverId=n?.id||null;
  canvas.style.cursor=n?'pointer':'grab';if(old!==state.hoverId){dirty=true;request();}
  if(n){hoverNode(n);}
  else{
   if(hitCore(x,y)){canvas.style.cursor='pointer';hover.hidden=true;return;}
   const l=hitLink(x,y);
    if(l){hover.innerHTML=`<b>${esc(l.source.m.n)} · ${esc(l.target.m.n)}</b><small>${esc(l.cat)} · ${esc(EVIDENCE_STATUS[l.evidence]?.label||l.evidence)}${l.directional?' · '+esc(l.source.m.n)+' → '+esc(l.target.m.n):' · 无方向'}</small>${l.note?`<div class="gh-note">${esc(l.note)}</div>`:''}${l.review?`<div class="gh-review">待核：${esc(l.review)}</div>`:''}`;hover.hidden=false;positionHover(x,y);}
   else hover.hidden=true;
  }
 }
 function pointerDown(e){if(e.button!==0)return;collapseIntro();stopCruise();drag={x:e.clientX,y:e.clientY,travel:0,id:state.hoverId};state.hoverId=null;hover.hidden=true;dirty=true;request();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}
 function pointerUp(e){const d=drag;drag=null;if(d&&d.travel<7){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(state.filter==='all'){const key=overview.hit(x,y);if(key){if(key==='medieval')state.medievalPhase='all';root.querySelector(`#netchips [data-f="${key}"]`)?.click();}return;}const now=performance.now();if(lastPick&&now-lastPick.time<450&&Math.hypot(e.clientX-lastPick.x,e.clientY-lastPick.y)<12){const n=byId.get(lastPick.id);lastPick=null;if(n)choose(n);return;}const n=hitNode(x,y);if(n){lastPick={id:n.id,time:now,x:e.clientX,y:e.clientY};visit(n.id);}else{lastPick=null;if(hitCore(x,y))focusCore();else clearFocus();}}}
 function pointerLeave(){if(drag)return;state.hoverId=null;hover.hidden=true;dirty=true;request();}
 function wheel(e){e.preventDefault();collapseIntro();stopCruise();goal.distance=clamp(goal.distance*Math.exp(e.deltaY*.0007),400,2300);request();}
 function keydown(e){
  if(e.target!==canvas)return;
  if(e.key.startsWith('Arrow')||['+','=','-','_'].includes(e.key))stopCruise();
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_',' '].includes(e.key)){e.preventDefault();e.stopPropagation();}
  if(e.key==='ArrowLeft')goal.yaw+=.11;if(e.key==='ArrowRight')goal.yaw-=.11;if(e.key==='ArrowUp')goal.pitch+=.08;if(e.key==='ArrowDown')goal.pitch-=.08;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_',' '].includes(e.key))collapseIntro();
  goal.pitch=clamp(goal.pitch,-1.45,1.45);
  if(e.key==='+'||e.key==='=')goal.distance=clamp(goal.distance*.9,400,2300);if(e.key==='-'||e.key==='_')goal.distance=clamp(goal.distance*1.1,400,2300);if(e.key===' ')toggleMotion();request();
 }
 canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{drag=null;});canvas.addEventListener('lostpointercapture',()=>{drag=null;});canvas.addEventListener('pointerleave',pointerLeave);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keydown);
 function setState(next){
   const previousFilter=state.filter,previousSelected=state.selectedId;
  if(next.filter!==undefined)state.filter=next.filter;
   if(next.relationTypes!==undefined)state.relationTypes=Array.isArray(next.relationTypes)?next.relationTypes.filter(Boolean):[];
   if(next.relationType!==undefined)state.relationTypes=next.relationType?[next.relationType]:[];
  if(next.selectedId!==undefined)state.selectedId=next.selectedId;
  if(previousFilter!==state.filter){
   if(pendingVisit&&byId.get(pendingVisit.id)?.m.e!==state.filter)pendingVisit=null;
   clearFocus();
   switchAtlas(volumeKey());
  }else if(state.selectedId&&state.selectedId!==previousSelected&&!pendingVisit)focus(state.selectedId,{preview:state.focusId===state.selectedId&&!card.hidden});
  else if(!state.selectedId&&previousSelected&&!pendingVisit)clearFocus();
   if(previousFilter!==state.filter||previousSelected!==state.selectedId)collapseIntro();$('galaxy-gesture').textContent=state.filter==='all'?'依时间展开 · 点击星群进入时代':'拖动旋转 · 悬停看关联 · 双击开传';
  dirty=true;request();
 }
 function reset(){stopCruise();lastPick=null;const spec=ATLAS[volumeKey()];Object.assign(goal,spec?{yaw:spec.yaw,pitch:spec.pitch,distance:spec.home,target:[0,10,0]}:home,{target:spec?[0,10,0]:[...home.target]});clearFocus();restoreIntro();request();}
 function stopCruise(){state.cruise=false;const b=$('galaxy-cruise');if(b)b.setAttribute('aria-pressed','false');}
 const cruiseButton=$('galaxy-cruise');cruiseButton.onclick=()=>{state.cruise=!state.cruise;cruiseButton.setAttribute('aria-pressed',state.cruise);request();};
 function updateMotionButton(){const b=$('galaxy-motion');b.setAttribute('aria-pressed',state.paused);b.setAttribute('aria-label',state.paused?'继续星系流动':'暂停星系流动');b.title=state.paused?'继续星系流动':'暂停星系流动';b.dataset.tooltip=state.paused?'继续运动':'暂停运动';b.innerHTML=state.paused?'<svg viewBox="0 0 20 20"><path d="m7 4 9 6-9 6z" fill="currentColor" stroke="none"/></svg>':'<svg viewBox="0 0 20 20"><path d="M7 5v10M13 5v10"/></svg>';}
 function toggleMotion(){state.paused=!state.paused;root.classList.toggle('galaxy-motion-paused',state.paused);updateMotionButton();request();}
 $('galaxy-motion').onclick=toggleMotion;
 const namesButton=$('galaxy-names');namesButton.onclick=()=>{state.names=!state.names;namesButton.setAttribute('aria-pressed',state.names);namesButton.title=state.names?'收起人物姓名':'显示人物姓名';namesButton.dataset.tooltip=state.names?'收起姓名':'显示姓名';namesButton.setAttribute('aria-label',namesButton.title);collapseIntro();dirty=true;request();};
 $('galaxy-reset').onclick=reset;
 const immersiveButton=$('galaxy-immersive');
 function immersive(force){const on=force===undefined?!document.body.classList.contains('galaxy-immersive'):force;document.body.classList.toggle('galaxy-immersive',on);immersiveButton.setAttribute('aria-pressed',on);immersiveButton.setAttribute('aria-label',on?'退出沉浸模式':'进入沉浸模式');immersiveButton.dataset.tooltip=on?'退出沉浸':'沉浸模式';layoutDirty=true;request();}
 immersiveButton.onclick=()=>immersive();
 $('galaxy-intro-restore')?.addEventListener('click',restoreIntro);
 const escape=e=>{if(e.key!=='Escape'||document.querySelector('dialog[open]'))return;if(document.body.classList.contains('galaxy-immersive'))immersive(false);else if(!card.hidden)reset();};
 document.addEventListener('keydown',escape);
 root.querySelectorAll('[data-galaxy-focus]').forEach(b=>{b.onclick=()=>{
  if(!byId.has(b.dataset.galaxyFocus))return;
  if(state.filter!=='all')root.querySelector('#netchips [data-f="all"]')?.click();
  $('tog3d').click();visit(b.dataset.galaxyFocus);
 };});
 function resumeAnimation(){if(destroyed)return;state.active=true;layoutDirty=true;last=0;request();}
 function pauseAnimation(){state.active=false;last=0;cancelAnimationFrame(raf);raf=0;hover.hidden=true;}
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else request();};
 const resizeObserver=new ResizeObserver(()=>{layoutDirty=true;request();});resizeObserver.observe(container);resizeObserver.observe(document.querySelector('header.mast'));
 document.addEventListener('visibilitychange',visibility);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(raf);raf=0;container.dataset.ready='false';options.onContextLost?.();});
 const celestialPanel=createCelestialPanel({root,cosmic:{trigger:(id,o)=>cosmic.trigger(id,o),startChain:id=>cosmic.startChain(id),stopAllChains:()=>cosmic.stopAllChains(),stopAllEvents:()=>cosmic.stopAllEvents(),resetSky:()=>cosmic.resetSky(),configure:p=>cosmic.configure(p),listEvents:()=>cosmic.listEvents(),getRegistry:()=>cosmic.getRegistry()},snapshot:()=>container.galaxySnapshot?container.galaxySnapshot():null});
 cosmic.setNotifyHandler(def=>celestialPanel.showToast(def));
 updateMotionButton();container.dataset.ready='true';container.dataset.nodeCount=nodes.length;container.dataset.linkCount=links.length;
 container.cosmicTrigger=(id,options)=>cosmic.trigger(id,options);
 container.cosmicStartChain=(id)=>cosmic.startChain(id);
 container.cosmicStopAllChains=()=>cosmic.stopAllChains();
 container.cosmicStopAllEvents=()=>cosmic.stopAllEvents();
 container.galaxySnapshot=()=>({active:state.active,paused:state.paused,core:core.getState(),coreFocus:state.coreFocus,filter:state.filter,medievalPhase:state.medievalPhase,selectedId:state.selectedId,focusId:state.focusId,relationTypes:[...state.relationTypes],nodes:nodes.length,links:links.length,frameRevision,names:state.names,relationshipStyle:relationshipLines.getState(),cruise:state.cruise,trail:[...state.trail],via:state.via,bodies:mode()?celestial.getState():{instances:0,rings:0,coronae:0},overview:state.filter==='all'?overview.getState():null,meteors:meteors.getState(),cosmic:state.filter==='all'?cosmic.getState():null,cosmicRegistry:cosmic.getRegistry(),cosmicWorldState:cosmic.getWorldState(),celestialApplicable:celestialApplicableVal(),celestialContextDim:{...ctxDim},cameraDistance:camera.distance,cameraYaw:camera.yaw,cameraPitch:camera.pitch,time:state.time,renderSize:[canvas.width,canvas.height],atlasReady:state.atlasReady,atlasError:state.atlasError,geometry:atlas.active?{kind:atlas.active.kind,bounds:atlas.active.bounds,points:atlas.active.dustCount,segments:atlas.active.lineCount/2}:null,frameTiming:{p95:frameIntervals.length?[...frameIntervals].sort((a,b)=>a-b)[Math.floor((frameIntervals.length-1)*.95)]:null,longFrames},flowProbe:world(mode()?[170,120,25]:[310,60,170]),projectedStars:nodes.filter(inFilter).map(n=>({id:n.id,world:n.worldPosition,screen:n.screen,renderable:n.renderable,radius:n.body.radius,type:n.body.type,name:n.m.n}))});
 return{setState,focus,reset,collapseIntro,restoreIntro,pauseAnimation,resumeAnimation,triggerCosmicEvent:(id,options)=>cosmic.trigger(id,options),visibleNodeIds:(filter)=>nodes.filter(n=>(filter==='all'||n.m.e===filter)&&(filter!=='medieval'||state.medievalPhase==='all'||medievalLate.has(n.id)===(state.medievalPhase==='late'))).map(n=>n.id),getState:()=>({active:state.active,paused:state.paused,core:core.getState(),coreFocus:state.coreFocus,filter:state.filter,medievalPhase:state.medievalPhase,selectedId:state.selectedId,focusId:state.focusId,relationTypes:[...state.relationTypes],nodes:nodes.length,links:links.length,geometryRevision,frameRevision,cameraDistance:camera.distance}),destroy(){destroyed=true;pauseAnimation();celestialPanel.destroy();resizeObserver.disconnect();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',escape);atlas.destroy();celestial.destroy();core.destroy();relationshipLines.destroy();meteors.destroy();cosmic.destroy();deepSky.destroy();overview.destroy();atlasNote.remove();credit.remove();for(const b of[dustBuffer,nebulaBuffer,filamentBuffer,axialBuffer,lightflowBuffer,orbitBuffer,quad])gl.deleteBuffer(b);for(const t of[sceneTarget,glowA,glowB]){gl.deleteFramebuffer(t.framebuffer);gl.deleteTexture(t.texture);if(t.depth)gl.deleteRenderbuffer(t.depth);}for(const p of[pointProgram,lineProgram,blurProgram,compositeProgram])gl.deleteProgram(p);container.innerHTML='';}};
}
