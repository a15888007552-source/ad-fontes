/* Relationship edges use two visual dimensions: relation taxonomy (colour and
   geometry) and evidence status (opacity and dash syntax). */
import {FLOW_GLSL} from './stellar-volumes.js?v=20260911-epochs2';
import {RELATION_STYLE,EVIDENCE_STATUS} from './relation-styles.js?v=20260911-relations3';

export function createRelationshipLines(gl,program,buffer){
 const p=program(`precision highp float;
 attribute vec3 aPosition;attribute vec3 aNext;attribute vec4 aColor;attribute vec4 aPattern;attribute vec2 aStyle;
 uniform mat4 uMVP;uniform vec2 uViewport;uniform float uDPR;uniform float uOpacity;
 ${FLOW_GLSL}
 varying vec3 vColor;varying vec4 vPattern;varying vec3 vStyle;
 void main(){
  vec4 clip=uMVP*vec4(flow(aPosition),1.0),next=uMVP*vec4(flow(aNext),1.0);
  vec2 delta=(next.xy/max(next.w,1.0)-clip.xy/max(clip.w,1.0))*uViewport;
  vec2 direction=delta/max(length(delta),.0001),normal=vec2(-direction.y,direction.x);
  float t=aPattern.x,kind=aPattern.z,strand=aPattern.w,offset=0.0;
  if(kind>.5&&kind<1.5)offset=sin(t*37.7-uTime*.8+aStyle.x)*1.8;
  else if(kind>2.5&&kind<3.5)offset=strand*2.8;
  else if(kind>3.5&&kind<4.5)offset=strand*sin(t*31.416+aStyle.x+uTime*.20)*4.0;
  else if(kind>4.5&&kind<5.5)offset=(abs(fract(t*19.0+aStyle.x)*2.0-1.0)-.5)*5.8;
  else if(kind>5.5)offset=sin(t*18.0+aStyle.x)*1.1;
  clip.xy+=normal*(offset+aPattern.y*4.2)*uDPR*2.0/uViewport*clip.w;
  gl_Position=clip;vColor=aColor.rgb;vPattern=aPattern;vStyle=vec3(aStyle.x,aStyle.y,aColor.a*uOpacity);
 }`,`precision highp float;uniform float uTime;varying vec3 vColor;varying vec4 vPattern;varying vec3 vStyle;
 void main(){
  float t=vPattern.x,across=abs(vPattern.y),kind=vPattern.z,phase=vStyle.x,evidence=vStyle.y;
  float core=exp(-across*across*24.0),under=(1.0-smoothstep(.55,.94,across))*.48;
  float pattern=.75,hot=0.0;
  if(kind<.5){float q=fract(t*3.0-uTime*.33+phase);hot=pow(max(0.0,1.0-abs(q-.72)*10.0),2.0);pattern=.82+hot*.28;}
  else if(kind<1.5){float q=fract(t*12.0-uTime*.58+phase);pattern=smoothstep(.08,.19,q)*(1.0-smoothstep(.67,.81,q));hot=pow(max(0.0,sin(t*25.13-uTime*2.1+phase)),12.0);}
  else if(kind<2.5){float q=fract(t*3.0-uTime*.28+phase);hot=pow(max(0.0,1.0-abs(q-.72)*10.0),2.0);pattern=.72+hot*.22;}
  else if(kind<3.5){float q=fract(uTime*.16+phase);if(vPattern.w<0.0)q=1.0-q;hot=exp(-pow((t-q)*34.0,2.0));pattern=.68;}
  else if(kind<4.5){hot=pow(.5+.5*cos(t*62.832+phase*2.0+uTime*.40),10.0)*.28;pattern=.76;}
  else if(kind<5.5){float q=fract(uTime*.19+phase);hot=exp(-pow((t-q)*35.0,2.0))+exp(-pow((t-(1.0-q))*35.0,2.0));pattern=.78;}
  else{hot=pow(.5+.5*cos(t*50.0+phase),12.0)*.18;pattern=.54;}
  if(evidence>1.5&&evidence<2.5&&fract(t*10.0)>.58)discard;
  if(evidence>2.5){float segment=fract(t*12.0);if(segment>.14&&segment<.76)discard;}
  float body=core*(pattern+hot*.7),alpha=max(body,under*(.42+.58*pattern));
  if(alpha*vStyle.z<.008)discard;
  vec3 ink=mix(vec3(.001,.003,.007),vColor*.64,min(1.0,body/max(alpha,.001)));ink+=vColor*hot*core*.12;
  gl_FragColor=vec4(ink,min(.98,alpha*vStyle.z));
 }`);
 const names=[['aPosition',3,0],['aNext',3,12],['aColor',4,24],['aPattern',4,40],['aStyle',2,56]],attrs=names.map(([n,size,offset])=>[gl.getAttribLocation(p,n),size,offset]);
 const uniforms={};for(const n of['uMVP','uViewport','uDPR','uOpacity','uTime','uMode'])uniforms[n]=gl.getUniformLocation(p,n);
 const gpu=buffer(new Float32Array(0),gl.DYNAMIC_DRAW);let count=0,visible=0,activeCategory=null,lastKey=null;
 function point(l,t){const s=1-t;return l.source.position.map((v,k)=>s*s*v+2*s*t*l.control[k]+t*t*l.target.position[k]);}
 function update(links,{active,categories,category,chosen,revision}={}){
  const selectedCategories=categories instanceof Set?categories:new Set(categories||(category?[category]:[]));
  const key=[active,[...selectedCategories].sort().join(','),chosen,revision].join('|');if(lastKey===key)return;lastKey=key;
  const data=[];visible=0;activeCategory=[...selectedCategories];
  if(!active&&!selectedCategories.size){count=0;gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(0),gl.DYNAMIC_DRAW);return;}
  for(const l of links){
   if(selectedCategories.size&&!selectedCategories.has(l.cat))continue;
   const related=!active||l.source.id===active||l.target.id===active;
   const style=RELATION_STYLE[l.cat]||RELATION_STYLE['待核'],kind=style.kind,h=parseInt(style.color.slice(1),16),color=[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
   const evidenceOpacity=EVIDENCE_STATUS[l.evidence]?.opacity??.55,alpha=(chosen===l.index?1:active?(related?.95:.035):.28)*evidenceOpacity,phase=l.index*.381966;
   const strands=kind>=3&&kind<5?[-1,1]:[0],steps=kind===1?114:kind===6?80:96;visible++;
   for(const strand of strands)for(let i=0;i<steps;i++)for(const[step,side]of[[i,-1],[i,1],[i+1,1],[i,-1],[i+1,1],[i+1,-1]]){
    const t=step/steps,pos=point(l,t),next=point(l,t+.001);data.push(...pos,...next,...color,alpha,t,side,kind,strand,phase,l.evidenceCode??2);
   }
  }
  count=data.length/16;gl.bindBuffer(gl.ARRAY_BUFFER,gpu);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
 }
 function draw(matrix,time,mode,width,height,dpr,opacity){
  if(!count)return;gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,gpu);
  for(const[a,size,offset]of attrs){if(a<0)continue;gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,64,offset);}
  gl.uniformMatrix4fv(uniforms.uMVP,false,matrix);gl.uniform2f(uniforms.uViewport,width,height);gl.uniform1f(uniforms.uDPR,dpr);gl.uniform1f(uniforms.uOpacity,opacity);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uMode,mode);gl.drawArrays(gl.TRIANGLES,0,count);
  for(const[a]of attrs)if(a>=0)gl.disableVertexAttribArray(a);gl.disable(gl.DEPTH_TEST);gl.depthMask(true);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 }
 return{update,draw,getState:()=>({visible,vertices:count,category:activeCategory}),destroy(){gl.deleteBuffer(gpu);gl.deleteProgram(p);}};
}
