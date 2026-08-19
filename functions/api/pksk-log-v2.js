/* REQOO PKSK USER LOG V2
   Lightweight event/error sink used by the V2 simulator.
   Validates license + device before writing diagnostics.
*/
const ORIGIN='https://pksk.sim.reqoo.co';
const CORS={'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store','x-content-type-options':'nosniff'};
export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(request.method!=='POST')return json({ok:false,error:'Method POST diperlukan.'},405);
  try{
    const d=await request.json();const code=String(d.code||'').trim().toUpperCase(),deviceId=String(d.deviceId||'').trim();
    if(!code||!deviceId)return json({ok:false,error:'Code dan deviceId diperlukan.'},400);
    const l=await env.DB.prepare("SELECT id,status FROM licenses WHERE access_code=? LIMIT 1").bind(code).first();
    if(!l||String(l.status).toLowerCase()!=='active')return json({ok:false,error:'License tidak aktif.'},403);
    const device=await env.DB.prepare("SELECT id FROM devices WHERE license_id=? AND device_key=? AND status='active' LIMIT 1").bind(l.id,deviceId).first();
    if(!device)return json({ok:false,error:'Peranti belum didaftarkan.'},403);
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sim_user_logs (
      id TEXT PRIMARY KEY, license_id TEXT, access_code TEXT, device_key TEXT, event TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info', message TEXT, meta TEXT, created_at TEXT NOT NULL
    )`).run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sim_user_logs_license ON sim_user_logs(license_id,created_at)').run();
    const event=String(d.event||'client_event').slice(0,80),level=['info','warn','error'].includes(String(d.level))?String(d.level):'info',message=String(d.message||'').slice(0,1000),meta=JSON.stringify(d.meta||{});
    await env.DB.prepare('INSERT INTO sim_user_logs (id,license_id,access_code,device_key,event,level,message,meta,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(`log_${crypto.randomUUID()}`,l.id,code,deviceId,event,level,message,meta,new Date().toISOString()).run();
    return json({ok:true});
  }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
}
function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...CORS}})}
