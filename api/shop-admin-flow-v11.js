import { onRequest as legacy } from './shop-admin-flow-v10.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});

async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
function safeName(v){return S(v||'artwork').replace(/[^a-z0-9._-]/gi,'_').slice(0,120)||'artwork'}

async function artwork(request,d,env){
  if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
  if(!env.DB||!env.MEDIA)return J({ok:false,error:'Storage artwork belum tersedia'},503);
  const itemId=S(d.itemId),orderId=S(d.orderId||d.orderRef||d.orderNo);
  if(!itemId)return J({ok:false,error:'Item diperlukan'},400);
  const row=orderId
    ?await env.DB.prepare('SELECT oi.id,oi.customization_snapshot_json FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.id=? AND (o.id=? OR o.order_no=?) LIMIT 1').bind(itemId,orderId,orderId).first()
    :await env.DB.prepare('SELECT id,customization_snapshot_json FROM order_items WHERE id=? LIMIT 1').bind(itemId).first();
  if(!row)return J({ok:false,error:'Item tidak dijumpai'},404);
  let custom={};try{custom=JSON.parse(row.customization_snapshot_json||'{}')}catch{}
  const key=S(custom.artworkKey);
  if(!key||!key.startsWith('shop/artwork/'))return J({ok:false,error:'Artwork tidak tersedia'},404);
  const obj=await env.MEDIA.get(key);if(!obj)return J({ok:false,error:'Fail artwork tidak dijumpai'},404);
  const headers=new Headers(C);headers.set('content-type',obj.httpMetadata?.contentType||S(custom.artworkType)||'application/octet-stream');headers.set('content-disposition',`inline; filename="${safeName(custom.artworkName)}"`);headers.set('x-content-type-options','nosniff');return new Response(obj.body,{status:200,headers});
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  const d=await data(request);
  if(S(d.action)==='artwork'){try{return await artwork(request,d,env)}catch(e){console.error('REQOO order artwork v11:',e);return J({ok:false,error:e?.message||String(e)},500)}}
  return legacy({request,env});
}
