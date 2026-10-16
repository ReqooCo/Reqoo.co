// Production handlers, isolated in-memory SQLite D1 adapter and test-only auth hash.
import fs from 'node:fs';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
const key='local-test-only',hash=createHash('sha256').update(key).digest('hex');
export async function handler(file){const src=fs.readFileSync(file,'utf8').replace(/const ACCESS_HASH='[^']+'/,`const ACCESS_HASH='${hash}'`);return (await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'))).onRequest}
export class D1 {
 constructor(){this.db=new DatabaseSync(':memory:');this.beforeBatch=null}
 prepare(sql){const db=this.db;let args=[];return {sql,bind(...v){args=v;return this},async all(){return {results:db.prepare(sql).all(...args)}},async first(){return db.prepare(sql).get(...args)||null},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}}}
 async batch(stmts){if(this.beforeBatch&&stmts.some(s=>/UPDATE s2_chemical_stock|INSERT INTO s2_morning_reports/.test(s.sql))){const f=this.beforeBatch;this.beforeBatch=null;await f()}
 this.db.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());this.db.exec('COMMIT');return r}catch(e){this.db.exec('ROLLBACK');throw e}}
}
const db=new D1(),env={DB:db};const chem=await handler('api/s2-chemical.js'),morning=await handler('api/s2-morning.js'),live=await handler('api/s2-live.js');
async function call(fn,path,body,auth=key){return fn({request:new Request('http://local.test'+path,{method:body?'POST':'GET',headers:{'X-S2-Key':auth,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env})}
assert.equal((await call(chem,'/api/s2-chemical',null,'bad')).status,401);
let state=await(await call(chem,'/api/s2-chemical')).json();const row=k=>state.items.find(x=>x.chemical_key===k);
const version=row('chlorine').updated_at,initial=row('chlorine').stock_mt;
const tx={action:'commit',changes:[{key:'chlorine',type:'tx',useKg:700,expectedUpdatedAt:version}]};
assert.equal((await call(chem,'/api/s2-chemical',tx)).status,200);
assert.equal((await call(chem,'/api/s2-chemical',tx)).status,409); // stale second operator
state=await(await call(chem,'/api/s2-chemical')).json();assert.equal(row('chlorine').stock_mt,initial-.7);
assert.equal((await call(chem,'/api/s2-chemical',{action:'commit',changes:[{key:'chlorine',type:'tx',useKg:-4,expectedUpdatedAt:row('chlorine').updated_at}]})).status,400);
// Force a write between the read and atomic batch; both update and event must roll back.
const before=row('chlorine').updated_at;db.beforeBatch=async()=>{db.db.prepare("UPDATE s2_chemical_stock SET stock_mt=20,updated_at='concurrent' WHERE chemical_key='chlorine'").run()};
assert.equal((await call(chem,'/api/s2-chemical',{action:'commit',changes:[{key:'chlorine',type:'tx',useKg:700,expectedUpdatedAt:before}]})).status,409);
assert.equal(db.db.prepare("SELECT stock_mt FROM s2_chemical_stock WHERE chemical_key='chlorine'").get().stock_mt,20);
console.log('PASS chemical auth, 700kg conversion, stale writer, invalid input, atomic race rollback');
// Normal undo and stale undo tested on a separate chemical.
state=await(await call(chem,'/api/s2-chemical')).json();const lime=row('lime');
const saved=await(await call(chem,'/api/s2-chemical',{action:'commit',changes:[{key:'lime',type:'tx',useKg:100,expectedUpdatedAt:lime.updated_at}]})).json();
assert.equal((await call(chem,'/api/s2-chemical',{action:'undoLast',expectedBatchId:'stale'})).status,409);
assert.equal((await call(chem,'/api/s2-chemical',{action:'undoLast',expectedBatchId:saved.batch_id})).status,200);
assert.equal(db.db.prepare("SELECT stock_mt FROM s2_chemical_stock WHERE chemical_key='lime'").get().stock_mt,lime.stock_mt);console.log('PASS Undo targets observed batch and restores stock');
const values={pondC:'11.99',pondCFlowValue:'2485',pondCFlowUnit:'m3h',twFlowHourly:'2309',rwAbst:'93.954',pondTwlLevel:'12',pondTwlCapacity:'3984.50',criticalLevel:'7.50',pondStorageAuto:true,criticalStorageAuto:true,sjamCHourly:'0'};
for(const [fn,path,fields] of [[morning,'/api/s2-morning-share',{expectedUpdatedAt:'',reportDate:'2026-10-16',formatNumber:'3',operator:'Test',values:JSON.stringify(values),reportText:'Pond C *46.1* days'}],[live,'/api/s2-live-share',{section:'ops',reportDate:'2026-10-16',reportTime:'07:00',operator:'Test',data:JSON.stringify({rw:'2485',tw:'2309'}),reportText:'LRA Semenyih 2 RW 2485 TW 2309'}]]){
 const response=await fn({request:new Request('http://local.test'+path,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,accessKey:key})}),env});assert.equal(response.status,303,await response.clone().text());const location=new URL(response.headers.get('location'));assert.equal(location.origin,'https://wa.me');assert.equal(location.searchParams.get('text'),fields.reportText);assert.ok(!location.href.includes(key));
}
const record=await(await call(morning,'/api/s2-morning?date=2026-10-16')).json();assert.equal(record.report.values.twFlowHourly,'2309');assert.equal(record.report.values.pondCFlowValue,'2485');assert.equal(record.report.values.rwAbst,'93.954');assert.equal(record.report.values.pondStorage,'3978.37');
console.log('PASS real handler SQLite persistence, manual readings preserved, share 303 text exact, no code in redirect');
const stale={reportDate:'2026-10-16',formatNumber:1,operator:'Other',expectedUpdatedAt:'stale',values:{...values,production:'90'}};
assert.equal((await call(morning,'/api/s2-morning',stale)).status,409);
assert.equal((await call(morning,'/api/s2-morning?date=2026-99-99')).status,400);
const current=record.report.updatedAt;
assert.equal((await call(morning,'/api/s2-morning',{...stale,expectedUpdatedAt:current})).status,200);
assert.equal((await call(morning,'/api/s2-morning',{...stale,expectedUpdatedAt:current,values:{...values,production:'91'}})).status,409);
assert.equal(db.db.prepare('SELECT count(*) AS n FROM s2_morning_history').get().n,2);
console.log('PASS 0700 stale operator rejected, valid edit saved, both accepted versions in history; invalid date returns 400');

