import {studioParameters,studioToolpath} from './lamp-core.js';
import {printerTemplate} from './printer-template.js';

// One quantized motion plan is consumed by playback and serialization.
// This is an experimental P2S profile, not physical printer certification.
export const NONPLANAR_PROFILE=Object.freeze({id:'p2s-08-petg-nonplanar-v1',nozzle:.8,lineWidth:.9,layerHeight:.28,filament:1.75,flow:.95,speed:12,zSpeed:1,maxFlow:5,travelSpeed:40,retract:.4,centerX:128,centerY:128,bedMin:15,bedMax:241,maxZ:210,nozzleTemp:255,bedTemp:70});
const q=n=>Number(n.toFixed(3));
export function lampMotionPlan(input){
 const p=studioParameters(input),s={...NONPLANAR_PROFILE},events=[],raw=studioToolpath(p,{layerHeight:s.layerHeight,lineWidth:s.lineWidth});
 const area=s.layerHeight*(s.lineWidth-s.layerHeight)+Math.PI*(s.layerHeight/2)**2,baseH=p.bottomThickness/Math.ceil(p.bottomThickness/s.layerHeight),baseArea=baseH*(s.lineWidth-baseH)+Math.PI*(baseH/2)**2,fa=Math.PI*(s.filament/2)**2;
 let cur={x:128,y:128,z:2},maxZ=2;
 function move(x,y,z,extrude,stage){
  const b={x:q(x),y:q(y),z:q(z)},dx=b.x-cur.x,dy=b.y-cur.y,dz=b.z-cur.z,length=Math.hypot(dx,dy,dz);
  if(length<.0005)return;
  const speed=extrude?Math.min(s.speed,s.maxFlow/area,Math.abs(dz)>0?s.zSpeed*length/Math.abs(dz):Infinity):Math.min(s.travelSpeed,Math.abs(dz)>0?s.zSpeed*length/Math.abs(dz):Infinity);
  events.push({...b,e:extrude?Number((length*(stage==='Tapak'?baseArea:area)/fa*s.flow).toFixed(6)):0,f:Math.max(1,Math.floor(speed*60)),extrude,stage});
  cur=b;maxZ=Math.max(maxZ,b.z);
 }
 for(const a of raw){
  const target={x:a.x+s.centerX,y:a.y+s.centerY,z:a.z};
  if(!a.extrude){events.push({kind:'retract',e:-s.retract,f:1800,stage:'Retract'});move(cur.x,cur.y,maxZ+1,false,'Travel');move(target.x,target.y,cur.z,false,'Travel');move(target.x,target.y,target.z,false,a.stage);events.push({kind:'prime',e:s.retract,f:1800,stage:'Prime'});}
  else move(target.x,target.y,target.z,true,a.stage);
 }
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let before={x:128,y:128,z:2},down=0;
 for(const e of events){if(e.x===undefined)continue;if(e.extrude){if(e.z<before.z)down++;for(const b of [before,e])for(const [i,k]of ['x','y','z'].entries()){bounds.min[i]=Math.min(bounds.min[i],b[k]-(i===2?(e.stage==='Tapak'?baseH:s.layerHeight):s.lineWidth/2));bounds.max[i]=Math.max(bounds.max[i],b[k]+(i===2?0:s.lineWidth/2));}}before=e;}
 bounds.min[2]=Math.max(0,bounds.min[2]);
 let hash=2166136261;for(const c of JSON.stringify({p,s,events}))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 return {parameters:p,settings:s,events,bounds,downMoves:down,hash:hash.toString(16).padStart(8,'0')};
}
export function validateLampPlan(plan){
 const errors=[],s=plan.settings,p=plan.parameters,add=m=>{if(!errors.includes(m))errors.push(m);};
 if(Math.abs(p.pathPitch-s.layerHeight)>.0001)add('Kenaikan / pusingan mesti 0.28 mm untuk profil P2S 0.8 ini.');
 if(p.pathPattern==='shift'&&p.pathAmplitude>.04)add('Gelombang berselang terlalu tinggi: kurangkan amplitud kepada 0.04 mm atau kurang.');
 if(p.pathAmplitude>.12&&p.pathPattern!=='spiral')add('Amplitud melebihi had eksperimen 0.12 mm; preview sahaja.');
 if(plan.bounds.min[0]<s.bedMin||plan.bounds.min[1]<s.bedMin||plan.bounds.max[0]>s.bedMax||plan.bounds.max[1]>s.bedMax||plan.bounds.max[2]>s.maxZ)add('Reka bentuk melebihi ruang cetakan profil.');
 // Conservative swept nozzle cone against the previously deposited height field.
 // Cell-centre uncertainty is included in the radius. Samples include segment interiors.
 const cells=new Map(),cell=.8,margin=cell*Math.SQRT2/2;
 let a={x:128,y:128,z:2},arc=0,collision=false,support=false;
 const turns=(p.height-(p.bottomMode==='closed'?p.bottomThickness:s.layerHeight))/p.pathPitch;
 const wall=plan.events.filter(e=>e.x!==undefined&&e.stage==='Dinding'&&e.extrude);
 const perTurn=wall.length/turns;
 for(let i=0;i<wall.length;i++){
  if(i<Math.ceil(perTurn))continue;
  const below=wall[Math.max(0,Math.round(i-perTurn))],e=wall[i];
  if(below&&Math.hypot(e.x-below.x,e.y-below.y)>s.lineWidth*.6){support=true;break;}
 }
 if(support)add('Perubahan bentuk terlalu curam untuk sokongan lapisan profil ini.');
 for(const b of plan.events){
  if(b.x===undefined)continue;
  if(![b.x,b.y,b.z,b.e,b.f].every(Number.isFinite)||b.z<.01||b.z>s.maxZ+2||b.x<s.bedMin||b.x>s.bedMax||b.y<s.bedMin||b.y>s.bedMax)add('Koordinat gerakan di luar had profil.');
  const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
  if(b.extrude&&Math.abs(b.z-a.z)>Math.hypot(b.x-a.x,b.y-a.y)*.35+.002)add('Cerun laluan terlalu curam untuk nozzle profil.');
  const steps=Math.max(1,Math.ceil(length/.4));
  // Endpoints and interior samples check extrusion and travel alike.
  for(let j=1;j<=steps;j++){
   const t=j/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
   if(!collision){const gx=Math.floor(x/cell),gy=Math.floor(y/cell);
    for(let dx=-8;dx<=8&&!collision;dx++)for(let dy=-8;dy<=8;dy++){const old=cells.get((gx+dx)+','+(gy+dy));if(!old||arc-old.arc<s.lineWidth*2)continue;
     const h=old.z-z;if(h<=.06||h>12)continue;
     if(Math.hypot(old.x-x,old.y-y)<.4+Math.min(5.4,h*.45)+margin){collision=true;break;}
    }
   }
   if(b.extrude){const key=Math.floor(x/cell)+','+Math.floor(y/cell),old=cells.get(key);if(!old||z>=old.z)cells.set(key,{x,y,z,arc});}
   arc+=length/steps;
  }
  a=b;
 }
 if(collision)add('Kelegaan nozzle gagal: laluan menghampiri bahan yang sudah dicetak.');
 return {ok:errors.length===0,errors,downMoves:plan.downMoves,physicalValidated:false};
}
export function lampBody(plan){
 const s=plan.settings,lines=['; REQOO_NONPLANAR_BODY_START','; PLAN_HASH: '+plan.hash,'G90','G21','M83','G92 E0','M204 S500','M106 P1 S102','G1 Z2 F60'];
 for(const e of plan.events)lines.push(e.kind?'G1 E'+e.e.toFixed(6)+' F'+e.f:'G1 X'+e.x.toFixed(3)+' Y'+e.y.toFixed(3)+' Z'+e.z.toFixed(3)+(e.extrude?' E'+e.e.toFixed(6):'')+' F'+e.f);
 lines.push('M400','G1 E-'+s.retract+' F1800','; REQOO_NONPLANAR_BODY_END');return lines.join('\n');
}
export function lampGcode(plan,slot){
 const check=validateLampPlan(plan);if(!check.ok)throw Error(check.errors.join(' '));
 const t=printerTemplate(slot),s=plan.settings,b=plan.bounds;
 const x=Math.floor(b.min[0]-2),y=Math.floor(b.min[1]-2),w=Math.ceil(b.max[0]+2)-x,h=Math.ceil(b.max[1]+2)-y;
 let start=t.start.slice(t.start.indexOf('; EXECUTABLE_BLOCK_START')).replace(/G29 A([12]) X94 Y94 I68 J68/g,(_,mode)=>'G29 A'+mode+' X'+x+' Y'+y+' I'+w+' J'+h);
 const top=b.max[2],end=t.end.replace(/Z46\.08/g,'Z'+(top+2).toFixed(3)).replace(/Z55\.08/g,'Z'+(top+10).toFixed(3)).replace(/Z85\.7/g,'Z'+(top+35).toFixed(3)).replace(/Z83\.7/g,'Z'+(top+33).toFixed(3));
 return '; REQOO EXPERIMENTAL NONPLANAR / '+s.id+'\n; PLAN_HASH: '+plan.hash+'\n; P2S only | 0.8 mm nozzle | PETG | Textured PEI | AMS '+slot+'\n; 255 C nozzle / 70 C bed | physical print NOT validated\n; Standalone shade centred at X128 Y128; scene placement is not exported\n; Downward extruding moves: '+plan.downMoves+'\n'+start+lampBody(plan)+end;
}
