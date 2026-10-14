import {parseBillplzCallback, verifyBillplzCallback, verifyBillplzRedirect, matchesBillplzPayment} from '../functions/api/billplz-core.js';
import { onRequest as legacy } from './shop-flow-v4.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Reqoo-Customer-Token,Authorization','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const R=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});

async function data(request){
  const q=Object.fromEntries(new URL(request.url).searchParams);
  if(request.method==='GET')return q;
  try{return {...q,...await request.clone().json()}}catch{return q}
}

async function listProductImages(d,env){
  const productId=S(d.productId);
  if(!productId)return R({ok:false,error:'Product id diperlukan'},400);
  const product=await env.DB.prepare("SELECT id,status FROM products WHERE id=? LIMIT 1").bind(productId).first();
  if(!product||product.status!=='active')return R({ok:false,error:'Produk tidak dijumpai'},404);
  const rows=(await env.DB.prepare('SELECT url,alt_text,sort_order,is_cover FROM product_images WHERE product_id=? ORDER BY is_cover DESC,sort_order,id').bind(productId).all()).results||[];
  return R({ok:true,productId,images:rows.map(x=>({url:x.url,alt:x.alt_text||'',cover:!!x.is_cover,sortOrder:Number(x.sort_order||0)}))});
}


async function billplzCallback(request,env) {
  const data=await parseBillplzCallback(request);
  if(!data)return R({ok:false,error:'Invalid callback format'},400);
  const v=await verifyBillplzCallback(data,env);
  if(!v.valid)return R({ok:false,error:'Invalid X Signature'},401);
  const payment=await env.DB.prepare(
    "SELECT p.*,o.total_minor,o.payment_status,o.customer_id FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.provider='billplz' AND p.provider_reference=? LIMIT 1"
  ).bind(v.billId).first();
  if(!payment)return R({ok:false,error:'Unknown bill'},404);
  if(!v.paid)return R({ok:true});
  if(!matchesBillplzPayment(v,payment,env)||Number(payment.total_minor)!==Number(payment.amount_minor))
    return R({ok:false,error:'Bill amount or collection mismatch'},409);
  if(payment.status==='paid')return R({ok:true});
  if(payment.status!=='pending'||payment.payment_status==='paid')return R({ok:false,error:'Order is not pending'},409);
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE payments SET status='paid',paid_at=?,updated_at=? WHERE id=? AND provider='billplz' AND status='pending'").bind(now,now,payment.id),
    env.DB.prepare("UPDATE orders SET payment_status='paid',updated_at=? WHERE id=? AND payment_status='pending'").bind(now,payment.order_id),
    env.DB.prepare("INSERT INTO activity_events(id,customer_id,order_id,event_type,trace_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)")
      .bind('evt_'+crypto.randomUUID(),payment.customer_id,payment.order_id,'payment.paid',payment.order_id,JSON.stringify({provider:'billplz',billId:v.billId}),now)
  ]);
  return R({ok:true});
}

async function billplzRedirect(params,env) {
  const v=await verifyBillplzRedirect(params,env);
  const payment=v.valid&&v.billId
    ?await env.DB.prepare("SELECT p.status,p.amount_minor,o.order_no,o.currency FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.provider='billplz' AND p.provider_reference=? LIMIT 1").bind(v.billId).first()
    :null;
  const url=new URL('https://shop.reqoo.co/');
  const paid=payment?.status==='paid';
  url.searchParams.set('payment',paid?'success':'pending');
  if(payment?.order_no)url.searchParams.set('order',payment.order_no);
  if(paid) {
    url.searchParams.set('value',(Number(payment.amount_minor)/100).toFixed(2));
    url.searchParams.set('currency',payment.currency||'MYR');
  }
  return new Response(null,{status:302,headers:{Location:url.toString(),'cache-control':'no-store'}});
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  if(!env.DB)return R({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  const d=await data(request),action=S(d.action);
  try{
    if(action==='billplzCallback')return billplzCallback(request,env);
    if(action==='billplzRedirect')return billplzRedirect(d,env);
    if(action==='listProductImages')return listProductImages(d,env);
    return legacy({request,env});
  }catch(err){console.error('REQOO shop gallery flow:',err);return R({ok:false,error:err?.message||String(err)},500)}
}
