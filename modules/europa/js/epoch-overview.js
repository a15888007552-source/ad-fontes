/* Seven era clouds embedded in one continuous, flowing galactic band. */
const TAU=Math.PI*2;
export function createEpochOverview({gl,program,buffer,container,keys,periods,onEnter,onPointerDown,request,project}){
 const layer=document.createElement('nav');layer.className='galaxy-era-overview';layer.setAttribute('aria-label','按时间顺序进入七个时代');container.appendChild(layer);
 const palette=[[1,.80,.48],[.62,.77,1],[.45,.67,1],[1,.71,.39],[.35,.89,.83],[1,.57,.27],[.51,.77,.94]];
 let seed=321097;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const points=[],lines=[],anchors=new Float32Array(21),groups=keys.map((key,i)=>{
  const button=document.createElement('button');button.type='button';button.className='galaxy-era-entry';button.dataset.era=key;button.hidden=true;
  const space=document.createElement('span');space.className='gee-space';space.setAttribute('aria-hidden','true');button.appendChild(space);
  const name=document.createElement('strong');name.textContent=periods[key].zh;button.appendChild(name);
  button.setAttribute('aria-label',`${i+1}，${periods[key].zh}，${periods[key].span}，进入时代星群`);
  button.addEventListener('click',e=>{if(e.detail===0)onEnter(key);});button.addEventListener('pointerdown',onPointerDown);
  for(const event of['pointerenter','focus'])button.addEventListener(event,()=>{hover=i;request();});
  for(const event of['pointerleave','blur'])button.addEventListener(event,()=>{hover=-1;request();});
  layer.appendChild(button);return{key,button,position:[0,0,0],screen:null,box:null};
 });
 let tracerCount=0;
 for(let i=0;i<7;i++)for(let k=0;k<36;k++){for(let j=0;j<=64;j++){
  const t=j/64,c=palette[i],color=i===3&&k>=22?[.61,.52,.95]:c,alpha=.068+.025*Math.sin(t*Math.PI);
  if(j)for(const at of[(j-1)/64,t])lines.push(0,0,0,...color,1,alpha,i,k,at);
  if(j%2===0)points.push((random()-.5)*.075,(random()-.5)*.075,(random()-.5)*.075,...color,.65+random()*1.65,.25+random()*.34,i,k,t);
 }
  if(k%3===0)for(let stream=0;stream<3;stream++)for(let tail=0;tail<5;tail++){const at=(stream/3+k*.023-tail*.006+1)%1,color=palette[i].map((v,k)=>v*.56+[1,.94,.83][k]*.44);points.push(0,0,0,...color,tail?3.2:4.8,.92*Math.exp(-tail*.62),i,k,at);tracerCount++;}
 }
 const pointGPU=buffer(new Float32Array(points)),lineGPU=buffer(new Float32Array(lines));
 const p=program(`precision highp float;attribute vec3 aPosition;attribute vec3 aColor;attribute vec2 aStyle;attribute float aGroup;attribute vec2 aMotion;uniform mat4 uMVP;uniform vec3 uAnchors[7];uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uBack;uniform float uScale;uniform float uTime;uniform float uDPR;uniform float uHover;uniform float uParticles;varying vec3 vColor;varying float vAlpha;
 vec3 curve(float i,float k,float t){float a=t*6.283185,p=k/36.0,phase=k*2.39996,r=.64+p*.42,time=uTime;
  if(i<.5){a+=time*.19;return vec3(cos(a)*r,sin(a*3.0+phase+time*.6)*.026+(mod(k,7.0)<.5?sin(a)*.26:0.0),sin(a)*r*.42);}
  if(i<1.5)return vec3(cos(t*3.14159)*r,sin(t*3.14159)*r*.62-.20+sin(t*6.0+phase-time*.7)*.028,sin(phase)*.35+sin(t*7.0+phase-time*.6)*.085);
  if(i<2.5){float q=.09+t*.97,b=mod(k,2.0)*3.14159+log(q/.08)*2.1+p*.25+time*.18;return vec3(cos(b)*q,sin(phase+time*.5)*.065,sin(b)*q*.70);}
  if(i<3.5){float side=k<22.0?-1.0:1.0,b=-1.3+t*2.6,q=r*(side<0.0?1.0:.70)*(1.0+.095*sin(time*.95+(side<0.0?0.0:3.14159)));return vec3(side*(.05+cos(b)*q),sin(b)*q*.70,sin(phase+time*.4)*.15);}
  if(i<4.5){a+=time*.15;float v=phase+a*2.0-time*.70,q=.67+cos(v)*.22;return vec3(cos(a)*q,sin(v)*.15,sin(a)*q*.68);}
  if(i<5.5){float x=t*2.1-1.05;return vec3(x,(sin(x*5.0+phase*.04-time*.80)*.15+.20-p*.55)*sin(t*3.14159),sin(phase+time*.26)*.28);}
  float b=phase+t*(.45+p)+time*(.12+.06*sin(phase)),v=.25+mod(k,9.0)/9.0*2.5+.08*sin(time*.6+phase);r*=1.0+.075*sin(time*.7+phase);return vec3(cos(b)*sin(v)*r,cos(v)*r*.72,sin(b)*sin(v)*r*.55);
 }
 void main(){float t=aMotion.y,speed=.048+mod(aGroup,3.0)*.010;if(aGroup>2.5&&aGroup<3.5&&aMotion.x>=22.0)speed=-speed;if(uParticles>.5)t=fract(t+uTime*speed);
  vec3 q=curve(aGroup,aMotion.x,t)+aPosition;if((aGroup>1.5&&aGroup<2.5)||(aGroup>3.5&&aGroup<4.5)){float y=q.y,z=q.z;q.y=y*.46-z*.888;q.z=y*.888+z*.46;}
  vec3 world=uAnchors[int(aGroup+.5)]+(uRight*q.x+uUp*q.y+uBack*q.z)*uScale;vec4 clip=uMVP*vec4(world,1.0);gl_Position=clip;gl_PointSize=aStyle.x*uDPR*1260.0/max(clip.w,100.0);
  float fade=uParticles>.5&&aGroup>.5&&abs(aGroup-4.0)>.4?pow(max(.01,sin(t*3.14159)),.32):1.0,light=.85+.50*pow(.5+.5*cos(t*19.0-uTime*2.1+aMotion.x*.37),10.0);vColor=aColor;vAlpha=aStyle.y*fade*light*(abs(uHover-aGroup)<.4?1.45:1.0);
 }`,
 'precision mediump float;uniform float uPoints;varying vec3 vColor;varying float vAlpha;void main(){float a=vAlpha;if(uPoints>.5){vec2 q=gl_PointCoord*2.0-1.0;float r=dot(q,q);if(r>1.0)discard;a*=exp(-r*3.0);}gl_FragColor=vec4(vColor,a);}');
 const attrs=[['aPosition',3,0],['aColor',3,12],['aStyle',2,24],['aGroup',1,32],['aMotion',2,36]].map(([n,s,o])=>[gl.getAttribLocation(p,n),s,o]),u={};
 for(const n of['uMVP','uAnchors[0]','uRight','uUp','uBack','uScale','uTime','uDPR','uHover','uPoints','uParticles'])u[n]=gl.getUniformLocation(p,n);
 const dust=[],mist=[],threads=[];
 const gauss=()=>Math.sqrt(-2*Math.log(Math.max(.00001,random())))*Math.cos(TAU*random());
 function bandColor(t){const at=Math.max(0,Math.min(5.999,t*6)),i=Math.floor(at),f=at-i;return palette[i].map((v,k)=>{const c=v+(palette[i+1][k]-v)*f;return c*.36+[.48,.64,.77][k]*.64;});}
 for(let i=0;i<18000;i++){const t=random()*1.28-.14,w=gauss()*.40,z=gauss()*.28,c=bandColor(t);dust.push(t,w,z,...c,.55+Math.pow(random(),3)*2.1,.16+random()*.46);}
 for(let i=0;i<340;i++){const t=random()*1.28-.14;mist.push(t,gauss()*.44,gauss()*.24,...bandColor(t),67+random()*76,.020+random()*.023);}
 for(let k=0;k<62;k++){const offset=(random()-.5)*1.05,phase=random()*TAU,depth=(random()-.5)*.72;let last=null;
  for(let j=0;j<=156;j++){const t=-.14+j/156*1.28,q=[t,offset+Math.sin(t*8+phase)*.11,depth+Math.cos(t*7+phase)*.08,...bandColor(t),1,.022];if(last)threads.push(...last,...q);last=q;}
 }
 const dustGPU=buffer(new Float32Array(dust)),mistGPU=buffer(new Float32Array(mist)),threadGPU=buffer(new Float32Array(threads));
 const bandProgram=program(`precision highp float;attribute vec3 aPosition;attribute vec3 aColor;attribute vec2 aStyle;uniform mat4 uMVP;uniform vec3 uOrigin;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uBack;uniform float uSpan;uniform float uHeight;uniform float uWidth;uniform float uDepth;uniform float uTime;uniform float uDPR;uniform float uFlow;varying vec3 vColor;varying float vAlpha;
 void main(){float t=aPosition.x;if(uFlow>.5)t=mod(t+.14+uTime*.008,1.28)-.14;
  float envelope=pow(max(0.0,sin((t+.14)/1.28*3.141593)),.65),dy=uHeight*(.35-.628319*cos(t*6.283185));
  vec3 normal=normalize(-uRight*dy+uUp*uSpan),center=uOrigin+uRight*(t*uSpan)+uUp*(uHeight*(.35*t-.10*sin(t*6.283185)))+uBack*(sin(t*6.283185)*uDepth);
  float w=uWidth*(.70+.28*sin(t*5.0+.3)),lateral=aPosition.y+sin(t*14.0+uTime*.28+aPosition.z*9.0)*.035;
  vec3 world=center+normal*(lateral*w)+uBack*(aPosition.z*w);vec4 clip=uMVP*vec4(world,1.0);gl_Position=clip;gl_PointSize=aStyle.x*uDPR*1260.0/max(clip.w,100.0);
  float light=.84+.55*pow(.5+.5*cos(t*32.0-uTime*.52),12.0),lane=.26+.74*smoothstep(.025,.15,abs(lateral-.10*sin(t*17.0+.7)));vColor=aColor;vAlpha=aStyle.y*envelope*light*lane;
 }`,'precision mediump float;uniform float uPoints;varying vec3 vColor;varying float vAlpha;void main(){float a=vAlpha;if(uPoints>.5){vec2 q=gl_PointCoord*2.0-1.0;float rr=dot(q,q);if(rr>1.0)discard;a*=exp(-rr*4.7);}gl_FragColor=vec4(vColor,a);}');
 const ba=[['aPosition',3,0],['aColor',3,12],['aStyle',2,24]].map(([n,s,o])=>[gl.getAttribLocation(bandProgram,n),s,o]),bu={};
 for(const n of['uMVP','uOrigin','uRight','uUp','uBack','uSpan','uHeight','uWidth','uDepth','uTime','uDPR','uFlow','uPoints'])bu[n]=gl.getUniformLocation(bandProgram,n);
 let scale=60,hover=-1,buttonWidth=140,basis=null,bandOrigin=[0,0,0],bandSpan=1,bandHeight=1,bandWidth=1,bandDepth=1;
 function resize(width,height,home,introRight,immersive){
  const sy=Math.sin(home.yaw),cy=Math.cos(home.yaw),sp=Math.sin(home.pitch),cp=Math.cos(home.pitch),right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp],back=[sy*cp,sp,cy*cp];basis={right,up,back};
  const distance=home.distance*Math.max(1,1350/width),focal=height/(2*Math.tan(42*Math.PI/360)),center=immersive?0:width<1180?.035:.18;
  const left=immersive?width*.10:Math.max(introRight+78,width*.27),rightEdge=width-95,step=(rightEdge-left)/6;
  scale=step*.32*distance/focal;buttonWidth=Math.min(156,step-8);bandSpan=(rightEdge-left)*distance/focal;bandHeight=height*distance/focal;bandWidth=step*.76*distance/focal;bandDepth=48*distance/focal;
  const x0=(left-width*(.5+center*.5))*distance/focal,y0=(height*.4925-height*.565)*distance/focal;
  bandOrigin=home.target.map((v,k)=>v+right[k]*x0+up[k]*y0);
  groups.forEach((g,i)=>{const t=i/6;g.position=bandOrigin.map((v,k)=>v+right[k]*(t*bandSpan)+up[k]*(bandHeight*(.35*t-.10*Math.sin(t*TAU)))+back[k]*(Math.sin(t*TAU)*bandDepth));anchors.set(g.position,i*3);g.button.style.width=buttonWidth+'px';});
 }
 function layout(matrix,width,height,visible){layer.hidden=!visible;if(!visible){hover=-1;return;}
  groups.forEach(g=>{const s=g.screen=project(g.position,matrix,width,height),radius=scale*height/(2*Math.tan(42*Math.PI/360))/Math.max(100,s.d),top=s.y-radius-12;
   g.button.hidden=s.d<100||s.z>1||s.x<20||s.x>width-20||s.y<50||s.y>height-140;
   g.button.style.transform=`translate(${(s.x-buttonWidth/2).toFixed(1)}px,${top.toFixed(1)}px)`;g.button.style.setProperty('--cloud-height',(radius*2+18).toFixed(1)+'px');
   g.box={x:s.x-buttonWidth/2,y:top,w:buttonWidth,h:radius*2+26};});
 }
 function hit(x,y){return groups.find(g=>!layer.hidden&&!g.button.hidden&&g.box&&x>=g.box.x&&x<=g.box.x+g.box.w&&y>=g.box.y&&y<=g.box.y+g.box.h)?.key||null;}
 function draw(matrix,time,dpr){if(!basis)return;
  gl.useProgram(bandProgram);gl.uniformMatrix4fv(bu.uMVP,false,matrix);gl.uniform3fv(bu.uOrigin,bandOrigin);for(const k of['Right','Up','Back'])gl.uniform3fv(bu['u'+k],basis[k.toLowerCase()]);gl.uniform1f(bu.uSpan,bandSpan);gl.uniform1f(bu.uHeight,bandHeight);gl.uniform1f(bu.uWidth,bandWidth);gl.uniform1f(bu.uDepth,bandDepth);gl.uniform1f(bu.uTime,time);gl.uniform1f(bu.uDPR,dpr);
  for(const[b,count,isPoint,flow]of[[mistGPU,mist.length/8,1,0],[dustGPU,dust.length/8,1,1],[threadGPU,threads.length/8,0,0]]){gl.bindBuffer(gl.ARRAY_BUFFER,b);for(const[a,s,o]of ba){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,s,gl.FLOAT,false,32,o);}gl.uniform1f(bu.uPoints,isPoint);gl.uniform1f(bu.uFlow,flow);gl.drawArrays(isPoint?gl.POINTS:gl.LINES,0,count);}for(const[a]of ba)gl.disableVertexAttribArray(a);
  gl.useProgram(p);gl.uniformMatrix4fv(u.uMVP,false,matrix);gl.uniform3fv(u['uAnchors[0]'],anchors);for(const k of['Right','Up','Back'])gl.uniform3fv(u['u'+k],basis[k.toLowerCase()]);gl.uniform1f(u.uScale,scale);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uDPR,dpr);gl.uniform1f(u.uHover,hover);
  for(const[b,count,isPoint]of[[lineGPU,lines.length/11,0],[pointGPU,points.length/11,1]]){gl.bindBuffer(gl.ARRAY_BUFFER,b);for(const[a,s,o]of attrs){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,s,gl.FLOAT,false,44,o);}gl.uniform1f(u.uPoints,isPoint);gl.uniform1f(u.uParticles,isPoint);gl.drawArrays(isPoint?gl.POINTS:gl.LINES,0,count);}for(const[a]of attrs)gl.disableVertexAttribArray(a);
 }
 return{resize,layout,draw,hit,hover(key){hover=keys.indexOf(key);},getState:()=>({groups:groups.map(g=>({key:g.key,screen:g.screen})),points:points.length/11,segments:lines.length/22,tracers:tracerCount,band:{points:dust.length/8+mist.length/8,segments:threads.length/16}}),destroy(){layer.remove();for(const b of[pointGPU,lineGPU,dustGPU,mistGPU,threadGPU])gl.deleteBuffer(b);gl.deleteProgram(p);gl.deleteProgram(bandProgram);}};
}
