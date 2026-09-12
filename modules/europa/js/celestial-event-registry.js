/* Data-driven registry for the cosmic event subsystem in cosmic-events.js.
   Each definition carries the exact spawn/draw math of the previously
   hardcoded implementation, plus the scheduling metadata (rarity, cadence,
   cooldown, concurrency, exclusiveGroup) consumed by the scheduler. This
   module holds no WebGL resources and no render-loop state of its own. */
import {env,mixc,vnorm,vcross,vdot,vunitRand,hnoise,blob,beamFan} from './celestial-event-effects.js';

export const CELESTIAL_EVENT_RARITIES=['common','rare','epic','legendary'];
export const PALETTE={gold:[1,.70,.30],ice:[.49,.84,1],violet:[.70,.47,1]};
const {gold,ice,violet}=PALETTE;

const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const range=(a,b)=>a+Math.random()*(b-a);
const direction=()=>{const z=range(-1,1),a=range(0,TAU),r=Math.sqrt(1-z*z);return[r*Math.cos(a),z,r*Math.sin(a)];};

function fail(what){throw new Error('[celestial-event-registry] invalid event definition: '+what);}

/* Initialization-time validation. A nonconforming registry must fail loudly
   (createCosmicEvents throws, galaxy falls back to the 2D view) rather than
   silently degrading to partial scheduling behavior. */
export function validateCelestialEventDefinitions(defs){
 const seen=new Set();
 for(const def of defs){
  if(!def||typeof def!=='object')fail('(non-object entry)');
  const id=def.id;
  if(typeof id!=='string'||!id)fail('(missing id)');
  if(seen.has(id))fail(id+' (duplicate id)');seen.add(id);
  if(!CELESTIAL_EVENT_RARITIES.includes(def.rarity))fail(id+' (rarity)');
  const c=def.cadence;
  if(!c||!isFinite(c.min)||!isFinite(c.mean)||!isFinite(c.max)||c.min<0||c.mean<=0||c.max<c.min)fail(id+' (cadence)');
  if(def.warmup&&(!isFinite(def.warmup.min)||!isFinite(def.warmup.max)||def.warmup.min<0||def.warmup.max<def.warmup.min))fail(id+' (warmup)');
  if(!isFinite(def.cooldown)||def.cooldown<0)fail(id+' (cooldown)');
  if(def.maxConcurrent!=null&&(!Number.isInteger(def.maxConcurrent)||def.maxConcurrent<1))fail(id+' (maxConcurrent)');
  if(def.exclusiveGroup!=null&&(typeof def.exclusiveGroup!=='string'||!def.exclusiveGroup))fail(id+' (exclusiveGroup)');
  if(typeof def.enabled!=='boolean')fail(id+' (enabled)');
  if(typeof def.spawn!=='function')fail(id+' (spawn hook)');
  if(typeof def.draw!=='function')fail(id+' (draw hook)');
 }
 return true;
}

/* ctx is provided by cosmic-events.js and carries the shared scene
   facilities: point/line buffer writers, the instanced-body actor slots
   (actor(index,...) / claimActor()), the two persistent portals with
   portalPoint(), ring(), cameraPoint(), freePosition(). */
