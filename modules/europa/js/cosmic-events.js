/* Independent, session-random sky events. Everything follows the scene clock,
   including scheduling, so pause and inactive views freeze the entire sky.
   Event definitions and scheduling metadata live in celestial-event-registry.js;
   this file owns the WebGL resources, the persistent portals, the scheduler
   loop, the event lifecycle and the manual trigger API.

   STAGE 8R contract: every entry point (auto / manual / force / chain step)
   passes through one shared permission check (canSpawn). force may only skip
   timing gates (cadence, cooldown, major pacing); it can never bypass the
   master switch, rarity toggles, host state (view/pause/reduced/destroyed),
   concurrency limits, exclusive groups, the recovery window or the hard cap.
   Chain steps advance only after a successful spawn; a chain is COMPLETE only
   after every spawned child event has finished. */
import {createCelestialBodies} from './celestial-bodies.js?v=20260911-depth2';
import {defineCelestialEvents,validateCelestialEventDefinitions,PALETTE,CELESTIAL_CHAINS} from './celestial-event-registry.js';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),range=(a,b)=>a+Math.random()*(b-a),gap=(min,mean,max)=>Math.min(max,min-Math.log(1-Math.random())*mean);
const add=(a,b)=>a.map((v,k)=>v+b[k]),mul=(a,s)=>a.map(v=>v*s),unit=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const gold=PALETTE.gold,ice=PALETTE.ice,violet=PALETTE.violet;
const CONFIG={maxActiveEvents:7,hardEventCap:24,deferDelayMin:1.5,deferDelayMax:3};
export const COSMIC_EVENT_CONFIG=CONFIG;
/* Product pacing for major (legendary) events, per the Stage 8R contract. */
export const COSMIC_EVENT_PACING={firstMajorDelay:60,majorInterval:120,recoveryAfter:10};
const PERF_PRESET={HIGH:{maxActiveEvents:9,budget:1},NORMAL:{maxActiveEvents:7,budget:.65},LOW:{maxActiveEvents:5,budget:.4}};

