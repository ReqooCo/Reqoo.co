const ALLOWED_ACTIONS = new Set(['health','createOrder','getOrder','listProducts']);
const CORS = {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'};

export async function onRequest({request,env}){
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:CORS});
  try{
    const d=await input(request);
    const action=String(d.action||'health');
    if(!ALLOWED_ACTIONS.has(action)) return out({ok:false,error:'Action tidak dikenali'},400);
    return out(await route(action,d,env));
  }catch(e){
    return out({ok:false,error:String(e?.message||e)},500);
  }
}

async function input(request){
  const u=new URL(request.url);
  const q=Object.fromEntries(u.searchParams.entries());
  if(request.method==='GET') return q;
  const t=request.headers.get('content-type')||'';
  return t.includes('application/json')?{...q,...await request.json()}:q;
}

function out(x,status=200){
  return new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json;charset=UTF-8',...CORS}});
}

async function route(action,d,env){
  if(action==='health') return {ok:true,service:'REQOO SHOP API',version:'SHOP-3',db:'SHOP_DB'};
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

async function createOrder(d,env){
  if(!env.SHOP_DB) return {ok:false,error:'SHOP_DB binding belum tersedia'};
  const customer=String(d.customerName||d.name||'').trim(),phone=String(d.phone||'').trim(),email=String(d.email||'').trim(),items=Array.isArray(d.items)?d.items:[];
  if(!customer||!phone||!items.length)return {ok:false,error:'Maklumat order tidak lengkap'};
  const orderId=id(),orderRef=ref(),now=new Date().toISOString();
  const subtotal=items.reduce((s,x)=>s+(Number(x.unitPrice)||0)*(Math.max(1,Number(x.qty||x.q)||1)),0),discount=Number(d.discount||0),shipping=Number(d.shipping||0),total=Math.max(0,subtotal-discount+shipping),customerId=`cus_${crypto.randomUUID()}`;
  await env.SHOP_DB.prepare(`INSERT INTO customers (id,name,phone,email,first_order_at,last_order_at,total_orders,total_spend,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(customerId,customer,phone,email,now,now,0,0,now,now).run();
  await env.SHOP_DB.prepare(`INSERT INTO orders (id,order_ref,customer_id,status,payment_status,subtotal,discount,shipping,total,currency,promotion_code,billplz_id,receipt_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderId,orderRef,customerId,'PENDING','UNPAID',subtotal,discount,shipping,total,'MYR',String(d.promotionCode||''),null,null,now,now).run();
  for(const x of items){const qty=Math.max(1,Number(x.qty||x.q)||1),unit=Number(x.unitPrice)||0;await env.SHOP_DB.prepare(`INSERT INTO order_items (id,order_id,product_id,sku,product_name,variant_name,qty,unit_price,line_total) VALUES (?,?,?,?,?,?,?,?,?)`).bind(`item_${crypto.randomUUID()}`,orderId,String(x.productId||x.product?.id||''),String(x.sku||''),String(x.productName||x.product?.name||'Produk'),String(x.variant||x.variantName||''),qty,unit,unit*qty).run();}
  return {ok:true,orderId,orderRef,status:'PENDING',amount:total,currency:'MYR',payment:{provider:'BILLPLZ',status:'NOT_CREATED'}};
}

async function getOrder(d,env){
  if(!env.SHOP_DB)return {ok:false,error:'SHOP_DB binding belum tersedia'};
  const key=String(d.orderRef||d.orderId||'').trim();if(!key)return {ok:false,error:'Order diperlukan'};
  const r=await env.SHOP_DB.prepare('SELECT * FROM orders WHERE order_ref=? OR id=? LIMIT 1').bind(key,key).first();if(!r)return {ok:false,error:'Order tidak dijumpai'};
  const items=await env.SHOP_DB.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY rowid').bind(r.id).all();
  return {ok:true,order:{...r,items:items.results||[]}};
}
