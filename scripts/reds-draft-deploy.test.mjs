import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deployDraft} from './reds-draft-deploy.mjs';
const id='12345678-1234-1234-1234-123456789abc';
const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'ReqooCo/Reqoo.co',GITHUB_REF:'refs/heads/reds/draft',GITHUB_EVENT_NAME:'push',CLOUDFLARE_API_TOKEN:'fixture',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32)};
const config={name:'reqoo-reds-draft'};
for(const overrides of [{GITHUB_REF:'refs/heads/main'},{GITHUB_REPOSITORY:'other/repo'},{GITHUB_EVENT_NAME:'workflow_dispatch'},{GITHUB_ACTIONS:'false'}]) {
 await assert.rejects(deployDraft({env:{...env,...overrides},config,fetcher:()=>{throw Error('Must not request API');},run:()=>{throw Error('Must not run command');}}));
}
async function scenario({denied=false,wrongVersion=false,uploadFailed=false}={}) {
 const calls=[],commands=[];
 const fetcher=async(url,options)=>{
  assert.ok(url.startsWith(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/reqoo-reds-draft/`));
  calls.push({url,...options});
  return {ok:!denied,status:denied?403:200,json:async()=>({success:!denied,result:url.endsWith('/deployments')?{deployments:[{versions:[{version_id:wrongVersion?'other':id,percentage:100}]}]}:{enabled:true,previews_enabled:false}})};
 };
 const run=(cmd,args,options)=>{
  commands.push(args);
  if(args.includes('upload')){
   if(uploadFailed)throw Error('upload failed');
   fs.writeFileSync(options.env.WRANGLER_OUTPUT_FILE_PATH,JSON.stringify({type:'version-upload',version_id:id})+'\n');
  }
 };
 await deployDraft({env,config,fetcher,run});
 assert.equal(commands.length,2);
 assert.ok(commands[1].includes(`${id}@100`));
 assert.deepEqual(JSON.parse(calls[0].body),{enabled:true,previews_enabled:false});
}
await scenario();
await assert.rejects(scenario({denied:true}));
await assert.rejects(scenario({wrongVersion:true}));
await assert.rejects(scenario({uploadFailed:true}));
console.log('Draft scoped deployment tests PASS');
