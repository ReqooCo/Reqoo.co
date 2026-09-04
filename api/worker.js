import { onRequest as handleCore } from '../functions/api/core.js';
import { onRequest as handleSimAdmin } from './sim-admin.js';
import { onRequest as handleShopAdmin } from './shop-admin.js';
import { onRequest as handleProductImage } from '../functions/api/product-image.js';
import { onRequest as handleInvoice } from '../functions/api/invoice-v1.js';
import { onRequest as handleLicense } from '../functions/api/license-v1.js';
import { onRequest as handlePkskPaymentV2 } from '../functions/api/pksk-payment-v2.js';
import { onRequest as handleShop } from './shop-v2.js';
import { handle as handlePksk } from './pksk.js';
import { handle as handleHero } from './hero.js';

function withAdminEnv(env) {
  // Preserve runtime bindings when a compatibility handler needs aliases.
  const out = { ...env };
  out.DB = env.DB;
  out.MEDIA = env.MEDIA;
  out.SHOP_DB = env.DB;
  out.PR00FS = env.MEDIA;
  const admin = env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || env.SHOP_ADMIN_TOKEN || '';
  out.REQOO_ADMIN_TOKEN = admin;
  out.SHOP_ADMIN_TOKEN = env.SHOP_ADMIN_TOKEN || admin;
  out.PKSK_ADMIN_TOKEN = env.PKSK_ADMIN_TOKEN || admin;
  out.ADMIN_API_KEY = env.ADMIN_API_KEY || admin;
  out.BILLPLZ_API_KEY = env.BILLPLZ_API_KEY || env.BILLPLZ_KEY || '';
  out.BILLPLZ_COLLECTION_ID = env.BILLPLZ_COLLECTION_ID || '';
  out.BILLPLZ_X_SIGNATURE_KEY = env.BILLPLZ_X_SIGNATURE_KEY || env.BILLPLZ_X_SIGNATURE || '';
  return out;
}
async function shopAdminCompat(request,env){
  if(request.method!=='POST')return handleShopAdmin({request,env});
  try{const d=await request.clone().json();if(String(d.action)==='status'&&String(d.status||'').toLowerCase()==='completed')d.status='fulfilled';return handleShopAdmin({request:new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(d)}),env})}catch{return handleShopAdmin({request,env})}
}
function signaturePayload(d){return Object.entries(d).filter(([k,v])=>k!=='x_signature'&&v!==undefined&&v!==null).map(([k,v])=>[k,String(v)]).sort((a,b)=>a[0].toLowerCase().localeCompare(b[0].toLowerCase())).map(([k,v])=>k+v).join('|')}
async function validBillplzCallback(request,env){const secret=String(env.BILLPLZ_X_SIGNATURE_KEY||'').trim();if(!secret)return false;let d={};try{const ct=(request.headers.get('content-type')||'').toLowerCase();d=ct.includes('application/json')?await request.clone().json():Object.fromEntries(new URLSearchParams(await request.clone().text()))}catch{return false}const supplied=String(d.x_signature||'').trim();if(!supplied)return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(signaturePayload(d)));const computed=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');return computed.toLowerCase()===supplied.toLowerCase()}
async function secureShop(request,env){if(request.method==='POST'){try{const u=new URL(request.url);if(u.pathname==='/api/billplz'||u.searchParams.get('action')==='billplz-callback'){if(!(await validBillplzCallback(request,env)))return new Response('invalid signature',{status:400});}}catch{return new Response('invalid signature',{status:400})}}return handleShop(request,env)}
export default {async fetch(request,env,ctx){const url=new URL(request.url),path=url.pathname,bridgedEnv=withAdminEnv(env);if(path === '/api/shop'||path==='/api/billplz')return secureShop(request,bridgedEnv);if(path==='/api/pksk')return handlePksk(request,bridgedEnv);if(path==='/api/pksk-payment-v2')return handlePkskPaymentV2({request,env:bridgedEnv});if(path==='/api/shop-hero')return handleHero(request,bridgedEnv);if(path==='/api/core')return handleCore({request,env:bridgedEnv});if(path === '/api/sim-admin'||path==='/api/sim-admin-v2')return handleSimAdmin({request,env});if(path==='/api/shop-admin')return shopAdminCompat(request,bridgedEnv);if(path==='/api/product-image')return handleProductImage({request,env:bridgedEnv,ctx});if(path==='/api/invoice-v1'||path.startsWith('/api/invoice-v1/'))return handleInvoice({request,env:bridgedEnv});if(path==='/api/license-v1'||path.startsWith('/api/license-v1/'))return handleLicense({request,env:bridgedEnv});if(path==='/api/health')return new Response(JSON.stringify({ok:!!env.DB,service:'reqoo-api',db:!!env.DB,media:!!env.MEDIA}),{status:env.DB?200:503,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*'}});return new Response(JSON.stringify({ok:false,error:'Not found'}),{status:404,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*'}})}};
