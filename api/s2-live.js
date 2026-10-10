const HEADERS={
  'content-type':'application/json; charset=UTF-8',
  'cache-control':'no-store',
  'pragma':'no-cache',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-s2-key',
  'access-control-allow-methods':'GET,POST,OPTIONS'
};
const ACCESS_HASH='da55872021a7acbbd84f80edee8c565ec1e9e5d926a1f18a4a6d6e1ed1586331';
const SECTIONS=new Set(['ops','intakeB','intakeC','twps']);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const txt=(v,max=300)=>String(v??'').trim().slice(0,max);
const now=()=>new Date().toISOString();
const id=(p)=>p+'_'+crypto.randomUUID().replaceAll('-','');
async function sha256(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function authorized(request){const supplied=request.headers.get('X-S2-Key')||'';return supplied&&await sha256(supplied)===ACCESS_HASH}
function cleanObject(x){
  if(!x||typeof x!=='object'||Array.isArray(x))return{};
  const out={};
  for(const [k,v] of Object.entries(x)){
    const key=txt(k,60);
    if(!key)continue;
    if(typeof v==='boolean')out[key]=v;
    else if(v===null)out[key]=null;
    else out[key]=txt(v,200);
  }
  return out;
}
async function ensure(env){
  if(!env.DB)throw new Error('D1 binding DB tidak dijumpai');
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS s2_live_status(
      section TEXT PRIMARY KEY,
      data_json TEXT NOT NULL DEFAULT '{}',
      report_date TEXT NOT NULL DEFAULT '',
      report_time TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT '',
      updated_shift TEXT NOT NULL DEFAULT ''
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS s2_live_status_history(
      id TEXT PRIMARY KEY,
      section TEXT NOT NULL,
      data_json TEXT NOT NULL DEFAULT '{}',
      report_date TEXT NOT NULL DEFAULT '',
      report_time TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT '',
      updated_shift TEXT NOT NULL DEFAULT ''
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_s2_live_hist_section_time ON s2_live_status_history(section,updated_at DESC)')
  ]);
}
function hydrate(r){
  if(!r)return null;
  let data={};try{data=JSON.parse(r.data_json||'{}')}catch{}
  return {section:r.section,data,report_date:r.report_date||'',report_time:r.report_time||'',updated_at:r.updated_at||'',updated_by:r.updated_by||'',updated_shift:r.updated_shift||''};
}
async function state(env){
  const q=await env.DB.prepare('SELECT * FROM s2_live_status').all();
  const items=(q.results||[]).map(hydrate);
  const bySection={};items.forEach(x=>bySection[x.section]=x);
  return bySection;
}
export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  if(!(await authorized(request)))return json({ok:false,error:'Access code S2 tidak sah'},401);
  try{
    await ensure(env);
    if(request.method==='GET')return json({ok:true,state:await state(env),server_time:now()});
    if(request.method!=='POST')return json({ok:false,error:'Method tidak disokong'},405);
    let d={};try{d=await request.json()}catch{return json({ok:false,error:'Data tidak sah'},400)}
    if(txt(d.action,30)!=='save')return json({ok:false,error:'Action tidak dikenali'},400);
    const section=txt(d.section,30);
    if(!SECTIONS.has(section))return json({ok:false,error:'Section tidak sah'},400);
    const data=cleanObject(d.data);
    const reportDate=txt(d.reportDate,10),reportTime=txt(d.reportTime,10),operator=txt(d.operator,120)||'-',shift=txt(d.shift,20).toUpperCase()||'-',updated=now();
    const body=JSON.stringify(data);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO s2_live_status(section,data_json,report_date,report_time,updated_at,updated_by,updated_shift)
        VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(section) DO UPDATE SET data_json=excluded.data_json,report_date=excluded.report_date,report_time=excluded.report_time,updated_at=excluded.updated_at,updated_by=excluded.updated_by,updated_shift=excluded.updated_shift`)
        .bind(section,body,reportDate,reportTime,updated,operator,shift),
      env.DB.prepare(`INSERT INTO s2_live_status_history(id,section,data_json,report_date,report_time,updated_at,updated_by,updated_shift)
        VALUES(?,?,?,?,?,?,?,?)`).bind(id('live'),section,body,reportDate,reportTime,updated,operator,shift)
    ]);
    return json({ok:true,state:await state(env),saved:section});
  }catch(err){
    return json({ok:false,error:String(err?.message||err||'Ralat server')},500);
  }
}
