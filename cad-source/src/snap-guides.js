// All markers are display-only. They never enter CAD topology or hit testing.
export function createSnapGuides({THREE,camera,stage}){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.id='snapGuides';svg.setAttribute('aria-hidden','true');stage.append(svg);
 const group=document.createElementNS(ns,'g');svg.append(group);const line=document.createElementNS(ns,'line'),dot=document.createElementNS(ns,'circle'),start=document.createElementNS(ns,'circle');group.append(line,start,dot);dot.setAttribute('r','6');start.setAttribute('r','3');
 const hint=document.createElement('output');hint.id='snapFeedback';hint.setAttribute('aria-live','polite');hint.hidden=true;stage.append(hint);
 const axesGroup=document.createElementNS(ns,'g');axesGroup.classList.add('alignmentAxes');svg.append(axesGroup);
 let snap=null,axes=[],axisNodes=[],lastView='';
 const projected=(point,r)=>{const p=new THREE.Vector3(...point).project(camera);return{x:(p.x+1)*r.width/2,y:(1-p.y)*r.height/2,z:p.z};};
 function setLine(el,a,b){el.setAttribute('x1',a.x);el.setAttribute('y1',a.y);el.setAttribute('x2',b.x);el.setAttribute('y2',b.y);}
 function update(){const r=stage.getBoundingClientRect(),view=JSON.stringify([r.width,r.height,camera.matrixWorld.elements,camera.projectionMatrix.elements,snap,axes]);if(view===lastView)return;lastView=view;svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);group.style.display=!snap?'none':'';line.style.display=snap?.showGuides===false?'none':'';start.style.display=snap?.showGuides===false?'none':'';hint.hidden=!snap||snap.showHints===false;
  if(snap){const p=projected(snap.point,r),q=projected(snap.from||snap.point,r);setLine(line,q,p);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);start.setAttribute('cx',q.x);start.setAttribute('cy',q.y);group.dataset.kind=snap.kind||'point';dot.setAttribute('r',snap.kind==='centre'||snap.kind==='origin'?'7':'6');hint.dataset.kind=snap.kind||'point';if(hint.textContent!==snap.label)hint.textContent=snap.label;hint.style.left=Math.max(8,Math.min(r.width-230,p.x+14))+'px';hint.style.top=Math.max(8,Math.min(r.height-100,p.y-32))+'px';}
  for(const [i,axis]of axes.entries()){const a=projected(axis.from,r),b=projected(axis.to,r),[line,c]=axisNodes[i];setLine(line,a,b);line.dataset.role=axis.role||(i===0?'moving':'target');c.setAttribute('cx',(a.x+b.x)/2);c.setAttribute('cy',(a.y+b.y)/2);c.dataset.role=line.dataset.role;}

 }
 return{show(value){snap=value;update();},hide(){snap=null;update();},setAxes(value=[]){axes=value;if(axisNodes.length!==axes.length){axesGroup.replaceChildren();axisNodes=axes.map(()=>{const line=document.createElementNS(ns,'line'),circle=document.createElementNS(ns,'circle');circle.setAttribute('r','5');axesGroup.append(line,circle);return[line,circle];});}update();},update,get state(){return snap;}};
}
