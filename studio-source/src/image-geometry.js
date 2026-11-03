import * as THREE from 'three';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {solidEngine,geometryFromSolid} from './solid-union.js';

const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2;
function simplify(points,tolerance){
 const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)};
 function open(p){if(p.length<3)return p;let at=0,max=tolerance;for(let i=1;i<p.length-1;i++){const d=distance(p[i],p[0],p[p.length-1]);if(d>max){max=d;at=i}}return at?[...open(p.slice(0,at+1)).slice(0,-1),...open(p.slice(at))]:[p[0],p[p.length-1]]}
 let far=1;for(let i=2;i<points.length;i++)if(Math.hypot(...points[i].map((v,j)=>v-points[0][j]))>Math.hypot(...points[far].map((v,j)=>v-points[0][j])))far=i;
 return [...open(points.slice(0,far+1)).slice(0,-1),...open([...points.slice(far),points[0]]).slice(0,-1)];
}
// Smooth the sampled contour before simplification, keeping its winding and holes.
function smoothContour(points,passes){
 let p=points;
 for(let k=0;k<passes;k++){
  const next=[];
  for(let i=0;i<p.length;i++){
   const a=p[i],b=p[(i+1)%p.length];
   next.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]],[.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]]);
  }
  p=next;
 }
 return p;
}
export function tracePixels(data,w,h,{mode='auto',threshold=160,invert=false,minArea=8,tolerance=.65,smoothing=0}={}){
 const count=w*h;if(w<1||h<1||w>2048||h>2048||data.length!==count*4)throw Error('Saiz imej tidak sah.');
 let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<250)transparent++;
 const useAlpha=mode==='alpha'||mode==='auto'&&transparent>count*.01,mask=new Uint8Array(count),visited=new Uint8Array(count),queue=new Int32Array(count);
 for(let i=0;i<count;i++){const j=i*4,luma=.2126*data[j]+.7152*data[j+1]+.0722*data[j+2],on=useAlpha?data[j+3]>=128:data[j+3]>=128&&(invert?luma>=threshold:luma<=threshold);mask[i]=on?1:0}
 for(let i=0;i<count;i++){if(!mask[i]||visited[i])continue;let end=1;queue[0]=i;visited[i]=1;for(let pos=0;pos<end;pos++){const p=queue[pos],x=p%w,y=Math.floor(p/w);for(const q of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(q>=0&&mask[q]&&!visited[q]){visited[q]=1;queue[end++]=q}}if(end<minArea)for(let j=0;j<end;j++)mask[queue[j]]=0}
 const edges=[],out=new Map(),key=(x,y)=>y*(w+1)+x;
 function edge(x,y,xx,yy,dir){const a=key(x,y),b=key(xx,yy),id=edges.length;edges.push({a,b,dir,used:false});if(!out.has(a))out.set(a,[]);out.get(a).push(id)}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!mask[y*w+x])continue;if(!y||!mask[(y-1)*w+x])edge(x,y,x+1,y,0);if(x===w-1||!mask[y*w+x+1])edge(x+1,y,x+1,y+1,1);if(y===h-1||!mask[(y+1)*w+x])edge(x+1,y+1,x,y+1,2);if(!x||!mask[y*w+x-1])edge(x,y+1,x,y,3)}
 if(!edges.length)throw Error('Tiada siluet ditemui. Tukar kaedah latar atau ambang.');if(edges.length>90000)throw Error('Imej terlalu rumit. Kurangkan resolusi atau buang butiran kecil.');
 const loops=[];for(let start=0;start<edges.length;start++){if(edges[start].used)continue;let id=start;const points=[];for(let n=0;n<=edges.length;n++){const e=edges[id];if(e.used)throw Error('Kontur imej tidak dapat ditutup.');e.used=true;points.push([e.a%(w+1),-Math.floor(e.a/(w+1))]);if(e.b===edges[start].a)break;const next=(out.get(e.b)||[]).filter(i=>!edges[i].used).sort((a,b)=>[1,0,3,2].indexOf((edges[a].dir-e.dir+4)%4)-[1,0,3,2].indexOf((edges[b].dir-e.dir+4)%4));if(!next.length)throw Error('Kontur imej terputus.');id=next[0]}
  const passes=Math.max(0,Math.min(3,Math.round(smoothing)));const reduced=simplify(passes?smoothContour(simplify(points,.3),passes):points,passes?Math.min(tolerance,.65):tolerance);if(reduced.length>=3&&Math.abs(area(reduced))>.1)loops.push(reduced);if(loops.length>512)throw Error('Terlalu banyak bahagian kecil. Naikkan tapisan butiran kecil.')}
 return normalise(loops.map(p=>p.reverse()));
}
function normalise(loops){if(!loops.length)throw Error('Tiada bentuk berisi ditemui.');let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of loops.flat()){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1])}const w=maxX-minX,h=maxY-minY;if(w<=0||h<=0)throw Error('Bentuk tiada keluasan.');return{contours:loops.map(loop=>loop.map(([x,y])=>[(x-(minX+maxX)/2)/w,(y-(minY+maxY)/2)/h])),aspect:h/w,bounds:{minX,maxX,minY,maxY}}}
export function traceSVG(text,ignoreWhite=true){
 if(text.length>4*1024*1024)throw Error('SVG melebihi 4 MB.');const parsed=new SVGLoader().parse(text),loops=[];
 for(const path of parsed.paths){const style=path.userData?.style;if(style?.fill==='none'||Number(style?.fillOpacity)===0||Number(style?.opacity)===0)continue;const c=path.color;if(ignoreWhite&&c&&c.r>.98&&c.g>.98&&c.b>.98)continue;
  for(const shape of SVGLoader.createShapes(path)){const outer=shape.getPoints(64).map(p=>[p.x,-p.y]);if(area(outer)<0)outer.reverse();loops.push(outer);for(const hole of shape.holes){const p=hole.getPoints(64).map(p=>[p.x,-p.y]);if(area(p)>0)p.reverse();loops.push(p)}}}
 if(loops.reduce((s,p)=>s+p.length,0)>30000)throw Error('SVG terlalu rumit. Ringkaskan laluan dahulu.');return normalise(loops);
}
function capsule(a,b,width){const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),s=new THREE.Shape();s.absarc(b[0],b[1],width/2,angle-Math.PI/2,angle+Math.PI/2,false);s.absarc(a[0],a[1],width/2,angle+Math.PI/2,angle+Math.PI*1.5,false);s.closePath();return s.getPoints(24).map(p=>[p.x,p.y])}
export async function importedGeometry(spec){
 const {width,height,depth,tailLength,tailWidth,bridgeWidth,contours}=spec;if(![width,height,depth,tailLength,tailWidth,bridgeWidth].every(Number.isFinite)||width<1||width>220||height<1||height>220||depth<.6||depth>10||tailLength<20||tailLength>200||tailWidth<5||tailWidth>40||bridgeWidth<1||bridgeWidth>8)throw Error('Ukuran import tidak sah.');
 if(!Array.isArray(contours)||!contours.length||contours.length>512||contours.reduce((s,p)=>s+p.length,0)>30000||contours.some(p=>p.length<3||p.some(q=>q.length!==2||!q.every(v=>Number.isFinite(v)&&Math.abs(v)<=.501))))throw Error('Kontur import tidak sah.');
 const api=await solidEngine(),polys=contours.filter(p=>!spec.fillHoles||area(p)>0).map(p=>p.map(([x,y])=>[x*width,y*height])),owned=[];const own=o=>(owned.push(o),o);let section=own(new api.CrossSection(polys,'NonZero'));
 if(spec.output==='bookmark'){const overlap=Math.min(height*.3,10),top=-height/2+overlap,bot=top-tailLength,r=Math.min(tailWidth/2,3),s=new THREE.Shape();s.moveTo(-tailWidth/2+r,bot);s.lineTo(tailWidth/2-r,bot);s.quadraticCurveTo(tailWidth/2,bot,tailWidth/2,bot+r);s.lineTo(tailWidth/2,top);s.lineTo(-tailWidth/2,top);s.lineTo(-tailWidth/2,bot+r);s.quadraticCurveTo(-tailWidth/2,bot,-tailWidth/2+r,bot);s.closePath();const tail=own(new api.CrossSection([s.getPoints(32).map(p=>[p.x,p.y])],'NonZero'));section=own(section.add(tail))}
 let solid;try{section=own(section.simplify(.025));solid=section.extrude(depth);let parts=solid.decompose();const componentCount=parts.length;let bridges=0;
  try{if(componentCount>24)throw Error('Logo mempunyai lebih 24 bahagian. Naikkan tapisan butiran kecil.');if(spec.connect&&parts.length>1){
   const points=parts.map(p=>{const mesh=p.getMesh(),unique=new Map();for(let i=0;i<mesh.vertProperties.length;i+=mesh.numProp){const x=mesh.vertProperties[i],y=mesh.vertProperties[i+1];unique.set(x.toFixed(4)+','+y.toFixed(4),[x,y])}const values=[...unique.values()],step=Math.max(1,Math.ceil(values.length/160));return values.filter((_,i)=>i%step===0)}),edges=[];
   for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++){let best=Infinity,pair;for(const p of points[a])for(const q of points[b]){const d=(p[0]-q[0])**2+(p[1]-q[1])**2;if(d<best){best=d;pair=[p,q]}}edges.push({a,b,d:best,pair})}edges.sort((a,b)=>a.d-b.d);const parent=points.map((_,i)=>i),root=i=>parent[i]===i?i:parent[i]=root(parent[i]),cuts=[];
   for(const edge of edges)if(root(edge.a)!==root(edge.b)){parent[root(edge.a)]=root(edge.b);cuts.push(capsule(...edge.pair,bridgeWidth));bridges++}const joined=own(new api.CrossSection(cuts,'NonZero')),next=own(section.add(joined));solid.delete();solid=next.extrude(depth);
  }}finally{parts.forEach(p=>p.delete())}
  if(solid.status()!=='NoError'||solid.isEmpty())throw Error('Bentuk import tidak dapat dibina.');parts=solid.decompose();const components=parts.length;parts.forEach(p=>p.delete());if(spec.connect&&components!==1)throw Error('Sambungan automatik tidak mencukupi. Lebarkan sambungan atau gunakan bentuk sahaja.');return{geometry:geometryFromSolid(solid),components,bridges,volume:solid.volume()};
 }finally{solid?.delete();owned.reverse().forEach(o=>o.delete())}
}



