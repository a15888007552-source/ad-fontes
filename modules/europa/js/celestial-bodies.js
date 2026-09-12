/* Musician bodies are editorial wayfinding symbols, not a quantitative ranking
   of historical contribution. Their modest, stable variation is keyed to the
   person id; it does not encode degree, status, influence, or historical distance. */
import {createSkyLandmarks} from './sky-landmarks.js?v=20260911-depth2';
const TAU=Math.PI*2;
const LEVEL={beet:1,bach:.98,moza:.94,hayd:.83,mont:.84,josq:.83,pale:.81,dufa:.76,wagn:.89,debu:.84,stra:.85,scho:.83,lisz:.79,chop:.79,schb:.80,brah:.79,mahl:.80};
const SUNS={beet:[.58,.79,1],bach:[1,.76,.34],moza:[.90,.96,1],mont:[.80,.53,1],josq:[.68,.83,1],pale:[1,.82,.48],wagn:[1,.50,.24],debu:[.50,.86,1],stra:[.78,.85,1],mach:[.76,.83,.98]};
const COLORS=[[.75,.53,.32],[.30,.58,.87],[.78,.40,.40],[.31,.65,.48],[.58,.43,.80],[.69,.83,.90]];
const BODY_TYPES={hayd:3,lisz:3,mahl:3,chop:4,rave:5,tcha:2};
const BODY_COLORS={hayd:[.85,.67,.35],lisz:[.26,.73,.64],mahl:[.74,.50,.80]};
const TYPES=['恒星','岩质天体','气态行星','环状行星','行星与卫星','冰晶天体'];
function seedOf(s){let x=2166136261;for(const c of s){x^=c.charCodeAt(0);x=Math.imul(x,16777619);}return(x>>>0)/4294967296;}
export function bodyFor(n){
  const seed=seedOf(n.id),level=LEVEL[n.id]??(.56+seed*.10);
 const type=SUNS[n.id]?0:(BODY_TYPES[n.id]??1+Math.floor(seed*5)),radius=4.8+Math.pow(level,1.4)*18;
 return{type,radius:radius+(n.id==='beet'?2:0),color:SUNS[n.id]||BODY_COLORS[n.id]||COLORS[Math.floor(seed*37)%COLORS.length],seed,tilt:.30+seed*1.13,description:n.id==='beet'?'蓝白恒星':TYPES[type],satellite:type===4||type===3&&seed>.64};
}

