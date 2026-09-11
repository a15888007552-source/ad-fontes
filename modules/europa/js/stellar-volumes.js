/* Spatial interpretations of astronomical forms, built entirely from analytic
   3D curves and sampled volumes. No photograph, depth map or image texture is
   loaded by this renderer. These are artistic geometries, not measured models. */
const TAU=Math.PI*2;
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t)));
const gold=[1,.68,.29],ivory=[1,.90,.68],blue=[.18,.48,1],teal=[.18,.85,.83],pink=[1,.25,.40],violet=[.67,.42,1];
export const VOLUMES={
 greek:{mode:1,title:'星核与尘埃盘',code:'M 104',shape:'象牙色星核悬于薄盘之中，铜金色星流绕核回旋。',color:'#ddc5a0',home:1330,yaw:.62,pitch:.23,source:'https://esahubble.org/images/opo0328a/'},
 medieval:{mode:2,title:'层叠的银蓝穹顶',code:'M 13',shape:'银蓝色星流舒展成层叠穹顶，长线贯穿，细流相互叠合。',color:'#b7cce6',home:1420,yaw:.16,pitch:.28,source:'https://esahubble.org/images/opo0840a/'},
 'medieval-late':{mode:8,title:'交错的周期星流',code:'M 13',shape:'几组周期不同的弧形星流交织，相遇的位置不断变化。',color:'#a6c3ec',home:1380,yaw:.26,pitch:.33,source:'https://esahubble.org/images/opo0840a/'},
 ren:{mode:3,title:'双旋臂与伴星',code:'M 51',shape:'蓝色旋臂缀满玫红星结，向远处的金色伴星伸展。',color:'#c58c99',home:1440,yaw:.30,pitch:.91,source:'https://esahubble.org/images/heic0506a/'},
 baroque:{mode:4,title:'相向的弧形光幕',code:'WR 140',shape:'金色大光幕与紫蓝色小光幕相向展开，绵延的光带穿过中央。',color:'#d4b98b',home:1460,yaw:.12,pitch:.16,source:'https://esawebb.org/images/WR140a/'},
 classical:{mode:5,title:'层叠的星环',code:'M 57',shape:'青碧内环与蔷薇色外环相扣，星流绕着中央空隙运行。',color:'#8fd3be',home:1270,yaw:.57,pitch:.91,source:'https://esawebb.org/images/weic2320b/'},
 romantic:{mode:6,title:'云山与星海',code:'NGC 3324',shape:'赭金色云山叠起，蓝色星流从山脊上方涌过。',color:'#dea470',home:1450,yaw:.28,pitch:.18,source:'https://esawebb.org/images/weic2205a/'},
 modern:{mode:7,title:'破碎的纤维星云',code:'M 1',shape:'金色纤维穿过冰蓝色星雾，交织成不规则的空间网络。',color:'#8ccada',home:1370,yaw:.36,pitch:.28,source:'https://esawebb.org/images/weic2417a/'}
};

