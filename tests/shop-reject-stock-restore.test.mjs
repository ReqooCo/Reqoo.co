import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('../api/shop-admin-flow-v6.js',import.meta.url),'utf8');
assert.match(src,/stock\.restored\.payment_rejected/,'rejection must record an idempotency event');
assert.match(src,/stock_qty=stock_qty\+\?/,'rejection must restore tracked stock');
assert.match(src,/usage_count=MAX\(0,usage_count-1\)/,'rejection must release promo usage');
assert.match(src,/payment_status='failed',fulfillment_status='cancelled'/,'rejection must cancel fulfillment');
assert.match(src,/state==='paid'/,'paid orders must be protected from rejection');
const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');
assert.match(worker,/shop-admin-flow-v6\.js/,'worker must route admin requests through v6');
console.log('shop rejected-payment stock restoration regression: ok');
