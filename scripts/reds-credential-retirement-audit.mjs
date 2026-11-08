// Read-only verification of the owner's legacy-credential cleanup.
// Runs WITHOUT an Actions environment. Never reads, logs or transmits secret values.
const isPresent=x=>String(x||'').toLowerCase()==='true';
const repo=process.env.GITHUB_REPOSITORY;
const token=process.env.GITHUB_TOKEN;
if(isPresent(process.env.REPO_WORKER_SECRET_PRESENT))
  throw Error('REDS BLOCKED: shared repository/organization CLOUDFLARE_API_TOKEN still available without environment');
if(isPresent(process.env.REPO_D1_SECRET_PRESENT))
  throw Error('REDS BLOCKED: shared repository/organization CLOUDFLARE_D1_API_TOKEN still available without environment');
if(process.env.REPO_WORKER_SECRET_PRESENT!=='false'||process.env.REPO_D1_SECRET_PRESENT!=='false')
  throw Error('REDS BLOCKED: unable to verify global-secret absence');
if(!/^ReqooCo\/Reqoo\.co$/.test(repo||'')||!token)
  throw Error('REDS BLOCKED: canonical repository or read-only GitHub credential not present');
const endpoint='https://api.github.com/repos/'+repo+'/actions/workflows/provision-rebuild-d1.yml';
const response=await fetch(endpoint,{
  method:'GET',
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'reqoo-reds-retirement-audit'}
});
if(!response.ok)throw Error('REDS BLOCKED: legacy D1 workflow status unreadable (HTTP '+response.status+')');
const workflow=await response.json();
if(workflow.path!=='.github/workflows/provision-rebuild-d1.yml')
  throw Error('REDS BLOCKED: legacy D1 workflow identity mismatch');
if(!['disabled_manually','disabled_inactivity'].includes(workflow.state))
  throw Error('REDS BLOCKED: legacy D1 workflow is not disabled (state '+String(workflow.state)+')');
console.log('REDS RETIRED CREDENTIALS PASS: repository/global Worker and D1 deployment secrets absent; legacy D1 workflow '+workflow.state);
