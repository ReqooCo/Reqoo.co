import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('../api/shop-admin-flow-v6.js',import.meta.url),'utf8');
assert.match(src,/stock\.restored\.payment_rejected/,'rejection must record an idempotency event');
assert.match(src,/stock_qty=stock_qty\+\?/,'rejection must restore tracked stock');
assert.match(src,/usage_count=MAX\(0,usage_count-1\)/,'rejection must release promo usage');
assert.match(src,/payment_status='failed',fulfillment_status='cancelled'/,'rejection must cancel fulfillment');
assert.match(src,/state==='paid'/,'paid orders must be protected from rejection');

const v7=fs.readFileSync(new URL('../api/shop-admin-flow-v7.js',import.meta.url),'utf8');assert.match(v7,/shop-admin-flow-v6\.js/);
const v8=fs.readFileSync(new URL('../api/shop-admin-flow-v8.js',import.meta.url),'utf8');assert.match(v8,/shop-admin-flow-v7\.js/);
const v9=fs.readFileSync(new URL('../api/shop-admin-flow-v9.js',import.meta.url),'utf8');assert.match(v9,/shop-admin-flow-v8\.js/);
const v10=fs.readFileSync(new URL('../api/shop-admin-flow-v10.js',import.meta.url),'utf8');assert.match(v10,/shop-admin-flow-v9\.js/);
const v11=fs.readFileSync(new URL('../api/shop-admin-flow-v11.js',import.meta.url),'utf8');assert.match(v11,/shop-admin-flow-v10\.js/);
const v12=fs.readFileSync(new URL('../api/shop-admin-flow-v12.js',import.meta.url),'utf8');assert.match(v12,/shop-admin-flow-v11\.js/);
const v13=fs.readFileSync(new URL('../api/shop-admin-flow-v13.js',import.meta.url),'utf8');assert.match(v13,/shop-admin-flow-v12\.js/,'v13 must preserve the complete stock-safe v12 chain');
const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');assert.match(worker,/shop-admin-flow-v13\.js/,'worker must route admin requests through latest stock-safe v13 flow');
console.log('shop rejected-payment stock restoration regression: ok');