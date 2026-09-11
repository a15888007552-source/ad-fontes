/* These are interpretive centers, separate from the dictionary's people.
   Their musical themes draw on the existing period introductions. */
import {FLOW_GLSL,flowPoint} from './stellar-volumes.js?v=20260911-epochs2';
import {createCelestialBodies} from './celestial-bodies.js?v=20260911-depth2';
const TAU=Math.PI*2;
export const ERA_CORES={
 all:{kind:0,name:'时间之井',theme:'记忆与传递',text:'群星在不同的轨道上相遇，作品、记忆与影响向更远处传递。',center:[0,4,0],clearance:105,size:168},
 greek:{kind:1,name:'谐振星核',theme:'比例与秩序',text:'三重轨道遵循 2∶3∶4 的循环节律，呼应古代乐学对音程比例与和谐秩序的思考。',center:[0,8,0],clearance:115,size:145},
 medieval:{kind:2,name:'长明之灯',theme:'绵延与层叠',text:'长明的星核映照着层层穹顶。绵延的主线旁生出相互叠合的声部，取意于圣咏传统及早期复调的展开。',center:[0,20,0],clearance:105,size:140},
 'medieval-late':{kind:8,name:'错位的时轮',theme:'周期与节奏组织',text:'两组光环以不同周期运行，时而相遇，时而错开。以等节奏的周期组织为线索，观看十四世纪复调中的一种新秩序。',center:[0,0,0],clearance:125,size:150},
 ren:{kind:3,name:'复调共鸣核',theme:'应答与交织',text:'四颗近乎等量的星核彼此牵引，以模仿复调为线索，让各声部的应答成为可见的运动。',center:[0,10,0],clearance:140,size:158},
 baroque:{kind:4,name:'通奏之井',theme:'持续低音与竞奏',text:'金色光带不息地贯穿中央，两侧光幕以不同体量交替呼应。持续的低音支撑着协奏中的对比与竞奏。',center:[0,0,0],clearance:125,size:170},
 classical:{kind:5,name:'回归的双星',theme:'张力、平衡与回归',text:'双星在相对位置的变化中反复回到共同的轨道，取意于古典形式中的张力、平衡与回归。',center:[0,8,0],clearance:130,size:138},
 romantic:{kind:6,name:'向无限的巨星',theme:'表达与尺度的扩张',text:'脉动的巨星不断推开外层光晕，取意于浪漫主义对无限的想象，以及音响与表达尺度的扩张。',center:[0,105,0],clearance:175,size:195},
 modern:{kind:7,name:'多重引力场',theme:'多种道路并存',text:'多个晶核以不同节律运行，交叠而不归于单一轨道，取意于二十世纪并存的音高、节奏与音色组织方式。',center:[0,0,0],clearance:135,size:160}
};
const gold=[1,.70,.27],ivory=[1,.91,.68],cyan=[.25,.77,1],teal=[.22,.93,.77],violet=[.69,.44,1],rose=[1,.39,.47];
const crystalCenters=[[-58,32,30],[54,30,-36],[3,-39,49],[34,60,39]];
function rotate(p,tilt=0,azimuth=0){let[x,y,z]=p,c=Math.cos(tilt),s=Math.sin(tilt);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(azimuth);s=Math.sin(azimuth);return[x*c-z*s,y,x*s+z*c];}
function incline(p){return[p[0]*.94-p[1]*.34,p[0]*.34+p[1]*.94,p[2]];}

