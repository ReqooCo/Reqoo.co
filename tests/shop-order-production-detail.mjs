import fs from 'node:fs';
import assert from 'node:assert/strict';

const worker=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../shop/admin-order-production-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../admin/shop-order-production-v1.css',import.meta.url),'utf8');
const v11=fs.readFileSync(new URL('../api/shop-admin-flow-v11.js',import.meta.url),'utf8');

assert.match(worker,/shop-order-production-v1\.css\?v=1/,'production detail stylesheet must be injected');
assert.match(worker,/admin-order-production-v1\.js\?v=1/,'production detail runtime must be injected');
assert.match(runtime,/customization_snapshot_json/,'production detail must read saved customization data');
assert.match(runtime,/TEKS \/ NAMA/,'customer personalization text must be visible');
assert.match(runtime,/NOTA CUSTOMER/,'customer note must be visible');
assert.match(runtime,/Lihat Artwork Customer/,'customer artwork action must be visible');
assert.match(runtime,/status:'fulfilled'|Tanda Siap/,'production card must support finishing an order');
assert.match(runtime,/window\.currentOrder=o/,'production detail must expose current order for existing fulfillment helpers');
assert.match(v11,/action\)==='artwork'/,'v11 must expose authenticated artwork reads');
assert.match(v11,/startsWith\('shop\/artwork\/'\)/,'artwork access must be restricted to the artwork R2 prefix');
assert.match(v11,/X-Admin-Token/,'artwork access must remain admin authenticated');
assert.match(css,/\.rqProductionDetail/,'production detail card must be styled');
console.log('PASS: Shop order production detail, customization and secure artwork wiring are present.');