export const FLOW_GLSL=`
uniform float uTime;uniform float uMode;
vec3 flow(vec3 p){
 float t=uTime,r=length(p.xz),a,c,s;
 if(uMode<.5){a=t*(.043+.034*exp(-r/400.0));p.y+=(sin(r*.009+t*.48)-sin(r*.009))*(12.0+r*.039);}
 else if(uMode<1.5){a=t*.016*(r<220.0?3.0:r<390.0?2.0:1.5);p.y+=sin(r*.012+t*.42)*5.0;}
 else if(uMode<2.5){a=sin(t*.13)*.055;p.y+=sin(p.x*.006+t*.27)*9.0;p.z+=sin(p.x*.004+t*.22)*11.0;}
 else if(uMode<3.5){a=t*.037+sin(t*.24)*.075*exp(-r/370.0)+.044*sin(atan(p.z,p.x)*4.0-t*.76)*exp(-r/450.0);p.y+=sin(r*.012+t*.42)*13.0;}
 else if(uMode<4.5){a=sin(t*.14)*.045;float b=1.0+.037*sin(t*.52+(p.x<0.0?0.0:3.14159));p.x*=b;p.y*=b;p.z+=sin(p.x*.007+t*.36)*13.0;}
 else if(uMode<5.5){a=t*.04;float b=1.0+.026*sin(atan(p.z,p.x)*2.0-t*.48);p.xz*=b;p.y+=sin(r*.012+t*.48)*12.0;}
 else if(uMode<6.5){a=sin(t*.17)*.13;p.y+=sin(p.x*.006+p.z*.008+t*.39)*22.0;p.z+=sin(p.x*.004+t*.31)*19.0;float pulse=1.0+.025*sin(t*.35)*exp(-length(p-vec3(0.0,105.0,0.0))/560.0);p=vec3(p.x,p.y-105.0,p.z)*pulse+vec3(0.0,105.0,0.0);}
 else if(uMode<7.5){a=t*.027+sin(p.y*.007+t*.35)*.025;p*=1.0+.020*sin(length(p)*.014+t*.47)+.014*sin(p.x*.014+p.y*.01+t*.36);}
 else{a=t*.028;p.y+=sin(p.x*.009+t*.54)*16.0;p.z+=sin(p.y*.007+t*.36)*12.0;}
 c=cos(a);s=sin(a);p.xz=vec2(c*p.x-s*p.z,s*p.x+c*p.z);return p;
}`;
export function flowPoint(position,t,mode=0){
 let[x,y,z]=position,r=Math.hypot(x,z),a;
 if(!mode){a=t*(.043+.034*Math.exp(-r/400));y+=(Math.sin(r*.009+t*.48)-Math.sin(r*.009))*(12+r*.039);}
 else if(mode===1){a=t*.016*(r<220?3:r<390?2:1.5);y+=Math.sin(r*.012+t*.42)*5;}
 else if(mode===2){a=Math.sin(t*.13)*.055;y+=Math.sin(x*.006+t*.27)*9;z+=Math.sin(x*.004+t*.22)*11;}
 else if(mode===3){a=t*.037+Math.sin(t*.24)*.075*Math.exp(-r/370)+.044*Math.sin(Math.atan2(z,x)*4-t*.76)*Math.exp(-r/450);y+=Math.sin(r*.012+t*.42)*13;}
 else if(mode===4){a=Math.sin(t*.14)*.045;const b=1+.037*Math.sin(t*.52+(x<0?0:3.14159));x*=b;y*=b;z+=Math.sin(x*.007+t*.36)*13;}
 else if(mode===5){a=t*.04;const b=1+.026*Math.sin(Math.atan2(z,x)*2-t*.48);x*=b;z*=b;y+=Math.sin(r*.012+t*.48)*12;}
 else if(mode===6){a=Math.sin(t*.17)*.13;y+=Math.sin(x*.006+z*.008+t*.39)*22;z+=Math.sin(x*.004+t*.31)*19;const pulse=1+.025*Math.sin(t*.35)*Math.exp(-Math.hypot(x,y-105,z)/560);x*=pulse;y=(y-105)*pulse+105;z*=pulse;}
 else if(mode===7){a=t*.027+Math.sin(y*.007+t*.35)*.025;const b=1+.020*Math.sin(Math.hypot(x,y,z)*.014+t*.47)+.014*Math.sin(x*.014+y*.01+t*.36);x*=b;y*=b;z*=b;}
 else{a=t*.028;y+=Math.sin(x*.009+t*.54)*16;z+=Math.sin(y*.007+t*.36)*12;}
 const c=Math.cos(a),s=Math.sin(a);return[c*x-s*z,y,s*x+c*z];
}
export const EXTINCTION_GLSL=`uniform vec3 uEye;
float transmission(vec3 p){
 if(uMode<.5||uMode>1.5||p.y*uEye.y>=0.0)return 1.0;
 float t=-p.y/(uEye.y-p.y);vec3 q=mix(p,uEye,t);float r=length(q.xz);
 float lane=smoothstep(150.0,220.0,r)*(1.0-smoothstep(510.0,575.0,r));
 return 1.0-lane*.96;
}`;