export function defineCelestialEvents(ctx){

 function asteroidPoint(e,m,age){
  if(e.captured){const t=clamp(age/e.life),r=m.orbit*(1-t)+.75,a=m.angle+t*TAU*1.35;
   return ctx.portalPoint(ctx.portals[0],[Math.cos(a)*r,Math.sin(a)*r*.38,Math.sin(a)*r*.95]);}
  return m.origin.map((v,k)=>v+m.velocity[k]*age-e.basis.up[k]*age*age*3*e.pixel);
 }
 const pixelOf=(args,depth)=>depth/(args.height/(2*Math.tan(21*Math.PI/180)));
 const basisOf=args=>({right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]});
 const skySpot=args=>ctx.freePosition(args,65);
 const meteorTrail=(origin,velocity,age,color,len,segs,alpha)=>{
  let prev=null;
  for(let j=0;j<=segs;j++){const q=j/segs,p=origin.map((v,k)=>v+velocity[k]*Math.max(0,age-q*len));
   if(prev)ctx.line(prev,p,color,Math.pow(1-q,2)*alpha);prev=p;}
 };

 return[
 {
  id:'meteor',label:'流星群',rarity:'common',
  cadence:{min:3,mean:5,max:18},warmup:{min:1.8,max:4.8},
  cooldown:0,maxConcurrent:null,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  spawn(args){
   const depth=range(1080,1780),pixel=depth/(args.height/(2*Math.tan(21*Math.PI/180)));
   const e={life:3.5,seed:Math.random(),pixel,color:Math.random()<.55?gold:ice,basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]},members:[]};
   const fromRight=Math.random()<.70,angle=range(.22,.68),count=Math.floor(range(3,8));
   for(let i=0;i<count;i++){
    const speed=range(370,650)*pixel,x=fromRight?range(.79,1.03)*args.width:range(.26,.40)*args.width,y=range(.06,.36)*args.height;
    e.members.push({origin:ctx.cameraPoint(x,y,depth,args),velocity:args.basis.right.map((v,k)=>v*(fromRight?-1:1)*Math.cos(angle)*speed-args.basis.up[k]*Math.sin(angle)*speed-args.basis.back[k]*range(20,50)),delay:i*range(.10,.21),life:range(1.2,2.5),tail:range(.13,.27)});
   }
   return e;
  },
  draw(e,age){
   for(const m of e.members){
    const a=age-m.delay;if(a<0||a>m.life)continue;
    const fade=Math.min(1,a*8,(m.life-a)*3),head=m.origin.map((v,k)=>v+m.velocity[k]*a);
    ctx.point(head,e.color,4.8,fade*.95);
    for(let k=0;k<22;k++){const q=k/22,q2=(k+1)/22,p=m.origin.map((v,j)=>v+m.velocity[j]*Math.max(0,a-q*m.tail)),p2=m.origin.map((v,j)=>v+m.velocity[j]*Math.max(0,a-q2*m.tail));ctx.line(p,p2,e.color,Math.pow(1-q,2)*fade*.85);}
   }
  }
 },
 {
  id:'asteroid',label:'小行星',rarity:'rare',
  cadence:{min:8,mean:10,max:30},warmup:{min:4,max:9},
  cooldown:0,maxConcurrent:null,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  spawn(args){
   const depth=range(1080,1780),pixel=depth/(args.height/(2*Math.tan(21*Math.PI/180)));
   const e={life:range(5,8),seed:Math.random(),pixel,color:Math.random()<.55?gold:ice,basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]},members:[],captured:Math.random()<.30};
   e.variant=e.captured?'capture':'drift';
   const count=Math.floor(range(1,4));
   for(let i=0;i<count;i++){
    const xy=ctx.freePosition(args,24),origin=ctx.cameraPoint(xy[0],xy[1],depth,args),speed=range(75,145)*pixel;
    e.members.push({origin,velocity:args.basis.right.map((v,k)=>-v*speed-args.basis.up[k]*range(25,65)*pixel),radius:range(4,8)*pixel,seed:Math.random(),angle:range(0,TAU),orbit:range(4.0,6.0)});
   }
   return e;
  },
  draw(e,age){
   for(const m of e.members){
    const fade=clamp(age*2)*clamp((e.life-age)*1.7),p=asteroidPoint(e,m,age),slot=ctx.claimActor();
    if(slot>=0)ctx.actor(slot,p,m.radius*(e.captured?clamp((e.life-age)*1.5):1),1,[.42,.30,.20],m.seed);
    ctx.point(p,[1,.60,.26],m.radius/e.pixel*3.2,fade*.20);
    for(let k=0;k<15;k++){const q=k/15,p1=asteroidPoint(e,m,Math.max(0,age-q*.45)),p2=asteroidPoint(e,m,Math.max(0,age-(q+.067)*.45));ctx.line(p1,p2,[.82,.49,.25],Math.pow(1-q,2)*fade*.34);ctx.point(p1,[.60,.43,.30],3+q*9,Math.pow(1-q,2)*fade*.035);}
   }
  }
 },
 {
  id:'collapse',label:'超新星塌缩',rarity:'legendary',
  major:true,
  cadence:{min:25,mean:20,max:80},warmup:{min:9,max:17},
  cooldown:8,maxConcurrent:null,exclusiveGroup:'major-explosion',weight:1,performanceCost:'high',enabled:true,
  phase(e,age){return age<1.55?'star':age<2.55?'collapse':'explosion';},
  spawn(args){
   const depth=range(1080,1780),pixel=depth/(args.height/(2*Math.tan(21*Math.PI/180)));
   const e={life:12,seed:Math.random(),pixel,color:Math.random()<.55?gold:ice,basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]}};
   e.screen=ctx.freePosition(args,94);e.origin=ctx.cameraPoint(...e.screen,depth,args);
   e.radius=range(8,13)*pixel;e.color=Math.random()<.60?[1,.66,.29]:[.50,.75,1];
   e.sparks=Array.from({length:Math.floor(range(380,620)*ctx.budget+40)},()=>({dir:direction(),speed:range(11,54)*pixel,seed:Math.random(),size:range(.8,2.6)}));
   return e;
  },
  draw(e,age){
   const blast=age-2.55;
   if(blast<0){
    const collapse=clamp((age-1.55)/1),r=e.radius*(1-collapse*.90)*(1+Math.sin(age*7)*.03),slot=ctx.claimActor();
    if(slot>=0)ctx.actor(slot,e.origin,r,0,[.76,.86,1],e.seed);
    ctx.point(e.origin,ice,30+collapse*30,.15+collapse*.2);
    for(let k=0;k<32;k++){const a=k/32*TAU,rr=e.radius*(3.8-collapse*3),p=e.origin.map((v,i)=>v+e.basis.right[i]*Math.cos(a+age)*rr+e.basis.up[i]*Math.sin(a+age)*rr);ctx.point(p,ice,2.2,collapse*.65);}
   }else{
    const fade=Math.exp(-blast*.33),slot=ctx.claimActor();
    if(slot>=0)ctx.actor(slot,e.origin,e.pixel*(1.7+5*Math.exp(-blast*2.6)),0,blast<1?[1,.95,.84]:ice,e.seed);
    ctx.point(e.origin,[1,.89,.70],140*Math.exp(-blast)+7,Math.exp(-blast*1.6)*.88);
    const r=(12+155*(1-Math.exp(-blast*.53)))*e.pixel,alpha=clamp(blast*5)*Math.exp(-blast*.43);
    ctx.ring(e.origin,e.basis,r,e.color,alpha*.64,.34);ctx.ring(e.origin,e.basis,r*1.025,ice,alpha*.30,.34);
    for(const s of e.sparks){
     const d=s.speed*Math.pow(blast,.83),p=e.origin.map((v,k)=>v+s.dir[k]*d),c=e.color.map((v,k)=>v*(.65+.35*fade));
     ctx.point(p,c,s.size,fade*(.25+s.seed*.50));
     if(s.seed>.82){const tail=e.origin.map((v,k)=>v+s.dir[k]*Math.max(0,d-s.speed*.15));ctx.line(tail,p,c,fade*.32);}
     if(s.seed<.09)ctx.point(p,c,18+s.seed*130,fade*.025);
    }
   }
  }
 },
 {
  id:'surge',label:'传送门涌动',rarity:'rare',
  cadence:{min:11,mean:14,max:50},warmup:{min:6,max:13},
  cooldown:3,maxConcurrent:null,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  spawn(args){
   const e={life:range(4,7),seed:Math.random(),color:Math.random()<.55?gold:ice,basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]}};
   e.portal=Math.random()<.55?0:1;e.variant=ctx.portals[e.portal].name;
   e.sparks=Array.from({length:90},()=>({angle:range(0,TAU),radius:range(2.8,5),offset:Math.random()}));
   return e;
  },
  draw(e,age){
   const p=ctx.portals[e.portal],phase=age/e.life,fade=Math.sin(phase*Math.PI);
   for(const s of e.sparks){
    const t=(phase+s.offset)%1,r=s.radius*(1-t)+.6,a=s.angle+t*TAU*(e.portal?2.0:1.45),q=e.portal?[Math.cos(a)*r*.65,Math.sin(a)*r*.65,-t*3.8]:[Math.cos(a)*r,Math.sin(a)*r*.23,Math.sin(a)*r*.97];
    ctx.point(ctx.portalPoint(p,q),e.portal?ice:gold,3.4,Math.sin(t*Math.PI)*fade*.65);
   }
  }
 },
 /* ── Stage 3 benchmark events: five visually distinct families ── */
 {
  /* Large slow meteor: white-hot core, layered tail, fragments, airburst. */
  id:'fireball',label:'火流星',rarity:'rare',
  cadence:{min:20,mean:18,max:60},warmup:{min:12,max:26},
  cooldown:6,maxConcurrent:2,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<e.airburst?'descent':age<e.airburst+.45?'airburst':'afterglow';},
  spawn(args){
   const depth=range(1080,1780),pixel=depth/(args.height/(2*Math.tan(21*Math.PI/180)));
   const e={life:range(2.5,4),seed:Math.random(),pixel,color:[1,.62,.25],basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]}};
   e.airburst=e.life*.62;
   const fromRight=Math.random()<.5,x=(fromRight?range(.62,.92):range(.08,.38))*args.width,y=range(.08,.3)*args.height;
   e.origin=ctx.cameraPoint(x,y,depth,args);
   const speed=range(110,190)*pixel,angle=range(.10,.3);
   e.velocity=args.basis.right.map((v,k)=>v*(fromRight?-1:1)*Math.cos(angle)*speed-args.basis.up[k]*Math.sin(angle)*speed-args.basis.back[k]*range(8,20));
   e.tail=range(.28,.44);
   e.fragments=Array.from({length:Math.floor(range(3,7))},()=>({delay:range(.3,.6),side:Math.random()<.5?-1:1,drift:range(.15,.5),fall:range(.2,.6),size:range(2.4,4.6),seed:Math.random(),
    vel:[0,0,0]}));
   for(const f of e.fragments)f.vel=args.basis.right.map((v,k)=>v*f.side*f.drift*pixel*90-args.basis.up[k]*f.fall*pixel*30);
   return e;
  },
  draw(e,age,args){
   const fade=env(age/e.life,.12,.3);if(fade<=0)return;
   const head=e.origin.map((v,k)=>v+e.velocity[k]*age);
   /* white-hot core + orange shell + wide faint halo */
   ctx.point(head,[1,.98,.9],10,fade);ctx.point(head,[1,.72,.3],26,fade*.5);ctx.point(head,[1,.5,.2],64,fade*.14);
   /* three-layer tail along the past path */
   const layers=[[.22,[1,.42,.2],.3],[.5,[1,.62,.25],.5],[.8,[1,.9,.75],.72]];
   for(const[frac,col,al]of layers){const tl=e.tail*e.life*frac;let prev=null;
    for(let j=0;j<=16;j++){const q=j/16,p=e.origin.map((v,k)=>v+e.velocity[k]*Math.max(0,age-q*tl));
     if(prev)ctx.line(prev,p,col,Math.pow(1-q,1.6)*fade*al);prev=p;}}
   /* fragments shed after delay, drifting sideways and falling behind */
   for(const f of e.fragments){
    const fa=age-f.delay*e.life;if(fa<=0)continue;
    const p=e.origin.map((v,k)=>v+e.velocity[k]*age+f.vel[k]*fa*.05-args.basis.up[k]*f.fall*e.pixel*fa*fa*22);
    ctx.point(p,[1,.85,.6],f.size,fade*.9);ctx.point(p,[1,.6,.3],f.size*3,fade*.18);
    const fv=e.velocity.map((v,k)=>v+f.vel[k]);
    for(let k=0;k<6;k++){const q=k/6,q2=(k+1)/6,p1=p.map((v,j2)=>v-fv[j2]*q*.12),p2=p.map((v,j2)=>v-fv[j2]*q2*.12);
     ctx.line(p1,p2,[1,.55,.28],Math.pow(1-q,2)*fade*.6);}
   }
   /* airburst flash */
   const blast=age-e.airburst;
   if(blast>0&&blast<.55){const k=Math.exp(-blast*5);
    ctx.point(head,[1,.95,.8],90*Math.exp(-blast*6)+20,k*.55);ctx.point(head,[1,.7,.4],160*Math.exp(-blast*4)+30,k*.2);}
  }
 },
 {
  /* Slow deep-space visitor: nucleus, coma, curved dust tail, straight ion tail. */
  id:'comet-flyby',label:'彗星飞掠',rarity:'rare',
  cadence:{min:40,mean:30,max:120},warmup:{min:15,max:30},
  cooldown:20,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){const t=age/e.life;return t<.3?'approach':t<.7?'perihelion':'receding';},
  spawn(args){
   const depth=range(1400,1800),focal=args.height/(2*Math.tan(21*Math.PI/180)),pixel=depth/focal;
   const e={life:range(16,26),seed:Math.random(),pixel,color:[.62,.85,1],basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]}};
   const fromLeft=Math.random()<.5,x=(fromLeft?range(-.02,.08):range(.92,1.02))*args.width,y=range(.14,.4)*args.height;
   e.origin=ctx.cameraPoint(x,y,depth,args);
   const speed=args.width*.42*depth/focal/e.life,dirX=fromLeft?1:-1;
   e.velocity=args.basis.right.map((v,k)=>v*dirX*speed-args.basis.up[k]*speed*.12);
   e.dir=vnorm(e.velocity);
   /* anti-solar direction: the "sun" sits below the frame */
   e.antiSun=vnorm(e.basis.up.map(v=>v*.8+e.basis.right[0]*0).map((v,k)=>v+e.basis.right[k]*dirX*.35));
   return e;
  },
  draw(e,age){
   const t=age/e.life,fade=Math.sin(clamp(t)*Math.PI);
   const pos=e.origin.map((v,k)=>v+e.velocity[k]*age);
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,pos,4.2*e.pixel*(0.8+.5*Math.sin(t*Math.PI)),5,[.75,.88,1],e.seed);
   ctx.point(pos,[.85,.93,1],7,fade*.5);
   /* coma */
   const cr=e.pixel*(4+7*Math.sin(t*Math.PI));
   for(let i=0;i<34;i++){
    const a=hnoise(i,e.seed)*TAU,rr=cr*Math.sqrt(hnoise(i+50,e.seed))*(.4+.6*Math.sin(t*Math.PI));
    const p=pos.map((v,k)=>v+(e.basis.right[k]*Math.cos(a)+e.basis.up[k]*Math.sin(a))*rr+e.basis.back[k]*Math.sin(a*3+i)*rr*.3);
    ctx.point(p,[.7,.86,1],3+hnoise(i+9,e.seed)*4,fade*(.10+.14*hnoise(i+20,e.seed)));}
   /* curved warm dust tail: lags behind the path, bends upward */
   const dustLen=e.pixel*(60+90*Math.sin(t*Math.PI));
   for(let s=0;s<3;s++){let prev=null;const side=(s-1)*.14;
    for(let j=0;j<=18;j++){const q=j/18;
     const p=pos.map((v,k)=>v-e.dir[k]*dustLen*q+e.basis.up[k]*dustLen*q*q*.16+e.basis.right[k]*side*dustLen*q+e.basis.back[k]*Math.sin(q*7+s*2+e.seed*9)*dustLen*.02);
     if(prev)ctx.line(prev,p,[1,.8,.5],fade*(.22-s*.05)*Math.pow(1-q,.8));
     if(j%2===0)ctx.point(p,[1,.82,.55],2.5+q*5,fade*(.10-s*.02)*(1-q));
     prev=p;}}
   /* straight cold ion tail: anti-sunward, bluish, narrower and brighter-edged */
   const ionLen=e.pixel*(70+110*Math.sin(t*Math.PI));
   for(let s=0;s<2;s++){let prev=null;const side=(s-.5)*.05;
    for(let j=0;j<=16;j++){const q=j/16;
     const p=pos.map((v,k)=>v+e.antiSun[k]*ionLen*q+e.basis.right[k]*side*ionLen*q);
     if(prev)ctx.line(prev,p,[.5,.8,1],fade*.4*(1-q));
     prev=p;}}
  }
 },
 {
  /* Soft multi-layer rippling curtain, green-teal with a violet crown. */
  id:'aurora',label:'极光',rarity:'rare',
  cadence:{min:35,mean:30,max:100},warmup:{min:18,max:35},
  cooldown:15,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'high',enabled:true,
  phase(e,age){const t=age/e.life;return t<.25?'rising':t<.75?'ripple':'fading';},
  spawn(args){
   const depth=range(1400,1700),focal=args.height/(2*Math.tan(21*Math.PI/180)),pixel=depth/focal;
   const e={life:range(9,14),seed:Math.random(),pixel,basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]}};
   const xy=ctx.freePosition(args,150,.28,.72,.10,.34);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.width=args.width*range(.30,.44)*depth/focal;
   e.height=args.height*range(.17,.24)*depth/focal;
   e.strands=Array.from({length:Math.round(4+4*ctx.budget)},(_,i)=>({off:i/(Math.round(4+4*ctx.budget)-1),phase:range(0,TAU),speed:range(.5,.9),sway:range(.5,1.4)}));
   return e;
  },
  draw(e,age,args){
   const t=age/e.life,_env=Math.sin(t*Math.PI);
   for(const layer of[[0,1],[.10,.5]]){
    const backOff=layer[0]*e.width,dim=layer[1];
    for(const s of e.strands){
     let prev=null;
     for(let j=0;j<=26;j++){const v=j/26;
      const sway=Math.sin(v*5+e.seed*9+s.phase+age*s.speed)*.045*s.sway*(1-v*.5);
      const x=s.off*e.width+sway*e.width,y=v*e.height,z=Math.sin(v*3.1+s.phase+age*.4)*e.width*.05;
      const p=e.origin.map((b,k)=>b+args.basis.right[k]*x+args.basis.up[k]*y+args.basis.back[k]*(z+backOff));
      const c=v<.6?mixc([.30,.95,.62],[.36,.85,.85],v/.6):mixc([.36,.85,.85],[.58,.44,.95],(v-.6)/.4);
      const profile=Math.pow(Math.sin(v*Math.PI),.4);
      ctx.point(p,c,e.pixel*(26+30*v),_env*profile*.030*dim);
      if(prev)ctx.line(prev,p,c,_env*profile*.05*dim);
      prev=p;}}
   }
   /* bright lower rim */
   for(const s of e.strands){
    const sway=Math.sin(e.seed*9+s.phase+age*s.speed)*.045*s.sway;
    const p=e.origin.map((b,k)=>b+args.basis.right[k]*(s.off*e.width+sway*e.width));
    ctx.point(p,[.5,1,.7],4,_env*.4);
   }
  }
 },
 {
  /* Staged eclipse of a dedicated event moon with a travelling umbra disc. */
  id:'lunar-eclipse',label:'月食',rarity:'rare',
  cadence:{min:60,mean:45,max:160},warmup:{min:22,max:45},
  cooldown:30,maxConcurrent:1,exclusiveGroup:'lunar-phenomenon',weight:1,performanceCost:'low',enabled:true,
  phase(e,age){const t=age/e.life;
   if(t<.12)return 'normal';if(t<.3)return 'penumbra';if(t<.48)return 'partial';
   if(t<.72)return 'total';if(t<.9)return 'recovery';return 'normal';},
  spawn(args){
   const depth=range(1150,1450),pixel=depth/(args.height/(2*Math.tan(21*Math.PI/180)));
   const e={life:range(20,28),seed:Math.random(),pixel,color:[.82,.82,.87],basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]}};
   const xy=ctx.freePosition(args,90,.2,.8,.10,.35);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.radius=range(20,30)*pixel;
   return e;
  },
  draw(e,age,args){
   const t=age/e.life;let color;
   if(t<.12)color=[.82,.82,.87];
   else if(t<.3)color=mixc([.82,.82,.87],[.62,.60,.66],(t-.12)/.18);
   else if(t<.48)color=mixc([.62,.60,.66],[.30,.24,.26],(t-.3)/.18);
   else if(t<.72)color=mixc([.30,.24,.26],[.66,.26,.10],Math.min(1,(t-.48)/.24*1.4));
   else if(t<.9)color=mixc([.66,.26,.10],[.62,.60,.66],(t-.72)/.18);
   else color=[.82,.82,.87];
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,e.radius,1,color,e.seed);
   /* umbra: near-black disc sliding across the lunar disc (drawn after the
      moon instance, slightly camera-side, so it occludes in the depth pass) */
   const sp=clamp((t-.12)/.78),off=(sp*2-1)*e.radius*2.1;
   const shadowPos=e.origin.map((v,k)=>v-args.basis.back[k]*e.radius*.06+args.basis.right[k]*off);
   const slot2=ctx.claimActor();
   if(slot2>=0)ctx.actor(slot2,shadowPos,e.radius*1.12,6,[.001,.001,.002],e.seed);
   /* copper corona while totally immersed */
   if(t>=.44&&t<.78){const k=Math.sin((t-.44)/.34*Math.PI);
    ctx.point(e.origin,[1,.45,.18],e.radius/e.pixel*4,k*.10);ctx.point(e.origin,[1,.3,.12],e.radius/e.pixel*8,k*.05);}
  }
 },
 {
  /* Tiny blazing neutron star with two opposite beams sweeping the sky. */
  id:'pulsar',label:'脉冲星',rarity:'legendary',
  cadence:{min:70,mean:55,max:180},warmup:{min:30,max:60},
  cooldown:40,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(){return 'sweep';},
  spawn(args){
   const depth=range(1150,1550),pixel=depth/(args.height/(2*Math.tan(21*Math.PI/180)));
   const e={life:range(12,16),seed:Math.random(),pixel,color:[.88,.94,1],basis:{right:[...args.basis.right],up:[...args.basis.up],back:[...args.basis.back]}};
   const xy=ctx.freePosition(args,70,.25,.75,.15,.6);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.spin=range(2.0,3.0)*(Math.random()<.5?-1:1);
   e.axis=vunitRand();
   e.u=vnorm(vcross(e.axis,[.3,.11,.2]));
   e.v=vcross(e.axis,e.u);
   return e;
  },
  draw(e,age,args){
   const _env=Math.min(1,age*1.5,(e.life-age)*1.2);if(_env<=0)return;
   const th=age*e.spin;
   const bd=e.u.map((v,k)=>v*Math.cos(th)+e.v[k]*Math.sin(th));
   const L=e.pixel*150;
   for(const s of[1,-1]){
    beamFan(ctx,e.origin,bd.map((v,k)=>v*s),e.u,L,14,3,.05,s>0?[.75,.88,1]:[.62,.78,1],_env*.55,2.6);
    for(let j=1;j<=6;j++){const t=j/6,p=e.origin.map((v,k)=>v+bd[k]*L*t*s);
     ctx.point(p,[.8,.9,1],3.5*(1-t)+1,_env*Math.exp(-t*2.2)*.4);}
   }
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,3.2*e.pixel,0,e.color,e.seed);
   /* lighthouse flash when a beam sweeps across the camera direction */
   const toEye=vnorm(args.eye.map((v,k)=>v-e.origin[k]));
   const align=Math.pow(Math.abs(vdot(bd,toEye)),30);
   ctx.point(e.origin,[.9,.96,1],8+align*20,_env*(.5+align*.5));
   ctx.point(e.origin,[.7,.85,1],26,_env*.10);
  }
 },
 /* ── Stage 4 expansion: meteor family ── */
 {
  id:'single-meteor',label:'单颗流星',rarity:'common',
  cadence:{min:6,mean:8,max:20},warmup:{min:3,max:8},
  cooldown:0,maxConcurrent:null,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  spawn(args){
   const depth=range(1080,1780),pixel=pixelOf(args,depth);
   const e={life:range(1.5,2.2),seed:Math.random(),pixel,color:Math.random()<.55?gold:ice,basis:basisOf(args),members:[]};
   const fromRight=Math.random()<.5,x=(fromRight?range(.7,1.0):range(0,.3))*args.width,y=range(.05,.4)*args.height;
   const angle=range(.2,.6),speed=range(380,620)*pixel;
   e.members.push({origin:ctx.cameraPoint(x,y,depth,args),velocity:args.basis.right.map((v,k)=>v*(fromRight?-1:1)*Math.cos(angle)*speed-args.basis.up[k]*Math.sin(angle)*speed),len:.16});
   return e;
  },
  draw(e,age){
   const fade=env(age/e.life,.08,.25);if(fade<=0)return;
   for(const m of e.members){
    const head=m.origin.map((v,k)=>v+m.velocity[k]*age);
    ctx.point(head,e.color,4,fade*.9);
    meteorTrail(m.origin,m.velocity,age,e.color,m.len,12,fade*.8);
   }
  }
 },
 {
  id:'double-meteor',label:'双子流星',rarity:'common',
  cadence:{min:14,mean:12,max:40},warmup:{min:6,max:14},
  cooldown:2,maxConcurrent:null,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  spawn(args){
   const depth=range(1080,1780),pixel=pixelOf(args,depth);
   const e={life:range(2.4,3.2),seed:Math.random(),pixel,color:Math.random()<.5?gold:ice,basis:basisOf(args),members:[]};
   const fromRight=Math.random()<.5,y=range(.1,.35)*args.height,angle=range(.2,.5),speed=range(340,540)*pixel;
   for(let i=0;i<2;i++){
    const x=(fromRight?range(.75,1.0):range(0,.25))*args.width+(i?range(30,90):-range(30,90));
    e.members.push({delay:i*range(.25,.6),origin:ctx.cameraPoint(x,y+range(-40,40),depth,args),
     velocity:args.basis.right.map((v,k)=>v*(fromRight?-1:1)*Math.cos(angle+range(-.04,.04))*speed-args.basis.up[k]*Math.sin(angle)*speed),len:range(.14,.2)});
   }
   return e;
  },
  draw(e,age){
   for(const m of e.members){
    const a=age-m.delay;if(a<0)continue;
    const fade=env(a/m.life?.1:.25);if(fade<=0)continue;
    const head=m.origin.map((v,k)=>v+m.velocity[k]*a);
    ctx.point(head,e.color,4.2,fade*.9);
    meteorTrail(m.origin,m.velocity,a,e.color,m.len,12,fade*.8);
   }
  }
 },
 {
  id:'meteor-shower',label:'流星雨',rarity:'rare',
  cadence:{min:50,mean:40,max:140},warmup:{min:20,max:40},
  cooldown:12,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<1.2?'radiant-open':age<e.life-1.5?'storm':'waning';},
  spawn(args){
   const depth=range(1200,1700),pixel=pixelOf(args,depth);
   const e={life:range(8,14),seed:Math.random(),pixel,color:ice,basis:basisOf(args),members:[]};
   const xy=skySpot(args);
   e.radiant=ctx.cameraPoint(xy[0],xy[1],depth,args);
   const count=Math.floor(range(14,24));
   for(let i=0;i<count;i++){
    const a=range(0,TAU),el=range(.15,.75),speed=range(320,520)*pixel;
    e.members.push({delay:range(0,e.life-2),life:range(1.2,2),
     velocity:e.basis.right.map((v,k)=>v*Math.cos(a)*Math.cos(el)*speed+e.basis.up[k]*Math.sin(el)*speed+e.basis.back[k]*Math.sin(a)*Math.cos(el)*speed*.3),len:range(.1,.18)});
   }
   return e;
  },
  draw(e,age,args){
   const envl=env(age/e.life,.06,.18);
   ctx.point(e.radiant,[.9,.95,1],10+envl*8,envl*.25);
   for(const m of e.members){
    const a=age-m.delay;if(a<0||a>m.life)continue;
    const fade=Math.min(1,a*6,(m.life-a)*3);
    const head=e.radiant.map((v,k)=>v+m.velocity[k]*a);
    ctx.point(head,e.color,3.2,fade*.8);
    meteorTrail(e.radiant,m.velocity,a,e.color,m.len,9,fade*.7);
   }
  }
 },
 {
  id:'meteor-fragmentation',label:'流星分裂',rarity:'rare',
  cadence:{min:45,mean:35,max:120},warmup:{min:15,max:30},
  cooldown:8,maxConcurrent:2,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<e.splitAt?'intact':'split';},
  spawn(args){
   const depth=range(1080,1780),pixel=pixelOf(args,depth);
   const e={life:range(2.2,3.2),seed:Math.random(),pixel,color:gold,basis:basisOf(args)};
   e.splitAt=e.life*range(.38,.55);
   const fromRight=Math.random()<.5,x=(fromRight?range(.65,.95):range(.05,.35))*args.width,y=range(.1,.32)*args.height;
   e.origin=ctx.cameraPoint(x,y,depth,args);
   const angle=range(.2,.5),speed=range(300,480)*pixel;
   e.velocity=args.basis.right.map((v,k)=>v*(fromRight?-1:1)*Math.cos(angle)*speed-args.basis.up[k]*Math.sin(angle)*speed);
   e.pieces=Array.from({length:Math.floor(range(3,6))},()=>{
    const da=range(0,TAU),dv=range(.04,.16)*speed;
    return{dvx:Math.cos(da)*dv,dvy:Math.sin(da)*dv,size:range(2,3.6),seed:Math.random()};});
   return e;
  },
  draw(e,age,args){
   const pre=age<e.splitAt;
   const fade=env(age/e.life,.1,.28);if(fade<=0)return;
   const head=e.origin.map((v,k)=>v+e.velocity[k]*age);
   if(pre){
    ctx.point(head,e.color,4.6,fade);
    meteorTrail(e.origin,e.velocity,age,e.color,.2,14,fade*.85);
    return;
   }
   const sa=age-e.splitAt;
   ctx.point(e.origin.map((v,k)=>v+e.velocity[k]*e.splitAt),[1,.9,.7],6+sa*10,Math.exp(-sa*3)*.5);
   for(const pc of e.pieces){
    const pv=e.velocity.map((v,k)=>v+args.basis.right[k]*pc.dvx-args.basis.up[k]*pc.dvy);
    const p=e.origin.map((v,k)=>v+pv[k]*sa-args.basis.up[k]*sa*sa*e.pixel*8);
    ctx.point(p,[1,.8,.5],pc.size,fade*.85);
    meteorTrail(e.origin,pv,age,[.9,.6,.35],.16,9,fade*.55);
   }
  }
 },
 {
  id:'meteor-airburst',label:'流星空中爆',rarity:'rare',
  cadence:{min:50,mean:40,max:130},warmup:{min:18,max:35},
  cooldown:10,maxConcurrent:2,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<e.burstAt?'entry':'burst';},
  spawn(args){
   const depth=range(1080,1780),pixel=pixelOf(args,depth);
   const e={life:range(1.6,2.4),seed:Math.random(),pixel,color:[1,.7,.35],basis:basisOf(args)};
   e.burstAt=e.life*.72;
   const fromRight=Math.random()<.5,x=(fromRight?range(.6,.95):range(.05,.4))*args.width,y=range(.05,.25)*args.height;
   e.origin=ctx.cameraPoint(x,y,depth,args);
   const angle=range(.08,.25),speed=range(420,680)*pixel;
   e.velocity=args.basis.right.map((v,k)=>v*(fromRight?-1:1)*Math.cos(angle)*speed-args.basis.up[k]*Math.sin(angle)*speed);
   e.sparks=Array.from({length:Math.floor(range(90,150)*ctx.budget+30)},()=>({dir:vunitRand(),speed:range(30,90)*pixel,seed:Math.random(),size:range(.8,2.4)}));
   return e;
  },
  draw(e,age){
   const head=e.origin.map((v,k)=>v+e.velocity[k]*Math.min(age,e.burstAt));
   if(age<e.burstAt){
    const fade=Math.min(1,age*8);
    ctx.point(head,[1,.85,.5],5.5,fade);
    meteorTrail(e.origin,e.velocity,age,e.color,.24,16,fade*.9);
    return;
   }
   const b=age-e.burstAt;if(b>.8)return;
   const k=Math.exp(-b*4.5);
   ctx.point(head,[1,.96,.85],110*k+16,k*.7);
   ctx.point(head,[1,.6,.3],200*k+30,k*.22);
   const rr=(30+190*(1-Math.exp(-b*4)))*e.pixel;
   ctx.ring(head,e.basis,rr,e.color,k*.5,.3);
   ctx.ring(head,e.basis,rr*1.06,[1,.85,.6],k*.25,.3);
   for(const s of e.sparks){
    const d=s.speed*Math.pow(b,.8),p=head.map((v,i)=>v+s.dir[i]*d);
    ctx.point(p,[1,.75,.4],s.size,k*(.3+s.seed*.5));
    if(s.seed>.85){const t2=head.map((v,i)=>v+s.dir[i]*Math.max(0,d-s.speed*.12));ctx.line(t2,p,[1,.6,.3],k*.3);}
   }
  }
 },
 /* ── Stage 4 expansion: asteroid family ── */
 {
  id:'near-asteroid-pass',label:'小行星近距掠过',rarity:'rare',
  cadence:{min:55,mean:45,max:150},warmup:{min:20,max:45},
  cooldown:12,maxConcurrent:1,exclusiveGroup:'close-approach',weight:1,performanceCost:'low',enabled:true,
  phase(e,age){const t=age/e.life;return t<.45?'approaching':t<.62?'closest':'receding';},
  spawn(args){
   const depth=range(900,1300),pixel=pixelOf(args,depth);
   const e={life:range(6,10),seed:Math.random(),pixel,color:[.45,.35,.28],basis:basisOf(args)};
   const fromLeft=Math.random()<.5,y=range(.2,.7)*args.height;
   e.origin=ctx.cameraPoint((fromLeft?-.06:1.06)*args.width,y,depth,args);
   const speed=args.width*.5*depth/(args.height/(2*Math.tan(21*Math.PI/180)))/e.life;
   e.velocity=args.basis.right.map((v,k)=>v*(fromLeft?1:-1)*speed-e.basis.up[k]*speed*.05);
   e.radius=range(13,21)*pixel;
   return e;
  },
  draw(e,age){
   const fade=Math.min(1,age*1.5,(e.life-age)*1.5);if(fade<=0)return;
   const pos=e.origin.map((v,k)=>v+e.velocity[k]*age);
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,pos,e.radius,1,e.color,e.seed);
   ctx.point(pos,[.7,.55,.4],e.radius/e.pixel*2.2,fade*.10);
   /* faint dust wake */
   for(let j=1;j<=5;j++){const q=j/6,p=e.origin.map((v,k)=>v+e.velocity[k]*(age-q*.5));
    ctx.point(p,[.55,.45,.35],2.5,fade*.06*(1-q));}
  }
 },
 {
  id:'asteroid-breakup',label:'小行星解体',rarity:'rare',
  cadence:{min:70,mean:55,max:180},warmup:{min:25,max:50},
  cooldown:15,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<e.breakAt?'intact':age<e.breakAt+.6?'rupture':'fragment-field';},
  spawn(args){
   const depth=range(1100,1600),pixel=pixelOf(args,depth);
   const e={life:range(5,8),seed:Math.random(),pixel,color:[.42,.32,.25],basis:basisOf(args)};
   e.breakAt=e.life*range(.35,.5);
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   const speed=range(90,150)*pixel;
   e.velocity=args.basis.right.map((v,k)=>v*(Math.random()<.5?1:-1)*speed-e.basis.up[k]*range(20,50)*pixel);
   e.radius=range(9,14)*pixel;
   e.pieces=Array.from({length:Math.floor(range(4,8))},()=>({dir:vunitRand(),speed:range(12,34)*pixel,size:range(2.5,5),seed:Math.random()}));
   return e;
  },
  draw(e,age){
   const fade=env(age/e.life,.12,.3);if(fade<=0)return;
   const drift=e.velocity.map(v=>v*age);
   if(age<e.breakAt){
    const slot=ctx.claimActor();
    if(slot>=0)ctx.actor(slot,e.origin.map((v,k)=>v+drift[k]),e.radius,1,e.color,e.seed);
    return;
   }
   const b=age-e.breakAt;
   if(b<.6)ctx.point(e.origin.map((v,k)=>v+e.velocity[k]*e.breakAt),[1,.85,.6],30*e.radius/e.pixel*8,Math.exp(-b*4)*.4);
   const center=e.origin.map((v,k)=>v+e.velocity[k]*e.breakAt);
   for(const pc of e.pieces){
    const d=pc.speed*Math.pow(b,.85),p=center.map((v,k)=>v+pc.dir[k]*d+drift[k]);
    const fs=e.radius*(1-b*.18);
    const slot=ctx.claimActor();
    if(slot>=0&&b<3)ctx.actor(slot,p,fs*pc.size/4,1,e.color,pc.seed);
    ctx.point(p,[.7,.55,.4],pc.size,fade*.7);
    ctx.point(p,[.5,.4,.3],pc.size*2.6,fade*.15);
   }
  }
 },
 /* ── Stage 4 expansion: comet family ── */
 {
  id:'distant-comet',label:'远彗星',rarity:'rare',
  cadence:{min:65,mean:50,max:170},warmup:{min:20,max:45},
  cooldown:20,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  phase(e,age){const t=age/e.life;return t<.4?'far':t<.75?'brightening':'receding';},
  spawn(args){
   const depth=range(2200,2600),pixel=pixelOf(args,depth);
   const e={life:range(18,26),seed:Math.random(),pixel,color:[.6,.82,1],basis:basisOf(args)};
   const fromLeft=Math.random()<.5,x=(fromLeft?range(.05,.2):range(.8,.95))*args.width,y=range(.1,.3)*args.height;
   e.origin=ctx.cameraPoint(x,y,depth,args);
   const speed=args.width*.14*depth/(args.height/(2*Math.tan(21*Math.PI/180)))/e.life;
   e.velocity=args.basis.right.map((v,k)=>v*(fromLeft?1:-1)*speed-e.basis.up[k]*speed*.06);
   e.dir=vnorm(e.velocity);
   e.antiSun=vnorm(e.basis.up.map(v=>v*.85).map((v,k)=>v+e.basis.right[k]*(fromLeft?.3:-.3)));
   return e;
  },
  draw(e,age){
   const t=age/e.life,fade=Math.sin(clamp(t)*Math.PI)*.8;
   const pos=e.origin.map((v,k)=>v+e.velocity[k]*age);
   ctx.point(pos,[.85,.93,1],3.6,fade*.6);
   const cr=e.pixel*3.5*(1+.8*Math.sin(t*Math.PI));
   for(let i=0;i<14;i++){
    const a=hnoise(i,e.seed)*TAU,rr=cr*Math.sqrt(hnoise(i+31,e.seed));
    const p=pos.map((v,k)=>v+(e.basis.right[k]*Math.cos(a)+e.basis.up[k]*Math.sin(a))*rr);
    ctx.point(p,[.7,.86,1],2.2+hnoise(i+7,e.seed)*2.5,fade*(.08+.1*hnoise(i+13,e.seed)));}
   const dustLen=e.pixel*26*(1+Math.sin(t*Math.PI));
   let prev=null;
   for(let j=0;j<=10;j++){const q=j/10,p=pos.map((v,k)=>v-e.dir[k]*dustLen*q+e.basis.up[k]*dustLen*q*q*.1);
    if(prev)ctx.line(prev,p,[1,.8,.5],fade*.16*(1-q));prev=p;}
   let prev2=null;
   for(let j=0;j<=10;j++){const q=j/10,p=pos.map((v,k)=>v+e.antiSun[k]*dustLen*1.2*q);
    if(prev2)ctx.line(prev2,p,[.5,.8,1],fade*.2*(1-q));prev2=p;}
  }
 },
 {
  id:'returning-comet',label:'回归彗星',rarity:'rare',
  cadence:{min:80,mean:60,max:200},warmup:{min:30,max:60},
  cooldown:25,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){const t=age/e.life;return t<.35?'inbound':t<.65?'periapsis':'outbound';},
  spawn(args){
   const depth=range(1300,1700),pixel=pixelOf(args,depth);
   const e={life:range(22,30),seed:Math.random(),pixel,color:[.62,.85,1],basis:basisOf(args)};
   const fromLeft=Math.random()<.5;
   const P=f=>ctx.cameraPoint(f[0]*args.width,f[1]*args.height,depth,args);
   e.p0=P(fromLeft?[-.04,range(.3,.45)]:[1.04,range(.3,.45)]);
   e.pc=P([.5,range(.04,.12)]);
   e.p1=P(fromLeft?[1.04,range(.42,.55)]:[-.04,range(.42,.55)]);
   return e;
  },
  draw(e,age){
   const t=age/e.life,fade=Math.sin(clamp(t)*Math.PI);
   const bez=q=>{const s=1-q;return[0,1,2].map(k=>s*s*e.p0[k]+2*s*q*e.pc[k]+q*q*e.p1[k]);};
   const pos=bez(t),pos2=bez(Math.min(1,t+.015));
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,pos,4.6*e.pixel*(.7+.6*fade),5,[.75,.88,1],e.seed);
   ctx.point(pos,[.85,.93,1],6+4*fade,fade*.55);
   const cr=e.pixel*(3+8*fade);
   for(let i=0;i<26;i++){
    const a=hnoise(i,e.seed)*TAU,rr=cr*Math.sqrt(hnoise(i+50,e.seed));
    const p=pos.map((v,k)=>v+(e.basis.right[k]*Math.cos(a)+e.basis.up[k]*Math.sin(a))*rr);
    ctx.point(p,[.7,.86,1],2.5+hnoise(i+9,e.seed)*3.5,fade*(.09+.13*hnoise(i+20,e.seed)));}
   const tailLen=e.pixel*(30+90*fade);
   for(let s2=0;s2<3;s2++){let prev=null;const side=(s2-1)*.12;
    for(let j=0;j<=16;j++){const q=j/16;
     const p=pos.map((v,k)=>v+(pos[k]-pos2[k])*(tailLen*q/Math.max(1,Math.hypot(pos[0]-pos2[0],pos[1]-pos2[1],pos[2]-pos2[2])))+e.basis.up[k]*tailLen*q*q*.2+e.basis.right[k]*side*tailLen*q);
     if(prev)ctx.line(prev,p,[1,.8,.5],fade*(.2-s2*.04)*(1-q));
     prev=p;}}
   let prev2=null;
   for(let j=0;j<=14;j++){const q=j/14,p=pos.map((v,k)=>v+(pos[k]-pos2[k])*(tailLen*1.1*q*.06)+e.basis.up[k]*tailLen*1.1*q*.9);
    if(prev2)ctx.line(prev2,p,[.5,.8,1],fade*.35*(1-q));prev2=p;}
  }
 },
 /* ── Stage 4 expansion: planetary / eclipse family ── */
 {
  id:'planetary-drift',label:'行星漂移',rarity:'rare',
  cadence:{min:90,mean:70,max:220},warmup:{min:30,max:60},
  cooldown:25,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  phase(){return 'drift';},
  spawn(args){
   const depth=range(1600,2000),pixel=pixelOf(args,depth);
   const e={life:range(25,35),seed:Math.random(),pixel,color:[[.78,.62,.38],[.5,.66,.82],[.62,.5,.7]][Math.floor(range(0,3))],basis:basisOf(args)};
   const fromLeft=Math.random()<.5,y=range(.1,.3)*args.height;
   e.origin=ctx.cameraPoint((fromLeft?-.08:1.08)*args.width,y,depth,args);
   const speed=args.width*.35*depth/(args.height/(2*Math.tan(21*Math.PI/180)))/e.life;
   e.velocity=args.basis.right.map((v,k)=>v*(fromLeft?1:-1)*speed);
   e.radius=range(16,26)*pixel;
   return e;
  },
  draw(e,age){
   const fade=Math.min(1,age*1.2,(e.life-age)*1.2);if(fade<=0)return;
   const pos=e.origin.map((v,k)=>v+e.velocity[k]*age);
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,pos,e.radius,2,e.color,e.seed);
   ctx.point(pos,e.color,e.radius/e.pixel*2.6,fade*.12);
  }
 },
 {
  id:'planetary-conjunction',label:'行星合',rarity:'rare',
  cadence:{min:110,mean:85,max:260},warmup:{min:40,max:80},
  cooldown:30,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  phase(e,age){const t=age/e.life,d=e.sepNow?e.sepNow:1;return d<e.radius*2.6?'conjunction':t<.5?'closing':'separating';},
  spawn(args){
   const depth=range(1500,1900),pixel=pixelOf(args,depth);
   const e={life:range(26,36),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   const c=ctx.cameraPoint(xy[0],xy[1],depth,args);
   const sep=range(120,200)*pixel,dir=range(0,TAU);
   const off=e.basis.right.map((v,k)=>v*Math.cos(dir)*sep+e.basis.up[k]*Math.sin(dir)*sep);
   const drift=e.basis.right.map(v=>v*range(60,110)*pixel/e.life*(Math.random()<.5?1:-1));
   e.a={base:c.map((v,k)=>v-off[k]/2),vel:drift.map(v=>v/2),radius:range(12,18)*pixel,color:[.78,.62,.38]};
   e.b={base:c.map((v,k)=>v+off[k]/2),vel:drift.map(v=>-v/2),radius:range(9,14)*pixel,color:[.5,.66,.82]};
   return e;
  },
  draw(e,age){
   const fade=Math.min(1,age*1.1,(e.life-age)*1.1);if(fade<=0)return;
   const pa=e.a.base.map((v,k)=>v+e.a.vel[k]*age),pb=e.b.base.map((v,k)=>v+e.b.vel[k]*age);
   const sep=Math.hypot(pa[0]-pb[0],pa[1]-pb[1],pa[2]-pb[2]);
   e.sepNow=sep;
   for(const[p,pl]of[[pa,e.a],[pb,e.b]]){
    const slot=ctx.claimActor();
    if(slot>=0)ctx.actor(slot,p,pl.radius,2,pl.color,e.seed+pl.radius);}
   const near=Math.max(0,1-sep/(e.a.radius*8));
   if(near>0){const mid=pa.map((v,k)=>v+(pb[k]-v)/2);
    ctx.point(mid,[1,.92,.75],(e.a.radius/e.pixel)*4*near+8,near*.16);ctx.point(mid,[1,.85,.6],(e.a.radius/e.pixel)*8*near+12,near*.07);}
  }
 },
 {
  id:'planetary-transit',label:'行星凌星',rarity:'rare',
  cadence:{min:100,mean:75,max:240},warmup:{min:35,max:70},
  cooldown:25,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  phase(e,age){const x=Math.abs((age/e.life-.5)*2);return x>.62?'approach-depart':x>.18?'on-disc':'ingress-egress';},
  spawn(args){
   const depth=range(1200,1600),pixel=pixelOf(args,depth);
   const e={life:range(14,20),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.starRadius=range(14,20)*pixel;
   e.planetRadius=range(4.5,6.5)*pixel;
   const chord=range(.4,.9)*e.starRadius,dir=range(0,TAU);
   const across=e.basis.right.map((v,k)=>v*Math.cos(dir)+e.basis.up[k]*Math.sin(dir));
   const along=e.basis.up.map((v,k)=>-v*Math.cos(dir)+e.basis.right[k]*Math.sin(dir));
   const span=e.starRadius*6;
   e.p0=e.origin.map((v,k)=>v-along[k]*span+across[k]*chord);
   e.p1=e.origin.map((v,k)=>v+along[k]*span+across[k]*chord);
   return e;
  },
  draw(e,age){
   const fade=Math.min(1,age*1.4,(e.life-age)*1.4);if(fade<=0)return;
   const t=age/e.life,x=Math.abs((t-.5)*2);
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,e.starRadius,0,[.95,.93,.85],e.seed);
   const transit=Math.max(0,1-Math.max(0,(x-.18))/.44);
   ctx.point(e.origin,[1,.98,.9],e.starRadius/e.pixel*3.2,fade*(.35-transit*.18));
   ctx.point(e.origin,[.9,.9,1],e.starRadius/e.pixel*7,fade*.08);
   const p=e.p0.map((v,k)=>v+(e.p1[k]-v)*t);
   const s2=ctx.claimActor();
   if(s2>=0)ctx.actor(s2,p,e.planetRadius,6,[.001,.001,.002],e.seed);
  }
 },
 {
  id:'blood-moon',label:'血月',rarity:'rare',
  cadence:{min:120,mean:90,max:300},warmup:{min:45,max:90},
  cooldown:30,maxConcurrent:1,exclusiveGroup:'lunar-phenomenon',weight:1,performanceCost:'low',enabled:true,
  phase(e,age){const t=age/e.life;return t<.25?'deepening':t<.7?'total-red':'fading';},
  spawn(args){
   const depth=range(1150,1450),pixel=pixelOf(args,depth);
   const e={life:range(16,22),seed:Math.random(),pixel,color:[.72,.26,.1],basis:basisOf(args)};
   const xy=ctx.freePosition(args,90,.2,.8,.12,.4);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.radius=range(20,28)*pixel;
   return e;
  },
  draw(e,age){
   const t=age/e.life;
   const deep=t<.25?t/.25:t<.7?1:1-(t-.7)/.3;
   const color=mixc([.7,.62,.6],[.62,.18,.07],deep);
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,e.radius,1,color,e.seed);
   ctx.point(e.origin,[1,.3,.12],e.radius/e.pixel*4,deep*.12);
   ctx.point(e.origin,[1,.2,.1],e.radius/e.pixel*9,deep*.05);
   if(deep>.5){const k=(deep-.5)*2*Math.sin(age*1.2);
    ctx.point(e.origin,[.9,.25,.1],e.radius/e.pixel*5.5,k*.05);}
  }
 },
 /* ── Stage 4 expansion: stellar family ── */
 {
  id:'stellar-micro-flare',label:'恒星微耀斑',rarity:'common',
  cadence:{min:18,mean:16,max:50},warmup:{min:8,max:18},
  cooldown:3,maxConcurrent:3,exclusiveGroup:null,weight:1,performanceCost:'low',enabled:true,
  spawn(args){
   const depth=range(1150,1550),pixel=pixelOf(args,depth);
   const e={life:range(4,7),seed:Math.random(),pixel,color:[1,.9,.7],basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.radius=range(6,10)*pixel;
   e.flashes=Array.from({length:Math.floor(range(2,5))},()=>({at:range(.1,.85),dir:vunitRand(),power:range(.5,1)}));
   return e;
  },
  draw(e,age){
   const fade=env(age/e.life,.15,.3);if(fade<=0)return;
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,e.radius,0,e.color,e.seed);
   for(const f of e.flashes){
    const fa=age-f.at*e.life;if(fa<0||fa>.5)continue;
    const k=Math.exp(-fa*7)*f.power*fade;
    const lp=e.origin.map((v,k2)=>v+f.dir[k2]*e.radius);
    ctx.point(lp,[1,.98,.88],3.5+4*k,k*.7);
    ctx.line(lp,lp.map((v,k2)=>v+f.dir[k2]*e.radius*(1.6+k)),[1,.85,.6],k*.4);
   }
  }
 },
 {
  id:'cme',label:'日冕物质抛射',rarity:'rare',
  cadence:{min:80,mean:60,max:200},warmup:{min:30,max:60},
  cooldown:20,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<e.liftAt?'lift-off':age<e.life*.6?'expanding':'dissipating';},
  spawn(args){
   const depth=range(1250,1650),pixel=pixelOf(args,depth);
   const e={life:range(8,14),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.starRadius=range(8,12)*pixel;
   e.liftAt=e.life*.18;
   e.dir=vunitRand();
   e.u=vnorm(vcross(e.dir,[.2,.9,.1]));e.v=vcross(e.dir,e.u);
   return e;
  },
  draw(e,age){
   const fade=env(age/e.life,.1,.25);if(fade<=0)return;
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,e.starRadius,0,[1,.92,.75],e.seed);
   const b=Math.max(0,age-e.liftAt);
   if(b<=0)return;
   const dist=e.starRadius*(1.4+b*1.6),rad=e.starRadius*(.8+b*.9);
   const center=e.origin.map((v,k)=>v+e.dir[k]*dist);
   for(let i=0;i<70;i++){
    const h1=hnoise(i,e.seed)*2-1,h2=hnoise(i+77,e.seed)*2-1,h3=hnoise(i+151,e.seed)*2-1;
    const p=center.map((v,k)=>v+e.u[k]*h1*rad+e.v[k]*h2*rad+e.dir[k]*h3*rad*.6);
    ctx.point(p,[1,.72,.4],3+hnoise(i+9,e.seed)*5,fade*.16);}
   for(let j=0;j<=20;j++){const a=j/20*TAU,rr=rad;
    const p=center.map((v,k)=>v+e.u[k]*Math.cos(a)*rr+e.v[k]*Math.sin(a)*rr);
    if(j)ctx.line(prev,p,[1,.6,.3],fade*.2);var prev=p;}
   ctx.point(center,[1,.8,.5],6,fade*.3);
  }
 },
 {
  id:'nova',label:'新星',rarity:'rare',
  cadence:{min:100,mean:75,max:260},warmup:{min:40,max:80},
  cooldown:30,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<e.peakAt?'outburst':age<e.peakAt+3?'peak':'decline';},
  spawn(args){
   const depth=range(1250,1650),pixel=pixelOf(args,depth);
   const e={life:range(18,26),seed:Math.random(),pixel,color:[.95,.9,.8],basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.radius=range(6,9)*pixel;
   e.peakAt=e.life*range(.06,.12);
   e.shell=Array.from({length:40},()=>({dir:vunitRand(),j:Math.random()}));
   return e;
  },
  draw(e,age){
   const t=age/e.peakAt,decay=Math.exp(-Math.max(0,age-e.peakAt)*.28);
   const bright=t<1?t*t:decay;
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,e.radius*(1+bright*1.3),0,e.color,e.seed);
   ctx.point(e.origin,[1,.97,.9],(e.radius/e.pixel)*(4+bright*22),(.12+bright*.6));
   ctx.point(e.origin,[.85,.9,1],(e.radius/e.pixel)*(9+bright*40),(.04+bright*.2));
   /* slow expanding shell after peak — the star itself survives */
   if(age>e.peakAt){
    const b=age-e.peakAt,rr=e.radius*(2.5+b*.5);
    ctx.ring(e.origin,e.basis,rr,[.9,.85,.75],decay*.16,.4);
    for(let i=0;i<e.shell.length;i++){const d=e.shell[i].dir,p=e.origin.map((v,k)=>v+d[k]*rr*(1+e.shell[i].j*.2));
     ctx.point(p,[.9,.88,.8],2,decay*.08);}
   }
  }
 },
 /* ── Stage 4 expansion: deep sky + FRB ── */
 {
  id:'milky-way-bloom',label:'银河绽放',rarity:'rare',
  cadence:{min:140,mean:100,max:340},warmup:{min:50,max:100},
  cooldown:40,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'high',enabled:true,
  phase(e,age){const t=age/e.life;return t<.3?'brightening':t<.75?'bloom':'fading';},
  spawn(args){
   const depth=range(1800,2200),pixel=pixelOf(args,depth);
   const e={life:range(24,34),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=ctx.freePosition(args,170,.15,.85,.12,.45);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   const ang=range(-.4,.4);
   e.bandR=args.basis.right.map((v,k)=>v*Math.cos(ang)+e.basis.up[k]*Math.sin(ang));
   e.bandU=e.basis.up.map((v,k)=>-v*Math.sin(ang)+e.basis.up[k]*Math.cos(ang));
   e.len=args.width*range(.5,.7)*depth/(args.height/(2*Math.tan(21*Math.PI/180)));
   e.thick=args.height*range(.1,.16)*depth/(args.height/(2*Math.tan(21*Math.PI/180)));
   return e;
  },
  draw(e,age){
   const envl=env(age/e.life,.35,.3);
   for(let i=0;i<Math.round(340*ctx.budget+80);i++){
    const h1=hnoise(i,e.seed)*2-1,h2=hnoise(i+201,e.seed)*2-1,h3=hnoise(i+403,e.seed);
    const p=e.origin.map((v,k)=>v+e.bandR[k]*h1*e.len+e.bandU[k]*(h2*e.thick+Math.sin(h1*5+e.seed*8)*e.thick*.4));
    const warm=h3;
    ctx.point(p,mixc([.78,.84,1],[1,.9,.72],warm),.7+Math.pow(h3,5)*2.6,envl*(.1+.28*Math.pow(h3,3)));
   }
   for(let i=0;i<Math.round(60*ctx.budget+20);i++){
    const h1=hnoise(i+611,e.seed)*2-1,h2=hnoise(i+809,e.seed)*2-1;
    const p=e.origin.map((v,k)=>v+e.bandR[k]*h1*e.len*.9+e.bandU[k]*h2*e.thick*.7);
    ctx.point(p,mixc([.4,.5,.8],[.75,.55,.6],hnoise(i+901,e.seed)),e.pixel*(24+34*hnoise(i+11,e.seed)),envl*.02);
   }
  }
 },
 {
  /* ARTISTIC VISUALIZATION — real FRBs are invisible to the naked eye. */
  id:'fast-radio-burst-visualization',label:'快速射电暴(艺术化)',rarity:'legendary',
  cadence:{min:160,mean:120,max:400},warmup:{min:60,max:120},
  cooldown:45,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<.5?'chirp':'wavefront';},
  spawn(args){
   const depth=range(1250,1650),pixel=pixelOf(args,depth);
   const e={life:range(3,5),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.u=vnorm(vcross([0,1,0],[.1,0,.3]));e.v=vcross([0,1,0],e.u);
   return e;
  },
  draw(e,age){
   const fade=Math.exp(-age*1.4);if(fade<.02)return;
   for(let w=0;w<3;w++){
    const b=age-w*.22;if(b<0)continue;
    const rr=(40+260*(1-Math.exp(-b*2.2)))*e.pixel,k=Math.exp(-b*1.9);
    ctx.ring(e.origin,e.basis,rr,w%2?[.6,.8,1]:[.85,.92,1],k*.4,.35);
    ctx.ring(e.origin,e.basis,rr*1.03,[.7,.85,1],k*.18,.35);
   }
   /* descending chirp ticks */
   for(let c=0;c<7;c++){
    const ca=age-c*.07;if(ca<0||ca>.5)continue;
    const h=(6-c)*e.pixel*7,k=Math.exp(-ca*6);
    const base=e.origin.map((v,k2)=>v-e.basis.up[k2]*h*.2);
    ctx.line(base.map((v,k2)=>v-e.basis.up[k2]*h),base,[.7,.85,1],k*.5);
   }
   ctx.point(e.origin,[.9,.96,1],10+40*Math.exp(-age*3),Math.exp(-age*3)*.6);
  }
 },
 /* ── Stage 5: legendary events ── */
 {
  /* No second explosion: the remnant itself — shell, filaments, diffuse gas. */
  id:'supernova-remnant',label:'超新星残骸',rarity:'legendary',
  major:true,
  cadence:{min:90,mean:70,max:240},warmup:{min:30,max:60},
  cooldown:30,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'high',enabled:true,
  phase(e,age){const t=age/e.life;return t<.3?'shell-forming':t<.72?'filamentary':'diffuse-fading';},
  spawn(args){
   const depth=range(1300,1700),pixel=pixelOf(args,depth);
   const e={life:range(24,34),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.r0=range(36,52)*pixel;
   e.fil=Array.from({length:Math.max(10,Math.round(22*ctx.budget+6))},(_,i)=>({dir:vunitRand(),ph:range(0,TAU),wob:range(2,5),len:range(.55,.95),hue:i%3}));
   return e;
  },
  draw(e,age){
   const envl=env(age/e.life,.12,.28);
   const R=e.r0*(1+2.6*(1-Math.exp(-age*.22)));
   /* expanding double shell */
   if(age<e.life*.75){
    const shell=clamp(age/(e.life*.3));
    ctx.ring(e.origin,e.basis,R,[.45,.8,.95],envl*(.30-.14*shell),.4);
    ctx.ring(e.origin,e.basis,R*1.05,[.9,.5,.35],envl*(.16-.08*shell),.4);
   }
   /* radial filaments */
   for(const f of e.fil){
    let prev=null;
    for(let j=0;j<=12;j++){const t=j/12,r=R*(.15+f.len*t);
     const w=Math.sin(t*f.wob+f.ph+age*.5)*.12;
     const p=e.origin.map((v,k)=>v+(f.dir[k]+e.basis.right[k]*w)*r);
     const col=f.hue===0?[.5,.82,.95]:f.hue===1?[.85,.42,.3]:[1,.78,.45];
     if(prev)ctx.line(prev,p,col,envl*.16*Math.pow(1-Math.abs(t-.5)*2,.4));
     prev=p;}}
   /* diffuse gas */
   for(let i=0;i<Math.round(80*ctx.budget+30);i++){
    const h1=hnoise(i,e.seed)*2-1,h2=hnoise(i+55,e.seed)*2-1,h3=hnoise(i+99,e.seed);
    const r=R*(.3+.75*h3);
    const a=h1*TAU*.5+h2*3;
    const p=e.origin.map((v,k)=>v+e.basis.right[k]*Math.cos(a)*r+e.basis.up[k]*Math.sin(a)*r*.8+e.basis.back[k]*h2*r*.4);
    ctx.point(p,mixc([.35,.62,.9],[.8,.5,.35],h3),e.pixel*(18+26*h3),envl*.022);
   }
   ctx.point(e.origin,[.75,.88,1],14,envl*.12);
  }
 },
 {
  /* Short, violent, magnetic: flash + expanding field rings + fast decay. */
  id:'magnetar-flare',label:'磁星耀发',rarity:'legendary',
  cadence:{min:90,mean:70,max:240},warmup:{min:30,max:60},
  cooldown:25,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<.35?'flash':age<1.4?'field-burst':'decay';},
  spawn(args){
   const depth=range(1150,1550),pixel=pixelOf(args,depth);
   const e={life:range(3.5,5),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   return e;
  },
  draw(e,age){
   const decay=Math.exp(-age*1.1);if(decay<.02)return;
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,3.4*e.pixel,0,[.92,.95,1],e.seed);
   if(age<.4){const k=Math.exp(-age*6);
    ctx.point(e.origin,[1,1,.96],60*k+14,k*.8);ctx.point(e.origin,[.8,.9,1],130*k+26,k*.25);}
   /* field-like rings pulsing outward */
   for(let w=0;w<3;w++){
    const b=(age*.9+w*.33)%1;
    const rr=e.pixel*(24+b*150);
    ctx.ring(e.origin,e.basis,rr,w===0?[.95,.6,.5]:[.7,.8,1],decay*(1-b)*.3,.5);
   }
   ctx.point(e.origin,[.9,.7,.6],30,decay*.12);
  }
 },
 {
  /* Plays out around the EXISTING black-hole portal: approach → bend → stretch → stream. */
  id:'black-hole-consumes-body',label:'黑洞吞噬天体',rarity:'legendary',
  major:true,
  cadence:{min:110,mean:85,max:280},warmup:{min:40,max:80},
  cooldown:30,maxConcurrent:1,exclusiveGroup:'portal-event',weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){const t=age/e.life;return t<.4?'approach':t<.75?'orbit-bend':t<.92?'stretch':'accretion';},
  spawn(args){
   const pixel=pixelOf(args,1500);
   const e={life:range(9,13),seed:Math.random(),pixel,color:[.45,.35,.28],basis:basisOf(args)};
   const portal=ctx.portals[0];
   const a0=range(0,TAU);
   e.r0=portal.radius*range(4.5,6.5);
   e.a0=a0;
   e.turns=range(1.4,2.1)*(Math.random()<.5?1:-1);
   return e;
  },
  draw(e,age){
   const fade=Math.min(1,age*2,(e.life-age)*2.5);if(fade<=0)return;
   const portal=ctx.portals[0],t=age/e.life;
   const r=e.r0*Math.pow(1-t,1.45)+portal.radius*.06;
   const ang=e.a0+e.turns*TAU*Math.pow(t,1.35);
   const wobble=Math.sin(ang*3+e.seed*9)*.12;
   const pos=ctx.portalPoint(portal,[Math.cos(ang)*r,Math.sin(ang)*r*.42+wobble*portal.radius,Math.sin(ang)*r*.95]);
   const t2=Math.min(1,t+.02);
   const r2=e.r0*Math.pow(1-t2,1.45)+portal.radius*.06;
   const ang2=e.a0+e.turns*TAU*Math.pow(t2,1.35);
   const pos2=ctx.portalPoint(portal,[Math.cos(ang2)*r2,Math.sin(ang2)*r2*.42+wobble*portal.radius,Math.sin(ang2)*r2*.95]);
   if(t<.86){
    const slot=ctx.claimActor();
    if(slot>=0)ctx.actor(slot,pos,5*e.pixel*(1-t*.6),1,e.color,e.seed);
    /* tidal stretch along the orbital path as it nears the horizon */
    const stretch=clamp((t-.6)/.26);
    for(let k=1;k<=3;k++){
     const q=k/3,p=pos.map((v,j2)=>v+(pos2[j2]-pos2[j2]+pos[j2]-pos2[j2])*0+(pos[j2]-pos2[j2])*k*stretch*.9);
     ctx.point(p,[.75,.6,.45],3.4-stretch,fade*.7);}
   }
   /* debris stream along past path */
   let prev=null;
   for(let j=0;j<=16;j++){const q=j/16,tq=t*(1-q*.4);
    const rq=e.r0*Math.pow(1-tq,1.45)+portal.radius*.06;
    const aq=e.a0+e.turns*TAU*Math.pow(tq,1.35);
    const p=ctx.portalPoint(portal,[Math.cos(aq)*rq,Math.sin(aq)*rq*.42,Math.sin(aq)*rq*.95]);
    if(prev)ctx.line(prev,p,[1,.62,.3],fade*.3*(1-q));prev=p;}
   /* accretion flash */
   if(t>.86){const k=Math.exp(-(t-.86)*14);
    ctx.point(portal.origin,[1,.7,.35],portal.radius/e.pixel*3.2,k*.5);
    ctx.point(portal.origin,[1,.85,.5],portal.radius/e.pixel*6,k*.2);}
  }
 },
 {
  /* Star torn apart at the existing portal: stretch, stream, ejecta tail. */
  id:'tidal-disruption-event',label:'潮汐撕裂事件',rarity:'legendary',
  major:true,
  cadence:{min:130,mean:100,max:320},warmup:{min:50,max:100},
  cooldown:35,maxConcurrent:1,exclusiveGroup:'portal-event',weight:1,performanceCost:'high',enabled:true,
  phase(e,age){const t=age/e.life;return t<.35?'approach':t<.6?'stretching':t<.82?'stream':'ejecta';},
  spawn(args){
   const pixel=pixelOf(args,1500);
   const e={life:range(13,19),seed:Math.random(),pixel,color:[1,.8,.45],basis:basisOf(args)};
   e.r0=ctx.portals[0].radius*range(5,7);
   e.a0=range(0,TAU);
   e.turns=range(1.0,1.5)*(Math.random()<.5?1:-1);
   return e;
  },
  draw(e,age){
   const fade=Math.min(1,age*1.5,(e.life-age)*1.8);if(fade<=0)return;
   const portal=ctx.portals[0],t=age/e.life;
   const pt=(tt,spread=0)=>{
    const r=e.r0*Math.pow(1-tt,1.45)+portal.radius*.05+spread;
    const a=e.a0+e.turns*TAU*Math.pow(tt,1.3);
    return ctx.portalPoint(portal,[Math.cos(a)*r,Math.sin(a)*r*.4,Math.sin(a)*r*.95]);};
   const head=pt(t);
   if(t<.62){
    /* stretching star: three blobs pulled apart along the orbit */
    const stretch=clamp((t-.3)/.3);
    for(let k=0;k<3;k++){
     const tt=Math.min(1,t+k*.012*stretch*3);
     const slot=ctx.claimActor();
     if(slot>=0)ctx.actor(slot,pt(tt),e.r0*.14*(1-k*.22)*(1+stretch*.4),0,k===0?[1,.85,.55]:[1,.7,.4],e.seed+k*.13);}
   }else{
    /* debris stream wrapping the portal */
    let prev=null;
    for(let j=0;j<=24;j++){const q=j/24,tt=t*(1-q*.55);
     const p=pt(tt);
     if(prev)ctx.line(prev,p,[1,.72,.35],fade*.34*(1-q));
     if(j%3===0)ctx.point(p,[1,.8,.5],2.6,fade*.3);
     prev=p;}
    /* partial accretion glow */
    if(t>.7){const k=clamp((t-.7)/.12);
     ctx.point(portal.origin,[1,.75,.4],portal.radius/e.pixel*2.6,k*fade*.35);}
    /* ejecta tail thrown back out */
    for(let i=0;i<40;i++){
     const h1=hnoise(i,e.seed),h2=hnoise(i+41,e.seed);
     const out=portal.radius*(2.5+4.5*h1)*(t-.62);
     const a=h1*TAU+e.a0;
     const p=ctx.portalPoint(portal,[Math.cos(a)*out,Math.sin(a)*out*.5*(1+h2*.4)-out*.1,Math.sin(a)*out*.9]);
     ctx.point(p,[1,.6,.3],2+3*h2,fade*.22*(1-h1*.5));}
   }
  }
 },
 {
  /* Two dark masses inspiral, merge quietly; ripples, no explosion. */
  id:'binary-black-hole-merger',label:'双黑洞并合',rarity:'legendary',
  major:true,
  cadence:{min:150,mean:110,max:360},warmup:{min:55,max:110},
  cooldown:40,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){const t=age/e.life;return t<e.mergeAt?'inspiral':t<e.mergeAt+.08?'merger':'ringdown';},
  spawn(args){
   const depth=range(1300,1700),pixel=pixelOf(args,depth);
   const e={life:range(12,18),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.r0=range(30,46)*pixel;
   e.mergeAt=range(.68,.78);
   return e;
  },
  draw(e,age){
   const fade=Math.min(1,age*1.4,(e.life-age)*1.6);if(fade<=0)return;
   const t=age/e.life;
   if(t<e.mergeAt){
    const p=t/e.mergeAt,rr=e.r0*(1-p*.9)+e.r0*.10;
    const om=(1+8*p*p)*2.4;
    const a=e.seed*TAU+age*om;
    for(const s of[0,Math.PI]){
     const pos=e.origin.map((v,k)=>v+e.basis.right[k]*Math.cos(a+s)*rr+e.basis.up[k]*Math.sin(a+s)*rr*.35+e.basis.back[k]*Math.sin(a+s)*rr*.8);
     const slot=ctx.claimActor();
     if(slot>=0)ctx.actor(slot,pos,(4.5+p*2)*e.pixel,6,[.001,.001,.002],e.seed+s);
     ctx.point(pos,[.6,.65,.75],7,fade*.12);}
   }else{
    const b=age-e.mergeAt*e.life;
    const slot=ctx.claimActor();
    if(slot>=0)ctx.actor(slot,e.origin,7.5*e.pixel,6,[.001,.001,.002],e.seed);
    ctx.point(e.origin,[.7,.75,.85],b>2?4:10,fade*.1);
    /* gravitational-wave ripples: quiet expanding rings */
    for(let w=0;w<4;w++){
     const rb=(b-w*.55);if(rb<0)continue;
     const rr=e.r0*(1+rb*1.1),k=Math.exp(-rb*.8)*Math.exp(-rb*.25);
     ctx.ring(e.origin,e.basis,rr,w%2?[.62,.7,.9]:[.85,.9,1],k*.22,.3);}
   }
  }
 },
 {
  /* Neutron pair inspiral → collision flash → bipolar jets → red-gold ejecta. */
  id:'kilonova',label:'千新星',rarity:'legendary',
  major:true,
  cadence:{min:170,mean:130,max:400},warmup:{min:60,max:120},
  cooldown:45,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'high',enabled:true,
  phase(e,age){const t=age/e.life;return t<e.collisionAt?'inspiral':t<e.collisionAt+.1?'collision':t<.6?'jets':'ejecta-cloud';},
  spawn(args){
   const depth=range(1250,1650),pixel=pixelOf(args,depth);
   const e={life:range(11,16),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.collisionAt=range(.28,.38);
   e.r0=26*e.pixel;
   e.cloud=Array.from({length:90},()=>({dir:vunitRand(),h1:Math.random(),h2:Math.random(),h3:Math.random()}));
   e.axis=vunitRand();
   e.u=vnorm(vcross(e.axis,[.25,.1,.15]));
   e.v=vcross(e.axis,e.u);
   return e;
  },
  draw(e,age){
   const fade=Math.min(1,age*2.2,(e.life-age)*1.3);if(fade<=0)return;
   const t=age/e.life;
   const center=e.origin;
   if(t<e.collisionAt){
    const p=t/e.collisionAt,rad=e.r0*(1-p*.94);
    const om=(1+10*p*p)*3;
    const a=e.seed*TAU+age*om;
    for(const s of[0,Math.PI]){
     const pos=center.map((v,k)=>v+e.u[k]*Math.cos(a+s)*rad+e.v[k]*Math.sin(a+s)*rad);
     const slot=ctx.claimActor();
     if(slot>=0)ctx.actor(slot,pos,2.6*e.pixel,0,[.92,.95,1],e.seed+s);
     ctx.point(pos,[.85,.92,1],6,fade*.5);}
   }else{
    const b=age-e.collisionAt*e.life;
    if(b<.3){const k=Math.exp(-b*10);
     ctx.point(center,[.9,.96,1],50*k+18,k*.8);ctx.point(center,[.7,.85,1],110*k+30,k*.3);}
    /* bipolar jets */
    if(t<.62){
     const jl=e.pixel*(90+160*clamp(b/2));
     const jfade=fade*(t<.5?.6:.6*(1-(t-.5)/.12));
     for(const s of[1,-1]){
      const dir=e.axis.map(v=>v*s);
      beamFan(ctx,center,dir,e.u,jl,12,2,.03,[.75,.88,1],jfade*.5,1.8);}
    }
    /* red-gold ejecta cloud */
    const er=e.pixel*(30+150*(1-Math.exp(-b*.4)));
    for(let i=0;i<e.cloud.length;i++){
     const h1=e.cloud[i].h1,h2=e.cloud[i].h2,h3=e.cloud[i].h3;const d=e.cloud[i].dir;
     const p=center.map((v,k)=>v+d[k]*er*(.5+.5*h1));
     ctx.point(p,mixc([1,.45,.22],[.85,.35,.5],h2),2+4*h3,fade*(.14+.1*h3)*(1-b/(e.life*2)));
    }
   }
  }
 },
 {
  /* Extremely narrow, brief bipolar jets. ARTISTIC: real GRBs are point-like. */
  id:'gamma-ray-burst',label:'伽马射线暴(艺术化)',rarity:'legendary',
  major:true,
  cadence:{min:180,mean:140,max:420},warmup:{min:70,max:130},
  cooldown:45,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){return age<.5?'prompt':age<1.5?'afterglow-peak':'afterglow-decay';},
  spawn(args){
   const depth=range(1250,1650),pixel=pixelOf(args,depth);
   const e={life:range(3.5,6),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.axis=vunitRand();
   e.u=vnorm(vcross(e.axis,[.2,.8,.1]));
   return e;
  },
  draw(e,age){
   const decay=Math.exp(-age*1.6);if(decay<.02)return;
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,2.8*e.pixel,0,[.95,.97,1],e.seed);
   for(const s of[1,-1]){
    const dir=e.axis.map(v=>v*s);
    /* one ultra-narrow needle per side, plus a fainter sibling */
    beamFan(ctx,e.origin,dir,e.u,e.pixel*300,16,1,0,[.85,.93,1],decay*.6,1.2);
    beamFan(ctx,e.origin,dir,e.u,e.pixel*190,12,1,.012,[.7,.82,1],decay*.25,1.6);
   }
   if(age<.6){const k=Math.exp(-age*5);
    ctx.point(e.origin,[1,1,1],34*k+10,k*.7);}
   ctx.point(e.origin,[.8,.9,1],24,decay*.12);
  }
 },
 {
  /* SIMPLIFIED lensing: displaced background sample points + tangential arc
     smears + an Einstein ring. No framebuffer distortion, no pipeline change. */
  id:'gravitational-lensing',label:'引力透镜',rarity:'legendary',
  cadence:{min:120,mean:90,max:300},warmup:{min:45,max:90},
  cooldown:30,maxConcurrent:1,exclusiveGroup:null,weight:1,performanceCost:'medium',enabled:true,
  phase(e,age){const t=age/e.life;return t<.2?'field-rising':t<.8?'lensing':'releasing';},
  spawn(args){
   const depth=range(1300,1700),pixel=pixelOf(args,depth);
   const e={life:range(15,22),seed:Math.random(),pixel,basis:basisOf(args)};
   const xy=skySpot(args);
   e.origin=ctx.cameraPoint(xy[0],xy[1],depth,args);
   e.lensR=range(10,15)*pixel;
   return e;
  },
  draw(e,age){
   const envl=env(age/e.life,.2,.25);
   const slot=ctx.claimActor();
   if(slot>=0)ctx.actor(slot,e.origin,e.lensR,6,[.001,.001,.002],e.seed);
   /* Einstein ring */
   ctx.ring(e.origin,e.basis,e.lensR*2.2,[.8,.88,1],envl*.2,.2);
   /* background sample points, deflected outward; near-critical ones smear
      into short tangential arcs */
   for(let i=0;i<70;i++){
    const h1=hnoise(i,e.seed)*2-1,h2=hnoise(i+71,e.seed)*2-1,h3=hnoise(i+143,e.seed);
    const r0=e.lensR*(1.1+h3*5.5);
    const a=h1*Math.PI+h2*.8;
    const deflect=1+Math.pow(e.lensR*1.4/r0,2)*.9;
    const r=r0*deflect;
    const dirr=[Math.cos(a),Math.sin(a)];
    const p=e.origin.map((v,k)=>v+e.basis.right[k]*dirr[0]*r+e.basis.up[k]*dirr[1]*r+e.basis.back[k]*h2*r*.15);
    ctx.point(p,[.85,.9,1],.8+Math.pow(h3,4)*2.2,envl*(.14+.2*h3));
    if(r0<e.lensR*2.2){
     const tang=[-dirr[1],dirr[0]],arc=e.lensR*.35*(1-r0/(e.lensR*2.2));
     const p2=e.origin.map((v,k)=>v+e.basis.right[k]*(dirr[0]*r+tang[0]*arc)+e.basis.up[k]*(dirr[1]*r+tang[1]*arc));
     ctx.line(p,p2,[.75,.85,1],envl*.3);
    }
   }
  }
 }];
}

