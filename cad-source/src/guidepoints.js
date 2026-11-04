import {dot,sub,add,mul} from './transform-frames.js';
export function sketchGuidepoints(items,plane,{hidden=[],draftPoints=[]}={}){
 const y=[plane.normal[1]*plane.x[2]-plane.normal[2]*plane.x[1],plane.normal[2]*plane.x[0]-plane.normal[0]*plane.x[2],plane.normal[0]*plane.x[1]-plane.normal[1]*plane.x[0]],points=[],seen=new Set();
 function addPoint(world,label,kind){if(points.length>=1800||!world?.every(Number.isFinite))return;const rel=sub(world,plane.origin);if(Math.abs(dot(rel,plane.normal))>.02)return;const point=[dot(rel,plane.x),dot(rel,y)],key=point.map(v=>v.toFixed(6)).join(':');if(seen.has(key))return;seen.add(key);points.push({point,world,label,kind});}
 addPoint(plane.origin,'Origin','origin');for(const p of draftPoints)addPoint(add(plane.origin,add(mul(plane.x,p[0]),mul(y,p[1]))),'Sketch endpoint','endpoint');
 for(const item of items){if(hidden.includes(item.id)||item.regionHost)continue;for(const e of item.edges||[]){if(e.type==='LINE'&&e.lines.length>=6){addPoint(e.lines.slice(0,3),'Endpoint · '+item.name,'endpoint');addPoint(e.lines.slice(-3),'Endpoint · '+item.name,'endpoint');addPoint(e.center,'Midpoint · '+item.name,'midpoint');}else if(e.type==='CIRCLE'||e.type==='ELLIPSE')addPoint(e.center,'Centre · '+item.name,'centre');}
  for(const f of item.faceInfo||[])if(f.type==='PLANE')addPoint(f.center,'Face centre · '+item.name,'centre');
 }
 return points;
}
export function nearestGuidepoint(raw,points,threshold){let nearest=null,best=threshold**2;for(const p of points){const d=p.point.reduce((sum,v,i)=>sum+(v-raw[i])**2,0);if(d<best){best=d;nearest=p;}}return nearest;}
