import * as THREE from 'three';
import {solidEngine,meshToSolid} from './solid-union.js';
export const PLATES=[{id:'256',label:'256 × 256 mm',width:256,height:256},{id:'180',label:'180 × 180 mm',width:180,height:180},{id:'300',label:'300 × 300 mm',width:300,height:300},{id:'custom',label:'Custom',width:256,height:256}];
export function checkBounds(meshes,profile){
 const issues=[],bounds=new THREE.Box3();
 for(const m of meshes){const b=new THREE.Box3().setFromObject(m);bounds.union(b);const size=b.getSize(new THREE.Vector3());if(![...b.min.toArray(),...b.max.toArray()].every(Number.isFinite))issues.push({name:m.userData.name,level:'error',kind:'finite'});if(b.min.x< -profile.width/2+profile.margin||b.max.x>profile.width/2-profile.margin||b.min.y< -profile.height/2+profile.margin||b.max.y>profile.height/2-profile.margin)issues.push({name:m.userData.name,level:'warning',kind:'plate'});if(b.min.z< -.05)issues.push({name:m.userData.name,level:'warning',kind:'below'});if(Math.min(size.x,size.y)<profile.lineWidth)issues.push({name:m.userData.name,level:'warning',kind:'small'});}
 return {issues,size:bounds.isEmpty()?[0,0,0]:bounds.getSize(new THREE.Vector3()).toArray()};
}
export async function inspectMeshes(meshes,{lineWidth=.45}={}){
 const api=await solidEngine(),results=[];
 for(const mesh of meshes){let solid,section,opened,eroded;try{
  solid=meshToSolid(api,mesh);const components=solid.decompose();const count=components.length;components.forEach(c=>c.delete());
  const polygons=[],g=mesh.geometry,p=g.attributes.position,idx=g.index;mesh.updateWorldMatrix(true,false);
  if((idx?.count||p.count)>600000){results.push({name:mesh.userData.name,components:count,volume:solid.volume(),fineArea:null,limited:true});continue;}
  for(let i=0;i<(idx?.count||p.count);i+=3){const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));const area=(v[1].x-v[0].x)*(v[2].y-v[0].y)-(v[1].y-v[0].y)*(v[2].x-v[0].x);if(area>1e-7)polygons.push(v.map(v=>[v.x,v.y]));}
  section=new api.CrossSection(polygons,'NonZero');eroded=section.offset(-lineWidth/2,'Round',2,32);opened=eroded.offset(lineWidth/2,'Round',2,32);const loss=Math.max(0,section.area()-opened.area());
  results.push({name:mesh.userData.name,components:count,volume:solid.volume(),fineArea:loss,fineRatio:section.area()?loss/section.area():0});
 }catch(e){results.push({name:mesh.userData.name,error:e.message})}finally{solid?.delete();section?.delete();opened?.delete();eroded?.delete()}}
 return {results,coverage:{solidEngine:'verified after normalization for each successful result',fineFeatures:'XY projection estimate only',wallThickness:'not checked',selfIntersections:'not checked',overhangs:'not checked',physicalFit:'not checked'}};
}
