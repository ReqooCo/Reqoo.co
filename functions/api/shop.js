const ALLOWED_ACTIONS = new Set(['health','createOrder','getOrder','listProducts','billplz-callback','billplz-redirect']);
const CORS = {
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type',
  'cache-control':'no-store'
};
const BILLPLZ_BASE = 'https://www.billplz.com/api/v3';

export async function onRequest({request,env}){
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:CORS});
  try{
    const d=await input(request);
    const action=String(d.action||'health');
    if(!ALLOWED_ACTIONS.has(action)) return out({ok:false,error:'Action tidak dikenali'},400);
    if(action==='billplz-callback') return handleBillplzCallback(d,env);
    if(action==='billplz-redirect') return handleBillplzRedirect(d,env);
    return out(await route(action,d,env));
  }catch(e){
    console.error(e);
    return out({ok:false,error:String(e?.message||e)},500);
  }
}

async function input(request){
  const u=new URL(request.url);
  const q=Object.fromEntries(u.searchParams.entries());
  if(request.method==='GET') return q;
  const t=(request.headers.get('content-type')||'').toLowerCase();
  if(t.includes('application/json')) return {...q,...await request.json()};
  if(t.includes('application/x-www-form-urlencoded') || t.includes('multipart/form-data')){
    const body=await request.text();
    return {...q,...Object.fromEntries(new URLSearchParams(body).entries())};
  }
  const body=await request.text();
  if(body){try{return {...q,...JSON.parse(body)}}catch(e){}}
  return q;
}

function out(x,status=200){
  return new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json;charset=UTF-8',...CORS}});
}

async function route(action,d,env){
  if(action==='health') return {ok:true,service:'REQOO SHOP API',version:'SHOP-4',db:'SHOP_DB',payment:'BILLPLZ'};
  if(action==='listProducts') return listProducts(env);
  if(action==='createOrder') return createOrder(d,env);
  if(action==='getOrder') return getOrder(d,env);
}

async function listProducts(env){
  if(!env.SHOP_DB) return {ok:false,error:'SHOP_DB binding belum tersedia'};
  const rows=await env.SHOP_DB.prepare(`SELECT p.id,p.sku,p.name,p.category,p.description,p.image_url,p.active,v.id AS variant_id,v.name AS variant_name,v.sku AS variant_sku,v.price,v.stock,v.active AS variant_active FROM products p LEFT JOIN product_variants v ON v.product_id=p.id AND v.active=1 WHERE p.active=1 ORDER BY CAST(p.id AS INTEGER), v.id`).all();
  const map=new Map();
  for(const r of rows.results||[]){
    let p=map.get(String(r.id));
    if(!p){p={id:Number(r.id)||r.id,name:r.name,category:r.category,desc:r.description,image:r.image_url,variants:[]};map.set(String(r.id),p);}
    if(r.variant_id)p.variants.push([r.variant_name,Number(r.price||0)]);
  }
  return {ok:true,products:[...map.values()]};
}

function id(){return `ord_${crypto.randomUUID()}`;}
function ref(){const n=new Date(),r=Math.random().toString(36).slice(2,7).toUpperCase();return `RQ${n.getUTCFullYear()}${String(n.getUTCMonth()+1).padStart(2,'0')}${String(n.getUTCDate()).padStart(2,'0')}-${r}`;}
function cents(n){return Math.round(Number(n||0)*100);}
function normalizePhone(v){
  let p=String(v||'').replace(/[^0-9+]/g,'');
  if(p.startsWith('01')) p='6'+p;
  if(p.startsWith('+')) p=p.slice(1);
  return p;
}
function safeOrigin(request){return new URL(request.url).origin;}
function billAuth(key){return 'Basic '+btoa(`${key}:`);}

