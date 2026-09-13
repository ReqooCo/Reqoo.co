import { onRequest as legacy } from './shop-admin-flow-v14.js';
const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
const orderNo=o=>S(o.order_no)||`RQ-${String(o.id||'').replace(/[^A-Za-z0-9]/g,'').slice(-12).toUpperCase()}`;
function mapOrder(o){return {...o,orderNo:orderNo(o),order_ref:orderNo(o),name:o.customer_name||'',total:Number(o.total_minor||0)/100,status:o.fulfillment_status,payment:o.payment_status,timestamp:o.created_at}}
async function dashboardSummary(env){
  const [kpi,repeat,due,trend,latest,pending,dueCounts]=await Promise.all([
    env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN payment_status='paid' AND created_at>=datetime('now','-30 days') THEN total_minor ELSE 0 END),0) paid_revenue_30, SUM(CASE WHEN payment_status='paid' AND created_at>=datetime('now','-30 days') THEN 1 ELSE 0 END) paid_orders_30, SUM(CASE WHEN payment_status NOT IN ('paid','failed','cancelled','refunded') AND fulfillment_status!='cancelled' THEN 1 ELSE 0 END) pending_count, SUM(CASE WHEN fulfillment_status='processing' AND payment_status NOT IN ('failed','cancelled','refunded') THEN 1 ELSE 0 END) processing_count FROM orders`).first(),
    env.DB.prepare(`SELECT COUNT(*) n FROM (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL AND payment_status NOT IN ('failed','cancelled','refunded') GROUP BY customer_id HAVING COUNT(*)>1)`).first(),
    env.DB.prepare(`SELECT m.order_id,m.due_date,m.priority,m.assigned_to,o.order_no,o.total_minor,o.payment_status,o.fulfillment_status,c.name customer_name FROM shop_production_meta m JOIN orders o ON o.id=m.order_id LEFT JOIN customers c ON c.id=o.customer_id WHERE o.fulfillment_status='processing' AND o.payment_status NOT IN ('failed','cancelled','refunded') AND m.due_date IS NOT NULL AND m.due_date<=date('now') ORDER BY m.due_date ASC,CASE m.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END LIMIT 12`).all(),
    env.DB.prepare(`SELECT strftime('%Y-%m',created_at) month,SUM(total_minor) revenue_minor FROM orders WHERE payment_status='paid' AND created_at>=date('now','start of month','-5 months') GROUP BY month ORDER BY month`).all(),
    env.DB.prepare(`SELECT o.*,c.name customer_name,c.phone,c.email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 8`).all(),
    env.DB.prepare(`SELECT o.*,c.name customer_name,c.phone,c.email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.payment_status NOT IN ('paid','failed','cancelled','refunded') AND o.fulfillment_status!='cancelled' ORDER BY o.created_at DESC LIMIT 6`).all(),
    env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN m.due_date=date('now') THEN 1 ELSE 0 END),0) due_today, COALESCE(SUM(CASE WHEN m.due_date<date('now') THEN 1 ELSE 0 END),0) overdue FROM shop_production_meta m JOIN orders o ON o.id=m.order_id WHERE o.fulfillment_status='processing' AND o.payment_status NOT IN ('failed','cancelled','refunded') AND m.due_date IS NOT NULL`).first()
  ]);
  const dueRows=due?.results||[],today=new Date().toISOString().slice(0,10);
  return J({ok:true,kpis:{paid_revenue_30:Number(kpi?.paid_revenue_30||0),paid_orders_30:Number(kpi?.paid_orders_30||0),pending_count:Number(kpi?.pending_count||0),processing_count:Number(kpi?.processing_count||0),repeat_customers:Number(repeat?.n||0),due_today:Number(dueCounts?.due_today||0),overdue:Number(dueCounts?.overdue||0)},due:dueRows.map(x=>({...x,orderNo:orderNo(x),name:x.customer_name||'',total:Number(x.total_minor||0)/100})),trend:trend?.results||[],latest:(latest?.results||[]).map(mapOrder),pending:(pending?.results||[]).map(mapOrder)});
}
async function productsDashboard(env){
  const [pr,vr,ir,sr]=await Promise.all([
    env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all(),
    env.DB.prepare('SELECT * FROM product_variations ORDER BY created_at').all(),
    env.DB.prepare('SELECT * FROM product_images ORDER BY is_cover DESC,sort_order,id').all(),
    env.DB.prepare(`SELECT oi.product_id,MAX(oi.product_name_snapshot) product_name,SUM(oi.quantity) units_sold,SUM(oi.line_total_minor) revenue_minor,COUNT(DISTINCT oi.order_id) paid_orders,MAX(o.created_at) last_sale_at FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.payment_status='paid' GROUP BY oi.product_id ORDER BY revenue_minor DESC`).all()
  ]);
  const p=pr?.results||[],v=vr?.results||[],im=ir?.results||[];
  const products=p.map(x=>{const image=im.find(y=>y.product_id===x.id)?.url||'';return{id:x.id,sku:x.sku||'',name:x.name,category:x.category||x.product_type,productType:x.product_type,description:x.description||'',desc:x.short_description||x.description||'',image,imageUrl:image,basePrice:Number(x.base_price_minor||0)/100,active:x.status==='active',status:x.status,variants:v.filter(y=>y.product_id===x.id).map(y=>({id:y.id,name:y.name,sku:y.sku||'',price:Number((y.sale_price_minor??y.price_minor)||0)/100,priceMinor:Number(y.price_minor||0),salePrice:y.sale_price_minor==null?null:Number(y.sale_price_minor)/100,stock:y.stock_qty,active:y.status==='active',image:y.image_url||''}))}});
  return J({ok:true,products,insights:sr?.results||[]});
}
export async function onRequest({request,env}){if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});const d=await data(request),action=S(d.action);if(action==='dashboardSummary'||action==='productsDashboard'){if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);try{return await (action==='dashboardSummary'?dashboardSummary(env):productsDashboard(env))}catch(e){console.error('REQOO admin v15:',e);return J({ok:false,error:e?.message||String(e)},500)}}return legacy({request,env});}