const ALLOWED_ACTIONS = new Set(['health','createOrder','getOrder','listProducts']);
const CORS = {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'};

const PRODUCTS = [
 {id:101,name:'Basic Collection',category:'Plaque',desc:'Recognition Gift — 3 saiz.',image:'assets/plaque-basic.jpg',variants:[['A5',50],['A4',100],['A3',150]],sortOrder:101,active:true},
 {id:102,name:'Classic Collection',category:'Plaque',desc:'Timeless elegance — 3 saiz.',image:'assets/plaque-classic.jpg',variants:[['A5',99],['A4',199],['A3',299]],sortOrder:102,active:true},
 {id:103,name:'Prestige Collection',category:'Plaque',desc:'Timeless recognition — 3 saiz.',image:'assets/plaque-prestige.jpg',variants:[['A5',130],['A4',230],['A3',330]],sortOrder:103,active:true},
 {id:104,name:'Signature Collection',category:'Plaque',desc:'Distinctive, prestigious, timeless.',image:'assets/plaque-signature.jpg',variants:[['A5',130],['A4',210],['A3',310]],sortOrder:104,active:true},
 {id:201,name:'Tie Tack / Butterfly Lock',category:'Brooch',desc:'Ukiran laser — acrylic.',image:'assets/brooch-01-04.jpg',variants:[['Petak 30×20mm',1.50],['Bulat 25–30mm',1.50]],sortOrder:201,active:true},
 {id:202,name:'Standard Brooch',category:'Brooch',desc:'Ukiran laser — acrylic.',image:'assets/brooch-01-04.jpg',variants:[['Petak 30×20mm',1.30],['Bulat 25–30mm',1.30]],sortOrder:202,active:true},
 {id:203,name:'Baby Brooch',category:'Brooch',desc:'Ukiran laser — acrylic.',image:'assets/brooch-01-04.jpg',variants:[['Petak 25×10mm',1.00],['Bulat 18–20mm',1.00]],sortOrder:203,active:true},
 {id:204,name:'Exclusive Ring',category:'Brooch',desc:'Ukiran laser — acrylic.',image:'assets/brooch-01-04.jpg',variants:[['Petak 50×20mm',3.50],['Bulat 50×50mm',3.50]],sortOrder:204,active:true},
 {id:205,name:'Sublimation Brooch',category:'Brooch',desc:'Sublimation brooch — acrylic.',image:'assets/brooch-05-07.jpg',variants:[['Petak 30×20mm',2.50],['Bulat 30–35mm',2.50]],sortOrder:205,active:true},
 {id:206,name:'Standard Ring',category:'Brooch',desc:'Ukiran laser — acrylic.',image:'assets/brooch-05-07.jpg',variants:[['Petak 30×20mm',1.30],['Bulat 25–30mm',1.30]],sortOrder:206,active:true},
 {id:207,name:'Big Brooch',category:'Brooch',desc:'Ukiran laser — acrylic.',image:'assets/brooch-05-07.jpg',variants:[['Petak 50×20mm',2.00],['Bulat 50×50mm',2.00]],sortOrder:207,active:true},
 {id:301,name:'Trophy — Quotation',category:'Trophy',desc:'Custom trophy. Harga mengikut design & kuantiti.',image:'assets/trophy.jpg',variants:[['Custom quotation',0]],sortOrder:301,active:true},
 {id:401,name:'Medal — Quotation',category:'Medal',desc:'Custom medal. Harga mengikut design & kuantiti.',image:'assets/medal.jpg',variants:[['Custom quotation',0]],sortOrder:401,active:true},
 {id:501,name:'3D Print Service',category:'3D Print Service',desc:'Hantar STL/OBJ, pilih material dan quantity. Kami beri quotation.',image:'assets/3d-print.jpg',variants:[['Quotation',0]],sortOrder:501,active:true}
];

export async function onRequest({request,env}){
 if(request.method==='OPTIONS') return new Response(null,{status:204,headers:CORS});
 try{const d=await input(request);const action=String(d.action||'health');if(!ALLOWED_ACTIONS.has(action))return out({ok:false,error:'Action tidak dikenali'},400);return out(await route(action,d,env));}
 catch(e){return out({ok:false,error:String(e?.message||e)},500)}
}
async function input(request){const u=new URL(request.url);const q=Object.fromEntries(u.searchParams.entries());if(request.method==='GET')return q;const t=request.headers.get('content-type')||'';return t.includes('application/json')?{...q,...await request.json()}:q}
function out(x,status=200){return new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json;charset=UTF-8',...CORS}})}
async function route(action,d,env){
 if(action==='health')return {ok:true,service:'REQOO SHOP API',version:'SHOP-2',db:'platform_orders'};
 if(action==='listProducts')return {ok:true,products:PRODUCTS};
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
