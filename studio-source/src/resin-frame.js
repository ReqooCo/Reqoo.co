import * as THREE from 'three';
import {runSolidJob} from './solid-jobs.js';
import {solidEngine} from './solid-union.js';

// Project triangles rather than their bounding boxes, including imported logos.
// Positive winding produces the XY silhouette without requiring a closed input.
export async function makeResinFrame(meshes,{floor,gap,wall,rise,style,keepHoles}){
 const api=await solidEngine(),owned=[];const own=o=>(owned.push(o),o);
 try{
  const triangles=[],bounds=new THREE.Box3();
  for(const m of meshes){m.updateWorldMatrix(true,false);bounds.union(new THREE.Box3().setFromObject(m));const p=m.geometry.attributes.position,idx=m.geometry.index,n=idx?.count||p.count;if(triangles.length+n/3>200000)throw Error('Logo terlalu kompleks untuk bingkai. Ringkaskan mesh dahulu.');
   for(let i=0;i<n;i+=3){const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(m.matrixWorld));const area=(v[1].x-v[0].x)*(v[2].y-v[0].y)-(v[1].y-v[0].y)*(v[2].x-v[0].x);if(Math.abs(area)<1e-9)continue;if(area<0)[v[1],v[2]]=[v[2],v[1]];triangles.push(v.map(p=>[p.x,p.y]))}
  }
  if(!triangles.length)throw Error('Tiada permukaan XY untuk dijadikan bingkai.');
  const projected=own(new api.CrossSection(triangles,'NonZero')),polygons=projected.toPolygons();
  const signedArea=poly=>poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1]},0);
  const outerLoops=polygons.filter(p=>signedArea(p)>0),holeLoops=polygons.filter(p=>signedArea(p)<0).map(p=>[...p].reverse());
  const footprint=own(new api.CrossSection(outerLoops,'NonZero'));
  let inside,outside;
  if(style==='rectangle'){
   const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   inside=own(own(api.CrossSection.square([size.x+gap*2,size.y+gap*2],true)).translate([center.x,center.y]));
   outside=own(inside.offset(wall,'Round',2,192));
  }else{inside=own(footprint.offset(gap,'Round',2,192));outside=own(footprint.offset(gap+wall,'Round',2,192));}
  let bottom=outside,rim=own(outside.subtract(inside));
  if(keepHoles&&holeLoops.length){
   const holes=own(new api.CrossSection(holeLoops,'NonZero'));
   bottom=own(outside.subtract(holes));
   const holeWalls=own(own(holes.offset(wall,'Round',2,192)).subtract(holes));rim=own(api.CrossSection.union([rim,holeWalls]));
  }
  const floorTop=bounds.min.z+.15;
  const base=own(own(bottom.extrude(floor)).translate([0,0,floorTop-floor]));
  const walls=own(own(rim.extrude(bounds.max.z+rise-floorTop+.02)).translate([0,0,floorTop-.02]));
  const tray=own(api.Manifold.union([base,walls]));if(tray.status()!=='NoError')throw Error('Bingkai gagal: '+tray.status());
  const parts=tray.decompose(),components=parts.length;parts.forEach(p=>p.delete());if(components!==1)throw Error('Kontur masih terpisah. Besarkan jarak bingkai atau pilih Bingkai petak.');
  const mesh=tray.getMesh(),positions=[];for(const id of mesh.triVerts){const i=id*mesh.numProp;positions.push(mesh.vertProperties[i],mesh.vertProperties[i+1],mesh.vertProperties[i+2])}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();return {geometry,components,volume:tray.volume(),capacityMl:Math.max(0,(inside.area()*(bounds.max.z+rise-floorTop)-footprint.area()*Math.max(0,bounds.max.z-floorTop))/1000)};
 }finally{owned.reverse().forEach(o=>o.delete())}
}

