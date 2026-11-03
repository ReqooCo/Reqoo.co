import {getQuality} from './mesh-quality.js';
import {enforceBudget,recordMetric} from './performance-ledger.js';
import * as THREE from 'three';
let active=null;
export function meshStamp(meshes){return JSON.stringify(meshes.map(m=>[m.uuid,m.parent?.uuid,m.geometry.uuid,m.geometry.attributes.position.version,m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),m.material.color.getHex()]))}
export function packMeshes(meshes){return meshes.map(m=>{m.updateWorldMatrix(true,false);const attributes={};for(const [name,a]of Object.entries(m.geometry.attributes))attributes[name]={array:a.array.slice(),itemSize:a.itemSize};return {attributes,index:m.geometry.index?.array.slice(),matrix:m.matrixWorld.toArray(),color:m.material.color.getHex(),name:m.userData.name}})}
export function unpackGeometry(data){const g=new THREE.BufferGeometry();for(const [n,a]of Object.entries(data.attributes))g.setAttribute(n,new THREE.BufferAttribute(a.array,a.itemSize));if(data.index)g.setIndex(new THREE.BufferAttribute(data.index,1));g.computeBoundingBox();return g}
export function runSolidJob(type,meshes,parameters={}){
 if(active)return Promise.reject(Error('Tunggu operasi semasa atau tekan Batal.'));
 let stats;try{stats=enforceBudget(meshes)}catch(e){return Promise.reject(e)}const started=performance.now(),quality=getQuality();const stamp=meshStamp(meshes),worker=new Worker(new URL('./solid-worker.js',import.meta.url),{type:'module'});
 return new Promise((resolve,reject)=>{let timeout;const panel=document.createElement('div');panel.id='solidJob';panel.role='status';const label=document.createElement('span');label.textContent='Mengira bentuk…';const cancel=document.createElement('button');cancel.id='cancelSolidJob';cancel.textContent='Batal';panel.append(label,cancel);(document.querySelector('dialog[open]:not(.generatorInline)')||document.querySelector('#generatorParameters .generatorInline:not([hidden])')||document.body).append(panel);
 const finish=(error,result)=>{if(active?.worker!==worker)return;clearTimeout(timeout);worker.terminate();panel.remove();active=null;recordMetric({stage:type,quality,ms:performance.now()-started,...stats,status:error?'cancel/error':'ok'});error?reject(error):resolve(result)};
 active={worker,cancel:()=>finish(Error('Operasi dibatalkan. Objek asal dikekalkan.'))};cancel.onclick=active.cancel;
 timeout=setTimeout(()=>finish(Error('Operasi mengambil terlalu lama. Ringkaskan model dan cuba semula.')),90000);
 worker.onerror=e=>finish(Error(e.message||'Pemproses bentuk gagal.'));
 worker.onmessage=({data})=>{if(data.progress){label.textContent=data.progress;return}if(data.error)return finish(Error(data.error));if(meshStamp(meshes)!==stamp)return finish(Error('Objek berubah semasa proses. Cuba semula.'));const result=data.result;for(const key of ['geometry','body','cover','base','shade'])if(result[key])result[key]=unpackGeometry(result[key]);if(result.parts)result.parts=result.parts.map(p=>({...p,geometry:unpackGeometry(p.geometry)}));finish(null,result)};
 try{const packed=packMeshes(meshes),transfer=packed.flatMap(m=>[...Object.values(m.attributes).map(a=>a.array.buffer),...(m.index?[m.index.buffer]:[])]);worker.postMessage({type,meshes:packed,parameters:{...parameters,_quality:quality}},transfer)}catch(e){finish(e)}
 });
}
export function cancelSolidJob(){active?.cancel()}
