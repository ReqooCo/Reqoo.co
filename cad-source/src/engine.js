import * as R from 'replicad';
export const TYPES=['sketch','box','cylinder','sphere','torus','extrude','revolve','loft','sweep','union','subtract','intersect','fillet','chamfer','shell','offsetFace','move','rotate','scale','mirror','pattern','circularPattern','duplicate','align','split','import','plane','axis','delete'];
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
 if(p.shape==='circle')d=R.drawCircle(number(p.radius,'Radius',.01,1000));
 else if(p.shape==='ellipse')d=R.drawEllipse(number(p.width,'Width',.02,2000)/2,number(p.height,'Height',.02,2000)/2);
 else if(p.shape==='polygon'){const sides=number(p.sides,'Sides',3,64);if(!Number.isInteger(sides))throw Error('Sides must be an integer');d=R.drawPolysides(number(p.radius,'Radius',.01,1000),sides);}
 else if(p.shape==='polyline'||p.shape==='spline'||p.shape==='arc'){
  const pts=p.points;if(!Array.isArray(pts)||pts.length<2||pts.length>100||pts.some(q=>!Array.isArray(q)||q.length!==2||q.some(v=>!Number.isFinite(v)||Math.abs(v)>2000)))throw Error('Use 2–100 finite sketch points');
  if(p.closed!==false&&pts.length<3)throw Error('A closed profile needs at least three points');
  if(p.shape==='spline')d=R.drawPointsInterpolation(pts,{}, {closeShape:p.closed!==false});
  else{let pen=R.draw(pts[0]);if(p.shape==='arc')pen=pen.sagittaArc(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1],number(p.sagitta??10,'Arc height',.01,1000));else for(const q of pts.slice(1))pen=pen.lineTo(q);d=p.closed===false?pen.done():pen.close();}
 }else d=R.drawRectangle(number(p.width,'Width',.02,2000),number(p.height,'Height',.02,2000));
 return d.translate([x,y]);
}
function sketch(p){const b=basis(p);return profile(p).sketchOnPlane(new R.Plane(b.origin,b.x,b.normal));}
function volume(s){const v=R.measureShapeVolumeProperties(s);const value=Math.abs(v.volume);v.delete();return value;}
function length(s){const p=R.measureShapeLinearProperties(s);const v=p.length;p.delete();return v;}
function area(s){const v=R.measureShapeSurfaceProperties(s);const value=Math.abs(v.area);v.delete();return value;}
export async function buildModel(doc){
 validateProject(doc);const shapes=new Map(),profiles=new Map(),meta=new Map(),visible=new Set(),arena=new Set();let released=false;
 const own=s=>{arena.add(s);return s;},release=()=>{if(released)return;released=true;for(const s of arena)try{s.delete();}catch{}};
 function body(id){const s=shapes.get(id);if(!s||meta.get(id)?.kind!=='body')throw Error('Select a solid body');return s;}
 function clone(id){return own(body(id).clone());}
 function face(s,p){const faces=s.faces,i=number(p.face,'Face',0,faces.length-1);if(!Number.isInteger(i))throw Error('Invalid face');for(const f of faces)own(f);return faces[i];}
 function save(f,s,kind='body',id=f.id,name=f.name||f.type){own(s);if(s.isNull)throw Error('Empty shape');if(kind==='body'&&(!R.isShape3D(s)||volume(s)<1e-8))throw Error('Operation did not create a closed solid');shapes.set(id,s);meta.set(id,{id,name,kind,featureId:f.id});visible.add(id);}
 try{
 for(const f of doc.features){const p=f.params,ins=f.inputs;let s=null,kind='body';
  if(f.type==='sketch'){profiles.set(f.id,p);const sk=sketch(p);s=own(p.closed===false?sk.wire.clone():sk.face());sk.delete();save(f,s,'sketch');continue;}
  if(f.type==='delete'){for(const id of ins)visible.delete(id);continue;}
  if(f.type==='plane'){const b=basis(p),pl=new R.Plane(b.origin,b.x,b.normal),sk=R.drawRectangle(80,80).sketchOnPlane(pl);s=sk.face();sk.delete();save(f,s,'plane');continue;}
  if(f.type==='axis'){const x=number(p.x??0,'X'),y=number(p.y??0,'Y'),z=number(p.z??0,'Z'),axis=p.axis||'Z';s=R.makeLine([x,y,z],[x+(axis==='X'?80:0),y+(axis==='Y'?80:0),z+(axis==='Z'?80:0)]);save(f,s,'axis');continue;}
  if(f.type==='box'){const w=number(p.width,'Width',.01,2000),d=number(p.depth,'Depth',.01,2000),h=number(p.height,'Height',.01,2000),x=number(p.x??0,'X'),y=number(p.y??0,'Y'),z=number(p.z??0,'Z');s=R.makeBox([x-w/2,y-d/2,z],[x+w/2,y+d/2,z+h]);}
  else if(f.type==='cylinder')s=R.makeCylinder(number(p.radius,'Radius',.01,1000),number(p.height,'Height',.01,2000),[number(p.x??0,'X'),number(p.y??0,'Y'),number(p.z??0,'Z')],[0,0,1]);
  else if(f.type==='sphere'){const r=number(p.radius,'Radius',.01,1000);s=R.makeSphere(r).translate([number(p.x??0,'X'),number(p.y??0,'Y'),number(p.z??0,'Z')+r]);}
  else if(f.type==='torus'){const r=number(p.radius,'Major radius',.02,1000),t=number(p.tube,'Tube radius',.01,r-.001);s=R.drawCircle(t).translate(r,0).sketchOnPlane('XZ').revolve('Z');s=s.translateZ(t);}
  else if(f.type==='import'){if(typeof p.step!=='string'||p.step.length>20e6||!p.step.includes('ISO-10303-21'))throw Error('Choose a valid STEP file (up to 20 MB)');s=await R.importSTEP(new Blob([p.step]));}
  else if(f.type==='extrude'||f.type==='revolve'||f.type==='sweep'||f.type==='loft'){
   const a=profiles.get(ins[0]);if(!a)throw Error('Select a sketch profile');
   if(f.type==='extrude'){if(a.closed===false)throw Error('Extrude needs a closed profile');const distance=number(p.distance,'Distance');if(Math.abs(distance)<.001)throw Error('Distance must not be zero');s=sketch(a).extrude(distance);}
   else if(f.type==='revolve'){if(a.closed===false)throw Error('Revolve needs a closed profile');s=sketch(a).revolve(p.axis||'Z',{origin:[0,0,0],angle:number(p.angle??360,'Angle',.1,360)});}
   else if(f.type==='loft'){const b=profiles.get(ins[1]);if(!b||a.closed===false||b.closed===false)throw Error('Select two closed sketches at different heights');s=sketch(a).loftWith(sketch(b));}
   else{const r=number(p.radius,'Sweep radius',.01,500);s=sketch(a).sweepSketch((plane)=>R.drawCircle(r).sketchOnPlane(plane));}
  }
  else if(['union','subtract','intersect'].includes(f.type)){
   if(ins.length<2)throw Error('Select at least two solid bodies');s=clone(ins[0]);for(const id of ins.slice(1)){const b=clone(id);s=own(f.type==='union'?s.fuse(b):f.type==='subtract'?s.cut(b):s.intersect(b));}
  }
  else if(['fillet','chamfer'].includes(f.type)){
   const b=clone(ins[0]),r=number(p.radius,'Radius',.001,500),edges=b.edges;for(const e of edges)own(e);
   const chosen=p.allEdges?null:(p.edges||[]).map(i=>{if(!Number.isInteger(i)||!edges[i])throw Error('Selected edge no longer exists');return edges[i].hashCode;});
   if(chosen&&!chosen.length)throw Error('Select an edge, or enable All edges');
   s=b[f.type](chosen?(e=>chosen.includes(e.hashCode)?r:0):r);
  }
  else if(f.type==='shell'){const b=clone(ins[0]),selected=face(b,p);s=b.shell({thickness:number(p.thickness,'Wall thickness',.01,500),filter:new R.FaceFinder().inList([selected])});}
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
  if(!['box','cylinder','sphere','torus','import'].includes(f.type)&&f.type!=='duplicate'&&!p.keepInputs)for(const id of ins)if(f.type!=='align'||id===ins[0])visible.delete(id);
 }
 const items=[];
 for(const [id,m]of meta){if(!visible.has(id))continue;const s=shapes.get(id),faces=s.faces,edges=s.edges;for(const f of faces)own(f);for(const e of edges)own(e);
  const faceMesh=m.kind==='axis'||(m.kind==='sketch'&&profiles.get(id)?.closed===false)?{triangles:[],vertices:[],normals:[],faceGroups:[]}:s.mesh({tolerance:.08,angularTolerance:.2});
  const groups=faceMesh.faceGroups.map(g=>({...g,faceIndex:faces.findIndex(f=>f.hashCode===g.faceId)}));
  const lineMeshes=edges.slice(0,600).map((e,i)=>({index:i,length:length(e),lines:e.meshEdges({tolerance:.08,angularTolerance:.2}).lines}));
  const bb=s.boundingBox.bounds;
  items.push({...m,mesh:{...faceMesh,faceGroups:groups},edges:lineMeshes,faceInfo:faces.map((f,i)=>{let normal=[0,0,1],center=[0,0,0];try{const n=f.normalAt(),c=f.center;const len=Math.hypot(...n.toTuple());normal=n.toTuple().map(v=>v/(len||1));center=c.toTuple();n.delete();c.delete();}catch{}return{index:i,type:f.geomType,normal,center,area:area(f)};}),edgeCount:edges.length,bounds:bb,volume:m.kind==='body'?volume(s):0,area:m.kind==='body'||faces.length?area(s):0});
 }
 if(items.filter(i=>i.kind==='body').length>50)throw Error('Limit is 50 visible bodies');
 return{items,shapes,meta,visible,release,export:async(format,ids)=>{
  const chosen=(ids?.length?ids:[...visible]).map(id=>{if(meta.get(id)?.kind!=='body')throw Error('Export needs solid bodies');return shapes.get(id);});
  if(!chosen.length)throw Error('Select a solid body to export');const combined=chosen.length===1?chosen[0]:own(R.makeCompound(chosen.map(s=>own(s.clone()))));
  return format==='step'?combined.blobSTEP():combined.blobSTL({binary:true,tolerance:.03,angularTolerance:.1});
 },distance:(a,b)=>{const resolve=ref=>{if(typeof ref==='string')return body(ref);const shape=shapes.get(ref.id);if(!shape)throw Error('Selection no longer exists');if(ref.kind==='face'||ref.kind==='edge'){const list=ref.kind==='face'?shape.faces:shape.edges;for(const v of list)own(v);if(!Number.isInteger(ref.index)||!list[ref.index])throw Error('Selected geometry no longer exists');return list[ref.index];}return shape;};return R.measureDistanceBetween(resolve(a),resolve(b));}};
 }catch(error){release();throw error;}
}
