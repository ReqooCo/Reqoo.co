const DEFAULT_PRICE = 35;
const DEFAULT_COMMISSION = 5;
const MAX_DEVICES = 2;
const TOTAL_SETS = 50;
const ACCESS_URL = 'https://pksk.sim.reqoo.co/access/';
const MAX_PROOF_BYTES = 2 * 1024 * 1024;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  try {
    const data = await readInput(request);
    const result = await routeAction(data, env);
    return respond(result, data.callback || '');
  } catch (err) {
    return respond({ ok: false, error: String(err?.message || err) });
  }
}

async function readInput(request) {
  const url = new URL(request.url);
  const q = Object.fromEntries(url.searchParams.entries());
  if (request.method === 'GET') return q;
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const body = await request.json();
    return { ...body, callback: body.callback || q.callback || '' };
  }
  return q;
}

function corsHeaders(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};}

function respond(obj, callback = '') {
  const text = JSON.stringify(obj);
  if (callback) {
    return new Response(`${callback}(${text});`, {
      headers: { 'content-type': 'application/javascript; charset=UTF-8', ...corsHeaders() }
    });
  }
  return new Response(text, {
    headers: { 'content-type': 'application/json; charset=UTF-8', ...corsHeaders() }
  });
}

async function routeAction(d, env) {
  const action = String(d.action || '');
  if (action === 'health' || action === 'getConfig') return getConfig(env);
  if (action === 'createPKSKOrder') return createOrder(d, env);
  if (action === 'submitPKSKPayment') return submitPayment(d, env);
  if (action === 'uploadPKSKProof') return uploadProof(d, env);
  if (action === 'getOrderStatus') return getOrderStatus(d, env);
  if (action === 'validateAccess') return validateAccess(d, env);
  if (action === 'registerDevice') return registerDevice(d, env);
  if (action === 'getCustomerDashboard') return getCustomerDashboard(d, env);
  if (action === 'saveProgress') return saveProgress(d, env);
  if (action === 'logClientError') return logClientError(d, env);
  if (action === 'validateReferral') return validateReferral(d, env);
  if (action === 'registerReferral') return registerReferral(d, env);
  if (!isAdmin(d, env)) return { ok: false, error: 'Unauthorized' };
  if (action === 'listPKSKOrders') return listOrders(env);
  if (action === 'verifyPKSKOrder') return verifyOrder(d, env);
  if (action === 'rejectPKSKOrder') return rejectOrder(d, env);
  if (action === 'resetDevices') return resetDevices(d, env);
  if (action === 'setLicenseStatus') return setLicenseStatus(d, env);
  if (action === 'getPKSKAdminDashboard') return getAdminDashboard(env);
  if (action === 'getPKSKAdminSummary') return getAdminSummary(env);
  if (action === 'getPKSKLicense') return getPKSKLicense(d, env);
  if (action === 'getPKSKErrors') return getErrors(env);
  if (action === 'getPaymentProof') return getPaymentProof(d, env);
  if (action === 'logResendAccess') return resendAccess(d, env);
  if (action === 'updatePKSKSettings') return updateSettings(d, env);
  return { ok: false, error: 'Action tidak dikenali' };
}

function isAdmin(d, env) {
  const expected = String(env.PKSK_ADMIN_TOKEN || '');
  return !!expected && String(d.token || '') === expected;
}

function getConfig(env) {
  return { ok:true, service:'REQOO PKSK Cloudflare Backend', version:'CF-1', config:{price:Number(env.PKSK_PRICE || DEFAULT_PRICE),commission:Number(env.PKSK_COMMISSION || DEFAULT_COMMISSION),maxDevices:MAX_DEVICES,totalSets:TOTAL_SETS} };
}

function now() { return new Date().toISOString(); }
function cleanCode(v) { return String(v || '').trim().toUpperCase(); }
function cleanPhone(v) { let p=String(v || '').replace(/\D/g,''); if(p.startsWith('00'))p=p.slice(2); if(p.startsWith('0'))p='60'+p.slice(1); if(p&&!p.startsWith('60'))p='60'+p; return p; }
function makeId(prefix='id') { return `${prefix}_${crypto.randomUUID()}`; }
function generateCode() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const a=new Uint8Array(10); crypto.getRandomValues(a); let x=''; for(const n of a)x+=chars[n%chars.length]; return `PKSK-${x.slice(0,5)}-${x.slice(5)}`; }