export function createEraCores(gl,program,buffer){
 let key='all',spec=ERA_CORES.all,lineCount=0;const geometryCache=new Map();
 const elements=Array.from({length:6},(_,i)=>({id:'era-core-'+i,body:{type:0,radius:20,color:ivory,seed:.13+i*.137,tilt:.3+i*.17,satellite:false},worldPosition:[0,0,0],renderable:false,emphasis:1}));
 const spheres=createCelestialBodies(gl,program,buffer,elements);
 const lineProgram=program(`precision highp float;attribute vec3 aPosition;attribute vec4 aColor;attribute vec3 aMotion;uniform mat4 uMVP;uniform vec3 uCenter;uniform vec3 uRight;uniform vec3 uUp;uniform float uKind;uniform float uOpacity;varying vec4 vColor;${FLOW_GLSL}
 void main(){vec3 p=aPosition;
  if(uKind>5.5&&uKind<6.5){float shell=fract(uTime*.042+aMotion.y*.13);p*=.82+shell*.72;}
  vec3 world=aMotion.z>.5?flow(uCenter)+uRight*p.x+uUp*p.z:flow(p+uCenter);
  gl_Position=uMVP*vec4(world,1.0);
  float light=.55+.45*pow(.5+.5*cos(aMotion.x*6.283-uTime*aMotion.y),5.0),alpha=aColor.a;
  if(uKind>5.5&&uKind<6.5){float shell=fract(uTime*.042+aMotion.y*.13);alpha*=sin(shell*3.14159);}
  vColor=vec4(aColor.rgb,alpha*light*uOpacity);
 }`,'precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vColor;}');
 const attrs=[['aPosition',3,0],['aColor',4,12],['aMotion',3,28]].map(([name,size,offset])=>[gl.getAttribLocation(lineProgram,name),size,offset]),uniforms={};
 for(const n of['uMVP','uCenter','uRight','uUp','uKind','uOpacity','uTime','uMode'])uniforms[n]=gl.getUniformLocation(lineProgram,n);
 const gpu=buffer(new Float32Array(0),gl.STATIC_DRAW);
 function build(){
  if(geometryCache.has(key)){const cached=geometryCache.get(key);lineCount=cached.length/10;gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.bufferData(gl.ARRAY_BUFFER,cached,gl.STATIC_DRAW);return;}
  const data=[];
  function trace(fn,color,alpha=.30,steps=112,speed=1,optical=false){
   let prev=fn(0);for(let j=1;j<=steps;j++){const t=j/steps,p=fn(t);for(const[q,s]of[[prev,(j-1)/steps],[p,t]])data.push(...q,...color,alpha,s,speed,optical?1:0);prev=p;}
  }
  function ring(radius,color,tilt=0,az=0,alpha=.35,optical=false){trace(t=>rotate([Math.cos(t*TAU)*radius,0,Math.sin(t*TAU)*radius],tilt,az),color,alpha,144,1,optical);}
  if(spec.kind===0||spec.kind===4){
   const baroque=spec.kind===4,inner=baroque?40:54,outer=baroque?127:158;
   for(let i=0;i<96;i++){const r=inner+(outer-inner)*i/95,phase=i*.63;trace(t=>{const a=t*TAU*1.12+phase,p=[Math.cos(a)*r,Math.sin(a*3+phase)*3.5,Math.sin(a)*r];return baroque?incline(p):p;},i%5?gold:ivory,.15+(i%9===0?.23:0),128,2+i*.012);}
   for(const radius of[baroque?36:46,baroque?37.8:47.6])ring(radius,ivory,0,0,.57,true);
   if(baroque)for(const sign of[-1,1])for(let i=0;i<16;i++){const phase=i/16*TAU;trace(t=>{const x=sign*(38+t*185),r=3+Math.sin(t*Math.PI)*12;return[x,Math.cos(phase+t*3)*r-35*Math.sin(t*Math.PI),Math.sin(phase+t*3)*r];},sign<0?ivory:violet,.10,88,sign<0?1.1:1.37);}
  }else if(spec.kind===1){
   for(let j=0;j<3;j++)for(let strand=0;strand<3;strand++)ring(72+j*28+strand*.8,j===0?gold:j===1?cyan:ivory,.30+j*.43,j*.58,.34-strand*.08);
   ring(38,ivory,.9,.3,.15);
  }else if(spec.kind===2){
   for(let k=0;k<36;k++){const phase=k/36*TAU;trace(t=>{const x=(t-.5)*232,r=5+Math.sin(t*Math.PI)*16;return[x,Math.cos(phase+t*3)*r,Math.sin(phase+t*3)*r];},k%3?[.80,.89,1]:cyan,.13,112,.60+k*.006);}
   for(let k=0;k<3;k++)ring(43+k*23,k===1?cyan:[.76,.85,1],.55+k*.18,0,.20);
  }else if(spec.kind===8){
   for(let voice=0;voice<2;voice++)for(let j=0;j<10;j++)trace(t=>{const a=t*TAU,r=70+j*.9;return rotate([Math.cos(a)*r,0,Math.sin(a)*r],voice?.95:-.60,voice*.30);},voice?gold:cyan,.19,144,voice?.72:1.08);
  }else if(spec.kind===3){
   for(let voice=0;voice<4;voice++)for(let j=0;j<9;j++)trace(t=>{const a=t*TAU+voice*Math.PI/2,r=62+j*1.0;return[Math.cos(a)*r,Math.sin(a*2+voice*Math.PI/2)*34,Math.sin(a)*r];},[ivory,cyan,rose,gold][voice],.12,132,.45+voice*.04);
  }else if(spec.kind===5){
   for(let j=0;j<12;j++)trace(t=>{const a=t*TAU,r=68+j*.65;return[Math.cos(a)*r,Math.sin(a)*14,Math.sin(a)*r*.66];},j%2?ivory:cyan,.15,144,.5);
   ring(119,teal,.08,0,.16);
  }else if(spec.kind===6){
   for(let k=0;k<68;k++){const az=k/68*TAU,tilt=.27+(k%9)*.24,r=102+(k%6)*7;trace(t=>rotate([Math.cos(t*TAU)*r,0,Math.sin(t*TAU)*r],tilt,az),k%4?gold:rose,.11,104,.6+(k%12)*.35);}
  }else{
   for(let i=0;i<4;i++)for(let j=0;j<9;j++)trace(t=>{const a=t*TAU,r=33+j*1.6,p=rotate([Math.cos(a)*r,0,Math.sin(a)*r],.4+i*.71,i*.53);return p.map((v,k)=>v+crystalCenters[i][k]);},[cyan,violet,gold,teal][i],.18,96,.44+i*.23);
  }
  const packed=new Float32Array(data);geometryCache.set(key,packed);lineCount=packed.length/10;gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.bufferData(gl.ARRAY_BUFFER,packed,gl.STATIC_DRAW);
 }
 function select(next){key=ERA_CORES[next]?next:'all';spec=ERA_CORES[key];build();}
 function positions(time,mode){
  for(const n of elements)n.renderable=false;
  function place(i,p,r,color,type=0){const n=elements[i];n.renderable=true;n.body.radius=r;n.body.type=type;n.body.color=color;n.worldPosition=flowPoint(p.map((v,k)=>v+spec.center[k]),time,mode);}
  if(spec.kind===0||spec.kind===4)place(0,[0,0,0],spec.kind===0?43:33,[.001,.002,.004],6);
  else if(spec.kind===1){place(0,[0,0,0],25,ivory);for(let i=0;i<3;i++){const a=time*.16*(i+2),r=72+i*28;place(i+1,rotate([Math.cos(a)*r,0,Math.sin(a)*r],.30+i*.43,i*.58),6.5,[gold,cyan,ivory][i]);}}
  else if(spec.kind===2)place(0,[0,0,0],25*(1+.035*Math.sin(time*.35)),[.78,.91,1]);
  else if(spec.kind===3)for(let i=0;i<4;i++){const a=time*.19+i*TAU/4;place(i,[Math.cos(a)*66,Math.sin(a*2+i*Math.PI/2)*34,Math.sin(a)*66],19,[ivory,cyan,rose,gold][i]);}
  else if(spec.kind===8){place(0,[0,0,0],20,[.80,.91,1]);for(let i=0;i<2;i++){const a=time*(i?.72:1.08),p=rotate([Math.cos(a)*75,0,Math.sin(a)*75],i?.95:-.60,i*.30);place(i+1,p,9,i?gold:cyan);}}
  else if(spec.kind===5){const a=time*.24,p=[Math.cos(a)*72,Math.sin(a)*14,Math.sin(a)*72*.66];place(0,p,27,[1,.81,.43]);place(1,p.map(v=>-v),25,[.48,.81,1]);}
  else if(spec.kind===6)place(0,[0,0,0],78*(1+.065*Math.sin(time*.35)+.018*Math.sin(time*.14)),[1,.34,.10]);
  else for(let i=0;i<4;i++){const base=crystalCenters[i];place(i,base.map((v,k)=>v+Math.sin(time*(.13+i*.036)+i*2+k)*5),[22,19,24,18][i],[cyan,violet,gold,teal][i],7);}
 }
 function draw({matrix,time,mode,basis,eye,focal,dpr,opacity}){
  gl.useProgram(lineProgram);gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
  for(const[a,size,offset]of attrs){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,offset);}
  gl.uniformMatrix4fv(uniforms.uMVP,false,matrix);gl.uniform3fv(uniforms.uCenter,spec.center);gl.uniform3fv(uniforms.uRight,basis.right);gl.uniform3fv(uniforms.uUp,basis.up);gl.uniform1f(uniforms.uKind,spec.kind);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uMode,mode);gl.uniform1f(uniforms.uOpacity,opacity);gl.drawArrays(gl.LINES,0,lineCount);for(const[a]of attrs)gl.disableVertexAttribArray(a);gl.depthMask(true);
  positions(time,mode);spheres.draw({matrix,time,eye,focal,opacity,activeId:null});
 }
 select('all');
 return{select,draw,prepare:positions,get occluders(){return elements.filter(n=>n.renderable);},get spec(){return spec;},center:(time,mode)=>flowPoint(spec.center,time,mode),getState:()=>({key,name:spec.name,kind:spec.kind,bodies:elements.filter(n=>n.renderable).length,segments:lineCount/2}),destroy(){spheres.destroy();gl.deleteBuffer(gpu);gl.deleteProgram(lineProgram);}};
}
