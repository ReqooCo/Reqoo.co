const ALLOWED_ACTIONS = new Set(['health','createOrder','getOrder','listProducts']);
const CORS = {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'};

export async function onRequest({request,env}){
 if(request.method==='OPTIONS') return new Response(null,{status:204,headers:CORS});
 try{const d=await input(request);const action=String(d.action||'health');if(!ALLOWED_ACTIONS.has(action))return out({ok:false,error:'Action tidak dikenali'},400);return out(await route(action,d,env));}
 catch(e){return out({ok:false,error:String(e?.message||e)},500)}
}
async function input(request){const u=new URL(request.url);const q=Object.fromEntries(u.searchParams.entries());if(request.method==='GET')return q;const t=request.headers.get('content-type')||'';return t.includes('application/json')?{...q,...await request.json()}:q}
function out(x,status=200){return new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json;charset=UTF-8',...CORS}})}
async function route(action,d,env){
 if(action==='health')return {ok:true,service:'REQOO SHOP API',version:'SHOP-1'};
 if(action==='listProducts')return {ok:true,products:[]};
 if(action==='createOrder')return createOrder(d,env);
 if(action==='getOrder')return getOrder(d,env);
}
function id(){return `ord_${crypto.randomUUID()}`}
function ref(){const n=new Date(),r=Math.random().toString(36).slice(2,7).toUpperCase();return `RQ${n.getUTCFullYear()}${String(n.getUTCMonth()+1).padStart(2,'0')}${String(n.getUTCDate()).padStart(2,'0')}-${r}`}
async function createOrder(d,env){
 const customer=String(d.customerName||d.name||'').trim(),phone=String(d.phone||'').trim();
 const items=Array.isArray(d.items)?d.items:[];const amount=Number(d.amount||0);
 if(!customer||!phone||!items.length||!Number.isFinite(amount)||amount<=0)return {ok:false,error:'Maklumat order tidak lengkap'};
 const orderId=id(),orderRef=ref(),now=new Date().toISOString();
 await env.DB.prepare(`INSERT INTO platform_orders (id,order_ref,product_type,customer_name,phone,email,amount,currency,status,referral_code,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'MYR','PENDING',?,?,?)`)
 .bind(orderId,orderRef,String(d.productType||'SHOP').toUpperCase(),customer,phone,String(d.email||'').trim(),amount,String(d.referralCode||'').trim().toUpperCase(),now,now).run();
 return {ok:true,orderId,orderRef,status:'PENDING',amount,currency:'MYR',payment:{provider:'BILLPLZ',status:'NOT_CREATED'}};
}
async function getOrder(d,env){
 const key=String(d.orderRef||d.orderId||'').trim();if(!key)return {ok:false,error:'Order diperlukan'};
 const r=await env.DB.prepare('SELECT * FROM platform_orders WHERE order_ref=? OR id=? LIMIT 1').bind(key,key).first();
 if(!r)return {ok:false,error:'Order tidak dijumpai'};
 return {ok:true,order:r};
}
