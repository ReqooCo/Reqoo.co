#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const file=path.join(__dirname,'..','sim','pksk','simulator','js','visual-renderer.js');
const context={window:{},console};
vm.createContext(context);
vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const renderer=context.window.PKSKVisual;
assert(renderer&&typeof renderer.render==='function','renderer must export PKSKVisual.render');
assert.deepStrictEqual(Array.from(renderer.supportedKinds).sort(),[
  'coordinate_move','cuboid','five_value_data','fraction_bar','rectangle','straight_line_angle'
].sort());

const samples=[
  {kind:'fraction_bar',parts:5,selected:2},
  {kind:'five_value_data',values:[13,15,12,14,16],mean:14},
  {kind:'rectangle',length_cm:7,width_cm:5},
  {kind:'cuboid',length_cm:4,width_cm:3,height_cm:2},
  {kind:'straight_line_angle',known_angle_deg:120,unknown_angle_deg:60,sum_deg:180},
  {kind:'coordinate_move',start:[4,3],move_right:3,end:[7,3]},
];
for(const sample of samples){
  const html=renderer.render(sample,()=>{throw new Error('structured visual must not use legacy path')});
  assert(html.includes('<svg'),'structured visual should render SVG: '+sample.kind);
  assert(!html.includes('[object Object]'),'structured visual must never become an image filename');
}

const angle=renderer.render(samples[4],()=>null);
assert(!angle.includes('60°'),'unknown angle answer must not be printed');
assert(angle.includes('x°'),'unknown angle should remain unknown');
const coordinate=renderer.render(samples[5],()=>null);
assert(!coordinate.includes('(7, 3)'),'coordinate answer must not be printed as text');
const data=renderer.render(samples[1],()=>null);
assert(!data.includes('Purata')&&!data.includes('Mean'),'mean answer must not be labelled');
const legacy=renderer.render('legacy.png',name=>'/visuals/'+name);
assert(legacy.includes('/visuals/legacy.png'),'legacy string visual must remain supported');

console.log('PASS: six structured visual kinds render without answer leakage');
