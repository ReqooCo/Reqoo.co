import fs from 'node:fs';
import assert from 'node:assert/strict';
const worker=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
assert.match(worker,/\^\\\/shop\\\/admin\\\.html\$\/i\.test\(url\.pathname\)/,'Shop Admin route must remain explicit');
assert.match(worker,/return injectShopAdminSafe\(response\)/,'Shop Admin route must use isolated safe injector');
console.log('PASS: Shop Admin route remains on isolated safe mode.');