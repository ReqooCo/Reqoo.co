import {dot,sub,add,mul} from './transform-frames.js';
export function sketchGuidepoints(items,plane,{hidden=[],draftPoints=[]}={}){
 const y=[plane.normal[1]*plane.x[2]-plane.normal[2]*plane.x[1],plane.normal[2]*plane.x[0]-plane.normal[0]*plane.x[2],plane.normal[0]*plane.x[1]-plane.normal[1]*plane.x[0]],points=[],seen=new Set(),segments=[];
 function addPoint(world,label,kind){if(points.length>=1800||!world?.every(Number.isFinite))return;const rel=sub(world,plane.origin);if(Math.abs(dot(rel,plane.normal))>.02)return;const point=[dot(rel,plane.x),dot(rel,y)],key=point.map(v=>v.toFixed(6)).join(':');if(seen.has(key))return;seen.add(key);points.push({point,world,label,kind});}
 addPoint(plane.origin,'Origin','origin');for(const p of draftPoints)addPoint(add(plane.origin,add(mul(plane.x,p[0]),mul(y,p[1]))),'Sketch endpoint','endpoint');
 for(const item of items){if(hidden.includes(item.id)||item.regionHost)continue;for(const e of item.edges||[]){if(e.type==='LINE'&&e.lines.length>=6){addPoint(e.lines.slice(0,3),'Endpoint · '+item.name,'endpoint');addPoint(e.lines.slice(-3),'Endpoint · '+item.name,'endpoint');addPoint(e.lines.slice(0,3).map((v,i)=>(v+e.lines.at(-3+i))/2),'Midpoint · '+item.name,'midpoint');segments.push([e.lines.slice(0,3),e.lines.slice(-3)]);}else if(e.type==='CIRCLE'||e.type==='ELLIPSE')addPoint(e.center,'Centre · '+item.name,'centre');}
  for(const f of item.faceInfo||[])if(f.type==='PLANE')addPoint(f.center,'Face centre · '+item.name,'centre');
 }
 // Exact 2D crossings of finite straight sketch edges; never alter geometry.
 const cap=Math.min(segments.length,160);
 for(let i=0;i<cap;i++)for(let j=i+1;j<cap;j++){
  const [a,b]=segments[i],[c,d]=segments[j];
  if([a,b,c,d].some(p=>Math.abs(dot(sub(p,plane.origin),plane.normal))>.02))continue;
  const A=[dot(sub(a,plane.origin),plane.x),dot(sub(a,plane.origin),y)],B=[dot(sub(b,plane.origin),plane.x),dot(sub(b,plane.origin),y)];
  const C=[dot(sub(c,plane.origin),plane.x),dot(sub(c,plane.origin),y)],D=[dot(sub(d,plane.origin),plane.x),dot(sub(d,plane.origin),y)];
  const u=[B[0]-A[0],B[1]-A[1]],v=[D[0]-C[0],D[1]-C[1]],w=[C[0]-A[0],C[1]-A[1]],den=u[0]*v[1]-u[1]*v[0];
  if(Math.abs(den)<1e-9)continue;
  const t=(w[0]*v[1]-w[1]*v[0])/den,q=(w[0]*u[1]-w[1]*u[0])/den;
  if(t<1e-7||t>1-1e-7||q<1e-7||q>1-1e-7)continue;
  const p=[A[0]+t*u[0],A[1]+t*u[1]];
  addPoint(add(plane.origin,add(mul(plane.x,p[0]),mul(y,p[1]))),'Intersection','intersection');
 }
 return points;
}
export function nearestGuidepoint(raw,points,threshold){let nearest=null,best=threshold**2;for(const p of points){const d=p.point.reduce((sum,v,i)=>sum+(v-raw[i])**2,0);if(d<best){best=d;nearest=p;}}return nearest;}
