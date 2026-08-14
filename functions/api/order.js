const ALLOWED_TYPES = new Set(['SHOP','SIM','PLAY']);

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors()});
  try {
    const d = await input(request);
    return json(await route(d,env));
  } catch (e) { return json({ok:false,error:String(e?.message||e)},500); }
}
function cors(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'}}
function json(x,status=200){return new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=UTF-8',...cors()}})}
async function input(r){const u=new URL(r.url),q=Object.fromEntries(u.searchParams.entries());if(r.method==='GET')return q;const t=r.headers.get('content-type')||'';return t.includes('application/json')?{...q,...await r.json()}:q}
async function route(d,env){
 const a=String(d.action||'');
 if(a==='createOrder')return createOrder(d,env);
 if(a==='getOrder')return getOrder(d,env);
 if(a==='getPaymentStatus')return getPaymentStatus(d,env);
 return {ok:false,error:'Action tidak dikenali'};
}
function clean(v){return String(v||'').trim()}
function id(){return `ord_${crypto.randomUUID()}`}
function ref(){return `REQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`}
async function createOrder(d,env){
 const type=clean(d.productType).toUpperCase(), name=clean(d.name), email=clean(d.email), phone=clean(d.phone), amount=Math.round(Number(d.amount||0)*100);
 if(!ALLOWED_TYPES.has(type))return {ok:false,error:'Product type tidak sah'};
 if(!name||!email||!phone||!Number.isFinite(amount)||amount<100)return {ok:false,error:'Maklumat order tidak lengkap'};
 const orderId=id(), orderRef=ref(), now=new Date().toISOString();
 await env.DB.prepare(`INSERT INTO platform_orders (id,order_ref,product_type,product_id,customer_name,email,phone,amount,currency,status,referral_code,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'MYR','',?,?,?)`)
 .bind(orderId,orderRef,type,clean(d.productId),name,email,phone,amount,now,now).run();
 return {ok:true,orderId,orderRef,status:'PENDING',amount:amount/100,currency:'MYR',payment:'BILLPLZ_PENDING'};
}
async function getOrder(d,env){const key=clean(d.orderId||d.orderRef);if(!key)return {ok:false,error:'Order diperlukan'};const r=await env.DB.prepare('SELECT * FROM platform_orders WHERE id=? OR order_ref=?').bind(key,key).first();if(!r)return {ok:false,error:'Order tidak dijumpai'};return {ok:true,order:r}}
async function getPaymentStatus(d,env){return getOrder(d,env)}
