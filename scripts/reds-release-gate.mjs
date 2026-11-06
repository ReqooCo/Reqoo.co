// REDS release doorway — enforced in GitHub Actions, independent of client
// (ChatGPT / Work / Codex / local git). Fails closed for CAD releases.
import fs from 'node:fs';
import path from 'node:path';
const policy=JSON.parse(fs.readFileSync(new URL('../cad-source/release-policy.json',import.meta.url)));
const mode=process.argv[2], ref=process.env.GITHUB_REF||'';
const repo=process.env.GITHUB_REPOSITORY||'ReqooCo/Reqoo.co';
const live='refs/heads/'+policy.live.branch,draft='refs/heads/'+policy.draft.branch;
const cadPaths=['cad-source/','workers/cad-bridge.js','_web_worker.js','wrangler-web.toml','.github/workflows/deploy.yml','.github/workflows/deploy-web-simple.yml','.github/workflows/cad-pr-validation.yml','.github/workflows/cad-live-verification.yml','scripts/reds-release-gate.mjs','scripts/reds-release-gate.test.mjs','scripts/reds-release-test-fetch.mjs','AGENTS.md','migrations/'];
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
 const sha=process.env.GITHUB_SHA,baseline=policy.live.baselineCommit;
 if(!sha||!/^([0-9a-f]{40})$/.test(sha)||!/^([0-9a-f]{40})$/.test(baseline))
  fail('Release SHA or approved baseline is missing.');
 const [owner,name]=repo.split('/');
 const compare=await gh('/repos/'+owner+'/'+name+'/compare/'+baseline+'...'+sha+'?per_page=100');
 if(!['ahead','identical'].includes(compare.status))fail('Main no longer descends from approved release baseline.');
 // Inspect the entire change history, not only the last commit:
 // a direct CAD push followed by an unrelated commit must remain blocked.
 const commits=compare.commits||[];
 if(!Array.isArray(commits)||compare.total_commits>commits.length||commits.length>=100)
  fail('Release history exceeds audit window; explicitly rotate the approved baseline via reviewed PR.');
 const validated=new Set();
 for(const commit of commits){
  const item=await gh('/repos/'+owner+'/'+name+'/commits/'+commit.sha);
  if(!Array.isArray(item.files)||item.files.length>=300)
   fail('Changed-file list incomplete; refuse deployment for commit '+commit.sha);
  if(!item.files.some(f=>isCAD(f.filename)))continue;
  const prs=await gh('/repos/'+owner+'/'+name+'/commits/'+commit.sha+'/pulls?per_page=100');
  if(!Array.isArray(prs))fail('Associated PR list unavailable for '+commit.sha);
  const authorised=prs.find(p=>p.merged_at&&p.base?.ref===policy.live.branch&&
   p.head?.ref===policy.draft.branch&&p.head?.repo?.full_name===repo);
  if(!authorised)fail('Unreviewed CAD or deployment-policy commit exists on main: '+commit.sha);
  const head=authorised.head?.sha;
  if(!head||!/^([0-9a-f]{40})$/.test(head))fail('PR source SHA unavailable.');
  if(validated.has(head))continue;
  const result=await gh('/repos/'+owner+'/'+name+'/commits/'+head+'/check-runs?per_page=100');
  for(const required of policy.rules.requiredChecks){
   const runs=(result.check_runs||[]).filter(c=>c.name===required)
    .sort((a,b)=>new Date(b.completed_at||0)-new Date(a.completed_at||0));
   if(!runs.length||runs[0].status!=='completed'||runs[0].conclusion!=='success')
    fail('Required CAD validation not green at exact Draft SHA '+head+': '+required);
  }
  validated.add(head);
  console.log('REDS gate accepted merged Draft PR #'+authorised.number+' '+head);
 }
 console.log('REDS gate approved: main source '+sha+' contains no unauthorised CAD commits since baseline '+baseline);
}
try{
 if(mode==='check-pr')await checkPR();
 else if(mode==='check-draft'){assertDraftBranch();console.log('REDS gate: dedicated Draft Worker allowed.');}
 else if(mode==='check-live')await checkLive();
 else fail('Unknown policy command: '+mode);
}catch(e){console.error(e.message);process.exitCode=1;}