export function installResinFrame({group,add,choose,getSelected,refresh,status,editor}){
 const $=id=>document.getElementById(id),panel=document.createElement('details');panel.className='panel';panel.id='resinPanel';
 panel.innerHTML=`<summary>Bingkai resin — huruf / logo / plat</summary><section>
 <label>Objek untuk dibingkaikan</label><select id="resinScope"><option value="all">Semua objek reka bentuk</option><option value="selected">Objek dipilih sahaja (contoh logo)</option></select>
 <label>Bentuk bingkai</label><select id="resinStyle"><option value="contour">Mengikut kontur reka bentuk</option><option value="rectangle">Bingkai petak</option></select>
 <div class="propertyGrid"><div><label>Lantai resin (mm)</label><input id="resinFloor" type="number" min="0.5" max="5" step="0.1" value="1.2"></div><div><label>Jarak dari reka bentuk (mm)</label><input id="resinGap" type="number" min="0.5" max="12" step="0.5" value="1.5"></div><div><label>Tebal dinding (mm)</label><input id="resinWall" type="number" min="0.8" max="5" step="0.1" value="1.2"></div><div><label>Bibir di atas reka bentuk (mm)</label><input id="resinRise" type="number" min="0.3" max="8" step="0.1" value="1.5"></div></div>
 <label class="noBaseOption"><input id="resinKeepHoles" type="checkbox" checked> Kekalkan semua lubang tembus</label>
 <label>Warna bingkai</label><input id="resinColor" type="color" value="#171717">
 <button id="addResinFrame" class="primary">Jana bingkai resin</button>
 <small>Lantai dan dinding dijana sebagai satu dulang. Lubang tembus mendapat dinding sekeliling supaya resin tidak mengalir ke lubang. Reka bentuk diangkat ke atas lantai. Union semua untuk satu keping; Ctrl+Z untuk kembali.</small>
 <small>Untuk logo: import SVG/STL atau relief dahulu, pilih objek logo, kemudian jana bingkai. Bingkai sedia ada tidak dimasukkan sekali lagi.</small></section>`;
 $('attachmentPanel').after(panel);$('resinScope').value='selected';
 $('addResinFrame').onclick=async()=>{const button=$('addResinFrame');button.disabled=true;try{
  const selected=editor.getSelectedMeshes(),meshes=($('resinScope').value==='selected'?selected:group.children.filter(m=>!m.userData.hangingRole||m.userData.hangingBoard)).filter(m=>!m.userData.resinFrame);if(!meshes.length)throw Error('Pilih huruf, logo atau plat dahulu.');
  const values=['resinFloor','resinGap','resinWall','resinRise'].map(id=>Number($(id).value));const ranges=[[.5,5],[.5,12],[.8,5],[.3,8]];if(values.some((v,i)=>!Number.isFinite(v)||v<ranges[i][0]||v>ranges[i][1]))throw Error('Ukuran bingkai di luar julat yang dibenarkan.');
  const params={floor:values[0],gap:values[1],wall:values[2],rise:values[3],style:$('resinStyle').value,keepHoles:$('resinKeepHoles').checked};status('Membina lantai dan bingkai resin…');await new Promise(r=>setTimeout(r,30));
  const result=await runSolidJob('resin',meshes,params);editor.checkpoint();if($('resinScope').value==='all'){for(const old of [...group.children].filter(m=>m.userData.resinFrame)){group.remove(old);old.geometry.dispose();old.material.dispose()}}const lift=Math.max(0,-result.geometry.boundingBox.min.z);meshes.forEach(m=>m.position.z+=lift);const m=add(result.geometry,'Bingkai resin — '+(params.style==='contour'?'kontur':'petak'),$('resinColor').value);m.position.set(0,0,lift);m.userData.resinFrame={...params,components:result.components,volume:result.volume,capacityMl:result.capacityMl};m.userData.part='base';choose(m,true);status('Bingkai resin siap. Semak dinding/lubang, kemudian Union semua untuk satu keping.');
 }catch(e){status('Bingkai tidak dibuat. '+e.message)}finally{button.disabled=false;refresh()}};
}
