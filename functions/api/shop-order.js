const CORS={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...CORS}});
const uid=p=>`${p}_${crypto.randomUUID()}`;
const ref=()=>{const d=new Date();return `RQ${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`};
export async function onRequest({request,env}){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 try{
  const b=request.method==='GET'?Object.fromEntries(new URL(request.url).searchParams):await request.json();
  if(b.action==='health')return json({ok:true,service:'SHOP ORDER API',db:'reqoo-shop-db'});
  if(b.action==='getOrder')return getOrder(b,env);
  if(b.action!=='createOrder')return json({ok:false,error:'Unknown action'},400);
  return createOrder(b,env);
 }catch(e){return json({ok:false,error:'Server error'},500)}
}
async function createOrder(b,env){
 const name=String(b.customerName||'').trim(),phone=String(b.phone||'').trim(),email=String(b.email||'').trim();
 const items=Array.isArray(b.items)?b.items:[];
 if(!name||!phone||!items.length)return json({ok:false,error:'Nama, WhatsApp dan item diperlukan'},400);
 const clean=items.map(x=>({sku:String(x.sku||'').trim().toUpperCase(),name:String(x.name||'').trim(),variant:String(x.variantName||x.variant||'').trim(),qty:Math.max(1,Number(x.qty||1)),price:Number(x.unitPrice||0)})).filter(x=>x.sku&&x.name&&Number.isFinite(x.price)&&x.price>=0);
 if(!clean.length)return json({ok:false,error:'Item tidak sah'},400);
 const subtotal=clean.reduce((n,x)=>n+x.price*x.qty,0);
 const promo=String(b.promotionCode||b.referralCode||'').trim().toUpperCase();
 let discount=0;
 if(promo==='REQOO10'&&subtotal>=50)discount=Math.min(subtotal,subtotal*.10);
 if(promo==='WELCOME5'&&subtotal>=50)discount=Math.min(subtotal,5);
 const total=Math.max(0,subtotal-discount),now=new Date().toISOString(),customerId=uid('cus'),orderId=uid('ord'),orderRef=ref();
 await env.SHOP_DB.batch([
  env.SHOP_DB.prepare(`INSERT INTO customers(id,name,phone,email,first_order_at,last_order_at,total_orders,total_spend,created_at,updated_at) VALUES(?,?,?,?,?,?,0,0,?,?)`).bind(customerId,name,phone,email,now,now,now,now),
  env.SHOP_DB.prepare(`INSERT INTO orders(id,order_ref,customer_id,status,payment_status,subtotal,discount,shipping,total,currency,promotion_code,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderId,orderRef,customerId,'PENDING','UNPAID',subtotal,discount,0,total,'MYR',promo||null,now,now),
  ...clean.map(x=>env.SHOP_DB.prepare(`INSERT INTO order_items(id,order_id,sku,product_name,variant_name,qty,unit_price,line_total) VALUES(?,?,?,?,?,?,?,?)`).bind(uid('item'),orderId,x.sku,x.name,x.variant||null,x.qty,x.price,x.price*x.qty))
 ]);
 return json({ok:true,orderId,orderRef,customerId,subtotal,discount,total,currency:'MYR',paymentStatus:'UNPAID'});
}
async function getOrder(b,env){const key=String(b.orderRef||b.orderId||'').trim();if(!key)return json({ok:false,error:'Order reference diperlukan'},400);const order=await env.SHOP_DB.prepare('SELECT * FROM orders WHERE order_ref=? OR id=? LIMIT 1').bind(key,key).first();if(!order)return json({ok:false,error:'Order tidak dijumpai'},404);const items=await env.SHOP_DB.prepare('SELECT * FROM order_items WHERE order_id=?').bind(order.id).all();return json({ok:true,order,items:items.results||[]})}
