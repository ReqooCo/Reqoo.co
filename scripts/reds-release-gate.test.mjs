import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'reds-gate-'));
const file=path.join(scratch,'event.json');
const repo='ReqooCo/Reqoo.co';
// A temporary policy fixture models verified admin controls, never an env
// override that could unlock the real production policy.
fs.mkdirSync(path.join(scratch,'scripts'));fs.mkdirSync(path.join(scratch,'cad-source'));
const fixture=path.join(scratch,'scripts','gate.mjs');
fs.copyFileSync('scripts/reds-release-gate.mjs',fixture);
const testPolicy=JSON.parse(fs.readFileSync('cad-source/release-policy.json'));
fs.writeFileSync(path.join(scratch,'cad-source','release-policy.json'),JSON.stringify({...testPolicy,rules:{...testPolicy.rules,liveAccessRestricted:true,releaseApproval:{mode:"independent-pr"}}}));
const run=(mode,eventName,ref,payload,expectPass)=>{
 fs.writeFileSync(file,JSON.stringify(payload));
 const child=spawnSync(process.execPath,['scripts/reds-release-gate.mjs',mode],{
  env:{...process.env,GITHUB_EVENT_NAME:eventName,GITHUB_REF:ref,GITHUB_REPOSITORY:repo,GITHUB_EVENT_PATH:file},
  encoding:'utf8'
 });
 assert.equal(child.status,expectPass?0:1,[mode,eventName,ref,child.stdout,child.stderr].join(' | '));
};
const scenario=(name,ok,{solo=false,command='check-live',omitRun=false}={})=>{
 const fixturePolicy={...testPolicy,rules:{...testPolicy.rules,liveAccessRestricted:true,releaseApproval:solo?testPolicy.rules.releaseApproval:{mode:'independent-pr'}}};
 fs.writeFileSync(path.join(scratch,'cad-source','release-policy.json'),JSON.stringify(fixturePolicy));
 const child=spawnSync(process.execPath,['--import','./scripts/reds-release-test-fetch.mjs',name==='admin-pending'?'scripts/reds-release-gate.mjs':fixture,command],{
  env:{...process.env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:repo,
   GITHUB_SHA:'dddddddddddddddddddddddddddddddddddddddd',
   GITHUB_TOKEN:'mock-test-token',GITHUB_RUN_ID:omitRun?'':'900',REDS_TEST_SCENARIO:name,GITHUB_EVENT_PATH:file},
  encoding:'utf8'
 });
 assert.equal(child.status,ok?0:1,[name,child.stdout,child.stderr].join(' | '));
};
const pr={pull_request:{number:277,base:{ref:'main'},head:{ref:'reds/draft',repo:{full_name:repo}}}};
try{
 run('check-pr','pull_request','refs/pull/277/merge',pr,true);
 run('check-pr','pull_request','refs/pull/277/merge',{pull_request:{...pr.pull_request,head:{ref:'feature/old-branch',repo:{full_name:repo}}}},false);
 run('check-pr','pull_request','refs/pull/277/merge',{pull_request:{...pr.pull_request,base:{ref:'another'}}},false);
 run('check-pr','push','refs/heads/main',{},true);
 run('check-pr','push','refs/heads/feature/old-branch',{},false);
 run('check-pr','workflow_dispatch','refs/heads/main',{},true);
 run('check-pr','workflow_dispatch','refs/heads/reds/draft',{},false);
 run('check-draft','push','refs/heads/reds/draft',{},true);
 run('check-draft','push','refs/heads/main',{},false);
 run('check-live','push','refs/heads/feature/old-branch',{},false);
 for(const name of ['noncad-pr','cad-pr','renamed-cad-pr','policy-pr']){
  fs.writeFileSync(file,JSON.stringify({pull_request:{number:279,changed_files:1,base:{ref:'main'},head:{ref:'shop/fix',repo:{full_name:repo}}}}));
  const c=spawnSync(process.execPath,['--import','./scripts/reds-release-test-fetch.mjs','scripts/reds-release-gate.mjs','check-pr'],{
   env:{...process.env,GITHUB_EVENT_NAME:'pull_request',GITHUB_REF:'refs/pull/279/merge',GITHUB_REPOSITORY:repo,GITHUB_EVENT_PATH:file,GITHUB_TOKEN:'mock-test-token',REDS_TEST_SCENARIO:name},encoding:'utf8'});
  assert.equal(c.status,name==='noncad-pr'?0:1,[name,c.stdout,c.stderr].join(' | '));
 }
 scenario('identical',true);
 scenario('valid',true);
 scenario('admin-pending',false);
 scenario('unreviewed',false);
 for(const name of ['no-review','self-review','bot-review','outside-review','stale-review','dismissed-review','changes-requested'])scenario(name,false);
 scenario('delayed',false);
 scenario('failed-check',false);
 scenario('wrong-app',false);
 scenario('wrong-workflow',false);
 scenario('missing-draft',false);
 scenario('failed-draft',false);
 scenario('wrong-preview',false);
 scenario('no-review',true,{solo:true});
 scenario('valid',true,{solo:true});
 scenario('changes-requested',false,{solo:true});
 for(const name of ['no-owner-approval','wrong-owner-id','wrong-owner-login','bot-owner','wrong-environment','rejected-owner','wrong-live-run-sha','wrong-live-workflow','wrong-live-event','wrong-live-repo','wrong-policy-owner','approval-api-denied'])scenario(name,false,{solo:true});
 scenario('valid',false,{solo:true,omitRun:true});
 scenario('no-owner-approval',true,{solo:true,command:'check-live-source'});
 scenario('failed-check',false,{solo:true,command:'check-live-source'});
 scenario('missing-draft',false,{solo:true,command:'check-live-source'});
 console.log('REDS RELEASE GATE PASS: single Draft source, legacy rejection, baseline history, delayed bypass prevention, exact green checks');
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
