const fs=require('fs');
const raw=String(process.argv[2]||'02').padStart(2,'0');
const n=Number(raw);
if(!Number.isInteger(n)||n<1||n>50)throw new Error('Usage: node scripts/test_gold_set_contract.js <setNo>');
const start=Math.floor((n-1)/10)*10+1;
const group=`SET ${String(start).padStart(2,'0')}-${String(start+9).padStart(2,'0')}`;
const path=`sim/pksk/simulator/sets/${group}/data/set${raw}.json`;
const api=fs.readFileSync('api/pksk.js','utf8');
const app=fs.readFileSync('sim/pksk/simulator/js/app.js','utf8');
const set=JSON.parse(fs.readFileSync(path,'utf8'));
const A=set.questions.filter(q=>q.section==='BAHAGIAN A');
const B=set.questions.filter(q=>q.section==='BAHAGIAN B');
const direct=A.filter(q=>q.format==='AGREE_DISAGREE');
function assert(ok,msg){if(!ok)throw new Error(msg)}
assert(A.length===30&&B.length===70,`Set${raw} A/B must be 30/70`);
assert(direct.length===10,`Set${raw} must contain 10 direct A items`);
assert(direct.every(q=>q.options.length===2),'direct A items must stay two-option');
assert(app.includes("const w=Array.isArray(q.weights)?q.weights:[]"),'client A scoring must use weights');
assert(app.includes("(q.options||[]).map"),'client renderer must support variable option length');
assert(api.includes("if(q.section==='BAHAGIAN A'){const w=Array.isArray(q.weights)?q.weights:[]"),'server A scoring must use canonical weights');
assert(api.includes("else if(q.section==='BAHAGIAN B'){bAnswered++;const c=answerIndex(q);if(c!==null&&i===c)bCorrect++}"),'server B scoring must use canonical answer key');
let max=0,best=0,worst=0;
for(const q of A){max+=Math.max(...q.weights.map(Number));best+=Math.max(...q.weights.map(Number));worst+=Math.min(...q.weights.map(Number))}
assert(max===90&&best===90&&worst===0,'A scoring envelope must be 0..90 raw');
assert(B.every(q=>Number.isInteger(q.answerIndex)&&q.weights[q.answerIndex]===3),'B answer keys must match weights');
console.log(`PASS: Set${raw} Gold runtime/scoring contract compatible`);
