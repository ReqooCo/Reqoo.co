import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lampMotionPlan,lampBody,lampGcode,validateLampPlan,NONPLANAR_PROFILE} from '../src/lamp-motion.js';
const spec={shape:'drum',diameter:90,height:35,pathPattern:'wave',pathPitch:.28,pathAmplitude:.03};
const plan=lampMotionPlan(spec);
const parse=s=>Object.fromEntries([...s.matchAll(/([XYZEF])(-?[\d.]+)/g)].map(m=>[m[1],+m[2]]));
test('Every preview movement round-trips as exact XYZEF in the exported body, including downward extrusion',()=>{
 const parsed=lampBody(plan).split('\n').filter(s=>s.startsWith('G1 X')).map(parse),moves=plan.events.filter(e=>e.x!==undefined);
 assert.equal(parsed.length,moves.length);let prev={X:128,Y:128,Z:2},down=0;
 const s=NONPLANAR_PROFILE,area=s.layerHeight*(s.lineWidth-s.layerHeight)+Math.PI*(s.layerHeight/2)**2,fa=Math.PI*(s.filament/2)**2;
 for(let i=0;i<moves.length;i++){const a=parsed[i],b=moves[i];assert.deepEqual(a,{X:b.x,Y:b.y,Z:b.z,...(b.extrude?{E:b.e}:{}),F:b.f});
  const length=Math.hypot(a.X-prev.X,a.Y-prev.Y,a.Z-prev.Z),speed=a.F/60;
  if(b.extrude){assert.ok(a.E>0);assert.ok(Math.abs(a.E-length*area/fa*s.flow)<.00000051);assert.ok(speed<=s.speed+.001);assert.ok(speed*area<=s.maxFlow+.001);if(a.Z<prev.Z)down++;}
  if(length)assert.ok(Math.abs(a.Z-prev.Z)/length*speed<=s.zSpeed+.001);prev=a;
 }
 assert.ok(down>1000);assert.equal(down,plan.downMoves);assert.ok(validateLampPlan(plan).ok);
});
test('Plan identity changes with actual design parameters and wave/shift both extrude on Z descents',()=>{
 assert.equal(lampMotionPlan(spec).hash,plan.hash);
 for(const change of [{pathWaves:12},{diameter:80},{pathPattern:'shift'},{pathAmplitude:.02}]){const p=lampMotionPlan({...spec,...change});assert.notEqual(p.hash,plan.hash);assert.ok(p.downMoves>0);}
});
test('Actual custom plan replaces the fixed sample and retains all four requested P2S AMS selections',()=>{
 for(let slot=1;slot<=4;slot++){const g=lampGcode(plan,slot),start=g.split('; MACHINE_START_GCODE_END')[0];
  assert.ok(start.includes('\nT'+(slot-1)+'\n'));assert.ok(start.includes('H0.8'));assert.ok(g.includes(lampBody(plan)));assert.ok(g.includes('PLAN_HASH: '+plan.hash));assert.ok(g.includes('G1 Z37.280 F900'));assert.ok(g.includes('G29 A1 X80 Y80 I96 J96'));assert.ok(!g.includes('Jalur berongga'));
 }assert.throws(()=>lampGcode(plan,0),/AMS/);
});
test('Unsafe wave collisions, unsupported pitch and bed overflow block machine export instead of falling back to a sample',()=>{
 for(const change of [{pathAmplitude:3,pathPattern:'shift'},{pathPitch:.8},{diameter:240,middleDiameter:240}]){
  const p=lampMotionPlan({...spec,...change}),check=validateLampPlan(p);assert.equal(check.ok,false);assert.throws(()=>lampGcode(p,1));assert.equal(check.physicalValidated,false);
 }
 const collision=validateLampPlan(lampMotionPlan({...spec,pathPattern:'shift',pathAmplitude:3}));assert.ok(collision.errors.some(s=>s.includes('Kelegaan nozzle')));
});
test('Closed floor uses discrete extrusion layers and lifted non-extruding transfers before non-planar wall',()=>{
 const p=lampMotionPlan({...spec,bottomMode:'closed',bottomThickness:1.2}),base=p.events.filter(e=>e.stage==='Tapak'&&e.extrude);
 assert.ok(base.length>100);assert.ok(base.every(e=>e.z>0&&e.z<=1.2));assert.ok(p.events.some(e=>e.stage==='Travel'&&!e.extrude));assert.ok(p.downMoves>1000);assert.equal(p.bounds.min[2],0);
});
