import { onRequest as legacy } from './shop-admin-flow-v4.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const ID=p=>`${p}_${crypto.randomUUID()}`;
const NOW=()=>new Date().toISOString();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});

async function data(request){
  if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);
  try{return await request.clone().json()}catch{return {}};
}
function auth(request,env,d){
  const supplied=S(request.headers.get('X-Admin-Token')||d.token);
  const expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);
  return !!supplied&&supplied===expected;
}
async function audit(env,orderId,type,meta={}){
  return env.DB.prepare('INSERT INTO activity_events(id,order_id,event_type,trace_id,metadata_json,created_at) VALUES(?,?,?,?,?,?)')
    .bind(ID('evt'),orderId,type,orderId,JSON.stringify(meta),NOW()).run();
}

async function rejectPayment(request,d,env){
  if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
  if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  const key=S(d.orderId||d.orderRef||d.orderNo);
  if(!key)return J({ok:false,error:'Order diperlukan'},400);
  try{
    const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? OR order_no=? LIMIT 1').bind(key,key).first();
    if(!order)return J({ok:false,error:'Order tidak dijumpai'},404);
    const state=S(order.payment_status).toLowerCase();
    if(state==='paid')return J({ok:false,error:'Bayaran yang telah disahkan tidak boleh ditolak melalui aliran ini'},409);

    const restored=await env.DB.prepare("SELECT id FROM activity_events WHERE order_id=? AND event_type='stock.restored.payment_rejected' LIMIT 1").bind(order.id).first();
    const t=NOW();
    if(!restored){
      const items=(await env.DB.prepare('SELECT variation_id,quantity,variation_snapshot_json FROM order_items WHERE order_id=?').bind(order.id).all()).results||[];
      const stmts=[];
      for(const item of items){
        if(item.variation_id){
          const variant=await env.DB.prepare('SELECT id,stock_tracking,stock_qty FROM product_variations WHERE id=? LIMIT 1').bind(item.variation_id).first();
          if(variant&&Number(variant.stock_tracking)===1&&variant.stock_qty!==null){
            stmts.push(env.DB.prepare('UPDATE product_variations SET stock_qty=stock_qty+?,updated_at=? WHERE id=?').bind(Math.max(0,Number(item.quantity||0)),t,item.variation_id));
          }
        }
        let snap={};try{snap=JSON.parse(item.variation_snapshot_json||'{}')}catch{}
        if(snap.promoId)stmts.push(env.DB.prepare('UPDATE promotions SET usage_count=MAX(0,usage_count-1),updated_at=? WHERE id=?').bind(t,S(snap.promoId)));
      }
      stmts.push(env.DB.prepare("UPDATE orders SET payment_status='failed',fulfillment_status='cancelled',updated_at=? WHERE id=?").bind(t,order.id));
      stmts.push(env.DB.prepare("UPDATE payments SET status='failed',updated_at=? WHERE order_id=? AND status!='paid'").bind(t,order.id));
      stmts.push(env.DB.prepare('INSERT INTO activity_events(id,order_id,event_type,trace_id,metadata_json,created_at) VALUES(?,?,?,?,?,?)').bind(ID('evt'),order.id,'stock.restored.payment_rejected',order.id,JSON.stringify({reason:S(d.reason),at:t}),t));
      await env.DB.batch(stmts);
      try{await audit(env,order.id,'payment.rejected',{reason:S(d.reason),at:t,stockRestored:true})}catch(err){console.error('REQOO reject audit:',err)}
      return J({ok:true,status:'FAILED',stockRestored:true});
    }

    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET payment_status='failed',fulfillment_status='cancelled',updated_at=? WHERE id=?").bind(t,order.id),
      env.DB.prepare("UPDATE payments SET status='failed',updated_at=? WHERE order_id=? AND status!='paid'").bind(t,order.id)
    ]);
    return J({ok:true,status:'FAILED',stockRestored:false,already:true});
  }catch(err){
    console.error('REQOO rejectPayment v6:',err);
    return J({ok:false,error:err?.message||String(err)},500);
  }
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  const d=await data(request);
  if(S(d.action)==='rejectPayment')return rejectPayment(request,d,env);
  return legacy({request,env});
}
