import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../api/worker.js';
import {onRequest as documents} from '../api/shop-admin-flow-v18.js';
const sql=new DatabaseSync(':memory:');
for(const f of ['0001_reqoo_core.sql','0002_reqoo_documents_v2.sql','0009_shop_production_meta.sql','0011_admin_business.sql','0012_order_handoffs.sql','0015_operating_expenses.sql','0016_recurring_expenses.sql'])sql.exec(fs.readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));
sql.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
// Payment schema is owned by the existing handler; initialise using an empty read.
const DB={prepare(query){return{query,args:[],bind(...args){this.args=args;return this},async first(){return sql.prepare(query).get(...this.args)||null},async all(){return{results:sql.prepare(query).all(...this.args)}},async run(){const r=sql.prepare(query).run(...this.args);return{...r,meta:{changes:r.changes}}}}},async batch(stmts){sql.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB,REQOO_ADMIN_TOKEN:'fixture-owner-secret'};
await documents({env,request:new Request('https://test/api/shop-admin?action=documentWorkspaces',{headers:{'X-Admin-Token':env.REQOO_ADMIN_TOKEN}})});
async function request(path,body,options={}){const headers={...(options.owner?{'X-Admin-Token':env.REQOO_ADMIN_TOKEN}:{}),...(options.cookie?{cookie:options.cookie}:{}),...(body?{'content-type':'application/json'}:{})};const r=await worker.fetch(new Request('https://test'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env,{});let d;try{d=await r.clone().json()}catch{d={}}return{status:r.status,body:d,headers:r.headers}}
const get=(action,data={},options={owner:true})=>request('/api/admin-business?'+new URLSearchParams({action,...data}),null,options),post=(action,data={},options={owner:true})=>request('/api/admin-business',{action,...data},options);


import {recurringExpenseApi} from '../api/admin-recurring-expenses.js';
assert.equal((await get('recurringExpenses',{month:'2026-02'},{})).status,401);
assert.equal((await recurringExpenseApi(new Request('https://test'),env,{action:'recurringExpenses',month:'2026-02'},{role:'sales'})).status,403);
for(const action of ['saveRecurringExpense','recordRecurringExpense'])assert.equal((await get(action)).status,405);
const preset={id:'fixture-recurring-rent',description:'Workshop rent',category:'Rent',amountMinor:100000,day:31,startMonth:'2026-01',expectedRevision:0};
assert.equal((await post('saveRecurringExpense',preset)).status,200);assert.equal((await post('saveRecurringExpense',preset)).status,200);
assert.equal(sql.prepare('SELECT COUNT(*) n FROM reqoo_operating_expenses').get().n,0,'templates never count as actual expenses');
assert.equal((await get('recurringExpenses',{month:'2026-02'})).body.templates[0].recorded_status,null);
const recorded=await Promise.all([post('recordRecurringExpense',{id:preset.id,month:'2026-02',expectedRevision:1}),post('recordRecurringExpense',{id:preset.id,month:'2026-02',expectedRevision:1})]);assert.ok(recorded.every(x=>x.status===200));assert.equal(recorded.filter(x=>x.body.created).length,1);
assert.equal(recorded[0].body.expense.expense_date,'2026-02-28');
assert.equal(sql.prepare('SELECT COUNT(*) n FROM reqoo_operating_expenses').get().n,1);
assert.equal((await post('saveRecurringExpense',{...preset,amountMinor:200000,expectedRevision:1})).status,200);
assert.equal((await post('recordRecurringExpense',{id:preset.id,month:'2026-03',expectedRevision:1})).status,409);
assert.equal((await post('recordRecurringExpense',{id:preset.id,month:'2026-02',expectedRevision:2})).body.expense.amount_minor,100000,'price changes retain recorded months');
const march=await post('recordRecurringExpense',{id:preset.id,month:'2026-03',expectedRevision:2});assert.equal(march.body.expense.amount_minor,200000);assert.equal(march.body.expense.expense_date,'2026-03-31');
assert.equal((await post('saveRecurringExpense',{...preset,amountMinor:200000,expectedRevision:2,active:false})).status,200);
assert.equal((await post('recordRecurringExpense',{id:preset.id,month:'2026-04',expectedRevision:3})).status,409);
assert.equal((await post('saveRecurringExpense',{...preset,amountMinor:200000,expectedRevision:3,active:true})).status,200);
assert.equal((await post('recordRecurringExpense',{id:preset.id,month:'2026-04',expectedRevision:4})).body.expense.expense_date,'2026-04-30');
assert.equal((await post('recordRecurringExpense',{id:preset.id,month:'2028-02',expectedRevision:4})).body.expense.expense_date,'2028-02-29');
const febId=recorded[0].body.expense.id;await post('voidOperatingExpense',{id:febId,reason:'Fixture correction'});
assert.equal((await post('recordRecurringExpense',{id:preset.id,month:'2026-02',expectedRevision:4})).body.expense.status,'void','voided months cannot be recreated silently');
assert.equal((await get('recurringExpenses',{month:'2026-02'})).body.templates[0].recorded_status,'void');
for(const change of [{day:0},{day:32},{amountMinor:0},{startMonth:'bad'}])assert.equal((await post('saveRecurringExpense',{...preset,...change,id:crypto.randomUUID()})).status,400);
assert.equal((await post('recordRecurringExpense',{id:preset.id,month:'2025-12',expectedRevision:4})).status,409);
const concurrent=await Promise.all([post('saveRecurringExpense',{...preset,amountMinor:300000,expectedRevision:4}),post('saveRecurringExpense',{...preset,amountMinor:400000,expectedRevision:4})]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);
for(let i=0;i<6;i++)await post('saveRecurringExpense',{...preset,id:'fixture-template-'+i,description:'Software '+i});
const page1=(await get('recurringExpenses',{month:'2026-02'})).body,page2=(await get('recurringExpenses',{month:'2026-02',offset:5})).body;assert.equal(page1.templates.length,5);assert.equal(page1.hasMore,true);assert.equal(page2.templates.length,2);
sql.exec(fs.readFileSync(new URL('../migrations/0016_recurring_expenses.sql',import.meta.url),'utf8'));
console.log('PASS: recurring template auth, no auto-posting, once-per-month concurrency, immutable recorded months, stale edits, pause/resume, void retention, month-end/leap dates and paging.');sql.close();
