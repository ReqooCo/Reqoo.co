const {JSDOM}=require('jsdom');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 for(const [variant,qty,expected,disabled] of [['v','2','2',false],['v','999','3',false],['sold','1','1',true]]){
  const dom=new JSDOM(fs.readFileSync('shop/index.html','utf8'),{url:`https://shop.reqoo.co/?product=p&variant=${variant}&qty=${qty}`,runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document;let writes=0;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.fetch=async(url,init)=>{if(init?.method==='POST')writes++;return {ok:true,json:async()=>String(url).includes('listProducts')?{ok:true,products:[{id:'p',name:'Tumbler',variants:[{id:'v',name:'Hitam',price:28,stock:3},{id:'sold',name:'Putih',price:28,stock:0}]}]}:{ok:true,images:[]}}};
  w.eval(fs.readFileSync('shop/shop-core-v1.js','utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,35));
  assert.equal(d.getElementById('detailQty').value,expected);assert.equal(d.getElementById('variantSelect').value,variant==='sold'?'1':'0');assert.equal(d.getElementById('addToCart').disabled,disabled);assert.equal(writes,0);assert.equal(w.localStorage.getItem('reqoo_shop_cart_v4'),null);dom.window.close();
 }
 console.log('PASS: agent selection opens correct variant, clamps stock/quantity, blocks sold-out and never adds to cart or creates an order automatically.');
})().catch(e=>{console.error(e);process.exitCode=1});