const latest=await(await call(morning,'/api/s2-morning?date=2026-10-16')).json();
db.beforeBatch=async()=>db.db.prepare("UPDATE s2_morning_reports SET updated_at='race-other' WHERE report_date='2026-10-16'").run();
assert.equal((await call(morning,'/api/s2-morning',{...stale,expectedUpdatedAt:latest.report.updatedAt,values:{...values,production:'92'}})).status,409);
assert.equal(db.db.prepare('SELECT count(*) AS n FROM s2_morning_history').get().n,2);
console.log('PASS 0700 atomic race rollback: no partial current/history write');

// Repeated Undo must work even though a preceding Undo changes stock timestamps.
for(const amount of [10,20]){state=await(await call(chem,'/api/s2-chemical')).json();assert.equal((await call(chem,'/api/s2-chemical',{action:'commit',changes:[{key:'lime',type:'tx',useKg:amount,expectedUpdatedAt:row('lime').updated_at}]})).status,200)}
for(let i=0;i<2;i++){const h=await(await call(chem,'/api/s2-chemical?action=history')).json();assert.equal((await call(chem,'/api/s2-chemical',{action:'undoLast',expectedBatchId:h.items[0].batch_id})).status,200)}
assert.equal(db.db.prepare("SELECT stock_mt FROM s2_chemical_stock WHERE chemical_key='lime'").get().stock_mt,lime.stock_mt);
console.log('PASS repeated Undo preserves preceding history and restores original balance');

for(const [hourly,status] of [['',400],['-1',400],['0',200],['100',200]]){
 const response=await call(morning,'/api/s2-morning',{reportDate:hourly==='100'?'2026-10-18':'2026-10-17',formatNumber:3,expectedUpdatedAt:'',values:{...values,sjamCHourly:hourly}});
 assert.equal(response.status,status);
}
console.log('PASS SJAM C API rejects blank/negative and accepts explicit zero/manual positive meter');
