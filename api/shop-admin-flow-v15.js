import { onRequest as legacy } from './shop-admin-flow-v14.js';
const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
const orderNo=o=>S(o.order_no)||`RQ-${String(o.id||'').replace(/[^A-Za-z0-9]/g,'').slice(-12).toUpperCase()}`;
function mapOrder(o){return {...o,orderNo:orderNo(o),order_ref:orderNo(o),name:o.customer_name||'',total:Number(o.total_minor||0)/100,status:o.fulfillment_status,payment:o.payment_status,timestamp:o.created_at}}
async function safeFirst(stmt,fallback=null){try{return await stmt.first()}catch{return fallback}}
async function safeAll(stmt,fallback=[]){try{return (await stmt.all())?.results||fallback}catch{return fallback}}
function myDate(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`}
function dateDays(from,to){const a=String(from||'').slice(0,10).split('-').map(Number),b=String(to||'').slice(0,10).split('-').map(Number);if(a.length<3||b.length<3||a.some(Number.isNaN)||b.some(Number.isNaN))return null;return Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,b[2]===undefined?0:b[2]))/86400000)}
function daysBetween(from,to){const a=String(from||'').slice(0,10).split('-').map(Number),b=String(to||'').slice(0,10).split('-').map(Number);if(a.length<3||b.length<3||a.some(Number.isNaN)||b.some(Number.isNaN))return null;return Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000)}
function followupScore(x){const p=x.priority==='critical'?300000:x.priority==='high'?200000:100000;const age=Math.max(0,Number(x.age_days||x.days_overdue||0))*100;return p+age+Math.min(99999,Math.round(Number(x.amount_minor||0)/100))}
const INVOICE_DUE_CTE="WITH invoice_balance AS ("+
" SELECT d.id,d.number,d.order_id,d.due_at,d.total_minor,o.order_no,c.name customer_name,c.phone customer_phone,"+
" MAX(0,d.total_minor-COALESCE((SELECT SUM(p.amount_minor) FROM reqoo_payments p WHERE p.order_id=d.order_id AND p.status='confirmed'),0)) balance_minor,"+
" CAST(julianday(substr(d.due_at,1,10))-julianday(date('now','+8 hours')) AS INTEGER) days_to_due"+
" FROM reqoo_documents d JOIN orders o ON o.id=d.order_id LEFT JOIN customers c ON c.id=o.customer_id"+
" WHERE d.type='invoice' AND d.due_at IS NOT NULL AND o.fulfillment_status!='cancelled' AND o.payment_status NOT IN ('failed','cancelled','refunded'))";
async function dashboardSummary(env){
  const [kpi,repeat,due,trend,latest,pending,dueCounts,fallbackToday,fallbackOutstanding,recentCustomers,pendingFollowups,reactivation]=await Promise.all([
    env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN payment_status='paid' AND created_at>=datetime('now','-30 days') THEN total_minor ELSE 0 END),0) paid_revenue_30, SUM(CASE WHEN payment_status='paid' AND created_at>=datetime('now','-30 days') THEN 1 ELSE 0 END) paid_orders_30, SUM(CASE WHEN payment_status NOT IN ('paid','failed','cancelled','refunded') AND fulfillment_status!='cancelled' THEN 1 ELSE 0 END) pending_count, SUM(CASE WHEN fulfillment_status='processing' AND payment_status NOT IN ('failed','cancelled','refunded') THEN 1 ELSE 0 END) processing_count, SUM(CASE WHEN payment_status IN ('paid','partial') AND fulfillment_status IN ('pending','processing') THEN 1 ELSE 0 END) to_produce_count FROM orders`).first(),
    env.DB.prepare(`SELECT COUNT(*) n FROM (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL AND payment_status NOT IN ('failed','cancelled','refunded') GROUP BY customer_id HAVING COUNT(*)>1)`).first(),
    env.DB.prepare(`SELECT m.order_id,m.due_date,m.priority,m.assigned_to,o.order_no,o.total_minor,o.payment_status,o.fulfillment_status,c.name customer_name,c.phone customer_phone FROM shop_production_meta m JOIN orders o ON o.id=m.order_id LEFT JOIN customers c ON c.id=o.customer_id WHERE o.fulfillment_status='processing' AND o.payment_status NOT IN ('failed','cancelled','refunded') AND m.due_date IS NOT NULL AND m.due_date<=date('now','+8 hours') ORDER BY m.due_date ASC,CASE m.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END LIMIT 12`).all(),
    env.DB.prepare(`SELECT strftime('%Y-%m',created_at) month,SUM(total_minor) revenue_minor FROM orders WHERE payment_status='paid' AND created_at>=date('now','start of month','-5 months') GROUP BY month ORDER BY month`).all(),
    env.DB.prepare(`SELECT o.*,c.name customer_name,c.phone,c.email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 8`).all(),
    env.DB.prepare(`SELECT o.*,c.name customer_name,c.phone,c.email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.payment_status NOT IN ('paid','failed','cancelled','refunded') AND o.fulfillment_status!='cancelled' ORDER BY o.created_at DESC LIMIT 6`).all(),
    env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN m.due_date=date('now','+8 hours') THEN 1 ELSE 0 END),0) due_today, COALESCE(SUM(CASE WHEN m.due_date<date('now','+8 hours') THEN 1 ELSE 0 END),0) overdue FROM shop_production_meta m JOIN orders o ON o.id=m.order_id WHERE o.fulfillment_status='processing' AND o.payment_status NOT IN ('failed','cancelled','refunded') AND m.due_date IS NOT NULL`).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(total_minor),0) amount_minor,COUNT(*) n FROM orders WHERE payment_status='paid' AND date(created_at,'+8 hours')=date('now','+8 hours')`).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(total_minor),0) outstanding_minor,COUNT(*) outstanding_count FROM orders WHERE payment_status NOT IN ('paid','failed','cancelled','refunded') AND fulfillment_status!='cancelled'`).first(),
    env.DB.prepare(`SELECT c.id,c.name,c.phone,c.email,c.created_at,MAX(o.created_at) last_order_at,COUNT(o.id) order_count,COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total_minor ELSE 0 END),0) paid_value_minor FROM customers c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id,c.name,c.phone,c.email,c.created_at ORDER BY COALESCE(MAX(o.created_at),c.created_at) DESC LIMIT 6`).all(),
    env.DB.prepare(`SELECT o.id,o.order_no,o.total_minor,o.created_at,c.name customer_name,c.phone customer_phone FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.payment_status NOT IN ('paid','failed','cancelled','refunded') AND o.fulfillment_status!='cancelled' AND o.created_at<=datetime('now','-1 day') ORDER BY o.created_at ASC LIMIT 6`).all(),
    env.DB.prepare(`SELECT c.id,c.name,c.phone,c.email,MAX(o.created_at) last_order_at,COUNT(*) paid_orders,COALESCE(SUM(o.total_minor),0) paid_value_minor FROM customers c JOIN orders o ON o.customer_id=c.id WHERE o.payment_status='paid' AND c.phone IS NOT NULL AND TRIM(c.phone)<>'' GROUP BY c.id,c.name,c.phone,c.email HAVING COUNT(*)>=2 AND MAX(o.created_at)<=datetime('now','-45 days') ORDER BY MAX(o.created_at) ASC LIMIT 4`).all()
  ]);
  const ledgerToday=await safeFirst(env.DB.prepare(`SELECT COALESCE(SUM(amount_minor),0) amount_minor,COUNT(*) n FROM reqoo_payments WHERE status='confirmed' AND date(paid_at,'+8 hours')=date('now','+8 hours')`),null);
  const ledgerOutstanding=await safeFirst(env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN billing_total>paid_minor THEN billing_total-paid_minor ELSE 0 END),0) outstanding_minor,COALESCE(SUM(CASE WHEN billing_total>paid_minor THEN 1 ELSE 0 END),0) outstanding_count FROM (SELECT o.id,COALESCE((SELECT d.total_minor FROM reqoo_documents d WHERE d.order_id=o.id AND d.type='invoice' ORDER BY d.created_at,d.id LIMIT 1),o.total_minor) billing_total,COALESCE((SELECT SUM(p.amount_minor) FROM reqoo_payments p WHERE p.order_id=o.id AND p.status='confirmed'),0) paid_minor FROM orders o WHERE o.fulfillment_status!='cancelled' AND o.payment_status NOT IN ('failed','cancelled','refunded')) q`),null);
  const invoiceStats=await safeFirst(env.DB.prepare(INVOICE_DUE_CTE+" SELECT COALESCE(SUM(CASE WHEN balance_minor>0 AND days_to_due<0 THEN balance_minor ELSE 0 END),0) overdue_minor,COALESCE(SUM(CASE WHEN balance_minor>0 AND days_to_due<0 THEN 1 ELSE 0 END),0) overdue_count,COALESCE(SUM(CASE WHEN balance_minor>0 AND days_to_due BETWEEN 0 AND 7 THEN balance_minor ELSE 0 END),0) due_soon_minor,COALESCE(SUM(CASE WHEN balance_minor>0 AND days_to_due BETWEEN 0 AND 7 THEN 1 ELSE 0 END),0) due_soon_count FROM invoice_balance"),{overdue_minor:0,overdue_count:0,due_soon_minor:0,due_soon_count:0});
  const invoiceDue=await safeAll(env.DB.prepare(INVOICE_DUE_CTE+" SELECT * FROM invoice_balance WHERE balance_minor>0 AND days_to_due<=7 ORDER BY days_to_due ASC,due_at ASC,id ASC LIMIT 16"),[]);
  const today=myDate(),overdueInvoices=invoiceDue.filter(r=>Number(r.days_to_due)<0),dueSoonInvoices=invoiceDue.filter(r=>Number(r.days_to_due)>=0&&Number(r.days_to_due)<=7);
  const todayCollected=ledgerToday&&Number(ledgerToday.amount_minor||0)>0?ledgerToday:fallbackToday;
  const outstanding=ledgerOutstanding||fallbackOutstanding;
  const dueRows=due?.results||[];
  const followups=[];
  for(const r of overdueInvoices.slice(0,6))followups.push({id:`invoice:${r.id}`,kind:'invoice_overdue',priority:'critical',customer_name:r.customer_name||'Customer',phone:r.customer_phone||'',reference:r.number||r.order_no||'Invoice',order_no:r.order_no||'',amount_minor:Number(r.balance_minor||0),due_date:String(r.due_at||'').slice(0,10),days_overdue:Math.abs(Number(r.days_to_due||0)),action_url:'/admin/documents.html?order='+encodeURIComponent(r.order_id||r.order_no||'')});
  for(const r of dueSoonInvoices.slice(0,4))followups.push({id:`invoice:${r.id}`,kind:'invoice_due',priority:r.days_to_due<=1?'high':'normal',customer_name:r.customer_name||'Customer',phone:r.customer_phone||'',reference:r.number||r.order_no||'Invoice',order_no:r.order_no||'',amount_minor:Number(r.balance_minor||0),due_date:String(r.due_at||'').slice(0,10),days_to_due:Number(r.days_to_due||0),action_url:'/admin/documents.html?order='+encodeURIComponent(r.order_id||r.order_no||'')});
  for(const r of dueRows.slice(0,5)){const days=daysBetween(r.due_date,today)||0;followups.push({id:`production:${r.order_id}`,kind:days>0?'production_overdue':'production_today',priority:days>0?'critical':'high',customer_name:r.customer_name||'Customer',phone:r.customer_phone||'',reference:r.order_no||r.order_id||'Order',order_no:r.order_no||'',amount_minor:Number(r.total_minor||0),due_date:r.due_date||'',days_overdue:Math.max(0,days),assigned_to:r.assigned_to||'',action_url:'/admin/production.html?q='+encodeURIComponent(r.order_no||r.order_id||''),contactable:false})}
  for(const o of pendingFollowups?.results||[]){const age=Math.max(1,daysBetween(String(o.created_at||'').slice(0,10),today)||1);followups.push({id:`payment:${o.id}`,kind:'payment_pending',priority:age>=3?'high':'normal',customer_name:o.customer_name||'Customer',phone:o.customer_phone||'',reference:o.order_no||o.id||'Order',order_no:o.order_no||'',amount_minor:Number(o.total_minor||0),age_days:age,action_url:'/admin/orders.html?order='+encodeURIComponent(o.id||o.order_no||'')})}
  for(const c of reactivation?.results||[]){const age=Math.max(45,daysBetween(String(c.last_order_at||'').slice(0,10),today)||45);followups.push({id:`customer:${c.id}`,kind:'customer_reactivate',priority:'normal',customer_name:c.name||'Customer',phone:c.phone||'',reference:`${Number(c.paid_orders||0)} paid orders`,amount_minor:Number(c.paid_value_minor||0),age_days:age,action_url:'/admin/customers.html?customer='+encodeURIComponent(c.id||'')})}
  followups.sort((a,b)=>followupScore(b)-followupScore(a));
  const dailyFollowups=followups.slice(0,12);
  return J({
    ok:true,
    kpis:{paid_revenue_30:Number(kpi?.paid_revenue_30||0),paid_orders_30:Number(kpi?.paid_orders_30||0),pending_count:Number(kpi?.pending_count||0),processing_count:Number(kpi?.processing_count||0),to_produce_count:Number(kpi?.to_produce_count||0),repeat_customers:Number(repeat?.n||0),due_today:Number(dueCounts?.due_today||0),overdue:Number(dueCounts?.overdue||0)},
    commandCenter:{
      business_date:today,
      today_collected_minor:Number(todayCollected?.amount_minor||0),today_collected_count:Number(todayCollected?.n||0),
      outstanding_minor:Number(outstanding?.outstanding_minor||0),outstanding_count:Number(outstanding?.outstanding_count||0),
      due_soon_minor:Number(invoiceStats?.due_soon_minor||0),due_soon_count:Number(invoiceStats?.due_soon_count||0),
      overdue_invoice_minor:Number(invoiceStats?.overdue_minor||0),overdue_invoice_count:Number(invoiceStats?.overdue_count||0),
      invoice_due:invoiceDue.slice(0,12),recent_customers:recentCustomers?.results||[],
      followups:dailyFollowups,followup_count:dailyFollowups.length,followup_whatsapp_count:dailyFollowups.filter(x=>x.contactable!==false&&S(x.phone)).length
    },
    due:dueRows.map(x=>({...x,orderNo:orderNo(x),name:x.customer_name||'',total:Number(x.total_minor||0)/100})),trend:trend?.results||[],latest:(latest?.results||[]).map(mapOrder),pending:(pending?.results||[]).map(mapOrder)
  });
}