export function createCelestialBodies(gl,program,buffer,nodes){
 for(const n of nodes)if(!n.body)n.body=bodyFor(n);
 const instanced=gl.getExtension('ANGLE_instanced_arrays');
 const pointLimit=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
 const vertex=`precision highp float;
 attribute vec3 aPosition;attribute vec3 aCenter;attribute vec3 aColor;attribute vec4 aShape;attribute vec2 aTilt;
 uniform mat4 uMVP;uniform float uTime;uniform mediump float uPass;
 varying vec3 vLocal;varying vec3 vNormal;varying vec3 vWorld;varying vec3 vColor;varying vec3 vInfo;varying vec3 vLight;
 vec3 orient(vec3 p,float tilt,float azimuth){float c=cos(tilt),s=sin(tilt);p.yz=vec2(c*p.y-s*p.z,s*p.y+c*p.z);c=cos(azimuth);s=sin(azimuth);p.xz=vec2(c*p.x-s*p.z,s*p.x+c*p.z);return p;}
 vec3 unorient(vec3 p,float tilt,float azimuth){float c=cos(azimuth),s=sin(azimuth);p.xz=vec2(c*p.x+s*p.z,-s*p.x+c*p.z);c=cos(tilt);s=sin(tilt);p.yz=vec2(c*p.y+s*p.z,-s*p.y+c*p.z);return p;}
 void main(){
  vec3 p=aPosition;vLocal=p;float kind=aShape.y,seed=aShape.z;
  if(uPass<.5&&kind>4.5&&kind<5.5)p*=1.0+.10*sin(p.x*7.0+seed*13.0)*sin(p.y*9.0+p.z*6.0);
  if(kind>6.5)p*=1.4/max(.001,abs(p.x)+abs(p.y)+abs(p.z));
  float rotation=aTilt.y+uTime*(.07+seed*.11);
  if(uPass>2.5)p*=1.065;
  vec3 normal=uPass>.5&&uPass<1.5?vec3(0.0,1.0,0.0):kind>6.5?normalize(sign(p)):normalize(p);
  vLight=unorient(normalize(vec3(-.6,.7,1.0)),aTilt.x,rotation);
  vNormal=orient(normal,aTilt.x,rotation);vWorld=aCenter+orient(p,aTilt.x,rotation)*aShape.x;
  vColor=aColor;vInfo=vec3(kind,seed,aShape.w);gl_Position=uMVP*vec4(vWorld,1.0);
 }`;
 const fragment=`precision highp float;
 uniform vec3 uEye;uniform float uTime;uniform mediump float uPass;
 varying vec3 vLocal;varying vec3 vNormal;varying vec3 vWorld;varying vec3 vColor;varying vec3 vInfo;varying vec3 vLight;
 float field(vec3 p){return sin(p.x*8.0+sin(p.z*6.0))*sin(p.y*7.0-p.z*4.0)*.5+sin(p.x*21.0+p.y*16.0+p.z*11.0)*.18;}
 float grainHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float grain(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(grainHash(i),grainHash(i+vec3(1,0,0)),f.x),mix(grainHash(i+vec3(0,1,0)),grainHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(grainHash(i+vec3(0,0,1)),grainHash(i+vec3(1,0,1)),f.x),mix(grainHash(i+vec3(0,1,1)),grainHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 void main(){
  if(vInfo.z<.01)discard;float type=vInfo.x,seed=vInfo.y;vec3 p=normalize(vLocal),n=normalize(vNormal),view=normalize(uEye-vWorld);
  if(type>5.5&&type<6.5){if(uPass>.5)discard;gl_FragColor=vec4(.0003,.0006,.0012,vInfo.z);return;}
  float light=max(0.0,dot(n,normalize(vec3(-.6,.7,1.0)))),limb=max(0.0,dot(n,view));
  if(uPass>2.5){if(type<1.5||type>4.5)discard;float rim=pow(1.0-abs(dot(n,view)),4.0);vec3 air=mix(vColor,vec3(.32,.65,1.0),.60);gl_FragColor=vec4(air,rim*(.035+.15*light)*vInfo.z);return;}
  if(uPass>1.5){float altitude=length(vLocal)-1.0;float pulse=.42+.58*pow(.5+.5*sin(altitude*14.0+vLocal.x*5.0-uTime*1.4+seed*20.0),3.0);gl_FragColor=vec4(mix(vColor,vec3(1.0,.86,.65),.16),pulse*.62*vInfo.z);return;}
  if(uPass>.5){float r=length(vLocal.xz),stripe=.68+.32*sin(r*34.0+seed*23.0);float alpha=smoothstep(1.40,1.48,r)*(1.0-smoothstep(2.13,2.25,r));if(r>1.76&&r<1.86)alpha*=.18;
   float along=-dot(vLocal,vLight);vec3 ray=vLocal+max(0.0,along)*vLight;float shadow=along>0.0?mix(.18,1.0,smoothstep(.90,1.07,length(ray))):1.0;
   gl_FragColor=vec4(mix(vColor,vec3(.82,.80,.68),.5)*(.32+.68*abs(dot(n,normalize(vec3(-.6,.7,1.0)))))*shadow,alpha*stripe*.78*vInfo.z);return;}
  float f=field(p+seed*3.0);vec3 color=vColor;
  if(type<.5){float cells=grain(p*26.0+vec3(uTime*.025)+seed*7.0),plasma=grain(p*6.0+vec3(0.0,uTime*.055,seed*4.0));color=mix(vColor*.52,mix(vColor,vec3(1.0,.97,.86),.26),smoothstep(.18,.80,cells)*.62+plasma*.25);color*=.57+.43*pow(limb,.35);color+=vColor*pow(plasma,6.0)*.18;}
  else if(type<1.5){float crater=0.0;for(int i=0;i<5;i++){float a=float(i)+seed*17.0;vec3 c=normalize(vec3(sin(a*4.1),cos(a*3.3),sin(a*2.7)));float d=length(p-c);crater+=(1.0-smoothstep(.14,.21,d))*.28-(1.0-smoothstep(.20,.24,d))*smoothstep(.13,.18,d)*.12;}color*=.76+f*.40-crater;}
  else if(type<3.5){float bands=sin(p.y*24.0+f*2.2+seed*8.0);float storm=sin(p.x*8.0+p.z*5.0)*sin(p.y*12.0);color=mix(color*.53,mix(color,vec3(.93,.85,.66),.40),.5+.32*bands+.12*storm);}
  else if(type<4.5){float land=smoothstep(-.12,.10,f);color=mix(vec3(.08,.24,.46),mix(vColor,vec3(.42,.61,.32),.4),land);color=mix(color,vec3(.80,.89,.94),smoothstep(.75,.95,abs(p.y))*.8);}
  else{color=mix(vColor,vec3(.87,.94,1.0),.42+f*.4);light=floor(light*7.0)/7.0;}
  if(type>.5){if(type>2.5&&type<3.5&&abs(vLight.y)>.001){float t=-p.y/vLight.y;float r=length((p+vLight*t).xz);if(t>0.0)light*=1.0-.48*smoothstep(1.39,1.47,r)*(1.0-smoothstep(2.15,2.26,r));}color*=.115+.885*light;float shine=pow(max(0.0,dot(reflect(-normalize(vec3(-.6,.7,1.0)),n),view)),28.0);color+=shine*.13;if(type>3.5&&type<4.5)color=mix(color,vec3(.80,.90,1.0)*(.12+.58*light),smoothstep(.24,.40,field(p*1.9+vec3(uTime*.007,0.0,0.0)))*.48);}
  gl_FragColor=vec4(color,vInfo.z);
 }`;
 const p=program(vertex,fragment),loc={};
 for(const n of['uMVP','uTime','uPass','uEye'])loc[n]=gl.getUniformLocation(p,n);
 const attrs={position:gl.getAttribLocation(p,'aPosition'),center:gl.getAttribLocation(p,'aCenter'),color:gl.getAttribLocation(p,'aColor'),shape:gl.getAttribLocation(p,'aShape'),tilt:gl.getAttribLocation(p,'aTilt')};
 function mesh(kind='sphere'){
  const v=[],idx=[];
  if(kind==='corona'){for(let i=0;i<5;i++)for(let strand=0;strand<2;strand++){const az=i/5*TAU,lat=Math.sin(i*2.7)*.63,base=v.length/3,n=[Math.cos(az)*Math.cos(lat),Math.sin(lat),Math.sin(az)*Math.cos(lat)],tangent=[-Math.sin(az),0,Math.cos(az)];for(let j=0;j<=28;j++){const t=j/28,w=(t-.5)*(.47+strand*.018),r=Math.sqrt(1-w*w)+Math.sin(t*Math.PI)*(.25+.20*(.5+.5*Math.sin(i*1.7))+strand*.014);v.push(...n.map((a,k)=>a*r+tangent[k]*w));if(j)idx.push(base+j-1,base+j);}}}
  else if(kind==='ring'){for(let i=0;i<=80;i++){const a=i/80*TAU;for(const r of[1.40,2.25])v.push(Math.cos(a)*r,0,Math.sin(a)*r);}for(let i=0;i<80;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
  else{for(let y=0;y<=18;y++)for(let x=0;x<=28;x++){const a=x/28*TAU,b=y/18*Math.PI;v.push(Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a));}for(let y=0;y<18;y++)for(let x=0;x<28;x++){const a=y*29+x;idx.push(a,a+29,a+1,a+1,a+29,a+30);}}
  const vertices=buffer(new Float32Array(v)),indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);return{vertices,indices,count:idx.length,primitive:kind==='corona'?gl.LINES:gl.TRIANGLES};
 }
 const sphere=mesh(),ring=mesh('ring'),corona=mesh('corona'),bodies=new Float32Array(nodes.length*2*12),rings=new Float32Array(nodes.length*12),stars=new Float32Array(nodes.length*12),bodyBuffer=buffer(bodies,gl.DYNAMIC_DRAW),ringBuffer=buffer(rings,gl.DYNAMIC_DRAW),coronaBuffer=buffer(stars,gl.DYNAMIC_DRAW);
 const haloProgram=program(`precision highp float;attribute vec3 aCenter;attribute vec3 aColor;attribute vec4 aShape;uniform mat4 uMVP;uniform float uFocal;uniform float uLimit;varying vec3 vColor;varying vec2 vStyle;
 void main(){vec4 clip=uMVP*vec4(aCenter,1.0);gl_Position=clip;gl_PointSize=clamp(aShape.x*(aShape.y<.5?7.0:3.15)*uFocal/max(clip.w,80.0),1.0,uLimit);vColor=aColor;vStyle=vec2(aShape.y,aShape.w);}`,`precision mediump float;varying vec3 vColor;varying vec2 vStyle;
 void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=length(p);if(r>1.0||vStyle.y<.01)discard;float a=0.0;if(vStyle.x<.5){a=exp(-r*r*7.5)*.23+(exp(-abs(p.x)*80.0-abs(p.y)*5.0)+exp(-abs(p.y)*80.0-abs(p.x)*5.0))*.13;}else{a=exp(-pow((r-.635)*22.0,2.0))*.055;}gl_FragColor=vec4(vColor,a*vStyle.y);}`);
 const ha={center:gl.getAttribLocation(haloProgram,'aCenter'),color:gl.getAttribLocation(haloProgram,'aColor'),shape:gl.getAttribLocation(haloProgram,'aShape')},hu={};for(const n of['uMVP','uFocal','uLimit'])hu[n]=gl.getUniformLocation(haloProgram,n);
 const instanceAttrs=[[attrs.center,3,0],[attrs.color,3,12],[attrs.shape,4,24],[attrs.tilt,2,40]];
 function drawMesh(geometry,data,gpu,count,pass){
  if(!count)return;gl.uniform1f(loc.uPass,pass);gl.bindBuffer(gl.ARRAY_BUFFER,geometry.vertices);gl.enableVertexAttribArray(attrs.position);gl.vertexAttribPointer(attrs.position,3,gl.FLOAT,false,12,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,geometry.indices);
  if(instanced){
   gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*12));for(const[a,size,offset]of instanceAttrs){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,48,offset);instanced.vertexAttribDivisorANGLE(a,1);}instanced.drawElementsInstancedANGLE(geometry.primitive,geometry.count,gl.UNSIGNED_SHORT,0,count);
   for(const[a]of instanceAttrs){instanced.vertexAttribDivisorANGLE(a,0);gl.disableVertexAttribArray(a);}
  }else for(let i=0;i<count;i++){const k=i*12;gl.vertexAttrib3f(attrs.center,data[k],data[k+1],data[k+2]);gl.vertexAttrib3f(attrs.color,data[k+3],data[k+4],data[k+5]);gl.vertexAttrib4f(attrs.shape,data[k+6],data[k+7],data[k+8],data[k+9]);gl.vertexAttrib2f(attrs.tilt,data[k+10],data[k+11]);gl.drawElements(geometry.primitive,geometry.count,gl.UNSIGNED_SHORT,0);}
  gl.disableVertexAttribArray(attrs.position);
 }
 let count=0,ringCount=0,starCount=0;
 function draw({matrix,time,eye,focal,opacity,activeId}){
  count=0;ringCount=0;starCount=0;
  for(const n of nodes){if(!n.renderable)continue;const b=n.body,pos=n.worldPosition,selected=n.id===activeId,r=b.radius*(selected?1.10:1),alpha=opacity;
   const record=[...pos,...b.color.map(c=>c*(n.emphasis??1)),r,b.type,b.seed,alpha,b.tilt,b.seed*TAU];bodies.set(record,count++*12);if(b.type===3)rings.set(record,ringCount++*12);if(b.type===0)stars.set(record,starCount++*12);
   if(b.satellite){const angle=time*(.23+b.seed*.12)+b.seed*TAU,orbit=r*3.0,c=Math.cos(b.tilt),s=Math.sin(b.tilt);bodies.set([pos[0]+Math.cos(angle)*orbit,pos[1]+Math.sin(angle)*orbit*s,pos[2]+Math.sin(angle)*orbit*c,.69,.71,.70,r*.23,1,b.seed,alpha,0,angle],count++*12);}
  }
  gl.useProgram(p);gl.uniformMatrix4fv(loc.uMVP,false,matrix);gl.uniform1f(loc.uTime,time);gl.uniform3fv(loc.uEye,eye);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);
  drawMesh(sphere,bodies,bodyBuffer,count,0);gl.depthMask(false);drawMesh(ring,rings,ringBuffer,ringCount,1);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);drawMesh(corona,stars,coronaBuffer,starCount,2);drawMesh(sphere,bodies,bodyBuffer,count,3);
  gl.disable(gl.DEPTH_TEST);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(haloProgram);gl.uniformMatrix4fv(hu.uMVP,false,matrix);gl.uniform1f(hu.uFocal,focal);gl.uniform1f(hu.uLimit,pointLimit);gl.bindBuffer(gl.ARRAY_BUFFER,bodyBuffer);
  // The fallback also needs the packed centers for the inexpensive light halos.
  if(!instanced)gl.bufferSubData(gl.ARRAY_BUFFER,0,bodies.subarray(0,count*12));
  for(const[a,size,offset]of[[ha.center,3,0],[ha.color,3,12],[ha.shape,4,24]]){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,48,offset);}gl.drawArrays(gl.POINTS,0,count);for(const a of Object.values(ha))gl.disableVertexAttribArray(a);gl.depthMask(true);
 }
 return{draw,getState:()=>({instances:count,rings:ringCount,coronae:starCount,instanced:!!instanced}),destroy(){for(const g of[sphere,ring,corona]){gl.deleteBuffer(g.vertices);gl.deleteBuffer(g.indices);}for(const b of[bodyBuffer,ringBuffer,coronaBuffer])gl.deleteBuffer(b);gl.deleteProgram(p);gl.deleteProgram(haloProgram);}};
}

