import {geometryDiagnostics} from './manufacturing-core.js';
import {enforceBudget,recordMetric} from './performance-ledger.js';
import {getQuality} from './mesh-quality.js';
import * as THREE from 'three';
import {zipSync,strToU8} from 'three/addons/libs/fflate.module.js';

const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Standard 3MF core materials, in millimetres. Parts share their original
// coordinates and are assembled into one build object, avoiding STL auto-centering.
export function exportColor3MF(meshes){
 if(!meshes.length)throw Error('Tiada objek untuk dieksport.');const started=performance.now(),stats=enforceBudget(meshes);meshes.forEach(m=>geometryDiagnostics(m.geometry));
 const palette=[],colorIndex=new Map(),objects=[],materialNames=Object.assign({},...meshes.map(m=>m.userData.materialNames||{}));
 const materialIndex=color=>{const hex='#'+color.getHexString().toUpperCase()+'FF';if(!colorIndex.has(hex)){colorIndex.set(hex,palette.length);palette.push(hex)}return colorIndex.get(hex)};
 for(const [part,m]of meshes.entries()){
  m.updateWorldMatrix(true,false);const geometry=m.geometry,position=geometry.getAttribute('position'),colors=geometry.getAttribute('color'),indices=geometry.getIndex(),vertices=[],vertexIds=new Map(),triangles=[];
  const addVertex=index=>{const v=new THREE.Vector3().fromBufferAttribute(position,index).applyMatrix4(m.matrixWorld);if(![v.x,v.y,v.z].every(Number.isFinite))throw Error('Koordinat mesh tidak sah.');const p=[v.x,v.y,v.z].map(n=>Math.round(n*1e6)/1e6),key=p.join(',');if(!vertexIds.has(key)){vertexIds.set(key,vertices.length);vertices.push(p)}return vertexIds.get(key)};
  for(let i=0;i<(indices?.count||position.count);i+=3){const ids=[0,1,2].map(j=>indices?indices.getX(i+j):i+j);if(m.matrixWorld.determinant()<0)[ids[1],ids[2]]=[ids[2],ids[1]];const color=m.material.color.clone();if(colors){const c=new THREE.Color(0,0,0);ids.forEach(id=>{c.r+=colors.getX(id)/3;c.g+=colors.getY(id)/3;c.b+=colors.getZ(id)/3});color.multiply(c)}const p=materialIndex(color),v=ids.map(addVertex);if(new Set(v).size!==3)continue;triangles.push(`<triangle v1="${v[0]}" v2="${v[1]}" v3="${v[2]}" pid="1" p1="${p}" p2="${p}" p3="${p}"/>`)}
  if(!triangles.length)throw Error('Mesh kosong: '+m.userData.name);
  objects.push(`<object id="${part+2}" type="model" name="${xml(m.userData.name||'Objek '+(part+1))}"><mesh><vertices>${vertices.map(v=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh></object>`);
 }
 const assembly=meshes.length+2,model=`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">Reqoo 3D Studio</metadata><metadata name="Title">Reqoo multicolor design</metadata><resources><basematerials id="1">${palette.map((c,i)=>`<base name="${xml(materialNames[c.slice(0,7)]||'Warna '+(i+1))} ${c.slice(0,7)}" displaycolor="${c}"/>`).join('')}</basematerials>${objects.join('')}<object id="${assembly}" type="model" name="Reqoo design"><components>${meshes.map((_,i)=>`<component objectid="${i+2}"/>`).join('')}</components></object></resources><build><item objectid="${assembly}"/></build></model>`;
 const bytes=zipSync({
  '[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
  '_rels/.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
  '3D/3dmodel.model':strToU8(model),
 },{level:6});
 recordMetric({stage:'export3mf',quality:getQuality(),ms:performance.now()-started,...stats,outputBytes:bytes.byteLength,status:'ok'});return bytes;
}
