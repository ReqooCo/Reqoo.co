const cors = {
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type,X-Admin-Token',
  'cache-control':'no-store'
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
  try {
    const url = new URL(request.url);
    const q = Object.fromEntries(url.searchParams.entries());
    const body = request.method === 'POST' && (request.headers.get('content-type')||'').includes('application/json') ? await request.json() : {};
    const d = {...q,...body};
    const token = request.headers.get('X-Admin-Token') || d.token || '';
    if (!String(env.PKSK_ADMIN_TOKEN||'') || String(token) !== String(env.PKSK_ADMIN_TOKEN||'')) return json({ok:false,error:'Unauthorized'},401);
    const action = String(d.action||'summary');
    if (action === 'summary') return json(await summary(env));
    if (action === 'checkPhone') return json(await checkPhone(d,env));
    if (action === 'listOrders') return json(await listOrders(d,env));
    if (action === 'listReferrals') return json(await listReferrals(d,env));
    if (action === 'listTables') return json(await listTables(env));
    return json({ok:false,error:'Action tidak dikenali'},400);
  } catch (e) {
    return json({ok:false,error:String(e?.message||e)},500);
  }
}

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8',...cors}})}
function normPhone(v){let p=String(v||'').replace(/\D/g,'');if(p.startsWith('00'))p=p.slice(2);if(p.startsWith('0'))p='60'+p.slice(1);if(p&&!p.startsWith('60'))p='60'+p;return p;}
async function tableExists(env,name){const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(name).first();return !!r}
async function summary(env){
  const out={ok:true,customers:0,orders:0,paid:0,pending:0,referrals:0};
  if(await tableExists(env,'orders')){
    out.orders=Number((await env.DB.prepare('SELECT COUNT(*) n FROM orders').first())?.n||0);
    out.paid=Number((await env.DB.prepare("SELECT COUNT(*) n FROM orders WHERE lower(payment_status) IN ('paid','completed','success')").first())?.n||0);
    out.pending=Number((await env.DB.prepare("SELECT COUNT(*) n FROM orders WHERE lower(payment_status)='pending'").first())?.n||0);
  }
  if(await tableExists(env,'sim_customers')) out.customers=Number((await env.DB.prepare('SELECT COUNT(*) n FROM sim_customers').first())?.n||0);
  if(await tableExists(env,'referrals')) out.referrals=Number((await env.DB.prepare('SELECT COUNT(*) n FROM referrals').first())?.n||0);
  else if(await tableExists(env,'sim_referrals')) out.referrals=Number((await env.DB.prepare('SELECT COUNT(*) n FROM sim_referrals').first())?.n||0);
  return out;
}
async function checkPhone(d,env){
  const phone=normPhone(d.phone); if(!phone)return {ok:false,error:'Nombor telefon diperlukan'};
  if(!await tableExists(env,'orders')) return {ok:true,phone,exists:false};
  const rows=await env.DB.prepare('SELECT id,customer_name,phone,payment_status,created_at FROM orders').all();
  const match=(rows.results||[]).find(r=>normPhone(r.phone)===phone);
  return {ok:true,phone,exists:!!match,customer:match||null};
}
async function listOrders(d,env){
  if(!await tableExists(env,'orders')) return {ok:true,orders:[]};
  const limit=Math.min(Math.max(Number(d.limit||100),1),500);
  const rows=await env.DB.prepare('SELECT id,customer_name,phone,email,amount,payment_status,created_at,paid_at FROM orders ORDER BY created_at DESC LIMIT ?').bind(limit).all();
  let orders=rows.results||[];
  if(d.phone){const p=normPhone(d.phone);orders=orders.filter(r=>normPhone(r.phone)===p)}
  if(d.status)orders=orders.filter(r=>String(r.payment_status||'').toLowerCase()===String(d.status).toLowerCase());
  return {ok:true,orders};
}
async function listReferrals(d,env){
  let table='';
  if(await tableExists(env,'referrals'))table='referrals';
  else if(await tableExists(env,'sim_referrals'))table='sim_referrals';
  if(!table)return {ok:true,referrals:[],message:'Referral table belum wujud.'};
  const limit=Math.min(Math.max(Number(d.limit||100),1),500);
  const rows=await env.DB.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
  let referrals=rows.results||[];
  if(d.code)referrals=referrals.filter(r=>String(r.code||r.referral_code||'').toUpperCase().includes(String(d.code).toUpperCase()));
  if(d.status)referrals=referrals.filter(r=>String(r.status||'').toLowerCase()===String(d.status).toLowerCase());
  return {ok:true,table,referrals};
}
async function listTables(env){const r=await env.DB.prepare("SELECT name,type FROM sqlite_master WHERE type IN ('table','trigger','index') ORDER BY type,name").all();return {ok:true,objects:r.results||[]};}
