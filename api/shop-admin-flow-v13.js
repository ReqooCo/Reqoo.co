import { onRequest as legacy } from './shop-admin-flow-v12.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
const PRIORITIES=new Set(['normal','high','urgent']);
async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}
async function ensure(env){await env.DB.batch([
  env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_production_meta(order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,due_date TEXT,priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','high','urgent')),assigned_to TEXT NOT NULL DEFAULT '',internal_note TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL)"),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_shop_production_due ON shop_production_meta(due_date)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_shop_production_priority ON shop_production_meta(priority)')
])}
async function resolveOrder(key,env){key=S(key);if(!key)return null;return env.DB.prepare('SELECT id,order_no FROM orders WHERE id=? OR order_no=? LIMIT 1').bind(key,key).first()}
async function listProductionMeta(d,env){const limit=Math.min(1000,Math.max(1,Number(d.limit||500)));const rows=(await env.DB.prepare('SELECT m.order_id,m.due_date,m.priority,m.assigned_to,m.internal_note,m.updated_at,o.order_no FROM shop_production_meta m JOIN orders o ON o.id=m.order_id ORDER BY COALESCE(m.due_date,\'9999-12-31\'),m.updated_at DESC LIMIT ?').bind(limit).all()).results||[];return J({ok:true,productionMeta:rows})}
async function getProductionMeta(d,env){const o=await resolveOrder(d.orderId||d.orderNo||d.orderRef,env);if(!o)return J({ok:false,error:'Order tidak dijumpai'},404);const row=await env.DB.prepare('SELECT order_id,due_date,priority,assigned_to,internal_note,updated_at FROM shop_production_meta WHERE order_id=? LIMIT 1').bind(o.id).first();return J({ok:true,productionMeta:row||{order_id:o.id,due_date:null,priority:'normal',assigned_to:'',internal_note:'',updated_at:null}})}
async function saveProductionMeta(d,env){const o=await resolveOrder(d.orderId||d.orderNo||d.orderRef,env);if(!o)return J({ok:false,error:'Order tidak dijumpai'},404);let due=S(d.dueDate);if(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))return J({ok:false,error:'Tarikh siap tidak sah'},400);if(!due)due=null;const priority=S(d.priority||'normal').toLowerCase();if(!PRIORITIES.has(priority))return J({ok:false,error:'Priority tidak sah'},400);const assigned=S(d.assignedTo).slice(0,80),note=S(d.internalNote).slice(0,2000),now=new Date().toISOString();await env.DB.prepare('INSERT INTO shop_production_meta(order_id,due_date,priority,assigned_to,internal_note,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET due_date=excluded.due_date,priority=excluded.priority,assigned_to=excluded.assigned_to,internal_note=excluded.internal_note,updated_at=excluded.updated_at').bind(o.id,due,priority,assigned,note,now).run();const row=await env.DB.prepare('SELECT order_id,due_date,priority,assigned_to,internal_note,updated_at FROM shop_production_meta WHERE order_id=?').bind(o.id).first();return J({ok:true,productionMeta:row})}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  const d=await data(request),action=S(d.action);
  if(['listProductionMeta','getProductionMeta','saveProductionMeta'].includes(action)){
    if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
    try{await ensure(env);if(action==='listProductionMeta')return listProductionMeta(d,env);if(action==='getProductionMeta')return getProductionMeta(d,env);return saveProductionMeta(d,env)}catch(e){console.error('REQOO production v13:',e);return J({ok:false,error:e?.message||String(e)},500)}
  }
  return legacy({request,env});
}
