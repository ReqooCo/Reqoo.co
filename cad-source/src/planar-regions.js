import * as R from 'replicad';
// Imprint closed, coplanar sketch faces into the solid's actual B-rep boundary.
// Tools outside the host remain independent sketches; volume is never removed.
export function imprintPlanarRegions(target,entries){
 const oc=R.getOC(),arena=[],own=o=>{arena.push(o);return o;},measure=(shape,kind)=>{const p=kind==='volume'?R.measureShapeVolumeProperties(shape):R.measureShapeSurfaceProperties(shape);try{return Math.abs(kind==='volume'?p.volume:p.area);}finally{p.delete();}};
 try{
  const faces=target.faces.map(own),used=[],tools=own(new oc.NCollection_List_TopoDS_Shape());
  for(const entry of entries){const {origin,normal}=entry.plane;const coplanar=faces.some(face=>{if(face.geomType!=='PLANE')return false;const n=own(face.normalAt()),c=own(face.center),nn=n.toTuple(),cc=c.toTuple();return Math.abs(nn.reduce((s,v,i)=>s+v*normal[i],0))>1-1e-7&&Math.abs(cc.reduce((s,v,i)=>s+(v-origin[i])*normal[i],0))<1e-5;});if(!coplanar)continue;
   const args=own(new oc.NCollection_List_TopoDS_Shape()),cutters=own(new oc.NCollection_List_TopoDS_Shape()),common=own(new oc.BRepAlgoAPI_Common());args.Append(target.wrapped);cutters.Append(entry.shape.wrapped);common.SetArguments(args);common.SetTools(cutters);common.SetNonDestructive(true);common.Build();if(common.HasErrors()||!common.IsDone())throw Error('Could not intersect sketch with host face');const raw=own(common.Shape());if(raw.IsNull())continue;const overlap=own(R.cast(raw));if(measure(overlap,'area')<1e-8)continue;used.push(entry.id);tools.Append(entry.shape.wrapped);
  }
  if(!used.length)return{shape:target.clone(),used};
  const args=own(new oc.NCollection_List_TopoDS_Shape()),split=own(new oc.BRepAlgoAPI_Splitter());args.Append(target.wrapped);split.SetArguments(args);split.SetTools(tools);split.SetNonDestructive(true);split.Build();if(split.HasErrors()||!split.IsDone())throw Error('Sketch boundaries could not divide this face');
  const result=own(R.cast(split.Shape())),solids=result.solids.map(own),originals=target.solids.map(own);if(solids.length!==originals.length||!own(new oc.BRepCheck_Analyzer(result.wrapped,true)).IsValid())throw Error('Sketch regions would create invalid solid topology');const before=measure(target,'volume'),after=measure(result,'volume');if(Math.abs(before-after)>Math.max(1e-6,before*1e-8))throw Error('Sketch regions must preserve solid volume');
  return{shape:(solids.length===1?solids[0]:result).clone(),used};
 }finally{for(const o of arena.reverse())try{o.delete();}catch{}}
}
