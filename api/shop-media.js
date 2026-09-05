const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const ID=p=>`${p}_${crypto.randomUUID()}`;
const NOW=()=>new Date().toISOString();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
function auth(r,e,d){const t=S(r.headers.get('X-Admin-Token')||d.token);return !!t&&t===S(e.REQOO_ADMIN_TOKEN||e.SHOP_ADMIN_TOKEN||e.ADMIN_KEY)}
async function body(r){if(r.method==='GET')return Object.fromEntries(new URL(r.url).searchParams);try{return await r.json()}catch{return {}}}
export async function onRequest({request,env}){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
 if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
 const d=await body(request),a=S(d.action||'listImages'),pid=S(d.productId);
 try{
  if(a==='listImages'){
   if(!pid)return J({ok:false,error:'productId diperlukan'},400);
   const p=await env.DB.prepare("SELECT id,status FROM products WHERE id=? LIMIT 1").bind(pid).first();
   if(!p||p.status!=='active')return J({ok:false,error:'Produk tidak dijumpai'},404);
   const rows=(await env.DB.prepare('SELECT id,url,alt_text,sort_order,is_cover FROM product_images WHERE product_id=? ORDER BY is_cover DESC,sort_order,id').bind(pid).all()).results||[];
   return J({ok:true,images:rows.map(x=>({id:x.id,url:x.url,alt:x.alt_text||'',sortOrder:Number(x.sort_order||0),cover:!!x.is_cover}))});
  }
  if(a==='variantImages'){
   if(!pid)return J({ok:false,error:'productId diperlukan'},400);
   const p=await env.DB.prepare("SELECT id,status FROM products WHERE id=? LIMIT 1").bind(pid).first();
   if(!p||p.status!=='active')return J({ok:false,error:'Produk tidak dijumpai'},404);
   const rows=(await env.DB.prepare("SELECT id,name,price_minor,sale_price_minor,image_url,status FROM product_variations WHERE product_id=? AND status='active' ORDER BY created_at,name").bind(pid).all()).results||[];
   return J({ok:true,variants:rows.map(x=>({id:x.id,name:x.name,price:Number(x.sale_price_minor??x.price_minor??0)/100,image:x.image_url||''}))});
  }
  if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
  if(a==='saveImages'){
   if(!pid||!Array.isArray(d.images))return J({ok:false,error:'productId/images diperlukan'},400);
   const p=await env.DB.prepare('SELECT id FROM products WHERE id=? LIMIT 1').bind(pid).first();if(!p)return J({ok:false,error:'Produk tidak dijumpai'},404);
   const images=d.images.map(x=>S(typeof x==='string'?x:x?.url)).filter(Boolean).slice(0,12);
   await e.DB.prepare('DELETE FROM product_images WHERE product_id=?').bind(pid).run();
   const t=NOW();let i=0;for(const url of images){await env.DB.prepare('INSERT INTO product_images(id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES(?,?,?,?,?,?,?)').bind(ID('img'),pid,S(d.altText)||'',i,i===0?1:0,t).run();i++}
   return J({ok:true,productId:pid,count:images.length});
  }
  return J({ok:false,error:'Action tidak dikenali'},400);
 }catch(e){console.error(e);return J({ok:false,error:e?.message||String(e)},500)}
}