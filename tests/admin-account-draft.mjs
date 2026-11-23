import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { businessApi } from '../api/admin-business.js';

const database=new DatabaseSync(':memory:');
const DB={prepare(sql){
 const stmt=database.prepare(sql);
 const wrap=(args)=>({bind:(...values)=>wrap(values),run:()=>stmt.run(...args),first:()=>stmt.get(...args)});
 return wrap([]);
}};
async function call(id,action,fields={}){
 const method=action==='quoteDraft'?'GET':'POST';
 const request=new Request('https://example.test/api/admin-business',{method});
 const response=await businessApi(request,{DB,ADMIN_ACTOR:{id,role:'sales'}},{action,...fields});
 return {status:response.status,...await response.json()};
}
const draft={payload:{items:[{description:'Customer text'}]}};
const saved=await call('alice','saveQuoteDraft',{draft});
assert.equal(saved.status,200);
assert.deepEqual((await call('alice','quoteDraft')).draft,draft);
assert.equal((await call('bob','quoteDraft')).draft,null);
assert.equal((await call('alice','saveQuoteDraft',{draft})).status,409);
const next=await call('alice','saveQuoteDraft',{draft,revision:saved.revision});
assert.equal(next.status,200);
await call('alice','deleteQuoteDraft',{revision:saved.revision});
assert.equal((await call('alice','quoteDraft')).revision,next.revision);
await call('alice','deleteQuoteDraft',{revision:next.revision});
assert.equal((await call('alice','quoteDraft')).draft,null);
database.close();
console.log('PASS: quotation drafts are account scoped and stale saves and deletes preserve the latest version.');
