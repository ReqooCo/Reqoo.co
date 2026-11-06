// The moving and fixed roles stay explicit throughout native preview and commit.
export function createPartAlignment(api){
 const panel=document.createElement('section');panel.id='partAlignment';panel.hidden=true;panel.setAttribute('aria-label','Align two parts');panel.dataset.control='alignment';
 const picker=slot=>`<label><span>${slot==='source'?'Moving part':'Fixed target'}</span><select aria-label="${slot==='source'?'Moving part':'Target part'}"></select><button type="button" data-pick="${slot}" aria-label="Pick ${slot==='source'?'moving':'target'} part"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="6"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/></svg></button></label>`;
 const anchors='<option value="centre">Centre</option><option value="min">Start</option><option value="max">End</option>';
 panel.innerHTML=`<header><strong>Align parts</strong><button type="button" aria-label="Cancel alignment">×</button></header><div class="alignMethods" role="group" aria-label="Alignment method"><button data-method="parts" type="button">Parts</button><button data-method="faces" type="button">Faces</button><button data-method="concentric" type="button">Concentric</button></div><ol class="alignSteps" aria-label="Alignment steps"><li data-step="source">1 · Moving geometry</li><li data-step="target">2 · Fixed target</li><li data-step="preview">3 · Check & apply</li></ol>${picker('source')}${picker('target')}<div class="partAlignOptions"><label>Axes<select aria-label="Alignment axes"><option>XYZ</option><option>X</option><option>Y</option><option>Z</option></select></label><label>Moving anchor<select aria-label="Moving anchor"><option value="centre">Centre</option><option value="min">Min</option><option value="max">Max</option></select></label><label>Target anchor<select aria-label="Target anchor"><option value="centre">Centre</option><option value="min">Min</option><option value="max">Max</option></select></label></div><label class="faceAlignOptions" hidden>Gap (mm)<input aria-label="Face alignment gap" type="number" step="any" min="-2000" max="2000" value="0"></label><div class="concentricOptions" hidden><label>Moving anchor<select aria-label="Moving cylinder anchor">${anchors}</select></label><label>Target anchor<select aria-label="Target cylinder anchor">${anchors}<option value="keep">Keep axial position</option></select></label><label>Axial offset (mm)<input aria-label="Concentric offset" type="number" step="any" min="-2000" max="2000" value="0"></label><label>Rotation (°)<input aria-label="Concentric rotation" type="number" step="any" min="-3600" max="3600" value="0"></label><label class="check"><input type="checkbox" aria-label="Flip cylinder axis"> Flip axis 180°</label></div><output aria-live="polite"></output><button class="primary" type="button" aria-label="Apply alignment">Apply alignment</button>`;
 api.stage.append(panel);for(const b of panel.querySelectorAll('button'))b.dataset.control='alignment';
 const el=name=>panel.querySelector(`[aria-label="${name}"]`),sourceSelect=el('Moving part'),targetSelect=el('Target part'),output=panel.querySelector('output'),apply=el('Apply alignment');
 let state=null,version=0,inFlight=false,pending=null;
 const available=()=>api.getItems().filter(i=>i.kind==='body'),needsFaces=()=>state?.method!=='parts';
 function validFace(ref,method){return ref?.kind==='face'&&available().find(i=>i.id===ref.id)?.faceInfo.some(f=>f.index===ref.index&&(method==='concentric'?!!f.cylinder:f.type==='PLANE'));}
 function cancel(){if(!state)return;state=null;version++;pending=null;panel.hidden=true;api.onGuides?.(null);api.onResetPreview();}
 function params(){
  if(state.method==='parts')return{axis:el('Alignment axes').value,sourceAnchor:el('Moving anchor').value,targetAnchor:el('Target anchor').value};
  const p={method:state.method,sourceFace:state.sourceFace?.index,sourceFaceRef:state.sourceFace?.reference,targetFace:state.targetFace?.index,targetFaceRef:state.targetFace?.reference};
  return state.method==='faces'?{...p,gap:Number(el('Face alignment gap').value)}:{...p,sourceAnchor:el('Moving cylinder anchor').value,targetAnchor:el('Target cylinder anchor').value,offset:Number(el('Concentric offset').value),twist:Number(el('Concentric rotation').value),flip:el('Flip cylinder axis').checked};
 }
 const complete=()=>state&&state.source&&state.target&&state.source!==state.target&&(!needsFaces()||state.sourceFace&&state.targetFace);
 async function drain(){if(inFlight||!pending)return;const task=pending;pending=null;inFlight=true;
  try{await api.onPreview(task.source,task.target,task.params,()=>!!state&&task.version===version);if(state&&task.version===version){output.textContent='Preview ready · fixed target stays in place';apply.disabled=false;api.onGuides?.({...state,preview:true});}}
  catch(e){if(state&&task.version===version){api.onResetPreview();output.textContent=e.message;apply.disabled=true;}}
  finally{inFlight=false;if(pending)drain();}
 }
 function update(){if(!state)return;version++;pending=null;apply.disabled=true;
  panel.querySelectorAll('[data-method]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.method===state.method)));
  panel.querySelectorAll('[data-pick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pick===state.pick)));
  panel.querySelector('.partAlignOptions').hidden=state.method!=='parts';panel.querySelector('.faceAlignOptions').hidden=state.method!=='faces';panel.querySelector('.concentricOptions').hidden=state.method!=='concentric';
  sourceSelect.value=state.source||'';targetSelect.value=state.target||'';
  for(const step of panel.querySelectorAll('[data-step]'))step.setAttribute('aria-current',step.dataset.step===(state.pick||'preview')?'step':'false');
  api.onRoles(state.source,state.target);api.onGuides?.({...state});
  const geometry=state.method==='concentric'?' cylindrical face':state.method==='faces'?' planar face':' part';
  if(state.pick){output.textContent='Tap '+(state.pick==='source'?'moving':'fixed target')+geometry;return;}
  if(!complete()){output.textContent=state.source===state.target?'Choose two different parts':'Pick moving and fixed target'+geometry;return;}
  const inputs=[...panel.querySelectorAll('input[type="number"]')].filter(i=>!i.closest('[hidden]'));
  if(inputs.some(i=>!i.value.trim()||!i.checkValidity())){output.textContent='Enter valid dimensions within the shown limits';return;}
  output.textContent='Updating alignment…';pending={source:state.source,target:state.target,params:params(),version};drain();
 }
 function assign(slot,ref){state[slot]=ref.id;const face=available().find(i=>i.id===ref.id).faceInfo.find(f=>f.index===ref.index);state[slot+'Face']={index:face.index,reference:face.reference,cylinder:face.cylinder};}
 function begin(selection=[],options={}){api.onStart?.();cancel();const items=available();if(items.length<2){api.onStatus('Show at least two solid parts to align');return;}
  for(const select of [sourceSelect,targetSelect]){select.replaceChildren();for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.append(option);}}
  const selected=selection.filter(s=>items.some(i=>i.id===s.id)),ids=[...new Set(selected.map(s=>s.id))],cylinders=selected.filter(s=>validFace(s,'concentric')),planes=selected.filter(s=>validFace(s,'faces')),method=options.method|| (cylinders.length?'concentric':planes.length?'faces':'parts'),faces=method==='concentric'?cylinders:planes;
  state={source:ids[0]||items[0].id,target:ids[1]||items.find(i=>i.id!==(ids[0]||items[0].id)).id,method,sourceFace:null,targetFace:null,pick:null};
  for(const [slot,ref]of [['source',faces[0]],['target',faces.find(s=>s.id!==faces[0]?.id)]])if(ref)assign(slot,ref);
  if(needsFaces())state.pick=!state.sourceFace?'source':!state.targetFace?'target':null;panel.hidden=false;update();api.onControls?.({type:'align',title:'Align',host:panel,preview:false,read:params,apply,cancel:el('Cancel alignment'),status:output,commit:()=>apply.click(),onCancel:cancel,allowSelection:true,context:()=>{const item=api.getPreviewItem?.(state?.source)||available().find(i=>i.id===state?.source),face=item?.faceInfo.find(f=>f.index===state?.sourceFace?.index),target=available().find(i=>i.id===state?.target)?.faceInfo.find(f=>f.index===state?.targetFace?.index);return{items:item?[item]:[],origin:face?.center,axis:target?.cylinder?.axis||target?.normal||face?.cylinder?.axis||face?.normal||[0,0,1]};}});
 }
 function pick(candidates){if(!state)return;const slot=state.pick||'target',items=available();
  const ref=candidates.find(s=>s.visible!==false&&items.some(i=>i.id===s.id)&&(!needsFaces()||validFace(s,state.method)));
  if(!ref){output.textContent=state.method==='concentric'?'Choose a cylindrical side face on a visible part':state.method==='faces'?'Choose a planar face on a visible part':'Choose a visible solid part';return;}
  const other=slot==='source'?'target':'source';if(ref.id===state[other]){output.textContent='Choose a different part';return;}
  state[slot]=ref.id;if(needsFaces())assign(slot,ref);state.pick=needsFaces()&&!state[other+'Face']?other:null;update();
 }
 for(const [slot,select]of [['source',sourceSelect],['target',targetSelect]])select.onchange=()=>{if(!state)return;state[slot]=select.value;state[slot+'Face']=null;state.pick=needsFaces()?slot:null;api.onResetPreview();update();};
 for(const b of panel.querySelectorAll('[data-pick]'))b.onclick=()=>{if(!state)return;state.pick=b.dataset.pick;version++;pending=null;api.onResetPreview();update();};
 for(const b of panel.querySelectorAll('[data-method]'))b.onclick=()=>{if(!state)return;const next=b.dataset.method;if(state.method!==next){state.sourceFace=state.targetFace=null;}state.method=next;state.pick=needsFaces()?'source':null;api.onResetPreview();update();};
 for(const control of panel.querySelectorAll('.partAlignOptions select,.concentricOptions select'))control.onchange=update;
 for(const input of panel.querySelectorAll('input'))input.oninput=update;
 el('Cancel alignment').onclick=cancel;apply.onclick=async()=>{if(!complete()||apply.disabled||api.isBusy())return;const {source,target}=state,p=params();try{await api.onCommit(source,target,p);cancel();}catch(e){output.textContent=e.message;}};
 return{begin,cancel,pick,get active(){return!!state;},get roles(){return state?{source:state.source,target:state.target}:null;},get state(){return state?{...state}:null;}};
}
