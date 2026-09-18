import assert from 'node:assert/strict';

const TIMEOUT_MS=20000;
const ua='REQOO production smoke/1.0';

async function request(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const response=await fetch(url,{redirect:'follow',headers:{'user-agent':ua,'cache-control':'no-cache'},signal:controller.signal});
    const text=await response.text();
    return {response,text};
  }catch(error){
    throw new Error(`Request failed for ${url}: ${error?.message||error}`);
  }finally{
    clearTimeout(timer);
  }
}

async function html(name,url,patterns,{adminUi=false,shopRuntime=false}={}){
  const {response,text}=await request(url);
  assert.equal(response.status,200,`${name}: expected HTTP 200, got ${response.status}`);
  assert.match(response.headers.get('content-type')||'',/text\/html/i,`${name}: expected HTML content type`);
  for(const pattern of patterns)assert.match(text,pattern,`${name}: missing ${pattern}`);
  if(adminUi){
    assert.equal(response.headers.get('x-reqoo-admin-ui'),'admin-ui-v1',`${name}: Admin UI header drift`);
    assert.match(text,/\/admin\/admin-base\.css\?v=\d+/,`${name}: shared base CSS missing`);
    assert.match(text,/\/admin\/admin-flow\.css\?v=\d+/,`${name}: shared flow CSS missing`);
    assert.match(text,/\/admin\/admin-shell\.js\?v=\d+/,`${name}: shared shell JS missing`);
  }
  if(shopRuntime)assert.match(response.headers.get('x-reqoo-shop-runtime')||'',/shop-v2/,`${name}: Shop runtime header missing`);
  console.log(`PASS ${name} ${response.status} ${response.url}`);
  return {response,text};
}

async function json(url,expectedStatus=200){
  const {response,text}=await request(url);
  assert.equal(response.status,expectedStatus,`${url}: expected HTTP ${expectedStatus}, got ${response.status}: ${text.slice(0,180)}`);
  let value;
  try{value=JSON.parse(text)}catch{throw new Error(`${url}: expected JSON, got ${text.slice(0,180)}`)}
  return {response,value};
}

await html('Admin Overview','https://reqoo.co/admin/',[/Business Command Center/,/\/admin\/overview\.js\?v=\d+/],{adminUi:true});
await html('Admin Subdomain','https://admin.reqoo.co/',[/Business Command Center/,/\/admin\/overview\.js\?v=\d+/],{adminUi:true});

for(const [name,path,asset] of [
  ['Orders','orders','orders'],
  ['Production','production','production'],
  ['Products','products','products'],
  ['Documents','documents','documents'],
  ['Customers','customers','customers'],
  ['Finance','finance','finance']
]){
  await html(`Admin ${name}`,`https://reqoo.co/admin/${path}.html`,[new RegExp(`\\/admin\\/${asset}\\.js\\?v=\\d+`)],{adminUi:true});
}

await html('Shop','https://reqoo.co/shop/',[/REQOO\.CO — Shop/,/\/shop\/shop-core-v1\.js\?v=\d+/],{shopRuntime:true});
await html('Plaque','https://reqoo.co/plaque/',[/Plaque Custom Premium/,/\/plaque\/plaque\.css\?v=\d+/,/\/plaque\/plaque-store\.js\?v=\d+/]);
await html('Tumbler','https://reqoo.co/tumbler/',[/tumbler/i,/\/tumbler\/tumbler\.css\?v=\d+/,/\/tumbler\/tumbler-order\.js\?v=\d+/]);

for(const base of ['https://api.reqoo.co','https://reqoo.co']){
  const health=await json(`${base}/api/shop?action=health`);
  assert.equal(health.value?.ok,true,`${base}: Shop health not ok`);

  const products=await json(`${base}/api/shop?action=listProducts`);
  assert.equal(products.value?.ok,true,`${base}: listProducts not ok`);
  assert.ok(Array.isArray(products.value?.products),`${base}: products must be an array`);
  assert.ok(products.value.products.length>0,`${base}: production Shop has zero active products`);

  const shipping=await json(`${base}/api/shop?action=getShipping`);
  assert.equal(shipping.value?.ok,true,`${base}: getShipping not ok`);
  assert.ok(Array.isArray(shipping.value?.shipping),`${base}: shipping must be an array`);
}

for(const url of [
  'https://api.reqoo.co/api/shop-admin?action=dashboardSummary',
  'https://reqoo.co/api/shop-admin?action=dashboardSummary',
  'https://admin.reqoo.co/api/shop-admin?action=dashboardSummary'
]){
  const {response,text}=await request(url);
  assert.equal(response.status,401,`${url}: unauthenticated Admin API must return 401, got ${response.status}`);
  const value=JSON.parse(text);
  assert.equal(value?.ok,false,`${url}: unauthenticated Admin API must not return ok=true`);
  assert.match(String(value?.error||''),/unauthorized/i,`${url}: expected Unauthorized error`);
}

console.log('PASS: live REQOO production routes, canonical assets, read-only Shop data and Admin auth boundary are healthy.');
