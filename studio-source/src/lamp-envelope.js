import * as THREE from 'three';
import {studioParameters,studioRadius} from './lamp-core.js';
export function lampEnvelope(input){const p=studioParameters(input),n=Math.max(192,p.ribs*10),rows=Math.max(100,p.tiers*40),verts=[],indices=[],closed=p.bottomMode==='closed';
let minimum=Infinity;
for(let side=0;side<2;side++)for(let j=0;j<=rows;j++){const z=(side&&closed?p.bottomThickness:0)+(p.height-(side&&closed?p.bottomThickness:0))*j/rows,v=z/p.height;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=studioRadius(p,v,a)-side*p.wall;minimum=Math.min(minimum,r);verts.push(r*Math.cos(a),r*Math.sin(a),z);}}
if(minimum<8)throw Error('Bukaan terlalu kecil untuk ketebalan dinding.');
const sideCount=(rows+1)*n;
for(let side=0;side<2;side++)for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=side*sideCount+j*n+i,b=side*sideCount+j*n+(i+1)%n,c=b+n,d=a+n;if(side)indices.push(a,c,b,a,d,c);else indices.push(a,b,c,a,c,d);}
for(let i=0;i<n;i++){const k=(i+1)%n,a=rows*n+i,b=rows*n+k;indices.push(a,b,sideCount+b,a,sideCount+b,sideCount+a);if(!closed)indices.push(i,sideCount+k,k,i,sideCount+i,sideCount+k);}
if(closed){const bottom=verts.length/3;verts.push(0,0,0);const top=verts.length/3;verts.push(0,0,p.bottomThickness);for(let i=0;i<n;i++){const k=(i+1)%n;indices.push(bottom,k,i,top,sideCount+i,sideCount+k);}}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.userData={lampStudioVersion:2,minimumInteriorRadius:minimum};return g;}
