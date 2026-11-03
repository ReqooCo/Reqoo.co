import * as THREE from 'three';
// OBJ vertex colours are read by Bambu's colour import dialog. No printer
// configuration is embedded, so older Bambu versions skip the 3MF config check.
export function exportColorOBJ(meshes){
 if(!meshes.length)throw Error('Tiada objek untuk dieksport.');
 const lines=['# Reqoo 3D Studio - millimetres - RGB vertex colours'];let offset=1;
 for(const m of meshes){m.updateWorldMatrix(true,false);const p=m.geometry.attributes.position,c=m.geometry.attributes.color,idx=m.geometry.index;
  lines.push('o '+String(m.userData.name||'Reqoo').replace(/[^\p{L}\p{N}_-]/gu,'_'));
  for(let i=0;i<(idx?.count||p.count);i+=3){const ids=[0,1,2].map(j=>idx?idx.getX(i+j):i+j),colour=m.material.color.clone();if(m.matrixWorld.determinant()<0)[ids[1],ids[2]]=[ids[2],ids[1]];if(c){const face=new THREE.Color(0,0,0);ids.forEach(k=>{face.r+=c.getX(k)/3;face.g+=c.getY(k)/3;face.b+=c.getZ(k)/3});colour.multiply(face)}colour.convertLinearToSRGB();
   for(const k of ids){const v=new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(m.matrixWorld);if(![v.x,v.y,v.z].every(Number.isFinite))throw Error('Koordinat mesh tidak sah.');lines.push('v '+[v.x,v.y,v.z,colour.r,colour.g,colour.b].map(n=>Number(n.toFixed(6))).join(' '))}lines.push(`f ${offset} ${offset+1} ${offset+2}`);offset+=3;
  }
 }return new TextEncoder().encode(lines.join('\n')+'\n');
}