async function createOrder(d,env){
  if(!env.SHOP_DB) return {ok:false,error:'SHOP_DB binding belum tersedia'};
  const customer=String(d.customerName||d.name||'').trim();
  const phone=normalizePhone(d.phone);
  const email=String(d.email||'').trim();
  const address=String(d.address||'').trim();
  const items=Array.isArray(d.items)?d.items:[];
  if(!customer||!phone||!items.length)return {ok:false,error:'Maklumat order tidak lengkap'};

  // Recalculate prices from SHOP_DB. The browser never decides the amount to charge.
  const normalized=[];
  for(const x of items){
    const productId=String(x.productId||x.product?.id||'').trim();
    const variantName=String(x.variant||x.variantName||'').trim();
    const qty=Math.max(1,Math.min(999,Number(x.qty||x.q)||1));
    if(!productId||!variantName) return {ok:false,error:'Item order tidak lengkap'};
    const row=await env.SHOP_DB.prepare(`SELECT p.id,p.sku AS product_sku,p.name,p.category,p.active,v.id AS variant_id,v.sku AS variant_sku,v.name AS variant_name,v.price,v.stock,v.active AS variant_active FROM products p JOIN product_variants v ON v.product_id=p.id WHERE p.id=? AND v.name=? LIMIT 1`).bind(productId,variantName).first();
    if(!row||!row.active||!row.variant_active) return {ok:false,error:`Produk/variant tidak tersedia: ${productId} / ${variantName}`};
    if(row.stock!==null && Number(row.stock)<qty) return {ok:false,error:`Stok tidak mencukupi: ${row.name} / ${variantName}`};
    const unit=Number(row.price||0);
    normalized.push({productId:String(row.id),sku:String(row.variant_sku||row.product_sku||''),productName:String(row.name),category:String(row.category||''),variantName:String(row.variant_name),qty,unit,lineTotal:unit*qty});
  }

  const subtotal=normalized.reduce((s,x)=>s+x.lineTotal,0);
  // Promotions will be enforced server-side from the promotions table once a valid code is supplied.
  const promotionCode=String(d.promotionCode||'').trim().toUpperCase();
  let discount=0;
  if(promotionCode){
    const promo=await env.SHOP_DB.prepare(`SELECT * FROM promotions WHERE code=? AND active=1 AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) AND (usage_limit IS NULL OR usage_count<usage_limit) LIMIT 1`).bind(promotionCode,new Date().toISOString(),new Date().toISOString()).first();
    if(!promo)return {ok:false,error:'Kod promosi tidak sah atau sudah tamat'};
    if(subtotal<Number(promo.min_spend||0))return {ok:false,error:`Minimum belian untuk promo ialah RM${Number(promo.min_spend||0).toFixed(2)}`};
    discount=promo.type==='percent'?subtotal*(Number(promo.value||0)/100):Number(promo.value||0);
    discount=Math.min(subtotal,Math.max(0,discount));
  }
  const shipping=Math.max(0,Number(d.shipping||0));
  const total=Math.max(0,subtotal-discount+shipping);
  const orderId=id(),orderRef=ref(),now=new Date().toISOString();

  let customerRow=await env.SHOP_DB.prepare(`SELECT * FROM customers WHERE phone=? OR (email<>'' AND email=?) ORDER BY created_at LIMIT 1`).bind(phone,email).first();
  const customerId=customerRow?.id||`cus_${crypto.randomUUID()}`;
  if(customerRow){
    await env.SHOP_DB.prepare(`UPDATE customers SET name=?,phone=?,email=?,last_order_at=?,updated_at=? WHERE id=?`).bind(customer,phone,email,now,now,customerId).run();
  }else{
    await env.SHOP_DB.prepare(`INSERT INTO customers (id,name,phone,email,first_order_at,last_order_at,total_orders,total_spend,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(customerId,customer,phone,email,now,now,0,0,now,now).run();
  }

  await env.SHOP_DB.prepare(`INSERT INTO orders (id,order_ref,customer_id,status,payment_status,subtotal,discount,shipping,total,currency,promotion_code,billplz_id,receipt_url,customer_address,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderId,orderRef,customerId,'PENDING','UNPAID',subtotal,discount,shipping,total,'MYR',promotionCode,null,null,address,now,now).run();
  for(const x of normalized){
    await env.SHOP_DB.prepare(`INSERT INTO order_items (id,order_id,product_id,sku,product_name,variant_name,qty,unit_price,line_total) VALUES (?,?,?,?,?,?,?,?,?)`).bind(`item_${crypto.randomUUID()}`,orderId,x.productId,x.sku,x.productName,x.variantName,x.qty,x.unit,x.lineTotal).run();
  }

  if(total<=0) return {ok:true,orderId,orderRef,status:'PENDING',amount:0,currency:'MYR',payment:{provider:'BILLPLZ',status:'NOT_REQUIRED'}};
  if(!env.BILLPLZ_API_KEY||!env.BILLPLZ_COLLECTION_ID) return {ok:false,error:'Billplz belum dikonfigurasi dalam Cloudflare Secrets/Variables',orderRef};

  const origin=safeOrigin(d.__request||{url:'https://shop.reqoo.co'});
  const callbackUrl=`${origin}/api/shop?action=billplz-callback`;
  const redirectUrl=`${origin}/api/shop?action=billplz-redirect`;
  const params=new URLSearchParams();
  params.set('collection_id',String(env.BILLPLZ_COLLECTION_ID));
  params.set('description',`REQOO SHOP ${orderRef}`.slice(0,200));
  params.set('name',customer.slice(0,255));
  params.set('amount',String(cents(total)));
  params.set('callback_url',callbackUrl);
  params.set('redirect_url',redirectUrl);
  params.set('reference_1_label','Order');
  params.set('reference_1',orderRef);
  params.set('deliver','false');
  if(email)params.set('email',email);
  else params.set('mobile',phone);

  const bp=await fetch(`${BILLPLZ_BASE}/bills`,{method:'POST',headers:{Authorization:billAuth(String(env.BILLPLZ_API_KEY)),'content-type':'application/x-www-form-urlencoded'},body:params.toString()});
  const text=await bp.text();
  let data;try{data=JSON.parse(text)}catch(e){data={error:text};}
  if(!bp.ok||!data?.id||!data?.url){
    console.error('Billplz create bill failed',bp.status,data);
    return {ok:false,error:'Billplz gagal mencipta bill',orderRef,detail:data?.error||data?.message||'Unknown error'};
  }
  await env.SHOP_DB.prepare(`UPDATE orders SET billplz_id=?,billplz_url=?,billplz_state='due',updated_at=? WHERE id=?`).bind(String(data.id),String(data.url),new Date().toISOString(),orderId).run();
  return {ok:true,orderId,orderRef,status:'PENDING',amount:total,currency:'MYR',payment:{provider:'BILLPLZ',status:'DUE',billId:String(data.id),billUrl:String(data.url)}};
}

async function getOrder(d,env){
  if(!env.SHOP_DB)return {ok:false,error:'SHOP_DB binding belum tersedia'};
  const key=String(d.orderRef||d.orderId||'').trim();if(!key)return {ok:false,error:'Order diperlukan'};
  const r=await env.SHOP_DB.prepare('SELECT * FROM orders WHERE order_ref=? OR id=? LIMIT 1').bind(key,key).first();if(!r)return {ok:false,error:'Order tidak dijumpai'};
  const items=await env.SHOP_DB.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY rowid').bind(r.id).all();
  return {ok:true,order:{...r,items:items.results||[]}};
}

async function verifyXSignature(data,key){
  const supplied=String(data.x_signature||'').toLowerCase();
  if(!supplied||!key)return false;
  const source=Object.keys(data).filter(k=>k!=='x_signature').sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'})).map(k=>`${k}${data[k]??''}`).join('|');
  const bytes=new TextEncoder().encode(source);
  const secret=new TextEncoder().encode(String(key));
  const cryptoKey=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,bytes));
  let hex='';for(const b of sig)hex+=b.toString(16).padStart(2,'0');
  return safeEqual(hex,supplied);
}
function safeEqual(a,b){
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}

