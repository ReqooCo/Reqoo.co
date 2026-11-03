import * as THREE from 'three';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import scaleIcon from '@tabler/icons/outline/arrows-diagonal.svg?url';
export function installTransformGizmo({scene,group,camera,renderer,controls,editor,refresh}){
 const pivot=new THREE.Object3D();scene.add(pivot);
 const tool=new TransformControls(camera,renderer.domElement);tool.setSize(.85);tool.setSpace('world');scene.add(tool.getHelper());
 const button=document.createElement('button');button.id='scaleObject';button.setAttribute('aria-label','Scale');button.innerHTML=`<img src="${scaleIcon}" alt="">`;document.getElementById('rotateObject').after(button);button.onclick=()=>editor.setTransformMode('scale');
 let enabled=true,before=null,starts=[],inverse=new THREE.Matrix4(),changed=false;
 function sync(){if(tool.dragging)return;const items=editor.getSelectedMeshes();if(!enabled||!items.length){tool.detach();return}const bounds=new THREE.Box3();for(const m of items){m.updateWorldMatrix(true,false);bounds.union(new THREE.Box3().setFromObject(m))}bounds.getCenter(pivot.position);pivot.quaternion.identity();pivot.scale.set(1,1,1);pivot.updateMatrixWorld(true);tool.attach(pivot)}
 const previous=editor.selection;editor.selection=(...args)=>{previous(...args);sync()};
 window.addEventListener('reqoo-transform-mode',e=>{const mode=e.detail?.mode||e.detail;enabled=['translate','rotate','scale'].includes(mode);if(enabled)tool.setMode(mode);sync()});
 editor.setTransformGuard(e=>{if(!tool.enabled||!tool.object||tool.axis===null)return false;if(tool.mode==='translate'){const r=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);if(ray.intersectObjects(group.children,false).length)return false}return true});
 tool.addEventListener('mouseDown',()=>{before=editor.capture();changed=false;pivot.updateMatrixWorld(true);inverse.copy(pivot.matrixWorld).invert();starts=editor.getSelectedMeshes().map(m=>{m.updateWorldMatrix(true,false);return[m,m.matrixWorld.clone()]})});
 tool.addEventListener('objectChange',()=>{if(!before)return;pivot.scale.max(new THREE.Vector3(.01,.01,.01));pivot.updateMatrixWorld(true);group.updateWorldMatrix(true,false);const delta=pivot.matrixWorld.clone().multiply(inverse),parent=group.matrixWorld.clone().invert();for(const [m,start]of starts){parent.clone().multiply(delta).multiply(start).decompose(m.position,m.quaternion,m.scale);m.updateMatrixWorld(true)}changed=true;refresh()});
 tool.addEventListener('mouseUp',()=>{if(before){const saved=before;before=null;if(changed)editor.checkpoint(saved);else editor.discard(saved)}queueMicrotask(sync)});
 tool.addEventListener('dragging-changed',e=>{controls.enabled=!e.value});
 renderer.domElement.addEventListener('pointermove',e=>{tool.setTranslationSnap(e.shiftKey?1:editor.snapSettings.enabled?editor.snapSettings.step:null);tool.setRotationSnap(e.shiftKey?THREE.MathUtils.degToRad(15):null);tool.setScaleSnap(e.shiftKey?.1:null)},{capture:true});
 if(window.__reqoo)Object.assign(window.__reqoo,{transformControls:tool,transformPivot:pivot});sync();
}
