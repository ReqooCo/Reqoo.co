const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const variants=[{id:'sold',name:'Sold',price:10,stock:0},{id:'blue',name:'Blue',price:20,stock:3,image:'/blue.jpg'},{id:'plain',name:'Plain',price:5,stock:null}];
    await page.route('http://reqoo.test/**',route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/api/shop') return route.fulfill({json:{products:[{id:'p',name:'Tumbler',image:'/product.jpg',variants}]}});
      if(url.pathname.endsWith('.jpg')) return route.fulfill({status:204});
      return route.fulfill({contentType:'text/html',body:fs.readFileSync('shop/index.html','utf8').replace('</body>','<script>'+fs.readFileSync('shop/shop-core-v1.js','utf8')+'</script></body>')});
    });
    await page.goto('http://reqoo.test/');
    await page.locator('[data-product="p"]').click();
    assert.equal(await page.locator('#variantSelect').inputValue(),'1');
    assert.equal(await page.locator('#detailPrice').textContent(),'RM20.00');
    await page.locator('#detailQty').fill('99');
    assert.equal(await page.locator('#detailQty').inputValue(),'3');
    assert.equal(await page.locator('#detailTotal').textContent(),'RM60.00');
    await page.locator('#detailQty').fill('2.5');
    assert.equal(await page.locator('#detailQty').inputValue(),'2');
    assert.equal(await page.locator('#detailTotal').textContent(),'RM40.00');
    await page.locator('#variantSelect').selectOption('2');
    assert.equal(await page.locator('#detailQty').getAttribute('max'),null);
    assert.equal(await page.locator('#detailImage').getAttribute('src'),'/product.jpg');
    await page.locator('#detailQty').fill('0');
    assert.equal(await page.locator('#detailQty').inputValue(),'1');
    await page.locator('#addToCart').click();
    const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('reqoo_shop_cart_v4')));
    assert.equal(cart[0].variantId,'plain');assert.equal(cart[0].q,1);assert.equal(cart[0].unitPrice,5);
    assert.deepEqual(errors,[]);
    console.log('PASS: available variant, stock clamp, matching totals, integer quantity, image reset, unlimited stock and persisted cart (mobile browser).');
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
