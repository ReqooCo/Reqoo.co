const HDR={'content-type':'application/json; charset=UTF-8','cache-control':'no-store','pragma':'no-cache','access-control-allow-origin':'https://reqoo.co','access-control-allow-headers':'content-type,x-s2-key','access-control-allow-methods':'GET,POST,OPTIONS','x-content-type-options':'nosniff'};
const ACCESS_HASH='da55872021a7acbbd84f80edee8c565ec1e9e5d926a1f18a4a6d6e1ed1586331';
const SLOTS=new Set(['01:00','03:00','05:00','07:00','09:00','11:00','13:00','15:00','17:00','19:00','21:00','23:00']);
const FULL=new Set(['07:00','15:00','23:00']);
const OLA_FIELDS=['rawTurb','rawPh','settledTurb','settledPh','filteredTurb','filteredPh','treatedTurb','treatedPh','treatedCl','treatedFl','treatedColour'];
const OLA_ALUMINIUM_FIELDS=['settledAl','treatedAl'];
// Lab full tests at 0700, 1500, 2300 already measure SW/TW aluminium.
// Intermediate 4-hour checks therefore fall at 0300, 1100 and 1900.
const OLA_ALUMINIUM_SLOTS=new Set(['03:00','11:00','19:00']);
function requiredFields(time){return FULL.has(time)?LAB_FIELDS:(OLA_ALUMINIUM_SLOTS.has(time)?[...OLA_FIELDS,...OLA_ALUMINIUM_FIELDS]:OLA_FIELDS)}
const LAB_FIELDS=['labRawTurb','labRawPh','labRawMn','labRawAmmonia','labRawColour','labRawIron','labRawAl','labRawFl','labRawOdour','labSettledTurb','labSettledPh','labSettledColour','labSettledMn','labSettledIron','labSettledAmmonia','labSettledAl','labSettledOdour','labFilteredTurb','labFilteredPh','labFilteredAmmonia','labFilteredMn','labTreatedTurb','labTreatedPh','labTreatedColourTCU','labTreatedColourACU','labTreatedCl','labTreatedFl','labTreatedAl','labTreatedMn','labTreatedIron','labTreatedAmmonia','labTreatedOdour'];
const ODOUR_FIELDS=new Set(['labRawOdour','labSettledOdour','labTreatedOdour']);
const json=(x,code=200)=>new Response(JSON.stringify(x),{status:code,headers:HDR});
const trim=(v,max=200)=>String(v??'').trim().slice(0,max);
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
async function sha256(str){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(str||'')));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function dateOK(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v}
function escapeHTML(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function htmlError(message,code=400){return new Response('<!doctype html><html lang="ms"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WQ Report</title><body style="padding:20px;font-family:system-ui;color:#21483b"><h2>Report belum dihantar</h2><p>'+escapeHTML(message)+'</p><a href="https://reqoo.co/wq/">Kembali ke WQ Monitoring</a></body></html>',{status:code,headers:{'content-type':'text/html; charset=UTF-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})}
async function ensure(db){
 await db.batch([
 db.prepare(`CREATE TABLE IF NOT EXISTS s2_wq_reports(
   report_date TEXT NOT NULL, report_time TEXT NOT NULL, values_json TEXT NOT NULL,
   fluoride_note INTEGER NOT NULL DEFAULT 1, other_note TEXT NOT NULL DEFAULT '',
   updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '',
   PRIMARY KEY(report_date,report_time)
 )`),
 db.prepare(`CREATE TABLE IF NOT EXISTS s2_wq_history(
   id TEXT PRIMARY KEY, report_date TEXT NOT NULL, report_time TEXT NOT NULL,
   values_json TEXT NOT NULL, fluoride_note INTEGER NOT NULL DEFAULT 1,
   other_note TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT ''
 )`),
 db.prepare('CREATE INDEX IF NOT EXISTS idx_s2_wq_hist_time ON s2_wq_history(updated_at DESC)')
 ]);
}
function validate(input){
 const date=trim(input.reportDate,10),time=trim(input.reportTime,5);
 if(!dateOK(date)||!SLOTS.has(time))return{error:'Tarikh atau slot masa tidak sah.'};
 const isLab=FULL.has(time),expected=requiredFields(time);
 const source=input.values;
 if(!source||typeof source!=='object'||Array.isArray(source))return{error:'Bacaan WQ tidak sah.'};
 const values={};
 for(const field of expected){
   const val=trim(source[field],30);
   if(!val)return{error:'Lengkapkan semua bacaan ('+field+'). Tulis - jika tiada bacaan.'};
   if(ODOUR_FIELDS.has(field)){
     if(!/^(?:[\p{L}\d][\p{L}\d _./()-]{0,28}|-)$/u.test(val))return{error:'Bacaan bau tidak sah: '+field};
   }else if(val!=='-'&&!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(val))return{error:'Bacaan nombor tidak sah: '+field};
   values[field]=val;
 }
 const fluorideNote=!isLab&&(input.fluorideNote===true||input.fluorideNote==='true'||input.fluorideNote==='1');
 const otherNote=trim(input.otherNote,320),operator=trim(input.operator,100)||'-';
 return{reportDate:date,reportTime:time,values,fluorideNote,otherNote,operator,isLab};
}
function renderReport(d){
 const v=d.values,vu=(key,unit='')=>v[key]==='-'?'-':v[key]+unit;
 const [year,month,day]=d.reportDate.split('-');
 const hh=Number(d.reportTime.slice(0,2));
 const at=String(hh>12?hh-12:hh).padStart(2,'0')+'00'+(hh>=12?'pm':'am');
 if(FULL.has(d.reportTime)){
   const lines=['*LRA Semenyih 2*','*Water Quality Lab Test*','*'+day+'/'+month+'/'+year+' '+at+'*','',
   '*AIR MENTAH*',
   'Turb              : '+vu('labRawTurb','NTU'),
   'pH                 : '+vu('labRawPh'),
   'Mn                : '+vu('labRawMn','mg/L'),
   'Ammonia     : '+vu('labRawAmmonia','mg/L'),
   'Warna           : '+vu('labRawColour','TCU'),
   'Ferum           : '+vu('labRawIron','mg/L'),
   'Aluminium   : '+vu('labRawAl','mg/L'),
   'Florida          : '+vu('labRawFl','mg/L'),
   'Bau                : '+vu('labRawOdour'),'',
   '*AIR MENDAP*',
   'Turb               : '+vu('labSettledTurb','NTU'),
   'pH                  : '+vu('labSettledPh'),
   'Warna            : '+vu('labSettledColour','TCU'),
   'Mn                  : '+vu('labSettledMn','mg/L'),
   'Ferum            : '+vu('labSettledIron','mg/L'),
   'Ammonia       : '+vu('labSettledAmmonia','mg/L'),
   'Aluminium    : '+vu('labSettledAl','mg/L'),
   'Bau                : '+vu('labSettledOdour'),'',
   '*AIR TAPISAN*',
   'Turb                : '+vu('labFilteredTurb','NTU'),
   'pH                   : '+vu('labFilteredPh'),
   'Ammonia       : '+vu('labFilteredAmmonia','mg/L'),
   'Mn                  : '+vu('labFilteredMn','mg/L'),'',
   '*AIR TERAWAT*',
   'Turb                  : '+vu('labTreatedTurb','NTU'),
   'pH                     : '+vu('labTreatedPh'),
   'Warna               : '+vu('labTreatedColourTCU','TCU'),
   '                          : '+vu('labTreatedColourACU','ACU'),
   'Cl2                    : '+vu('labTreatedCl','mg/L'),
   'Florida              : '+vu('labTreatedFl','mg/L'),
   'Aluminium       : '+vu('labTreatedAl','mg/L'),
   'Mn                     : '+vu('labTreatedMn','mg/L'),
   'Ferum               : '+vu('labTreatedIron','mg/L'),
   'Ammonia         : '+vu('labTreatedAmmonia','mg/L'),
   'Bau                    : '+vu('labTreatedOdour')];
   if(d.otherNote)lines.push('','*'+d.otherNote.replace(/\*/g,'')+'*');
   return lines.join('\n');
 }
 const lines=['*LRA Semenyih 2*','*Water Quality Monitoring (OLA)*','*'+day+'/'+month+'/'+year+'*','*'+at+'*',
 '','*_Raw Water_*',
 'Turb     : '+vu('rawTurb','NTU'),
 'pH        : '+vu('rawPh'),
 '','*_Settled Water_*',
 'Turb     : '+vu('settledTurb','NTU'),
 'pH        : '+vu('settledPh'),
 ...(OLA_ALUMINIUM_SLOTS.has(d.reportTime)?['Aluminium: '+vu('settledAl','mg/L'),]:[]),
 '','*_Filtered Water_*',
 'Turb     : '+vu('filteredTurb','NTU'),
 'pH        : '+vu('filteredPh'),
 '','*_Treated Water_*',
 'Turb       : '+vu('treatedTurb','NTU'),
 'pH          : '+vu('treatedPh'),
 'Free cl2 : '+vu('treatedCl','mg/L'),
 'Fluoride : '+vu('treatedFl','mg/L'),
 ...(OLA_ALUMINIUM_SLOTS.has(d.reportTime)?['Aluminium : '+vu('treatedAl','mg/L'),]:[]),
 'Colour : '+vu('treatedColour','ACU')];
 if(d.fluorideNote)lines.push('','*Bacaan Fluoride diambil dari OLA Fluoride no 2*');
 if(d.otherNote)lines.push('','*'+d.otherNote.replace(/\*/g,'')+'*');
 return lines.join('\n');
}
export async function onRequest({request,env}){
 const path=new URL(request.url).pathname,share=path==='/api/s2-wq-share';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HDR});
 let posted={};
 if(share){
   if(request.method!=='POST')return htmlError('Sila gunakan butang WhatsApp dari app.',405);
   try{posted=Object.fromEntries(new URLSearchParams(await request.text()));posted.values=JSON.parse(posted.values||'{}')}catch{return htmlError('Maklumat laporan tidak sah.')}
 }
 const key=share?trim(posted.accessKey,240):request.headers.get('X-S2-Key')||'';
 if(!key||await sha256(key)!==ACCESS_HASH)return share?htmlError('Access code S2 tidak sah.',401):json({ok:false,error:'Access code S2 tidak sah.'},401);
 try{
   if(!env.DB)throw new Error('Database tidak tersedia');
   await ensure(env.DB);
   if(!share&&request.method==='GET'){
     const url=new URL(request.url),action=url.searchParams.get('action');
     if(action==='one'){
       const date=trim(url.searchParams.get('date'),10),time=trim(url.searchParams.get('time'),5);
       if(!dateOK(date)||!SLOTS.has(time))return json({ok:false,error:'Tarikh / masa tidak sah'},400);
       const row=await env.DB.prepare('SELECT * FROM s2_wq_reports WHERE report_date=? AND report_time=?').bind(date,time).first();
       if(!row)return json({ok:true,report:null});
       let values={};try{values=JSON.parse(row.values_json)}catch{}
       return json({ok:true,report:{reportDate:row.report_date,reportTime:row.report_time,values,fluorideNote:!!row.fluoride_note,otherNote:row.other_note,updatedAt:row.updated_at,operator:row.updated_by}});
     }
     const q=await env.DB.prepare('SELECT report_date,report_time,updated_at,updated_by FROM s2_wq_reports ORDER BY updated_at DESC LIMIT 16').all();
     return json({ok:true,recent:q.results||[]});
   }
   if(request.method!=='POST')return share?htmlError('Method tidak sah',405):json({ok:false,error:'Method tidak disokong'},405);
   if(!share){try{posted=await request.json()}catch{return json({ok:false,error:'Data tidak sah'},400)}}
   const data=validate(posted);
   if(data.error)return share?htmlError(data.error):json({ok:false,error:data.error},400);
   const created=now(),v=JSON.stringify(data.values);
   await env.DB.batch([
     env.DB.prepare(`INSERT INTO s2_wq_reports(report_date,report_time,values_json,fluoride_note,other_note,updated_at,updated_by)
     VALUES(?,?,?,?,?,?,?) ON CONFLICT(report_date,report_time) DO UPDATE SET
     values_json=excluded.values_json,fluoride_note=excluded.fluoride_note,other_note=excluded.other_note,updated_at=excluded.updated_at,updated_by=excluded.updated_by`)
      .bind(data.reportDate,data.reportTime,v,data.fluorideNote?1:0,data.otherNote,created,data.operator),
     env.DB.prepare(`INSERT INTO s2_wq_history(id,report_date,report_time,values_json,fluoride_note,other_note,updated_at,updated_by)
       VALUES(?,?,?,?,?,?,?,?)`).bind(uid(),data.reportDate,data.reportTime,v,data.fluorideNote?1:0,data.otherNote,created,data.operator)
   ]);
   if(share)return new Response(null,{status:303,headers:{location:'https://wa.me/?text='+encodeURIComponent(renderReport(data)),'cache-control':'no-store','referrer-policy':'no-referrer'}});
   return json({ok:true,updatedAt:created,report:renderReport(data)});
 }catch(e){
   const msg='Database tidak berjaya menyimpan laporan: '+String(e?.message||e);
   return share?htmlError(msg,500):json({ok:false,error:msg},500);
 }
}