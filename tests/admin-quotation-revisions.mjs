import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v18.js';
const sql=new DatabaseSync(':memory:');
for(const name of ['0001_reqoo_core.sql','0002_reqoo_documents_v2.sql','0013_quotation_revisions.sql'])sql.exec(fs.readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
sql.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
let beforeBatch=null,queue=Promise.resolve();
const DB={prepare(query){return {query,args:[],bind(...args){this.args=args;return this},async first(){return sql.prepare(query).get(...this.args)||null},async all(){return {results:sql.prepare(query).all(...this.args)}},async run(){return sql.prepare(query).run(...this.args)}}},async batch(statements){
 if(beforeBatch)await beforeBatch(statements);
 const run=queue.then(()=>{sql.exec('BEGIN');try{const result=statements.map(s=>sql.prepare(s.query).run(...s.args));sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}});queue=run.catch(()=>{});return run;
}};
const env={DB,REQOO_ADMIN_TOKEN:'fixture',ADMIN_ACTOR:{name:'Fixture Admin'}};
async function call(action,data={},auth=true,method='POST'){const u=new URL('https://fixture/api/shop-admin');if(method==='GET')for(const [k,v] of Object.entries({action,...data}))u.searchParams.set(k,v);const response=await onRequest({env,request:new Request(u,{method,headers:{'content-type':'application/json',...(auth?{'X-Admin-Token':'fixture'}:{})},...(method==='POST'?{body:JSON.stringify({action,...data})}:{})})});return {http:response.status,...await response.json()}}
const payload={customerName:'Original Customer',customerPhone:'0123456789',customerEmail:'fixture@example.test',customerAddress:'Original address',terms:'Original terms',notes:'Original notes',items:[{description:'Original item',variation:'Gold',quantity:2,unitPriceMinor:5000}],discountMinor:500,shippingMinor:1000,taxMinor:100,depositPercent:50};
const create=async()=>{const r=await call('createCustomQuotation',payload);assert.equal(r.ok,true,JSON.stringify(r));return r.document};
const edit=(doc,changes={})=>call('updateCustomQuotation',{...payload,documentId:doc.id,expectedRevision:Number(doc.company.quoteMeta.revision||0),expectedUpdatedAt:doc.updated_at,...changes});
const get=id=>call('quotationHistory',{documentId:id});
assert.equal((await call('quotationHistory',{},false)).http,401);
assert.equal((await call('updateCustomQuotation',{},true,'GET')).http,405);
const original=await create();
assert.equal((await get(original.id)).currentRevision,0);
assert.equal((await call('convertCustomQuotationToOrder',{documentId:original.id})).http,409,'approval required');
assert.equal((await call('updateCustomQuotation',{...payload,documentId:original.id})).http,409,'missing version cannot overwrite');
let r=await edit(original,{customerName:'Revised Customer',terms:'New terms',items:[{description:'New item',quantity:3,unitPriceMinor:9000}]});
assert.equal(r.http,200,JSON.stringify(r));const rev1=r.document;
assert.equal(rev1.number,original.number);assert.equal(rev1.company.quoteMeta.revision,1);
assert.equal(rev1.company.quoteMeta.revisedBy,'Fixture Admin');
assert.equal((await edit(original)).http,409);
let history=await get(original.id);assert.deepEqual(history.versions.map(v=>v.revision),[1,0]);
let old=(await call('quotationHistory',{documentId:original.id,revision:0})).document;
for(const key of ['number','customer_name','customer_phone','customer_email','subtotal_minor','discount_minor','shipping_minor','tax_minor','total_minor','due_at','company_json','items'])assert.deepEqual(old[key],original[key],key);
assert.equal(old.readOnly,true);
assert.throws(()=>sql.prepare('UPDATE reqoo_quotation_revisions SET version_actor=?').run('changed'),/immutable/);
assert.throws(()=>sql.prepare('DELETE FROM reqoo_quotation_revisions').run(),/immutable/);
const approved=(await call('updateCustomQuotationStatus',{documentId:original.id,status:'accepted'})).document;
const second=await edit(approved);assert.equal(second.http,200);assert.equal(second.document.status,'issued');assert.equal(second.document.company.quoteMeta.approvedAt,null);
assert.equal((await call('convertCustomQuotationToOrder',{documentId:original.id})).http,409,'revision needs fresh approval');
assert.equal((await call('updateCustomQuotationStatus',{documentId:original.id,status:'accepted',expectedRevision:1,expectedUpdatedAt:rev1.updated_at})).http,409,'stale approval rejected');
// Force two editors to read the same version before either transactional batch executes.
const concurrent=await create();let arrived=0,release;const gate=new Promise(r=>release=r);
beforeBatch=async ss=>{if(ss[0].query.startsWith('INSERT INTO reqoo_quotation_revisions')){if(++arrived===2)release();await gate}};
const results=await Promise.all([edit(concurrent,{notes:'Editor A'}),edit(concurrent,{notes:'Editor B'})]);beforeBatch=null;
assert.deepEqual(results.map(r=>r.http).sort(),[200,409]);assert.equal((await get(concurrent.id)).versions.length,2);
// A conversion committed after the editor read must roll back its snapshot and replacement items.
const racing=await create();await call('updateCustomQuotationStatus',{documentId:racing.id,status:'accepted'});
let conversion;
beforeBatch=async ss=>{if(ss[0].query.startsWith('INSERT INTO reqoo_quotation_revisions')){beforeBatch=null;conversion=await call('convertCustomQuotationToOrder',{documentId:racing.id});}};
const current=(await call('quotationHistory',{documentId:racing.id,revision:0})).document;
assert.equal((await edit(current)).http,409);assert.equal(conversion.ok,true);assert.equal((await get(racing.id)).versions.length,1);
// Failure after snapshot creation is atomic: no archive or item loss.
const failing=await create();sql.exec("CREATE TRIGGER fail_fixture BEFORE INSERT ON reqoo_document_items WHEN NEW.description='FAIL' BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
const quiet=console.error;console.error=()=>{};
assert.equal((await edit(failing,{items:[{description:'FAIL',quantity:1,unitPriceMinor:1}]})).http,500);console.error=quiet;
assert.equal((await get(failing.id)).currentRevision,0);assert.equal((await get(failing.id)).versions.length,1);
assert.equal(sql.prepare('SELECT description FROM reqoo_document_items WHERE document_id=?').get(failing.id).description,'Original item');
// Competing conversion requests produce exactly one linked order.
const convert=await create();await call('updateCustomQuotationStatus',{documentId:convert.id,status:'accepted'});
arrived=0;let unlock;const both=new Promise(r=>unlock=r);
beforeBatch=async ss=>{if(ss.some(s=>s.query.startsWith('INSERT INTO orders'))){if(++arrived===2)unlock();await both}};
const converted=await Promise.all([call('convertCustomQuotationToOrder',{documentId:convert.id}),call('convertCustomQuotationToOrder',{documentId:convert.id})]);beforeBatch=null;
assert.ok(converted.every(r=>r.ok),JSON.stringify(converted));assert.equal(converted[0].order.id,converted[1].order.id);
assert.equal(sql.prepare('SELECT COUNT(*) n FROM orders WHERE id=?').get(converted[0].order.id).n,1);
assert.equal((await edit(convert)).http,409);
assert.equal((await call('quotationHistory',{documentId:original.id,revision:999})).http,404);
// Migration is idempotent and retained archives survive an application rollback.
sql.exec(fs.readFileSync(new URL('../migrations/0013_quotation_revisions.sql',import.meta.url),'utf8'));
assert.equal((await get(original.id)).currentRevision,2);
console.log('PASS: Rev 0/1/2, complete immutable snapshots, actor/date, stale edits/approval, two concurrent edits, conversion races, transaction rollback and additive migration.');
sql.close();
