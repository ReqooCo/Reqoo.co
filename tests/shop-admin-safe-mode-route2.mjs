import fs from 'node:fs';
import assert from 'node:assert/strict';
const worker=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
assert.ok(worker.includes("return injectShopAdminSafe(response);if(host==='admin.reqoo.co'"),'Shop Admin route must return isolated safe mode before Admin routes');
console.log('PASS: Shop Admin route uses isolated safe mode.');