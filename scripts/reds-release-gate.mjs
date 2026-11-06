// REDS release doorway — enforced in GitHub Actions, independent of client
// (ChatGPT / Work / Codex / local git). Fails closed for CAD releases.
import fs from 'node:fs';
import path from 'node:path';
const policy=JSON.parse(fs.readFileSync(new URL('../cad-source/release-policy.json',import.meta.url)));
const mode=process.argv[2], ref=process.env.GITHUB_REF||'';
const repo=process.env.GITHUB_REPOSITORY||'ReqooCo/Reqoo.co';
const live='refs/heads/'+policy.live.branch,draft='refs/heads/'+policy.draft.branch;
const cadPaths=['cad-source/','workers/cad-bridge.js','_web_worker.js','wrangler-web.toml'];
const fail=(message)=>{throw new Error('REDS RELEASE BLOCKED: '+message);};
const isCAD=file=>cadPaths.some(p=>p.endsWith('/')?file.startsWith(p):file===p);
const event=()=>JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
async function gh(pathname){
 const token=process.env.GITHUB_TOKEN;
 if(!token)fail('GITHUB_TOKEN unavailable; cannot confirm merge and checks.');
 const response=await fetch('https://api.github.com'+pathname,{headers:{
  authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28','user-agent':'reqoo-reds-release-gate'
 }});
 if(!response.ok)fail('GitHub verification failed: '+response.status+' '+pathname);
 return response.json();
}
function assertDraftBranch(){
 if(ref!==draft)fail('Only '+draft+' may publish REDS Draft. Received '+ref);
}
async function checkPR(){
 if(['push','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)){
  if(ref!==live)fail('CAD validation push must target main.');
  return console.log('REDS gate: main branch may run validation (not deployment).');
 }
 if(process.env.GITHUB_EVENT_NAME!=='pull_request')fail('Unexpected CAD PR event.');
 const p=event().pull_request;
 if(!p)fail('Missing pull_request event details.');
 if(p.base?.ref!==policy.live.branch||p.head?.ref!==policy.draft.branch||
    p.head?.repo?.full_name!==repo)fail('CAD changes require PR '+policy.draft.branch+' → '+policy.live.branch+' in '+repo);
 console.log('REDS gate: authorised single Draft PR '+p.number+' → main.');
}
async function checkLive(){
 if(ref!==live)fail('Only main may deploy REDS Live.');
 const sha=process.env.GITHUB_SHA;
 if(!sha||!/^([0-9a-f]{40})$/.test(sha))fail('Invalid release commit.');
 const [owner,name]=repo.split('/');
 const commit=await gh('/repos/'+owner+'/'+name+'/commits/'+sha);
 const files=(commit.files||[]).map(f=>f.filename);
 // Other REQOO products continue to use their existing deployment path;
 // this gate is strictly for CAD-related commits.
 if(!files.some(isCAD))return console.log('REDS gate: non-CAD main commit; existing REQOO release unaffected.');
 const prs=await gh('/repos/'+owner+'/'+name+'/commits/'+sha+'/pulls?per_page=100');
 const authorised=prs.find(p=>p.merged_at&&p.base?.ref===policy.live.branch&&
  p.head?.ref===policy.draft.branch&&p.head?.repo?.full_name===repo);
 if(!authorised)fail('CAD release commit is not a merged PR from '+policy.draft.branch);
 const head=authorised.head?.sha;
 if(!head||!/^([0-9a-f]{40})$/.test(head))fail('PR source SHA unavailable.');
 const result=await gh('/repos/'+owner+'/'+name+'/commits/'+head+'/check-runs?per_page=100');
 for(const required of policy.rules.requiredChecks){
  const runs=(result.check_runs||[]).filter(c=>c.name===required)
   .sort((a,b)=>new Date(b.completed_at||0)-new Date(a.completed_at||0));
  if(!runs.length||runs[0].status!=='completed'||runs[0].conclusion!=='success')
   fail('Required CAD validation not green on the exact Draft source SHA: '+required);
 }
 console.log('REDS gate approved: merged Draft PR #'+authorised.number+', SHA '+head+', all CAD checks green.');
}
try{
 if(mode==='check-pr')await checkPR();
 else if(mode==='check-draft'){assertDraftBranch();console.log('REDS gate: dedicated Draft Worker allowed.');}
 else if(mode==='check-live')await checkLive();
 else fail('Unknown policy command: '+mode);
}catch(e){console.error(e.message);process.exitCode=1;}
