import fs from 'node:fs';
import assert from 'node:assert/strict';

const flow=fs.readFileSync(new URL('../api/shop-admin-flow-v7.js',import.meta.url),'utf8');
assert.match(flow,/action==='status'/);assert.match(flow,/status==='failed'\|\|status==='cancelled'/);assert.match(flow,/action:'rejectPayment'/);assert.match(flow,/payment_status\)\.toLowerCase\(\)==='paid'/);
const v8=fs.readFileSync(new URL('../api/shop-admin-flow-v8.js',import.meta.url),'utf8');assert.match(v8,/shop-admin-flow-v7\.js/);
const v9=fs.readFileSync(new URL('../api/shop-admin-flow-v9.js',import.meta.url),'utf8');assert.match(v9,/shop-admin-flow-v8\.js/);assert.match(v9,/status==='processing'\|\|status==='fulfilled'/);
const v10=fs.readFileSync(new URL('../api/shop-admin-flow-v10.js',import.meta.url),'utf8');assert.match(v10,/shop-admin-flow-v9\.js/);assert.match(v10,/fulfillment_status,updated_at FROM orders/);
const v11=fs.readFileSync(new URL('../api/shop-admin-flow-v11.js',import.meta.url),'utf8');assert.match(v11,/shop-admin-flow-v10\.js/);
const v12=fs.readFileSync(new URL('../api/shop-admin-flow-v12.js',import.meta.url),'utf8');assert.match(v12,/shop-admin-flow-v11\.js/);
const v13=fs.readFileSync(new URL('../api/shop-admin-flow-v13.js',import.meta.url),'utf8');assert.match(v13,/shop-admin-flow-v12\.js/,'v13 must preserve v12 and every prior safety layer');
const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');assert.match(worker,/shop-admin-flow-v13\.js/,'worker must route Shop admin through v13');
console.log('shop status stock safety regression: ok');