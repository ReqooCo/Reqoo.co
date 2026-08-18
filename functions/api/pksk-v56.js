const TOTAL_SETS=50;
const MAX_DEVICES=3;
const BANK_ORIGIN='https://pksk.sim.reqoo.co';
const ALLOWED_CALLBACK=/^[A-Za-z_$][A-Za-z0-9_$]*$/;

export async function onRequest(context){
  const {request,env}=context;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders()});
  try{const d=await readInput(request),result=await route(d,env);return respond(result,d.callback||'')}
  catch(e){return respond({ok:false,error:String(e?.message||e)})}
}
async function readInput(request){
  const url=new URL(request.url),q=Object.fromEntries(url.searchParams.entries());
  if(request.method==='GET')return q;
  const ct=request.headers.get('content-type')||'';
  if(ct.includes('application/json'))return {...await request.json(),callback:q.callback||''};
  return q;
}
function corsHeaders(){return {'access-control-allow-origin':'https://pksk.sim.reqoo.co','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'}}
function respond(obj,callback=''){
  const text=JSON.stringify(obj);
  if(callback&&ALLOWED_CALLBACK.test(callback))return new Response(`${callback}(${text});`,{headers:{'content-type':'application/javascript; charset=UTF-8',...corsHeaders()}});
  return new Response(text,{headers:{'content-type':'application/json; charset=UTF-8',...corsHeaders()}});
}
function cleanCode(v){return String(v||'').trim().toUpperCase()}
function now(){return new Date().toISOString()}
function makeId(prefix){return `${prefix}_${crypto.randomUUID()}`}
function deviceLabel(ua){const s=String(ua||'');if(/iPhone/i.test(s))return'iPhone';if(/iPad/i.test(s))return'iPad';if(/Android/i.test(s))return'Android';if(/Windows/i.test(s))return'Windows PC';if(/Macintosh|Mac OS X/i.test(s))return'Mac';return'Browser'}
async function route(d,env){const action=String(d.action||'');if(action==='validateAccess')return validateAccess(d,env);if(action==='registerDevice')return registerDevice(d,env);if(action==='getCustomerDashboard')return getCustomerDashboard(d,env);if(action==='saveProgress')return saveProgress(d,env);if(action==='logClientError')return {ok:true};return {ok:false,error:'Action V57 tidak disokong'}}
async function getLicense(code,env){return env.DB.prepare('SELECT * FROM licenses WHERE access_code=?').bind(cleanCode(code)).first()}
async function ensureMaxDevices(l,env){await env.DB.prepare('UPDATE licenses SET max_devices=? WHERE id=? AND (max_devices IS NULL OR max_devices<?)').bind(MAX_DEVICES,l.id,MAX_DEVICES).run()}
async function validateAccess(d,env){const code=cleanCode(d.code);if(!code)return {ok:false,error:'Access Code diperlukan'};const l=await getLicense(code,env);if(!l)return {ok:false,error:'Access Code tidak sah'};if(String(l.status).toLowerCase()!=='active')return {ok:false,error:'License tidak aktif',status:l.status};await ensureMaxDevices(l,env);const r=await env.DB.prepare("SELECT COUNT(*) AS n FROM devices WHERE license_id=? AND status='active'").bind(l.id).first();return {ok:true,accessCode:code,maxDevices:MAX_DEVICES,deviceCount:Number(r?.n||0)}}
async function registerDevice(d,env){
  const code=cleanCode(d.code),key=String(d.deviceId||'').trim();
  if(!code||!key)return {ok:false,error:'Maklumat peranti tidak lengkap'};
  const l=await getLicense(code,env);if(!l)return {ok:false,error:'Access Code tidak sah'};
  if(String(l.status).toLowerCase()!=='active')return {ok:false,error:'License tidak aktif'};
  await ensureMaxDevices(l,env);
  const existing=await env.DB.prepare('SELECT * FROM devices WHERE license_id=? AND device_key=?').bind(l.id,key).first();
  if(existing){await env.DB.prepare("UPDATE devices SET last_seen=?,device_name=?,status='active' WHERE id=?").bind(now(),deviceLabel(d.userAgent),existing.id).run();const c=await env.DB.prepare("SELECT COUNT(*) AS n FROM devices WHERE license_id=? AND status='active'").bind(l.id).first();return {ok:true,registered:true,deviceCount:Number(c?.n||0),maxDevices:MAX_DEVICES}}
  const inserted=await env.DB.prepare("INSERT INTO devices (id,license_id,device_key,device_name,first_seen,last_seen,status) SELECT ?,?,?,?,?,?,'active' WHERE (SELECT COUNT(*) FROM devices WHERE license_id=? AND status='active') < ?").bind(makeId('dev'),l.id,key,deviceLabel(d.userAgent),now(),now(),l.id,MAX_DEVICES).run();
  if(!inserted.meta?.changes)return {ok:false,error:`Akses maksimum ${MAX_DEVICES} peranti telah digunakan.`,limitReached:true,deviceCount:MAX_DEVICES,maxDevices:MAX_DEVICES};
  const c=await env.DB.prepare("SELECT COUNT(*) AS n FROM devices WHERE license_id=? AND status='active'").bind(l.id).first();
  return {ok:true,registered:true,deviceCount:Number(c?.n||0),maxDevices:MAX_DEVICES};
}
async function requireDevice(d,l,env){const key=String(d.deviceId||'').trim();if(!key)return false;return !!(await env.DB.prepare("SELECT id FROM devices WHERE license_id=? AND device_key=? AND status='active'").bind(l.id,key).first())}
async function loadBank(setNo){
  const groupStart=Math.floor((setNo-1)/10)*10+1,groupEnd=groupStart+9;
  const group=`SET ${String(groupStart).padStart(2,'0')}-${String(groupEnd).padStart(2,'0')}`;
  const url=`${BANK_ORIGIN}/simulator/sets/${encodeURIComponent(group)}/data/set${String(setNo).padStart(2,'0')}.json`;
  const r=await fetch(url,{cf:{cacheTtl:60}});if(!r.ok)throw new Error('Bank soalan canonical tidak dapat dicapai');
  const bank=await r.json();if(!Array.isArray(bank.questions)||!bank.questions.length)throw new Error('Bank soalan kosong');return bank;
}
async function scoreAnswers(setNo,answers){
  const bank=await loadBank(setNo);let aScore=0,aMax=0,bCorrect=0,aAnswered=0,bAnswered=0;
  for(const q of bank.questions){if(q.section==='BAHAGIAN A'){const w=Array.isArray(q.weights)?q.weights:[];if(w.length)aMax+=Math.max(...w)}}
  for(const q of bank.questions){const v=answers?.[q.id];if(v===undefined||v===null||v==='')continue;const i=Number(v);if(!Number.isInteger(i))continue;if(q.section==='BAHAGIAN A'){const w=Array.isArray(q.weights)?q.weights:[];if(w[i]!==undefined){aScore+=Number(w[i])||0;aAnswered++}}else if(q.section==='BAHAGIAN B'){bAnswered++;if(i===Number(q.answer))bCorrect++}}
  const bMax=bank.questions.filter(q=>q.section==='BAHAGIAN B').length||70;
  return {scoreA:aMax?Math.round(aScore/aMax*100):0,scoreB:bMax?Math.round(bCorrect/bMax*100):0,bCorrect,aAnswered,bAnswered};
}
function scoreWriting(text){
  const t=String(text||'').trim(),words=t? t.split(/\s+/).length:0;
  const examples=(t.match(/\b(contohnya|sebagai contoh|misalnya|contoh)\b/gi)||[]).length;
  const connectors=(t.match(/\b(selain itu|seterusnya|oleh itu|namun|akhir sekali|kesimpulannya|pada pendapat saya)\b/gi)||[]).length;
  const conclusion=/\b(kesimpulannya|sebagai kesimpulan|akhir kata|ringkasnya)\b/i.test(t);
  const r=[words>=100?4:Math.min(4,Math.floor(words/25)),Math.min(4,Math.max(1,Math.floor(words/55))),Math.min(4,examples+(words>=140?1:0)),Math.min(4,Math.max(1,1+Math.min(connectors,3))),Math.min(4,(words>=100?2:1)+(conclusion?2:0))];
  return {words,total:r.reduce((a,b)=>a+b,0)};
}
async function saveProgress(d,env){
  const code=cleanCode(d.code),setNo=Number(d.setNo||0),section=String(d.section||'OVERALL').trim()||'OVERALL';
  if(!code||setNo<1||setNo>TOTAL_SETS)return {ok:false,error:'Data progress tidak sah'};
  const l=await getLicense(code,env);if(!l||String(l.status).toLowerCase()!=='active')return {ok:false,error:'License tidak aktif'};
  if(!(await requireDevice(d,l,env)))return {ok:false,error:'Peranti belum didaftarkan'};
  let score=Number(d.score||0),scoreA=Number(d.scoreA||0),scoreB=Number(d.scoreB||0),scoreC=Number(d.scoreC||0),answered=Number(d.answered||0),essayWords=Number(d.essayWords||0);
  if(d.completed){
    let answers=d.answers;if(typeof answers==='string'){try{answers=JSON.parse(answers)}catch(_){answers=null}}
    if(!answers||typeof answers!=='object')return {ok:false,error:'Jawapan diperlukan untuk mengesahkan skor'};
    const s=await scoreAnswers(setNo,answers);scoreA=s.scoreA;scoreB=s.scoreB;answered=s.aAnswered+s.bAnswered;
    const c=scoreWriting(d.essayText||'');scoreC=c.total;essayWords=c.words;
    const cPct=Math.round(scoreC/20*100);
    score=Math.round((scoreA+scoreB+cPct)/3);
  }
  const existing=await env.DB.prepare('SELECT id FROM progress WHERE license_id=? AND set_no=? AND section=?').bind(l.id,setNo,section).first();
  const values=[Boolean(d.completed),score,answered,Number(d.timeUsed||0),scoreA,scoreB,scoreC,d.startedAt||null,d.completedAt||(d.completed?now():null),now()];
  if(existing)await env.DB.prepare(`UPDATE progress SET completed=?,score=?,answered=?,time_used=?,score_a=?,score_b=?,score_c=?,started_at=?,completed_at=?,updated_at=? WHERE id=?`).bind(...values,existing.id).run();
  else await env.DB.prepare(`INSERT INTO progress (id,license_id,set_no,section,completed,score,answered,time_used,score_a,score_b,score_c,started_at,completed_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(makeId('prog'),l.id,setNo,section,...values).run();
  return {ok:true,serverScore:score,scoreA,scoreB,scoreC,essayWords};
}
async function getCustomerDashboard(d,env){
  const code=cleanCode(d.code),l=await env.DB.prepare('SELECT l.*,o.customer_name,o.phone FROM licenses l JOIN orders o ON o.id=l.order_id WHERE l.access_code=?').bind(code).first();
  if(!l)return {ok:false,error:'Access Code tidak sah'};if(String(l.status).toLowerCase()!=='active')return {ok:false,error:'License tidak aktif'};
  if(!(await requireDevice(d,l,env)))return {ok:false,error:'Peranti belum didaftarkan'};
  const progress=await env.DB.prepare('SELECT * FROM progress WHERE license_id=? ORDER BY set_no,section').bind(l.id).all();
  const devices=await env.DB.prepare('SELECT * FROM devices WHERE license_id=? ORDER BY last_seen DESC').bind(l.id).all();
  const activity=progress.results.filter(x=>x.section==='OVERALL'&&x.completed).slice().sort((a,b)=>String(b.completed_at||b.updated_at||'').localeCompare(String(a.completed_at||a.updated_at||''))).slice(0,20).map(x=>({message:`Set ${String(x.set_no).padStart(2,'0')} selesai • Indeks latihan ${Number(x.score||0)}%`,createdAt:x.completed_at||x.updated_at||''}));
  return {ok:true,license:{licenseCode:l.access_code,orderNo:l.order_id,name:l.customer_name,phone:l.phone,status:l.status,createdAt:l.created_at,activeAt:l.activated_at,deviceCount:devices.results.filter(x=>x.status==='active').length,maxDevices:MAX_DEVICES,lastSeen:devices.results[0]?.last_seen||''},progress:progress.results,totalSets:TOTAL_SETS,activity};
}