function createSpaceEnvironment(gl,program,buffer){
 const quad=buffer(new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1])),vertex='attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.0,1.0);}';
 const sky=program(vertex,`precision highp float;varying vec2 vUV;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uBack;uniform vec3 uEye;uniform float uTime;uniform float uAspect;uniform float uCenter;
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 p){float f=0.0,a=.55;for(int i=0;i<4;i++){f+=a*noise(p);p=p.yzx*2.07+vec3(13.1,7.7,4.3);a*=.48;}return f;}
 void main(){vec2 q=vUV*2.0-1.0;q.x-=uCenter;q.y+=.015;vec3 ray=normalize(uRight*q.x*uAspect*.383864+uUp*q.y*.383864-uBack);
  vec3 p=ray*4.8+uEye*.000045+vec3(uTime*.003,0.0,uTime*.0016),warp=vec3(noise(p*.74+8.0),noise(p*.74+24.0),noise(p*.74+47.0));
  float broad=fbm(p*1.3+warp*.8),detail=fbm(p*7.2+warp*2.1),cuts=smoothstep(.39,.68,fbm(p*4.3+warp*3.0));
  vec2 field=vec2(dot(ray,vec3(.62161,0.0,.783327)),dot(ray,vec3(.3266,.90897,-.2590)));
  float veil=exp(-pow((field.y-.22-.13*sin(field.x*3.7+.5)+.12*(broad-.5))/.17,2.0));
  float lower=exp(-dot((field-vec2(.49,-.32))/vec2(.43,.25),(field-vec2(.49,-.32))/vec2(.43,.25)));
  float cloud=(.07+veil*.94+lower*.47)*(.25+.85*smoothstep(.23,.78,broad))*pow(.35+detail*.90,1.8)*(1.0-cuts*.63);
  float hue=clamp(.60+field.x*.34+field.y*.28+(warp.x-.5)*.25,0.0,1.0);vec3 color=vec3(.004,.009,.021)+mix(vec3(.100,.048,.137),vec3(.043,.105,.168),hue)*cloud;
  color+=vec3(.057,.034,.026)*pow(max(0.0,detail-.49)*3.0,2.0)*veil*.35;gl_FragColor=vec4(color,1.0);
 }`);
 const copy=program(vertex,'precision mediump float;varying vec2 vUV;uniform sampler2D uImage;void main(){gl_FragColor=texture2D(uImage,vUV);}'),pos=gl.getAttribLocation(sky,'aPosition'),copyPos=gl.getAttribLocation(copy,'aPosition'),imageLoc=gl.getUniformLocation(copy,'uImage'),u={};
 for(const n of['uRight','uUp','uBack','uEye','uTime','uAspect','uCenter'])u[n]=gl.getUniformLocation(sky,n);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const target=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
 let skyW=0,skyH=0,lastTime=-Infinity,lastView=[];
 function rect(location){gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,8,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(location);}
 return{draw({time,basis,eye,width,height,target:sceneTarget,center}){const w=Math.ceil(width/4),h=Math.ceil(height/4),view=[...basis.right,...basis.up,...eye,center];gl.disable(gl.BLEND);gl.activeTexture(gl.TEXTURE0);
  if(w!==skyW||h!==skyH){skyW=w;skyH=h;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);lastTime=-Infinity;}
  if(Math.abs(time-lastTime)>.10||view.some((v,i)=>Math.abs(v-(lastView[i]??Infinity))>.0001)){gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.viewport(0,0,w,h);gl.useProgram(sky);for(const k of['Right','Up','Back'])gl.uniform3fv(u['u'+k],basis[k.toLowerCase()]);gl.uniform3fv(u.uEye,eye);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uAspect,width/height);gl.uniform1f(u.uCenter,center);rect(pos);lastTime=time;lastView=view;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,sceneTarget);gl.viewport(0,0,width,height);gl.useProgram(copy);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(imageLoc,0);rect(copyPos);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 },destroy(){gl.deleteBuffer(quad);gl.deleteTexture(texture);gl.deleteFramebuffer(target);gl.deleteProgram(sky);gl.deleteProgram(copy);}};
}

