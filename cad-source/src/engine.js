import {controlSplineDrawing} from './control-spline.js';
import {derivedSketchDrawings,projectedSketchDrawing,drawingIsClosed,drawingInFrame} from './sketch-tools-native.js';
import {ensureSketchFont,SKETCH_FONT} from './text-font.js';
import {validateVisualization} from './visualization-state.js';
import {MAX_PROJECT_FEATURES,MAX_NATIVE_BODIES} from './cad-limits.js';
import {resolveDimensionDocument} from './smart-dimensions.js';
import {imprintPlanarRegions} from './planar-regions.js';
import * as R from 'replicad';
import {cylinderInfo,cutThread} from './thread-solid.js';
import {threadDimensions} from './thread-specs.js';
import {WORLD_AXES,rotateFrame,concentricPlacement} from './transform-frames.js';
import {alignmentDelta} from './snapping.js';
import {solveSketch} from './constraints.js';
import {joinedOffsetDrawing,offsetOpenChain} from './offset-chain.js';
import {trimDrawing,nativePlanarDrawing,exportCurveDrawing} from './curve-trim.js';
import {offsetSketchPolyline} from './sketch-edit-geometry.js';
import {normalizedCenter,resolveReference} from './topology.js';
let meshSerial=0;
export const TYPES=['sketch','faceSketch','sketchProfile','imprint','sketchOffset','sketchFillet','sketchMirror','sketchChamfer','sketchPattern','sketchTransform','sketchProject','sketchTrim','box','cylinder','sphere','torus','extrude','hole','revolve','loft','sweep','union','subtract','intersect','fillet','chamfer','thread','shell','offsetFace','draft','move','rotate','scale','mirror','pattern','circularPattern','duplicate','align','split','import','plane','axis','delete'];
const V=(v,d=0)=>v===undefined?d:Number(v);
export function number(v,name,min=-2000,max=2000){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(name+' must be between '+min+' and '+max);return n;}
export function basis(p={}){
 if(p.basis){const b=p.basis;if(![b.origin,b.x,b.normal].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))throw Error('Invalid sketch plane');return b;}
 const o=number(p.offset??0,'Plane offset'),plane=p.plane||'XY';
 return plane==='XZ'?{origin:[0,-o,0],x:[1,0,0],normal:[0,-1,0]}:plane==='YZ'?{origin:[o,0,0],x:[0,1,0],normal:[1,0,0]}:{origin:[0,0,o],x:[1,0,0],normal:[0,0,1]};
}
export function validateProject(doc){
 validateVisualization(doc?.ui?.visualization);
 if(!doc||doc.format!=='reqoo-cad'||doc.version!==1||!Array.isArray(doc.features)||doc.features.length>MAX_PROJECT_FEATURES)throw Error('Not a supported Reqoo CAD project');
 if(doc.title!==undefined&&(typeof doc.title!=='string'||doc.title.length>80))throw Error('Invalid project title');
 if(doc.ui!==undefined){if(!doc.ui||typeof doc.ui!=='object'||Array.isArray(doc.ui))throw Error('Invalid appearance');if(doc.ui.hidden!==undefined&&(!Array.isArray(doc.ui.hidden)||doc.ui.hidden.some(id=>typeof id!=='string')))throw Error('Invalid hidden items');if(doc.ui.colors!==undefined&&(!doc.ui.colors||typeof doc.ui.colors!=='object'||Array.isArray(doc.ui.colors)||Object.values(doc.ui.colors).some(c=>typeof c!=='string'||!/^#[a-fA-F0-9]{6}$/.test(c))))throw Error('Invalid colours');}
 if(doc.ui?.smartDimensions!==undefined){const pins=doc.ui.smartDimensions;if(!Array.isArray(pins)||pins.length>40||pins.some(p=>!p||typeof p.id!=='string'||typeof p.target!=='string'||p.source!==null&&typeof p.source!=='string'||typeof p.from!=='string'||typeof p.to!=='string'||!['reference','driving'].includes(p.kind)||!['horizontal','vertical','distance'].includes(p.mode)||p.labelOffset!==undefined&&(!Array.isArray(p.labelOffset)||p.labelOffset.length!==2||p.labelOffset.some(v=>!Number.isFinite(v)||Math.abs(v)>20000))))throw Error('Invalid pinned dimensions');}
 if(doc.ui?.dimensionsVisible!==undefined&&typeof doc.ui.dimensionsVisible!=='boolean')throw Error('Invalid dimension visibility');
 const ids=new Set();for(const f of doc.features){if(!f||!TYPES.includes(f.type)||typeof f.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(f.id)||ids.has(f.id))throw Error('Invalid or repeated history feature');ids.add(f.id);if(!f.params||typeof f.params!=='object'||Array.isArray(f.params))throw Error('Invalid feature settings');if(!Array.isArray(f.inputs)||f.inputs.some(v=>typeof v!=='string'||v.length>100))throw Error('Invalid feature references');}
 if(JSON.stringify(doc).length>24e6)throw Error('Project is too large');
 return doc;
}
function signedArcHeight(value){const h=number(value,'Arc height',-1000,1000);if(Math.abs(h)<.001)throw Error('Arc height must be non-zero');return h;}
export function profile(p){
 const x=number(p.x??0,'Sketch X'),y=number(p.y??0,'Sketch Y');let d;
 if(p.serializedDrawing)d=R.deserializeDrawing(p.serializedDrawing);
 else if(p.shape==='annulus'){const outer=number(p.radius,'Outer radius',.01,1000),inner=number(p.innerRadius,'Inner radius',.001,999);if(inner>=outer)throw Error('Inner radius must be smaller than outer radius');d=R.drawCircle(outer).cut(R.drawCircle(inner));}
 else if(p.shape==='text'){
  const text=p.text;if(typeof text!=='string'||!text.trim()||text.length>60)throw Error('Enter 1–60 text characters');
  const font=R.getFont(SKETCH_FONT);if(!font)throw Error('Sketch text font is unavailable');if([...text].some(c=>!(/\s/.test(c))&&!font.charToGlyph(c).index))throw Error('The sketch font does not support one of these characters');
  d=R.drawText(text,{fontSize:10,fontFamily:SKETCH_FONT});const box=d.boundingBox;if(box.height<1e-7)throw Error('Text has no visible outlines');d=d.translate([-box.bounds[0][0],-box.bounds[0][1]]).scale(number(p.height??10,'Text height',.5,200)/box.height,[0,0]).rotate(number(p.angle??0,'Text angle',-3600,3600));
 }
 else if(p.shape==='circle')d=R.drawCircle(number(p.radius,'Radius',.01,1000));
 else if(p.shape==='ellipse')d=R.drawEllipse(number(p.width,'Width',.02,2000)/2,number(p.height,'Height',.02,2000)/2);
 else if(p.shape==='polygon'){const sides=number(p.sides,'Sides',3,64);if(!Number.isInteger(sides))throw Error('Sides must be an integer');d=R.drawPolysides(number(p.radius,'Radius',.01,1000),sides);}
 else if(p.shape==='polyline'||p.shape==='spline'||p.shape==='arc'){
  const pts=p.shape==='polyline'?solveSketch(p.points,p.constraints||[]).points:p.points;if(!Array.isArray(pts)||pts.length<2||pts.length>100||pts.some(q=>!Array.isArray(q)||q.length!==2||q.some(v=>!Number.isFinite(v)||Math.abs(v)>2000)))throw Error('Use 2–100 finite sketch points');
  if(p.closed!==false&&pts.length<3)throw Error('A closed profile needs at least three points');
  if(p.shape==='spline'){if(p.splineMode!==undefined&&!['Fit','Control'].includes(p.splineMode))throw Error('Choose Fit or Control spline');d=p.splineMode==='Control'?controlSplineDrawing(pts,p.closed!==false):R.drawPointsInterpolation(pts,{}, {closeShape:p.closed!==false});}
  else{let pen=R.draw(pts[0]);if(p.shape==='arc')pen=pen.sagittaArc(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1],signedArcHeight(p.sagitta??10));else for(const q of pts.slice(1))pen=pen.lineTo(q);d=p.closed===false?pen.done():pen.close();}
 }else d=R.drawRectangle(number(p.width,'Width',.02,2000),number(p.height,'Height',.02,2000));
 if(p.operations!==undefined){if(!Array.isArray(p.operations)||p.operations.length>20)throw Error('Too many derived sketch operations');for(const op of p.operations){if(op.type==='offset')d=d.offset(number(op.distance,'Sketch offset',-500,500));else if(op.type==='fillet')d=d.fillet(number(op.radius,'Sketch fillet radius',.001,500));else if(op.type==='mirror')d=d.mirror(op.axis==='X'?[1,0]:[0,1],[0,0],'plane');else throw Error('Unsupported sketch operation');}}
 return d.translate([x,y]);
}
function normalizeSketch(result){
 if(!result)throw Error('Sketch contains no usable curves');
 if(result instanceof R.Sketches){
  result.sketches=result.sketches.map(normalizeSketch);if(result.sketches.length===1)return result.sketches[0];
  let wires=null;result.face=()=>result.faces();Object.defineProperty(result,'wire',{get:()=>wires||(wires=result.wires())});result.delete=()=>{wires?.delete();wires=null;result.sketches.forEach(s=>s.delete());};
 }else if(result instanceof R.CompoundSketch){let wires=null;const dispose=result.delete.bind(result);Object.defineProperty(result,'wire',{get:()=>wires||(wires=result.wires)});result.delete=()=>{wires?.delete();wires=null;dispose();};}
 return result;
}
function sketch(p){if(p.nativeSketch)return normalizeSketch(p.nativeSketch.clone?p.nativeSketch.clone():new R.CompoundSketch(p.nativeSketch.sketches.map(s=>s.clone())));const b=basis(p),plane=new R.Plane(b.origin,b.x,b.normal);try{return normalizeSketch(profile(p).sketchOnPlane(plane));}finally{plane.delete();}}

function sketchEdgeEnds(edge){const owned=[],keep=v=>(owned.push(v),v);try{const start=keep(edge.startPoint),end=keep(edge.endPoint),a=keep(edge.tangentAt(0)),b=keep(edge.tangentAt(1));return{start:start.toTuple(),end:end.toTuple(),startTangent:a.toTuple(),endTangent:b.toTuple()};}catch{return{};}finally{owned.forEach(v=>v.delete());}}

function volume(s){const v=R.measureShapeVolumeProperties(s);const value=Math.abs(v.volume);v.delete();return value;}
function length(s){const p=R.measureShapeLinearProperties(s);const v=p.length;p.delete();return v;}
function area(s){const v=R.measureShapeSurfaceProperties(s);const value=Math.abs(v.area);v.delete();return value;}

function faceDescriptor(shape,f){const n=f.normalAt(),c=f.center,normal=n.toTuple(),len=Math.hypot(...normal),center=c.toTuple();n.delete();c.delete();const wires=f.wires,loops=wires.map(w=>{const edges=w.edges;try{return edges.map(e=>e.geomType).sort().join(',');}finally{edges.forEach(e=>e.delete());}}).sort();wires.forEach(w=>w.delete());const bounds=shape.boundingBox.bounds,scale=Math.max(1e-7,bounds[0].reduce((sum,v,i)=>sum+(bounds[1][i]-v)**2,0));return{kind:'face',type:f.geomType,center:normalizedCenter(bounds,center),normal:normal.map(v=>v/(len||1)),loops:loops.join('|'),measure:area(f)/scale};}
function edgeDescriptor(shape,e){const bounds=shape.boundingBox.bounds,edgeBounds=e.boundingBox.bounds;return{kind:'edge',type:e.geomType,center:normalizedCenter(bounds,e.boundingBox.center),span:edgeBounds[0].map((v,i)=>(edgeBounds[1][i]-v)/Math.max(1e-7,bounds[1][i]-bounds[0][i])),measure:e.length/Math.max(1e-7,Math.hypot(...bounds[0].map((v,i)=>bounds[1][i]-v)))};}



export async function buildModel(doc,{base=null,preview=false,onProgress=()=>{}}={}){
 validateProject(doc);if(doc.features.some(f=>!f.suppressed&&f.type==='sketch'&&f.params.shape==='text'))await ensureSketchFont();doc=resolveDimensionDocument(doc,basis);const shapes=new Map(),profiles=new Map(),meta=new Map(),visible=new Set(),arena=new Set();let released=false,currentFeature=null,featureFrame=WORLD_AXES;
 const reuse=base&&base.featureCount<=doc.features.length&&base.featureSignature===JSON.stringify(doc.features.slice(0,base.featureCount));
 if(reuse){for(const [k,v]of base.shapes)shapes.set(k,v);for(const [k,v]of base.profiles)profiles.set(k,v);for(const [k,v]of base.meta)meta.set(k,v);for(const k of base.visible)visible.add(k);}
 const metrics={reusedFeatures:reuse?base.featureCount:0,builtFeatures:0,meshedItems:0};
 const own=s=>{arena.add(s);return s;},release=()=>{if(released)return;released=true;for(const s of arena)try{s.delete();}catch{}};
 function consume(id){visible.delete(id);const m=meta.get(id),host=m?.regionParent||(m?.regionHost?id:null);if(host)for(const [key,value]of meta)if(key===host||value.regionParent===host)visible.delete(key);}
 function body(id){const s=shapes.get(id);if(!s||meta.get(id)?.kind!=='body')throw Error('Select a solid body');return s;}
 function clone(id){return own(body(id).clone());}
 function face(s,p){const faces=s.faces;for(const f of faces)own(f);const i=resolveReference(p.faceRef,faces.map(f=>faceDescriptor(s,f)),p.face);return faces[i];}
 function save(f,s,kind='body',id=f.id,name=f.name||f.type){own(s);if(s.isNull)throw Error('Empty shape');if(kind==='body'&&(!R.isShape3D(s)||volume(s)<1e-8))throw Error('Operation did not create a closed solid');shapes.set(id,s);meta.set(id,{id,name,kind,featureId:f.id,...(kind==='body'?{imprintProfiles:[...new Set(f.inputs.flatMap(id=>meta.get(id)?.imprintProfiles||[]))]}:{}),localFrame:featureFrame.map(v=>[...v])});visible.add(id);}
 try{
 for(const f of doc.features.slice(reuse?base.featureCount:0)){currentFeature=f;onProgress({phase:'feature',index:doc.features.indexOf(f)+1,total:doc.features.length,name:f.name||f.type});metrics.builtFeatures++;if(f.suppressed)continue;const p=f.params,ins=f.inputs;featureFrame=meta.get(ins[0])?.localFrame||WORLD_AXES;let s=null,kind='body';
  if(f.type==='sketch'){const b=basis(p),x=b.x,n=b.normal;featureFrame=[x,[n[1]*x[2]-n[2]*x[1],n[2]*x[0]-n[0]*x[2],n[0]*x[1]-n[1]*x[0]],n];profiles.set(f.id,p);const sk=sketch(p);s=own(p.closed===false||p.construction?sk.wire.clone():sk.face());sk.delete();save(f,s,'sketch');continue;}
  if(['sketchMirror','sketchChamfer','sketchFillet','sketchPattern','sketchTransform','sketchProject'].includes(f.type)){
   if(!ins.length)throw Error('Select source geometry');let index=0;
   for(const input of ins){
    const original=profiles.get(input),frame=f.type==='sketchProject'||p.basis?basis(p):original?basis(original):null;if(!frame)throw Error('Select sketch profiles');
    let drawing;
    if(f.type==='sketchProject'){
     const source=shapes.get(input);if(!source)throw Error('Projection source is unavailable');const reference=p.faces?.[input];drawing=projectedSketchDrawing(reference?face(source,reference):source,frame);
    }else drawing=original.nativeSketch?nativePlanarDrawing(shapes.get(input),frame):drawingInFrame(profile(original),basis(original),frame);
    const drawings=f.type==='sketchProject'?[drawing]:derivedSketchDrawings(f.type,p,drawing);
    for(const d of drawings){const id=index?f.id+'_part'+index:f.id,recipe={shape:'profile',closed:drawingIsClosed(d),construction:!!original?.construction,basis:frame,serializedDrawing:d.serialize(),x:0,y:0,operations:[],constraints:[]},sk=sketch(recipe);try{profiles.set(id,recipe);save(f,recipe.closed&&!recipe.construction?sk.face():sk.wire.clone(),'sketch',id,index?(f.name||f.type)+' '+(index+1):f.name||f.type);}finally{sk.delete();}index++;}
    if(!p.keepInputs&&f.type!=='sketchProject')consume(input);
   }
   continue;
  }
  if(f.type==='sketchTrim'){
   const original=profiles.get(ins[0]);if(!original)throw Error('Trim source no longer exists');const frame=basis(original),y=[frame.normal[1]*frame.x[2]-frame.normal[2]*frame.x[1],frame.normal[2]*frame.x[0]-frame.normal[0]*frame.x[2],frame.normal[0]*frame.x[1]-frame.normal[1]*frame.x[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
   const drawing=id=>{const recipe=profiles.get(id);if(!recipe)throw Error('Trim boundary no longer exists');const b=basis(recipe),delta=b.origin.map((v,i)=>v-frame.origin[i]);if(Math.abs(dot(b.normal,frame.normal))<.999999||Math.abs(dot(delta,frame.normal))>1e-5)throw Error('Trim curves must lie on the same sketch plane');
    if(recipe.nativeSketch)return nativePlanarDrawing(shapes.get(id),frame);
    let d=profile(recipe);if(dot(b.normal,frame.normal)<0)d=d.mirror([1,0],[0,0],'plane');return d.rotate(Math.atan2(dot(b.x,y),dot(b.x,frame.x))*180/Math.PI).translate([dot(delta,frame.x),dot(delta,y)]);
   };
   const parts=trimDrawing(drawing(ins[0]),ins.slice(1).map(drawing),p.point,number(p.tolerance??.1,'Trim hit tolerance',.000001,100));
   parts.forEach((part,index)=>{const id=index?f.id+'_part'+index:f.id,recipe={...part,basis:frame,construction:!!original.construction};profiles.set(id,recipe);const sk=sketch(recipe);try{save(f,recipe.closed&&!recipe.construction?sk.face():sk.wire.clone(),'sketch',id,index?'Trim segment '+(index+1):f.name||'Trim');}finally{sk.delete();}});consume(ins[0]);continue;
  }
  if(f.type==='sketchProfile'){if(ins.length<2||ins.length>25)throw Error('Choose two or more closed sketches');const recipes=ins.map(id=>profiles.get(id));if(recipes.some(p=>!p||p.closed===false||p.construction||p.nativeSketch))throw Error('Profile needs closed planar sketch recipes');const first=basis(recipes[0]);if(recipes.some(p=>{const b=basis(p);return b.origin.some((v,i)=>Math.abs(v-first.origin[i])>1e-6)||b.x.some((v,i)=>Math.abs(v-first.x[i])>1e-6)||b.normal.some((v,i)=>Math.abs(v-first.normal[i])>1e-6);}))throw Error('Choose profiles on the same sketch plane');const operation=p.operation||'Join';if(!['Join','Cut','Intersect'].includes(operation))throw Error('Invalid profile operation');let drawing=profile(recipes[0]);for(const recipe of recipes.slice(1))drawing=operation==='Join'?drawing.fuse(profile(recipe)):operation==='Cut'?drawing.cut(profile(recipe)):drawing.intersect(profile(recipe));const recipe={shape:'profile',closed:true,basis:first,serializedDrawing:drawing.serialize()};profiles.set(f.id,recipe);const sk=sketch(recipe);try{save(f,sk.face(),'sketch');}finally{sk.delete();}if(!p.keepInputs)for(const id of ins)consume(id);continue;}
  if(f.type==='faceSketch'){const source=body(ins[0]),selected=face(source,p);if(selected.geomType!=='PLANE')throw Error('Offset Sketch needs a planar face');const d=number(p.distance??0,'Sketch offset',-500,500),normal=own(selected.normalAt()).toTuple(),origin=own(selected.center).toTuple(),seed=Math.abs(normal[0])<.9?[1,0,0]:[0,1,0],dot=seed.reduce((sum,v,i)=>sum+v*normal[i],0),x=seed.map((v,i)=>v-dot*normal[i]),len=Math.hypot(...x);for(let i=0;i<3;i++)x[i]/=len;
   const wires=selected.wires.map(own),outer=own(selected.outerWire()),loops=[];
   const offsetLoop=(wire,delta)=>{if(Math.abs(delta)<1e-8)return new R.Sketch(wire.clone(),{defaultOrigin:origin,defaultDirection:normal});const base=own(R.makeFace(wire.clone())),area=R.measureArea(base);let candidate=null;for(const signed of [delta,-delta]){candidate=R.sketchFaceOffset(base.clone(),signed);const candidateFace=own(candidate.face()),nextArea=R.measureArea(candidateFace);if((nextArea-area)*delta>1e-8){const result=new R.Sketch(candidate.wire.clone(),{defaultOrigin:origin,defaultDirection:normal});candidate.delete();return result;}candidate.delete();}throw Error('Offset Sketch would collapse or invert a contour');};
   loops.push(offsetLoop(outer,d));for(const wire of wires){if(wire.isSame(outer))continue;loops.push(offsetLoop(wire,-d));}
   const native=own(loops.length===1?loops[0]:new R.CompoundSketch(loops)),recipe={shape:'faceOutline',closed:true,basis:{origin,x,normal},nativeSketch:native};profiles.set(f.id,recipe);featureFrame=[x,[normal[1]*x[2]-normal[2]*x[1],normal[2]*x[0]-normal[0]*x[2],normal[0]*x[1]-normal[1]*x[0]],normal];save(f,native.face(),'sketch');continue;
  }
  if(f.type==='sketchOffset'&&ins.length>1){
   if(p.mode==='Single')throw Error('Single offset needs one sketch edge');
   const recipes=ins.map(id=>profiles.get(id));if(recipes.some(r=>!r||r.nativeSketch||r.construction))throw Error('Choose editable sketch curves');
   const plane=basis(recipes[0]);if(recipes.some(r=>JSON.stringify(basis(r))!==JSON.stringify(plane)))throw Error('Choose sketch curves on the same plane');
   const drawing=joinedOffsetDrawing(recipes.map(profile)),closed=drawing.blueprint.isClosed(),distance=number(p.distance,'Offset distance',-500,500);
   if(Math.abs(distance)<1e-7)throw Error('Enter a non-zero offset distance');
   if(closed){const source=drawing.sketchOnPlane(new R.Plane(plane.origin,plane.x,plane.normal));let native;try{const face=own(source.face());native=own(R.sketchFaceOffset(face,distance));}finally{source.delete();}profiles.set(f.id,{shape:'chain',closed:true,basis:plane,nativeSketch:native});save(f,native.face(),'sketch');}
   else{const source=drawing.sketchOnPlane(new R.Plane(plane.origin,plane.x,plane.normal));let native;try{native=own(offsetOpenChain(source,distance,plane));}finally{source.delete();}profiles.set(f.id,{shape:'chain',closed:false,basis:plane,nativeSketch:native});save(f,native.wire.clone(),'sketch');}if(!p.keepInputs)ins.forEach(consume);continue;
  }
  if(f.type==='sketchOffset'){let original=profiles.get(ins[0]);if(f.type==='sketchOffset'&&original&&!original.nativeSketch&&(original.serializedDrawing||['arc','spline','ellipse'].includes(original.shape)))original={...original,nativeSketch:own(sketch(original))};if(original?.nativeSketch&&f.type==='sketchOffset'){const distance=number(p.distance,'Offset distance',-500,500);if(p.mode==='Single'&&original.closed!==false)throw Error('Choose Chain for this closed sketch');if(Math.abs(distance)<1e-7)throw Error('Enter a non-zero offset distance');let native;if(original.closed===false)native=own(offsetOpenChain(original.nativeSketch,distance,basis(original)));else{const face=own(original.nativeSketch.face()),loops=face.wires,hasHoles=loops.length>1;loops.forEach(w=>w.delete());if(hasHoles)throw Error('Offset contours with holes separately');native=own(R.sketchFaceOffset(face,distance));}profiles.set(f.id,{...original,nativeSketch:native});save(f,original.closed===false?native.wire.clone():native.face(),'sketch');if(!p.keepInputs)consume(ins[0]);continue;}if(original?.nativeSketch)throw Error('Edit the original sketch in History');if(!original)throw Error('Select a sketch first');const op=f.type==='sketchOffset'?{type:'offset',distance:number(p.distance,'Offset distance',-500,500)}:f.type==='sketchFillet'?{type:'fillet',radius:number(p.radius,'Corner radius',.001,500)}:{type:'mirror',axis:p.axis==='X'?'X':'Y'};
  const directOffset=f.type==='sketchOffset'&&(original.shape==='polyline'&&original.closed===false||p.mode==='Single'&&['polyline','rectangle'].includes(original.shape));
  const source=directOffset&&original.shape==='polyline'&&original.constraints?.length?{...original,points:solveSketch(original.points,original.constraints).points,constraints:[]}:original;
  const recipe=directOffset?{...original,...offsetSketchPolyline(source,op.distance,{mode:p.mode||'Chain',edgeIndex:p.edgeIndex??0}),operations:[]}:{...original,operations:[...(original.operations||[]),op]};
  profiles.set(f.id,recipe);const sk=sketch(recipe);s=own(recipe.closed===false||recipe.construction?sk.wire.clone():sk.face());sk.delete();save(f,s,'sketch');
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
  if(f.type==='imprint'){const host=body(ins[0]),entries=ins.slice(1).map(id=>{const recipe=profiles.get(id);if(!recipe||recipe.closed===false||recipe.construction)throw Error('Face regions need closed non-construction sketches');return{id,shape:shapes.get(id),plane:basis(recipe)};});if(!entries.length)throw Error('Choose at least one closed sketch');const result=imprintPlanarRegions(host,entries);save(f,result.shape);meta.set(f.id,{...meta.get(f.id),imprintProfiles:[...new Set([...(meta.get(ins[0])?.imprintProfiles||[]),...result.used])]});consume(ins[0]);continue;}
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
  else if(f.type==='extrude'&&p.profileIds!==undefined){
   const ids=p.profileIds,mode=p.operation||'New body',distance=number(p.distance,'Distance');if(!Array.isArray(ids)||!ids.length||ids.length>25||new Set(ids).size!==ids.length||ids.some(id=>!ins.includes(id))||Math.abs(distance)<.001)throw Error('Choose up to 25 distinct closed profiles and a non-zero distance');
   if(!['New body','Add','Subtract','Intersect'].includes(mode))throw Error('Invalid extrude operation');const extrusions=[];
   for(const id of ids){const recipe=profiles.get(id);if(!recipe||recipe.closed===false||recipe.construction)throw Error('Extrude needs closed non-construction profiles');const sk=sketch(recipe);let solid;try{solid=own(sk.extrude(distance));}finally{sk.delete();}extrusions.push(own(solid.simplify()));}
   if(mode==='New body'){for(const [i,solid]of extrusions.entries()){featureFrame=meta.get(ids[i])?.localFrame||WORLD_AXES;save(f,solid,'body',f.id+':'+i,(f.name||'Extrude')+' · '+(i+1));}}
   else{if(!p.target||!ins.includes(p.target)||ids.includes(p.target))throw Error('Choose a target body');const target=body(p.target),tool=own(extrusions.length===1?extrusions[0].clone():R.makeCompound(extrusions));const result=mode==='Add'?target.fuse(tool):mode==='Subtract'?target.cut(tool):target.intersect(tool);featureFrame=meta.get(p.target)?.localFrame||WORLD_AXES;save(f,result);if(!p.keepInputs)consume(p.target);}
   if(!p.keepInputs)for(const id of ids)consume(id);continue;
  }
  else if(f.type==='extrude'||f.type==='revolve'||f.type==='sweep'||f.type==='loft'){
   const a=profiles.get(ins[0]);if(!a&&!(f.type==='extrude'&&shapes.has(ins[0])&&p.face!==undefined))throw Error('Select a sketch profile');
   if(f.type==='extrude'){if(a?.closed===false||a?.construction)throw Error('Extrude needs a closed, non-construction profile');const distance=number(p.distance,'Distance');if(Math.abs(distance)<.001)throw Error('Distance must not be zero');
 if(a){const extruded=own(sketch(a).extrude(distance));s=extruded.simplify();}else{const source=body(ins[0]),selected=face(source,p),raw=selected.normalAt(),n=raw.normalized(),v=n.multiply(distance);s=R.basicFaceExtrusion(selected,v);v.delete();n.delete();raw.delete();}
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
  else if(f.type==='thread'){const b=body(ins[0]),selected=face(b,p);if(p.mode==='Cosmetic'){const cylinder=cylinderInfo(selected);if(!cylinder?.full)throw Error('Select a complete cylindrical side face for Thread');threadDimensions(p,cylinder);s=clone(ins[0]);}else{s=cutThread(b,selected,p);}}
  else if(f.type==='shell'){const b=clone(ins[0]),selected=face(b,p);s=b.shell({thickness:number(p.thickness,'Wall thickness',.01,500),filter:new R.FaceFinder().inList([selected])});}
  else if(f.type==='draft'){const b=clone(ins[0]),selected=face(b,p),pl=new R.Plane(basis(p).origin,basis(p).x,basis(p).normal);s=b.draft(number(p.angle,'Draft angle',-75,75),(finder)=>finder.inList([selected]),pl);pl.delete();}
  else if(f.type==='offsetFace'){const b=clone(ins[0]),selected=face(b,p);if(selected.geomType!=='PLANE')throw Error('Offset Face currently supports planar faces');const d=number(p.distance,'Distance'),rawNormal=selected.normalAt(),n=rawNormal.normalized(),v=new R.Vector(n.toTuple()).multiply(d),prism=own(R.basicFaceExtrusion(selected,v));v.delete();n.delete();rawNormal.delete();s=d>0?b.fuse(prism):b.cut(prism);}
  else if(f.type==='move'||f.type==='duplicate'){s=clone(ins[0]).translate([number(p.x??0,'X'),number(p.y??0,'Y'),number(p.z??0,'Z')]);}
  else if(f.type==='rotate'){const angle=number(p.angle,'Angle',-3600,3600),axis=p.axisVector||p.axis||'Z',center=p.center||[0,0,0];if(Array.isArray(axis)){if(axis.length!==3||!axis.every(Number.isFinite)||Math.hypot(...axis)<1e-9)throw Error('Choose a valid rotation axis');}else if(!['X','Y','Z'].includes(axis))throw Error('Choose X, Y or Z');if(!Array.isArray(center)||center.length!==3||!center.every(Number.isFinite))throw Error('Choose a valid rotation pivot');s=clone(ins[0]).rotate(angle,center,axis);featureFrame=rotateFrame(featureFrame,angle,axis);}
  else if(f.type==='scale'){const center=p.center??[0,0,0];if(!Array.isArray(center)||center.length!==3||!center.every(Number.isFinite))throw Error('Scale needs a finite XYZ centre');s=clone(ins[0]).scale(number(p.factor,'Scale',.001,100),center);}
  else if(f.type==='mirror'){const plane=['XY','XZ','YZ'].includes(p.plane)?p.plane:'YZ',axis={XY:2,XZ:1,YZ:0}[plane];s=clone(ins[0]).mirror(plane);featureFrame=featureFrame.map((v,i)=>v.map((n,k)=>n*(k===axis?-1:1)*(i===2?-1:1)));}
  else if(f.type==='align'){
   if(ins.length!==2||ins[0]===ins[1])throw Error('Choose two different solid parts');let a=clone(ins[0]);const b=body(ins[1]);
   if(p.method==='concentric'){
    const source=face(a,{face:p.sourceFace,faceRef:p.sourceFaceRef}),target=face(b,{face:p.targetFace,faceRef:p.targetFaceRef}),placement=concentricPlacement(cylinderInfo(source),cylinderInfo(target),p);
    if(placement.angle>1e-7){a=own(a.rotate(placement.angle,placement.pivot,placement.axis));featureFrame=rotateFrame(featureFrame,placement.angle,placement.axis);}
    if(Math.abs(placement.twist)>1e-7){a=own(a.rotate(placement.twist,placement.pivot,placement.direction));featureFrame=rotateFrame(featureFrame,placement.twist,placement.direction);}
    s=a.translate(placement.delta);
   }else if(p.method==='faces'){
    const source=face(a,{face:p.sourceFace,faceRef:p.sourceFaceRef}),target=face(b,{face:p.targetFace,faceRef:p.targetFaceRef});if(source.geomType!=='PLANE'||target.geomType!=='PLANE')throw Error('Face alignment needs two planar faces');
    const vectors=[source.normalAt(),target.normalAt(),source.center,target.center],tuple=v=>v.toTuple(),[ns,nt,cs,ct]=vectors.map(tuple);for(const v of vectors)v.delete();
    const normalize=v=>{const length=Math.hypot(...v);return v.map(x=>x/length);},cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],n=normalize(ns),desired=normalize(nt).map(v=>-v),dot=Math.max(-1,Math.min(1,n.reduce((sum,v,i)=>sum+v*desired[i],0)));let axis=cross(n,desired);
    if(dot<1-1e-10){if(Math.hypot(...axis)<1e-8)axis=cross(n,Math.abs(n[0])<.9?[1,0,0]:[0,1,0]);a=own(a.rotate(Math.acos(dot)*180/Math.PI,cs,normalize(axis)));featureFrame=rotateFrame(featureFrame,Math.acos(dot)*180/Math.PI,normalize(axis));}
    const gap=number(p.gap??0,'Face gap'),normal=normalize(nt),delta=ct.map((v,i)=>v+normal[i]*gap-cs[i]);s=a.translate(delta);
   }else s=a.translate(alignmentDelta(a.boundingBox.bounds,b.boundingBox.bounds,{axis:p.axis||'X',sourceAnchor:p.sourceAnchor||'centre',targetAnchor:p.targetAnchor||'centre'}));
  }
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
 onProgress({phase:'mesh',total:visible.size});
 for(const [id,m]of meta){if(!visible.has(id))continue;if(reuse&&base.shapes.get(id)===shapes.get(id)){const cached=base.items.find(i=>i.id===id);if(cached){items.push(cached);continue;}}metrics.meshedItems++;onProgress({phase:'mesh',index:metrics.meshedItems,total:visible.size,name:m.name});const s=shapes.get(id),faces=s.faces,edges=s.edges;for(const f of faces)own(f);for(const e of edges)own(e);
  const cacheKey='mesh-'+(++meshSerial);
  const faceMesh=m.kind==='axis'||(m.kind==='sketch'&&(profiles.get(id)?.closed===false||profiles.get(id)?.construction))?{triangles:[],vertices:[],normals:[],faceGroups:[]}:s.mesh({tolerance:preview?.12:.02,angularTolerance:preview?.2:.08});
  const groups=faceMesh.faceGroups.map(g=>({...g,faceIndex:faces.findIndex(f=>f.hashCode===g.faceId)}));
  const edgeFaces=new Map();faces.forEach((f,j)=>{for(const e of f.edges){own(e);const key=e.hashCode;if(!edgeFaces.has(key))edgeFaces.set(key,[]);edgeFaces.get(key).push(j);}});
  const lineMeshes=edges.slice(0,600).map((e,i)=>({index:i,cacheKey:cacheKey+':edge:'+i,...(m.kind==='sketch'?sketchEdgeEnds(e):{}),faceIndices:edgeFaces.get(e.hashCode)||[],length:length(e),type:e.geomType,reference:edgeDescriptor(s,e),center:e.boundingBox.center,lines:e.meshEdges({tolerance:preview?.12:.02,angularTolerance:preview?.2:.08}).lines}));
  const bb=s.boundingBox.bounds;
  items.push({...m,construction:profiles.get(id)?.construction||false,sketchPlane:profiles.has(id)?basis(profiles.get(id)):null,profileClosed:profiles.has(id)?profiles.get(id).closed!==false&&!profiles.get(id).construction:null,mesh:{...faceMesh,cacheKey,faceGroups:groups},edges:lineMeshes,faceInfo:faces.map((f,i)=>{let normal=[0,0,1],center=[0,0,0];try{const n=f.normalAt(),c=f.center;const len=Math.hypot(...n.toTuple());normal=n.toTuple().map(v=>v/(len||1));center=c.toTuple();n.delete();c.delete();}catch{}return{index:i,type:f.geomType,normal,center,cylinder:cylinderInfo(f),reference:faceDescriptor(s,f),area:area(f)};}),edgeCount:edges.length,bounds:bb,volume:m.kind==='body'?volume(s):0,area:m.kind==='body'||faces.length?area(s):0});
 }
 if(items.filter(i=>i.kind==='body').length>MAX_NATIVE_BODIES)throw Error('Limit is '+MAX_NATIVE_BODIES+' native bodies');
 return{items,shapes,profiles,meta,visible,metrics,exportSketch:(id,format)=>{const recipe=profiles.get(id);if(!recipe)throw Error('Select a sketch');return exportCurveDrawing(recipe.nativeSketch?nativePlanarDrawing(shapes.get(id),basis(recipe)):profile(recipe),format);},transferOwnershipTo(target){if(released)throw Error('Native cache has been released');for(const shape of arena)target.add(shape);arena.clear();released=true;},adoptBase(){if(reuse&&base){base.transferOwnershipTo(arena);base=null;}},featureCount:doc.features.length,featureSignature:JSON.stringify(doc.features),release,export:async(format,ids)=>{
  const chosen=(ids?.length?ids:[...visible]).map(id=>{if(meta.get(id)?.kind!=='body')throw Error('Export needs solid bodies');return shapes.get(id);});
  if(!chosen.length)throw Error('Select a solid body to export');const combined=chosen.length===1?chosen[0]:own(R.makeCompound(chosen.map(s=>own(s.clone()))));
  return format==='step'?combined.blobSTEP():combined.blobSTL({binary:true,tolerance:.03,angularTolerance:.1});
 },distance:(a,b)=>{const resolve=ref=>{if(typeof ref==='string')return body(ref);const shape=shapes.get(ref.id);if(!shape)throw Error('Selection no longer exists');if(ref.kind==='face'||ref.kind==='edge'){const list=ref.kind==='face'?shape.faces:shape.edges;for(const v of list)own(v);if(!Number.isInteger(ref.index)||!list[ref.index])throw Error('Selected geometry no longer exists');return list[ref.index];}return shape;};return R.measureDistanceBetween(resolve(a),resolve(b));}};
 }catch(error){release();if(error instanceof Error)error.message=(currentFeature?.name||currentFeature?.type||'Model')+': '+error.message;throw error;}
}
