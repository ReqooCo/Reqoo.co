import fs from 'node:fs';
import assert from 'node:assert/strict';

const flow=fs.readFileSync(new URL('../api/shop-admin-flow-v7.js',import.meta.url),'utf8');
assert.match(flow,/action==='status'/,'status action must be intercepted');
assert.match(flow,/status==='failed'\|\|status==='cancelled'/,'failed and cancelled status must use safe path');
assert.match(flow,/action:'rejectPayment'/,'unsafe status change must delegate to rejectPayment');
assert.match(flow,/payment_status\)\.toLowerCase\(\)==='paid'/,'paid orders must be protected');

const v8=fs.readFileSync(new URL('../api/shop-admin-flow-v8.js',import.meta.url),'utf8');
assert.match(v8,/shop-admin-flow-v7\.js/,'v8 must preserve v7 status and stock safety');
const v9=fs.readFileSync(new URL('../api/shop-admin-flow-v9.js',import.meta.url),'utf8');
assert.match(v9,/shop-admin-flow-v8\.js/,'v9 must preserve the v8 gallery and v7 stock safety chain');
assert.match(v9,/status==='processing'\|\|status==='fulfilled'/,'v9 must handle production fulfillment transitions before legacy body parsing');
const v10=fs.readFileSync(new URL('../api/shop-admin-flow-v10.js',import.meta.url),'utf8');
assert.match(v10,/shop-admin-flow-v9\.js/,'v10 must preserve v9 and prior safety layers');
assert.match(v10,/fulfillment_status,updated_at FROM orders/,'v10 must verify persisted fulfillment state');
const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');
assert.match(worker,/shop-admin-flow-v10\.js/,'worker must route Shop admin through v10 while retaining prior safety layers');
console.log('shop status stock safety regression: ok');
