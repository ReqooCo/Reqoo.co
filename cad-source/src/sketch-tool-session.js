import {parameterGeometry} from './parameter-geometry.js';
// One shared geometry gizmo owns all sketch operations. The backing form only
// supplies validation/state; its controls are never displayed as a panel.
export function createSketchToolSession(api){
 const {THREE,stage,gizmo}=api;let session=null;
 const guide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#e6ad55',depthTest:false}));guide.visible=false;guide.renderOrder=39;api.scene.add(guide);
 const dots=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:'#e6ad55',size:7,sizeAttenuation:false,depthTest:false}));dots.visible=false;dots.renderOrder=39;api.scene.add(dots);
 const names={sketchMirror:'Mirror',sketchPattern:'Pattern',sketchProject:'Project',sketchTransform:'Move / Rotate',sketchFillet:'Fillet',sketchChamfer:'Chamfer',text:'Text'};
 const n=(name,label,value,min=-2000,max=2000,unit='mm')=>({name,label,value,min,max,unit,type:'number'}),choice=(name,label,options,value)=>({name,label,options,value,type:'select'});
 const transform=(frame,p)=>{const x=new THREE.Vector3(...frame.x),z=new THREE.Vector3(...frame.normal),y=z.clone().cross(x);return new THREE.Vector3(...frame.origin).addScaledVector(x,p[0]).addScaledVector(y,p[1]);};
 const local=(frame,p)=>{const v=new THREE.Vector3(...p).sub(new THREE.Vector3(...frame.origin)),x=new THREE.Vector3(...frame.x),y=new THREE.Vector3(...frame.normal).cross(x);return[v.dot(x),v.dot(y)];};
 function refs(){const s=session;if(!s)return[];if(s.edit)return s.edit.inputs.map(id=>({id,kind:api.getItems().find(i=>i.id===id)?.kind||'sketch'}));return api.getSelection().filter(r=>s.type==='sketchProject'?['sketch','body','face','edge'].includes(r.kind):r.kind==='sketch');}
 function close(){if(!session)return;session.host.hidden=true;session=null;guide.visible=dots.visible=false;api.end();}
 function controls(type,p){
  if(type==='text')return[{name:'text',label:'Text',type:'text',value:p.text??'REQOO'},n('height','Height',p.height??10,.5,200),n('x','X',p.x??0),n('y','Y',p.y??0),n('angle','Angle',p.angle??0,-3600,3600,'°')];
  if(type==='sketchMirror')return[choice('axisMode','Axis',['Horizontal','Vertical','Custom'],p.axisMode||(p.angle!==undefined?'Custom':p.axis==='Y'?'Vertical':'Horizontal')),n('angle','Angle',p.angle??0,-3600,3600,'°'),n('offset','Axis offset',p.offset??0),{name:'keepInputs',label:'Copy',type:'checkbox',value:p.keepInputs??true}];
  if(type==='sketchTransform')return[n('x','X',p.x??0),n('y','Y',p.y??0),n('angle','Angle',p.angle??0,-3600,3600,'°'),{name:'keepInputs',label:'Copy',type:'checkbox',value:p.keepInputs??false}];
  if(type==='sketchFillet'||type==='sketchChamfer')return[choice('corners','Corners',['Pick corner','All corners'],p.corner?'Pick corner':'All corners'),n('radius',type==='sketchFillet'?'Radius':'Distance',p.radius??2,.001,500)];
  if(type==='sketchProject'){const options=api.getItems().filter(i=>!i.regionParent).map(i=>[i.id,i.name]);for(const id of session.edit?.inputs||[])if(!options.some(o=>o[0]===id))options.push([id,'Original source']);return[choice('source','Source',options,refs()[0]?.id||'')];}
  return[choice('kind','Type',['Linear','Circular'],p.kind||'Linear'),n('spacingX','X spacing',p.spacingX??25),n('spacingY','Y spacing',p.spacingY??25),n('countX','X count',p.countX??3,1,25,'×'),n('countY','Y count',p.countY??1,1,25,'×'),n('count','Count',p.count??4,2,25,'×'),n('angle','Angle',p.angle??360,.1,360,'°'),n('cx','Centre X',p.cx??0),n('cy','Centre Y',p.cy??0)];
 }
 function sourceItem(){const s=session,selected=refs();return api.getItems().find(i=>i.id===selected.at(-1)?.id)||s?.sourceItems?.find(i=>i.id===selected.at(-1)?.id)||api.getItems().find(i=>i.featureId===s?.edit?.id);}
 function read(){
  const s=session;if(!s)throw Error('Sketch operation has ended');const p={...s.seed};
  for(const f of s.fields){const el=s.controls.get(f.name);if(f.type==='number'&&s.type==='sketchPattern'&&(s.controls.get('kind').value==='Circular'?['spacingX','spacingY','countX','countY'].includes(f.name):['count','angle','cx','cy'].includes(f.name))){p[f.name]=s.seed[f.name]??f.value;continue;}if(el.type==='checkbox')p[f.name]=el.checked;else if(el.type==='number'){if(!el.value.trim()||!Number.isFinite(Number(el.value)))throw Error('Enter a valid '+f.label.toLowerCase());p[f.name]=Number(el.value)*(f.unit==='mm'?api.units().factor:1);}else p[f.name]=el.value;}
  if(s.type==='sketchMirror'){if(p.axisMode!=='Custom')p.angle=p.axisMode==='Vertical'?90:0;s.rows.get('angle').hidden=p.axisMode!=='Custom';}
  if(s.type==='sketchPattern')for(const f of s.fields)if(f.type==='number')s.rows.get(f.name).hidden=p.kind==='Circular'?['spacingX','spacingY','countX','countY'].includes(f.name):['count','angle','cx','cy'].includes(f.name);
  if(s.type==='sketchFillet'||s.type==='sketchChamfer'){if(p.corners==='Pick corner'){if(!s.corner)throw Error('Tap a sketch corner');p.corner=s.corner;}else{delete p.corner;if(refs().length&&!cornerCandidates().length)throw Error('Select a corner where two sketch edges meet');}}
  if(s.type==='text'&&(!p.text.trim()||p.text.length>60))throw Error('Enter 1–60 text characters');
  if(s.type==='sketchProject'){p.basis=s.frame;p.keepInputs=true;p.faces={};for(const r of api.getSelection())if(r.kind==='face'){const item=api.getItems().find(i=>i.id===r.id),face=item?.faceInfo.find(f=>f.index===r.index);p.faces[r.id]={face:r.index,faceRef:face?.reference};}}
  return p;
 }
 function plan(p,preview=false){
  const s=session,next=api.snapshot(),inputRefs=refs(),ids=s.type==='text'?[]:s.type==='sketchProject'?[p.source||inputRefs[0]?.id]:[...new Set(inputRefs.map(r=>r.id))];if(s.type!=='text'&&(!ids.length||ids.some(id=>!id)))throw Error('Select source geometry');
  const featureType=s.type==='text'?'sketch':s.type,title=s.edit?.name||(names[s.type]+' '+(api.getDoc().features.filter(f=>f.type===featureType&&(s.type!=='text'||f.params.shape==='text')).length+1));
  const feature={id:s.edit?.id||(preview?'sketch_tool_preview':api.uid()),type:s.type==='text'?'sketch':s.type,name:title,params:s.type==='text'?{...p,shape:'text',closed:true,basis:s.frame}:{...p,basis:s.frame},inputs:ids};
  if(s.edit)next.features[next.features.findIndex(f=>f.id===s.edit.id)]=feature;else next.features.push(feature);
  return{next,id:feature.id};
 }
 function geometry(key,p){
  const s=session,item=sourceItem(),frame=s.frame,x=new THREE.Vector3(...frame.x),z=new THREE.Vector3(...frame.normal),y=z.clone().cross(x),base=item?.bounds?item.bounds[0].map((v,i)=>(v+item.bounds[1][i])/2):frame.origin;
  let origin=new THREE.Vector3(...base),direction=x.clone(),kind='linear',unit='mm',coefficient=1;
  if(s.type==='text'){origin=transform(frame,[p.x,p.y]);if(key==='height'){const a=(p.angle||0)*Math.PI/180;direction=x.clone().multiplyScalar(-Math.sin(a)).addScaledVector(y,Math.cos(a));origin.addScaledVector(direction,p.height);}if(key==='y')direction=y;}
  if(s.type==='sketchMirror'){
   const angle=p.angle*Math.PI/180,axis=x.clone().multiplyScalar(Math.cos(angle)).addScaledVector(y,Math.sin(angle));direction=z.clone().cross(axis);origin=transform(frame,[-Math.sin(angle)*p.offset,Math.cos(angle)*p.offset]);
   const span=(api.camera.top-api.camera.bottom)/api.camera.zoom*.65,stamp=origin.toArray().join(',')+'|'+axis.toArray().join(',')+'|'+span;if(guide.userData.stamp!==stamp){guide.userData.stamp=stamp;guide.geometry.dispose();guide.geometry=new THREE.BufferGeometry().setFromPoints([origin.clone().addScaledVector(axis,-span),origin.clone().addScaledVector(axis,span)]);}guide.visible=true;
  }
  if(s.type==='sketchFillet'||s.type==='sketchChamfer'){const candidates=cornerCandidates(),point=p.corner?transform(frame,p.corner):null,candidate=point?candidates.find(c=>point.distanceTo(new THREE.Vector3(...c.point))<1e-5):candidates[0];origin=candidate?new THREE.Vector3(...candidate.point):point||origin;direction=candidate?new THREE.Vector3(...candidate.bisector):x.clone().add(y).normalize();const factor=candidate?(s.type==='sketchFillet'?1/candidate.sinHalf:candidate.cosHalf):1;origin.addScaledVector(direction,p.radius*factor);coefficient=1/factor;}
  if(s.type==='sketchTransform'){origin=transform(frame,[(p.cx||0)+(p.x||0),(p.cy||0)+(p.y||0)]);if(key==='y')direction=y;}
  if(s.type==='sketchPattern'){if(key==='spacingY'||key==='cy'||key==='countY')direction=y;if(key==='spacingX'||key==='spacingY')origin.addScaledVector(direction,p[key]||0);if(key==='cx'||key==='cy')origin=transform(frame,[p.cx,p.cy]);}
  if(key==='angle'){kind='angle';unit='°';direction=z;if(s.type==='sketchPattern')origin=transform(frame,[p.cx,p.cy]);}
  if(key.startsWith('count')){kind='count';unit='×';}
  return{origin:origin.toArray(),direction:direction.toArray(),coefficient,kind,unit};
 }
 function update(){if(!session)return;const s=session;if(s.type==='sketchProject'){const id=refs().at(-1)?.id;if(id&&id!==s.lastSelected){s.lastSelected=id;s.controls.get('source').value=id;}}const eligible=s.type==='text'||s.type==='sketchProject'?!!s.controls.get('source')?.value||s.type==='text':refs().length>0;s.apply.disabled=!eligible;
  for(const f of s.fields)if(f.type==='number')s.controls.get(f.name).disabled=!eligible;
  dots.visible=['sketchFillet','sketchChamfer'].includes(s.type);if(dots.visible){const candidates=cornerCandidates();if(s.dotCandidates!==candidates){s.dotCandidates=candidates;dots.geometry.dispose();dots.geometry=new THREE.BufferGeometry();dots.geometry.setAttribute('position',new THREE.Float32BufferAttribute(candidates.flatMap(c=>c.point),3));}}
 }
 function cornerCandidates(){
  const s=session,ids=refs().map(r=>r.id).join('|'),source=api.getItems();if(s.cornerItems===source&&s.cornerIds===ids&&s.cornerExtra===s.sourceItems)return s.corners;s.cornerItems=source;s.cornerIds=ids;s.cornerExtra=s.sourceItems;const chosen=new Set(refs().map(r=>r.id)),out=[];
  for(const item of [...source,...(s.sourceItems||[])]){
   if(item.kind!=='sketch'||chosen.size&&!chosen.has(item.id)||!item.sketchPlane)continue;const frame=item.sketchPlane,delta=frame.origin.map((v,i)=>v-s.frame.origin[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);if(Math.abs(dot(frame.normal,s.frame.normal))<.999999||Math.abs(dot(delta,s.frame.normal))>1e-5)continue;
   const ends=[];for(const e of item.edges||[]){if(!e.start||!e.end||!e.startTangent||!e.endTangent)continue;ends.push({point:e.start,tangent:e.startTangent},{point:e.end,tangent:e.endTangent.map(v=>-v)});}
   for(const end of ends){const point=end.point;if(out.some(c=>c.id===item.id&&Math.hypot(...c.point.map((v,i)=>v-point[i]))<1e-5))continue;const joints=ends.filter(p=>Math.hypot(...p.point.map((v,i)=>v-point[i]))<1e-5);if(joints.length!==2)continue;const a=new THREE.Vector3(...joints[0].tangent).normalize(),b=new THREE.Vector3(...joints[1].tangent).normalize();if(a.dot(b)<-1+1e-8)continue;const cosine=a.dot(b),bisector=a.clone().add(b).normalize();if(bisector.lengthSq()<1e-10)continue;out.push({id:item.id,point,frame,bisector:bisector.toArray(),sinHalf:Math.sqrt(Math.max(1e-8,(1-cosine)/2)),cosHalf:Math.sqrt(Math.max(1e-8,(1+cosine)/2))});}
  }
  s.corners=out;return out;
 }

 function pick(world,tolerance){const s=session;if(!s)return false;if(s.type==='text'){const p=local(s.frame,world);for(const [i,k]of ['x','y'].entries())s.controls.get(k).value=String(p[i]/api.units().factor);gizmo.changed();return true;}
  if(!['sketchFillet','sketchChamfer'].includes(s.type))return false;const nearest=cornerCandidates().map(c=>({...c,distance:Math.hypot(...c.point.map((v,i)=>v-world[i]))})).sort((a,b)=>a.distance-b.distance)[0];if(!nearest||nearest.distance>tolerance){api.status('Tap where two sketch edges meet');return true;}s.corner=local(s.frame,nearest.point);s.controls.get('corners').value='Pick corner';api.select([{id:nearest.id,kind:'sketch'}]);gizmo.changed();return true;
 }
 async function loadOriginalCorners(s){
  if(!s.edit||!['sketchFillet','sketchChamfer'].includes(s.type))return;
  const missing=s.edit.inputs.filter(id=>!api.getItems().some(i=>i.id===id));if(!missing.length)return;
  const prefix=api.snapshot();prefix.features=prefix.features.slice(0,prefix.features.findIndex(f=>f.id===s.edit.id));const inspected=[];
  for(const [i,input]of missing.entries()){
   const next=structuredClone(prefix),id='inspect_sketch_source_'+i;next.features.push({id,type:'sketchTransform',name:'Source sketch',params:{x:0,y:0,angle:0,keepInputs:true,basis:s.frame},inputs:[input]});
   const result=await api.preview(next),item=result.find(item=>item.featureId===id);if(item)inspected.push({...item,id:input});if(session!==s)return;
  }
  if(session===s){s.sourceItems=inspected;update();gizmo.changed();}
 }
 function start(type,editId=null){
  gizmo.cancel();const edit=editId?api.getDoc().features.find(f=>f.id===editId):null,seed={...(edit?.params||{})},frame=edit?.params.basis||api.getFrame();
  const host=document.createElement('section');host.id='sketchToolSource';host.dataset.control='sketch-tool';stage.querySelector('#sketchToolSource')?.remove();stage.append(host);
  session={type,edit,seed,frame,host,fields:[],controls:new Map(),rows:new Map(),corner:seed.corner};
  const s=session;if(type==='sketchTransform'){const item=sourceItem(),centre=item?.bounds?item.bounds[0].map((v,i)=>(v+item.bounds[1][i])/2):frame.origin,pivot=local(frame,centre);seed.cx??=pivot[0];seed.cy??=pivot[1];}s.fields=controls(type,seed);
  for(const f of s.fields){const label=document.createElement('label');label.textContent=f.label;const el=document.createElement(f.type==='select'?'select':'input');el.name=f.name;el.setAttribute('aria-label',f.label);if(f.type==='select'){for(const value of f.options){const option=document.createElement('option');option.value=Array.isArray(value)?value[0]:value;option.textContent=Array.isArray(value)?value[1]:value;el.append(option);}el.value=f.value;if(['source','axisMode','corners'].includes(f.name))el.dataset.gizmoDropdown='true';}else{el.type=f.type;el.value=String(f.unit==='mm'?f.value/api.units().factor:f.value);if(f.type==='number'){el.step='any';el.min=String(f.min/(f.unit==='mm'?api.units().factor:1));el.max=String(f.max/(f.unit==='mm'?api.units().factor:1));}if(f.type==='checkbox')el.checked=f.value;if(f.type==='text')el.maxLength=60;}label.append(el);host.append(label);s.controls.set(f.name,el);s.rows.set(f.name,label);}
  const apply=document.createElement('button'),cancel=document.createElement('button'),status=document.createElement('output');apply.setAttribute('aria-label','Apply '+names[type]);cancel.setAttribute('aria-label','Cancel '+names[type]);host.append(apply,cancel,status);s.apply=apply;
  const context=()=>({items:refs().map(r=>api.getItems().find(i=>i.id===r.id)).filter(Boolean),refs:refs()});
  try{read();}catch{}update();
  gizmo.begin({type:type==='text'?'sketch':type,title:names[type],host,compact:true,actionHost:api.sketchBar,actionBefore:api.exitButton,fields:s.fields.filter(f=>f.type==='number').map(f=>({name:f.name,label:f.label,factor:f.unit==='mm'?api.units().factor:1})),read,apply,cancel,status,allowSelection:!edit,context,geometry:(key,p)=>geometry(key,p),onPreview:async(p,isCurrent)=>{update();if(!refs().length&&type!=='text'&&type!=='sketchProject'){if(isCurrent())api.resetPreview();return;}const {next}=plan(p,true),result=await api.preview(next);if(isCurrent()){api.showPreview(result);if(type==='text'&&!s.fitted){s.fitted=true;api.fit?.();}}},commit:async()=>{const {next,id}=plan(read());await api.rebuild(next);const ids=api.getItems().filter(i=>i.featureId===id).map(i=>({id:i.id,kind:'sketch'}));api.committed?.(id);host.hidden=true;close();api.select(ids);},onCancel:close});
  void loadOriginalCorners(s).catch(e=>{if(session===s)status.textContent=e.message;});
  api.status(type==='text'?'Type text, then tap to position or drag a handle':type==='sketchFillet'||type==='sketchChamfer'?'Choose a profile and tap a corner, or use All corners':'Select source geometry and adjust the gizmo');
 }
 return{start,pick,update,close,get active(){return!!session;}};
}