async function createOrder(d, env) {
  const orderNo=String(d.orderNo || '').trim(), name=String(d.name || '').trim(), phone=String(d.phone || '').trim();
  if(!orderNo||!name||!phone)return {ok:false,error:'Maklumat tidak lengkap'};
  const existing=await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderNo).first();
  if(existing)return orderToClient(existing,env);
  const ref=String(d.ref || '').trim().toUpperCase();
  const validRef=ref?await activeReferral(ref,env):null;
  const createdAt=now(), amount=Number(env.PKSK_PRICE || DEFAULT_PRICE);
  await env.DB.prepare(`INSERT INTO orders (id, customer_name, phone, email, amount, payment_status, payment_ref, created_at, paid_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`).bind(orderNo,name,phone,String(d.email || '').trim(),amount,null,createdAt).run();
  return {ok:true,orderNo,status:'WAITING_PROOF',proofUploaded:false,price:amount,referralCode:validRef || ''};
}

async function submitPayment(d, env) {
  const orderNo=String(d.orderNo || '').trim(), name=String(d.name || '').trim(), phone=String(d.phone || '').trim();
  if(!orderNo||!name||!phone)return {ok:false,error:'Maklumat tidak lengkap'};
  if(!d.proofData)return {ok:false,error:'Bukti pembayaran diperlukan'};
  if(!env.PROOFS)return {ok:false,error:'R2 payment proof belum di-bind sebagai PROOFS'};
  let order=await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderNo).first();
  if(!order){const created=await createOrder(d,env);if(!created.ok)return created;order=await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderNo).first();}
  if(order.payment_ref)return {ok:true,orderNo,status:order.payment_status || 'pending',proofUploaded:true,already:true};
  const proof=await saveProof(d,orderNo,env);
  await env.DB.prepare(`UPDATE orders SET payment_status='pending', payment_ref=? WHERE id=?`).bind(proof.key,orderNo).run();
  return {ok:true,orderNo,status:'PENDING',proofUploaded:true};
}
async function uploadProof(d,env){return submitPayment(d,env);}
async function saveProof(d,orderNo,env){const m=String(d.proofData || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);if(!m)throw new Error('Format bukti mesti JPG, PNG atau WEBP.');const mime=m[1],bin=Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0));if(bin.byteLength>MAX_PROOF_BYTES)throw new Error('Saiz bukti terlalu besar. Maksimum 2MB selepas dioptimumkan.');const ext=mime.split('/')[1].replace('jpeg','jpg');const key=`payment-proofs/${orderNo}-${Date.now()}.${ext}`;await env.PROOFS.put(key,bin,{httpMetadata:{contentType:mime}});return {key};}
async function getOrderStatus(d,env){const orderNo=String(d.orderNo || '').trim();if(!orderNo)return {ok:false,error:'Order diperlukan'};const row=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderNo).first();if(!row)return {ok:true,found:false,status:'NOT_FOUND'};return {ok:true,found:true,orderNo,status:row.payment_status || '',proofUploaded:!!row.payment_ref,proofName:row.payment_ref || ''};}
async function verifyOrder(d,env){const orderNo=String(d.orderNo || '').trim();if(!orderNo)return {ok:false,error:'Order diperlukan'};const order=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderNo).first();if(!order)return {ok:false,error:'Order tidak dijumpai'};if(!order.payment_ref)return {ok:false,error:'Bukti pembayaran belum ada.'};const existing=await env.DB.prepare('SELECT * FROM licenses WHERE order_id=?').bind(orderNo).first();const code=existing?.access_code || await uniqueCode(env),t=now();if(!existing){await env.DB.prepare(`INSERT INTO licenses (id, order_id, access_code, status, max_devices, created_at, activated_at, expires_at) VALUES (?, ?, ?, 'active', ?, ?, ?, NULL)`).bind(makeId('lic'),orderNo,code,MAX_DEVICES,t,t).run();}else{await env.DB.prepare("UPDATE licenses SET status='active', activated_at=? WHERE id=?").bind(t,existing.id).run();}await env.DB.prepare("UPDATE orders SET payment_status='paid', paid_at=? WHERE id=?").bind(t,orderNo).run();const referral=String(order.payment_ref || '').startsWith('ref:')?String(order.payment_ref).slice(4):'';const wa=buildWhatsApp(order.phone,order.customer_name,code);return {ok:true,orderNo,accessCode:code,maxDevices:MAX_DEVICES,price:Number(order.amount||env.PKSK_PRICE||DEFAULT_PRICE),referralCode:referral,whatsappUrl:wa.url,whatsappMessage:wa.message};}
async function uniqueCode(env){for(let i=0;i<10;i++){const c=generateCode();const found=await env.DB.prepare('SELECT id FROM licenses WHERE access_code=?').bind(c).first();if(!found)return c;}throw new Error('Gagal menjana Access Code unik');}
function buildWhatsApp(phone,name,code){const p=cleanPhone(phone);const message=`Assalamualaikum ${name || ''},\n\nPembayaran PKSK telah disahkan.\n\nAccess Code: ${code}\n\nAkses simulasi:\n${ACCESS_URL}\n\nMasukkan Access Code tersebut untuk mula menggunakan simulasi PKSK.\n\nTerima kasih kerana memilih REQOO.`;return {url:p?`https://wa.me/${p}?text=${encodeURIComponent(message)}`:'',message};}
async function resendAccess(d,env){const code=cleanCode(d.code);const lic=await env.DB.prepare(`SELECT l.*, o.customer_name, o.phone FROM licenses l JOIN orders o ON o.id=l.order_id WHERE l.access_code=?`).bind(code).first();if(!lic)return {ok:false,error:'License tidak dijumpai'};const wa=buildWhatsApp(lic.phone,lic.customer_name,code);return {ok:true,whatsappUrl:wa.url,whatsappMessage:wa.message,accessCode:code};}
async function validateAccess(d,env){const code=cleanCode(d.code);if(!code)return {ok:false,error:'Access Code diperlukan'};const l=await env.DB.prepare('SELECT * FROM licenses WHERE access_code=?').bind(code).first();if(!l)return {ok:false,error:'Access Code tidak sah'};if(String(l.status).toLowerCase()!=='active')return {ok:false,error:'License tidak aktif',status:l.status};const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM devices WHERE license_id=? AND status='active'").bind(l.id).first();return {ok:true,accessCode:code,maxDevices:Number(l.max_devices||MAX_DEVICES),deviceCount:Number(count?.n||0)};}
async function registerDevice(d,env){const code=cleanCode(d.code),deviceKey=String(d.deviceId||'').trim();if(!code||!deviceKey)return {ok:false,error:'Maklumat peranti tidak lengkap'};const l=await env.DB.prepare('SELECT * FROM licenses WHERE access_code=?').bind(code).first();if(!l)return {ok:false,error:'Access Code tidak sah'};if(l.status!=='active')return {ok:false,error:'License tidak aktif'};const existing=await env.DB.prepare('SELECT * FROM devices WHERE license_id=? AND device_key=?').bind(l.id,deviceKey).first();const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM devices WHERE license_id=? AND status='active'").bind(l.id).first();if(existing){await env.DB.prepare("UPDATE devices SET last_seen=?, device_name=?, status='active' WHERE id=?").bind(now(),deviceLabel(d.userAgent),existing.id).run();return {ok:true,registered:true,deviceCount:Number(count?.n||0),maxDevices:Number(l.max_devices||MAX_DEVICES)};}if(Number(count?.n||0)>=Number(l.max_devices||MAX_DEVICES))return {ok:false,error:`Akses maksimum ${Number(l.max_devices||MAX_DEVICES)} peranti telah digunakan.`,limitReached:true,deviceCount:Number(count?.n||0),maxDevices:Number(l.max_devices||MAX_DEVICES)};await env.DB.prepare(`INSERT INTO devices (id,license_id,device_key,device_name,first_seen,last_seen,status) VALUES (?,?,?,?,?,?, 'active')`).bind(makeId('dev'),l.id,deviceKey,deviceLabel(d.userAgent),now(),now()).run();return {ok:true,registered:true,deviceCount:Number(count?.n||0)+1,maxDevices:Number(l.max_devices||MAX_DEVICES)};}
function deviceLabel(ua){const s=String(ua||'');let d='Browser';if(/iPhone/i.test(s))d='iPhone';else if(/iPad/i.test(s))d='iPad';else if(/Android/i.test(s))d='Android';else if(/Windows/i.test(s))d='Windows PC';else if(/Macintosh|Mac OS X/i.test(s))d='Mac';return d;}
async function getCustomerDashboard(d,env){const code=cleanCode(d.code);const l=await env.DB.prepare('SELECT l.*,o.customer_name,o.phone FROM licenses l JOIN orders o ON o.id=l.order_id WHERE l.access_code=?').bind(code).first();if(!l)return {ok:false,error:'Access Code tidak sah'};if(l.status!=='active')return {ok:false,error:'License tidak aktif',status:l.status};if(d.deviceId){const dev=await env.DB.prepare("SELECT id FROM devices WHERE license_id=? AND device_key=? AND status='active'").bind(l.id,String(d.deviceId)).first();if(!dev)return {ok:false,error:'Peranti belum didaftarkan'};}const progress=await env.DB.prepare('SELECT * FROM progress WHERE license_id=? ORDER BY set_no, section').bind(l.id).all();const devices=await env.DB.prepare('SELECT * FROM devices WHERE license_id=? ORDER BY last_seen DESC').bind(l.id).all();return {ok:true,license:{licenseCode:l.access_code,orderNo:l.order_id,name:l.customer_name,phone:l.phone,status:l.status,createdAt:l.created_at,activeAt:l.activated_at,deviceCount:devices.results.filter(x=>x.status==='active').length,maxDevices:l.max_devices,lastSeen:devices.results[0]?.last_seen||''},progress:progress.results,totalSets:TOTAL_SETS};}
async function saveProgress(d,env){const code=cleanCode(d.code),setNo=Number(d.setNo||0),section=String(d.section||'OVERALL').trim() || 'OVERALL';if(!code||setNo<1||setNo>TOTAL_SETS)return {ok:false,error:'Data progress tidak sah'};const l=await env.DB.prepare('SELECT * FROM licenses WHERE access_code=?').bind(code).first();if(!l||l.status!=='active')return {ok:false,error:'License tidak aktif'};const existing=await env.DB.prepare('SELECT id FROM progress WHERE license_id=? AND set_no=? AND section=?').bind(l.id,setNo,section).first();const values=[Boolean(d.completed),Number(d.score||0),Number(d.answered||0),Number(d.timeUsed||0),Number(d.scoreA||0),Number(d.scoreB||0),Number(d.scoreC||0),d.startedAt||null,d.completedAt||null,now()];if(existing){await env.DB.prepare(`UPDATE progress SET completed=?,score=?,answered=?,time_used=?,score_a=?,score_b=?,score_c=?,started_at=?,completed_at=?,updated_at=? WHERE id=?`).bind(...values,existing.id).run();}else{await env.DB.prepare(`INSERT INTO progress (id,license_id,set_no,section,completed,score,answered,time_used,score_a,score_b,score_c,started_at,completed_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(makeId('prog'),l.id,setNo,section,...values).run();}return {ok:true};}
async function logClientError(d,env){try{await env.DB.prepare(`INSERT INTO errors (id,created_at,source,message,details) VALUES (?,?,?,?,?)`).bind(makeId('err'),now(),String(d.source||'client'),String(d.message||'').slice(0,500),String(d.details||'').slice(0,2000)).run();}catch{}return {ok:true};}
async function validateReferral(d,env){const code=String(d.code||'').trim().toUpperCase();if(!code)return {ok:false,error:'Kod referral diperlukan'};const r=await activeReferral(code,env);return r?{ok:true,code:r}:{ok:false,error:'Kod referral tidak sah'};}
async function registerReferral(d,env){const code=String(d.code||'').trim().toUpperCase();const name=String(d.name||'').trim();const phone=String(d.phone||'').trim();if(!code||!name||!phone)return {ok:false,error:'Maklumat referral tidak lengkap'};const r=await activeReferral(code,env);if(!r)return {ok:false,error:'Kod referral tidak sah'};return {ok:true,code:r,name,phone};}
