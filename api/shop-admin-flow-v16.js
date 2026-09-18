import { onRequest as legacy } from './shop-admin-flow-v15.js';
const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
const orderNo=o=>S(o.order_no)||`RQ-${String(o.id||'').replace(/[^A-Za-z0-9]/g,'').slice(-12).toUpperCase()}`;
function mapRow(o){return {...o,orderNo:orderNo(o),order_ref:orderNo(o),name:o.customer_name||'',total:Number(o.total_minor||0)/100,status:o.fulfillment_status,payment:o.payment_status,timestamp:o.created_at,productionMeta:o.meta_order_id?{order_id:o.meta_order_id,due_date:o.due_date||null,priority:o.priority||'normal',assigned_to:o.assigned_to||'',internal_note:o.internal_note||'',updated_at:o.meta_updated_at||null}:null}}
const ELIGIBLE="o.payment_status NOT IN ('failed','cancelled','refunded') AND o.fulfillment_status!='cancelled'";
function filterSql(filter){
  if(filter==='pending')return ELIGIBLE+" AND o.payment_status NOT IN ('paid','partial')";
  if(filter==='paid')return ELIGIBLE+" AND o.payment_status IN ('paid','partial') AND o.fulfillment_status='pending'";
  if(filter==='processing')return ELIGIBLE+" AND o.fulfillment_status='processing'";
  if(filter==='fulfilled')return ELIGIBLE+" AND o.fulfillment_status='fulfilled'";
  if(filter==='today')return ELIGIBLE+" AND o.fulfillment_status IN ('pending','processing') AND m.due_date=date('now','+8 hours')";
  if(filter==='overdue')return ELIGIBLE+" AND o.fulfillment_status IN ('pending','processing') AND m.due_date IS NOT NULL AND m.due_date<>'' AND m.due_date<date('now','+8 hours')";
  return ELIGIBLE+" AND o.fulfillment_status IN ('pending','processing')";
}
async function productionDashboard(d,env){
  const q=S(d.q).toLowerCase(),filter=S(d.filter||'active').toLowerCase(),limit=Math.min(150,Math.max(20,Number(d.limit||80))),offset=Math.max(0,Math.min(1000000,Number(d.offset||0)));
  const where=[filterSql(filter)],args=[];
  if(q){
    const digits=q.replace(/[^0-9]/g,'');
    where.push("(LOWER(COALESCE(o.order_no,o.id,'')) LIKE ? OR LOWER(COALESCE(c.name,'')) LIKE ? OR REPLACE(REPLACE(REPLACE(COALESCE(c.phone,''),' ',''),'-',''),'+','') LIKE ? OR LOWER(COALESCE(c.email,'')) LIKE ? OR LOWER(COALESCE(m.assigned_to,'')) LIKE ?)");
    args.push('%'+q+'%','%'+q+'%',digits?'%'+digits+'%':'__NO_PHONE_MATCH__','%'+q+'%','%'+q+'%');
  }
  const whereSql=' WHERE '+where.join(' AND ');
  const [counts,totalRow,rows]=await Promise.all([
    env.DB.prepare(`SELECT
      SUM(CASE WHEN payment_status NOT IN ('paid','partial','failed','cancelled','refunded') AND fulfillment_status!='cancelled' THEN 1 ELSE 0 END) pending,
      SUM(CASE WHEN payment_status IN ('paid','partial') AND fulfillment_status='pending' THEN 1 ELSE 0 END) paid,
      SUM(CASE WHEN fulfillment_status='processing' AND payment_status NOT IN ('failed','cancelled','refunded') THEN 1 ELSE 0 END) processing,
      SUM(CASE WHEN fulfillment_status='fulfilled' AND payment_status NOT IN ('failed','cancelled','refunded') THEN 1 ELSE 0 END) fulfilled
      FROM orders`).first(),
    env.DB.prepare("SELECT COUNT(*) n FROM orders o LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN shop_production_meta m ON m.order_id=o.id"+whereSql).bind(...args).first(),
    env.DB.prepare(`SELECT o.*,c.name customer_name,c.phone,c.email,
      m.order_id meta_order_id,m.due_date,m.priority,m.assigned_to,m.internal_note,m.updated_at meta_updated_at
      FROM orders o
      LEFT JOIN customers c ON c.id=o.customer_id
      LEFT JOIN shop_production_meta m ON m.order_id=o.id
      ${whereSql}
      ORDER BY CASE WHEN m.due_date IS NULL OR m.due_date='' THEN 1 ELSE 0 END,
        m.due_date ASC,
        CASE COALESCE(m.priority,'normal') WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
        o.created_at ASC,o.id ASC
      LIMIT ? OFFSET ?`).bind(...args,limit,offset).all()
  ]);
  const total=Number(totalRow?.n||0),mapped=(rows?.results||[]).map(mapRow);
  return J({ok:true,counts:{pending:Number(counts?.pending||0),paid:Number(counts?.paid||0),processing:Number(counts?.processing||0),fulfilled:Number(counts?.fulfilled||0)},orders:mapped,total,offset,limit,hasMore:offset+mapped.length<total,filter,query:q});
}
export async function onRequest({request,env}){if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});const d=await data(request),action=S(d.action);if(action==='productionDashboard'){if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);try{return await productionDashboard(d,env)}catch(e){console.error('REQOO production v16:',e);return J({ok:false,error:e?.message||String(e)},500)}}return legacy({request,env});}
