import fs from 'node:fs';
import assert from 'node:assert/strict';

const worker=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../shop/admin-fulfillment-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../admin/shop-fulfillment-v1.css',import.meta.url),'utf8');
assert.match(worker,/admin-fulfillment-v1\.js/,'Shop Admin must inject fulfillment runtime');
assert.match(worker,/shop-fulfillment-v1\.css/,'Shop Admin must inject fulfillment styling');
assert.match(runtime,/action:'status'/,'fulfillment runtime must use guarded admin status endpoint');
assert.match(runtime,/processing/,'processing transition must be available');
assert.match(runtime,/fulfilled/,'fulfilled transition must be available');
assert.match(runtime,/Sahkan bayaran dahulu/,'unpaid orders must not expose fulfillment progression');
assert.match(css,/rqFulfillmentDone/,'completed fulfillment state must be styled');
console.log('PASS: Shop Admin fulfillment workflow wiring and guards are present.');
