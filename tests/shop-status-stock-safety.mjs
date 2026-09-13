import fs from 'node:fs';
import assert from 'node:assert/strict';

const flow=fs.readFileSync(new URL('../api/shop-admin-flow-v7.js',import.meta.url),'utf8');
assert.match(flow,/action==='status'/,'status action must be intercepted');
assert.match(flow,/status==='failed'\|\|status==='cancelled'/,'failed and cancelled status must use safe path');
assert.match(flow,/action:'rejectPayment'/,'unsafe status change must delegate to rejectPayment');
assert.match(flow,/payment_status\)\.toLowerCase\(\)==='paid'/,'paid orders must be protected');

const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');
assert.match(worker,/shop-admin-flow-v7\.js/,'worker must route Shop admin through v7');
console.log('shop status stock safety regression: ok');
