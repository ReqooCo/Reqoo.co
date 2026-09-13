import { onRequest as legacy } from './shop-flow-v3.js';

const C={
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type,X-Reqoo-Customer-Token,Authorization',
  'cache-control':'no-store'
};
const S=v=>String(v??'').trim();
const R=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
const normPhone=value=>{let p=S(value).replace(/\D/g,'');if(p.startsWith('0'))p='6'+p;return p;};
const b64u=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64uText=text=>b64u(new TextEncoder().encode(text));
const fromB64u=value=>{const s=String(value).replace(/-/g,'+').replace(/_/g,'/');const padded=s+'='.repeat((4-s.length%4)%4);return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));};
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');

async function data(request){
  const q=Object.fromEntries(new URL(request.url).searchParams);
  if(request.method==='GET')return q;
  try{return {...q,...await request.clone().json()}}catch{return q;}
}
function customerSecret(env){return S(env.REQOO_CUSTOMER_TOKEN_SECRET||env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);}
async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));
}
function equalHex(a,b){
  a=S(a).toLowerCase();b=S(b).toLowerCase();
  if(a.length!==b.length||!a)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}
async function issueToken(env,customer){
  const secret=customerSecret(env);if(!secret)throw Error('Customer token secret belum dikonfigurasi');
  const exp=Math.floor(Date.now()/1000)+30*24*60*60;
  const payload=b64uText(JSON.stringify({sub:S(customer.id),phone:normPhone(customer.phone),exp}));
  const signed=`v1.${payload}`;
  return {token:`${signed}.${await hmac(secret,signed)}`,expiresAt:new Date(exp*1000).toISOString()};
}
function suppliedToken(request){
  const direct=S(request.headers.get('X-Reqoo-Customer-Token'));
  if(direct)return direct;
  const auth=S(request.headers.get('Authorization'));
  return /^Bearer\s+/i.test(auth)?auth.replace(/^Bearer\s+/i,'').trim():'';
}
async function verifyToken(request,env){
  const secret=customerSecret(env);if(!secret)return {error:R({ok:false,error:'Customer access belum dikonfigurasi'},503)};
  const token=suppliedToken(request);if(!token)return {error:R({ok:false,error:'Sesi pelanggan diperlukan'},401)};
  const parts=token.split('.');if(parts.length!==3||parts[0]!=='v1')return {error:R({ok:false,error:'Sesi pelanggan tidak sah'},401)};
  const signed=`${parts[0]}.${parts[1]}`;
  if(!equalHex(parts[2],await hmac(secret,signed)))return {error:R({ok:false,error:'Sesi pelanggan tidak sah'},401)};
  let claims;try{claims=JSON.parse(new TextDecoder().decode(fromB64u(parts[1])))}catch{return {error:R({ok:false,error:'Sesi pelanggan tidak sah'},401)}}
  if(!claims?.sub||!claims?.phone||Number(claims.exp||0)<=Math.floor(Date.now()/1000))return {error:R({ok:false,error:'Sesi pelanggan telah tamat. Sila log masuk semula.'},401)};
  return {claims:{sub:S(claims.sub),phone:normPhone(claims.phone),exp:Number(claims.exp)}};
}
async function customerSession(d,env){
  const phone=normPhone(d.phone),orderRef=S(d.orderRef||d.orderNo||d.orderId);
  if(!phone||!orderRef)return R({ok:false,error:'No. WhatsApp dan nombor order diperlukan'},400);
  const customer=await env.DB.prepare('SELECT c.id,c.name,c.phone,c.email FROM orders o JOIN customers c ON c.id=o.customer_id WHERE c.phone=? AND (o.id=? OR o.order_no=?) LIMIT 1').bind(phone,orderRef,orderRef).first();
  if(!customer)return R({ok:false,error:'Maklumat tidak sepadan dengan rekod order'},401);
  try{const session=await issueToken(env,customer);return R({ok:true,customer,session});}
  catch(err){console.error('REQOO customerSession:',err);return R({ok:false,error:'Customer access belum dikonfigurasi'},503)}
}
async function customerOrders(request,env){
  const verified=await verifyToken(request,env);if(verified.error)return verified.error;
  const {sub,phone}=verified.claims;
  const customer=await env.DB.prepare('SELECT id,name,phone,email FROM customers WHERE id=? AND phone=? LIMIT 1').bind(sub,phone).first();
  if(!customer)return R({ok:false,error:'Pelanggan tidak dijumpai'},404);
  const orders=(await env.DB.prepare('SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 100').bind(customer.id).all()).results||[];
  return R({ok:true,customer,orders:orders.map(o=>({...o,orderNo:o.order_no,total:Number(o.total_minor||0)/100}))});
}
async function getOrder(request,d,env){
  const verified=await verifyToken(request,env);if(verified.error)return verified.error;
  const key=S(d.orderRef||d.orderId||d.orderNo);if(!key)return R({ok:false,error:'Order diperlukan'},400);
  const order=await env.DB.prepare('SELECT o.*,c.name customer_name,c.phone,c.email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.customer_id=? AND (o.id=? OR o.order_no=?) LIMIT 1').bind(verified.claims.sub,key,key).first();
  if(!order)return R({ok:false,error:'Order tidak dijumpai'},404);
  const items=(await env.DB.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY created_at').bind(order.id).all()).results||[];
  const payments=(await env.DB.prepare('SELECT id,order_id,provider,provider_reference,method,amount_minor,currency,status,paid_at,created_at,updated_at FROM payments WHERE order_id=? ORDER BY created_at DESC').bind(order.id).all()).results||[];
  const address=await env.DB.prepare('SELECT name,phone,address,shipping_method_id FROM order_addresses WHERE order_id=?').bind(order.id).first();
  return R({ok:true,order:{...order,orderNo:order.order_no,name:order.customer_name||'',total:Number(order.total_minor||0)/100,subtotal:Number(order.subtotal_minor||0)/100,shipping:Number(order.shipping_minor||0)/100,discount:Number(order.discount_minor||0)/100,items,payments,address:address||null}});
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  if(!env.DB)return R({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  const d=await data(request),action=S(d.action);
  try{
    if(action==='customerSession')return customerSession(d,env);
    if(action==='customerOrders')return customerOrders(request,env);
    if(action==='getOrder')return getOrder(request,d,env);
    return legacy({request,env});
  }catch(err){console.error('REQOO customer auth flow:',err);return R({ok:false,error:err?.message||String(err)},500)}
}
