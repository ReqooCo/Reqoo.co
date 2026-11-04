// Real 3D plane surfaces with matching, accessible on-canvas labels.
export function createSketchPlanePicker({THREE,scene,camera,controls,stage,onChoose,onCancel,getSelectedFace}){
 const group=new THREE.Group();group.name='Sketch plane choices';group.visible=false;scene.add(group);
 const definitions=[{plane:'XY',label:'XY · Top',centre:[17,17,0],normal:[0,0,1],color:'#498eea'},{plane:'XZ',label:'XZ · Front',centre:[-17,0,17],normal:[0,-1,0],color:'#4ac09b'},{plane:'YZ',label:'YZ · Right',centre:[0,-17,17],normal:[1,0,0],color:'#e8a45d'}];
 for(const d of definitions){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(32,32),new THREE.MeshBasicMaterial({color:d.color,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));mesh.position.set(...d.centre);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...d.normal));mesh.userData.plane=d.plane;const border=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:d.color,transparent:true,opacity:.9}));mesh.add(border);group.add(mesh);}
 const ui=document.createElement('section');ui.id='sketchPlanePicker';ui.hidden=true;ui.setAttribute('aria-label','Choose sketch plane');ui.innerHTML='<div class="planeInstructions"><strong>Choose a sketch plane</strong><span>Tap a coloured plane or use XY, XZ or YZ.</span><button type="button" data-face>Use selected face</button><button type="button" data-cancel aria-label="Cancel sketch plane selection">Cancel</button></div>'+definitions.map(d=>`<button type="button" class="planeChoice" data-plane="${d.plane}" aria-label="Sketch on ${d.plane} plane" style="--plane-color:${d.color}">${d.label}</button>`).join('');stage.append(ui);for(const b of ui.querySelectorAll('button'))b.dataset.control='planes';
 let active=false,previous=null;
 function hide(){active=false;group.visible=false;ui.hidden=true;}
 function choose(plane){if(!active)return;hide();onChoose({plane,offset:0});}
 for(const b of ui.querySelectorAll('[data-plane]'))b.onclick=()=>choose(b.dataset.plane);
 ui.querySelector('[data-face]').onclick=()=>{const face=getSelectedFace?.();if(!face)return;hide();onChoose(face);};
 function cancel(){if(!active)return;hide();if(previous){camera.position.copy(previous.position);camera.up.copy(previous.up);camera.zoom=previous.zoom;camera.updateProjectionMatrix();controls.target.copy(previous.target);controls.update();camera.updateMatrixWorld(true);}onCancel?.();}
 ui.querySelector('[data-cancel]').onclick=cancel;
 function begin(){if(active)return;previous={position:camera.position.clone(),up:camera.up.clone(),zoom:camera.zoom,target:controls.target.clone()};active=true;group.visible=true;ui.hidden=false;ui.querySelector('[data-face]').hidden=!getSelectedFace?.();controls.target.set(0,0,8);camera.up.set(0,0,1);camera.position.set(130,-160,130);camera.zoom=2;camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld(true);update();}
 function update(){if(!active)return;const r=stage.getBoundingClientRect();for(const d of definitions){const p=new THREE.Vector3(...d.centre).project(camera),b=ui.querySelector(`[data-plane="${d.plane}"]`);b.style.left=Math.max(66,Math.min(r.width-110,(p.x+1)*r.width/2))+'px';b.style.top=Math.max(180,Math.min(r.height-100,(1-p.y)*r.height/2))+'px';}}
 function pick(ray){if(!active)return false;const hit=ray.intersectObjects(group.children,false).find(h=>h.object.userData.plane);if(hit)choose(hit.object.userData.plane);return!!hit;}
 return{begin,cancel,pick,update,get active(){return active;},group};
}
