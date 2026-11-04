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
 const arrows=directions.map((d,i)=>{const a=new THREE.ArrowHelper(new THREE.Vector3(...d),new THREE.Vector3(),1,colors[i],.2,.1);for(const o of [a.line,a.cone]){o.material.depthTest=false;o.renderOrder=20;}group.add(a);return a;});
 const ui=document.createElement('div');ui.id='moveGizmo';ui.hidden=true;
 ui.innerHTML=directions.map((_,i)=>'<button type="button" data-move-axis="'+i+'" aria-label="Move '+['X','Y','Z'][i]+'" style="--axis-color:'+colors[i]+'">'+['X','Y','Z'][i]+'</button>').join('')+'<div id="moveDistance"><label><span id="moveAxisLabel">X</span><input aria-label="Move distance" type="number" step="any" value="0"><span class="moveUnit">mm</span></label><button type="button" aria-label="Apply move">✓</button><button type="button" aria-label="Cancel move">×</button></div>';
 stage.append(ui);const buttons=[...ui.querySelectorAll('[data-move-axis]')],panel=ui.querySelector('#moveDistance'),input=ui.querySelector('input');
 let state=null,drag=null;
 function preview(){api.onPreview(state.ids,state.delta);input.value=String(Number((state.delta[state.axis]/api.getUnits().factor).toFixed(4)));}
 function cancel(){if(!state)return;api.onPreview(state.ids,[0,0,0]);state=null;drag=null;ui.hidden=true;group.visible=false;api.onNavigation(true);}
 function begin(items){cancel();if(!items.length)throw Error('Select a solid body to move');const bounds=new THREE.Box3();for(const item of items){bounds.expandByPoint(new THREE.Vector3(...item.bounds[0]));bounds.expandByPoint(new THREE.Vector3(...item.bounds[1]));}state={ids:items.map(i=>i.id),origin:bounds.getCenter(new THREE.Vector3()),delta:[0,0,0],axis:0};ui.hidden=false;group.visible=true;input.value='0';update();}
 function projection(axis){const r=stage.getBoundingClientRect(),unit=(camera.top-camera.bottom)/camera.zoom/r.height,origin=state.origin.clone().add(new THREE.Vector3(...state.delta)),p=origin.clone().project(camera),q=origin.clone().addScaledVector(new THREE.Vector3(...directions[axis]),unit*76).project(camera);return{r,unit,origin,p,q,x:(q.x-p.x)*r.width/2,y:(p.y-q.y)*r.height/2};}
 function update(){if(!state)return;group.position.copy(state.origin).add(new THREE.Vector3(...state.delta));
  buttons.forEach((b,i)=>{const d=projection(i),len=d.unit*76;arrows[i].setLength(len,len*.22,len*.105);const p=d.origin.clone().addScaledVector(new THREE.Vector3(...directions[i]),len*.88).project(camera);b.style.left=((p.x+1)*d.r.width/2)+'px';b.style.top=((1-p.y)*d.r.height/2)+'px';b.setAttribute('aria-pressed',String(state.axis===i));});
  const d=projection(state.axis),x=(d.p.x+1)*d.r.width/2,y=(1-d.p.y)*d.r.height/2;panel.style.left=Math.max(8,Math.min(d.r.width-218,x+80))+'px';panel.style.top=Math.max(12,Math.min(d.r.height-58,y+30))+'px';ui.querySelector('#moveAxisLabel').textContent=['X','Y','Z'][state.axis];ui.querySelector('.moveUnit').textContent=api.getUnits().label;
 }
 buttons.forEach((b,i)=>{
  b.addEventListener('pointerdown',e=>{if(!state||api.isBusy())return;e.preventDefault();e.stopPropagation();state.axis=i;const d=projection(i);drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:state.delta[i],dx:d.x,dy:d.y,unit:d.unit};b.setPointerCapture(e.pointerId);api.onNavigation(false);preview();update();});
  b.addEventListener('pointermove',e=>{if(!state||!drag||drag.id!==e.pointerId)return;e.preventDefault();const length2=drag.dx**2+drag.dy**2;if(length2<16)return;const distance=((e.clientX-drag.x)*drag.dx+(e.clientY-drag.y)*drag.dy)/length2*drag.unit*76;state.delta[i]=Math.round((drag.start+distance)*100)/100;preview();update();});
  const finish=()=>{drag=null;api.onNavigation(true);};b.addEventListener('pointerup',finish);b.addEventListener('lostpointercapture',finish);b.addEventListener('pointercancel',()=>{finish();cancel();});
 });
 input.oninput=()=>{if(!state)return;const value=Number(input.value)*api.getUnits().factor;if(!Number.isFinite(value)||Math.abs(value)>2000)return;state.delta[state.axis]=value;preview();update();};
 const apply=async()=>{if(!state||api.isBusy())return;const {ids,delta}=state;if(delta.every(v=>Math.abs(v)<.001))return;try{await api.onCommit(ids,[...delta]);cancel();}catch(e){api.onStatus(e.message);}};
 ui.querySelector('[aria-label="Apply move"]').onclick=apply;ui.querySelector('[aria-label="Cancel move"]').onclick=cancel;
 input.onkeydown=e=>{if(e.key==='Enter')apply();if(e.key==='Escape')cancel();};
 return{begin,cancel,update,get active(){return!!state;},get state(){return state?{ids:state.ids,delta:[...state.delta],axis:state.axis}:null;}};
}
