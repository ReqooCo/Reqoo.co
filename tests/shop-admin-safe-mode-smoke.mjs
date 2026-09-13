import fs from 'node:fs';
import assert from 'node:assert/strict';
const w=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
assert.ok(w.includes("headers.set('x-reqoo-admin-ui','shop-admin-safe-mode-v1')"));
assert.ok(w.includes('return injectShopAdminSafe(response)'));
console.log('PASS: safe mode restored');