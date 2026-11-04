// Geometry-owned controls are never modified by generic icon decoration.
export function createDirectModeling(api){
 const {THREE,scene,camera,renderer,stage}=api;
 const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),1,0x078aff,.2,.1);arrow.name='Face normal arrow';scene.add(arrow);arrow.visible=false;
 for(const o of [arrow.line,arrow.cone]){o.material.depthTest=false;o.renderOrder=21;}

 const handle=document.createElement('button');handle.id='faceDragHandle';handle.type='button';handle.dataset.control='direct';handle.hidden=true;handle.setAttribute('aria-label','Drag arrow along geometry');handle.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 24h34m-12-11 12 11-12 11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const dimensions=document.createElement('div');dimensions.id='faceDistance';dimensions.dataset.control='direct';dimensions.hidden=true;
 dimensions.innerHTML='<label><span id="directDimensionLabel">Distance</span><input id="faceDistanceValue" aria-label="Direct modeling value" type="number" step="any"><span id="directUnit">mm</span></label><button id="faceDistanceApply" data-control="direct" aria-label="Apply direct edit" type="button">✓</button><button id="faceDistanceCancel" data-control="direct" aria-label="Cancel direct edit" type="button">×</button><output id="directPreviewStatus" aria-live="polite"></output>';
 const guide=document.createElementNS('http://www.w3.org/2000/svg','svg');guide.id='directGuide';guide.innerHTML='<path fill="none" stroke="#1676df" stroke-width="2" stroke-dasharray="4 4"/>';stage.append(guide,handle,dimensions);
 const input=dimensions.querySelector('input'),label=dimensions.querySelector('#directDimensionLabel'),unit=dimensions.querySelector('#directUnit'),feedback=dimensions.querySelector('output');
 let session=null,drag=null,value=0,operation='offsetFace',timer=null,sequence=0,inFlight=false,wanted=null,lastTarget='',previewEpoch=0;
 const same=(a,b)=>a&&b&&a.id===b.id&&a.kind===b.kind&&a.index===b.index;
 function target(){
  const ref=api.getSelection().at(-1),item=api.getItem();
  if(!ref||!item||api.isSketching()||api.isBusy())return null;
  const face=ref.kind==='face'&&item.kind==='body'?item.faceInfo.find(f=>f.index===ref.index):null;
  const edge=ref.kind==='edge'&&item.kind==='body'?item.edges.find(e=>e.index===ref.index):null;
  const sketch=ref.kind==='sketch'&&item.kind==='sketch'?api.getDoc().features.find(f=>f.id===item.featureId)?.params:null;
  const diameter=['CYLINDRE','CYLINDER'].includes(face?.type)?api.getDiameterTarget?.(ref):null;
  if(face?.type!=='PLANE'&&!diameter&&!edge&&!(sketch&&sketch.closed!==false&&!item.construction))return null;
  return{ref,item,face,edge,sketch,diameter};
 }
 function direction(){
  const t=target();if(!t)return null;
  const origin=new THREE.Vector3(...(t.ref.point||t.face?.center||t.edge?.center||t.item.bounds[0].map((v,i)=>(v+t.item.bounds[1][i])/2)));
  const radial=(face)=>{const c=face?.cylinder;if(!c)return new THREE.Vector3(...(face?.normal||[0,0,1]));const axis=new THREE.Vector3(...c.axis),v=origin.clone().sub(new THREE.Vector3(...c.origin));return v.addScaledVector(axis,-v.dot(axis)).normalize();};
  let normal=t.face?radial(t.face):new THREE.Vector3(...(t.item.sketchPlane?.normal||t.sketch?.basis?.normal||(t.sketch?.plane==='XZ'?[0,-1,0]:t.sketch?.plane==='YZ'?[1,0,0]:[0,0,1])));
  if(t.edge){const adjacent=t.item.faceInfo.filter(f=>t.edge.faceIndices?.includes(f.index));if(adjacent.length){normal=new THREE.Vector3();for(const f of adjacent)normal.add(radial(f));}}
  if(normal.lengthSq()<1e-10)normal.set(0,0,1);normal.normalize();
  const rect=stage.getBoundingClientRect(),p=origin.clone().project(camera),q=origin.clone().addScaledVector(normal,20).project(camera);
  const sx=(q.x-p.x)*rect.width/2,sy=(p.y-q.y)*rect.height/2,len=Math.hypot(sx,sy),dx=len>1e-5?sx/len:0,dy=len>1e-5?sy/len:0;
  return{...t,origin,normal,rect,p,dx,dy,pixelsPerUnit:len/20};
 }

 function params(){if(operation==='diameter')return{diameter:value};return operation==='fillet'||operation==='chamfer'?{radius:Math.abs(value),edges:[session.index],allEdges:false}:operation==='draft'?{angle:value,face:session.index,plane:'XY',offset:0}:{distance:value,...(session.kind==='face'?{face:session.index}:{})};}
 function displayValue(){const factor=operation==='draft'?1:(api.getUnits?.().factor||1);return value/factor;}
 async function drain(){
  if(inFlight||!wanted)return;const task=wanted;wanted=null;inFlight=true;
  try{await api.onPreview(task.operation,task.params,task.ref,()=>task.epoch===previewEpoch);if(task.epoch===previewEpoch&&task.token===sequence)feedback.textContent='Solid verified';}
  catch(e){if(task.epoch===previewEpoch&&!wanted){api.onResetPreview();feedback.textContent=e.message;feedback.dataset.error='true';}}
  finally{inFlight=false;if(wanted)drain();}
 }
 function schedule(){
  const token=++sequence;
  if(!session||!Number.isFinite(value)||(operation==='diameter'?value<=.001:Math.abs(value)<.001)){previewEpoch++;wanted=null;api.onResetPreview();feedback.textContent='Enter a value or drag the arrow';return;}
  const immediate=api.onImmediate?.(operation,params(),session);feedback.textContent=immediate?'Live preview · checking solid…':'Updating solid…';feedback.dataset.error='false';
  // Latest-value queue: start immediately, replace pending work, and display
  // completed BREP frames during a continuous drag rather than starving them.
  wanted={token,epoch:previewEpoch,ref:{...session},operation,params:params()};drain();
 }
 function cancel(){drag=null;handle.classList.remove('dragging');api.onNavigation(true);clearTimeout(timer);sequence++;previewEpoch++;wanted=null;session=null;value=0;dimensions.hidden=true;api.onResetPreview();feedback.textContent='';}
 function begin(initial=0,requested){
  const t=target();if(!t)return;previewEpoch++;operation=requested||(t.diameter?'diameter':t.edge?'fillet':t.sketch?'extrude':'offsetFace');session={...t.ref};value=operation==='diameter'?(t.diameter.diameter+initial):initial;
  label.textContent=operation==='diameter'?'Diameter':operation==='fillet'?'Radius':operation==='chamfer'?'Chamfer':operation==='draft'?'Draft':'Distance';
  unit.textContent=operation==='draft'?'°':api.getUnits?.().label||'mm';input.value=String(Number(displayValue().toFixed(4)));dimensions.hidden=false;update();if(initial)schedule();
 }
 function update(){
  const t=target();handle.hidden=!t;guide.hidden=true;arrow.visible=!!t;
  if(!t){if(!api.isBusy()&&session)cancel();dimensions.hidden=true;return;}
  const id=[t.ref.id,t.ref.kind,t.ref.index].join(':');
  if(id!==lastTarget){if(session&&!same(session,t.ref))cancel();lastTarget=id;if(t.diameter&&!session){begin(0);return;}}
  const d=direction();if(!d)return;
  const unit=(camera.top-camera.bottom)/camera.zoom/d.rect.height,length=unit*56;
  const origin=d.origin.clone();if(session&&operation==='offsetFace')origin.addScaledVector(d.normal,value);
  else if(session&&operation==='diameter'&&t.diameter)origin.addScaledVector(d.normal,(value-t.diameter.diameter)/2);
  arrow.position.copy(origin);arrow.setDirection(d.normal);arrow.setLength(length,length*.3,length*.14);
  const projected=origin.clone().addScaledVector(d.normal,length*.82).project(camera),hx=(projected.x+1)*d.rect.width/2,hy=(1-projected.y)*d.rect.height/2;
  handle.style.pointerEvents=d.pixelsPerUnit<.02?'none':'auto';handle.style.left=hx+'px';handle.style.top=hy+'px';handle.dataset.normal=d.normal.toArray().join(',');handle.dataset.origin=origin.toArray().join(',');handle.dataset.target=t.ref.kind;handle.title=t.edge?'Drag edge radius / chamfer':t.sketch?'Drag to extrude profile':'Drag along face normal';
  if(session){dimensions.hidden=false;dimensions.style.left=Math.max(7,Math.min(d.rect.width-196,hx+22))+'px';dimensions.style.top=Math.max(12,Math.min(d.rect.height-100,hy-24))+'px';}
 }
 handle.addEventListener('pointerdown',e=>{if(api.isBusy())return;e.preventDefault();e.stopPropagation();const d=direction();if(!d)return;if(!session)begin(0);drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:d.dx,dy:d.dy,pixelsPerUnit:d.pixelsPerUnit,start:value};handle.setPointerCapture(e.pointerId);handle.classList.add('dragging');api.onNavigation(false);});
 handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();if(drag.pixelsPerUnit<.02)return;const pixels=(e.clientX-drag.x)*drag.dx+(e.clientY-drag.y)*drag.dy,scale=operation==='draft'?.2:1/drag.pixelsPerUnit;value=Math.round((drag.start+pixels*scale)*100)/100;if(operation==='fillet'||operation==='chamfer')value=Math.abs(value);input.value=String(Number(displayValue().toFixed(4)));schedule();update();});
 const finish=()=>{drag=null;handle.classList.remove('dragging');api.onNavigation(true);if(session)schedule();};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',()=>{finish();cancel();});
 input.oninput=()=>{value=Number(input.value)*(operation==='draft'?1:api.getUnits?.().factor||1);schedule();};
 dimensions.querySelector('#faceDistanceCancel').onclick=cancel;
 dimensions.querySelector('#faceDistanceApply').onclick=async()=>{if(!session||!Number.isFinite(value)||Math.abs(value)<.001){api.onStatus('Enter a non-zero value');return;}const ref={...session},p=params(),op=operation;clearTimeout(timer);sequence++;previewEpoch++;wanted=null;try{await api.onCommit(op,p,ref);cancel();}catch(e){api.onResetPreview(true);feedback.textContent=e.message;feedback.dataset.error='true';}};
 input.onkeydown=e=>{if(e.key==='Enter')dimensions.querySelector('#faceDistanceApply').click();if(e.key==='Escape')cancel();};
 return{handle,dimensions,arrow,update,target,direction,begin,cancel,get state(){return{dragging:!!drag,visible:!handle.hidden,target:handle.dataset.target,preview:!!session,operation,value,inFlight,pending:!!wanted,position:{left:handle.style.left,top:handle.style.top}};}};
}
