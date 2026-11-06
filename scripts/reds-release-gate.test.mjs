import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'reds-gate-'));
const file=path.join(scratch,'event.json');
const repo='ReqooCo/Reqoo.co';
const run=(mode,eventName,ref,payload,expectPass)=>{
 fs.writeFileSync(file,JSON.stringify(payload));
 const child=spawnSync(process.execPath,['scripts/reds-release-gate.mjs',mode],{
  env:{...process.env,GITHUB_EVENT_NAME:eventName,GITHUB_REF:ref,GITHUB_REPOSITORY:repo,GITHUB_EVENT_PATH:file},
  encoding:'utf8'
 });
 assert.equal(child.status,expectPass?0:1,[mode,eventName,ref,child.stdout,child.stderr].join(' | '));
};
const scenario=(name,ok)=>{
 const child=spawnSync(process.execPath,['--import','./scripts/reds-release-test-fetch.mjs','scripts/reds-release-gate.mjs','check-live'],{
  env:{...process.env,GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:repo,
   GITHUB_SHA:'dddddddddddddddddddddddddddddddddddddddd',
   GITHUB_TOKEN:'mock-test-token',REDS_TEST_SCENARIO:name,GITHUB_EVENT_PATH:file},
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
 scenario('identical',true);
 scenario('valid',true);
 scenario('unreviewed',false);
 scenario('delayed',false);
 scenario('failed-check',false);
 console.log('REDS RELEASE GATE PASS: single Draft source, legacy rejection, baseline history, delayed bypass prevention, exact green checks');
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
