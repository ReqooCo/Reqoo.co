export function connectedSketchIds(items,seed){
 const source=items.find(i=>i.id===seed);
 if(!source||source.kind!=='sketch'||source.regionHost)return[];
 const coplanar=(a,b)=>{
  if(!a||!b)return false;
  const valid=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
  if(!valid(a.origin)||!valid(b.origin)||!valid(a.normal)||!valid(b.normal))return false;
  const dot=(u,v)=>u.reduce((s,n,k)=>s+n*v[k],0);
  const norm=v=>Math.hypot(...v);
  const na=norm(a.normal),nb=norm(b.normal);
  if(na<1e-10||nb<1e-10)return false;
  const alignment=Math.abs(dot(a.normal,b.normal)/(na*nb));
  const delta=a.origin.map((n,k)=>n-b.origin[k]);
  return alignment>.9999&&Math.abs(dot(delta,b.normal)/nb)<1e-4;
 };
 const candidates=items.filter(i=>i.kind==='sketch'&&!i.regionHost&&coplanar(i.sketchPlane,source.sketchPlane));
 const ends=i=>(i.edges||[]).flatMap(e=>{
  const lines=e?.lines;
  if(!lines||lines.length<6||lines.length%3!==0||!Array.from(lines).every(Number.isFinite))return[];
  return [Array.from(lines.slice(0,3)),Array.from(lines.slice(-3))];
 });
 const tolerance=1e-5,cell=p=>p.map(v=>Math.floor(v/tolerance));
 const key=(x,y,z)=>x+','+y+','+z;
 const grid=new Map(),endpoints=new Map();
 for(const item of candidates){
  if(item.id===seed)continue;
  const points=ends(item);endpoints.set(item.id,points);
  for(const point of points){
   if(point.length!==3||!point.every(Number.isFinite))continue;
   const [x,y,z]=cell(point),k=key(x,y,z);
   if(!grid.has(k))grid.set(k,[]);
   grid.get(k).push({id:item.id,point});
  }
 }
 const selected=new Set([seed]),queue=ends(source);
 for(let head=0;head<queue.length;head++){
  const point=queue[head];if(point.length!==3||!point.every(Number.isFinite))continue;
  const [x,y,z]=cell(point);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
   for(const entry of grid.get(key(x+dx,y+dy,z+dz))||[]){
    if(selected.has(entry.id)||Math.hypot(...point.map((v,k)=>v-entry.point[k]))>=tolerance)continue;
    selected.add(entry.id);queue.push(...endpoints.get(entry.id));
   }
  }
 }
 return [...selected];
}
