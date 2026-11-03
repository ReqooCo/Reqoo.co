import {setQuality} from './mesh-quality.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildSignTitle} from './sign-title.js';
import {tracePixels,importedGeometry} from './image-geometry.js';
self.onmessage=async({data:{id,type,payload,quality}})=>{try{setQuality(quality||'final');
 if(type==='sign-title'){const built=await buildSignTitle(payload),transfer=[];const pack=original=>{const geometry=mergeVertices(original,.0001);original.dispose();const attributes={};for(const [name,attr]of Object.entries(geometry.attributes)){attributes[name]={array:attr.array,itemSize:attr.itemSize};transfer.push(attr.array.buffer)}const index=geometry.index?.array;if(index)transfer.push(index.buffer);geometry.dispose();return{attributes,index}};const result={chars:built.chars.map(c=>({letter:c.letter,...pack(c.geometry)})),outlines:built.outlines.map(pack)};self.postMessage({id,result},transfer);return}
 if(type==='trace'){const {pixels,width,height,settings}=payload;self.postMessage({id,result:tracePixels(pixels,width,height,settings)});return}
 if(type!=='geometry')throw Error('Unknown image operation');const built=await importedGeometry(payload),attributes={},transfer=[];for(const [name,attr]of Object.entries(built.geometry.attributes)){attributes[name]={array:attr.array,itemSize:attr.itemSize};transfer.push(attr.array.buffer)}built.geometry.dispose();self.postMessage({id,result:{components:built.components,bridges:built.bridges,volume:built.volume,attributes}},transfer);
}catch(e){self.postMessage({id,error:e.message||String(e)})}};
