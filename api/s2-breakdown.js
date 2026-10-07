const HEADERS={
  'content-type':'application/json; charset=UTF-8',
  'cache-control':'no-store',
  'pragma':'no-cache',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-s2-key',
  'access-control-allow-methods':'GET,POST,OPTIONS'
};

const ALLOWED_STATUS=new Set(['OPEN','ONGOING','MONITORING','CLOSED']);
const ACCESS_HASH='da55872021a7acbbd84f80edee8c565ec1e9e5d926a1f18a4a6d6e1ed1586331';
async function sha256(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function authorized(request){const supplied=request.headers.get('X-S2-Key')||'';return supplied&&await sha256(supplied)===ACCESS_HASH}
const text=(v,max=500)=>String(v??'').trim().slice(0,max);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const now=()=>new Date().toISOString();
const id=(prefix)=>prefix+'_'+crypto.randomUUID().replaceAll('-','');

async function ensure(env){
  if(!env.DB)throw new Error('D1 binding DB tidak dijumpai');
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS s2_breakdowns(
      id TEXT PRIMARY KEY,
      asset TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      action_by TEXT NOT NULL DEFAULT '',
      wr_no TEXT NOT NULL DEFAULT '',
      broken_at TEXT NOT NULL,
      issue TEXT NOT NULL DEFAULT '',
      current_status TEXT NOT NULL DEFAULT '',
      critical INTEGER NOT NULL DEFAULT 0,
      case_status TEXT NOT NULL DEFAULT 'ONGOING',
      leader TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS s2_breakdown_updates(
      id TEXT PRIMARY KEY,
      breakdown_id TEXT NOT NULL,
      leader TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      case_status TEXT NOT NULL DEFAULT 'ONGOING',
      critical INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(breakdown_id) REFERENCES s2_breakdowns(id) ON DELETE CASCADE
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_s2_breakdowns_status ON s2_breakdowns(case_status,updated_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_s2_updates_breakdown ON s2_breakdown_updates(breakdown_id,created_at)')
  ]);
  const cols=await env.DB.prepare('PRAGMA table_info(s2_breakdowns)').all();
  if(!(cols.results||[]).some(x=>x.name==='wr_no')){
    await env.DB.prepare("ALTER TABLE s2_breakdowns ADD COLUMN wr_no TEXT NOT NULL DEFAULT ''").run();
  }
  if(!(cols.results||[]).some(x=>x.name==='location')){
    await env.DB.prepare("ALTER TABLE s2_breakdowns ADD COLUMN location TEXT NOT NULL DEFAULT ''").run();
  }
  if(!(cols.results||[]).some(x=>x.name==='action_by')){
    await env.DB.prepare("ALTER TABLE s2_breakdowns ADD COLUMN action_by TEXT NOT NULL DEFAULT ''").run();
  }
}

async function list(env,scope='active'){
  let where="case_status <> 'CLOSED'";
  if(scope==='history')where="case_status = 'CLOSED'";
  if(scope==='all')where='1=1';
  const q=await env.DB.prepare(`SELECT * FROM s2_breakdowns WHERE ${where} ORDER BY CASE WHEN critical=1 THEN 0 ELSE 1 END, broken_at ASC LIMIT 300`).all();
  return q.results||[];
}

async function one(env,key){
  return env.DB.prepare('SELECT * FROM s2_breakdowns WHERE id=? LIMIT 1').bind(key).first();
}

async function timeline(env,key){
  const q=await env.DB.prepare('SELECT * FROM s2_breakdown_updates WHERE breakdown_id=? ORDER BY created_at DESC LIMIT 100').bind(key).all();
  return q.results||[];
}

function normalizeStatus(v,fallback='ONGOING'){
  const s=text(v,20).toUpperCase();
  return ALLOWED_STATUS.has(s)?s:fallback;
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  if(!(await authorized(request)))return json({ok:false,error:'Access code tidak sah'},401);
  try{
    await ensure(env);
    const url=new URL(request.url);

    if(request.method==='GET'){
      const action=text(url.searchParams.get('action'),30)||'list';
      if(action==='get'){
        const key=text(url.searchParams.get('id'),120);
        const row=key?await one(env,key):null;
        if(!row)return json({ok:false,error:'Rekod tidak dijumpai'},404);
        return json({ok:true,item:row,updates:await timeline(env,key)});
      }
      const scope=text(url.searchParams.get('scope'),20).toLowerCase()||'active';
      return json({ok:true,items:await list(env,scope),server_time:now()});
    }

    if(request.method!=='POST')return json({ok:false,error:'Method tidak disokong'},405);

    let d={};
    try{d=await request.json()}catch{return json({ok:false,error:'Data tidak sah'},400)}
    const action=text(d.action,30);

    if(action==='create'){
      const asset=text(d.asset,180);
      if(!asset)return json({ok:false,error:'Asset diperlukan'},400);
      const created=now(),key=id('s2');
      const brokenAt=text(d.brokenAt,40)||created;
      const issue=text(d.issue,1200),currentStatus=text(d.currentStatus,1200),wrNo=text(d.wrNo,120),location=text(d.location,180),actionBy=text(d.actionBy,180)||'M&E Prod';
      const leader=text(d.leader,120)||'-';
      const critical=d.critical===true||String(d.critical).toUpperCase()==='YA'?1:0;
      const caseStatus=normalizeStatus(d.caseStatus,'ONGOING');
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO s2_breakdowns(id,asset,location,action_by,wr_no,broken_at,issue,current_status,critical,case_status,leader,created_at,updated_at,closed_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(key,asset,location,actionBy,wrNo,brokenAt,issue,currentStatus,critical,caseStatus,leader,created,created,caseStatus==='CLOSED'?created:null),
        env.DB.prepare(`INSERT INTO s2_breakdown_updates(id,breakdown_id,leader,note,case_status,critical,created_at)
          VALUES(?,?,?,?,?,?,?)`).bind(id('upd'),key,leader,currentStatus||issue||'Breakdown direkodkan',caseStatus,critical,created)
      ]);
      return json({ok:true,item:await one(env,key)},201);
    }

    if(action==='delete'){
      const key=text(d.id,120);
      const current=key?await one(env,key):null;
      if(!current)return json({ok:false,error:'Rekod tidak dijumpai'},404);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM s2_breakdown_updates WHERE breakdown_id=?').bind(key),
        env.DB.prepare('DELETE FROM s2_breakdowns WHERE id=?').bind(key)
      ]);
      return json({ok:true,deleted:true,id:key});
    }

    if(action==='update'||action==='close'){
      const key=text(d.id,120);
      const current=key?await one(env,key):null;
      if(!current)return json({ok:false,error:'Rekod tidak dijumpai'},404);
      const updated=now();
      const leader=text(d.leader,120)||current.leader||'-';
      const note=text(d.currentStatus,1200)||current.current_status||'-';
      const wrNo=d.wrNo===undefined?String(current.wr_no||''):text(d.wrNo,120);
      const actionBy=d.actionBy===undefined?String(current.action_by||'M&E Prod'):(text(d.actionBy,180)||'M&E Prod');
      const critical=d.critical===undefined?Number(current.critical||0):(d.critical===true||String(d.critical).toUpperCase()==='YA'?1:0);
      const caseStatus=action==='close'?'CLOSED':normalizeStatus(d.caseStatus,current.case_status||'ONGOING');
      const closedAt=caseStatus==='CLOSED'?(current.closed_at||updated):null;
      await env.DB.batch([
        env.DB.prepare('UPDATE s2_breakdowns SET action_by=?,wr_no=?,current_status=?,critical=?,case_status=?,leader=?,updated_at=?,closed_at=? WHERE id=?')
          .bind(actionBy,wrNo,note,critical,caseStatus,leader,updated,closedAt,key),
        env.DB.prepare(`INSERT INTO s2_breakdown_updates(id,breakdown_id,leader,note,case_status,critical,created_at)
          VALUES(?,?,?,?,?,?,?)`).bind(id('upd'),key,leader,note,caseStatus,critical,updated)
      ]);
      return json({ok:true,item:await one(env,key)});
    }

    return json({ok:false,error:'Action tidak dikenali'},400);
  }catch(err){
    return json({ok:false,error:String(err?.message||err||'Ralat server')},500);
  }
}
