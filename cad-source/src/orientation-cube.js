// The orientation cube projects world-space faces using the modeling camera.
// It has no second WebGL renderer and never changes CAD geometry.
export function cubeDirection(name){
 const named={top:[0,0,1],bottom:[0,0,-1],front:[0,-1,0],back:[0,1,0],right:[1,0,0],left:[-1,0,0],iso:[1,-1,1]};
 if(named[name])return named[name];
 if(/^(edge|corner):/.test(name)){const a=name.split(':')[1].split(',').map(Number);if(a.length===3&&a.every(v=>[-1,0,1].includes(v))&&a.some(Boolean))return a;}
 return named.iso;
}
export function createOrientationCube({THREE,camera,controls,root,onView}){
 const ns='http://www.w3.org/2000/svg',graphic=document.createElementNS(ns,'svg');graphic.classList.add('orientationGraphic');graphic.setAttribute('viewBox','0 0 128 112');graphic.setAttribute('aria-label','Interactive orientation cube');
 root.replaceChildren(graphic);root.setAttribute('aria-label','View cube');
 const vertices=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
 const faces=[{name:'top',n:[0,0,1],v:[4,5,6,7]},{name:'bottom',n:[0,0,-1],v:[0,3,2,1]},{name:'front',n:[0,-1,0],v:[0,1,5,4]},{name:'back',n:[0,1,0],v:[3,7,6,2]},{name:'right',n:[1,0,0],v:[1,2,6,5]},{name:'left',n:[-1,0,0],v:[0,4,7,3]}];

 const node=(tag,attrs,parent=graphic)=>{const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);parent.append(el);return el;};
 const faceNodes=new Map(),edgeNodes=new Map(),cornerNodes=new Map();
 for(const face of faces){
  const group=node('g',{}),polygon=node('polygon',{class:'cubeFace','data-cube-view':face.name,role:'button',tabindex:0,'aria-label':face.name+' face'},group),text=node('text',{},group);text.textContent=face.name.toUpperCase();faceNodes.set(face.name,{group,polygon,text});
  for(let j=0;j<4;j++){const pair=[face.v[j],face.v[(j+1)%4]].sort((a,b)=>a-b),key=pair.join(':');if(!edgeNodes.has(key)){const d=vertices[pair[0]].map((v,i)=>(v+vertices[pair[1]][i])/2);edgeNodes.set(key,{pair,el:node('line',{class:'cubeEdge','data-cube-view':'edge:'+d.join(','),role:'button',tabindex:0,'aria-label':'Edge view '+d.join(' ')})});}}
 }
 // Put all edge/corner targets above faces, with no per-frame DOM replacement.
 for(const edge of edgeNodes.values())graphic.append(edge.el);
 vertices.forEach((p,i)=>cornerNodes.set(i,node('circle',{class:'cubeCorner','data-cube-view':'corner:'+p.join(','),role:'button',tabindex:0,'aria-label':'Corner view '+p.join(' '),r:6})));
 let last='',drag=null,suppressClick=false;
 // Camera-local rotation also works from exact top and bottom views.
 graphic.style.touchAction='none';graphic.style.userSelect='none';graphic.style.cursor='grab';
 graphic.addEventListener('pointerdown',e=>{
  if(drag||e.isPrimary===false||e.button!==0)return;
  e.preventDefault();e.stopPropagation();suppressClick=false;
  drag={view:e.target.closest?.('[data-cube-view]')?.dataset.cubeView,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,enabled:controls.enabled,
   offset:camera.position.clone().sub(controls.target),up:camera.up.clone(),
   right:new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),
   vertical:new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion)};
  controls.stopMotion?.();controls.enabled=false;graphic.setPointerCapture(e.pointerId);graphic.style.cursor='grabbing';
 });
 graphic.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<4)return;
  drag.moved=true;e.preventDefault();e.stopPropagation();
  const scale=Math.PI/Math.max(80,graphic.getBoundingClientRect().width);
  const yaw=new THREE.Quaternion().setFromAxisAngle(drag.vertical,-dx*scale);
  const pitch=new THREE.Quaternion().setFromAxisAngle(drag.right,-dy*scale);
  const rotation=pitch.multiply(yaw);
  camera.position.copy(controls.target).add(drag.offset.clone().applyQuaternion(rotation));
  camera.up.copy(drag.up).applyQuaternion(rotation);camera.lookAt(controls.target);
  root.dataset.orientation='free';controls.syncPose?.();update(document.documentElement.dataset.theme||'light');
 });
 function endDrag(e){
  if(!drag||drag.id!==e.pointerId)return;
  const snap=e.type==='pointerup'&&!drag.moved?drag.view:null;
  suppressClick=true;
  controls.enabled=drag.enabled;drag=null;graphic.style.cursor='grab';
  if(graphic.hasPointerCapture(e.pointerId))graphic.releasePointerCapture(e.pointerId);
  if(snap)onView(snap);
 }
 graphic.addEventListener('pointerup',endDrag);graphic.addEventListener('pointercancel',endDrag);graphic.addEventListener('lostpointercapture',endDrag);

 function activate(e){if(e.type==='click'&&suppressClick){suppressClick=false;e.preventDefault();e.stopPropagation();return;}const hit=e.target.closest?.('[data-cube-view]');if(!hit)return;if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();onView(hit.dataset.cubeView);}
 graphic.addEventListener('click',activate);graphic.addEventListener('keydown',activate);
 function update(theme='light'){
  const key=[...camera.quaternion.toArray(),theme,root.dataset.orientation].join(':');if(key===last)return;last=key;
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),eye=camera.position.clone().sub(controls.target).normalize();
  const projected=vertices.map(p=>{const v=new THREE.Vector3(...p);return{x:64+v.dot(right)*27,y:54-v.dot(up)*27};}),visibleEdges=new Set(),visibleCorners=new Set();
  for(const f of faces){
   const {group,polygon,text}=faceNodes.get(f.name),visible=new THREE.Vector3(...f.n).dot(eye)>.001;group.style.display=visible?'':'none';if(!visible)continue;
   const pts=f.v.map(i=>projected[i]);polygon.setAttribute('points',pts.map(p=>p.x+','+p.y).join(' '));polygon.setAttribute('fill',theme==='dark'?(f.name==='top'?'#4a6785':f.name==='right'?'#263d56':'#36516e'):(f.name==='top'?'#f5f9ff':f.name==='right'?'#c7d8ed':'#dfebfa'));
   text.setAttribute('x',pts.reduce((n,p)=>n+p.x,0)/4);text.setAttribute('y',pts.reduce((n,p)=>n+p.y,0)/4+3);
   for(let j=0;j<4;j++){visibleEdges.add([f.v[j],f.v[(j+1)%4]].sort((a,b)=>a-b).join(':'));visibleCorners.add(f.v[j]);}
  }
  for(const [key,{pair,el}]of edgeNodes){el.style.display=visibleEdges.has(key)?'':'none';const p=projected[pair[0]],q=projected[pair[1]];for(const [k,v]of Object.entries({x1:p.x,y1:p.y,x2:q.x,y2:q.y}))el.setAttribute(k,v);}
  for(const [i,el]of cornerNodes){el.style.display=visibleCorners.has(i)?'':'none';el.setAttribute('cx',projected[i].x);el.setAttribute('cy',projected[i].y);}
 }
 return{update};
}
