import fs from 'node:fs';
import assert from 'node:assert/strict';
const w=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
const route=w.slice(w.indexOf("if((host==='admin.reqoo.co'||host==='reqoo.co')&&/^\\/shop\\/admin"));
assert.ok(route.includes('return injectShopAdminSafe(response)'));
assert.ok(!route.slice(0,route.indexOf("if(host==='admin.reqoo.co'&&")).includes('return injectAdminUI(response)'));
console.log('PASS: unified injector is blocked on legacy Shop Admin route');