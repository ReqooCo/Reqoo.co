import { onRequest as legacy } from './shop-admin-flow-v13.js';
const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
async function productInsights(env){
 const rows=(await env.DB.prepare(`SELECT oi.product_id,MAX(oi.product_name_snapshot) product_name,SUM(oi.quantity) units_sold,SUM(oi.line_total_minor) revenue_minor,COUNT(DISTINCT oi.order_id) paid_orders,MAX(o.created_at) last_sale_at FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.payment_status='paid' GROUP BY oi.product_id ORDER BY revenue_minor DESC`).all()).results||[];
 return J({ok:true,products:rows});
}
export async function onRequest({request,env}){if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});const d=await data(request),action=S(d.action);if(action==='productInsights'){if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);try{return productInsights(env)}catch(e){console.error('REQOO products v14:',e);return J({ok:false,error:e?.message||String(e)},500)}}return legacy({request,env});}