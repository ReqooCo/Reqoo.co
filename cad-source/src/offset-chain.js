import {Blueprint,Drawing,getOC,cast,Sketch,Wire} from 'replicad';
const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-5;
// Preserve analytic curves; joining is endpoint-only, never a tessellated approximation.
export function joinedOffsetDrawing(drawings){
 const remaining=drawings.flatMap(d=>d.blueprint.curves.map(c=>c.clone())),ordered=[];
 try{
  if(!remaining.length)throw Error('Select sketch edges');
  const degree=p=>remaining.reduce((n,c)=>n+Number(near(p,c.firstPoint))+Number(near(p,c.lastPoint)),0);
  if(remaining.some(c=>degree(c.firstPoint)>2||degree(c.lastPoint)>2))throw Error('Offset chain branches at a shared point; select a simple chain');
  const endpoints=remaining.flatMap(c=>[c.firstPoint,c.lastPoint]).filter(p=>degree(p)===1).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const beginning=endpoints[0];let start=beginning?remaining.findIndex(c=>near(c.firstPoint,beginning)||near(c.lastPoint,beginning)):0;
  const first=remaining.splice(start,1)[0];if(beginning&&!near(first.firstPoint,beginning))first.reverse();ordered.push(first);
  while(remaining.length){const end=ordered.at(-1).lastPoint;const index=remaining.findIndex(c=>near(c.firstPoint,end)||near(c.lastPoint,end));if(index<0)throw Error('Select connected sketch edges on the same plane');const c=remaining.splice(index,1)[0];if(!near(c.firstPoint,end))c.reverse();ordered.push(c);}
  return new Drawing(new Blueprint(ordered));
 }catch(e){for(const c of [...ordered,...remaining])c.delete();throw e;}
}
export function offsetOpenChain(sketch,distance,plane){
 const oc=getOC(),maker=new oc.BRepOffsetAPI_MakeOffset(sketch.wire.wrapped,oc.GeomAbs_JoinType.GeomAbs_Intersection,true);
 try{maker.Perform(-distance,0);if(!maker.IsDone())throw Error('Offset could not create a connected chain');const wire=cast(maker.Shape());if(!(wire instanceof Wire)){wire.delete();throw Error('Offset split the chain');}return new Sketch(wire,{defaultOrigin:plane.origin,defaultDirection:plane.normal});}finally{maker.delete();}
}
