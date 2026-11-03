import * as THREE from 'three';

export function bookmarkBodyShape(kind,w,h){
 const s=new THREE.Shape();
 if(kind==='oval'){s.absellipse(0,0,w/2,h/2,0,Math.PI*2,false,0);return s}
 if(kind==='leaf'){s.moveTo(0,-h/2);s.bezierCurveTo(-w*.65,-h*.2,-w*.5,h*.3,0,h/2);s.bezierCurveTo(w*.5,h*.3,w*.65,-h*.2,0,-h/2);s.closePath();return s}
 if(kind==='wavy'){for(let i=0;i<=128;i++){const y=-h/2+h*i/128,x=w/2-w*.06*(1-Math.cos(i/128*Math.PI*12));i?s.lineTo(x,y):s.moveTo(x,y)}for(let i=128;i>=0;i--){const y=-h/2+h*i/128,x=-w/2+w*.06*(1-Math.cos(i/128*Math.PI*12));s.lineTo(x,y)}s.closePath();return s}
 if(kind==='ticket'){const r=Math.min(4,w*.15);s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.lineTo(w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.lineTo(w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.lineTo(-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.closePath();return s}
 const r=Math.min(kind==='arch'?w/2:3,w/2,h/2);s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);s.closePath();return s;
}
export const BOOKMARK_SHAPES=[['flower','Bunga','Floral'],['heart','Hati','Cute'],['star','Bintang','Cute'],['butterfly','Rama-rama','Cute'],['cat','Kucing','Cute'],['daisy','Daisy','Floral'],['sunflower','Bunga matahari','Floral'],['rosette','Rosette','Floral'],['cosmos','Cosmos','Floral'],['sakura','Sakura','Floral'],['clover','Semanggi','Floral'],['leaf','Daun','Floral'],['tulip','Tulip','Floral'],['cloud','Awan','Cute'],['moon','Bulan sabit','Cute'],['sun','Matahari','Cute'],['bunny','Arnab','Cute'],['bear','Beruang','Cute'],['bow','Reben','Cute'],['mushroom','Cendawan','Cute'],['fish','Ikan','Cute'],['droplet','Titisan','Cute'],['sparkle','Kilauan','Cute'],['circle','Bulat','Geometri'],['oval','Oval','Geometri'],['diamond','Berlian','Geometri'],['hexagon','Heksagon','Geometri'],['octagon','Oktagon','Geometri'],['scallop','Pinggir beralun','Geometri'],['ticket','Tiket','Geometri'],['arch','Arch','Geometri'],['shield','Perisai','Geometri']].map(([id,label,category])=>({id,label,category}));

// Solid, connected contours intended for print geometry, rather than bitmap art.
export function bookmarkShape(kind,size=36,depth=1){
 const s=new THREE.Shape();
 if(kind==='flower'){for(let i=0;i<=384;i++){const a=i*Math.PI*2/384,r=.78+.22*Math.cos(a*6),x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y)}s.closePath()}
 else if(kind==='heart'){s.moveTo(0,-.95);s.bezierCurveTo(-.25,-.6,-1.3,.1,-.92,.68);s.bezierCurveTo(-.65,1.1,-.15,.95,0,.55);s.bezierCurveTo(.15,.95,.65,1.1,.92,.68);s.bezierCurveTo(1.3,.1,.25,-.6,0,-.95);s.closePath()}
 else if(kind==='star'){for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.48:1;i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r)}s.closePath()}
 else if(kind==='butterfly'){s.moveTo(0,.35);s.bezierCurveTo(-.55,1.3,-1.25,1,-.9,.1);s.bezierCurveTo(-1.15,-.6,-.4,-1.05,0,-.55);s.bezierCurveTo(.4,-1.05,1.15,-.6,.9,.1);s.bezierCurveTo(1.25,1,.55,1.3,0,.35);s.closePath()}
 else if(kind==='cat'){s.moveTo(-.85,.15);s.lineTo(-.9,.95);s.quadraticCurveTo(-.85,1.05,-.35,.55);s.quadraticCurveTo(0,.7,.35,.55);s.quadraticCurveTo(.85,1.05,.9,.95);s.lineTo(.85,.15);s.bezierCurveTo(1.2,-.7,.5,-1,-0,-1);s.bezierCurveTo(-.5,-1,-1.2,-.7,-.85,.15);s.closePath()}
 else if(['daisy','sunflower','rosette','cosmos','sakura','clover','sun','scallop','sparkle'].includes(kind)){const spec={daisy:[10,.7,.3],sunflower:[16,.82,.18],rosette:[12,.9,.1],cosmos:[8,.76,.24],sakura:[5,.82,.18],clover:[4,.68,.32],sun:[12,.8,.2],scallop:[12,.94,.06],sparkle:[4,.6,.4]}[kind];for(let i=0;i<=384;i++){const a=i*Math.PI*2/384,r=spec[1]+spec[2]*Math.cos(a*spec[0]);i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r)}s.closePath()}
 else if(['circle','oval'].includes(kind)){s.absellipse(0,0,kind==='oval'?.65:1,1,0,Math.PI*2,false,0)}
 else if(['diamond','hexagon','octagon'].includes(kind)){const n={diamond:4,hexagon:6,octagon:8}[kind];for(let i=0;i<n;i++){const a=Math.PI/2+i*Math.PI*2/n;i?s.lineTo(Math.cos(a),Math.sin(a)):s.moveTo(Math.cos(a),Math.sin(a))}s.closePath()}
 else if(kind==='leaf'){s.moveTo(0,-1);s.bezierCurveTo(-1.2,-.25,-.8,.65,0,1);s.bezierCurveTo(.8,.65,1.2,-.25,0,-1);s.closePath()}
 else if(kind==='droplet'){s.moveTo(0,1);s.bezierCurveTo(-.35,.35,-1,-.15,-.7,-.7);s.bezierCurveTo(-.4,-1.2,.4,-1.2,.7,-.7);s.bezierCurveTo(1,-.15,.35,.35,0,1);s.closePath()}
 else if(kind==='moon'){s.moveTo(.55,.85);s.bezierCurveTo(-.75,1.3,-1.3,-.6,-.25,-.95);s.bezierCurveTo(.15,-1.1,.55,-.9,.7,-.65);s.bezierCurveTo(-.45,-.8,-.55,.5,.55,.85);s.closePath()}
 else if(kind==='tulip'){s.moveTo(-.8,.9);s.lineTo(-.25,.55);s.lineTo(0,1);s.lineTo(.25,.55);s.lineTo(.8,.9);s.bezierCurveTo(.95,-.2,.45,-.5,.13,-.55);s.lineTo(.13,-1);s.lineTo(-.13,-1);s.lineTo(-.13,-.55);s.bezierCurveTo(-.45,-.5,-.95,-.2,-.8,.9);s.closePath()}
 else if(kind==='cloud'){s.moveTo(-.85,-.5);s.bezierCurveTo(-1.5,-.25,-1,.6,-.5,.35);s.bezierCurveTo(-.5,1.25,.65,1.25,.65,.4);s.bezierCurveTo(1.45,.7,1.6,-.4,.85,-.5);s.closePath()}
 else if(kind==='bunny'){s.moveTo(-.7,.1);s.bezierCurveTo(-1.2,1.8,-.25,1.8,-.2,.45);s.quadraticCurveTo(0,.55,.2,.45);s.bezierCurveTo(.25,1.8,1.2,1.8,.7,.1);s.bezierCurveTo(1.3,-1.2,-1.3,-1.2,-.7,.1);s.closePath()}
 else if(kind==='bear'){s.moveTo(-.8,.35);s.bezierCurveTo(-1.4,.9,-.5,1.4,-.35,.7);s.quadraticCurveTo(0,.85,.35,.7);s.bezierCurveTo(.5,1.4,1.4,.9,.8,.35);s.bezierCurveTo(1.35,-1.25,-1.35,-1.25,-.8,.35);s.closePath()}
 else if(kind==='bow'){s.moveTo(0,.22);s.bezierCurveTo(-1.4,1.5,-1.4,-1.5,0,-.22);s.bezierCurveTo(1.4,-1.5,1.4,1.5,0,.22);s.closePath()}
 else if(kind==='mushroom'){s.moveTo(-1,0);s.bezierCurveTo(-.95,1.5,.95,1.5,1,0);s.lineTo(.28,0);s.lineTo(.4,-.9);s.quadraticCurveTo(0,-1.1,-.4,-.9);s.lineTo(-.28,0);s.closePath()}
 else if(kind==='fish'){s.moveTo(-.6,.18);s.lineTo(-1,.65);s.lineTo(-1,-.65);s.lineTo(-.6,-.18);s.bezierCurveTo(.4,-1.1,1,-.4,1,0);s.bezierCurveTo(1,.4,.4,1.1,-.6,.18);s.closePath()}
 else if(kind==='ticket'){s.moveTo(-.8,-1);s.lineTo(.8,-1);s.lineTo(.8,-.25);s.quadraticCurveTo(.4,0,.8,.25);s.lineTo(.8,1);s.lineTo(-.8,1);s.lineTo(-.8,.25);s.quadraticCurveTo(-.4,0,-.8,-.25);s.closePath()}
 else if(kind==='arch'){s.moveTo(-.8,-1);s.lineTo(.8,-1);s.lineTo(.8,.2);s.absarc(0,.2,.8,0,Math.PI,false);s.closePath()}
 else if(kind==='shield'){s.moveTo(-.85,1);s.lineTo(.85,1);s.lineTo(.85,0);s.quadraticCurveTo(.8,-.6,0,-1);s.quadraticCurveTo(-.8,-.6,-.85,0);s.closePath()}
 else throw Error('Pilih bentuk daripada galeri.');
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:96});g.computeBoundingBox();const b=g.boundingBox,c=b.getCenter(new THREE.Vector3()),max=Math.max(b.max.x-b.min.x,b.max.y-b.min.y);g.translate(-c.x,-c.y,0);g.scale(size/max,size/max,1);g.computeBoundingBox();return g;
}
