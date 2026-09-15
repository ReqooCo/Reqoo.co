const fs=require('fs');
const api=fs.readFileSync('api/pksk.js','utf8');
const app=fs.readFileSync('sim/pksk/simulator/js/app.js','utf8');
const set=JSON.parse(fs.readFileSync('sim/pksk/simulator/sets/SET 01-10/data/set01.json','utf8'));
const A=set.questions.filter(q=>q.section==='BAHAGIAN A');
const B=set.questions.filter(q=>q.section==='BAHAGIAN B');
const direct=A.filter(q=>q.format==='AGREE_DISAGREE');
function assert(ok,msg){if(!ok)throw new Error(msg)}
assert(A.length===30&&B.length===70,'Set01 A/B must be 30/70');
assert(direct.length===10,'Set01 must contain 10 direct A items');
assert(direct.every(q=>q.options.length===2),'direct A items must stay two-option');
assert(app.includes("const w=Array.isArray(q.weights)?q.weights:[]"),'client A scoring must use weights');
assert(app.includes("(q.options||[]).map"),'client renderer must support variable option length');
assert(api.includes("if(q.section==='BAHAGIAN A'){const w=Array.isArray(q.weights)?q.weights:[]"),'server A scoring must use canonical weights');
assert(api.includes("else if(q.section==='BAHAGIAN B'){bAnswered++;const c=answerIndex(q);if(c!==null&&i===c)bCorrect++}"),'server B scoring must use canonical answer key');
let max=0,best=0,worst=0;
for(const q of A){max+=Math.max(...q.weights.map(Number));best+=Math.max(...q.weights.map(Number));worst+=Math.min(...q.weights.map(Number))}
assert(max===90&&best===90&&worst===0,'A scoring envelope must be 0..90 raw');
console.log('PASS: Set01 two-option A and authoritative scoring contract compatible');