export function createDeepSky(gl,program,buffer){
 const environment=createSpaceEnvironment(gl,program,buffer),landmarks=createSkyLandmarks(gl,program,buffer);
 const data=[];for(let i=0;i<3600;i++){const u=seedOf('sky'+i),v=seedOf('depth'+i),az=i*2.3999632297,z=2*u-1,r=2800+v*750,s=Math.sqrt(1-z*z);data.push(Math.cos(az)*s*r,z*r,Math.sin(az)*s*r,.66+v*.34,.78+u*.18,1-v*.20,1.0+Math.pow(v,7)*3.2,.24+v*.52);}
 const mist=[];
 for(let galaxy=0;galaxy<2;galaxy++)for(let i=0;i<180;i++){const t=i/179,a=t*12.5+galaxy,rad=35+t*210,x=Math.cos(a)*rad,y=Math.sin(a)*rad*.24;
  mist.push((galaxy?1550:-1850)+x,(galaxy?800:-550)+y+x*.32,-2050+Math.sin(a)*rad*.32,.42,.43,.56,12+t*13,.042*(1-t*.7));
 }
 const mistGPU=buffer(new Float32Array(mist));
 const gpu=buffer(new Float32Array(data)),p=program('attribute vec3 aPosition;attribute vec3 aColor;attribute vec2 aStyle;uniform mat4 uMVP;uniform float uDPR;uniform float uTime;uniform float uDim;varying vec3 vColor;varying float vAlpha;void main(){gl_Position=uMVP*vec4(aPosition,1.0);gl_PointSize=aStyle.x*uDPR;vColor=aColor;vAlpha=aStyle.y*uDim*(.86+.14*sin(uTime*.75+aPosition.x*.027+aPosition.y*.019));}','precision mediump float;uniform float uDim;varying vec3 vColor;varying float vAlpha;void main(){vec2 q=gl_PointCoord*2.0-1.0;float r=dot(q,q);if(r>1.0)discard;gl_FragColor=vec4(vColor,exp(-r*3.4)*vAlpha);}');
 const mvp=gl.getUniformLocation(p,'uMVP'),dprLoc=gl.getUniformLocation(p,'uDPR'),timeLoc=gl.getUniformLocation(p,'uTime'),dimLoc=gl.getUniformLocation(p,'uDim'),attrs=[['aPosition',3,0],['aColor',3,12],['aStyle',2,24]].map(([name,size,offset])=>[gl.getAttribLocation(p,name),size,offset]);
 return{draw(args){const{matrix,dpr,time}=args;environment.draw(args);gl.useProgram(p);gl.uniformMatrix4fv(mvp,false,matrix);gl.uniform1f(dprLoc,dpr);gl.uniform1f(timeLoc,time);gl.uniform1f(dimLoc,args.dim??1);
  for(const[b,count]of[[gpu,data.length/8],[mistGPU,mist.length/8]]){gl.bindBuffer(gl.ARRAY_BUFFER,b);for(const[a,size,offset]of attrs){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,32,offset);}gl.drawArrays(gl.POINTS,0,count);}
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE);for(const[a]of attrs)gl.disableVertexAttribArray(a);
  landmarks.draw(args);
 },getState:()=>landmarks.getState(),destroy(){environment.destroy();landmarks.destroy();for(const b of[gpu,mistGPU])gl.deleteBuffer(b);gl.deleteProgram(p);}};
}

