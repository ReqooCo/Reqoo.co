export function connectedSketchIds(items,seed){
 const source=items.find(i=>i.id===seed);if(!source)return[];
 const plane=JSON.stringify(source.sketchPlane),candidates=items.filter(i=>i.kind==='sketch'&&!i.regionHost&&JSON.stringify(i.sketchPlane)===plane);
 const ends=i=>(i.edges||[]).flatMap(e=>e.lines?.length>=6?[e.lines.slice(0,3),e.lines.slice(-3)]:[]);
 const close=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]))<1e-5;
 const selected=new Set([seed]);let changed=true;
 while(changed){changed=false;const points=candidates.filter(i=>selected.has(i.id)).flatMap(ends);for(const i of candidates)if(!selected.has(i.id)&&ends(i).some(p=>points.some(q=>close(p,q)))){selected.add(i.id);changed=true;}}
 return [...selected];
}
