import opencascade from 'replicad-opencascadejs';
import wasmURL from 'replicad-opencascadejs/wasm?url';
import {setOC} from 'replicad';
import {buildModel} from './engine.js';
let current=null,signature='',queue=Promise.resolve();
const ready=opencascade({locateFile:()=>wasmURL}).then(oc=>setOC(oc));
async function model(doc){const next=JSON.stringify(doc);if(next!==signature||!current){const built=await buildModel(doc);current?.release();current=built;signature=next;}return current;}
self.onmessage=e=>{const{id,type,doc,format,ids,refs}=e.data;queue=queue.then(async()=>{try{await ready;if(type==='ready'){self.postMessage({id,ok:true,result:true});return;}if(type==='preview'){let temporary;try{temporary=await buildModel(doc);self.postMessage({id,ok:true,result:temporary.items});}finally{temporary?.release();}return;}const m=await model(doc);let result=type==='export'?await m.export(format,ids):type==='measure'?m.distance((refs||ids)[0],(refs||ids)[1]):m.items;self.postMessage({id,ok:true,result});}catch(error){self.postMessage({id,ok:false,error:typeof error==='number'?'CAD kernel rejected this geometry. Reduce the value or choose a different face/edge.':error?.message||String(error)});}});};
