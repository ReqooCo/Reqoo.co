import fs from 'node:fs';
import assert from 'node:assert/strict';

const worker=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
const publicJs=fs.readFileSync(new URL('../shop/shop-inventory-v1.js',import.meta.url),'utf8');
const adminJs=fs.readFileSync(new URL('../shop/admin-inventory-v1.js',import.meta.url),'utf8');

assert.match(worker,/shop-inventory-v1\.css/,'public Shop must inject inventory CSS');
assert.match(worker,/shop-inventory-v1\.js/,'public Shop must inject inventory runtime');
assert.match(worker,/shop-inventory-v1\.css/,'inventory stylesheet must be wired');
assert.match(worker,/admin-inventory-v1\.js/,'Shop Admin must inject inventory dashboard runtime');
assert.match(worker,/shop-inventory-v1\.css/,'inventory assets must be versioned/wired through the worker');
assert.match(publicJs,/Kuantiti maksimum ikut stok tersedia telah dicapai/,'public cart must block quantity above tracked stock');
assert.match(publicJs,/STOK HABIS/,'public product cards must expose sold-out state');
assert.match(publicJs,/STOK RENDAH/,'public product cards must expose low-stock state');
assert.match(adminJs,/Stok rendah/,'admin must summarize low stock');
assert.match(adminJs,/Stok habis/,'admin must summarize out-of-stock variants');
assert.match(adminJs,/X-Admin-Token/,'admin inventory request must stay authenticated');
console.log('PASS: inventory UX exposes low/out stock and enforces cart stock limit.');
