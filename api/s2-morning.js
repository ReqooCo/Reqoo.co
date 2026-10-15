const HEADERS={'content-type':'application/json;charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'https://reqoo.co','access-control-allow-headers':'content-type,x-s2-key','access-control-allow-methods':'GET,POST,OPTIONS','x-content-type-options':'nosniff'};
const ACCESS_HASH='da55872021a7acbbd84f80edee8c565ec1e9e5d926a1f18a4a6d6e1ed1586331';
const KEYS=['production','designCapacity','monthlyAverage','rwAbst','pondA','pondB','pondC','pondChange','pondStorage','pondTwlCapacity','pondTwlLevel','criticalLevel','criticalPercent','criticalStorage','intakeB','wt1','sjamB','sjamCActual','intakeCHourly','sjamCHourly','dp1','dp2','dpOutHourly','dpPressure','sivTarget','sivStatus','sivChallengeA','sivChallengeB','twTotalizerPrevious','twTotalizerCurrent','twTotalizerUnit','rwTotalizerPrevious','rwTotalizerCurrent','rwTotalizerUnit','pondCFlowValue','pondCFlowUnit','forecastAuto','sjamForecastAuto','pondStorageAuto','criticalStorageAuto','pondAProblem','pondANote'];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:HEADERS});
const t=(x,n=120)=>String(x??'').trim().slice(0,n);
const dateOK=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
async function digest(x){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(x||'')));return Array.from(new Uint8Array(b)).map(v=>v.toString(16).padStart(2,'0')).join('')}
function errPage(msg,status=400){const safe=t(msg,600).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Report 0700</title><main style="font:16px system-ui;max-width:550px;margin:35px auto;padding:15px;color:#214d40"><h2>Report belum dihantar</h2><p>'+safe+'</p><a href="https://reqoo.co/lra/">Kembali ke LRA Report</a></main>',{status,headers:{'content-type':'text/html;charset=UTF-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}
async function ensure(db){await db.batch([
  db.prepare('CREATE TABLE IF NOT EXISTS s2_morning_reports (report_date TEXT PRIMARY KEY, data_json TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT \'-\', last_format INTEGER NOT NULL DEFAULT 1)'),
  db.prepare('CREATE TABLE IF NOT EXISTS s2_morning_history (id TEXT PRIMARY KEY, report_date TEXT NOT NULL, data_json TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT \'-\', format_number INTEGER NOT NULL, report_text TEXT NOT NULL)'),
  db.prepare('CREATE INDEX IF NOT EXISTS idx_s2_morning_history_date ON s2_morning_history(report_date,updated_at DESC)')
])}
function validateValues(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Data bacaan tidak sah.');
 const o={};
 for(const key of KEYS){
   if(['forecastAuto','sjamForecastAuto','pondStorageAuto','criticalStorageAuto'].includes(key)){o[key]=x[key]===true;continue}
   if(key==='pondAProblem'){o[key]=x[key]===true;continue}
   if(key==='pondANote'){o[key]=t(x[key],220);continue}
   if(key==='twTotalizerUnit'||key==='rwTotalizerUnit'){const v=t(x[key],10)||'m3';if(!['m3','ML'].includes(v))throw Error('Unit totalizer tidak sah: '+key);o[key]=v;continue}
   if(key==='pondCFlowUnit'){const unit=t(x[key],10)||'MLD';if(!['MLD','m3h'].includes(unit))throw Error('Unit RW Pond C tidak sah.');o[key]=unit;continue}
   if(key==='sivStatus'){const v=t(x[key],20)||'auto';if(!['auto','not','achieved'].includes(v))throw Error('Status SIV tidak sah.');o[key]=v;continue}
   if(key==='sivChallengeA'||key==='sivChallengeB'){o[key]=t(x[key],1200);continue}
   const value=t(x[key],50);
   if(value&&value!=='-'&&!(key==='pondChange'?/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/:/^-?(?:\d+(?:\.\d+)?|\.\d+)$/).test(value))throw Error('Nombor tidak sah: '+key);
   o[key]=value;
 }
 // Recompute the legacy hourly field from the new dedicated 0700 Pond C flow.
 // Never use daily RW Abst / forecastAuto as the source of a critical-level forecast.
 if(Object.prototype.hasOwnProperty.call(x,'pondCFlowValue')){
   const raw=o.pondCFlowValue;
   if(raw){
     const reading=Number(raw);
     const mld=o.pondCFlowUnit==='m3h'?reading*24/1000:reading;
     if(!Number.isFinite(mld)||mld<=0||mld>1000)throw Error('Semak flow Pond C → WTP jam 0700.');
     o.intakeCHourly=(mld*1000/24).toFixed(5);
   }else{o.intakeCHourly=''}
   o.forecastAuto=false;
 }
 const matches=Number(o.pondTwlLevel)===12&&Number(o.pondTwlCapacity)===3984.50;
 const volume=level=>{
   const val=String(level||'').trim();
   if(!val||!/^\d+(?:\.\d+)?$/.test(val))return null;
   const n=Number(val);
   return n>=7.5&&n<=12?Math.round((1226+(n-7.5)*613)*100)/100:null;
 };
 if(o.pondStorageAuto){
   const v=matches?volume(o.pondC):null;
   o.pondStorage=v===null?'':v.toFixed(2);
 }
 if(o.criticalStorageAuto){
   const v=matches?volume(o.criticalLevel):null;
   o.criticalStorage=v===null?'':v.toFixed(2);
 }
 return o;
}
export async function onRequest({request,env}){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
 const u=new URL(request.url),share=u.pathname==='/api/s2-morning-share';
 let form=null;
 if(share){
   if(request.method!=='POST')return errPage('Gunakan butang WhatsApp dalam app.',405);
   if(!(request.headers.get('content-type')||'').includes('application/x-www-form-urlencoded'))return errPage('Format tidak sah.');
   try{form=Object.fromEntries(new URLSearchParams(await request.text()))}catch{return errPage('Data tidak sah.')}
 }
 const key=share?t(form.accessKey,200):request.headers.get('X-S2-Key')||'';
 if(!key||await digest(key)!==ACCESS_HASH)return share?errPage('Access code S2 tidak sah.',401):json({ok:false,error:'Access code S2 tidak sah.'},401);
 try{
   if(!env.DB)throw Error('Database S2 tidak dapat diakses.');
   await ensure(env.DB);
   if(!share&&request.method==='GET'){
     const date=t(u.searchParams.get('date'),10);
     if(!dateOK(date))return json({ok:false,error:'Tarikh tidak sah.'},400);
     const row=await env.DB.prepare('SELECT report_date,data_json,updated_at,updated_by,last_format FROM s2_morning_reports WHERE report_date=?').bind(date).first();
     if(!row)return json({ok:true,report:null});
     let values={};try{values=JSON.parse(row.data_json||'{}')}catch{}
     return json({ok:true,report:{reportDate:row.report_date,values,updatedAt:row.updated_at,operator:row.updated_by,formatNumber:row.last_format}});
   }
   if(request.method!=='POST')return json({ok:false,error:'Method tidak disokong.'},405);
   const x=share?form:await request.json();
   const date=t(x.reportDate,10),number=Number(x.formatNumber),operator=t(x.operator,120)||'-';
   if(!dateOK(date))throw Error('Tarikh report tidak sah.');
   if(![1,2,3,4,5].includes(number))throw Error('Format report tidak sah.');
   const input=typeof x.values==='string'?JSON.parse(x.values):x.values;
   const values=validateValues(input);
   let expectedCriticalDays=null;
   if([2,3,4].includes(number)){
     const raw=values.pondCFlowValue;
     if(!raw||values.forecastAuto)throw Error('Sila buka versi terbaru app dan isi RW Abstraction Pond C → WTP @0700, bukan RW Abst harian.');
     const mld=values.pondCFlowUnit==='m3h'?Number(raw)*24/1000:Number(raw);
     const sjamRaw=String(values.sjamCHourly||'').trim();
     if(!sjamRaw||!Number.isFinite(Number(sjamRaw))||Number(sjamRaw)<0)throw Error('Isi SJAM C Critical Flow (m³/jam), guna 0 jika tiada.');
     const total=mld+Number(sjamRaw)*24/1000;
     if(!Number.isFinite(total)||total<=0||!values.pondStorage||!values.criticalStorage)throw Error('Data storage dan flow untuk hari kritikal belum lengkap.');
     expectedCriticalDays=(Math.max(0,Number(values.pondStorage)-Number(values.criticalStorage))/total).toFixed(1);
   }
   if(number===5){
     const p=Number(values.production),goal=Number(values.sivTarget);
     if(!values.production||!values.sivTarget||!Number.isFinite(p)||!Number.isFinite(goal)||goal<=0){
       throw Error('Format 5 memerlukan Total Prod dan Sasaran SIV yang sah.');
     }
   }
   const reportText=t(x.reportText,14000);
   if(share&&(!reportText||!reportText.includes('LRA Semenyih 2')))throw Error('Preview WhatsApp tidak sah.');
   if(share&&expectedCriticalDays!==null&&!reportText.includes('*'+expectedCriticalDays+'* days'))
     throw Error('Preview Days to Critical tidak selaras dengan RW flow Pond C @0700. Buka semula app dan semak bacaan.');

   const now=new Date().toISOString(),body=JSON.stringify(values);
   await env.DB.batch([
     env.DB.prepare('INSERT INTO s2_morning_reports(report_date,data_json,updated_at,updated_by,last_format) VALUES(?,?,?,?,?) ON CONFLICT(report_date) DO UPDATE SET data_json=excluded.data_json, updated_at=excluded.updated_at,updated_by=excluded.updated_by,last_format=excluded.last_format').bind(date,body,now,operator,number),
     env.DB.prepare('INSERT INTO s2_morning_history(id,report_date,data_json,updated_at,updated_by,format_number,report_text) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),date,body,now,operator,number,reportText)
   ]);
   if(share)return new Response(null,{status:303,headers:{location:'https://wa.me/?text='+encodeURIComponent(reportText),'cache-control':'no-store','referrer-policy':'no-referrer'}});
   return json({ok:true,updatedAt:now});
 }catch(e){const msg=t(e?.message||e,500);return share?errPage(msg,400):json({ok:false,error:msg},400)}
}