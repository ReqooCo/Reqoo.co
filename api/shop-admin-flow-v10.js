import { onRequest as legacy } from './shop-admin-flow-v9.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const NOW=()=>new Date().toISOString();
const ID=p=>`${p}_${crypto.randomUUID()}`;
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});

async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}

async function setFulfillment(request,d,env,status){
  if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
  if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  const key=S(d.orderId||d.orderRef||d.orderNo);
  if(!key)return J({ok:false,error:'Order diperlukan'},400);
  try{
    const order=await env.DB.prepare('SELECT id,order_no,payment_status,fulfillment_status FROM orders WHERE id=? OR order_no=? LIMIT 1').bind(key,key).first();
    if(!order)return J({ok:false,error:'Order tidak dijumpai'},404);
    if(S(order.payment_status).toLowerCase()!=='paid')return J({ok:false,error:'Bayaran perlu disahkan sebelum status kerja boleh diubah'},409);
    const t=NOW();
    const result=await env.DB.prepare('UPDATE orders SET fulfillment_status=?,updated_at=? WHERE id=?').bind(status,t,order.id).run();
    const fresh=await env.DB.prepare('SELECT id,order_no,payment_status,fulfillment_status,updated_at FROM orders WHERE id=? LIMIT 1').bind(order.id).first();
    if(!fresh||S(fresh.fulfillment_status).toLowerCase()!==status){
      console.error('REQOO fulfillment status v10 did not persist',{orderId:order.id,status,result});
      return J({ok:false,error:'Status tidak berjaya disimpan. Sila cuba semula.'},500);
    }
    try{await env.DB.prepare('INSERT INTO activity_events(id,order_id,event_type,trace_id,metadata_json,created_at) VALUES(?,?,?,?,?,?)').bind(ID('evt'),order.id,status==='fulfilled'?'order.fulfilled':'order.processing',order.id,JSON.stringify({from:S(order.fulfillment_status).toLowerCase()||null,to:status,at:t}),t).run()}catch(err){console.error('REQOO fulfillment audit v10:',err)}
    return J({ok:true,status,order:{id:fresh.id,orderNo:fresh.order_no,payment_status:fresh.payment_status,fulfillment_status:fresh.fulfillment_status,updated_at:fresh.updated_at}});
  }catch(err){console.error('REQOO fulfillment status v10:',err);return J({ok:false,error:err?.message||String(err)},500)}
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  const d=await data(request),action=S(d.action),status=S(d.status).toLowerCase();
  if(action==='status'&&(status==='processing'||status==='fulfilled'))return setFulfillment(request,d,env,status);
  return legacy({request,env});
}
