import { onRequest as legacy } from './shop-admin-flow-v7.js';
const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim(),ID=p=>`${p}_${crypto.randomUUID()}`,NOW=()=>new Date().toISOString();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
function auth(request,env,data){const supplied=S(request.headers.get('X-Admin-Token')||data.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
async function body(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
const DATA_IMAGE=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i;
async function persistImage(value,productId,env){
  const url=S(value),match=url.match(DATA_IMAGE);
  if(!match){
    try{const parsed=new URL(url,'https://api.reqoo.co');if(['http:','https:'].includes(parsed.protocol))return url}catch{}
    throw Error('URL gambar tidak sah');
  }
  if(!env.MEDIA)throw Error('Storage gambar belum tersedia');
  const raw=atob(match[2].replace(/\s/g,''));
  if(!raw.length||raw.length>10*1024*1024)throw Error('Saiz gambar tidak sah atau melebihi 10MB');
  const type=match[1].toLowerCase(),ext=type==='image/jpeg'?'jpg':type.split('/')[1];
  const safeProduct=productId.replace(/[^A-Za-z0-9_-]/g,'_').slice(0,80)||'product';
  const key=`products/${safeProduct}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key,Uint8Array.from(raw,c=>c.charCodeAt(0)),{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{productId,source:'admin-products'}});
  return `/api/product-image?key=${encodeURIComponent(key)}`;
}
async function saveImages(request,d,env){
  if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
  const productId=S(d.productId),raw=Array.isArray(d.images)?d.images.map(S).filter(Boolean):[];
  if(!productId)return J({ok:false,error:'Product id diperlukan'},400);
  const product=await env.DB.prepare('SELECT id,name FROM products WHERE id=?').bind(productId).first();
  if(!product)return J({ok:false,error:'Produk tidak dijumpai'},404);
  const incoming=[];for(const value of raw)incoming.push(await persistImage(value,productId,env));
  const existing=(await env.DB.prepare('SELECT url FROM product_images WHERE product_id=? ORDER BY is_cover DESC,sort_order,id').bind(productId).all()).results||[];
  const replace=d.replace===true||S(d.mode).toLowerCase()==='replace';
  const preserved=replace?[]:existing.map(x=>S(x.url)).filter(url=>url&&!raw.includes(url));
  const images=[...new Set([...incoming,...preserved])].slice(0,12),t=NOW();
  const statements=[env.DB.prepare('DELETE FROM product_images WHERE product_id=?').bind(productId),...images.map((url,i)=>env.DB.prepare('INSERT INTO product_images(id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES(?,?,?,?,?,?,?)').bind(ID('img'),productId,url,product.name,i,i===0?1:0,t))];
  if(typeof env.DB.batch==='function')await env.DB.batch(statements);
  else for(const statement of statements)await statement.run();
  return J({ok:true,productId,count:images.length,images:images.map((url,i)=>({url,cover:i===0}))});
}
export async function onRequest({request,env}){if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});const d=await body(request);if(S(d.action)==='saveImages'){if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);try{return await saveImages(request,d,env)}catch(e){console.error(e);return J({ok:false,error:e?.message||String(e)},500)}}return legacy({request,env});}
