import fs from 'node:fs';
import assert from 'node:assert/strict';

const flow=fs.readFileSync(new URL('../api/shop-flow-v4.js',import.meta.url),'utf8');
assert.match(flow,/X-Reqoo-Customer-Token/,'customer token header must be supported');
assert.match(flow,/action==='customerSession'/,'customer session action must exist');
assert.match(flow,/action==='customerOrders'/,'customer order history must be intercepted');
assert.match(flow,/action==='getOrder'/,'single-order reads must be intercepted');
assert.match(flow,/verifyToken\(request,env\)/,'customer reads must verify the signed token');
assert.match(flow,/o\.customer_id=\?/,'single-order reads must be scoped to the authenticated customer');
assert.doesNotMatch(flow,/metadata_json FROM payments/,'public authenticated order response must not expose payment metadata');

const gallery=fs.readFileSync(new URL('../api/shop-flow-v5.js',import.meta.url),'utf8');
assert.match(gallery,/from '.\/shop-flow-v4\.js'/,'gallery flow must preserve customer auth v4 as its fallback');
assert.match(gallery,/listProductImages/,'gallery flow must expose active product media');
assert.match(gallery,/product\.status!=='active'/,'gallery endpoint must not expose hidden product media');

const account=fs.readFileSync(new URL('../shop/account.html',import.meta.url),'utf8');
assert.match(account,/loginOrder/,'account login must request an order reference');
assert.match(account,/customerSession/,'account login must exchange credentials for a signed session');
assert.match(account,/X-Reqoo-Customer-Token/,'account order reads must send the signed customer token');

const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');
assert.match(worker,/shop-flow-v5\.js/,'worker must route Shop API through gallery v5');
console.log('shop customer auth regression: ok');
