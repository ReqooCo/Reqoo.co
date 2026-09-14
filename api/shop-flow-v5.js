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

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  if(!env.DB)return R({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  const d=await data(request),action=S(d.action);
  try{
    if(action==='listProductImages')return listProductImages(d,env);
    return legacy({request,env});
  }catch(err){console.error('REQOO shop gallery flow:',err);return R({ok:false,error:err?.message||String(err)},500)}
}
