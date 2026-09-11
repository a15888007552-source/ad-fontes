/* Non-interactive distant scenery. Each object has a fixed spatial placement
   within an era view, so camera movement reveals depth rather than a flat card. */
const TAU=Math.PI*2;
export function createSkyLandmarks(gl,program,buffer){
 let seed=304983;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},normal=()=>Math.sqrt(-2*Math.log(Math.max(.00001,random())))*Math.cos(TAU*random());
 const stars=[];
 for(let i=0;i<5800;i++){const r=Math.min(1.18,-Math.log(Math.max(.001,random()))*.27),a=random()*TAU,x=Math.cos(a)*r,z=Math.sin(a)*r,y=normal()*(.025+.018*r),edge=Math.pow(Math.max(0,1-r/1.18),.5),lane=z>0&&Math.abs(y+z*.26)<.022?.20:1;
  const cool=Math.min(1,r*1.1);stars.push(x,y,z,.82-cool*.32,.70-cool*.10,.53+cool*.20,.6+Math.pow(random(),3)*2.3,(.08+random()*.15)*edge*lane);
 }
 for(let i=0;i<1500;i++)stars.push(normal()*.16,normal()*.075,normal()*.14,.81,.73,.62,.7+random()*1.7,.10+random()*.14);
 for(let i=0;i<360;i++){const r=random(),a=random()*TAU;stars.push(Math.cos(a)*r,normal()*.026,Math.sin(a)*r,.54,.50,.43,36+random()*48,.018*(1-r*.72));}
 stars.push(0,0,0,.91,.83,.68,18,.35);
 const galaxyGPU=buffer(new Float32Array(stars)),pointLimit=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
 const galaxyProgram=program(`precision highp float;attribute vec3 aPosition;attribute vec3 aColor;attribute vec2 aStyle;uniform mat4 uMVP;uniform vec3 uOrigin;uniform vec3 uU;uniform vec3 uV;uniform vec3 uBack;uniform float uRadius;uniform float uTime;uniform float uDPR;uniform float uLimit;varying vec3 vColor;varying float vAlpha;
 void main(){float a=uTime*.012,c=cos(a),s=sin(a);vec3 p=aPosition;p.xz=vec2(c*p.x-s*p.z,s*p.x+c*p.z);vec3 world=uOrigin+(uU*p.x+uV*(p.y+p.z*.18)+uBack*p.z*.984)*uRadius;vec4 clip=uMVP*vec4(world,1.0);gl_Position=clip;gl_PointSize=clamp(aStyle.x*uDPR*3300.0/max(clip.w,150.0),1.0,uLimit);vColor=aColor;vAlpha=aStyle.y;}`,
 'precision mediump float;varying vec3 vColor;varying float vAlpha;void main(){vec2 q=gl_PointCoord*2.0-1.0;float r=dot(q,q);if(r>1.0)discard;gl_FragColor=vec4(vColor,vAlpha*exp(-r*5.2));}');
 const ga=[['aPosition',3,0],['aColor',3,12],['aStyle',2,24]].map(([n,s,o])=>[gl.getAttribLocation(galaxyProgram,n),s,o]),gu={};
 for(const n of['uMVP','uOrigin','uU','uV','uBack','uRadius','uTime','uDPR','uLimit'])gu[n]=gl.getUniformLocation(galaxyProgram,n);
 const vertices=[],indices=[],segments=80,rows=48;
 for(let y=0;y<=rows;y++)for(let x=0;x<=segments;x++){const a=x/segments*TAU,b=y/rows*Math.PI;vertices.push(Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a));}
 for(let y=0;y<rows;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x;indices.push(a,a+1,a+segments+1,a+1,a+segments+2,a+segments+1);}
 const sphere=buffer(new Float32Array(vertices)),index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const planetProgram=program(`precision highp float;attribute vec3 aPosition;uniform mat4 uMVP;uniform vec3 uOrigin;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uBack;uniform float uRadius;uniform float uTime;uniform float uPass;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vWorld;
 void main(){vec3 p=aPosition;vLocal=p;float a=uTime*.026,c=cos(a),s=sin(a);p.xz=vec2(c*p.x-s*p.z,s*p.x+c*p.z);vNormal=uRight*p.x+uUp*p.y+uBack*p.z;vWorld=uOrigin+vNormal*uRadius*(uPass>.5?1.014:1.0);gl_Position=uMVP*vec4(vWorld,1.0);}`,
 `precision highp float;uniform vec3 uEye;uniform vec3 uLight;uniform float uTime;uniform float uPass;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vWorld;
 void main(){vec3 n=normalize(vNormal),view=normalize(uEye-vWorld),p=normalize(vLocal);float light=max(0.0,dot(n,uLight)),limb=max(0.0,dot(n,view)),rim=pow(1.0-limb,4.0);
  if(uPass>.5){gl_FragColor=vec4(.12,.35,.54,rim*sqrt(light)*.12);return;}
  float swirl=sin(p.x*7.0+p.z*6.0-uTime*.034)*sin(p.y*11.0+p.z*3.0),bands=sin(p.y*32.0+swirl*1.5),fine=sin(p.y*96.0+swirl*3.0)*.10;
  vec3 color=mix(vec3(.022,.047,.074),vec3(.055,.099,.128),.50+bands*.27+fine+swirl*.09);color*=.035+.78*light;color+=vec3(.018,.095,.200)*rim*sqrt(light);gl_FragColor=vec4(color,1.0);
 }`);
 const pp=gl.getAttribLocation(planetProgram,'aPosition'),pu={};for(const n of['uMVP','uOrigin','uRight','uUp','uBack','uRadius','uTime','uPass','uEye','uLight'])pu[n]=gl.getUniformLocation(planetProgram,n);
 let layoutKey='',frame=null,galaxyFrame=null,galaxyOrigin=[0,0,0],galaxyRadius=1,planetOrigin=[0,0,0],planetRadius=1,light=[0,1,0];
 function place(args){const{width,height,dpr,center,profile,profileKey}=args,key=[width,height,dpr,center,profileKey].join('|');if(key===layoutKey)return;layoutKey=key;
  const sy=Math.sin(profile.yaw),cy=Math.cos(profile.yaw),sp=Math.sin(profile.pitch),cp=Math.cos(profile.pitch),right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp],back=[sy*cp,sp,cy*cp];frame={right,up,back};
  const focal=height/(2*Math.tan(21*Math.PI/180)),distance=(profile.home||profile.distance)*Math.max(1,1350/(width/dpr)),target=profile.target||[0,10,0];
  const at=(x,y,depth)=>target.map((v,k)=>v+back[k]*(distance-depth)+right[k]*(x-width*(.5+center*.5))*depth/focal+up[k]*(height*.4925-y)*depth/focal);
  galaxyOrigin=at(width*.49,height*.225,3300);galaxyRadius=width*.14*3300/focal;
  const unit=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],gb=unit(target.map((v,k)=>v+back[k]*distance-galaxyOrigin[k])),gr=unit(cross(up,gb));galaxyFrame={right:gr,up:cross(gb,gr),back:gb};
  planetOrigin=at(width*1.025,height*1.03,3100);planetRadius=height*.36*3100/focal;
  light=right.map((v,k)=>-v*.79+up[k]*.57-back[k]*.25);const length=Math.hypot(...light);light=light.map(v=>v/length);
 }
 function draw(args){place(args);const{matrix,time,dpr,eye}=args;gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.useProgram(galaxyProgram);gl.uniformMatrix4fv(gu.uMVP,false,matrix);gl.uniform3fv(gu.uOrigin,galaxyOrigin);const angle=.32,u=galaxyFrame.right.map((v,k)=>v*Math.cos(angle)+galaxyFrame.up[k]*Math.sin(angle)),v=galaxyFrame.up.map((v,k)=>v*Math.cos(angle)-galaxyFrame.right[k]*Math.sin(angle));gl.uniform3fv(gu.uU,u);gl.uniform3fv(gu.uV,v);gl.uniform3fv(gu.uBack,galaxyFrame.back);gl.uniform1f(gu.uRadius,galaxyRadius);gl.uniform1f(gu.uTime,time);gl.uniform1f(gu.uDPR,dpr);gl.uniform1f(gu.uLimit,pointLimit);gl.bindBuffer(gl.ARRAY_BUFFER,galaxyGPU);for(const[a,s,o]of ga){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,s,gl.FLOAT,false,32,o);}gl.drawArrays(gl.POINTS,0,stars.length/8);for(const[a]of ga)gl.disableVertexAttribArray(a);
  gl.useProgram(planetProgram);gl.uniformMatrix4fv(pu.uMVP,false,matrix);gl.uniform3fv(pu.uOrigin,planetOrigin);for(const k of['Right','Up','Back'])gl.uniform3fv(pu['u'+k],frame[k.toLowerCase()]);gl.uniform3fv(pu.uEye,eye);gl.uniform3fv(pu.uLight,light);gl.uniform1f(pu.uRadius,planetRadius);gl.uniform1f(pu.uTime,time);gl.bindBuffer(gl.ARRAY_BUFFER,sphere);gl.enableVertexAttribArray(pp);gl.vertexAttribPointer(pp,3,gl.FLOAT,false,12,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1f(pu.uPass,0);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.uniform1f(pu.uPass,1);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);gl.disableVertexAttribArray(pp);gl.disable(gl.CULL_FACE);gl.depthMask(true);
 }
 return{draw,getState:()=>({galaxyStars:stars.length/8,planetTriangles:indices.length/3,galaxyOrigin,planetOrigin}),destroy(){for(const b of[galaxyGPU,sphere,index])gl.deleteBuffer(b);gl.deleteProgram(galaxyProgram);gl.deleteProgram(planetProgram);}};
}
