// Only the canonical Draft Actions job may publish. Version deployment preserves
// existing routes and avoids Wrangler deploy's account-wide subdomain lookup.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export async function deployDraft({env=process.env,fetcher=fetch,run=execFileSync,config=JSON.parse(fs.readFileSync('wrangler.draft.jsonc','utf8'))}={}) {
  assert.equal(env.GITHUB_ACTIONS,'true');
  assert.equal(env.GITHUB_REPOSITORY,'ReqooCo/Reqoo.co');
  assert.equal(env.GITHUB_REF,'refs/heads/reds/draft');
  assert.equal(env.GITHUB_EVENT_NAME,'push');
  assert.equal(config.name,'reqoo-reds-draft');
  assert.ok(env.CLOUDFLARE_API_TOKEN && /^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID));
  const base=`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/reqoo-reds-draft`;
  const api=async(suffix,method='GET',body)=>{
    const response=await fetcher(base+suffix,{method,headers:{Authorization:`Bearer ${env.CLOUDFLARE_API_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();
    assert.ok(response.ok && data.success,`Draft API ${method} ${suffix} failed (${response.status})`);
    return data.result;
  };
  // Keep exactly one public Draft URL; no per-version preview URLs.
  await api('/subdomain','POST',{enabled:true,previews_enabled:false});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'reds-draft-version-'));
  try {
    const output=path.join(dir,'upload.jsonl');
    const commandEnv={...env,WRANGLER_OUTPUT_FILE_PATH:output};
    run('npx',['--yes','wrangler@4.129.0','versions','upload','--config','wrangler.draft.jsonc'],{stdio:'inherit',env:commandEnv});
    const entries=fs.readFileSync(output,'utf8').trim().split('\n').map(line=>JSON.parse(line)).filter(x=>x.type==='version-upload');
    assert.equal(entries.length,1,'Expected exactly one uploaded version');
    const id=entries[0].version_id;
    assert.match(id,/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
    run('npx',['--yes','wrangler@4.129.0','versions','deploy',`${id}@100`,'--yes','--config','wrangler.draft.jsonc'],{stdio:'inherit',env:commandEnv});
    const deployments=await api('/deployments');
    assert.ok(deployments.deployments?.[0]?.versions?.some(v=>v.version_id===id && v.percentage===100),'Uploaded version must receive 100% of Draft traffic');
    const subdomain=await api('/subdomain');
    assert.equal(subdomain.enabled,true);
    assert.equal(subdomain.previews_enabled,false);
    console.log(`Canonical Draft version verified: ${id}`);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)await deployDraft();
