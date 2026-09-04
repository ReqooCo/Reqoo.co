/* REQOO PKSK ADMIN V2
   Separate diagnostic/admin surface. Does not replace sim-admin.js.
   Covers: payments/orders, referrals, licenses, devices, progress by set,
   audit/user logs, resend-code helper, reset, delete.
*/
const cors={
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type,X-Admin-Token',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff'
};
export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  try{
    const u=new URL(request.url),q=Object.fromEntries(u.searchParams.entries());
    const body=request.method==='POST'&&(request.headers.get('content-type')||'').includes('application/json')?await request.json():{};
    const d={...q,...body};
    const token=request.headers.get('X-Admin-Token')||d.token||'';
    const active=await getActiveToken(env);
    if(!active||String(token)!==String(active))return json({ok:false,error:'Unauthorized'},401);
    await ensureTables(env);
    const action=String(d.action||'summary');
    if(action==='summary')return json(await summary(env));
    if(action==='customer')return json(await customer(d,env));
    if(action==='orders')return json(await orders(d,env));
    if(action==='licenses')return json(await licenses(d,env));
    if(action==='referrals')return json(await referrals(d,env));
    if(action==='devices')return json(await devices(d,env));
    if(action==='progress')return json(await progress(d,env));
    if(action==='logs')return json(await logs(d,env));
    if(action==='resendCode')return json(await resendCode(d,env));
    if(action==='reset')return json(await resetAccount(d,env));
    if(action==='delete')return json(await deleteAccount(d,env));
    if(action==='seedLog')return json(await seedLog(d,env));
    return json({ok:false,error:'Action Admin V2 tidak disokong.'},400);
  }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...cors}})}
