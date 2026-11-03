import * as THREE from 'three';
import {lampGeometry} from './lamp-geometry.js';
import {solidEngine,geometryFromSolid,meshToSolid} from './solid-union.js';
import {getQuality,MESH_QUALITY} from './mesh-quality.js';

export const SCULPTURAL_LAMPS=Object.freeze(['alien-coral','light-projection','fractal-growth','gyroid-mutation','erosion-cave']);
export async function sculpturalLamp(input){
 // Reuse the validated hardware mount and bottom collar dimensions.
 const original=lampGeometry({...input,shape:'drum',ripple:0}),p={...original.parameters,...input},api=await solidEngine(),owned=[],own=s=>(owned.push(s),s);
 let shade;try{
  if(p.source==='e27')throw Error('Mod lampu berliang menggunakan LED Bambu atau strip. E27: pilih bentuk lampu standard.');
  const R=p.diameter/2,H=p.height,wall=p.wall,seed=Number(p.seed??42);
  if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw Error('Pilihan corak tidak sah. Cuba corak lain.');
  const phase=(seed%997)/997*Math.PI*2,period=Math.max(12,Math.min(30,H/4)),k=Math.PI*2/period,collarHeight=5;

  if(p.shape==='fractal-growth'){
   const radius=Math.max(1.2,wall),branches=[];
   function tube(a,b){const d=b.map((v,i)=>v-a[i]);branches.push({a,d,len:d.reduce((v,x)=>v+x*x,0),min:Math.min(a[2],b[2])-radius,max:Math.max(a[2],b[2])+radius});}
   const count=Math.max(4,Math.min(8,Math.round(p.ribs/2))),point=(angle,z)=>[Math.cos(angle)*(R-wall/2),Math.sin(angle)*(R-wall/2),z];
   function grow(angle,z,level,span){if(level===3){tube(point(angle,z),point(angle,H-1));return}const next=Math.min(H-3,z+(H-8)/3);for(const sign of [-1,1]){const a=angle+sign*span;tube(point(angle,z),point(a,next));grow(a,next,level+1,span*.5)}}
   for(let i=0;i<count;i++)grow(phase+i*Math.PI*2/count,6,0,Math.PI/count*.7);
   const buckets=Array.from({length:Math.ceil((H+4)/3)+1},(_,i)=>branches.filter(b=>b.max>=i*3-2&&b.min<=(i+1)*3-2));
   const field=([x,y,z])=>{const rho=Math.hypot(x,y);let value=Math.max(Math.min(R-rho,rho-R+wall,z,collarHeight-z),Math.min(R-rho,rho-R+wall,z-H+2.4,H-z));for(const b of buckets[Math.max(0,Math.min(buckets.length-1,Math.floor((z+2)/3)))]){const q=[x-b.a[0],y-b.a[1],z-b.a[2]],t=Math.max(0,Math.min(1,q.reduce((v,x,i)=>v+x*b.d[i],0)/b.len)),distance=Math.hypot(...q.map((v,i)=>v-t*b.d[i]));value=Math.max(value,radius-distance);}return Math.min(value,z,H-z)};
   const edge=Math.min(wall*.7,getQuality()==='draft'?1.6:1),extent=R+radius+2;
   if((2*extent/edge)**2*((H+4)/edge)>18000000)throw Error('Resolusi cabang terlalu besar. Besarkan dinding atau kecilkan lampu.');
   shade=own(api.Manifold.levelSet(field,{min:[-extent,-extent,-2],max:[extent,extent,H+2]},edge));
  }else{
   const depth=p.shape==='gyroid-mutation'?Math.max(7,wall*4):wall;
   const radialAmplitude=p.shape==='alien-coral'?Math.min(p.ripple+2,7):p.shape==='erosion-cave'?Math.min(p.ripple+1,6):0;
   const field=([x,y,z])=>{
    const rho=Math.hypot(x,y),a=Math.atan2(y,x),fade=Math.max(0,Math.min(1,(z-5)/10,(H-z)/10)),outer=R+radialAmplitude*fade*(.5+.5*Math.sin(3*a+z*.045+phase));
    const shell=Math.min(outer-rho,rho-(outer-depth),z,H-z);
    const collar=Math.min(R-rho,rho-(R-wall),z,collarHeight-z);
    const top=Math.min(R-rho,rho-(R-wall),z-(H-2.4),H-z);
    let pattern;
    if(p.shape==='gyroid-mutation'){
     // The zero level of the gyroid, thickened inside a bounded annulus.
     const X=x*k,Y=y*k,Z=z*k+phase,g=Math.sin(X)*Math.cos(Y)+Math.sin(Y)*Math.cos(Z)+Math.sin(Z)*Math.cos(X);
     pattern=Math.max(wall*.65-Math.abs(g)/(k*1.7),wall*.65-Math.abs(Math.sin(a*p.ribs/2))*rho,wall*.65-Math.abs(Math.sin(z*k))/k);
    }else{
     const u=(a+Math.PI)*R,v=z-5,pitch=Math.max(9,Math.min(20,2*Math.PI*R/p.ribs)),row=Math.floor(v/pitch),offset=(row%2)*pitch*.5;
     const dx=((u+offset)%pitch+pitch)%pitch-pitch/2,dz=((v%pitch)+pitch)%pitch-pitch/2;
     let holeRadius=pitch*.28;
     if(p.shape==='alien-coral')holeRadius*=.85+.22*Math.sin(row*1.7+phase+Math.floor(u/pitch)*2.1);
     if(p.shape==='erosion-cave')holeRadius*=1+.2*Math.sin(a*5+z*.08+phase);
     pattern=Math.hypot(dx,dz)-holeRadius;
    }
    return Math.max(Math.min(shell,pattern,z-collarHeight+wall*.5),collar,top);
   };
   const maxR=R+radialAmplitude+2,edge=Math.min(wall*.7,getQuality()==='draft'?1.8:getQuality()==='balanced'?1.25:.9);
   const cells=(2*maxR/edge)**2*((H+4)/edge);if(cells>18000000)throw Error('Resolusi lampu terlalu besar. Besarkan dinding atau kecilkan diameter / tinggi.');
   shade=own(api.Manifold.levelSet(field,{min:[-maxR,-maxR,-2],max:[maxR,maxR,H+2]},edge));
  }
  if(shade.status()!=='NoError'||shade.isEmpty())throw Error('Geometri lampu tidak sah.');
  shade=own(own(shade.setTolerance(.001)).simplify(.005));
  const components=shade.decompose().sort((a,b)=>b.volume()-a.volume());
  const positive=components.filter(s=>s.volume()>0),cavities=components.filter(s=>s.volume()<=0),dustLimit=Math.min(1,shade.volume()*1e-5),dust=positive.slice(1);
  if(!positive.length||dust.some(s=>s.volume()>dustLimit)){components.forEach(s=>s.delete());throw Error('Corak lampu mempunyai bahagian terpisah. Besarkan dinding atau kecilkan corak.');}
  original.samplingCleanup={removedSpecks:dust.length,removedVolume:dust.reduce((v,s)=>v+s.volume(),0),enclosedCavities:cavities.length};
  shade=own(api.Manifold.compose([positive[0],...cavities]));components.forEach(s=>s.delete());
  original.shade.dispose();original.shade=geometryFromSolid(shade);original.parameters=p;
  // Confirm the replacement has real outward, closed geometry before worker transfer.
  const mesh=new THREE.Mesh(original.shade,new THREE.MeshBasicMaterial());let checked;try{checked=meshToSolid(api,mesh);if(checked.volume()<=0)throw Error('Isipadu lampu tidak sah.');}finally{checked?.delete();mesh.material.dispose();}
  return original;
 }catch(e){original.shade?.dispose();original.base?.dispose();throw e}finally{owned.reverse().forEach(s=>s.delete())}
}


