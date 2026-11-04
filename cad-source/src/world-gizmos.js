import {roundToStep,snapTranslation} from './snapping.js';
// Helpers live outside model topology and never participate in CAD hit testing.
export function createWorldReference({THREE,scene,camera,stage}){
 const group=new THREE.Group();group.name='World origin and axes';scene.add(group);
 const axes=new THREE.AxesHelper(1);group.add(axes);
 axes.material.depthTest=false;axes.material.transparent=true;axes.material.opacity=.8;axes.renderOrder=8;
 const dot=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));dot.renderOrder=9;group.add(dot);
 const labels=document.createElement('div');labels.id='worldReference';labels.innerHTML='<span data-origin>0, 0, 0</span><span data-axis="X">X</span><span data-axis="Y">Y</span><span data-axis="Z">Z</span>';stage.append(labels);
 function update(){const r=stage.getBoundingClientRect(),unit=(camera.top-camera.bottom)/camera.zoom/r.height,length=unit*76;axes.scale.setScalar(length);dot.scale.setScalar(unit*2.5);
  for(const [i,el]of [...labels.children].entries()){const p=new THREE.Vector3(...(i===0?[0,0,0]:i===1?[length,0,0]:i===2?[0,length,0]:[0,0,length])).project(camera);el.hidden=Math.abs(p.x)>1||Math.abs(p.y)>1||Math.abs(p.z)>1;el.style.left=((p.x+1)*r.width/2+6)+'px';el.style.top=((1-p.y)*r.height/2+5)+'px';}
 }
 return{update,group};
}

