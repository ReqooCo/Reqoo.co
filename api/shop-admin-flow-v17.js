import { onRequest as legacy } from './shop-admin-flow-v16.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
const DATA_IMAGE=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i;
async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
async function repairProductImages(env){
  const rows=(await env.DB.prepare("SELECT id,product_id,url FROM product_images WHERE url LIKE 'data:image/%;base64,%' ORDER BY created_at LIMIT 100").all()).results||[];
  if(!rows.length)return J({ok:true,converted:0,remaining:false});
  const updates=[];let converted=0,skipped=0;
  for(const row of rows){
    try{
      const match=S(row.url).match(DATA_IMAGE);if(!match){skipped++;continue}
      const raw=atob(match[2].replace(/\s/g,''));if(!raw.length||raw.length>10*1024*1024){skipped++;continue}
      const type=match[1].toLowerCase(),ext=type==='image/jpeg'?'jpg':type.split('/')[1],product=String(row.product_id||'product').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,80)||'product';
      const key=`products/${product}/${crypto.randomUUID()}.${ext}`;
      await env.MEDIA.put(key,Uint8Array.from(raw,c=>c.charCodeAt(0)),{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{productId:S(row.product_id),source:'legacy-data-url-repair'}});
      updates.push(env.DB.prepare('UPDATE product_images SET url=? WHERE id=? AND url=?').bind(`/api/product-image?key=${encodeURIComponent(key)}`,row.id,row.url));converted++;
    }catch(error){console.error('REQOO image repair row:',row.id,error);skipped++}
  }
  if(updates.length)await env.DB.batch(updates);
  const remaining=!!(await env.DB.prepare("SELECT id FROM product_images WHERE url LIKE 'data:image/%;base64,%' LIMIT 1").first());
  return J({ok:true,converted,skipped,remaining});
}
export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  const d=await data(request),action=S(d.action);
  if(action!=='repairProductImages')return legacy({request,env});
  if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
  if(!env.DB||!env.MEDIA)return J({ok:false,error:'Database atau storage gambar belum tersedia'},503);
  try{return await repairProductImages(env)}catch(error){console.error('REQOO image repair:',error);return J({ok:false,error:'Gambar lama belum dapat dipulihkan'},500)}
}
