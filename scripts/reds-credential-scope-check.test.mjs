import assert from 'node:assert/strict';
import {verifyDraftCredential} from './reds-credential-scope-check.mjs';
const base='https://api.cloudflare.com/client/v4/accounts/test-account';
const paths=['/workers/scripts/reqoo-reds-draft/settings','/workers/scripts/reqoo-web/settings','/workers/scripts/reqoo-catalog-api/settings','/d1/database'];
const run=async(statuses)=>{
 const used=[];
 const request=async(url,opts)=>{
  assert.equal(opts.method,'GET');
  assert.equal(opts.headers.Authorization,'Bearer test-draft-token');
  const index=paths.findIndex(p=>url===base+p);
  assert.ok(index>=0,'Unexpected external endpoint');
  used.push(index);
  return {status:statuses[index]};
 };
 const result=await verifyDraftCredential({accountId:'test-account',token:'test-draft-token',request});
 assert.deepEqual(used,[0,1,2,3]);
 return result;
};
assert.deepEqual(await run([200,403,404,403]),{draftWorkerReadable:true,liveWorkersDenied:2,d1Denied:true});
for(const statuses of [[403,403,403,403],[200,200,403,403],[200,403,200,403],[200,403,403,200],[200,500,403,403],[200,403,403,500]]){
 await assert.rejects(run(statuses),/not verified|can access|not denied|can list|denial was not verified/);
}
await assert.rejects(verifyDraftCredential({accountId:'',token:'test',request:async()=>({status:200})}),/Missing/);
await assert.rejects(verifyDraftCredential({accountId:'test',token:'',request:async()=>({status:200})}),/Missing/);
console.log('REDS DRAFT CREDENTIAL SCOPE UNIT PASS: read-only GET, scoped access, safe denied outcomes and fail closed');