export function createTranslationGizmo(api){
 const {THREE,scene,camera,renderer,stage}=api,group=new THREE.Group();group.name='Move XYZ';group.visible=false;scene.add(group);
 const directions=[[1,0,0],[0,1,0],[0,0,1]],colors=['#fa5353','#29c77b','#459dff'];
 const arrows=directions.map((d,i)=>{const a=new THREE.ArrowHelper(new THREE.Vector3(...d),new THREE.Vector3(),1,colors[i],.2,.1);for(const o of [a.line,a.cone]){o.material.depthTest=false;o.renderOrder=20;}const shaft=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,8),new THREE.MeshBasicMaterial({color:colors[i],depthTest:false}));shaft.renderOrder=20;a.add(shaft);a.userData.shaft=shaft;const grip=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:colors[i],depthTest:false}));grip.renderOrder=21;grip.visible=false;a.add(grip);a.userData.grip=grip;a.line.visible=false;group.add(a);return a;});
 const ui=document.createElement('div');ui.id='moveGizmo';ui.hidden=true;
 ui.innerHTML=directions.map((_,i)=>'<button type="button" data-move-axis="'+i+'" aria-label="Move '+['X','Y','Z'][i]+'" style="--axis-color:'+colors[i]+'"><span class="axisBadge">'+['X','Y','Z'][i]+'</span></button>').join('')+'<div id="moveDistance"><label><span id="moveAxisLabel">X</span><input aria-label="Move distance" type="number" step="any" value="0"><span class="moveUnit">mm</span></label><button type="button" aria-label="Apply move">✓</button><button type="button" aria-label="Cancel move">×</button><div class="patternControls" hidden><label>Count<input aria-label="Pattern count" type="number" min="2" max="25" step="1" value="3"></label><button type="button" aria-label="Reverse pattern direction">↔</button><small>Includes original · spacing between copies</small></div><output class="transformSnap" aria-live="polite"></output></div>';
 stage.append(ui);for(const b of ui.querySelectorAll('button'))b.dataset.control='move';const buttons=[...ui.querySelectorAll('[data-move-axis]')],panel=ui.querySelector('#moveDistance'),input=ui.querySelector('input');
 let state=null,drag=null;
 function info(reset=false){return{mode:state.mode,count:state.count,reset,factor:reset?1:state.factor,pivot:state.origin.toArray()};}
 function preview(){state.valid=state.mode!=='pattern'||(Number.isInteger(Number(ui.querySelector('[aria-label="Pattern count"]').value))&&Number(ui.querySelector('[aria-label="Pattern count"]').value)>=2&&Number(ui.querySelector('[aria-label="Pattern count"]').value)<=25);input.setAttribute('aria-invalid','false');panel.querySelectorAll('button')[0].disabled=!state.valid;api.onPreview(state.ids,state.delta,info());input.value=String(Number((state.mode==='scale'?state.factor:state.delta[state.axis]/api.getUnits().factor).toFixed(4)));ui.querySelector('.transformSnap').textContent=state.snap||'';}

 function cancel(){if(!state)return;api.onPreview(state.ids,[0,0,0],info(true));state=null;drag=null;ui.hidden=true;group.visible=false;api.onNavigation(true);api.onActive?.(false);}
 function begin(items,{mode='move',count=3,spacing=30}={}){cancel();if(!items.length)throw Error('Select a solid body first');const bounds=new THREE.Box3();for(const item of items){bounds.expandByPoint(new THREE.Vector3(...item.bounds[0]));bounds.expandByPoint(new THREE.Vector3(...item.bounds[1]));}state={ids:items.map(i=>i.id),origin:bounds.getCenter(new THREE.Vector3()),bounds:[bounds.min.toArray(),bounds.max.toArray()],delta:[0,0,0],axis:0,mode,count,factor:1,snap:'',valid:true};
  if(mode==='pattern')state.delta[0]=spacing;ui.querySelector('.patternControls').hidden=mode!=='pattern';ui.querySelector('[aria-label="Pattern count"]').value=String(count);
  ui.dataset.transformMode=mode;group.name=mode==='scale'?'Uniform scale XYZ':'Move XYZ';
  buttons.forEach((b,i)=>{delete b.dataset.moveAxis;delete b.dataset.scaleAxis;delete b.dataset.patternAxis;b.dataset[mode==='pattern'?'patternAxis':mode==='scale'?'scaleAxis':'moveAxis']=String(i);b.setAttribute('aria-label',(mode==='pattern'?'Pattern ':mode==='scale'?'Scale ':'Move ')+['X','Y','Z'][i]);});
  input.setAttribute('aria-label',mode==='pattern'?'Pattern spacing':mode==='scale'?'Scale factor':'Move distance');input.required=true;input.min=mode==='scale'?'.001':'-2000';input.max=mode==='scale'?'100':'2000';input.setAttribute('aria-invalid','false');panel.querySelectorAll('button')[0].disabled=false;
  panel.querySelectorAll('button')[0].setAttribute('aria-label',mode==='pattern'?'Apply pattern':mode==='scale'?'Apply scale':'Apply move');panel.querySelectorAll('button')[1].setAttribute('aria-label',mode==='pattern'?'Cancel pattern':mode==='scale'?'Cancel scale':'Cancel move');
  ui.hidden=false;group.visible=true;input.value=mode==='scale'?'1':'0';ui.querySelector('.transformSnap').textContent='';api.onActive?.(true);preview();update();
 }

 function projection(axis){const r=stage.getBoundingClientRect(),unit=(camera.top-camera.bottom)/camera.zoom/r.height,origin=state.origin.clone().add(new THREE.Vector3(...(state.mode==='pattern'?[0,0,0]:state.delta))),p=origin.clone().project(camera),q=origin.clone().addScaledVector(new THREE.Vector3(...directions[axis]),unit*76).project(camera);return{r,unit,origin,p,q,x:(q.x-p.x)*r.width/2,y:(p.y-q.y)*r.height/2};}
 function update(){if(!state)return;group.position.copy(state.origin).add(new THREE.Vector3(...(state.mode==='pattern'?[0,0,0]:state.delta)));
  buttons.forEach((b,i)=>{const d=projection(i),len=d.unit*76;arrows[i].setLength(len,len*.22,len*.105);arrows[i].userData.shaft.scale.set(d.unit*1.25,len*.78,d.unit*1.25);arrows[i].userData.shaft.position.y=len*.39;arrows[i].cone.visible=state.mode!=='scale';arrows[i].userData.grip.visible=state.mode==='scale';arrows[i].userData.grip.scale.setScalar(d.unit*7);arrows[i].userData.grip.position.y=len*.92;const p=d.origin.clone().addScaledVector(new THREE.Vector3(...directions[i]),len*1.16).project(camera);b.style.left=((p.x+1)*d.r.width/2)+'px';b.style.top=((1-p.y)*d.r.height/2)+'px';b.setAttribute('aria-pressed',String(state.axis===i));});
  const d=projection(state.axis),x=(d.p.x+1)*d.r.width/2,y=(1-d.p.y)*d.r.height/2;panel.style.left=Math.max(8,Math.min(d.r.width-232,x+80))+'px';panel.style.top=Math.max(12,Math.min(d.r.height-(state.mode==='pattern'?180:122),y+30))+'px';ui.querySelector('#moveAxisLabel').textContent=state.mode==='scale'?'Uniform': ['X','Y','Z'][state.axis];ui.querySelector('.moveUnit').textContent=state.mode==='scale'?'×':api.getUnits().label;
 }
 buttons.forEach((b,i)=>{
  b.addEventListener('pointerdown',e=>{if(!state||api.isBusy())return;e.preventDefault();e.stopPropagation();if(state.mode==='pattern'&&state.axis!==i){const spacing=state.delta[state.axis]||30;state.delta=[0,0,0];state.delta[i]=spacing;}state.axis=i;const d=projection(i);drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:state.mode==='scale'?state.factor:state.delta[i],dx:d.x,dy:d.y,unit:d.unit};b.setPointerCapture(e.pointerId);api.onNavigation(false);preview();update();});
  b.addEventListener('pointermove',e=>{if(!state||!drag||drag.id!==e.pointerId)return;e.preventDefault();const length2=drag.dx**2+drag.dy**2;if(length2<16)return;const pixels=((e.clientX-drag.x)*drag.dx+(e.clientY-drag.y)*drag.dy)/Math.sqrt(length2),options=api.getSnap?.()||{},enabled=!!options.enabled&&!e.altKey;
   if(state.mode==='scale'){const raw=Math.max(.001,Math.min(100,drag.start+pixels/90));state.factor=enabled?Math.max(.001,roundToStep(raw,.05)):Number(raw.toFixed(4));state.snap=enabled?'Scale · 5% steps':'';}
   else{const distance=((e.clientX-drag.x)*drag.dx+(e.clientY-drag.y)*drag.dy)/length2*drag.unit*76,raw=drag.start+distance;
    const snapped=snapTranslation({bounds:state.bounds,delta:state.delta,axis:i,value:raw,targets:(api.getItems?.()||[]).filter(item=>item.kind==='body'&&!state.ids.includes(item.id)),step:options.step||1,threshold:drag.unit*8,enabled});state.delta[i]=Math.max(-2000,Math.min(2000,Number(snapped.value.toFixed(6))));state.snap=snapped.label;
   }preview();update();});

  const finish=()=>{drag=null;api.onNavigation(true);};b.addEventListener('pointerup',finish);b.addEventListener('lostpointercapture',finish);b.addEventListener('pointercancel',()=>{finish();cancel();});
 });
 const countInput=ui.querySelector('[aria-label="Pattern count"]');countInput.oninput=()=>{if(!state)return;const n=Number(countInput.value);state.valid=Number.isInteger(n)&&n>=2&&n<=25;countInput.setAttribute('aria-invalid',String(!state.valid));panel.querySelectorAll('button')[0].disabled=!state.valid;if(!state.valid){ui.querySelector('.transformSnap').textContent='Count must be a whole number from 2 to 25';return;}state.count=n;preview();};
 ui.querySelector('[aria-label="Reverse pattern direction"]').onclick=()=>{if(!state)return;state.delta[state.axis]*=-1;state.snap='';preview();update();};
 input.oninput=()=>{if(!state)return;const value=Number(input.value)*(state.mode==='scale'?1:api.getUnits().factor);if(!input.value.trim()||!Number.isFinite(value)||(state.mode==='scale'?(value<.001||value>100):Math.abs(value)>2000)){state.valid=false;input.setAttribute('aria-invalid','true');panel.querySelectorAll('button')[0].disabled=true;ui.querySelector('.transformSnap').textContent=state.mode==='scale'?'Enter a factor from 0.001 to 100':'Enter a distance from −2000 to 2000 mm';return;}if(state.mode==='scale')state.factor=value;else state.delta[state.axis]=value;state.snap='';preview();update();};

 const apply=async()=>{if(!state||state.valid===false||api.isBusy())return;const {ids,delta}=state;if(state.mode==='scale'?Math.abs(state.factor-1)<1e-9:delta.every(v=>Math.abs(v)<.001))return;try{await api.onCommit(ids,[...delta],info());cancel();}catch(e){api.onStatus(e.message);}};
 ui.querySelector('[aria-label="Apply move"]').onclick=apply;ui.querySelector('[aria-label="Cancel move"]').onclick=cancel;
 input.onkeydown=e=>{if(e.key==='Enter')apply();if(e.key==='Escape')cancel();};
 return{begin,cancel,update,get active(){return!!state;},get state(){return state?{ids:state.ids,delta:[...state.delta],axis:state.axis,mode:state.mode,count:state.count,factor:state.factor,snap:state.snap}:null;}};
}