export function createCosmicEvents(gl,program,buffer,options){
 const host=options&&options.hostState?options.hostState:{};
 const settings={enabled:true,rarity:{common:true,rare:true,legendary:true},density:1,intensity:1,performance:'NORMAL',chainsEnabled:true};
 let notifyHandler=null;
 /* STAGE 9B.1 contextual dim (pure visual): events/portals render intensity,
    driven by galaxy per frame from the existing focus/relation state */
 const contextDim = { events: 1, portals: 1 };
 function setContextDim(events, portals) { contextDim.events = events; contextDim.portals = portals; }
 let masterOffAt=null;
 let destroyed=false;
 const actors=Array.from({length:12},(_,i)=>({id:'cosmic-'+i,renderable:false,emphasis:1,worldPosition:[0,0,0],body:{type:1,radius:8,seed:Math.random(),color:gold,tilt:range(.2,1.4),satellite:false}})),bodies=createCelestialBodies(gl,program,buffer,actors);
 const points=new Float32Array(7000*8),lines=new Float32Array(14000*7),pointGPU=buffer(points,gl.DYNAMIC_DRAW),lineGPU=buffer(lines,gl.DYNAMIC_DRAW);let pc=0,lc=0;
 const effectProgram=program('precision highp float;attribute vec3 aPosition;attribute vec3 aColor;attribute vec2 aStyle;uniform mat4 uMVP;uniform float uDPR;uniform float uLimit;varying vec3 vColor;varying float vAlpha;void main(){vec4 c=uMVP*vec4(aPosition,1.0);gl_Position=c;gl_PointSize=clamp(aStyle.x*uDPR*1260.0/max(c.w,150.0),1.0,uLimit);vColor=aColor;vAlpha=aStyle.y;}',
 'precision mediump float;uniform float uPoints;varying vec3 vColor;varying float vAlpha;void main(){float a=vAlpha;if(uPoints>.5){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;a*=exp(-r*5.0);}gl_FragColor=vec4(vColor,a);}');
 const ea=[['aPosition',3,0],['aColor',3,12],['aStyle',2,24]].map(([n,s,o])=>[gl.getAttribLocation(effectProgram,n),s,o]),eu={};for(const n of['uMVP','uDPR','uLimit','uPoints'])eu[n]=gl.getUniformLocation(effectProgram,n);const pointLimit=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
 const lineProgram=program('attribute vec3 aPosition;attribute vec4 aColor;uniform mat4 uMVP;varying vec4 vColor;void main(){gl_Position=uMVP*vec4(aPosition,1.0);vColor=aColor;}','precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vColor;}'),la=[['aPosition',3,0],['aColor',4,12]].map(([n,s,o])=>[gl.getAttribLocation(lineProgram,n),s,o]),lm=gl.getUniformLocation(lineProgram,'uMVP');
 const portalProgram=program(`precision highp float;attribute vec3 aPosition;attribute vec4 aColor;attribute vec2 aMotion;uniform mat4 uMVP;uniform vec3 uOrigin;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uBack;uniform float uRadius;uniform float uKind;uniform float uTime;uniform float uSurge;varying vec4 vColor;
 void main(){float r=aPosition.x,a=aPosition.y+uTime*aMotion.x,z=aPosition.z;vec3 p;
  if(uKind<.5){p=aMotion.y>.5?vec3(cos(a)*r,sin(a)*r,0.0):vec3(cos(a)*r,sin(a)*r*.23+sin(a*3.0+uTime)*.018,sin(a)*r*.973);}
  else{p=vec3(cos(a)*r+.055*sin(z*3.0+uTime*.5),sin(a)*r*.86,z+sin(a)*r*.36);}
  vec3 w=uOrigin+(uRight*p.x+uUp*p.y+uBack*p.z)*uRadius;gl_Position=uMVP*vec4(w,1.0);float hot=.55+.45*pow(.5+.5*cos(aPosition.y*2.0-uTime*1.8+z*3.0),6.0);vColor=vec4(aColor.rgb,aColor.a*hot*(1.0+uSurge*1.6));
 }`,'precision mediump float;uniform float uDim;varying vec4 vColor;void main(){gl_FragColor=vec4(vColor.rgb,vColor.a*uDim);}');
 const pa=[['aPosition',3,0],['aColor',4,12],['aMotion',2,28]].map(([n,s,o])=>[gl.getAttribLocation(portalProgram,n),s,o]),pu={};for(const n of['uMVP','uOrigin','uRight','uUp','uBack','uRadius','uKind','uTime','uSurge','uDim'])pu[n]=gl.getUniformLocation(portalProgram,n);
 function makePortal(kind){const data=[];function trace(fn,color,alpha,rate,steps=120,optical=0){let prev=fn(0);for(let j=1;j<=steps;j++){const q=fn(j/steps);for(const p of[prev,q])data.push(...p,...color,alpha,rate,optical);prev=q;}}
  if(!kind){for(let k=0;k<62;k++){const r=1.40+k/61*2.05;trace(t=>[r,t*TAU+k*.73,0],k%5?gold:[1,.91,.67],k%8===0?.34:.18,.30+.66/r);}for(const r of[1.045,1.072,1.12])trace(t=>[r,t*TAU,0],[1,.84,.48],.65,.18,160,1);}
  else{for(let k=0;k<13;k++){const r=2.3*Math.exp(-k*.17),z=-k*.30;trace(t=>[r,t*TAU,z],k%2?ice:violet,.27-k*.010,.27+k*.04);}for(let k=0;k<22;k++)trace(t=>[2.3*Math.exp(-t*2.04),k/22*TAU+t*TAU*2.8,-t*3.60],k%2?ice:violet,.14,.46,140);for(const r of[2.28,2.34])trace(t=>[r,t*TAU,0],[.70,.94,1],.34,.36,160);}
  return{gpu:buffer(new Float32Array(data)),count:data.length/9};
 }
 const portalGeometry=[makePortal(0),makePortal(1)],portals=[{name:'black-hole',screen:[0,0],origin:[0,0,0],radius:1,frame:null},{name:'wormhole',screen:[0,0],origin:[0,0,0],radius:1,frame:null}];
 let layoutKey='',events=[],next={},counts={},history=[],serial=0,lastTime=0,frameArgs=null,lastEnd={};
 let worldState='QUIET',lastLegendaryEnd=-Infinity,epochBase=0,firstLegendaryAt=null,lastLegendaryStart=null;
 const chains={};
 const chainLog={};const trimLog=()=>{const ks=Object.keys(chainLog);while(ks.length>8)delete chainLog[ks.shift()];};
 function configure(patch){
  if(patch){
   if(patch.enabled!==undefined){
    const v=!!patch.enabled,now=frameArgs?frameArgs.time:masterOffAt;
    if(settings.enabled&&!v){masterOffAt=now;immediateCancelAll('master-off');}
    if(!settings.enabled&&v&&masterOffAt!=null&&now!=null){
     /* the OFF window must not accelerate the rhythm when the sky returns:
        every schedule anchored to scene time shifts by the OFF duration */
     const off=Math.max(0,now-masterOffAt);masterOffAt=null;
     if(off>0){for(const k of Object.keys(next))next[k]+=off;epochBase+=off;
      if(firstLegendaryAt!=null)firstLegendaryAt+=off;if(lastLegendaryStart!=null)lastLegendaryStart+=off;
      if(lastLegendaryEnd>-Infinity)lastLegendaryEnd+=off;
      for(const k of Object.keys(lastEnd))if(lastEnd[k]>-Infinity)lastEnd[k]+=off;}
    }
    settings.enabled=v;
   }
   if(patch.rarity)Object.assign(settings.rarity,patch.rarity);
   if(patch.density!==undefined)settings.density=clamp(+patch.density||1,.25,2);
   if(patch.intensity!==undefined)settings.intensity=clamp(+patch.intensity||1,.3,1.6);
   if(patch.performance!==undefined&&PERF_PRESET[patch.performance]){settings.performance=patch.performance;CONFIG.maxActiveEvents=PERF_PRESET[patch.performance].maxActiveEvents;ctx.budget=PERF_PRESET[patch.performance].budget;}
   if(patch.chainsEnabled!==undefined){
    const cv=!!patch.chainsEnabled;
    if(settings.chainsEnabled&&!cv&&frameArgs){
     const now=frameArgs.time;
     for(const id of Object.keys(chains)){
      const c=chains[id];
      chainLog[id]={state:'cancelled',at:now,spawned:[...c.spawned],reason:'chains-disabled'};
      trimLog();delete chains[id];
     }
    }
    settings.chainsEnabled=cv;
   }
  }
  return getSettings();
 }
 function getSettings(){return{enabled:settings.enabled,rarity:{...settings.rarity},density:settings.density,intensity:settings.intensity,performance:settings.performance,chainsEnabled:settings.chainsEnabled};}
 function setNotifyHandler(fn){notifyHandler=typeof fn==='function'?fn:null;}
 /* STAGE 8R.1 A/B: synchronous cancellation — configure() must not wait for
    the next RAF to make OFF take effect */
 function immediateCancelAll(reason){
  const now=frameArgs?frameArgs.time:masterOffAt!=null?masterOffAt:lastTime;
  for(const e of events)e.state='cancelled';
  events=[];
  for(const id of Object.keys(chains)){
   const c=chains[id];
   /* a chain already in 'ending' keeps its children running, but its
      bookkeeping is cancelled here and can never be recorded COMPLETE */
   chainLog[id]={state:'cancelled',at:now,spawned:[...c.spawned],reason};
   trimLog();delete chains[id];
  }
  worldState='QUIET';
 }
 function reset(base){
  for(const e of events)e.state='cancelled';events=[];
  const now=typeof base==='number'?base:(frameArgs?frameArgs.time:0);
  for(const id of Object.keys(chains)){chainLog[id]={state:'cancelled',at:now,spawned:[...chains[id].spawned],reason:'reset'};trimLog();delete chains[id];}
  const prevTime=lastTime;
  next={};counts={};history=[];lastEnd={};lastTime=now;
  /* STAGE 8R: no residual world state, recovery record or stale frame args
     may survive a reset; when the clock rewinds the cached camera basis is
     dropped so no trigger can succeed against a stale frame */
  worldState='QUIET';lastLegendaryEnd=-Infinity;epochBase=now;firstLegendaryAt=null;lastLegendaryStart=null;
  if(typeof base==='number'&&base<prevTime)frameArgs=null;
  for(const def of defs){const w=def.warmup||{min:def.cadence.min,max:def.cadence.max};next[def.id]=now+range(w.min,w.max);counts[def.id]=0;}}
 function resetSky(){reset(frameArgs?frameArgs.time:undefined);}
 function cameraPoint(x,y,depth,args){const f=args.height/(2*Math.tan(21*Math.PI/180)),distance=args.basis.distance,target=args.cameraTarget;return target.map((v,k)=>v+args.basis.back[k]*(distance-depth)+args.basis.right[k]*(x-args.width*(.5+args.center*.5))*depth/f+args.basis.up[k]*(args.height*.4925-y)*depth/f);}
 function layout(args){const key=[args.width,args.height,args.center].join('|');if(key===layoutKey)return;layoutKey=key;const h=args.home,sy=Math.sin(h.yaw),cy=Math.cos(h.yaw),sp=Math.sin(h.pitch),cp=Math.cos(h.pitch),right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp],back=[sy*cp,sp,cy*cp],distance=h.distance*Math.max(1,1350/args.width),basis={right,up,back,distance},base={...args,basis,cameraTarget:h.target},eye=h.target.map((v,k)=>v+back[k]*distance),f=args.height/(2*Math.tan(21*Math.PI/180));
  [[.73,.70,1800,27],[.31,.27,2150,23]].forEach(([x,y,d,r],i)=>{const p=portals[i];p.screen=[x*args.width,y*args.height];p.origin=cameraPoint(...p.screen,d,base);p.radius=r*d/f;const b=unit(eye.map((v,k)=>v-p.origin[k])),rgt=unit(cross(up,b));p.frame={right:rgt,up:cross(b,rgt),back:b};});
 }
 function freePosition(args,radius=65,x0=.29,x1=.91,y0=.14,y1=.81){for(let i=0;i<40;i++){const x=range(args.width*x0,args.width*x1),y=range(args.height*y0,args.height*y1);if(args.obstacles.some(b=>x+radius>b.x&&x-radius<b.x+b.w&&y+radius>b.y&&y-radius<b.y+b.h))continue;if(args.clusters.some(g=>g.screen&&Math.hypot(x-g.screen.x,y-g.screen.y)<radius+52))continue;if(portals.some(p=>Math.hypot(x-p.screen[0],y-p.screen[1])<radius+90))continue;return[x,y];}return[args.width*(x0+x1)/2,args.height*(y0+y1)/2];}
 function point(p,c,size,alpha){alpha*=settings.intensity*contextDim.events;if(alpha<.001||pc+8>points.length)return;points[pc++]=p[0];points[pc++]=p[1];points[pc++]=p[2];points[pc++]=c[0];points[pc++]=c[1];points[pc++]=c[2];points[pc++]=size;points[pc++]=alpha;}
 function line(a,b,c,alpha){alpha*=settings.intensity*contextDim.events;if(alpha<.001||lc+14>lines.length)return;for(const p of[a,b]){lines[lc++]=p[0];lines[lc++]=p[1];lines[lc++]=p[2];lines[lc++]=c[0];lines[lc++]=c[1];lines[lc++]=c[2];lines[lc++]=alpha;}}
 function actor(i,p,r,type,color,seed=0.3){const a=actors[i];a.renderable=true;a.worldPosition=p;a.body.radius=r;a.body.type=type;a.body.color=color;a.body.seed=seed;}
 function portalPoint(portal,p){const f=portal.frame;return portal.origin.map((v,k)=>v+(f.right[k]*p[0]+f.up[k]*p[1]+f.back[k]*p[2])*portal.radius);}
 function ring(center,basis,r,color,alpha,tilt=.15){let last=null;for(let k=0;k<=128;k++){const a=k/128*TAU,p=center.map((v,i)=>v+basis.right[i]*Math.cos(a)*r+(basis.up[i]*Math.cos(tilt)+basis.back[i]*Math.sin(tilt))*Math.sin(a)*r);if(last)line(last,p,color,alpha);last=p;}}
 const ctx={clamp,range,cameraPoint,freePosition,portals,portalPoint,ring,point,line,actor,claimActor(){return ctx.actorCursor<actors.length?ctx.actorCursor++:-1;},actorCursor:2,budget:1};
 const defs=defineCelestialEvents(ctx);
 validateCelestialEventDefinitions(defs);
 const defsById=new Map(defs.map(d=>[d.id,d]));
 function stopAllEvents(){for(const e of events)e.state='cancelled';events=[];}
 /* ---- STAGE 8R: the single shared permission check ----
    Returns null when the spawn is permitted, otherwise a refusal reason.
    force only skips the four TIMING gates (cadence, cooldown, first-major
    delay, major interval). Everything else applies to every entry point. */
 function canSpawn(def,args,force){
  if(destroyed)return 'destroyed';
  if(!def.enabled)return 'disabled';
  if(!settings.enabled)return 'master-off';
  if(!settings.rarity[def.rarity])return 'rarity-disabled';
  if(host.viewApplicable&&!host.viewApplicable())return 'view-not-applicable';
  if(host.paused&&host.paused())return 'paused';
  if(host.reduced&&host.reduced())return 'reduced-motion';
  if(!args)return 'scene-not-ready';
  if(events.length>=CONFIG.hardEventCap)return 'event-cap';
  if(events.length>=CONFIG.maxActiveEvents)return 'concurrency';
  if(def.maxConcurrent!=null&&events.filter(o=>o.type===def.id).length>=def.maxConcurrent)return 'type-concurrent';
  if(def.exclusiveGroup&&events.some(o=>defsById.get(o.type)?.exclusiveGroup===def.exclusiveGroup))return 'exclusive-group';
  if(def.rarity==='legendary'){
   /* at most one legendary in the sky, ever; recovery window is not bypassable */
   if(events.some(o=>defsById.get(o.type)?.rarity==='legendary'))return 'legendary-exclusive';
   if(worldState==='RECOVERY')return 'recovery';
   if(!force){
    if(firstLegendaryAt==null&&args.time-epochBase<COSMIC_EVENT_PACING.firstMajorDelay)return 'first-major-delay';
    if(lastLegendaryStart!=null&&args.time-lastLegendaryStart<COSMIC_EVENT_PACING.majorInterval)return 'major-interval';
   }
  }
  if(!force){
   if(args.time<next[def.id])return 'cadence';
   if(lastEnd[def.id]!=null&&args.time-lastEnd[def.id]<def.cooldown)return 'cooldown';
  }
  return null;
 }
 function spawnEvent(def,args){
  const e=def.spawn(args);
  e.id=++serial;e.type=def.id;e.start=args.time;e.state='active';
  events.push(e);counts[def.id]=(counts[def.id]||0)+1;
  if(def.rarity==='legendary'){
   if(firstLegendaryAt==null)firstLegendaryAt=args.time;
   lastLegendaryStart=args.time;
   if(notifyHandler)notifyHandler(def);
  }
  history.push({id:e.id,type:def.id,at:args.time,variant:e.variant??'',position:e.screen||null});if(history.length>18)history.shift();
  return e;
 }
 function update(args){frameArgs=args;lastTime=args.time;layout(args);for(const p of portals){const v=p.origin,m=args.matrix,d=m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15],x=m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],y=m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13];p.screen=[(x/d*.5+.5)*args.width,(.5-y/d*.5)*args.height];}
  /* master OFF: cancel every temporary event and chain (contract R1) */
  if(!settings.enabled){
   for(const e of events)e.state='cancelled';events=[];
   for(const id of Object.keys(chains)){chainLog[id]={state:'cancelled',at:args.time,spawned:[...chains[id].spawned],reason:'master-off'};trimLog();delete chains[id];}
   worldState='QUIET';
   return;
  }
  events=events.filter(e=>{const def=defsById.get(e.type),age=args.time-e.start,alive=!!def&&(def.isAlive?def.isAlive(e,age):age<e.life);
   if(!alive){e.state='complete';lastEnd[e.type]=args.time;return false;}return true;});
  const legendaryActive=events.some(e=>defsById.get(e.type)?.rarity==='legendary');
  if(worldState==='MAJOR_EVENT'&&!legendaryActive)lastLegendaryEnd=args.time;
  worldState=legendaryActive?'MAJOR_EVENT':lastLegendaryEnd>-Infinity&&args.time-lastLegendaryEnd<COSMIC_EVENT_PACING.recoveryAfter?'RECOVERY':events.length>=4?'ACTIVE':events.length>=1?'NORMAL':'QUIET';
  updateChains(args);
  for(const def of defs){
   if(!def.enabled)continue;
   if(args.time<next[def.id])continue;
   /* a flagship major event dominates the sky: hold commons back */
   if(worldState==='MAJOR_EVENT'&&def.rarity==='common'){next[def.id]=args.time+range(2.5,5);continue;}
   const blocked=canSpawn(def,args,false);
   if(blocked){
    if(blocked==='cadence'||blocked==='cooldown'||blocked==='first-major-delay'||blocked==='major-interval'||blocked==='legendary-exclusive'||blocked==='recovery'||blocked==='concurrency'||blocked==='type-concurrent'||blocked==='exclusive-group'||blocked==='master-off'||blocked==='rarity-disabled')next[def.id]=args.time+range(CONFIG.deferDelayMin,CONFIG.deferDelayMax);
    continue;
   }
   spawnEvent(def,args);
   next[def.id]=args.time+gap(def.cadence.min,def.cadence.mean,def.cadence.max)/settings.density;
  }
 }
 /* Event chains: sequential scene-clock scripts. A step advances ONLY after
    its event spawned successfully; temporary blocks (cap, exclusivity,
    recovery, paused host, wrong view) hold the current step without skipping.
    The chain enters 'ending' once the last step spawns and is COMPLETE only
    when every spawned child event has finished its own lifecycle. */
 /* STAGE 8R.1 C: one host-permission helper shared by startChain (the per-step
    spawn itself still goes through canSpawn at execution time, so cadence /
    cooldown / exclusivity are handled where they belong) */
 function canStartChain(){
  if(destroyed)return 'destroyed';
  if(!settings.enabled)return 'master-off';
  if(!settings.chainsEnabled)return 'chains-disabled';
  if(host.viewApplicable&&!host.viewApplicable())return 'view-not-applicable';
  if(host.paused&&host.paused())return 'paused';
  if(host.reduced&&host.reduced())return 'reduced-motion';
  return null;
 }
 function startChain(id){
  const def=CELESTIAL_CHAINS[id];
  if(!def){console.warn('[cosmic-events] startChain: unknown chain id "'+id+'"');return{ok:false,reason:'unknown-chain'};}
  const gate=canStartChain();
  if(gate)return{ok:false,reason:gate};
  if(def.enabled===false)return{ok:false,reason:'chain-disabled'};
  if(!frameArgs)return{ok:false,reason:'scene-not-ready'};
  if(chains[id])return{ok:false,reason:'already-running'};
  chains[id]={def,step:0,nextAt:frameArgs.time,spawned:[],state:'running',waits:0,blockReason:null};
  return{ok:true,steps:def.steps.length};
 }
 function stopAllChains(){let n=0;for(const id of Object.keys(chains)){chains[id].state='cancelled';n++;}return n;}
 function updateChains(args){
  for(const id of Object.keys(chains)){
   const c=chains[id];
   if(c.state==='ending')continue;
   if(c.state==='cancelled'){chainLog[id]={state:'cancelled',at:args.time,spawned:[...c.spawned]};trimLog();delete chains[id];continue;}
   /* the chain toggle kills running chains (independent events are untouched) */
   if(!settings.chainsEnabled){chainLog[id]={state:'cancelled',at:args.time,spawned:[...c.spawned],reason:'chains-disabled'};trimLog();delete chains[id];continue;}
   if(args.time<c.nextAt)continue;
   const step=c.def.steps[c.step],stepDef=defsById.get(step.eventId);
   if(!stepDef||!stepDef.enabled){chainLog[id]={state:'failed',at:args.time,spawned:[...c.spawned],reason:!stepDef?'unknown-event':'disabled'};trimLog();delete chains[id];continue;}
   /* chain steps use the force entry (skip cadence/cooldown/pacing) but are
      still subject to every other permission gate; temporary blocks simply
      hold the current step — no skipping, no completion without children */
   const blocked=canSpawn(stepDef,args,true);
   if(blocked){
    c.waits++;c.blockReason=blocked;
    if(c.waits>150){chainLog[id]={state:'failed',at:args.time,spawned:[...c.spawned],reason:blocked};trimLog();delete chains[id];}
    else c.nextAt=args.time+2;
    continue;
   }
   const e=spawnEvent(stepDef,args);
   c.spawned.push(e.id);c.waits=0;c.blockReason=null;
   c.nextAt=args.time+(step.waitAfter||2);
   c.step++;
   if(c.step>=c.def.steps.length){c.state='ending';c.nextAt=Infinity;}
  }
  /* COMPLETE only after every spawned child has finished its lifecycle */
  for(const id of Object.keys(chains)){
   const c=chains[id];
   if(c.state!=='ending')continue;
   if(!c.spawned.some(sid=>events.some(e=>e.id===sid))){
    chainLog[id]={state:'complete',at:args.time,spawned:[...c.spawned]};trimLog();delete chains[id];
   }
  }
 }
 function surgeIntensity(i,time){return Math.max(0,...events.filter(e=>e.type==='surge'&&e.portal===i).map(e=>Math.sin(clamp((time-e.start)/e.life)*Math.PI)));}
 function drawPortals(args){update(args);gl.uniform1f(pu.uDim,contextDim.portals);for(const a of actors)a.renderable=false;gl.useProgram(portalProgram);gl.uniformMatrix4fv(pu.uMVP,false,args.matrix);gl.uniform1f(pu.uTime,args.time);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
  portals.forEach((p,i)=>{gl.uniform3fv(pu.uOrigin,p.origin);for(const k of['Right','Up','Back'])gl.uniform3fv(pu['u'+k],p.frame[k.toLowerCase()]);gl.uniform1f(pu.uRadius,p.radius);gl.uniform1f(pu.uKind,i);gl.uniform1f(pu.uSurge,surgeIntensity(i,args.time));gl.bindBuffer(gl.ARRAY_BUFFER,portalGeometry[i].gpu);for(const[a,s,o]of pa){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,s,gl.FLOAT,false,36,o);}gl.drawArrays(gl.LINES,0,portalGeometry[i].count);});for(const[a]of pa)gl.disableVertexAttribArray(a);
  actor(0,portals[0].origin,portals[0].radius,6,[.001,.001,.002]);actor(1,portalPoint(portals[1],[0,0,-3.6]),portals[1].radius*.28,6,[.001,.002,.005]);bodies.draw({matrix:args.matrix,time:args.time,eye:args.eye,focal:args.height/(2*Math.tan(21*Math.PI/180))*args.dpr,opacity:1,activeId:null});
 }
 function drawEvents(args){pc=0;lc=0;for(const a of actors)a.renderable=false;ctx.actorCursor=2;
  for(let k=0;k<64;k++){const t=(k/64+args.time*.063)%1,r=2.3*Math.exp(-t*2.04),a=k*.618034*TAU+t*TAU*2.8+args.time*.46;point(portalPoint(portals[1],[Math.cos(a)*r,Math.sin(a)*r*.86,-t*3.60+Math.sin(a)*r*.36]),k%3?ice:violet,2.8,Math.sin(t*Math.PI)*.52);}
  for(const e of events){const def=defsById.get(e.type),age=args.time-e.start;if(def)def.draw(e,age,args);}
  bodies.draw({matrix:args.matrix,time:args.time,eye:args.eye,focal:args.height/(2*Math.tan(21*Math.PI/180))*args.dpr,opacity:1,activeId:null});gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  if(lc){gl.useProgram(lineProgram);gl.uniformMatrix4fv(lm,false,args.matrix);gl.bindBuffer(gl.ARRAY_BUFFER,lineGPU);gl.bufferSubData(gl.ARRAY_BUFFER,0,lines.subarray(0,lc));for(const[a,s,o]of la){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,s,gl.FLOAT,false,28,o);}gl.drawArrays(gl.LINES,0,lc/7);for(const[a]of la)gl.disableVertexAttribArray(a);}
  if(pc){gl.useProgram(effectProgram);gl.uniformMatrix4fv(eu.uMVP,false,args.matrix);gl.uniform1f(eu.uDPR,args.dpr);gl.uniform1f(eu.uLimit,pointLimit);gl.uniform1f(eu.uPoints,1);gl.bindBuffer(gl.ARRAY_BUFFER,pointGPU);gl.bufferSubData(gl.ARRAY_BUFFER,0,points.subarray(0,pc));for(const[a,s,o]of ea){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,s,gl.FLOAT,false,32,o);}gl.drawArrays(gl.POINTS,0,pc/8);for(const[a]of ea)gl.disableVertexAttribArray(a);}gl.depthMask(true);
 }
 function getRegistry(){return{config:{...CONFIG},pacing:{...COSMIC_EVENT_PACING},events:defs.map(d=>({id:d.id,label:d.label,rarity:d.rarity,major:!!d.major,cadence:{...d.cadence},warmup:d.warmup?{...d.warmup}:null,cooldown:d.cooldown,maxConcurrent:d.maxConcurrent,exclusiveGroup:d.exclusiveGroup,weight:d.weight,performanceCost:d.performanceCost,enabled:d.enabled}))};}
 /* Manual trigger / debug API. Every request passes the shared canSpawn gate:
    force only skips timing (cadence, cooldown, major pacing). Refusals always
    carry an explicit reason; unknown ids warn instead of falling back. */
 function trigger(id,options={}){
  const key=String(id),def=defsById.get(key);
  if(destroyed)return{ok:false,reason:'destroyed'};
  if(!def){console.warn('[cosmic-events] trigger: unknown event id "'+key+'"');return{ok:false,reason:'unknown-event'};}
  /* permission first (host gates need no frame), scene-readiness last, so
     refusals always carry the precise reason */
  const blocked=canSpawn(def,frameArgs,!!options.force);
  if(blocked)return{ok:false,reason:blocked};
  if(!frameArgs)return{ok:false,reason:'scene-not-ready'};
  const e=spawnEvent(def,frameArgs);
  next[key]=frameArgs.time+gap(def.cadence.min,def.cadence.mean,def.cadence.max)/settings.density;
  return{ok:true,event:{id:e.id,type:key}};
 }
 reset();
 return{reset,resetSky,drawPortals,setContextDim,drawEvents,trigger,startChain,stopAllChains,stopAllEvents,configure,getSettings,setNotifyHandler,listEvents:()=>defs.map(d=>d.id),getWorldState:()=>worldState,getRegistry,getState:()=>({counts:{...counts},next:{...next},worldState,chainHistory:JSON.parse(JSON.stringify(chainLog)),chains:Object.fromEntries(Object.entries(chains).map(([id,c])=>[id,{step:c.step,state:c.state,waits:c.waits,blockReason:c.blockReason,spawned:[...c.spawned]}])),active:events.map(e=>{const def=defsById.get(e.type),age=lastTime-e.start;return{id:e.id,type:e.type,state:e.state,age,phase:def&&def.phase?def.phase(e,age):e.type,variant:e.variant??'',screen:e.screen||null};}),recent:[...history],portals:portals.map(p=>({name:p.name,screen:p.screen})),points:pc/8,lineVertices:lc/7,registry:getRegistry(),cooldownRemaining:Object.fromEntries(defs.map(d=>{const end=lastEnd[d.id];return[d.id,end==null?0:Math.max(0,d.cooldown-(lastTime-end))];}))}),destroy(){destroyed=true;for(const e of events)e.state='cancelled';events=[];for(const id of Object.keys(chains)){chainLog[id]={state:'cancelled',at:lastTime,spawned:[...chains[id].spawned],reason:'destroyed'};delete chains[id];}bodies.destroy();for(const b of[pointGPU,lineGPU,...portalGeometry.map(p=>p.gpu)])gl.deleteBuffer(b);for(const p of[effectProgram,lineProgram,portalProgram])gl.deleteProgram(p);}};
}
