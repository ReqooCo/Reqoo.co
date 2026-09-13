const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{value:id==='#detailQty'?'1':'',textContent:'',style:{},dataset:{},files:[],classList:{add(){},remove(){},contains(){return true}},addEventListener(type,fn){this[type]=fn},removeAttribute(key){delete this[key]},querySelector:element,querySelectorAll(){return []}});return elements.get(id)}
const context={document:{documentElement:{},readyState:'loading',getElementById:element,querySelectorAll:()=>[],addEventListener(){}},MutationObserver:class{observe(){}disconnect(){}},setTimeout(){},location:{href:'https://shop.reqoo.co/'},URL,console};
vm.createContext(context);
let source=fs.readFileSync('shop/shop-core-v1.js','utf8');
source=source.replace('function boot(){','globalThis.setup=p=>{products=[p];openProduct(p.id)};function boot(){');
vm.runInContext(source,context);
context.setup({id:'p',name:'Tumbler',category:'Gift',image:'/product.jpg',variants:[{name:'Sold',price:10,stock:0},{name:'Blue',price:20,stock:3,image:'/blue.jpg'},{name:'Plain',price:5,stock:null}]});
assert.match(element('modal').innerHTML,/value="1" selected/);
assert.equal(element('#detailPrice').textContent,'RM20.00');
const qty=element('#detailQty');
for(const [input,quantity,total] of [['99','3','RM60.00'],['2.5','2','RM40.00'],['0','1','RM20.00'],['Infinity','1','RM20.00']]){qty.value=input;qty.oninput();assert.equal(qty.value,quantity);assert.equal(element('#detailTotal').textContent,total)}
element('#variantSelect').change({target:{value:'2'}});
assert.equal(qty.max,undefined);assert.equal(element('#detailImage').src,'/product.jpg');
console.log('PASS: selects stocked variant, clamps quantity, totals match, rejects fractions/nonfinite values and resets image/max on variation change.');
