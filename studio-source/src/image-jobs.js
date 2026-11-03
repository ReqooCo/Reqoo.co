import {getQuality} from './mesh-quality.js';
import * as THREE from 'three';
let worker=null,nextId=0;const pending=new Map();
export function cancelImageJobs(){worker?.terminate();worker=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Pemprosesan gambar dibatalkan.'))}pending.clear()}
export function runImageJob(type,payload,transfer=[]){
 if(!worker){worker=new Worker(new URL('./image-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;pending.delete(data.id);clearTimeout(job.timer);data.error?job.reject(Error(data.error)):job.resolve(data.result)};worker.onerror=e=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(e.message||'Pemproses imej gagal.'))}pending.clear();worker?.terminate();worker=null}};
 return new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(cancelImageJobs,60000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,type,payload,quality:getQuality()},transfer)});
}
export function decodeGeometry(result){const geometry=new THREE.BufferGeometry();for(const [name,attr]of Object.entries(result.attributes))geometry.setAttribute(name,new THREE.BufferAttribute(attr.array.slice(),attr.itemSize));if(result.index)geometry.setIndex(new THREE.BufferAttribute(result.index.slice(),1));geometry.computeBoundingBox();return{...result,geometry,attributes:undefined}}
