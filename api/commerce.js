// Public agent-commerce contract. Never exposes customer, order or internal product records.
import {onRequest as shopQuote} from './shop-flow-v3.js';
const SHOP='https://shop.reqoo.co', API=SHOP+'/api/commerce';
const headers={'content-type':'application/json;charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','x-content-type-options':'nosniff'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pageUrl=id=>`${SHOP}/products/${encodeURIComponent(id)}`;
const checkout=(id,variant,qty=1)=>`${SHOP}/?product=${encodeURIComponent(id)}&variant=${encodeURIComponent(variant)}&qty=${qty}`;
const safeImage=s=>{try{const u=new URL(s,SHOP);return s&&u.protocol==='https:'?u.href:null}catch{return null}};
const policies={returns:{status:'not_published',instruction:'Confirm return/refund terms with REQOO before purchase.'},deliveryTime:{status:'not_published'},ratings:{status:'not_available'},customization:{fields:['nameText','note','artwork'],instruction:'Confirm artwork, personalization and deadline in the customer checkout.'}};
export const discovery={name:'REQOO Commerce',version:'1.0',documentation:SHOP+'/agents',openapi:API+'/openapi.json',catalog:API+'/products',shipping:API+'/shipping',quote:API+'/quote',capabilities:['search_products','check_stock','compare_prices','quote_order','customer_checkout_handoff'],checkout:{mode:'customer_confirmation',createsOrder:false,reservesStock:false},notes:['Public read-only catalogue and quote calculations.','No automatic purchase, payment, reservation or private order access.','Untracked stock is unknown, not unlimited.','Final totals and availability are revalidated at checkout.','No automatic registration with AI shopping platforms is implied.']};
async function catalog(env){
 const now=new Date().toISOString();
 const result=await env.DB.prepare(`SELECT p.id product_id,p.name product_name,p.description,p.product_type,p.fulfillment_type,p.sku product_sku,p.base_price_minor,v.id variant_id,v.name variant_name,v.sku variant_sku,v.stock_qty,v.image_url,
 COALESCE(v.sale_price_minor,v.price_minor,0) variant_price,
 (SELECT url FROM product_images WHERE product_id=p.id ORDER BY is_cover DESC,sort_order,id LIMIT 1) product_image,
 (SELECT promo_price_minor FROM promotions WHERE active=1 AND product_id=p.id AND variant=v.name AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) AND (usage_limit IS NULL OR usage_count<usage_limit) ORDER BY created_at DESC LIMIT 1) promo_price
 FROM products p JOIN product_variations v ON v.product_id=p.id WHERE p.status='active' AND v.status='active' ORDER BY p.id,v.id`).bind(now,now).all();
 const products=new Map();
 for(const row of result.results||[]){
  let price=Number(row.variant_price);if(price<=0&&Number(row.base_price_minor)>0)price=Number(row.base_price_minor);
  const promo=Number(row.promo_price);if(promo>0&&promo<price)price=promo;
  price=Number.isSafeInteger(price)&&price>0?price:null;
  const qty=row.stock_qty==null?null:Number(row.stock_qty);
  let p=products.get(row.product_id);if(!p){p={id:row.product_id,name:row.product_name,description:row.description||'',sku:row.product_sku||null,productType:row.product_type,fulfillmentType:row.fulfillment_type,url:pageUrl(row.product_id),image:safeImage(row.product_image),currency:'MYR',variants:[]};products.set(p.id,p)}
  p.variants.push({id:row.variant_id,name:row.variant_name,sku:row.variant_sku||null,priceMinor:price,price:price==null?null:(price/100).toFixed(2),priceStatus:price==null?'quote_required':'listed',stock:{status:qty==null?'untracked':qty>0?'in_stock':'out_of_stock',quantity:qty},image:safeImage(row.image_url),checkoutUrl:checkout(p.id,row.variant_id)});
 }
 return [...products.values()];
}
function schema(p){return {'@context':'https://schema.org','@type':'ProductGroup',name:p.name,description:p.description,productGroupID:p.id,url:p.url,...(p.image?{image:p.image}:{}),brand:{'@type':'Brand',name:'REQOO'},hasVariant:p.variants.map(v=>({'@type':'Product',name:`${p.name} — ${v.name}`,sku:v.sku||v.id,url:v.checkoutUrl,...(v.image||p.image?{image:v.image||p.image}:{}),...(v.priceMinor!=null?{offers:{'@type':'Offer',url:v.checkoutUrl,price:v.price,priceCurrency:'MYR',...(v.stock.status!=='untracked'?{availability:'https://schema.org/'+(v.stock.status==='in_stock'?'InStock':'OutOfStock')}:{})}}:{})}))}}
function metaDescription(value){return String(value||'').replace(/\s+/g,' ').trim().slice(0,160)}
function html(title,body,structured){const description=metaDescription(structured?.description||'Katalog produk dan hadiah custom REQOO.CO di Malaysia. Semak variasi, harga dan pilihan tempahan terkini.');return new Response(`<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — REQOO</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large">${structured?`<link rel="canonical" href="${esc(structured.url)}"><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script>`:''}<style>body{font:16px/1.6 system-ui;background:#f6f5f0;color:#193d32;max-width:960px;margin:auto;padding:28px}a{color:#215b45}nav{display:flex;gap:24px}h1{font-size:clamp(28px,5vw,44px)}article{background:white;border:1px solid #d9e0d8;border-radius:18px;padding:24px;margin:20px 0}img{max-width:260px;border-radius:14px}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:12px 6px;border-bottom:1px solid #ddd}.scroll{overflow:auto}code{overflow-wrap:anywhere}.button{display:inline-block;background:#214a3b;color:white;padding:10px 18px;border-radius:8px;text-decoration:none}footer{margin:40px 0;color:#56655c}</style></head><body><nav><a href="${SHOP}/">REQOO Shop</a><a href="${SHOP}/products">Katalog</a><a href="${SHOP}/agents">Untuk AI agent</a></nav>${body}<footer>Harga dalam MYR. Harga akhir dan stok disemak semula sebelum bayaran. Tempoh siap dan polisi pulangan perlu disahkan dengan REQOO.</footer></body></html>`,{headers:{...headers,'content-type':'text/html;charset=UTF-8'}})}
export async function onRequest({request,env}){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const u=new URL(request.url),path=u.pathname.replace(/^\/api\/commerce/,'')||'/';
 try{
  if(path==='/quote'){
   if(request.method!=='POST')return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
   if(Number(request.headers.get('content-length'))>16384)return json({ok:false,error:'REQUEST_TOO_LARGE'},413);
   const raw=await request.text();if(new TextEncoder().encode(raw).length>16384)return json({ok:false,error:'REQUEST_TOO_LARGE'},413);
   let d;try{d=JSON.parse(raw)}catch{return json({ok:false,error:'INVALID_JSON'},400)}
   if(!Array.isArray(d?.items)||!d.items.length||d.items.length>50||d.items.some(i=>!i||typeof i.productId!=='string'||typeof i.variantId!=='string'||!Number.isSafeInteger(i.qty)||i.qty<1||i.qty>999))return json({ok:false,error:'INVALID_ITEMS'},400);
   if(d.shippingId!=null&&typeof d.shippingId!=='string')return json({ok:false,error:'INVALID_SHIPPING'},400);
   const items=d.items.map(({productId,variantId,qty})=>({productId,variantId,qty}));
   const response=await shopQuote({env,request:new Request(SHOP+'/api/shop',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'quoteOrder',items,shippingId:d.shippingId||''})})});
   const q=await response.json();if(!response.ok)return json({ok:false,error:response.status>=500?'QUOTE_UNAVAILABLE':q.error},response.status);
   return json({...q,currency:'MYR',shippingIncluded:!!d.shippingId,shippingStatus:d.shippingId?'selected_method':'not_selected',reservation:false,createsOrder:false,validAt:new Date().toISOString(),requiresCustomerConfirmation:true,checkoutLinks:items.map(i=>({productId:i.productId,variantId:i.variantId,qty:i.qty,url:checkout(i.productId,i.variantId,i.qty)})),note:'Open each selection, review customization and add to cart. No order or payment has been created.'});
  }
  if(request.method!=='GET')return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  if(path==='/'||path==='/discovery')return json(discovery);
  if(path==='/openapi.json')return json(openapi);
  if(path==='/guide')return html('AI agent & katalog terbuka',`<h1>Produk REQOO, sedia dibaca oleh AI.</h1><p>Cari produk, bandingkan variasi dan semak harga terus daripada katalog semasa. Pilihan akhir kekal di tangan pelanggan.</p><article><h2>Untuk pembantu belian</h2><ol><li>Cari produk melalui API katalog.</li><li>Semak harga variasi dan status stok. Stok yang tidak dijejak bukan jaminan stok tersedia.</li><li>Pilih kaedah penghantaran dan minta sebut harga.</li><li>Buka pautan pilihan produk untuk pelanggan semak, tambah ke cart dan bayar.</li></ol><a class="button" href="${SHOP}/products">Lihat katalog</a></article><article><h2>Sambungan</h2><p><a href="${API}/openapi.json">OpenAPI 3.1</a> · <a href="${API}/products">Katalog JSON</a> · <a href="${API}/shipping">Penghantaran</a> · <a href="${API}/policies">Maklumat polisi</a></p><code>GET ${API}/products?q=tumbler&amp;maxPriceMinor=5000</code><p>Harga dinyatakan dalam sen. RM50 = 5000. POST /api/commerce/quote menerima items: productId, variantId, qty serta shippingId pilihan.</p><p>API ini tidak membuat tempahan, menyimpan stok atau mengenakan bayaran. Ia bukan pendaftaran automatik dalam ChatGPT atau mana-mana platform AI.</p></article>`);
  if(path==='/policies')return json({ok:true,...policies});
  if(!env.DB)return json({ok:false,error:'SERVICE_UNAVAILABLE'},503);
  if(path==='/shipping'){
   const r=await env.DB.prepare('SELECT id,name,price_minor FROM shipping_methods WHERE active=1 ORDER BY sort_order,name').all();
   return json({ok:true,currency:'MYR',shipping:(r.results||[]).map(s=>({id:s.id,name:s.name,priceMinor:s.price_minor})),deliveryTime:null,note:'Select the method applicable to the customer destination; delivery time is not published.'});
  }
  if(path==='/products'||path.startsWith('/products/')||path==='/pages'||path.startsWith('/pages/')||path==='/sitemap.xml'){
   let products=await catalog(env);
   if(path==='/sitemap.xml')return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SHOP}/products</loc></url>${products.map(p=>`<url><loc>${esc(p.url)}</loc></url>`).join('')}</urlset>`,{headers:{...headers,'content-type':'application/xml;charset=UTF-8'}});
   if(path.startsWith('/products/')||path.startsWith('/pages/')){
    const id=decodeURIComponent(path.split('/')[2]),p=products.find(p=>p.id===id);if(!p)return json({ok:false,error:'PRODUCT_NOT_FOUND'},404);
    if(path.startsWith('/products/'))return json({ok:true,asOf:new Date().toISOString(),product:p,policies});
    return html(p.name,`<h1>${esc(p.name)}</h1>${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:''}<p>${esc(p.description)}</p><article><h2>Pilihan & harga</h2><div class="scroll"><table><thead><tr><th>Variasi</th><th>Harga</th><th>Stok</th><th></th></tr></thead><tbody>${p.variants.map(v=>`<tr><td>${esc(v.name)}</td><td>${v.price==null?'Minta sebut harga':'RM'+v.price}</td><td>${v.stock.quantity==null?'Sahkan semasa checkout':v.stock.quantity>0?v.stock.quantity+' unit':'Habis'}</td><td><a href="${esc(v.checkoutUrl)}">Semak pilihan</a></td></tr>`).join('')}</tbody></table></div></article>`,schema(p));
   }
   if(path==='/pages')return html('Katalog produk',`<h1>Katalog REQOO</h1><p>Produk dan variasi semasa, terus daripada sistem kedai.</p>${products.map(p=>`<article><h2><a href="${esc(p.url)}">${esc(p.name)}</a></h2><p>${esc(p.description)}</p><p>${p.variants.length} variasi</p></article>`).join('')}`);
   const q=(u.searchParams.get('q')||'').trim().toLowerCase();if(q.length>200)return json({ok:false,error:'QUERY_TOO_LONG'},400);
   const max=u.searchParams.get('maxPriceMinor'),limit=Number(u.searchParams.get('limit')||50),offset=Number(u.searchParams.get('offset')||0);
   if((max!==null&&(!Number.isSafeInteger(Number(max))||Number(max)<0))||!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(offset)||offset<0)return json({ok:false,error:'INVALID_FILTER'},400);
   products=products.map(p=>({...p,variants:p.variants.filter(v=>(!q||`${p.name} ${p.description} ${v.name}`.toLowerCase().includes(q))&&(max===null||v.priceMinor!=null&&v.priceMinor<=Number(max)))})).filter(p=>p.variants.length);
   return json({ok:true,currency:'MYR',asOf:new Date().toISOString(),total:products.length,offset,limit,products:products.slice(offset,offset+limit),nextOffset:offset+limit<products.length?offset+limit:null,policies});
  }
  return json({ok:false,error:'NOT_FOUND'},404);
 }catch{return json({ok:false,error:'COMMERCE_UNAVAILABLE'},503)}
}
const response={description:'JSON response',content:{'application/json':{schema:{type:'object'}}}};
export const openapi={openapi:'3.1.0',info:{title:'REQOO public commerce API',version:'1.0.0',description:'Live catalogue and read-only quotes. No orders, reservations or payments are created. Prices are integer MYR sen. Unknown policies and untracked stock must not be invented.'},servers:[{url:API}],paths:{
 '/products':{get:{operationId:'search_products',summary:'Search and compare active product variants',parameters:[{name:'q',in:'query',schema:{type:'string',maxLength:200}},{name:'maxPriceMinor',in:'query',schema:{type:'integer',minimum:0}},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:50}},{name:'offset',in:'query',schema:{type:'integer',minimum:0,default:0}}],responses:{200:response,400:response}}},
 '/products/{id}':{get:{operationId:'check_stock',summary:'Get current variants, prices and stock; untracked means unknown',parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],responses:{200:response,404:response}}},
 '/shipping':{get:{operationId:'list_shipping',responses:{200:response}}},'/policies':{get:{operationId:'get_policies',responses:{200:response}}},
 '/quote':{post:{operationId:'quote_order',summary:'Calculate using checkout rules; no order or stock reservation',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['items'],additionalProperties:false,properties:{shippingId:{type:'string'},items:{type:'array',minItems:1,maxItems:50,items:{type:'object',additionalProperties:false,required:['productId','variantId','qty'],properties:{productId:{type:'string'},variantId:{type:'string'},qty:{type:'integer',minimum:1,maximum:999}}}}}}}}},responses:{200:response,400:response,409:response,413:response,503:response}}}
}};
