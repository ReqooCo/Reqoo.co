const HEADERS={'content-type':'application/json; charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'https://reqoo.co','access-control-allow-headers':'content-type,x-s2-key','access-control-allow-methods':'GET,POST,OPTIONS','x-content-type-options':'nosniff'};
const ACCESS_HASH='da55872021a7acbbd84f80edee8c565ec1e9e5d926a1f18a4a6d6e1ed1586331';
const MONTHS=['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis'];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:HEADERS});
const txt=(v,n=120)=>String(v??'').trim().slice(0,n);
const dateOK=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(new Date(v+'T00:00:00Z').getTime())&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const num=v=>/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(v);
const DEFAULT_A='Kaedah pengiraan pengeluaran LRA Semenyih 2 :\nPengeluaran LRA Semenyih 2 = Bacaan Totalizer Tw (Semasa) - Bacaan Totalizer Tw (Sebelum)';
const DEFAULT_B='Pihak LRA Semenyih 2 Perlu mengawal Paras Kolam Desa Putra pada 3.00m - 7.83m seperti diminta SO bagi memenuhi Demand.';
async function hash(v){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v||'')));return [...new Uint8Array(bytes)].map(i=>i.toString(16).padStart(2,'0')).join('')}
function errorPage(message,status=400){const safe=txt(message,800).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return new Response('<!doctype html><html lang="ms"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SIV Report</title><body style="font:16px system-ui;padding:25px;color:#245847"><h2>Report belum dihantar</h2><p>'+safe+'</p><a href="https://reqoo.co/siv/">Kembali ke SIV Report</a></body></html>',{status,headers:{'content-type':'text/html;charset=UTF-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}})}
async function ensure(db){
 await db.batch([
 db.prepare("CREATE TABLE IF NOT EXISTS s2_siv_reports(report_date TEXT PRIMARY KEY,values_json TEXT NOT NULL,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL DEFAULT '-')"),
 db.prepare("CREATE TABLE IF NOT EXISTS s2_siv_history(id TEXT PRIMARY KEY,report_date TEXT NOT NULL,values_json TEXT NOT NULL,report_text TEXT NOT NULL,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL DEFAULT '-')"),
 db.prepare('CREATE INDEX IF NOT EXISTS idx_s2_siv_hist_date ON s2_siv_history(report_date,updated_at DESC)')
 ]);
}
function validate(data){
 const date=txt(data.reportDate,10);
 if(!dateOK(date))throw Error('Tarikh report tidak sah.');
 const production=txt(data.production,32),target=txt(data.target,32);
 if(!num(production)||!num(target))throw Error('Isi Pengeluaran dan Sasaran dengan nombor yang sah.');
 if(Number(target)<=0)throw Error('Sasaran perlu lebih daripada 0 MLD.');
 if(Number(production)<0||Number(production)>10000||Number(target)>10000)throw Error('Semak nilai pengeluaran atau sasaran MLD.');
 const status=txt(data.status,16)||'auto';
 if(!['auto','not','achieved'].includes(status))throw Error('Status SIV tidak sah.');
 const challengeA=txt(data.challengeA,1200)||DEFAULT_A;
 const challengeB=txt(data.challengeB,1200)||DEFAULT_B;
 const operator=txt(data.operator,100)||'-';
 // The totalizer values are optional working data, not sent to WhatsApp.
 const prev=txt(data.totalizerPrevious,32),current=txt(data.totalizerCurrent,32);
 if((prev&&!num(prev))||(current&&!num(current)))throw Error('Nilai totalizer tidak sah.');
 return{reportDate:date,production,target,status,challengeA,challengeB,operator,totalizerPrevious:prev,totalizerCurrent:current};
}
function reportText(d){
 const production=Number(d.production),target=Number(d.target),difference=production-target;
 const pct=Math.abs(difference)/target*100;
 const status=d.status==='not'?'Not achieved':d.status==='achieved'?'Achieved':difference>0.0000001?'Not achieved':'Achieved';
 const month=MONTHS[Number(d.reportDate.slice(5,7))-1]+' '+d.reportDate.slice(0,4);
 const date=d.reportDate.slice(8,10)+'/'+d.reportDate.slice(5,7)+'/'+d.reportDate.slice(0,4);
 const output=production.toFixed(3),goal=target.toFixed(3);
 const label=difference>=0?'Peningkatan':'Penurunan';
 return [
 '*SIV '+status+' today*',
 '*LRA SEMENYIH 2*',
 '*Date : '+date+'*',
 '',
 '*1.Current Performance :*',
 'Pengeluaran - '+output+'MLD',
 'Sasaran '+month+' - '+goal+'MLD',
 label+' - '+Math.abs(difference).toFixed(3)+'MLD ('+pct.toFixed(3)+'%)',
 '',
 '*2. Challenges :*',
 'a) '+d.challengeA,
 '',
 'b. '+d.challengeB,
 '',
 'Note:',
 'Jumlah Demand LRA Semenyih 2 : *'+output+'Mld* (Sasaran '+month+': '+goal+'Mld)'
 ].join('\n');
}
export async function onRequest({request,env}){
 const url=new URL(request.url),share=url.pathname==='/api/s2-siv-share';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
 let input={};
 if(share){
  if(request.method!=='POST')return errorPage('Gunakan butang WhatsApp dari app.',405);
  if(!(request.headers.get('content-type')||'').includes('application/x-www-form-urlencoded'))return errorPage('Format tidak sah.');
  try{input=Object.fromEntries(new URLSearchParams(await request.text()))}catch{return errorPage('Data permintaan tidak sah.')}
 }
 const code=share?txt(input.accessKey,240):request.headers.get('X-S2-Key')||'';
 if(!code||await hash(code)!==ACCESS_HASH)return share?errorPage('Access code S2 tidak sah.',401):json({ok:false,error:'Access code S2 tidak sah.'},401);
 try{
  if(!env.DB)throw Error('Database S2 tidak tersedia.');
  await ensure(env.DB);
  if(!share&&request.method==='GET'){
   const action=url.searchParams.get('action');
   if(action==='one'){
    const date=txt(url.searchParams.get('date'),10);
    if(!dateOK(date))return json({ok:false,error:'Tarikh tidak sah.'},400);
    const row=await env.DB.prepare('SELECT * FROM s2_siv_reports WHERE report_date=?').bind(date).first();
    let data=null;try{data=row?JSON.parse(row.values_json):null}catch{}
    return json({ok:true,report:data?{...data,updatedAt:row.updated_at,operator:row.updated_by}:null});
   }
   const rows=await env.DB.prepare('SELECT report_date,updated_at,updated_by FROM s2_siv_reports ORDER BY report_date DESC LIMIT 20').all();
   return json({ok:true,recent:rows.results||[]});
  }
  if(request.method!=='POST')return share?errorPage('Method tidak disokong.',405):json({ok:false,error:'Method tidak disokong.'},405);
  if(!share){try{input=await request.json()}catch{return json({ok:false,error:'JSON tidak sah.'},400)}}
  let data;try{data=validate(input)}catch(e){return share?errorPage(e.message,400):json({ok:false,error:e.message},400)}
  const stamp=new Date().toISOString(),text=reportText(data);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO s2_siv_reports(report_date,values_json,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(report_date) DO UPDATE SET values_json=excluded.values_json,updated_at=excluded.updated_at,updated_by=excluded.updated_by")
      .bind(data.reportDate,JSON.stringify(data),stamp,data.operator),
    env.DB.prepare('INSERT INTO s2_siv_history(id,report_date,values_json,report_text,updated_at,updated_by) VALUES(?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),data.reportDate,JSON.stringify(data),text,stamp,data.operator)
  ]);
  if(share)return new Response(null,{status:303,headers:{location:'https://wa.me/?text='+encodeURIComponent(text),'cache-control':'no-store','referrer-policy':'no-referrer'}});
  return json({ok:true,report:text,updatedAt:stamp});
 }catch(e){
  const message='Database gagal menyimpan report: '+String(e?.message||e);
  return share?errorPage(message,500):json({ok:false,error:message},500);
 }
}