export function buildStellarData(key){
 const spec=VOLUMES[key],dust=[],fog=[],lines=[],candidates=[],paths=[];
 let seed=813718+spec.mode*353,traceIndex=0,candidateSeen=0,cloudSeen=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(1e-6,random())))*Math.cos(TAU*random());
 const noise=(x,y,z)=>Math.sin(x*.017+Math.sin(z*.009))*Math.cos(y*.013+z*.007)*.6+Math.sin(x*.043-y*.033+z*.021)*.25;
 const warp=(p,scale=12)=>[p[0]+noise(...p)*scale,p[1]+noise(p[1]+90,p[2],p[0])*scale,p[2]+noise(p[2]-70,p[0],p[1])*scale];
 const jitter=(p,s)=>[p[0]+gaussian()*s,p[1]+gaussian()*s,p[2]+gaussian()*s];
 const sphere=()=>{const z=random()*2-1,a=random()*TAU,r=Math.sqrt(1-z*z);return[r*Math.cos(a),z,r*Math.sin(a)];};
 function particle(p,c,size=1.5,opacity=.5){dust.push(...p,...c,size,opacity);}
 function cloud(p,c,size=43,opacity=.019){cloudSeen++;const record=[...p,...c,size,opacity*3.15];if(fog.length<2200*8)fog.push(...record);else{const k=Math.floor(random()*cloudSeen);if(k<2200)for(let i=0;i<8;i++)fog[k*8+i]=record[i];}}
 function candidate(p,c,light=.65){candidateSeen++;const record={position:p,color:c,light};if(candidates.length<3600)candidates.push(record);else{const k=Math.floor(random()*candidateSeen);if(k<3600)candidates[k]=record;}}
 function trace(fn,color,opacity=.075,steps=172,fuzz=9){
  let last=null,lastColor=null;const keep=traceIndex++%4===0&&paths.length<140,pathPositions=[],pathColors=[];
  for(let j=0;j<=steps;j++){
   const t=j/steps,p=fn(t),c=typeof color==='function'?color(t):color,a=opacity*(.15+.85*Math.pow(Math.sin(Math.PI*t),.4));
   if(keep){pathPositions.push(...p);pathColors.push(...c);}
   if(last)lines.push(...last,...lastColor,a,...p,...c,a);
   if(j%2===0){particle(jitter(p,fuzz),c,.7+random()*1.9,.24+random()*.44);if(j%6===0)particle(jitter(p,fuzz*1.7),c,.8+random()*2,.18+random()*.36);}
   if(j%21===0)cloud(jitter(p,fuzz),c,28+random()*28,.012+random()*.014);
   if(j%11===0&&t>.09&&t<.93)candidate([...p],c,Math.min(1,opacity/.12)*(.25+.75*Math.sin(Math.PI*t)));
   last=p;lastColor=c;
  }
  if(keep)paths.push({positions:new Float32Array(pathPositions),colors:new Float32Array(pathColors),steps,phase:random(),speed:.04+random()*.034});
 }
 function ball(center,radii,c,count,opacity=.38){
  for(let i=0;i<count;i++){
   const p=[center[0]+gaussian()*radii[0],center[1]+gaussian()*radii[1],center[2]+gaussian()*radii[2]];
   const n=noise(...p);if(n<-.45&&random()<.8)continue;
   particle(p,mix(c,ivory,random()*.16),.7+random()*2.1,opacity*(.4+random()*.7));
   if(i%60===0)cloud(p,c,34+random()*20,.018);
  }
 }
 if(key==='greek'){
  ball([0,0,0],[111,91,111],ivory,23500,.57);
  for(let k=0;k<255;k++){
   const radius=140+Math.pow(random(),.65)*420,phase=random()*TAU,h=gaussian()*11,spin=.42+random()*.55;
   trace(t=>{const a=phase+t*TAU*spin,r=radius+Math.sin(t*9+phase)*9;return[r*Math.cos(a),h+Math.sin(a*3+phase)*5,r*Math.sin(a)];},mix(gold,ivory,(560-radius)/500),k%11===0?.15:.057,160,9);
  }
  for(let k=0;k<55;k++){
   const phase=random()*TAU,r=145+random()*44;
   trace(t=>{const a=t*TAU;return[Math.cos(a)*r,Math.sin(a)*r*.72,Math.sin(phase)*Math.cos(a)*r*.42];},ivory,.038,130,8);
  }
 }else if(key==='medieval'){
  for(let k=0;k<350;k++){
   const layer=random(),r=255+layer*260,depth=(random()-.5)*335,phase=random()*TAU;
   trace(t=>{const a=.10+t*(Math.PI-.20),x=Math.cos(a)*r,y=Math.sin(a)*r*.66-120,z=depth+Math.sin(a*2+phase)*35;return warp([x,y,z],7);},mix([.23,.43,.83],[.83,.91,1],Math.pow(1-layer,.6)),k%14===0?.16:.062,180,11);
  }
  for(let k=0;k<52;k++){const z=(random()-.5)*300,h=-110+random()*60;trace(t=>[-490+t*980,h+Math.sin(t*Math.PI)*80,z+Math.sin(t*TAU)*25],[.60,.73,.97],.05,160,9);}
  ball([0,30,-110],[310,110,150],[.14,.29,.62],10000,.10);
 }else if(key==='medieval-late'){
  for(let voice=0;voice<4;voice++)for(let k=0;k<95;k++){
   const layer=random(),r=275+layer*118,tilt=[.38,-.55,1.05,-1.0][voice],phase=voice*1.19,offset=(random()-.5)*15;
   trace(t=>{const a=t*TAU+phase,x=Math.cos(a)*r,y=Math.sin(a)*r*.76,z=Math.sin(a*2+phase)*55+offset;return warp([x,y*Math.cos(tilt)-z*Math.sin(tilt),y*Math.sin(tilt)+z*Math.cos(tilt)],5);},[[.69,.83,1],[.24,.53,.94],[.70,.57,.94],[.91,.83,.58]][voice],k%12===0?.16:.052,175,7);
  }
  ball([0,0,0],[125,95,130],[.10,.24,.54],5500,.10);
 }else if(key==='ren'){
  for(let arm=0;arm<2;arm++)for(let k=0;k<175;k++){
   const offset=gaussian()*.11,height=gaussian()*18,rscale=.89+random()*.22,phase=random()*TAU;
   const fn=t=>{const r=(34+Math.pow(t,.82)*483)*rscale,a=arm*Math.PI+Math.log(r/38)*2.14+offset;return[Math.cos(a)*r,height+Math.sin(a*1.7+phase)*r*.047,Math.sin(a)*r];};
   trace(fn,t=>mix([.99,.81,.49],[.26,.59,.92],Math.min(1,t*1.9)),k%12===0?.17:.052,200,13);
   if(k%9===0){const p=fn(.35+random()*.57);ball(p,[14,12,14],pink,210,.82);}
  }
  ball([0,0,0],[51,36,51],ivory,8500,.7);ball([440,35,-260],[44,52,44],gold,6400,.63);ball([0,0,0],[190,28,190],[.19,.29,.44],4000,.13);
  for(let k=0;k<46;k++){
   const o=gaussian()*14;
   trace(t=>[320+120*t+Math.sin(t*Math.PI)*50,15+Math.sin(t*Math.PI)*75+o,-125-135*t+Math.sin(t*TAU)*12+o],t=>mix(blue,gold,t),.055,112,10);
  }
 }else if(key==='baroque'){
  for(const sign of[-1,1])for(let k=0;k<195;k++){
   const layer=random(),r=(240+layer*270)*(sign<0?1:.72),depth=(random()-.5)*150,phase=random()*TAU;
   trace(t=>{const a=-1.30+t*2.60,x=sign*(30+Math.cos(a)*r),y=Math.sin(a)*r*.70+(sign>0?35:0),z=depth+Math.cos(a)*65+Math.sin(a*3+phase)*8;return warp([x,y,z],6);},sign<0?mix([.70,.32,.075],[1,.86,.57],1-layer*.8):mix([.30,.31,.71],[.81,.71,.98],1-layer*.8),k%13===0?.18:.067,170,8);
  }
  for(let k=0;k<78;k++){const z=(random()-.5)*115,h=(random()-.5)*30;trace(t=>[-485+t*900,-135-Math.sin(t*Math.PI)*48+h,z+Math.sin(t*TAU)*40],mix(gold,ivory,random()*.35),k%11===0?.16:.053,176,6);}
 }else if(key==='classical'){
  for(let k=0;k<485;k++){
   const phase=random()*TAU,cross=random()*TAU,layer=random(),R=305+layer*45,minor=55+layer*62;
   const fn=t=>{const u=phase+t*TAU*(.70+layer*.28),v=cross+u*(1.7+layer*.3),r=R+minor*Math.cos(v);return warp([r*Math.cos(u),minor*Math.sin(v),r*Math.sin(u)*.89],7);};
   trace(fn,mix(teal,mix(gold,pink,.65),layer*layer),k%13===0?.17:.071,165,6);
  }
  ball([0,0,0],[100,40,100],[.06,.34,.69],2300,.12);
  particle([0,0,0],[.67,.88,1],17,1);
 }else if(key==='romantic'){
  const ridge=(x,z)=>65+80*Math.sin(x*.008+z*.006)+48*Math.sin(x*.019-z*.011)+105*Math.exp(-Math.pow((x+240)/90,2));
  for(let k=0;k<420;k++){
   const z0=(random()-.5)*415,depth=Math.pow(random(),2)*350,phase=random()*TAU;
   const fn=t=>{const x=-580+t*1160,z=z0+Math.sin(t*TAU*1.3+phase)*39,envelope=Math.pow(Math.sin(t*Math.PI),.55);return warp([x,(ridge(x,z)-depth)*envelope-95*(1-envelope),z],12);};
   trace(fn,t=>mix([.43,.18,.055],mix(gold,ivory,.24),Math.max(0,1-depth/370)),k%17===0?.19:.057,195,15);
  }
  for(let k=0;k<70;k++){
   const offset=random()*180,phase=random()*TAU;
   trace(t=>{const x=-560+t*1130;return[x,205+offset*.55+Math.sin(t*Math.PI)*88+Math.sin(t*9+phase)*14,Math.sin(t*5+phase)*190];},blue,.029,165,15);
  }
 }else if(key==='modern'){
  for(let k=0;k<560;k++){
   const u=random()*TAU,v=Math.acos(random()*2-1),du=(random()-.5)*1.8,dv=(random()-.5)*1.35,depth=.76+random()*.32,phase=random()*TAU;
   const fn=t=>{const a=u+du*t,b=v+dv*t,r=depth*(1+.12*Math.sin(a*5+b*4)+.055*Math.sin(a*13-b*8));
    return warp([Math.cos(a)*Math.sin(b)*430*r,Math.cos(b)*335*r,Math.sin(a)*Math.sin(b)*345*r],12);};
   trace(fn,k%5===0?mix(blue,teal,.5):mix(gold,ivory,.25+random()*.45),k%15===0?.19:.084,112,5);
  }
  ball([0,0,0],[205,169,161],[.16,.52,.98],21000,.19);
  for(let k=0;k<24;k++){
   const dir=sphere(),start=[dir[0]*340,dir[1]*290,dir[2]*290],phase=random()*TAU;
   trace(t=>warp([start[0]*(1+t*.60),start[1]*(1+t*.50)+Math.sin(t*6+phase)*13,start[2]*(1+t*.55)],10),mix(gold,blue,k%3/2),.061,85,4);
  }
  particle([12,-7,0],[.5,.8,1],17,1);
 }
 // Sparse foreground/background stars make depth apparent during an orbit.
 for(let i=0;i<950;i++){const p=sphere(),r=520+random()*680;particle(p.map(v=>v*r),[.62,.76,.94],.7+Math.pow(random(),4)*3,.08+random()*.28);}
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(const p of candidates)for(let i=0;i<3;i++){bounds.min[i]=Math.min(bounds.min[i],p.position[i]);bounds.max[i]=Math.max(bounds.max[i],p.position[i]);}
 const candidateData=new Float32Array(candidates.length*7);candidates.forEach((p,i)=>candidateData.set([...p.position,...p.color,p.light],i*7));
 return{key,spec,dustData:new Float32Array(dust),fogData:new Float32Array(fog),lineData:new Float32Array(lines),paths,candidates:candidateData,bounds,kind:'procedural-3d'};
}

