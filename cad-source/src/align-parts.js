// Explicit moving/target roles; all previews are rebuilt by the CAD kernel.
export function createPartAlignment(api){
 const panel=document.createElement('section');panel.id='partAlignment';panel.hidden=true;panel.setAttribute('aria-label','Align two parts');panel.dataset.control='alignment';
 panel.innerHTML='<header><strong>Align parts</strong><button type="button" aria-label="Cancel alignment">×</button></header><div class="alignMethods"><button data-method="parts" type="button">Parts</button><button data-method="faces" type="button">Faces</button></div><label>Moving part<select aria-label="Moving part"></select><button type="button" data-pick="source" aria-label="Pick moving part"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="6"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/></svg></button></label><label>Target part<select aria-label="Target part"></select><button type="button" data-pick="target" aria-label="Pick target part"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="6"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/></svg></button></label><div class="partAlignOptions"><label>Axes<select aria-label="Alignment axes"><option>XYZ</option><option>X</option><option>Y</option><option>Z</option></select></label><label>Moving anchor<select aria-label="Moving anchor"><option value="centre">Centre</option><option value="min">Min</option><option value="max">Max</option></select></label><label>Target anchor<select aria-label="Target anchor"><option value="centre">Centre</option><option value="min">Min</option><option value="max">Max</option></select></label></div><label class="faceAlignOptions" hidden>Gap (mm)<input aria-label="Face alignment gap" type="number" step="any" value="0"></label><output aria-live="polite"></output><button class="primary" type="button" aria-label="Apply alignment">Apply alignment</button>';
 api.stage.append(panel);for(const b of panel.querySelectorAll('button'))b.dataset.control='alignment';
 const sourceSelect=panel.querySelector('[aria-label="Moving part"]'),targetSelect=panel.querySelector('[aria-label="Target part"]'),output=panel.querySelector('output'),apply=panel.querySelector('[aria-label="Apply alignment"]');
 let state=null,version=0,inFlight=false,pending=null;
 function available(){return api.getItems().filter(i=>i.kind==='body');}
 function cancel(){if(!state)return;state=null;version++;pending=null;panel.hidden=true;api.onResetPreview();}
 function params(){return state.method==='faces'?{method:'faces',sourceFace:state.sourceFace?.index,sourceFaceRef:state.sourceFace?.reference,targetFace:state.targetFace?.index,targetFaceRef:state.targetFace?.reference,gap:Number(panel.querySelector('[aria-label="Face alignment gap"]').value)}:{axis:panel.querySelector('[aria-label="Alignment axes"]').value,sourceAnchor:panel.querySelector('[aria-label="Moving anchor"]').value,targetAnchor:panel.querySelector('[aria-label="Target anchor"]').value};}
 function complete(){return state&&state.source&&state.target&&state.source!==state.target&&(state.method!=='faces'||state.sourceFace&&state.targetFace);}
 async function drain(){if(inFlight||!pending)return;const task=pending;pending=null;inFlight=true;
  try{await api.onPreview(task.source,task.target,task.params,()=>!!state&&task.version===version);if(state&&task.version===version){output.textContent='Preview ready · target stays fixed';apply.disabled=false;}}
  catch(e){if(state&&task.version===version){api.onResetPreview();output.textContent=e.message;apply.disabled=true;}}
  finally{inFlight=false;if(pending)drain();}
 }
 function update(){if(!state)return;version++;apply.disabled=true;
  panel.querySelectorAll('[data-method]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.method===state.method)));
  panel.querySelectorAll('[data-pick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pick===state.pick)));
  panel.querySelector('.partAlignOptions').hidden=state.method==='faces';panel.querySelector('.faceAlignOptions').hidden=state.method!=='faces';
  sourceSelect.value=state.source||'';targetSelect.value=state.target||'';
  api.onRoles(state.source,state.target);
  if(state.pick){output.textContent='Tap '+(state.pick==='source'?'moving':'target')+(state.method==='faces'?' planar face':' part');return;}
  if(!complete()){output.textContent=state.source===state.target?'Choose two different parts':state.method==='faces'?'Pick one planar face on each part':'Choose moving and target parts';return;}
  const p=params();if(state.method==='faces'&&!Number.isFinite(p.gap)){output.textContent='Enter a finite gap';return;}
  output.textContent='Updating alignment…';pending={source:state.source,target:state.target,params:p,version};drain();
 }
 function begin(selection=[]){cancel();const items=available();if(items.length<2){api.onStatus('Show at least two solid parts to align');return;}
  for(const select of [sourceSelect,targetSelect]){select.replaceChildren();for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.append(option);}}
  const selected=selection.filter(s=>items.some(i=>i.id===s.id)),ids=[...new Set(selected.map(s=>s.id))],faces=selected.filter(s=>s.kind==='face'&&items.find(i=>i.id===s.id)?.faceInfo.some(f=>f.index===s.index&&f.type==='PLANE'));
  state={source:ids[0]||items[0].id,target:ids[1]||items.find(i=>i.id!==(ids[0]||items[0].id)).id,method:faces.length?'faces':'parts',sourceFace:null,targetFace:null,pick:null};
  for(const [slot,ref]of [['source',faces[0]],['target',faces.find(s=>s.id!==faces[0]?.id)]])if(ref){state[slot]=ref.id;const face=items.find(i=>i.id===ref.id).faceInfo.find(f=>f.index===ref.index);state[slot+'Face']={index:face.index,reference:face.reference};}
  if(state.method==='faces'&&!state.targetFace)state.pick='target';panel.hidden=false;update();
 }
 function pick(candidates){if(!state)return;const slot=state.pick||'target',items=available();
  const ref=candidates.find(s=>items.some(i=>i.id===s.id)&&(state.method!=='faces'||s.kind==='face'&&items.find(i=>i.id===s.id).faceInfo.some(f=>f.index===s.index&&f.type==='PLANE')));
  if(!ref){output.textContent=state.method==='faces'?'Choose a planar face on a visible part':'Choose a visible solid part';return;}
  const other=slot==='source'?'target':'source';if(ref.id===state[other]){output.textContent='Choose a different part';return;}
  state[slot]=ref.id;if(state.method==='faces'){const f=items.find(i=>i.id===ref.id).faceInfo.find(f=>f.index===ref.index);state[slot+'Face']={index:f.index,reference:f.reference};}
  state.pick=state.method==='faces'&&!state[other+'Face']?other:null;update();
 }
 for(const [slot,select]of [['source',sourceSelect],['target',targetSelect]])select.onchange=()=>{if(!state)return;state[slot]=select.value;state[slot+'Face']=null;state.pick=state.method==='faces'?slot:null;api.onResetPreview();update();};
 for(const b of panel.querySelectorAll('[data-pick]'))b.onclick=()=>{if(!state)return;state.pick=b.dataset.pick;version++;pending=null;api.onResetPreview();update();};
 for(const b of panel.querySelectorAll('[data-method]'))b.onclick=()=>{if(!state)return;state.method=b.dataset.method;state.pick=state.method==='faces'&&!state.sourceFace?'source':state.method==='faces'&&!state.targetFace?'target':null;api.onResetPreview();update();};
 for(const select of panel.querySelectorAll('.partAlignOptions select'))select.onchange=()=>update();panel.querySelector('input').oninput=()=>update();
 panel.querySelector('[aria-label="Cancel alignment"]').onclick=cancel;
 apply.onclick=async()=>{if(!complete()||apply.disabled||api.isBusy())return;const {source,target}=state,p=params();try{await api.onCommit(source,target,p);cancel();}catch(e){output.textContent=e.message;}};
 return{begin,cancel,pick,get active(){return!!state;},get roles(){return state?{source:state.source,target:state.target}:null;},get state(){return state?{...state}:null;}};
}