export function createMeteors(gl,program,buffer){
 const p=program('attribute vec3 aPosition;attribute vec4 aColor;uniform mat4 uMVP;varying vec4 vColor;void main(){gl_Position=uMVP*vec4(aPosition,1.0);vColor=aColor;}','precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vColor;}');
 const pos=gl.getAttribLocation(p,'aPosition'),col=gl.getAttribLocation(p,'aColor'),mvp=gl.getUniformLocation(p,'uMVP'),data=new Float32Array(10*28*2*7),gpu=buffer(data,gl.DYNAMIC_DRAW);
 let events=[],next=5+Math.random()*5,showers=0,activeCount=0;
 function reset(){events=[];activeCount=0;next=5+Math.random()*5;}
 function spawn(time,basis,target){
  const amount=2+Math.floor(Math.random()*4),r=basis.right,u=basis.up,z=basis.back,scale=Math.max(.15,(basis.distance||1400)/1400);
  for(let i=0;i<amount;i++){const x=(240+Math.random()*140)*scale,y=(180+Math.random()*230)*scale,depth=(80+Math.random()*180)*scale,speed=(390+Math.random()*190)*scale;
   events.push({start:time+i*.16,life:1.8+Math.random()*.8,origin:target.map((v,k)=>v+r[k]*x+u[k]*y+z[k]*depth),velocity:r.map((v,k)=>-v*speed-u[k]*(130+Math.random()*25)*scale-z[k]*55*scale),color:Math.random()>.45?[.65,.84,1]:[1,.76,.40]});}
  showers++;next=time+20+Math.random()*25;
 }
 function draw(matrix,time,basis,target){
  if(time>=next)spawn(time,basis,target);events=events.filter(e=>time-e.start<e.life);let offset=0;activeCount=0;
  for(const e of events){const age=time-e.start;if(age<0)continue;activeCount++;const fade=Math.min(1,age*6,(e.life-age)*3);
   for(let j=0;j<28;j++)for(const q of[j/28,(j+1)/28]){const t=Math.max(0,age-q*.33),point=e.origin.map((v,k)=>v+e.velocity[k]*t);data.set([...point,...e.color,Math.pow(1-q,2)*fade*.88],offset);offset+=7;}
  }
  if(!offset)return;gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(p);gl.uniformMatrix4fv(mvp,false,matrix);gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,offset));gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(col);gl.vertexAttribPointer(col,4,gl.FLOAT,false,28,12);gl.drawArrays(gl.LINES,0,offset/7);gl.disableVertexAttribArray(pos);gl.disableVertexAttribArray(col);gl.disable(gl.DEPTH_TEST);gl.depthMask(true);
 }
 return{draw,reset,getState:()=>({showers,active:activeCount,nextAt:next}),destroy(){gl.deleteBuffer(gpu);gl.deleteProgram(p);}};
}
