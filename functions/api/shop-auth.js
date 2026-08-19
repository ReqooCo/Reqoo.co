const H={'content-type':'application/json;charset=UTF-8','cache-control':'no-store'};
function out(body,status=200){return new Response(JSON.stringify(body),{status,headers:H})}
function normalizePhone(v){let p=String(v||'').replace(/[^0-9+]/g,'');if(p.startsWith('01'))p='6'+p;if(p.startsWith('+'))p=p.slice(1);return p}
function b64u(v){return btoa(v).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function customerSecret(env){return String(env.SHOP_CUSTOMER_SECRET||env.BILLPLZ_X_SIGNATURE||env.ADMIN_API_KEY||'')}
async function hmac(value,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret)),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));return b64u(String.fromCharCode(...new Uint8Array(sig)))}
export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204});
  if(request.method!=='POST')return out({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  if(!env.SHOP_DB)return out({ok:false,error:'SHOP_DB_BINDING_MISSING'},503);
  const secret=customerSecret(env);if(!secret)return out({ok:false,error:'SHOP_CUSTOMER_AUTH_NOT_CONFIGURED'},503);
  let d;try{d=await request.json()}catch{return out({ok:false,error:'INVALID_JSON'},400)}
  const phone=normalizePhone(d.phone),orderRef=String(d.orderRef||'').trim();
  if(!phone||!orderRef)return out({ok:false,error:'PHONE_AND_ORDER_REQUIRED'},400);
  if(phone.length<10||phone.length>15||orderRef.length>80)return out({ok:false,error:'INVALID_CUSTOMER_INPUT'},400);
  const row=await env.SHOP_DB.prepare('SELECT o.order_ref,c.phone FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.order_ref=? AND c.phone=? LIMIT 1').bind(orderRef,phone).first();
  if(!row)return out({ok:false,error:'ORDER_NOT_FOUND'},404);
  const exp=Date.now()+30*24*60*60*1000;
  const payload=b64u(JSON.stringify({phone,exp}));
  const sig=await hmac(payload,secret);
  return out({ok:true,token:`${payload}.${sig}`,expiresAt:new Date(exp).toISOString()});
}