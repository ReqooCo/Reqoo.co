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
assert.match(live,/node scripts\/reds-release-gate\.mjs check-live/);
assert.match(live,/environment: reds-live/);
assert.match(live,/npx --no-install wrangler deploy --config wrangler-web\.toml/);
assert.ok(live.indexOf('check-live')<live.indexOf('d1 migrations apply'),'Release gate must precede migrations');
assert.ok(live.indexOf('check-live')<live.indexOf('wrangler deploy --config wrangler-web.toml'),'Release gate must precede Worker production');
assert.match(draft,/^\s+branches: \[reds\/draft\]\s*$/m);
assert.match(draft,/environment: reds-draft/);
assert.match(draft,/node scripts\/reds-release-gate\.mjs check-draft/);
assert.match(draft,/wrangler deploy --config wrangler\.draft\.jsonc/);
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
 if(file!=='deploy.yml'&&/^\s*(?:npx\s+[^\n]*\s+)?wrangler\s+deploy\s+--config\s+wrangler-web\.toml\s*$/m.test(data))forbidden.push(file+': production worker');
 if(file!=='deploy-web-simple.yml'&&/^\s*command:\s*deploy\s+--config\s+wrangler-web\.toml\s*$/m.test(data))forbidden.push(file+': Cloudflare action');
 if(file!=='cad-live-verification.yml'&&/^\s*(?:npx\s+[^\n]*\s+)?wrangler(?:@[\d.]+)?\s+deploy\s+--config\s+wrangler\.(?:preview|sketch-preview|draft)\.jsonc\s*$/m.test(data))forbidden.push(file+': independent CAD preview');
}
assert.deepEqual(forbidden,[],'Unauthorized REDS deploy workflows found');
console.log('REDS DEPLOY SURFACE PASS: main Live only, reds/draft only, no manual production release, no second deploy workflow');
