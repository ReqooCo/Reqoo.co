// Exact affine display updates for unmodified axis-aligned prisms only.
// These never replace the OpenCascade solid or authorize an export.
export function simpleSource(doc,item){
 let f=doc.features.find(f=>f.id===item?.featureId),seen=new Set();
 while(f?.type==='offsetFace'&&f.inputs.length===1&&!seen.has(f.id)){seen.add(f.id);f=doc.features.find(v=>v.id===f.inputs[0]);}
 if(f?.type==='box'||f?.type==='cylinder')return f;
 if(f?.type==='extrude'&&f.inputs.length===1){
  const s=doc.features.find(v=>v.id===f.inputs[0]);
  if(s?.type==='sketch'&&['circle','rectangle'].includes(s.params.shape)&&!s.params.basis&&(!s.params.plane||s.params.plane==='XY')&&!s.params.operations?.length&&!f.params.angle)return s;
 }
 return null;
}
// Traverse finishing features only for source edits. Do not apply affine previews
// to finished solids: their fixed fillet/chamfer radius must be rebuilt by OCC.
export function diameterSource(doc,item){
 let f=doc.features.find(f=>f.id===item?.featureId),seen=new Set();
 while(f&&['fillet','chamfer','offsetFace'].includes(f.type)&&f.inputs.length===1&&!seen.has(f.id)){seen.add(f.id);f=doc.features.find(v=>v.id===f.inputs[0]);}
 return f?simpleSource(doc,{featureId:f.id}):null;
}
export function immediateTransform(doc,item,ref,operation,value){
 const source=simpleSource(doc,item);if(!source)return null;
 const face=item.faceInfo.find(f=>f.index===ref.index);if(!face)return null;
 const min=item.bounds[0],max=item.bounds[1],size=max.map((v,i)=>v-min[i]),scale=[1,1,1],position=[0,0,0];
 if(operation==='diameter'){
  if(!['CYLINDER','CYLINDRE'].includes(face.type)||!(source.type==='cylinder'||source.params.shape==='circle')||value<=.02)return null;
  const ratio=value/(2*(source.params.radius??15));scale[0]=scale[1]=ratio;
  for(const i of [0,1])position[i]=(min[i]+max[i])/2*(1-ratio);
 }else if(operation==='offsetFace'){
  if(face.type!=='PLANE')return null;
  const axis=face.normal.findIndex(n=>Math.abs(n)>.9999);if(axis<0||size[axis]+value<=.01)return null;
  const sign=Math.sign(face.normal[axis]),end=sign>0?max[axis]:min[axis];
  if(Math.abs(face.center[axis]-end)>.001)return null;
  scale[axis]=(size[axis]+value)/size[axis];const anchor=sign>0?min[axis]:max[axis];position[axis]=anchor*(1-scale[axis]);
 }else return null;
 return{scale,position};
}
