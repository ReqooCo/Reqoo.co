import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the production offsetPlan implementation with deterministic CAD state.
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=source.indexOf('function offsetPlan(params,previewOnly=false){');
assert.ok(start>=0,'offsetPlan must exist');
let depth=0,end=-1,opened=false;
for(let i=source.indexOf('{',start);i<source.length;i++){
 if(source[i]==='{'){depth++;opened=true;}
 else if(source[i]==='}'&&opened&&!--depth){end=i+1;break;}
}
assert.ok(end>start,'offsetPlan body must be complete');
const implementation=source.slice(start,end);
function run(refs,connections,mode='Chain'){
 const doc={features:[]};
 const context={sketchEditRefs:()=>refs.map(id=>({id})),snapshot:()=>structuredClone(doc),
  items:refs.map(id=>({id})),connectedSketchIds:(_,seed)=>connections[seed]||[],
  uid:(()=>{let i=0;return()=>String(++i)})()};
 vm.createContext(context);
 vm.runInContext(implementation+';this.testOffsetPlan=offsetPlan;this.testResult=offsetPlan({mode:"'+mode+'",distance:2},false)',context,{timeout:1000});
 const result=context.testResult;
 return result.next.features.map(f=>Array.from(f.inputs));
}
assert.deepEqual(run(['a'],{a:[]}),[['a']],'disconnected seed must advance');
assert.deepEqual(run(['a','b'],{a:[],b:[]}),[['a'],['b']],'all disconnected seeds must advance');
assert.deepEqual(run(['a','b','c'],{a:['a','b'],c:['c']}),[['a','b'],['c']],'connected grouping must remain intact');
assert.deepEqual(run(['a','b'],{a:['a','b']},'Single'),[['a'],['b']],'single mode must not chain');
console.log('PASS: 4 production offsetPlan termination/grouping regressions');