/* Ordered multi-stage sequences. Chains run on the scene clock through the
   engine (so hidden tabs never advance them), each step spawns through the
   normal force-trigger path, and any chain is cancelable at any step. */
export const CELESTIAL_CHAINS={
 'stellar-death':{label:'恒星之死',steps:[
  {eventId:'stellar-micro-flare',waitAfter:3},
  {eventId:'collapse',waitAfter:14},
  {eventId:'supernova-remnant',waitAfter:10},
  {eventId:'pulsar',waitAfter:2}]},
 'fireball-sequence':{label:'火流星坠落',steps:[
  {eventId:'fireball',waitAfter:1.2},
  {eventId:'meteor-fragmentation',waitAfter:1},
  {eventId:'meteor-airburst',waitAfter:2}]},
 'comet-passage':{label:'彗星过境',steps:[
  {eventId:'distant-comet',waitAfter:8},
  {eventId:'comet-flyby',waitAfter:6},
  {eventId:'returning-comet',waitAfter:2}]},
 'black-hole-feast':{label:'黑洞盛宴',steps:[
  {eventId:'gravitational-lensing',waitAfter:5},
  {eventId:'black-hole-consumes-body',waitAfter:11},
  {eventId:'tidal-disruption-event',waitAfter:4},
  {eventId:'surge',waitAfter:2}]},
 'lunar-eclipse':{label:'月全食',enabled:false,steps:[
  {eventId:'lunar-eclipse',waitAfter:2},
  {eventId:'blood-moon',waitAfter:2}]},
 'galaxy-night':{label:'银河之夜',steps:[
  {eventId:'milky-way-bloom',waitAfter:5},
  {eventId:'aurora',waitAfter:2}]},
 'asteroid-breakup':{label:'小行星解体',steps:[
  {eventId:'near-asteroid-pass',waitAfter:1.5},
  {eventId:'asteroid-breakup',waitAfter:2}]}
};