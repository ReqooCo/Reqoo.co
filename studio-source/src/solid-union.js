import * as THREE from 'three';

let engine;
export async function solidEngine(){
 if(!engine)engine=(async()=>{const [{default:Module},{default:wasmData}]=await Promise.all([import('manifold-3d'),import('manifold-3d/manifold.wasm?url&inline')]);const wasmBinary=new Uint8Array(await (await fetch(wasmData)).arrayBuffer());const api=await Module({wasmBinary});api.setup();return api})().catch(e=>{engine=null;throw e});
 return engine;
}
export async function unionMeshes(meshes,{operation='union',requireConnected=true}={}){
 const api=await solidEngine(),solids=[];let result;
 try{
  for(const m of meshes)solids.push(meshToSolid(api,m));
  result=operation==='subtract'?api.Manifold.difference(solids):api.Manifold.union(solids);
  if(result.status()!=='NoError')throw Error('Union gagal: '+result.status());
  const parts=result.decompose(),components=parts.length;parts.forEach(p=>p.delete());
  if(!components)throw Error('Hasil kosong. Pemotong menutup keseluruhan badan asal.');
  if(requireConnected&&components!==1)throw Error(`Masih ada ${components} bahagian terpisah. Gerakkan gelung/huruf supaya bertindih, atau tambah palang penghubung.`);
  const mesh=result.getMesh(),positions=[],colors=[];
  for(const vertex of mesh.triVerts){const i=vertex*mesh.numProp;positions.push(...mesh.vertProperties.slice(i,i+3));colors.push(...mesh.vertProperties.slice(i+3,i+6))}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingBox();
  return {geometry,volume:result.volume(),components};
 }finally{result?.delete();solids.forEach(s=>s.delete())}
}


export function meshToSolid(api,m){
   m.updateWorldMatrix(true,false);const g=m.geometry,p=g.getAttribute('position'),c=g.getAttribute('color'),idx=g.index;
   const props=[],tri=[],map=new Map();
   for(let i=0;i<(idx?.count||p.count);i++){
    const j=idx?idx.getX(i):i,v=new THREE.Vector3().fromBufferAttribute(p,j).applyMatrix4(m.matrixWorld),color=m.material.color.clone();
    if(c)color.multiply(new THREE.Color().fromBufferAttribute(c,j));
   const values=[v.x,v.y,v.z,color.r,color.g,color.b].map(Math.fround),key=values.join(',');
    if(!map.has(key)){map.set(key,props.length/6);props.push(...values)}tri.push(map.get(key));
   }
   // Keep geometric topology even when adjacent faces use different colors.
   const valid=[];for(let i=0;i<tri.length;i+=3){if(new Set(tri.slice(i,i+3)).size===3)valid.push(...tri.slice(i,i+3))}
   const input=new api.Mesh({numProp:6,vertProperties:new Float32Array(props),triVerts:new Uint32Array(valid)});input.merge();
   let solid;try{solid=new api.Manifold(input)}catch(e){throw Error(`${m.userData.name}: ${e.message}`)}
   if(solid.status()!=='NoError')throw Error(`${m.userData.name}: mesh tidak tertutup (${solid.status()}). Baiki mesh sebelum Union.`);
 return solid;
}

export function geometryFromSolid(solid){const mesh=solid.getMesh(),p=[],c=[];for(const id of mesh.triVerts){const i=id*mesh.numProp;p.push(...mesh.vertProperties.slice(i,i+3));if(mesh.numProp>=6)c.push(...mesh.vertProperties.slice(i+3,i+6))}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));if(c.length)g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();g.computeBoundingBox();return g}
export async function splitMesh(mesh,axis,position){const api=await solidEngine(),solid=meshToSolid(api,mesh);let parts=[];try{const normal=[0,0,0];normal[axis]=1;parts=solid.splitByPlane(normal,position);if(parts.some(p=>p.isEmpty()))throw Error('Satah potong mesti melalui objek.');return parts.map(p=>({geometry:geometryFromSolid(p),volume:p.volume()}))}finally{parts.forEach(p=>p.delete());solid.delete()}}
