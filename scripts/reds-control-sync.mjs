#!/usr/bin/env node
// REDS Control Center: read-only reconciliation. No credentials are written to reports.
import fs from 'node:fs';
const repo=process.env.GITHUB_REPOSITORY||'ReqooCo/Reqoo.co';
const branch='reds/draft';
const api='https://api.github.com';
const ghToken=process.env.GITHUB_TOKEN;
const cfToken=process.env.CLOUDFLARE_AUDIT_TOKEN;
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const project='reqoo-co';
const now=new Date().toISOString();
const checks=[];
const check=(id,observed,expected,source,evidence)=>checks.push({id,observed,expected,status:observed===null?'unverified':observed===expected?'pass':'conflict',source,evidence,checkedAt:now});
async function request(url,token){const r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+token,accept:'application/json','user-agent':'reds-control-center'}});if(!r.ok)throw Error('HTTP '+r.status+' at '+new URL(url).pathname);return r.json();}
async function inspect(id,fn){try{return await fn();}catch(e){return {error:String(e.message||e),id};}}
const policy=JSON.parse(fs.readFileSync(new URL('../cad-source/release-policy.json',import.meta.url)));
const head=ghToken?await inspect('github-head',async()=>await request(api+'/repos/'+repo+'/branches/'+branch,ghToken)):null;
const sha=head?.commit?.sha||null;
const executionSha=process.env.GITHUB_SHA||null;
if(executionSha)check('draft.executionSha',sha,executionSha,'github',sha);
check('draft.branch',head?.name||null,policy.draft.branch,'github',sha);
const pr=ghToken?await inspect('github-pr',async()=>await request(api+'/repos/'+repo+'/pulls/277',ghToken)):null;
check('release.pr.base',pr?.base?.ref||null,policy.live.branch,'github',pr?.html_url||null);
check('release.pr.head',pr?.head?.ref||null,policy.draft.branch,'github',pr?.html_url||null);
check('release.pr.draft',typeof pr?.draft==='boolean'?pr.draft:null,true,'github',pr?.html_url||null);
check('release.pr.headSha',pr?.head?.sha||null,sha,'github',pr?.html_url||null);
check('release.pr.open',pr?.state||null,'open','github',pr?.html_url||null);
const cf=(cfToken&&account)?await inspect('cloudflare-pages',async()=>await request('https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/'+project,cfToken)):null;
const config=cf?.result?.source?.config;
check('pages.productionAutoDeploy',typeof config?.production_deployments_enabled==='boolean'?config.production_deployments_enabled:null,false,'cloudflare','pages/'+project);
check('pages.previewMode',config?.preview_deployment_setting||null,'custom','cloudflare','pages/'+project);
check('pages.previewDraft',Array.isArray(config?.preview_branch_includes)?config.preview_branch_includes.includes(branch):null,true,'cloudflare','pages/'+project);
const run=ghToken&&sha?await inspect('github-checks',async()=>await request(api+'/repos/'+repo+'/commits/'+sha+'/check-runs?per_page=100',ghToken)):null;
for(const name of policy.rules.requiredChecks){
 const matches=(run?.check_runs||[]).filter(x=>x.name===name&&x.head_sha===sha).sort((a,b)=>new Date(b.completed_at||0)-new Date(a.completed_at||0));
 check('ci.'+name,matches.length?matches[0].conclusion:null,'success','github',matches[0]?.details_url||null);
}
check('release.securityGate',policy.rules.liveAccessRestricted,true,'policy','cad-source/release-policy.json');
const errors=[head,pr,cf,run].filter(x=>x?.error).map(x=>({source:x.id,error:x.error}));
const releaseBlockers=checks.filter(x=>x.status!=='pass').map(x=>({id:x.id,status:x.status}));
const report={schemaVersion:1,generatedAt:now,repository:repo,branch,headSha:sha,sourceOfTruth:{git:'GitHub API',pages:'Cloudflare API',releasePolicy:'cad-source/release-policy.json'},sourceErrors:errors,checks,releaseBlockers,summary:{pass:checks.filter(x=>x.status==='pass').length,conflict:checks.filter(x=>x.status==='conflict').length,unverified:checks.filter(x=>x.status==='unverified').length},releaseReady:checks.every(x=>x.status==='pass')};
const output=process.argv[2]||'reds/control/status.json';
fs.mkdirSync(new URL('../reds/control/',import.meta.url),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary));
if(!report.releaseReady)process.exitCode=2;
