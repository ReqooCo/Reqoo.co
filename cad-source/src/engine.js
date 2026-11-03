import * as R from 'replicad';
import {solveSketch} from './constraints.js';
import {normalizedCenter,resolveReference} from './topology.js';
export const TYPES=['sketch','sketchOffset','sketchFillet','sketchMirror','box','cylinder','sphere','torus','extrude','hole','revolve','loft','sweep','union','subtract','intersect','fillet','chamfer','shell','offsetFace','draft','move','rotate','scale','mirror','pattern','circularPattern','duplicate','align','split','import','plane','axis','delete'];
const V=(v,d=0)=>v===undefined?d:Number(v);
export function number(v,name,min=-2000,max=2000){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(name+' must be between '+min+' and '+max);return n;}
export function basis(p={}){
 if(p.basis){const b=p.basis;if(![b.origin,b.x,b.normal].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))throw Error('Invalid sketch plane');return b;}
 const o=number(p.offset??0,'Plane offset'),plane=p.plane||'XY';
 return plane==='XZ'?{origin:[0,-o,0],x:[1,0,0],normal:[0,-1,0]}:plane==='YZ'?{origin:[o,0,0],x:[0,1,0],normal:[1,0,0]}:{origin:[0,0,o],x:[1,0,0],normal:[0,0,1]};
}
export function validateProject(doc){
 if(!doc||doc.format!=='reqoo-cad'||doc.version!==1||!Array.isArray(doc.features)||doc.features.length>150)throw Error('Not a supported Reqoo CAD project');
 if(doc.title!==undefined&&(typeof doc.title!=='string'||doc.title.length>80))throw Error('Invalid project title');
 if(doc.ui!==undefined){if(!doc.ui||typeof doc.ui!=='object'||Array.isArray(doc.ui))throw Error('Invalid appearance');if(doc.ui.hidden!==undefined&&(!Array.isArray(doc.ui.hidden)||doc.ui.hidden.some(id=>typeof id!=='string')))throw Error('Invalid hidden items');if(doc.ui.colors!==undefined&&(!doc.ui.colors||typeof doc.ui.colors!=='object'||Array.isArray(doc.ui.colors)||Object.values(doc.ui.colors).some(c=>typeof c!=='string'||!/^#[a-fA-F0-9]{6}$/.test(c))))throw Error('Invalid colours');}
 const ids=new Set();for(const f of doc.features){if(!f||!TYPES.includes(f.type)||typeof f.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(f.id)||ids.has(f.id))throw Error('Invalid or repeated history feature');ids.add(f.id);if(!f.params||typeof f.params!=='object'||Array.isArray(f.params))throw Error('Invalid feature settings');if(!Array.isArray(f.inputs)||f.inputs.some(v=>typeof v!=='string'||v.length>100))throw Error('Invalid feature references');}
 if(JSON.stringify(doc).length>24e6)throw Error('Project is too large');
 return doc;
}
export function profile(p){
 const x=number(p.x??0,'Sketch X'),y=number(p.y??0,'Sketch Y');let d;
 if(p.shape==='annulus'){const outer=number(p.radius,'Outer radius',.01,1000),inner=number(p.innerRadius,'Inner radius',.001,999);if(inner>=outer)throw Error('Inner radius must be smaller than outer radius');d=R.drawCircle(outer).cut(R.drawCircle(inner));}
 else if(p.shape==='circle')d=R.drawCircle(number(p.radius,'Radius',.01,1000));
 else if(p.shape==='ellipse')d=R.drawEllipse(number(p.width,'Width',.02,2000)/2,number(p.height,'Height',.02,2000)/2);
 else if(p.shape==='polygon'){const sides=number(p.sides,'Sides',3,64);if(!Number.isInteger(sides))throw Error('Sides must be an integer');d=R.drawPolysides(number(p.radius,'Radius',.01,1000),sides);}
 else if(p.shape==='polyline'||p.shape==='spline'||p.shape==='arc'){
  const pts=p.shape==='polyline'?solveSketch(p.points,p.constraints||[]).points:p.points;if(!Array.isArray(pts)||pts.length<2||pts.length>100||pts.some(q=>!Array.isArray(q)||q.length!==2||q.some(v=>!Number.isFinite(v)||Math.abs(v)>2000)))throw Error('Use 2–100 finite sketch points');
  if(p.closed!==false&&pts.length<3)throw Error('A closed profile needs at least three points');
  if(p.shape==='spline')d=R.drawPointsInterpolation(pts,{}, {closeShape:p.closed!==false});
  else{let pen=R.draw(pts[0]);if(p.shape==='arc')pen=pen.sagittaArc(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1],number(p.sagitta??10,'Arc height',.01,1000));else for(const q of pts.slice(1))pen=pen.lineTo(q);d=p.closed===false?pen.done():pen.close();}
 }else d=R.drawRectangle(number(p.width,'Width',.02,2000),number(p.height,'Height',.02,2000));
 if(p.operations!==undefined){if(!Array.isArray(p.operations)||p.operations.length>20)throw Error('Too many derived sketch operations');for(const op of p.operations){if(op.type==='offset')d=d.offset(number(op.distance,'Sketch offset',-500,500));else if(op.type==='fillet')d=d.fillet(number(op.radius,'Sketch fillet radius',.001,500));else if(op.type==='mirror')d=d.mirror(op.axis==='X'?[1,0]:[0,1],[0,0],'plane');else throw Error('Unsupported sketch operation');}}
 return d.translate([x,y]);
}
function sketch(p){const b=basis(p);return profile(p).sketchOnPlane(new R.Plane(b.origin,b.x,b.normal));}
function volume(s){const v=R.measureShapeVolumeProperties(s);const value=Math.abs(v.volume);v.delete();return value;}
function length(s){const p=R.measureShapeLinearProperties(s);const v=p.length;p.delete();return v;}
function area(s){const v=R.measureShapeSurfaceProperties(s);const value=Math.abs(v.area);v.delete();return value;}

function faceDescriptor(shape,f){const n=f.normalAt(),c=f.center,normal=n.toTuple(),len=Math.hypot(...normal),center=c.toTuple();n.delete();c.delete();return{kind:'face',type:f.geomType,center:normalizedCenter(shape.boundingBox.bounds,center),normal:normal.map(v=>v/(len||1))};}
function edgeDescriptor(shape,e){const bounds=shape.boundingBox.bounds;return{kind:'edge',type:e.geomType,center:normalizedCenter(bounds,e.boundingBox.center),measure:e.length/Math.max(1e-7,Math.hypot(...bounds[0].map((v,i)=>bounds[1][i]-v)))};}

export async function buildModel(doc,{base=null,preview=false}={}){
 validateProject(doc);const shapes=new Map(),profiles=new Map(),meta=new Map(),visible=new Set(),arena=new Set();let released=false,currentFeature=null;
 const reuse=base&&base.featureCount<=doc.features.length&&base.featureSignature===JSON.stringify(doc.features.slice(0,base.featureCount));
 if(reuse){for(const [k,v]of base.shapes)shapes.set(k,v);for(const [k,v]of base.profiles)profiles.set(k,v);for(const [k,v]of base.meta)meta.set(k,v);for(const k of base.visible)visible.add(k);}
 const metrics={reusedFeatures:reuse?base.featureCount:0,builtFeatures:0,meshedItems:0};
 const own=s=>{arena.add(s);return s;},release=()=>{if(released)return;released=true;for(const s of arena)try{s.delete();}catch{}};
 function consume(id){visible.delete(id);const m=meta.get(id),host=m?.regionParent||(m?.regionHost?id:null);if(host)for(const [key,value]of meta)if(key===host||value.regionParent===host)visible.delete(key);}
 function body(id){const s=shapes.get(id);if(!s||meta.get(id)?.kind!=='body')throw Error('Select a solid body');return s;}
 function clone(id){return own(body(id).clone());}
 function face(s,p){const faces=s.faces;for(const f of faces)own(f);const i=resolveReference(p.faceRef,faces.map(f=>faceDescriptor(s,f)),p.face);return faces[i];}
 function save(f,s,kind='body',id=f.id,name=f.name||f.type){own(s);if(s.isNull)throw Error('Empty shape');if(kind==='body'&&(!R.isShape3D(s)||volume(s)<1e-8))throw Error('Operation did not create a closed solid');shapes.set(id,s);meta.set(id,{id,name,kind,featureId:f.id});visible.add(id);}
 try{
 for(const f of doc.features.slice(reuse?base.featureCount:0)){currentFeature=f;metrics.builtFeatures++;if(f.suppressed)continue;const p=f.params,ins=f.inputs;let s=null,kind='body';
  if(f.type==='sketch'){profiles.set(f.id,p);const sk=sketch(p);s=own(p.closed===false||p.construction?sk.wire.clone():sk.face());sk.delete();save(f,s,'sketch');continue;}
  if(['sketchOffset','sketchFillet','sketchMirror'].includes(f.type)){const original=profiles.get(ins[0]);if(!original)throw Error('Select a sketch first');const op=f.type==='sketchOffset'?{type:'offset',distance:number(p.distance,'Offset distance',-500,500)}:f.type==='sketchFillet'?{type:'fillet',radius:number(p.radius,'Corner radius',.001,500)}:{type:'mirror',axis:p.axis==='X'?'X':'Y'},recipe={...original,operations:[...(original.operations||[]),op]};profiles.set(f.id,recipe);const sk=sketch(recipe);s=own(recipe.closed===false||recipe.construction?sk.wire.clone():sk.face());sk.delete();save(f,s,'sketch');
 if(f.type==='sketchOffset'&&original.shape==='circle'&&!original.operations?.length&&!original.construction&&Math.abs(p.distance)>.001){
  const r0=original.radius,r1=r0+Number(p.distance),inner=Math.min(r0,r1),outer=Math.max(r0,r1);
  if(inner>.001){
   meta.set(f.id,{...meta.get(f.id),regionHost:true});
   for(const [suffix,recipe,label]of [['core',{...original,radius:inner},'Centre'],['band',{...original,shape:'annulus',radius:outer,innerRadius:inner},'Ring']]){
    const id=f.id+':'+suffix;profiles.set(id,recipe);const region=sketch(recipe);const face=own(region.face());region.delete();save(f,face,'sketch',id,(f.name||'Offset sketch')+' · '+label);meta.set(id,{...meta.get(id),regionParent:f.id,region:suffix});
   }
  }
 }
 if(!p.keepInputs)consume(ins[0]);continue;}
  if(f.type==='delete'){for(const id of ins)visible.delete(id);continue;}
  if(f.type==='plane'){const b=basis(p),pl=new R.Plane(b.origin,b.x,b.normal),sk=R.drawRectangle(80,80).sketchOnPlane(pl);s=sk.face();sk.delete();save(f,s,'plane');continue;}
  if(f.type==='axis'){const x=number(p.x??0,'X'),y=number(p.y??0,'Y'),z=number(p.z??0,'Z'),axis=p.axis||'Z';s=R.makeLine([x,y,z],[x+(axis==='X'?80:0),y+(axis==='Y'?80:0),z+(axis==='Z'?80:0)]);save(f,s,'axis');continue;}
  if(f.type==='box'){const w=number(p.width,'Width',.01,2000),d=number(p.depth,'Depth',.01,2000),h=number(p.height,'Height',.01,2000),x=number(p.x??0,'X'),y=number(p.y??0,'Y'),z=number(p.z??0,'Z');s=R.makeBox([x-w/2,y-d/2,z],[x+w/2,y+d/2,z+h]);}
  else if(f.type==='cylinder')s=R.makeCylinder(number(p.radius,'Radius',.01,1000),number(p.height,'Height',.01,2000),[number(p.x??0,'X'),number(p.y??0,'Y'),number(p.z??0,'Z')],[0,0,1]);
  else if(f.type==='sphere'){const r=number(p.radius,'Radius',.01,1000);s=R.makeSphere(r).translate([number(p.x??0,'X'),number(p.y??0,'Y'),number(p.z??0,'Z')+r]);}
  else if(f.type==='torus'){const r=number(p.radius,'Major radius',.02,1000),t=number(p.tube,'Tube radius',.01,r-.001);s=R.drawCircle(t).translate(r,0).sketchOnPlane('XZ').revolve('Z');s=s.translateZ(t);}
  else if(f.type==='import'){if(typeof p.step!=='string'||p.step.length>20e6||!p.step.includes('ISO-10303-21'))throw Error('Choose a valid STEP file (up to 20 MB)');s=await R.importSTEP(new Blob([p.step]));}
  else if(f.type==='hole'){
   const target=body(ins[0]),source=ins[1]?profiles.get(ins[1]):null;
   let origin,normal,radius;
   if(source){if(source.shape!=='circle'||source.construction||source.operations?.length)throw Error('Hole needs a basic non-construction circle. For derived profiles use an extrude cut.');const b=basis(source),xx=b.x,nn=b.normal,yy=[nn[1]*xx[2]-nn[2]*xx[1],nn[2]*xx[0]-nn[0]*xx[2],nn[0]*xx[1]-nn[1]*xx[0]];origin=b.origin.map((v,i)=>v+xx[i]*number(source.x??0,'Circle X')+yy[i]*number(source.y??0,'Circle Y'));normal=nn;radius=number(source.radius,'Radius',.01,1000);}
   else{const selected=face(target,p);if(selected.geomType!=='PLANE')throw Error('Choose a planar face for the hole');const nv=selected.normalAt(),cv=selected.center;normal=nv.toTuple();const len=Math.hypot(...normal);normal=normal.map(v=>v/len);origin=cv.toTuple();nv.delete();cv.delete();const seed=Math.abs(normal[0])<.9?[1,0,0]:[0,1,0],dot=seed.reduce((s,v,i)=>s+v*normal[i],0),xx=seed.map((v,i)=>v-dot*normal[i]),xl=Math.hypot(...xx);for(let i=0;i<3;i++)xx[i]/=xl;const yy=[normal[1]*xx[2]-normal[2]*xx[1],normal[2]*xx[0]-normal[0]*xx[2],normal[0]*xx[1]-normal[1]*xx[0]];origin=origin.map((v,i)=>v+xx[i]*number(p.x??0,'Centre X')+yy[i]*number(p.y??0,'Centre Y'));radius=number(p.diameter??10,'Diameter',.02,2000)/2;}
   if(p.reverse)normal=normal.map(v=>-v);
   const span=target.boundingBox.bounds,reach=Math.hypot(...span[0].map((v,i)=>span[1][i]-v))+Math.hypot(...origin.map((v,i)=>v-(span[0][i]+span[1][i])/2))+2;
   const through=p.extent!=='Blind',depth=through?reach*2:number(p.depth??10,'Hole depth',.01,2000),start=origin.map((v,i)=>v+normal[i]*(through?reach:.02)),tool=own(R.makeCylinder(radius,depth+(through?0:.02),start,normal.map(v=>-v)));
   s=target.cut(tool);if(Math.abs(volume(s)-volume(target))<1e-6)throw Error('The hole does not intersect the target body. Check centre, depth or reverse direction.');
  }
  else if(f.type==='extrude'||f.type==='revolve'||f.type==='sweep'||f.type==='loft'){
   const a=profiles.get(ins[0]);if(!a&&!(f.type==='extrude'&&shapes.has(ins[0])&&p.face!==undefined))throw Error('Select a sketch profile');
   if(f.type==='extrude'){if(a?.closed===false||a?.construction)throw Error('Extrude needs a closed, non-construction profile');const distance=number(p.distance,'Distance');if(Math.abs(distance)<.001)throw Error('Distance must not be zero');
 if(a)s=sketch(a).extrude(distance);else{const source=body(ins[0]),selected=face(source,p),raw=selected.normalAt(),n=raw.normalized(),v=n.multiply(distance);s=R.basicFaceExtrusion(selected,v);v.delete();n.delete();raw.delete();}
 const mode=p.operation||'New body',targetId=a?ins[1]:ins[0];if(mode!=='New body'){if(!['Add','Subtract','Intersect'].includes(mode))throw Error('Invalid extrude operation');const target=body(targetId);own(s);s=mode==='Add'?target.fuse(s):mode==='Subtract'?target.cut(s):target.intersect(s);}
 }
   else if(f.type==='revolve'){if(a.closed===false)throw Error('Revolve needs a closed profile');s=sketch(a).revolve(p.axis||'Z',{origin:[0,0,0],angle:number(p.angle??360,'Angle',.1,360)});}
   else if(f.type==='loft'){const b=profiles.get(ins[1]);if(!b||a.closed===false||b.closed===false)throw Error('Select two closed sketches at different heights');s=sketch(a).loftWith(sketch(b));}
   else{const r=number(p.radius,'Sweep radius',.01,500);s=sketch(a).sweepSketch((plane)=>R.drawCircle(r).sketchOnPlane(plane));}
  }
  else if(['union','subtract','intersect'].includes(f.type)){
   if(ins.length<2)throw Error('Select at least two solid bodies');s=clone(ins[0]);for(const id of ins.slice(1)){const b=clone(id);s=own(f.type==='union'?s.fuse(b):f.type==='subtract'?s.cut(b):s.intersect(b));}
  }
  else if(['fillet','chamfer'].includes(f.type)){
   const b=clone(ins[0]),r=number(p.radius,'Radius',.001,500),edges=b.edges;for(const e of edges)own(e);
   const chosen=p.allEdges?null:(p.edges||[]).map((i,k)=>{const index=resolveReference(p.edgeRefs?.[k],edges.map(e=>edgeDescriptor(b,e)),i);return edges[index].hashCode;});
   if(chosen&&!chosen.length)throw Error('Select an edge, or enable All edges');
   s=b[f.type](chosen?(e=>chosen.includes(e.hashCode)?r:0):r);
  }
  else if(f.type==='shell'){const b=clone(ins[0]),selected=face(b,p);s=b.shell({thickness:number(p.thickness,'Wall thickness',.01,500),filter:new R.FaceFinder().inList([selected])});}
  else if(f.type==='draft'){const b=clone(ins[0]),selected=face(b,p),pl=new R.Plane(basis(p).origin,basis(p).x,basis(p).normal);s=b.draft(number(p.angle,'Draft angle',-75,75),(finder)=>finder.inList([selected]),pl);pl.delete();}
  else if(f.type==='offsetFace'){const b=clone(ins[0]),selected=face(b,p);if(selected.geomType!=='PLANE')throw Error('Offset Face currently supports planar faces');const d=number(p.distance,'Distance'),rawNormal=selected.normalAt(),n=rawNormal.normalized(),v=new R.Vector(n.toTuple()).multiply(d),prism=own(R.basicFaceExtrusion(selected,v));v.delete();n.delete();rawNormal.delete();s=d>0?b.fuse(prism):b.cut(prism);}
  else if(f.type==='move'||f.type==='duplicate'){s=clone(ins[0]).translate([number(p.x??0,'X'),number(p.y??0,'Y'),number(p.z??0,'Z')]);}
  else if(f.type==='rotate')s=clone(ins[0]).rotate(number(p.angle,'Angle',-3600,3600),[0,0,0],p.axis||'Z');
  else if(f.type==='scale')s=clone(ins[0]).scale(number(p.factor,'Scale',.001,100));
  else if(f.type==='mirror')s=clone(ins[0]).mirror(['XY','XZ','YZ'].includes(p.plane)?p.plane:'YZ');
  else if(f.type==='align'){const a=clone(ins[0]),b=body(ins[1]),aa=a.boundingBox.center,bb=b.boundingBox.center,axis=['X','Y','Z'].indexOf(p.axis||'X'),delta=[0,0,0];delta[axis]=bb[axis]-aa[axis];s=a.translate(delta);}
  else if(f.type==='pattern'||f.type==='circularPattern'){
   const count=number(p.count,'Count',2,25);if(!Number.isInteger(count))throw Error('Count must be an integer');const copies=[];
   for(let i=0;i<count;i++){let c=clone(ins[0]);if(f.type==='pattern')c=c.translate([number(p.x??20,'X spacing')*i,number(p.y??0,'Y spacing')*i,number(p.z??0,'Z spacing')*i]);else c=c.rotate(i*number(p.angle??360,'Angle',.1,360)/count,[0,0,0],p.axis||'Z');copies.push(c);}s=R.makeCompound(copies);
  }
  else if(f.type==='split'){const b=clone(ins[0]),parts=b.split(p.plane||'XY',number(p.offset??0,'Plane offset'));if(!parts.positive||!parts.negative)throw Error('The plane must pass through the body');save(f,parts.positive,'body',f.id+':positive',(f.name||'Split')+' · positive');save(f,parts.negative,'body',f.id+':negative',(f.name||'Split')+' · negative');visible.delete(ins[0]);continue;}
  else throw Error('Unsupported CAD operation');
  save(f,s,kind);
  if(!['box','cylinder','sphere','torus','import'].includes(f.type)&&f.type!=='duplicate'&&!p.keepInputs&&!(f.type==='extrude'&&!profiles.has(ins[0])&&(p.operation||'New body')==='New body'))for(const id of ins)if(f.type!=='align'||id===ins[0])consume(id);
 }
 const items=[];
 for(const [id,m]of meta){if(!visible.has(id))continue;if(reuse&&base.shapes.get(id)===shapes.get(id)){const cached=base.items.find(i=>i.id===id);if(cached){items.push(cached);continue;}}metrics.meshedItems++;const s=shapes.get(id),faces=s.faces,edges=s.edges;for(const f of faces)own(f);for(const e of edges)own(e);
  const faceMesh=m.kind==='axis'||(m.kind==='sketch'&&(profiles.get(id)?.closed===false||profiles.get(id)?.construction))?{triangles:[],vertices:[],normals:[],faceGroups:[]}:s.mesh({tolerance:preview?.12:.08,angularTolerance:.2});
  const groups=faceMesh.faceGroups.map(g=>({...g,faceIndex:faces.findIndex(f=>f.hashCode===g.faceId)}));
  const lineMeshes=edges.slice(0,600).map((e,i)=>({index:i,length:length(e),type:e.geomType,reference:edgeDescriptor(s,e),center:e.boundingBox.center,lines:e.meshEdges({tolerance:preview?.12:.08,angularTolerance:.2}).lines}));
  const bb=s.boundingBox.bounds;
  items.push({...m,construction:profiles.get(id)?.construction||false,sketchPlane:profiles.has(id)?basis(profiles.get(id)):null,profileClosed:profiles.has(id)?profiles.get(id).closed!==false&&!profiles.get(id).construction:null,mesh:{...faceMesh,faceGroups:groups},edges:lineMeshes,faceInfo:faces.map((f,i)=>{let normal=[0,0,1],center=[0,0,0];try{const n=f.normalAt(),c=f.center;const len=Math.hypot(...n.toTuple());normal=n.toTuple().map(v=>v/(len||1));center=c.toTuple();n.delete();c.delete();}catch{}return{index:i,type:f.geomType,normal,center,reference:faceDescriptor(s,f),area:area(f)};}),edgeCount:edges.length,bounds:bb,volume:m.kind==='body'?volume(s):0,area:m.kind==='body'||faces.length?area(s):0});
 }
 if(items.filter(i=>i.kind==='body').length>50)throw Error('Limit is 50 visible bodies');
 return{items,shapes,profiles,meta,visible,metrics,featureCount:doc.features.length,featureSignature:JSON.stringify(doc.features),release,export:async(format,ids)=>{
  const chosen=(ids?.length?ids:[...visible]).map(id=>{if(meta.get(id)?.kind!=='body')throw Error('Export needs solid bodies');return shapes.get(id);});
  if(!chosen.length)throw Error('Select a solid body to export');const combined=chosen.length===1?chosen[0]:own(R.makeCompound(chosen.map(s=>own(s.clone()))));
  return format==='step'?combined.blobSTEP():combined.blobSTL({binary:true,tolerance:.03,angularTolerance:.1});
 },distance:(a,b)=>{const resolve=ref=>{if(typeof ref==='string')return body(ref);const shape=shapes.get(ref.id);if(!shape)throw Error('Selection no longer exists');if(ref.kind==='face'||ref.kind==='edge'){const list=ref.kind==='face'?shape.faces:shape.edges;for(const v of list)own(v);if(!Number.isInteger(ref.index)||!list[ref.index])throw Error('Selected geometry no longer exists');return list[ref.index];}return shape;};return R.measureDistanceBetween(resolve(a),resolve(b));}};
 }catch(error){release();if(error instanceof Error)error.message=(currentFeature?.name||currentFeature?.type||'Model')+': '+error.message;throw error;}
}