export function createStellarVolumes(gl,buffer){
 const cache=new Map(),waiting=new Map();let active=null,disposed=false,serial=0,worker=null;
 try{
  worker=new Worker(new URL('./stellar-worker.js?v=20260911-epochs2',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{const promise=waiting.get(data.id);if(!promise)return;waiting.delete(data.id);data.error?promise.reject(new Error(data.error)):promise.resolve(data.volume);};
  worker.onerror=e=>{for(const p of waiting.values())p.reject(new Error(e.message||'星云构建失败'));waiting.clear();};
 }catch{}
 function build(key,id){return worker?new Promise((resolve,reject)=>{waiting.set(id,{resolve,reject});worker.postMessage({key,id});}):new Promise(resolve=>setTimeout(()=>resolve(buildStellarData(key)),0));}
 function release(v){for(const b of[v.dust,v.fog,v.lines,v.streamBuffer])gl.deleteBuffer(b);}
 async function select(key){
  const id=++serial;active=null;if(disposed||!VOLUMES[key])return null;
  if(cache.has(key)){active=cache.get(key);cache.delete(key);cache.set(key,active);return active;}
  const data=await build(key,id);if(disposed||id!==serial)return null;
  const streams=new Float32Array(data.paths.length*7*8);
  const volume={...data,dust:buffer(data.dustData),dustCount:data.dustData.length/8,fog:buffer(data.fogData),fogCount:data.fogData.length/8,lines:buffer(data.lineData),lineCount:data.lineData.length/7,streams,streamBuffer:buffer(streams,gl.DYNAMIC_DRAW)};
  delete volume.dustData;delete volume.fogData;delete volume.lineData;
  cache.set(key,volume);active=volume;
  while(cache.size>2){const first=cache.keys().next().value;release(cache.get(first));cache.delete(first);}
  return volume;
 }
 function animate(time){
  if(!active)return;let i=0;
  for(const path of active.paths)for(let j=0;j<7;j++){
   const t=(path.phase+j/7+time*path.speed)%1,s=t*path.steps,k=Math.min(path.steps-1,Math.floor(s)),f=s-k,a=k*3,b=a+3,o=i++*8;
   for(let axis=0;axis<3;axis++){active.streams[o+axis]=path.positions[a+axis]+(path.positions[b+axis]-path.positions[a+axis])*f;const c=path.colors[a+axis]+(path.colors[b+axis]-path.colors[a+axis])*f;active.streams[o+3+axis]=c*.75+ivory[axis]*.25;}
   active.streams[o+6]=4.6;active.streams[o+7]=Math.pow(Math.sin(t*Math.PI),.5)*.75;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,active.streamBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,active.streams);
 }
 function assignNodes(nodes,volume,exclusion=null){
  const placed=[],pool=volume.candidates,spec=volume.spec,sy=Math.sin(spec.yaw),cy=Math.cos(spec.yaw),sp=Math.sin(spec.pitch),cp=Math.cos(spec.pitch),view=[sy*cp,sp,cy*cp],right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp];
  const samples=[];
  for(let i=0;i<pool.length;i+=7){if(exclusion&&Math.hypot(pool[i]-exclusion.center[0],pool[i+1]-exclusion.center[1],pool[i+2]-exclusion.center[2])<exclusion.clearance)continue;const depth=pool[i]*view[0]+pool[i+1]*view[1]+pool[i+2]*view[2],scale=spec.home/(spec.home-depth),x=(pool[i]*right[0]+pool[i+2]*right[2])*scale,y=(pool[i]*up[0]+pool[i+1]*up[1]+pool[i+2]*up[2])*scale;samples.push({i,x,y,weight:.4+pool[i+6]});}
  nodes.sort((a,b)=>b.deg-a.deg).forEach(n=>{
   let best=-1,score=-1;
   let chosen=null;
   for(const sample of samples){let d=placed.length?Infinity:36000/(1+(sample.x*sample.x+sample.y*sample.y)/90000);
    for(const q of placed){const dx=sample.x-q.x,dy=sample.y-q.y;d=Math.min(d,dx*dx+dy*dy);}
    const rank=Math.min(270,Math.sqrt(d))*sample.weight;
    if(rank>score){score=rank;best=sample.i;chosen=sample;}}
   if(best<0)return;n.position=[pool[best],pool[best+1],pool[best+2]];n.color=[pool[best+3]*.38+.62,pool[best+4]*.38+.62,pool[best+5]*.38+.62];placed.push(chosen);
  });
 }
 return{select,animate,assignNodes,get active(){return active;},destroy(){disposed=true;serial++;worker?.terminate();for(const p of waiting.values())p.resolve(null);waiting.clear();for(const v of cache.values())release(v);cache.clear();}};
}