const PRODUCT_ROLLUP_CTE="WITH variant_rollup AS ("+
" SELECT product_id,COUNT(*) variant_count,"+
" SUM(CASE WHEN stock_qty IS NOT NULL THEN 1 ELSE 0 END) tracked_count,"+
" COALESCE(SUM(CASE WHEN stock_qty IS NOT NULL THEN MAX(stock_qty,0) ELSE 0 END),0) stock_units,"+
" SUM(CASE WHEN stock_qty IS NOT NULL AND stock_qty<=5 THEN 1 ELSE 0 END) low_count,"+
" SUM(CASE WHEN stock_qty IS NOT NULL AND stock_qty>0 THEN 1 ELSE 0 END) positive_count"+
" FROM product_variations GROUP BY product_id),"+
" sales_rollup AS ("+
" SELECT oi.product_id,COALESCE(SUM(oi.quantity),0) units_sold,COALESCE(SUM(oi.line_total_minor),0) revenue_minor,COUNT(DISTINCT oi.order_id) paid_orders,MAX(o.created_at) last_sale_at"+
" FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.payment_status='paid' AND oi.product_id IS NOT NULL GROUP BY oi.product_id)";
function productFilterSql(filter){
  if(filter==='active')return "p.status='active'";
  if(filter==='hidden')return "p.status<>'active'";
  if(filter==='low')return "COALESCE(v.tracked_count,0)>0 AND COALESCE(v.positive_count,0)>0 AND COALESCE(v.low_count,0)>0";
  if(filter==='out')return "COALESCE(v.tracked_count,0)>0 AND COALESCE(v.positive_count,0)=0";
  if(filter==='untracked')return "COALESCE(v.tracked_count,0)=0";
  return '1=1';
}
function mapProductListRow(x){return{id:x.id,sku:x.sku||'',name:x.name,slug:x.slug||'',category:x.category||x.product_type,productType:x.product_type,fulfillmentType:x.fulfillment_type||'physical_shipping',image:x.image||'',imageUrl:x.image||'',basePrice:Number(x.base_price_minor||0)/100,salePriceMinor:x.sale_price_minor==null?null:Number(x.sale_price_minor),active:x.status==='active',status:x.status,variantCount:Number(x.variant_count||0),trackedCount:Number(x.tracked_count||0),stockUnits:Number(x.stock_units||0),lowStock:Number(x.tracked_count||0)>0&&Number(x.positive_count||0)>0&&Number(x.low_count||0)>0,outOfStock:Number(x.tracked_count||0)>0&&Number(x.positive_count||0)===0,untracked:Number(x.tracked_count||0)===0,unitsSold:Number(x.units_sold||0),revenueMinor:Number(x.revenue_minor||0),paidOrders:Number(x.paid_orders||0),lastSaleAt:x.last_sale_at||null}}
async function productsDashboard(d,env){
  const q=S(d.q).toLowerCase(),filter=S(d.filter||'all').toLowerCase(),limit=Math.min(150,Math.max(20,Number(d.limit||80))),offset=Math.max(0,Math.min(1000000,Number(d.offset||0)));
  const where=[productFilterSql(filter)],args=[];
  if(q){where.push("(LOWER(COALESCE(p.name,'')) LIKE ? OR LOWER(COALESCE(p.sku,'')) LIKE ? OR LOWER(COALESCE(p.category,p.product_type,'')) LIKE ? OR EXISTS(SELECT 1 FROM product_variations pv WHERE pv.product_id=p.id AND LOWER(COALESCE(pv.sku,'')) LIKE ?))");for(let i=0;i<4;i++)args.push('%'+q+'%')}
  const whereSql=' WHERE '+where.join(' AND ');
  const rows=(await env.DB.prepare(PRODUCT_ROLLUP_CTE+
    " SELECT p.*,COALESCE(v.variant_count,0) variant_count,COALESCE(v.tracked_count,0) tracked_count,COALESCE(v.stock_units,0) stock_units,COALESCE(v.low_count,0) low_count,COALESCE(v.positive_count,0) positive_count,COALESCE(s.units_sold,0) units_sold,COALESCE(s.revenue_minor,0) revenue_minor,COALESCE(s.paid_orders,0) paid_orders,s.last_sale_at,"+
    " COALESCE((SELECT pi.url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.is_cover DESC,pi.sort_order,pi.id LIMIT 1),'') image"+
    " FROM products p LEFT JOIN variant_rollup v ON v.product_id=p.id LEFT JOIN sales_rollup s ON s.product_id=p.id"+
    whereSql+" ORDER BY p.created_at DESC,p.id DESC LIMIT ? OFFSET ?").bind(...args,limit,offset).all()).results||[];
  const totalRow=await env.DB.prepare(PRODUCT_ROLLUP_CTE+" SELECT COUNT(*) n FROM products p LEFT JOIN variant_rollup v ON v.product_id=p.id LEFT JOIN sales_rollup s ON s.product_id=p.id"+whereSql).bind(...args).first();
  const stats=await env.DB.prepare(PRODUCT_ROLLUP_CTE+
    " SELECT COUNT(*) total,SUM(CASE WHEN p.status='active' THEN 1 ELSE 0 END) active,"+
    " SUM(CASE WHEN COALESCE(v.tracked_count,0)>0 AND COALESCE(v.positive_count,0)>0 AND COALESCE(v.low_count,0)>0 THEN 1 ELSE 0 END) low,"+
    " SUM(CASE WHEN COALESCE(v.tracked_count,0)>0 AND COALESCE(v.positive_count,0)=0 THEN 1 ELSE 0 END) out"+
    " FROM products p LEFT JOIN variant_rollup v ON v.product_id=p.id").first();
  const revenue=await env.DB.prepare("SELECT COALESCE(SUM(oi.line_total_minor),0) revenue_minor FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.payment_status='paid'").first();
  const total=Number(totalRow?.n||0);
  return J({ok:true,products:rows.map(mapProductListRow),total,offset,limit,hasMore:offset+rows.length<total,stats:{total:Number(stats?.total||0),active:Number(stats?.active||0),low:Number(stats?.low||0),out:Number(stats?.out||0),revenueMinor:Number(revenue?.revenue_minor||0)},query:q,filter});
}
async function productDetail(d,env){
  const id=S(d.productId||d.id);if(!id)return J({ok:false,error:'Product diperlukan'},400);
  const x=await env.DB.prepare("SELECT p.*,COALESCE((SELECT pi.url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.is_cover DESC,pi.sort_order,pi.id LIMIT 1),'') image FROM products p WHERE p.id=? LIMIT 1").bind(id).first();
  if(!x)return J({ok:false,error:'Product tidak dijumpai'},404);
  const vr=(await env.DB.prepare('SELECT * FROM product_variations WHERE product_id=? ORDER BY created_at,id').bind(id).all()).results||[];
  const product={id:x.id,sku:x.sku||'',name:x.name,slug:x.slug||'',category:x.category||x.product_type,productType:x.product_type,product_type:x.product_type,fulfillmentType:x.fulfillment_type||'physical_shipping',fulfillment_type:x.fulfillment_type||'physical_shipping',description:x.description||'',shortDescription:x.short_description||'',short_description:x.short_description||'',desc:x.short_description||x.description||'',image:x.image||'',imageUrl:x.image||'',basePrice:Number(x.base_price_minor||0)/100,salePriceMinor:x.sale_price_minor==null?null:Number(x.sale_price_minor),active:x.status==='active',status:x.status,variants:vr.map(y=>({id:y.id,name:y.name,sku:y.sku||'',price:Number((y.sale_price_minor??y.price_minor)||0)/100,priceMinor:Number(y.price_minor||0),salePrice:y.sale_price_minor==null?null:Number(y.sale_price_minor)/100,stock:y.stock_qty,active:y.status==='active',image:y.image_url||''}))};
  return J({ok:true,product});
}
export async function onRequest({request,env}){if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});const d=await data(request),action=S(d.action);if(action==='dashboardSummary'||action==='productsDashboard'||action==='productDetail'){if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);try{if(action==='dashboardSummary')return await dashboardSummary(env);if(action==='productsDashboard')return await productsDashboard(d,env);return await productDetail(d,env)}catch(e){console.error('REQOO admin v15:',e);return J({ok:false,error:e?.message||String(e)},500)}}return legacy({request,env});}