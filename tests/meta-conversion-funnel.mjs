import assert from 'node:assert/strict';
import fs from 'node:fs';
import {onRequest as shopFlow} from '../api/shop-flow-v4.js';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const pixel=read('shared/meta-pixel-v1.js');
const plaque=read('plaque/index.html');
const tumbler=read('tumbler/index.html');
const tumblerRuntime=read('tumbler/tumbler-order.js');
const shop=read('shop/index.html');
const shopCore=read('shop/shop-core-v1.js');
const shopV3=read('api/shop-flow-v3.js');
const shopV4=read('api/shop-flow-v4.js');

assert.match(pixel,/2273189430133124/);
for(const [label,html] of [['Plaque',plaque],['Tumbler',tumbler],['Shop',shop]]){
  assert.match(html,/shared\/meta-pixel-v1\.js\?v=1/,label+' must load the shared Meta pixel');
}
for(const event of ['ViewContent','AddToCart','InitiateCheckout'])assert.match(tumblerRuntime,new RegExp(event),'Tumbler missing '+event);
for(const event of ['ViewContent','AddToCart','InitiateCheckout','Purchase'])assert.match(shopCore,new RegExp(event),'Shop missing '+event);
assert.match(shopCore,/reqoo_meta_purchase_/,'Purchase tracking must be browser-deduplicated by order');
assert.match(shopV4,/amount_minor/);
assert.match(shopV4,/url\.searchParams\.set\('value'/);
assert.match(shopV4,/url\.searchParams\.set\('currency'/);
assert.match(shopV3,/const source=S\(d\.source\|\|'shop'\)/);
assert.match(tumblerRuntime,/orderSource\(\)/);
assert.match(tumblerRuntime,/utm_campaign/);

function db(row){
  return {prepare(){return {bind(){return this},async first(){return row}}}};
}
let response=await shopFlow({
  request:new Request('https://api.reqoo.co/api/shop?action=toyyibpayRedirect&order_id=RQ-E2E'),
  env:{DB:db({status:'paid',amount_minor:2590,order_no:'RQ-E2E',currency:'MYR'})}
});
assert.equal(response.status,302);
let location=new URL(response.headers.get('location'));
assert.equal(location.hostname,'shop.reqoo.co');
assert.equal(location.searchParams.get('payment'),'success');
assert.equal(location.searchParams.get('order'),'RQ-E2E');
assert.equal(location.searchParams.get('value'),'25.90');
assert.equal(location.searchParams.get('currency'),'MYR');

response=await shopFlow({
  request:new Request('https://api.reqoo.co/api/shop?action=toyyibpayRedirect&order_id=RQ-PENDING'),
  env:{DB:db({status:'pending',amount_minor:2590,order_no:'RQ-PENDING',currency:'MYR'})}
});
location=new URL(response.headers.get('location'));
assert.equal(location.searchParams.get('payment'),'pending');
assert.equal(location.searchParams.has('value'),false);
assert.equal(location.searchParams.has('currency'),false);

console.log('PASS: Plaque, Tumbler and Shop share Meta Pixel; funnel events are wired; verified ToyyibPay returns carry paid value for deduplicated Purchase tracking.');
