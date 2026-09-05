import { onRequest as legacy } from './shop-admin-flow-v2.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const ID=p=>`${p}_${crypto.randomUUID()}`;
const NOW=()=>new Date().toISOString();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});

function auth(request,env,data){const supplied=S(request.headers.get('X-Admin-Token')||data.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
async function body(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.json()}catch{return {}}}

async function saveProduct(d,env){
  const pid=S(d.id)||ID('prd'),t=NOW(),old=await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(pid).first(),name=S(d.name);
  if(!name)return J({ok:false,error:'Nama produk diperlukan'},400);
  const type=S(d.productType||old?.product_type||'physical'),ful=S(d.fulfillmentType||old?.fulfillment_type||'physical_shipping');
  const status=d.active===false?'hidden':S(d.status||old?.status||'active');
  const base=d.basePriceMinor!=null?Number(d.basePriceMinor):Math.round(Number(d.basePrice||0)*100);
  const category=S(d.category||old?.category||'');
  if(old){
    await env.DB.prepare('UPDATE products SET sku=?,name=?,slug=?,product_type=?,fulfillment_type=?,description=?,short_description=?,base_price_minor=?,sale_price_minor=?,currency=?,status=?,category=?,updated_at=? WHERE id=?').bind(S(d.sku||old.sku)||null,name,S(d.slug??old.slug)||null,type,ful,S(d.description??old.description)||null,S(d.shortDescription??old.short_description)||null,base,d.salePriceMinor==null?(old?.sale_price_minor??null):Number(d.salePriceMinor),S(d.currency||old.currency||'MYR'),status,category,t,pid).run();
  }else{
    await env.DB.prepare('INSERT INTO products(id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,category,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(pid,S(d.sku)||null,name,S(d.slug)||null,type,ful,S(d.description),S(d.shortDescription||d.desc),base,d.salePriceMinor==null?null:Number(d.salePriceMinor),S(d.currency||'MYR'),status,category,t,t).run();
  }
  if(Array.isArray(d.variants)) await syncVariants(d,env,pid,t,base);
  return J({ok:true,productId:pid});
}

async function syncVariants(d,env,pid,t,base){
  const existing=(await env.DB.prepare('SELECT id,name FROM product_variations WHERE product_id=?').bind(pid).all()).results||[];
  const byId=new Map(existing.map(x=>[x.id,x])),byName=new Map(existing.map(x=>[S(x.name).toLowerCase(),x])),seen=new Set();
  const incoming=Array.isArray(d.variants)?d.variants.filter(x=>S(Array.isArray(x)?x[0]:x?.name)):[];
  const rows=incoming.length?incoming:[{name:'Standard',price:Number(base||0)/100}];
  for(const raw of rows){
    const x=Array.isArray(raw)?{name:raw[0],price:raw[1]}:raw||{},name=S(x.name)||'Standard';
    const match=(x.id&&byId.get(S(x.id)))||byName.get(name.toLowerCase());
    const pm=x.priceMinor!=null?Number(x.priceMinor):Math.round(Number(x.price||0)*100);
    const sm=x.salePriceMinor==null?(x.salePrice==null?null:Math.round(Number(x.salePrice)*100)):Number(x.salePriceMinor);
    const stock=x.stock==null||x.stock===''?null:Number(x.stock),stockTracking=stock!==null?1:0,img=S(x.imageUrl||x.image);
    if(match){
      seen.add(match.id);
      await env.DB.prepare('UPDATE product_variations SET sku=?,name=?,attributes_json=?,price_minor=?,sale_price_minor=?,stock_qty=?,stock_tracking=?,image_url=?,status=?,updated_at=? WHERE id=? AND product_id=?').bind(S(x.sku)||null,name,JSON.stringify(x.attributes||{}),pm,sm,stock,stockTracking,img||null,x.active===false?'hidden':'active',t,match.id,pid).run();
    }else{
      const vid=ID('var');seen.add(vid);
      await env.DB.prepare('INSERT INTO product_variations(id,product_id,sku,name,attributes_json,price_minor,sale_price_minor,stock_qty,stock_tracking,image_url,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(vid,pid,S(x.sku)||null,name,JSON.stringify(x.attributes||{}),pm,sm,stock,stockTracking,img||null,x.active===false?'hidden':'active',t,t).run();
    }
  }
  for(const x of existing)if(!seen.has(x.id))await env.DB.prepare("UPDATE product_variations SET status='hidden',updated_at=? WHERE id=? AND product_id=?").bind(t,x.id,pid).run();
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  const data=await body(request);
  if(S(data.action)==='saveProduct'){
    if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
    if(!auth(request,env,data))return J({ok:false,error:'Unauthorized'},401);
    try{return await saveProduct(data,env)}catch(e){console.error(e);return J({ok:false,error:e?.message||String(e)},500)}
  }
  return legacy({request,env});
}