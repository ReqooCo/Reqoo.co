// REDS release doorway — enforced in GitHub Actions, independent of client
// (ChatGPT / Work / Codex / local git). Fails closed for CAD releases.
import fs from 'node:fs';
import path from 'node:path';
const policy=JSON.parse(fs.readFileSync(new URL('../cad-source/release-policy.json',import.meta.url)));
const mode=process.argv[2], ref=process.env.GITHUB_REF||'';
const repo=process.env.GITHUB_REPOSITORY||'ReqooCo/Reqoo.co';
const live='refs/heads/'+policy.live.branch,draft='refs/heads/'+policy.draft.branch;
const cadPaths=['cad-source/','workers/cad-bridge.js','_web_worker.js','wrangler-web.toml','.github/workflows/deploy.yml','.github/workflows/deploy-web-simple.yml','.github/workflows/cad-pr-validation.yml','.github/workflows/cad-live-verification.yml','scripts/reds-release-gate.mjs','scripts/reds-release-gate.test.mjs','scripts/reds-release-surface-audit.mjs','scripts/reds-release-test-fetch.mjs','AGENTS.md'];
const fail=(message)=>{throw new Error('REDS RELEASE BLOCKED: '+message);};
const isCAD=file=>file.startsWith('scripts/reds-')||cadPaths.some(p=>p.endsWith('/')?file.startsWith(p):file===p)||(file.startsWith('migrations/')&&file.includes('cad_bridge'));
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
 if(p.base?.ref!==policy.live.branch)fail('Release PR must target main.');
 if(p.head?.ref!==policy.draft.branch||p.head?.repo?.full_name!==repo){
  // Required named checks must report on unrelated REQOO PRs too. Inspect
  // every changed file before permitting a non-CAD source; never trust labels.
  if(!Number.isSafeInteger(p.number)||p.number<=0)fail('Invalid PR number.');
  let count=0;
  for(let page=1;page<=31;page++){
   const files=await gh('/repos/'+repo+'/pulls/'+p.number+'/files?per_page=100&page='+page);
   if(!Array.isArray(files)||files.some(f=>typeof f.filename!=='string'))fail('PR file list unavailable.');
   if(files.some(f=>isCAD(f.filename)||(f.previous_filename&&isCAD(f.previous_filename))))
    fail('CAD changes require PR '+policy.draft.branch+' → '+policy.live.branch+' in '+repo);
   count+=files.length;
   if(files.length<100){
    if(count!==p.changed_files)fail('PR changed-file count changed or is incomplete.');
    console.log('REDS gate: non-CAD PR; named checks may report without a Draft release.');return;
   }
  }
  fail('PR exceeds complete changed-file audit limit.');
 }
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
  // A merged PR is not proof of review. Require an independent approval of
  // the exact source; a later dismissal/request for changes invalidates it.
  const reviews=await gh('/repos/'+owner+'/'+name+'/pulls/'+authorised.number+'/reviews?per_page=100');
  if(!Array.isArray(reviews)||reviews.length>=100)
   fail('PR review history unavailable or incomplete.');
  const latestReviews=new Map();
  for(const review of reviews){
   if(!review.user?.login||!['APPROVED','CHANGES_REQUESTED','DISMISSED'].includes(review.state))continue;
   const key=review.user.login.toLowerCase();
   const previous=latestReviews.get(key);
   if(!previous||Number(review.id)>Number(previous.id))latestReviews.set(key,review);
  }
  const author=authorised.user?.login?.toLowerCase();
  if(!author||![...latestReviews.values()].some(r=>r.state==='APPROVED'&&r.commit_id===head&&
     r.user.login.toLowerCase()!==author&&r.user.type==='User'&&['OWNER','MEMBER','COLLABORATOR'].includes(r.author_association)))
   fail('Independent PR approval of exact Draft SHA is required: '+head);
  if([...latestReviews.values()].some(r=>r.state==='CHANGES_REQUESTED'))
   fail('Unresolved changes-requested review blocks release.');
  const result=await gh('/repos/'+owner+'/'+name+'/commits/'+head+'/check-runs?per_page=100');
  const verifiedRunIds=new Set();
  for(const required of policy.rules.requiredChecks){
   const runs=(result.check_runs||[]).filter(c=>c.name===required&&c.app?.slug==='github-actions')
    .sort((a,b)=>new Date(b.completed_at||0)-new Date(a.completed_at||0));
   if(!runs.length||runs[0].status!=='completed'||runs[0].conclusion!=='success')
    fail('Required GitHub Actions CAD validation not green at exact Draft SHA '+head+': '+required);
   const parsed=/\/actions\/runs\/(\d+)\/job\/\d+/.exec(runs[0].details_url||'');
   if(!parsed)fail('CAD check has no verifiable GitHub Actions run URL: '+required);
   verifiedRunIds.add(parsed[1]);
  }
  if(verifiedRunIds.size!==1)fail('CAD checks must belong to the same workflow run and exact Draft SHA.');
  const runId=[...verifiedRunIds][0];
  const verified=await gh('/repos/'+owner+'/'+name+'/actions/runs/'+runId);
  if(verified.name!=='CAD PR validation'||verified.event!=='pull_request'||
     verified.head_sha!==head||verified.head_branch!==policy.draft.branch||
     verified.status!=='completed'||verified.conclusion!=='success')
   fail('CAD checks do not originate from the authorised completed CAD PR validation workflow.');
  const preview=(result.check_runs||[]).filter(c=>c.name==='verify-live'&&c.app?.slug==='github-actions')
   .sort((a,b)=>new Date(b.completed_at||0)-new Date(a.completed_at||0));
  if(!preview.length||preview[0].status!=='completed'||preview[0].conclusion!=='success')
   fail('Canonical REDS Draft Worker browser validation has not passed for source SHA '+head);
  const previewRun=/\/actions\/runs\/(\d+)\/job\/\d+/.exec(preview[0].details_url||'')?.[1];
  if(!previewRun)fail('Draft preview check lacks an identifiable GitHub Actions run.');
  const verifiedPreview=await gh('/repos/'+owner+'/'+name+'/actions/runs/'+previewRun);
  if(verifiedPreview.name!=='REDS single Draft preview verification'||verifiedPreview.event!=='push'||
     verifiedPreview.head_sha!==head||verifiedPreview.head_branch!==policy.draft.branch||
     verifiedPreview.status!=='completed'||verifiedPreview.conclusion!=='success')
   fail('Draft preview check is not the successful official Worker source and browser verification.');
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