const str=v=>String(v??'').trim();
const clean=v=>str(v).toUpperCase();
const now=()=>new Date().toISOString();
function jsonText(v){try{return JSON.stringify(v)}catch{return String(v)}}
async function tableExists(env,name){return !!(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(name).first())}
async function getActiveToken(env){
  if(!await tableExists(env,'sim_admin_settings'))return str(env.PKSK_ADMIN_TOKEN);
  const r=await env.DB.prepare('SELECT admin_token FROM sim_admin_settings WHERE id=1 LIMIT 1').first();
  return str(r?.admin_token)||str(env.PKSK_ADMIN_TOKEN);
}
async function ensureTables(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sim_admin_audit (
    id TEXT PRIMARY KEY, action TEXT NOT NULL, target TEXT, detail TEXT, created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sim_admin_audit_created ON sim_admin_audit(created_at)').run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sim_user_logs (
    id TEXT PRIMARY KEY, license_id TEXT, access_code TEXT, device_key TEXT, event TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info', message TEXT, meta TEXT, created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sim_user_logs_license ON sim_user_logs(license_id,created_at)').run();
}
async function audit(env,action,target,detail){
  await env.DB.prepare('INSERT INTO sim_admin_audit (id,action,target,detail,created_at) VALUES (?,?,?,?,?)')
    .bind(`adm_${crypto.randomUUID()}`,action,str(target)||null,jsonText(detail||{}),now()).run();
}
async function summary(env){
  const count=async(sql)=>Number((await env.DB.prepare(sql).first())?.n||0);
  const out={ok:true,orders:0,paid:0,pending:0,licenses:0,activeLicenses:0,devices:0,activeDevices:0,completedSets:0,incompleteSets:0,customers:0,referrals:0,userLogs:0,adminActions:0};
  if(await tableExists(env,'orders')){out.orders=await count('SELECT COUNT(*) n FROM orders');out.paid=await count("SELECT COUNT(*) n FROM orders WHERE lower(payment_status) IN ('paid','completed','success')");out.pending=await count("SELECT COUNT(*) n FROM orders WHERE lower(payment_status)='pending'")}
  if(await tableExists(env,'licenses')){out.licenses=await count('SELECT COUNT(*) n FROM licenses');out.activeLicenses=await count("SELECT COUNT(*) n FROM licenses WHERE lower(status)='active'")}
  if(await tableExists(env,'devices')){out.devices=await count('SELECT COUNT(*) n FROM devices');out.activeDevices=await count("SELECT COUNT(*) n FROM devices WHERE lower(status)='active'")}
  if(await tableExists(env,'progress')){out.completedSets=await count("SELECT COUNT(*) n FROM progress WHERE completed=1 AND upper(section)='OVERALL'");out.incompleteSets=await count("SELECT COUNT(*) n FROM progress WHERE (completed=0 OR completed IS NULL) AND upper(section)='OVERALL'")}
  if(await tableExists(env,'sim_customers'))out.customers=await count('SELECT COUNT(*) n FROM sim_customers');
  if(await tableExists(env,'sim_referral_agents'))out.referrals=await count("SELECT COUNT(*) n FROM sim_referral_agents WHERE lower(status)='active'");
  if(await tableExists(env,'sim_user_logs'))out.userLogs=await count('SELECT COUNT(*) n FROM sim_user_logs');
  if(await tableExists(env,'sim_admin_audit'))out.adminActions=await count('SELECT COUNT(*) n FROM sim_admin_audit');
  return out;
}
async function customer(d,env){
  const code=clean(d.code);if(!code)return{ok:false,error:'Access Code diperlukan.'};
  const l=await env.DB.prepare(`SELECT l.*,o.customer_name,o.phone,o.email,o.amount,o.payment_status,o.payment_ref,o.created_at order_created,o.paid_at
    FROM licenses l LEFT JOIN orders o ON o.id=l.order_id WHERE l.access_code=? LIMIT 1`).bind(code).first();
  if(!l)return{ok:false,error:'License tidak dijumpai.'};
  const result={license:l,devices:[],progress:[],referral:null,logs:[],payment:null};
  if(await tableExists(env,'devices'))result.devices=(await env.DB.prepare('SELECT id,device_key,device_name,first_seen,last_seen,status FROM devices WHERE license_id=? ORDER BY last_seen DESC').bind(l.id).all()).results||[];
  if(await tableExists(env,'progress'))result.progress=(await env.DB.prepare('SELECT set_no,section,completed,score,answered,time_used,score_a,score_b,score_c,started_at,completed_at,updated_at FROM progress WHERE license_id=? ORDER BY set_no,section').bind(l.id).all()).results||[];
  if(await tableExists(env,'sim_referral_events'))result.referral=await env.DB.prepare('SELECT * FROM sim_referral_events WHERE order_id=? ORDER BY created_at DESC LIMIT 1').bind(l.order_id).first();
  if(await tableExists(env,'sim_user_logs'))result.logs=(await env.DB.prepare('SELECT id,event,level,message,meta,device_key,created_at FROM sim_user_logs WHERE license_id=? ORDER BY created_at DESC LIMIT 100').bind(l.id).all()).results||[];
  result.payment={orderId:l.order_id,status:l.payment_status,amount:l.amount,paymentRef:l.payment_ref,createdAt:l.order_created,paidAt:l.paid_at};
  return{ok:true,customer:result};
}
async function orders(d,env){
  if(!await tableExists(env,'orders'))return{ok:true,orders:[]};
  const limit=Math.min(Math.max(Number(d.limit||200),1),500);let sql=`SELECT o.*,l.access_code,l.status license_status FROM orders o LEFT JOIN licenses l ON l.order_id=o.id ORDER BY o.created_at DESC LIMIT ?`;let rows=(await env.DB.prepare(sql).bind(limit).all()).results||[];
  const phone=str(d.phone).replace(/\D/g,'');const status=clean(d.status);if(phone)rows=rows.filter(x=>str(x.phone).replace(/\D/g,'').endsWith(phone));if(status)rows=rows.filter(x=>clean(x.payment_status)===status);return{ok:true,orders:rows};
}
async function licenses(d,env){
  if(!await tableExists(env,'licenses'))return{ok:true,licenses:[]};
  const limit=Math.min(Math.max(Number(d.limit||200),1),500);const rows=(await env.DB.prepare(`SELECT l.*,o.customer_name,o.phone,o.email,o.amount,o.payment_status FROM licenses l LEFT JOIN orders o ON o.id=l.order_id ORDER BY l.created_at DESC LIMIT ?`).bind(limit).all()).results||[];
  const q=clean(d.q);return{ok:true,licenses:q?rows.filter(x=>[x.access_code,x.customer_name,x.phone,x.order_id].some(v=>clean(v).includes(q))):rows};
}
async function referrals(d,env){
  const out={ok:true,agents:[],events:[]};
  if(await tableExists(env,'sim_referral_agents'))out.agents=(await env.DB.prepare('SELECT id,name,phone,bank_name,bank_account,referral_code,status,commission,created_at,updated_at FROM sim_referral_agents ORDER BY created_at DESC LIMIT 500').all()).results||[];
  if(await tableExists(env,'sim_referral_events'))out.events=(await env.DB.prepare('SELECT * FROM sim_referral_events ORDER BY created_at DESC LIMIT 500').all()).results||[];
  return out;
}
async function devices(d,env){
  if(!await tableExists(env,'devices'))return{ok:true,devices:[]};
  const rows=(await env.DB.prepare(`SELECT d.*,l.access_code,o.customer_name,o.phone FROM devices d LEFT JOIN licenses l ON l.id=d.license_id LEFT JOIN orders o ON o.id=l.order_id ORDER BY d.last_seen DESC LIMIT 500`).all()).results||[];return{ok:true,devices:rows};
}
async function progress(d,env){
  if(!await tableExists(env,'progress'))return{ok:true,progress:[]};
  const limit=Math.min(Math.max(Number(d.limit||1000),1),2000);let rows=(await env.DB.prepare(`SELECT p.*,l.access_code,o.customer_name,o.phone FROM progress p LEFT JOIN licenses l ON l.id=p.license_id LEFT JOIN orders o ON o.id=l.order_id ORDER BY p.updated_at DESC LIMIT ?`).bind(limit).all()).results||[];
  if(d.code)rows=rows.filter(x=>clean(x.access_code)===clean(d.code));if(d.setNo)rows=rows.filter(x=>Number(x.set_no)===Number(d.setNo));return{ok:true,progress:rows};
}
async function logs(d,env){
  const user=await env.DB.prepare('SELECT id,license_id,access_code,device_key,event,level,message,meta,created_at FROM sim_user_logs ORDER BY created_at DESC LIMIT 500').all();
  const admin=await env.DB.prepare('SELECT id,action,target,detail,created_at FROM sim_admin_audit ORDER BY created_at DESC LIMIT 300').all();
  return{ok:true,userLogs:user.results||[],adminLogs:admin.results||[]};
}
function phoneForWhatsApp(v){let p=str(v).replace(/\D/g,'');if(p.startsWith('00'))p=p.slice(2);if(p.startsWith('0'))p='60'+p.slice(1);if(p&&!p.startsWith('60'))p='60'+p;return p}
async function resendCode(d,env){
  const code=clean(d.code);if(!code)return{ok:false,error:'Access Code diperlukan.'};
  const l=await env.DB.prepare('SELECT l.access_code,o.customer_name,o.phone,o.email FROM licenses l LEFT JOIN orders o ON o.id=l.order_id WHERE l.access_code=? LIMIT 1').bind(code).first();if(!l)return{ok:false,error:'License tidak dijumpai.'};
  const p=phoneForWhatsApp(l.phone),text=`REQOO PKSK\n\nHai ${l.customer_name||''},\nAccess Code PKSK anda:\n${l.access_code}\n\nBuka: https://pksk.sim.reqoo.co/access/`;const url=p?`https://wa.me/${p}?text=${encodeURIComponent(text)}`:'';await audit(env,'resendCode',code,{phone:l.phone,channel:p?'whatsapp-link':'manual'});return{ok:true,code:l.access_code,phone:l.phone,whatsappUrl:url,message:text};
}
async function resetAccount(d,env){
  const code=clean(d.code);if(!code)return{ok:false,error:'Access Code diperlukan.'};const l=await env.DB.prepare('SELECT id,access_code,order_id FROM licenses WHERE access_code=? LIMIT 1').bind(code).first();if(!l)return{ok:false,error:'License tidak dijumpai.'};
  const setNo=Number(d.setNo||0);let deleted=0;if(await tableExists(env,'progress')){if(setNo>=1&&setNo<=50){const r=await env.DB.prepare('DELETE FROM progress WHERE license_id=? AND set_no=?').bind(l.id,setNo).run();deleted=Number(r.meta?.changes||0)}else{const r=await env.DB.prepare('DELETE FROM progress WHERE license_id=?').bind(l.id).run();deleted=Number(r.meta?.changes||0)}}
  if(d.devices==='1'||d.devices===true){if(await tableExists(env,'devices'))await env.DB.prepare("UPDATE devices SET status='revoked' WHERE license_id=?").bind(l.id).run()}
  await audit(env,'reset',code,{setNo:setNo||'ALL',deletedProgress:deleted,devicesRevoked:d.devices==='1'||d.devices===true});return{ok:true,reset:true,deletedProgress:deleted};
}
async function deleteAccount(d,env){
  const code=clean(d.code);if(!code)return{ok:false,error:'Access Code diperlukan.'};const l=await env.DB.prepare('SELECT id,access_code,order_id FROM licenses WHERE access_code=? LIMIT 1').bind(code).first();if(!l)return{ok:false,error:'License tidak dijumpai.'};
  if(str(d.confirm)!=='DELETE')return{ok:false,error:'Taip DELETE untuk pengesahan.'};
  const tables=['progress','devices'];for(const t of tables)if(await tableExists(env,t))await env.DB.prepare(`DELETE FROM ${t} WHERE license_id=?`).bind(l.id).run();
  if(await tableExists(env,'sim_user_logs'))await env.DB.prepare('DELETE FROM sim_user_logs WHERE license_id=?').bind(l.id).run();
  if(await tableExists(env,'licenses'))await env.DB.prepare('DELETE FROM licenses WHERE id=?').bind(l.id).run();
  if(await tableExists(env,'sim_referral_events'))await env.DB.prepare('UPDATE sim_referral_events SET status=CASE WHEN status=\'paid\' THEN status ELSE \'deleted\' END WHERE order_id=?').bind(l.order_id).run();
  await audit(env,'delete',code,{licenseId:l.id,orderId:l.order_id});return{ok:true,deleted:true};
}
async function seedLog(d,env){const code=clean(d.code),event=str(d.event)||'manual_admin_note',level=str(d.level)||'info',message=str(d.message);let licenseId=null,deviceKey=str(d.deviceId)||null;if(code){licenseId=(await env.DB.prepare('SELECT id FROM licenses WHERE access_code=? LIMIT 1').bind(code).first())?.id||null}await env.DB.prepare('INSERT INTO sim_user_logs (id,license_id,access_code,device_key,event,level,message,meta,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(`log_${crypto.randomUUID()}`,licenseId,code||null,deviceKey,event,level,message,jsonText(d.meta||{}),now()).run();return{ok:true}}
