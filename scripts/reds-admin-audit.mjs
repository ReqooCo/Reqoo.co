// Owner-run, read-only GitHub administration audit. Never logs token values.
// Supply GITHUB_ADMIN_TOKEN via the owner's secure shell, never in chat or CI.
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
   check(types.some(r=>r.type==='pull_request'&&r.parameters?.required_approving_review_count>=1&&
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
  if(name==='reds-live')check(env.protection_rules?.some(r=>r.type==='required_reviewers'&&r.prevent_self_review&&r.reviewers?.length)&&env.can_admins_bypass===false,`${name}: reviewers, prevent self approval, no admin bypass`);
  const secrets=await all(`/environments/${name}/secrets`,'secrets');
  check(secrets.some(s=>s.name==='CLOUDFLARE_API_TOKEN'),`${name}: environment deployment token exists (scope and distinctness require Cloudflare evidence)`);
 }
 const repoSecrets=await all('/actions/secrets','secrets');
 check(!repoSecrets.some(s=>s.name==='CLOUDFLARE_API_TOKEN'),'repository: broad shared CLOUDFLARE_API_TOKEN removed');
 console.log('MANUAL EVIDENCE STILL REQUIRED: Cloudflare token scopes/distinctness/revocation, organization secrets, app/PAT/member access, alternate publishers, safe negative enforcement tests.');
}catch(e){failures.push(e.message);console.error(`BLOCKED: ${e.message}`);}
if(failures.length)process.exitCode=1;
