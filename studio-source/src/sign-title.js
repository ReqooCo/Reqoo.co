import * as THREE from 'three';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {solidEngine,geometryFromSolid} from './solid-union.js';
export async function buildSignTitle({text,fontData,height,relief,diameter,offsets=[1.6,1]}){
 if(typeof text!=='string'||!text.trim()||text.length>60||![height,relief,diameter].every(Number.isFinite)||height<3||height>60||relief<.2||relief>4||diameter<70||diameter>240)throw Error('Saiz tajuk tidak sah.');
 if(!Array.isArray(offsets)||offsets.length!==2||!offsets.every(v=>Number.isFinite(v)&&v>0&&v<=5)||offsets[0]<=offsets[1])throw Error('Saiz garis luar tidak sah.');
 const font=new FontLoader().parse(fontData),chars=[],owned=[],own=o=>(owned.push(o),o);let cursor=0,outputs=[];
 try{for(const c of text){if(c===' '){cursor+=height*.3;continue}if(!font.data.glyphs[c])throw Error('Font ini tidak menyokong aksara '+c);const geometry=new TextGeometry(c,{font,size:height,depth:relief,curveSegments:48,bevelEnabled:false});geometry.computeBoundingBox();const b=geometry.boundingBox.clone(),h=b.max.y-b.min.y;if(h<=0){geometry.dispose();throw Error('Huruf tiada keluasan.')}geometry.translate(-b.min.x,-b.min.y,-b.min.z);geometry.scale(height/h,height/h,1);geometry.computeBoundingBox();const normal=height/h,area=loop=>loop.reduce((a,p,i)=>{const q=loop[(i+1)%loop.length];return a+p[0]*q[1]-q[0]*p[1]},0)/2,polygons=[];for(const shape of font.generateShapes(c,height)){for(const [path,isHole]of [[shape,false],...shape.holes.map(h=>[h,true])]){const loop=path.getPoints(48).map(v=>[(v.x-b.min.x)*normal,(v.y-b.min.y)*normal]);if((area(loop)>0)===isHole)loop.reverse();polygons.push(loop)}}chars.push({letter:c,geometry,x:cursor,polygons});cursor+=geometry.boundingBox.max.x+height*.08}
 const total=Math.max(.1,cursor-height*.08),scale=Math.min(1,diameter*.78/total),polys=[];for(const c of chars){c.geometry.scale(scale,scale,1);c.geometry.translate(c.x*scale-total*scale/2,-height*scale/2-diameter*.08,0);for(const loop of c.polygons)polys.push(loop.map(([x,y])=>[x*scale+c.x*scale-total*scale/2,y*scale-height*scale/2-diameter*.08]))}

 const api=await solidEngine(),section=own(own(new api.CrossSection(polys,'NonZero')).simplify(.02));for(const offset of offsets){const outline=own(own(section.offset(offset,'Round',2,128)).simplify(.02)),solid=own(outline.extrude(.6));outputs.push(geometryFromSolid(solid))}
 return{chars,outlines:outputs};
 }catch(e){chars.forEach(c=>c.geometry.dispose());outputs.forEach(g=>g.dispose());throw e}finally{owned.reverse().forEach(o=>o.delete())}
}
