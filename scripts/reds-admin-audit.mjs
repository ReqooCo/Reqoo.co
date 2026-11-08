// Owner-run, read-only GitHub administration audit. Never logs token values.
// Supply GITHUB_ADMIN_TOKEN via the owner's secure shell, never in chat or CI.
import fs from 'node:fs';
const policy=JSON.parse(fs.readFileSync(new URL('../cad-source/release-policy.json',import.meta.url)));
const solo=policy.rules.releaseApproval?.mode==='owner-environment';
const token=process.env.GITHUB_ADMIN_TOKEN;
if(!token){console.error('BLOCKED: GITHUB_ADMIN_TOKEN with repository Administration read and Environments/Secrets read is required.');process.exit(1);}
const base='https://api.github.com/repos/ReqooCo/Reqoo.co';
const failures=[];
async function get(path){
 const r=await fetch(base+path,{headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
 if(!r.ok)throw Error(`GET ${path}: HTTP ${r.status}`);
 return r.json();
}
async function all(path,key){
 const items=[];for(let page=1;page<=100;page++){
  const r=await get(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);
  const list=key?r[key]:r;if(!Array.isArray(list))throw Error(`Invalid collection: ${path}`);
  items.push(...list);if(list.length<100)return items;
 }throw Error(`Pagination limit: ${path}`);
}
function check(ok,message){console.log(`${ok?'PASS':'BLOCKED'}: ${message}`);if(!ok)failures.push(message);}
try{
 const summaries=await all('/rulesets');
 const rules=await Promise.all(summaries.map(r=>get(`/rulesets/${r.id}`)));
 // Accept only explicitly targeted policies. Broad/pattern rules need owner review.
 for(const branch of ['main','reds/draft']){
  const applicable=rules.filter(r=>r.target==='branch'&&r.enforcement==='active'&&
   r.conditions?.ref_name?.include?.includes(`refs/heads/${branch}`)&&
   !r.conditions?.ref_name?.exclude?.length);
  check(applicable.length>0,`${branch}: active explicit branch ruleset`);
  check(applicable.every(r=>!r.bypass_actors?.length),`${branch}: no ruleset bypass actors`);
  const types=applicable.flatMap(r=>r.rules||[]);
  for(const type of ['deletion','non_fast_forward'])check(types.some(r=>r.type===type),`${branch}: ${type}`);
  if(branch==='main'){
   if(solo)check(types.some(r=>r.type==='pull_request'&&r.parameters?.required_approving_review_count===0&&
    r.parameters?.require_last_push_approval===false&&r.parameters?.required_review_thread_resolution===true), 'main: PR required, solo approval count 0, no second-person latest-push lock, resolve review threads');
   else check(types.some(r=>r.type==='pull_request'&&r.parameters?.required_approving_review_count>=1&&
    r.parameters?.dismiss_stale_reviews_on_push&&r.parameters?.require_last_push_approval), 'main: independent latest-push approval and stale dismissal');
   const status=types.filter(r=>r.type==='required_status_checks');
   for(const name of ['verify (core)','verify (modeling)','verify (product)'])check(status.some(r=>r.parameters?.strict_required_status_checks_policy&&
    r.parameters?.required_status_checks?.some(c=>c.context===name&&c.integration_id===15368)),`main: required GitHub Actions ${name}, strict branch freshness`);
  }
 }
 for(const [name,branch] of [['reds-live','main'],['reds-draft','reds/draft']]){
  const env=await get(`/environments/${name}`);
  check(env.deployment_branch_policy?.custom_branch_policies===true&&env.deployment_branch_policy?.protected_branches===false,`${name}: explicit custom branch restrictions`);
  const policies=await all(`/environments/${name}/deployment-branch-policies`,'branch_policies');
  check(policies.length===1&&policies[0].name===branch&&policies[0].type==='branch',`${name}: only ${branch}, no tag/wildcard deployment`);
  if(name==='reds-live'){
   const reviewer=env.protection_rules?.find(r=>r.type==='required_reviewers');
   if(solo)check(reviewer?.prevent_self_review===false&&reviewer.reviewers?.length===1&&
    reviewer.reviewers[0].type==='User'&&reviewer.reviewers[0].reviewer?.id===policy.rules.releaseApproval.ownerId&&
    reviewer.reviewers[0].reviewer?.login===policy.rules.releaseApproval.ownerLogin&&env.can_admins_bypass===false,
    `${name}: sole owner approves deployment, self approval permitted, no admin bypass`);
   else check(reviewer?.prevent_self_review&&reviewer.reviewers?.length&&env.can_admins_bypass===false,`${name}: reviewers, prevent self approval, no admin bypass`);
  }
  const secrets=await all(`/environments/${name}/secrets`,'secrets');
  const secretNames=new Set(secrets.map(s=>s.name));
  // GitHub API lists names/timestamps only, never secret values. An existing name
  // is evidence of binding, NOT proof that its Cloudflare token is least-privilege.
  check(secretNames.has('CLOUDFLARE_API_TOKEN'),`${name}: environment Worker deployment token is installed`);
  if(name==='reds-live')check(secretNames.has('CLOUDFLARE_D1_API_TOKEN'),
    'reds-live: separate D1 migration token CLOUDFLARE_D1_API_TOKEN is installed');
  else check(!secretNames.has('CLOUDFLARE_D1_API_TOKEN'),
    'reds-draft: no Live D1 migration token exposed to Draft environment');
 }
 const repoSecrets=await all('/actions/secrets','secrets');
 const repoNames=new Set(repoSecrets.map(s=>s.name));
 check(!repoNames.has('CLOUDFLARE_API_TOKEN'),
   'repository: broad shared Worker deployment token removed (environment-only)');
 check(!repoNames.has('CLOUDFLARE_D1_API_TOKEN'),
   'repository: D1 migration token not shared globally (reds-live environment-only)');
 // Do not infer missing organization/user credentials from repository listings.
 console.log('MANUAL EVIDENCE STILL REQUIRED: environment secret values/token identity cannot be read; verify Cloudflare token binding, user-scoped token revocation, organization secrets, connected-agent/PAT access, alternative publishers and safe negative enforcement tests.');
}catch(e){failures.push(e.message);console.error(`BLOCKED: ${e.message}`);}
if(failures.length)process.exitCode=1;