async function handleBillplzCallback(d,env){
  if(!env.SHOP_DB)return new Response('SHOP_DB binding belum tersedia',{status:500});
  if(!env.BILLPLZ_X_SIGNATURE)return new Response('X Signature secret missing',{status:500});
  const valid=await verifyXSignature(d,env.BILLPLZ_X_SIGNATURE);
  if(!valid)return new Response('Invalid signature',{status:401});
  const collection=String(d.collection_id||'');
  if(env.BILLPLZ_COLLECTION_ID && collection!==String(env.BILLPLZ_COLLECTION_ID))return new Response('Invalid collection',{status:400});
  const billId=String(d.id||'');
  if(!billId)return new Response('Missing bill id',{status:400});
  const order=await env.SHOP_DB.prepare('SELECT * FROM orders WHERE billplz_id=? LIMIT 1').bind(billId).first();
  if(!order)return new Response('OK',{status:200});

  const paid=String(d.paid||'').toLowerCase()==='true';
  const state=String(d.state||'').toLowerCase();
  const paidAmount=Number(d.paid_amount||0);
  const expected=cents(order.total);
  const txStatus=String(d.transaction_status||'');
  const txId=String(d.transaction_id||'');
  const paidAt=String(d.paid_at||'')||null;

  if(paid && state==='paid'){
    if(paidAmount && paidAmount<expected)return new Response('Amount mismatch',{status:400});
    const now=new Date().toISOString();
    await env.SHOP_DB.batch([
      env.SHOP_DB.prepare(`UPDATE orders SET status='PROCESSING',payment_status='PAID',billplz_state=?,billplz_transaction_id=?,billplz_transaction_status=?,paid_at=?,updated_at=? WHERE id=?`).bind(state,txId,txStatus,paidAt||now,now,order.id),
      env.SHOP_DB.prepare(`UPDATE customers SET total_orders=total_orders+1,total_spend=total_spend+?,last_order_at=?,updated_at=? WHERE id=?`).bind(Number(order.total),now,now,order.customer_id)
    ]);
    return new Response('OK',{status:200});
  }
  await env.SHOP_DB.prepare(`UPDATE orders SET billplz_state=?,billplz_transaction_id=?,billplz_transaction_status=?,updated_at=? WHERE id=?`).bind(state,txId,txStatus,new Date().toISOString(),order.id).run();
  return new Response('OK',{status:200});
}

async function handleBillplzRedirect(d,env){
  const billId=String(d['billplz[id]']||d.id||'');
  let order=null;
  if(env.SHOP_DB&&billId)order=await env.SHOP_DB.prepare('SELECT order_ref,payment_status FROM orders WHERE billplz_id=? LIMIT 1').bind(billId).first();
  const status=order?.payment_status==='PAID'?'success':'pending';
  const url=new URL('/', 'https://shop.reqoo.co');
  url.searchParams.set('payment',status);
  if(order?.order_ref)url.searchParams.set('order',order.order_ref);
  return Response.redirect(url.toString(),303);
}
