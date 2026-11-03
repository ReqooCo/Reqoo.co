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
 const shortcuts=document.createElement('div');shortcuts.className='cubeShortcuts';
 for(const [name,label]of [['top','Top'],['front','Front'],['right','Right'],['iso','ISO']]){const b=document.createElement('button');b.type='button';b.dataset.view=name;b.textContent=label;b.title=name==='iso'?'Isometric view':label+' view';b.setAttribute('aria-label',b.title);b.onclick=()=>onView(name);shortcuts.append(b);}
 root.replaceChildren(graphic,shortcuts);root.setAttribute('aria-label','View cube');
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
 let last='';
 function activate(e){const hit=e.target.closest?.('[data-cube-view]');if(!hit)return;if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();onView(hit.dataset.cubeView);}
 graphic.addEventListener('click',activate);graphic.addEventListener('keydown',activate);
 function update(theme='light'){
  const key=[...camera.quaternion.toArray(),theme,root.dataset.view].join(':');if(key===last)return;last=key;
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
