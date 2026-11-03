// Geometry-owned controls are never modified by generic icon decoration.
export function createDirectModeling(api){
 const {THREE,camera,renderer,stage}=api;
 const handle=document.createElement('button');handle.id='faceDragHandle';handle.type='button';handle.dataset.control='direct';handle.hidden=true;handle.setAttribute('aria-label','Drag arrow along geometry');handle.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 24h34m-12-11 12 11-12 11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const dimensions=document.createElement('div');dimensions.id='faceDistance';dimensions.dataset.control='direct';dimensions.hidden=true;
 dimensions.innerHTML='<label><span id="directDimensionLabel">Distance</span><input id="faceDistanceValue" aria-label="Direct modeling value" type="number" step="any"><span id="directUnit">mm</span></label><button id="faceDistanceApply" data-control="direct" aria-label="Apply direct edit" type="button">✓</button><button id="faceDistanceCancel" data-control="direct" aria-label="Cancel direct edit" type="button">×</button><output id="directPreviewStatus" aria-live="polite"></output>';
 const guide=document.createElementNS('http://www.w3.org/2000/svg','svg');guide.id='directGuide';guide.innerHTML='<path fill="none" stroke="#1676df" stroke-width="2" stroke-dasharray="4 4"/>';stage.append(guide,handle,dimensions);
 const input=dimensions.querySelector('input'),label=dimensions.querySelector('#directDimensionLabel'),unit=dimensions.querySelector('#directUnit'),feedback=dimensions.querySelector('output');
 let session=null,drag=null,value=0,operation='offsetFace',timer=null,sequence=0,inFlight=false,wanted=null,lastTarget='';
 const same=(a,b)=>a&&b&&a.id===b.id&&a.kind===b.kind&&a.index===b.index;
 function target(){
  const ref=api.getSelection().at(-1),item=api.getItem();
  if(!ref||!item||api.isSketching()||api.isBusy())return null;
  const face=ref.kind==='face'&&item.kind==='body'?item.faceInfo.find(f=>f.index===ref.index):null;
  const edge=ref.kind==='edge'&&item.kind==='body'?item.edges.find(e=>e.index===ref.index):null;
  const sketch=ref.kind==='sketch'&&item.kind==='sketch'?api.getDoc().features.find(f=>f.id===item.featureId)?.params:null;
  if(face?.type!=='PLANE'&&!edge&&!(sketch&&sketch.closed!==false&&!item.construction))return null;
  return{ref,item,face,edge,sketch};
 }
 function direction(){
  const t=target();if(!t)return null;
  const origin=new THREE.Vector3(...(t.face?.center||t.edge?.center||t.item.bounds[0].map((v,i)=>(v+t.item.bounds[1][i])/2)));
  const normal=new THREE.Vector3(...(t.face?.normal||t.item.sketchPlane?.normal||t.sketch?.basis?.normal||(t.sketch?.plane==='XZ'?[0,-1,0]:t.sketch?.plane==='YZ'?[1,0,0]:[0,0,1]))).normalize();
  const rect=stage.getBoundingClientRect(),p=origin.clone().project(camera),q=origin.clone().addScaledVector(normal,20).project(camera);
  let dx=(q.x-p.x)*rect.width/2,dy=(p.y-q.y)*rect.height/2;
  if(t.edge){dx=.707;dy=-.707;}else{const len=Math.hypot(dx,dy);if(len<3){dx=0;dy=-1;}else{dx/=len;dy/=len;}}
  return{...t,origin,normal,rect,p,dx,dy};
 }
 function params(){return operation==='fillet'||operation==='chamfer'?{radius:Math.abs(value),edges:[session.index],allEdges:false}:operation==='draft'?{angle:value,face:session.index,plane:'XY',offset:0}:{distance:value,...(session.kind==='face'?{face:session.index}:{})};}
 function displayValue(){const factor=operation==='draft'?1:(api.getUnits?.().factor||1);return value/factor;}
 async function drain(){
  if(inFlight||!wanted)return;const task=wanted;wanted=null;inFlight=true;
  try{await api.onPreview(task.operation,task.params,task.ref,()=>task.token===sequence);if(task.token===sequence)feedback.textContent='Preview · actual CAD geometry';}
  catch(e){if(task.token===sequence){api.onResetPreview();feedback.textContent=e.message;feedback.dataset.error='true';}}
  finally{inFlight=false;if(wanted)drain();}
 }
 function schedule(){
  clearTimeout(timer);const token=++sequence;
  if(!session||!Number.isFinite(value)||Math.abs(value)<.001){api.onResetPreview();feedback.textContent='Enter a value or drag the arrow';return;}
  feedback.textContent='Calculating CAD preview…';feedback.dataset.error='false';
  const task={token,ref:{...session},operation,params:params()};timer=setTimeout(()=>{wanted=task;drain();},100);
 }
 function cancel(){clearTimeout(timer);sequence++;wanted=null;session=null;value=0;dimensions.hidden=true;api.onResetPreview();feedback.textContent='';}
 function begin(initial=0,requested){
  const t=target();if(!t)return;operation=requested||(t.edge?'fillet':t.sketch?'extrude':'offsetFace');session={...t.ref};value=initial;
  label.textContent=operation==='fillet'?'Radius':operation==='chamfer'?'Chamfer':operation==='draft'?'Draft':'Distance';
  unit.textContent=operation==='draft'?'°':api.getUnits?.().label||'mm';input.value=String(Number(displayValue().toFixed(4)));dimensions.hidden=false;update();if(initial)schedule();
 }
 function update(){
  const t=target();handle.hidden=!t;guide.hidden=!t;
  if(!t){if(!api.isBusy()&&session)cancel();dimensions.hidden=true;return;}
  const id=[t.ref.id,t.ref.kind,t.ref.index].join(':');
  if(id!==lastTarget){if(session&&!same(session,t.ref))cancel();lastTarget=id;}
  const d=direction();if(!d)return;
  const x=Math.max(40,Math.min(d.rect.width-40,(d.p.x+1)*d.rect.width/2)),y=Math.max(70,Math.min(d.rect.height-100,(1-d.p.y)*d.rect.height/2));
  const offset=48+(session&&operation!=='fillet'&&operation!=='chamfer'?value/(200/camera.zoom/d.rect.height)*.25:0);
  const hx=Math.max(38,Math.min(d.rect.width-38,x+d.dx*offset)),hy=Math.max(60,Math.min(d.rect.height-110,y+d.dy*offset));
  handle.style.left=hx+'px';handle.style.top=hy+'px';handle.style.setProperty('--arrow-angle',Math.atan2(d.dy,d.dx)+'rad');handle.dataset.target=t.ref.kind;handle.title=t.edge?'Drag edge radius / chamfer':t.sketch?'Drag to extrude profile':'Drag to pull or push face';
  guide.setAttribute('viewBox','0 0 '+d.rect.width+' '+d.rect.height);guide.querySelector('path').setAttribute('d','M'+x+' '+y+'L'+hx+' '+hy);
  if(session){dimensions.hidden=false;dimensions.style.left=Math.max(7,Math.min(d.rect.width-280,hx+30))+'px';dimensions.style.top=Math.max(12,Math.min(d.rect.height-100,hy-24))+'px';}
 }
 handle.addEventListener('pointerdown',e=>{if(api.isBusy())return;e.preventDefault();e.stopPropagation();const d=direction();if(!d)return;if(!session)begin(0);drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:d.dx,dy:d.dy,start:value};handle.setPointerCapture(e.pointerId);api.onNavigation(false);});
 handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const pixels=(e.clientX-drag.x)*drag.dx+(e.clientY-drag.y)*drag.dy,scale=operation==='draft'?.2:200/camera.zoom/renderer.domElement.clientHeight;value=Math.round((drag.start+pixels*scale)*100)/100;if(operation==='fillet'||operation==='chamfer')value=Math.abs(value);input.value=String(Number(displayValue().toFixed(4)));schedule();update();});
 const finish=()=>{drag=null;api.onNavigation(true);};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',()=>{finish();cancel();});
 input.oninput=()=>{value=Number(input.value)*(operation==='draft'?1:api.getUnits?.().factor||1);schedule();};
 dimensions.querySelector('#faceDistanceCancel').onclick=cancel;
 dimensions.querySelector('#faceDistanceApply').onclick=async()=>{if(!session||!Number.isFinite(value)||Math.abs(value)<.001){api.onStatus('Enter a non-zero value');return;}const ref={...session},p=params(),op=operation;clearTimeout(timer);sequence++;wanted=null;try{await api.onCommit(op,p,ref);cancel();}catch(e){feedback.textContent=e.message;feedback.dataset.error='true';}};
 input.onkeydown=e=>{if(e.key==='Enter')dimensions.querySelector('#faceDistanceApply').click();if(e.key==='Escape')cancel();};
 return{handle,dimensions,update,target,direction,begin,cancel,get state(){return{visible:!handle.hidden,target:handle.dataset.target,preview:!!session,operation,value,inFlight,pending:!!wanted,position:{left:handle.style.left,top:handle.style.top}};}};
}
