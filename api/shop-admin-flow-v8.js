import { onRequest as legacy } from './shop-admin-flow-v7.js';
const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim(),ID=p=>`${p}_${crypto.randomUUID()}`,NOW=()=>new Date().toISOString();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
function auth(request,env,data){const supplied=S(request.headers.get('X-Admin-Token')||data.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
async function body(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function safe(v){return S(v).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'product'}
async function persistImageUrl(url,productId,env){
  url=S(url);if(!url||!url.startsWith('data:'))return url;
  if(!env.MEDIA)throw Error('MEDIA R2 binding belum tersedia untuk menyimpan gambar produk');
  const m=url.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);if(!m)throw Error('Format gambar produk tidak disokong');
  const type=m[1].toLowerCase(),ext=type==='image/jpeg'?'jpg':type.split('/')[1],raw=atob(m[2]);
  if(raw.length>10*1024*1024)throw Error('Saiz gambar maksimum 10 MB');
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),key=`products/${safe(productId)}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{productId,originalName:`product.${ext}`}});
  return `/api/product-image?key=${encodeURIComponent(key)}`;
}
async function saveImages(request,d,env){
  if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
  const productId=S(d.productId),incomingRaw=Array.isArray(d.images)?d.images.map(S).filter(Boolean):[];
  if(!productId)return J({ok:false,error:'Product id diperlukan'},400);
  const product=await env.DB.prepare('SELECT id,name FROM products WHERE id=?').bind(productId).first();if(!product)return J({ok:false,error:'Produk tidak dijumpai'},404);
  const existing=(await env.DB.prepare('SELECT url FROM product_images WHERE product_id=? ORDER BY is_cover DESC,sort_order,id').bind(productId).all()).results||[],existingUrls=existing.map(x=>S(x.url)).filter(Boolean),existingSet=new Set(existingUrls);
  const normalized=[];for(const url of incomingRaw)normalized.push(await persistImageUrl(url,productId,env));
  const fresh=normalized.filter((u,i)=>u&&!existingSet.has(u)&&normalized.indexOf(u)===i),ordered=fresh.length?[...fresh,...normalized.filter(u=>!fresh.includes(u)),...existingUrls]:[...normalized,...existingUrls];
  const images=[...new Set(ordered.filter(Boolean))].slice(0,12),t=NOW();
  await env.DB.prepare('DELETE FROM product_images WHERE product_id=?').bind(productId).run();
  for(let i=0;i<images.length;i++)await env.DB.prepare('INSERT INTO product_images(id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES(?,?,?,?,?,?,?)').bind(ID('img'),productId,images[i],product.name,i,i===0?1:0,t).run();
  return J({ok:true,productId,count:images.length,images:images.map((url,i)=>({url,cover:i===0}))});
}
export async function onRequest({request,env}){if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});const d=await body(request);if(S(d.action)==='saveImages'){if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);try{return await saveImages(request,d,env)}catch(e){console.error(e);return J({ok:false,error:e?.message||String(e)},500)}}return legacy({request,env});}
