// Static guard for REDS deploy surfaces. Prevent accidental second release
// workflow from entering the repository after a tool-generated update.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const dir='.github/workflows';
const workflows=fs.readdirSync(dir).filter(x=>/\.ya?ml$/.test(x));
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const live=read('deploy.yml'),draft=read('cad-live-verification.yml'),pr=read('cad-pr-validation.yml'),retired=read('deploy-web-simple.yml');
const rule=JSON.parse(fs.readFileSync('cad-source/release-policy.json','utf8'));
assert.equal(rule.live.branch,'main');
assert.equal(rule.draft.branch,'reds/draft');
assert.match(live,/^\s+branches: \[main\]\s*$/m);
assert.doesNotMatch(live,/^\s+workflow_dispatch:/m,'Production workflow must never be manually dispatchable');
const deployment=live.split(/^  deploy:\s*$/m)[1]||'';
assert.match(live,/^\s+run: node scripts\/reds-release-gate\.mjs check-live-source\s*$/m);
assert.match(deployment,/^\s+needs: preflight\s*$/m);
assert.match(deployment,/^\s+run: node scripts\/reds-release-gate\.mjs check-live\s*$/m,'Deploy must verify owner approval, not just source');
assert.ok(deployment.indexOf('check-live')<deployment.indexOf('d1 migrations apply'));
assert.doesNotMatch(live.split(/^  deploy:\s*$/m)[0],/secrets\.|CLOUDFLARE_API_TOKEN|wrangler.*(?:deploy|migrations apply)/,'Preflight must not receive deployment credentials or mutate resources');
assert.match(live,/environment: reds-live/);
assert.match(deployment,/run: node scripts\/reds-live-credential-audit\.mjs/,'Owner-approved Live release must verify credential separation');
assert.ok(deployment.indexOf('reds-live-credential-audit.mjs')<deployment.indexOf('d1 migrations apply'),'Token isolation check must precede any production mutation');
// Remote D1 migrations must use their own environment-scoped credential,
// never the restricted Workers deployment token.
const migrationStep=live.match(/      - name: Apply D1 migrations\n([\s\S]*?)(?=\n      - name: |$)/)?.[1]||'';
assert.ok(migrationStep,'D1 migration step is required');
assert.ok(migrationStep.includes('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_D1_API_TOKEN }}'),'D1 migrations must use isolated D1 secret');
assert.match(migrationStep,/wrangler d1 migrations apply reqoo-rebuild --remote/);
for(const stepName of ['Deploy API Worker','Deploy Web Worker']){
 const step=live.split('      - name: '+stepName+'\n')[1]?.split('\n      - name: ')[0]||'';
 assert.ok(step.includes('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}'),stepName+' must use Workers-only credential');
 assert.doesNotMatch(step,/CLOUDFLARE_D1_API_TOKEN/,stepName+' must not receive D1 credential');
}
assert.match(live,/npx --no-install wrangler deploy --config wrangler-web\.toml/);
assert.ok(live.indexOf('check-live')<live.indexOf('d1 migrations apply'),'Release gate must precede migrations');
assert.ok(live.indexOf('check-live')<live.indexOf('wrangler deploy --config wrangler-web.toml'),'Release gate must precede Worker production');
assert.match(draft,/^\s+branches: \[reds\/draft\]\s*$/m);
assert.match(draft,/environment: reds-draft/);
assert.match(draft,/node scripts\/reds-release-gate\.mjs check-draft/);
assert.match(draft,/node \.\.\/scripts\/reds-draft-deploy\.mjs/);

// Every Draft release-candidate SHA must be eligible for deployed-browser and
// integrated QA, including changes to security gates and CI workflows.
const integrated=read('reds-draft-integrated-qa.yml');
for(const pattern of ["'cad-source/**'","'scripts/reds-*'","'.github/workflows/reds-draft-integrated-qa.yml'"]){
 assert.ok(integrated.includes(pattern),'Integrated QA must trigger for '+pattern);
}
for(const pattern of ["'cad-source/**'","'scripts/reds-*'","'.github/workflows/reds-draft-integrated-qa.yml'","'.github/workflows/r3ds-large-assembly-qa.yml'"]){
 assert.ok(draft.includes(pattern),'Deployed Draft browser QA must trigger for '+pattern);
}

