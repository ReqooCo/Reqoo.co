export function connectedSketchIds(items,seed){
 const source=items.find(i=>i.id===seed);if(!source||source.kind!=='sketch'||source.regionHost)return[];
 const plane=JSON.stringify(source.sketchPlane),candidates=items.filter(i=>i.kind==='sketch'&&!i.regionHost&&JSON.stringify(i.sketchPlane)===plane);
 const ends=i=>(i.edges||[]).flatMap(e=>e.lines?.length>=6?[e.lines.slice(0,3),e.lines.slice(-3)]:[]);
 const close=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]))<1e-5;
 const selected=new Set([seed]),pending=new Map(candidates.filter(i=>i.id!==seed).map(i=>[i.id,ends(i)]));
 // Expand only from newly connected endpoints. The previous implementation
 // rescanned every selected endpoint against every candidate on each pass.
 const queue=ends(source);
 for(let head=0;head<queue.length;head++){
  const point=queue[head];
  for(const [id,points] of pending){
   if(!points.some(p=>close(p,point)))continue;
   selected.add(id);pending.delete(id);queue.push(...points);
  }
 }
 return [...selected];
}
