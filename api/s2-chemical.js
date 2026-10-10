const HEADERS={
  'content-type':'application/json; charset=UTF-8',
  'cache-control':'no-store',
  'pragma':'no-cache',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-s2-key',
  'access-control-allow-methods':'GET,POST,OPTIONS'
};

const ACCESS_HASH='da55872021a7acbbd84f80edee8c565ec1e9e5d926a1f18a4a6d6e1ed1586331';
const ORDER=['pacl1','pacl2','lime','chlorine','fluoride','polymer','carbon','calhypo'];
const META={
  pacl1:{name:'PACl, 15% Tank No.1',direct:1,initial:23.053},
  pacl2:{name:'PACl, 15% Tank No.2',direct:1,initial:53.019},
  lime:{name:'Lime',direct:0,initial:34.270},
  chlorine:{name:'Klorin',direct:0,initial:15.175},
  fluoride:{name:'Fluoride',direct:0,initial:5.000},
  polymer:{name:'Polymer AN934 (RTF)',direct:0,initial:1.330},
  carbon:{name:'Activated Carbon',direct:0,initial:7.500},
  calhypo:{name:'Calcium Hypoclorite',direct:0,initial:1.440}
};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const text=(v,max=200)=>String(v??'').trim().slice(0,max);
const now=()=>new Date().toISOString();
const id=(p)=>p+'_'+crypto.randomUUID().replaceAll('-','');
async function sha256(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function authorized(request){const supplied=request.headers.get('X-S2-Key')||'';return supplied&&await sha256(supplied)===ACCESS_HASH}
function num(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback}

async function ensure(env){
  if(!env.DB)throw new Error('D1 binding DB tidak dijumpai');
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS s2_chemical_stock(
      chemical_key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      direct_mode INTEGER NOT NULL DEFAULT 0,
      stock_mt REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT '',
      updated_shift TEXT NOT NULL DEFAULT '',
      report_date TEXT NOT NULL DEFAULT ''
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS s2_chemical_events(
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      chemical_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      use_kg REAL NOT NULL DEFAULT 0,
      receive_kg REAL NOT NULL DEFAULT 0,
      input_mt REAL,
      before_mt REAL NOT NULL,
      after_mt REAL NOT NULL,
      report_date TEXT NOT NULL DEFAULT '',
      shift_name TEXT NOT NULL DEFAULT '',
      operator_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_s2_chem_events_time ON s2_chemical_events(created_at DESC)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_s2_chem_events_batch ON s2_chemical_events(batch_id)')
  ]);
  const t=now();
  const statements=ORDER.map(k=>{
    const m=META[k];
    return env.DB.prepare(`INSERT OR IGNORE INTO s2_chemical_stock
      (chemical_key,name,direct_mode,stock_mt,updated_at,updated_by,updated_shift,report_date)
      VALUES(?,?,?,?,?,?,?,?)`).bind(k,m.name,m.direct,m.initial,t,'Baseline 08/10/2026','PAGI','2026-10-08');
  });
  if(statements.length)await env.DB.batch(statements);
}

async function state(env){
  const q=await env.DB.prepare(`SELECT chemical_key,name,direct_mode,stock_mt,updated_at,updated_by,updated_shift,report_date
    FROM s2_chemical_stock`).all();
  const rows=q.results||[];
  rows.sort((a,b)=>ORDER.indexOf(a.chemical_key)-ORDER.indexOf(b.chemical_key));
  const latest=rows.reduce((best,r)=>!best||String(r.updated_at)>String(best.updated_at)?r:best,null);
  return {items:rows,last_update:latest?{updated_at:latest.updated_at,updated_by:latest.updated_by,updated_shift:latest.updated_shift,report_date:latest.report_date}:null};
}

async function history(env,limit=30){
  const lim=Math.max(1,Math.min(100,Number(limit)||30));
  const q=await env.DB.prepare(`SELECT e.*,
    COALESCE(s.name,e.chemical_key) AS chemical_name
    FROM s2_chemical_events e
    LEFT JOIN s2_chemical_stock s ON s.chemical_key=e.chemical_key
    ORDER BY e.created_at DESC LIMIT ?`).bind(lim).all();
  return q.results||[];
}

async function commit(env,d){
  const changes=Array.isArray(d.changes)?d.changes.slice(0,20):[];
  if(!changes.length)return json({ok:false,error:'Tiada perubahan stok'},400);
  const current=(await state(env)).items;
  const byKey=Object.fromEntries(current.map(r=>[r.chemical_key,r]));
  const reportDate=text(d.reportDate,10);
  const operator=text(d.operator,120)||'-';
  const shift=text(d.shift,20).toUpperCase()||'-';
  const created=now(),batch=id('chem');
  const updates=[],events=[];

  for(const raw of changes){
    const key=text(raw.key,40);
    const meta=META[key],cur=byKey[key];
    if(!meta||!cur)return json({ok:false,error:'Bahan kimia tidak sah'},400);
    const before=num(cur.stock_mt),type=text(raw.type,20).toLowerCase();
    let after=before,useKg=0,receiveKg=0,inputMt=null,eventType='';

    if(type==='set'){
      inputMt=Number(raw.mt);
      if(!Number.isFinite(inputMt)||inputMt<0)return json({ok:false,error:'Nilai '+meta.name+' tidak sah'},400);
      after=inputMt;eventType=meta.direct?'SET':'CORRECTION';
    }else{
      if(meta.direct)return json({ok:false,error:meta.name+' perlu masukkan nilai MT terus'},400);
      if(type!=='tx')return json({ok:false,error:meta.name+' guna transaksi kg'},400);
      useKg=Math.max(0,num(raw.useKg));
      receiveKg=Math.max(0,num(raw.receiveKg));
      if(useKg<=0&&receiveKg<=0)continue;
      after=before-useKg/1000+receiveKg/1000;
      eventType=useKg>0&&receiveKg>0?'USE_RECEIVE':useKg>0?'USE':'RECEIVE';
    }
    if(after<0)return json({ok:false,error:meta.name+': stok tak boleh kurang daripada 0 MT'},400);
    if(Math.abs(after-before)<0.0000001)continue;

    updates.push(env.DB.prepare(`UPDATE s2_chemical_stock
      SET stock_mt=?,updated_at=?,updated_by=?,updated_shift=?,report_date=? WHERE chemical_key=?`)
      .bind(after,created,operator,shift,reportDate,key));
    events.push(env.DB.prepare(`INSERT INTO s2_chemical_events
      (id,batch_id,chemical_key,event_type,use_kg,receive_kg,input_mt,before_mt,after_mt,report_date,shift_name,operator_name,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id('ce'),batch,key,eventType,useKg,receiveKg,inputMt,before,after,reportDate,shift,operator,created));
  }
  if(!updates.length)return json({ok:false,error:'Tiada perubahan stok'},400);
  await env.DB.batch([...updates,...events]);
  return json({ok:true,batch_id:batch,...await state(env)});
}

async function undoLast(env){
  const last=await env.DB.prepare('SELECT batch_id,created_at FROM s2_chemical_events ORDER BY created_at DESC LIMIT 1').first();
  if(!last)return json({ok:false,error:'Tiada transaksi untuk Undo'},400);
  const q=await env.DB.prepare('SELECT * FROM s2_chemical_events WHERE batch_id=? ORDER BY created_at ASC').bind(last.batch_id).all();
  const rows=q.results||[];
  if(!rows.length)return json({ok:false,error:'Transaksi tidak dijumpai'},404);
  const t=now();
  const restores=rows.map(r=>env.DB.prepare(`UPDATE s2_chemical_stock SET stock_mt=?,updated_at=?,updated_by=?,updated_shift=?,report_date=? WHERE chemical_key=?`)
    .bind(num(r.before_mt),t,'UNDO: '+text(r.operator_name,100),text(r.shift_name,20),text(r.report_date,10),r.chemical_key));
  const deletes=[env.DB.prepare('DELETE FROM s2_chemical_events WHERE batch_id=?').bind(last.batch_id)];
  await env.DB.batch([...restores,...deletes]);
  return json({ok:true,undone_batch:last.batch_id,...await state(env)});
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  if(!(await authorized(request)))return json({ok:false,error:'Access code S2 tidak sah'},401);
  try{
    await ensure(env);
    const url=new URL(request.url);
    if(request.method==='GET'){
      const action=text(url.searchParams.get('action'),30)||'state';
      if(action==='history')return json({ok:true,items:await history(env,url.searchParams.get('limit')),server_time:now()});
      return json({ok:true,...await state(env),server_time:now()});
    }
    if(request.method!=='POST')return json({ok:false,error:'Method tidak disokong'},405);
    let d={};try{d=await request.json()}catch{return json({ok:false,error:'Data tidak sah'},400)}
    const action=text(d.action,30);
    if(action==='commit')return commit(env,d);
    if(action==='undoLast')return undoLast(env);
    return json({ok:false,error:'Action tidak dikenali'},400);
  }catch(err){
    return json({ok:false,error:String(err?.message||err||'Ralat server')},500);
  }
}