assert.doesNotMatch(draft,/wrangler.*deploy --config wrangler\.draft\.jsonc/);
assert.doesNotMatch(draft,/wrangler\.preview\.jsonc|wrangler\.sketch-preview\.jsonc/);
assert.match(pr,/node scripts\/reds-release-gate\.mjs check-pr/);
assert.match(pr,/node scripts\/reds-release-gate\.test\.mjs/);
assert.match(pr,/suite: \[core, modeling, product\]/);
assert.match(retired,/Legacy workflow intentionally disabled/);
assert.doesNotMatch(retired,/^\s+branches:/m,'Legacy production branch must have no push trigger');
const cfg=JSON.parse(fs.readFileSync('cad-source/wrangler.draft.jsonc','utf8'));
assert.equal(cfg.name,'reqoo-reds-draft');
const forbidden=[];
for(const file of workflows){
 const data=read(file);
 if(file==='reds-credential-retirement-audit.yml'){
  // This audit may inspect ONLY the boolean presence of legacy secrets. It
  // cannot receive their values, use an environment, or invoke a publisher.
  const allowedWorker=/REPO_WORKER_SECRET_PRESENT:\s*\$\{\{\s*secrets\.CLOUDFLARE_API_TOKEN\s*!=\s*''\s*\}\}/;
  const allowedD1=/REPO_D1_SECRET_PRESENT:\s*\$\{\{\s*secrets\.CLOUDFLARE_D1_API_TOKEN\s*!=\s*''\s*\}\}/;
  assert.match(data,allowedWorker,'Retirement audit must compare only the existence of the shared Worker secret');
  assert.match(data,allowedD1,'Retirement audit must compare only the existence of the shared D1 secret');
  const scrubbed=data.replace(allowedWorker,'').replace(allowedD1,'');
  assert.doesNotMatch(scrubbed,/secrets\.CLOUDFLARE_(?:API|D1_API)_TOKEN/,'Retirement audit must never pass secret values');
  assert.doesNotMatch(data,/^\s+environment:|wrangler.*deploy|\bdeploy-worker\b/m,'Retirement audit must never deploy or use an environment');
 }else if(!['deploy.yml','cad-live-verification.yml'].includes(file)&&/secrets\.CLOUDFLARE_API_TOKEN/.test(data))forbidden.push(file+': shared Cloudflare credential outside canonical environments');
 if(file!=='deploy.yml'&&/^\s*(?:npx\s+[^\n]*\s+)?wrangler\s+deploy\s+--config\s+wrangler-web\.toml\s*$/m.test(data))forbidden.push(file+': production worker');
 if(file!=='deploy-web-simple.yml'&&/^\s*command:\s*deploy\s+--config\s+wrangler-web\.toml\s*$/m.test(data))forbidden.push(file+': Cloudflare action');
 if(file!=='cad-live-verification.yml'&&/^\s*(?:npx\s+[^\n]*\s+)?wrangler(?:@[\d.]+)?\s+deploy\s+--config\s+wrangler\.(?:preview|sketch-preview|draft)\.jsonc\s*$/m.test(data))forbidden.push(file+': independent CAD preview');
}
const provision=read('provision-rebuild-d1.yml');
assert.match(provision,/Legacy D1 provisioning \(retired\)/);
assert.doesNotMatch(provision,/^\s+branches:|secrets\.|wrangler\s+d1/m,'Legacy provisioning must not retain remote database credentials or commands');
assert.deepEqual(forbidden,[],'Unauthorized REDS deploy workflows found');
console.log('REDS DEPLOY SURFACE PASS: main Live only, reds/draft only, no manual production release, no second deploy workflow');
