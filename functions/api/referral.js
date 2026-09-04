const DEFAULT_COMMISSION = 5;
const cors = {
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type',
  'cache-control':'no-store'
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
  try {
    const url = new URL(request.url);
    const q = Object.fromEntries(url.searchParams.entries());
    let body = {};
    if (request.method === 'POST' && (request.headers.get('content-type')||'').includes('application/json')) body = await request.json();
    const d = {...q,...body};
    const action = String(d.action||'');
    if (action === 'registerReferral') return json(await registerReferral(d,env));
    if (action === 'validateReferral') return json(await validateReferral(d,env));
    if (action === 'getReferral') return json(await getReferral(d,env));
    return json({ok:false,error:'Action tidak dikenali'},400);
  } catch(e) {
    return json({ok:false,error:String(e?.message||e)},500);
  }
}

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8',...cors}})}
function now(){return new Date().toISOString()}
function id(){return `ref_${crypto.randomUUID()}`}
function normPhone(v){let p=String(v||'').replace(/\D/g,'');if(p.startsWith('00'))p=p.slice(2);if(p.startsWith('0'))p='60'+p.slice(1);if(p&&!p.startsWith('60'))p='60'+p;return p}
function cleanCode(v){return String(v||'').trim().toUpperCase()}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const a=new Uint8Array(7);crypto.getRandomValues(a);let x='';for(const n of a)x+=chars[n%chars.length];return `REF-${x}`}
async function uniqueCode(env){for(let i=0;i<12;i++){const code=randomCode();const r=await env.DB.prepare('SELECT id FROM sim_referral_agents WHERE referral_code=?').bind(code).first();if(!r)return code}throw new Error('Gagal menjana Referral Code unik')}

async function registerReferral(d,env){
  const name=String(d.name||'').trim();
  const phone=String(d.whatsapp||d.phone||'').trim();
  const bank=String(d.bank||'').trim();
  const account=String(d.account||'').trim();
  if(!name||!phone||!bank||!account)return {ok:false,error:'Lengkapkan semua maklumat.'};
  const phoneNormalized=normPhone(phone);
  if(!phoneNormalized)return {ok:false,error:'Nombor WhatsApp tidak sah.'};
  const existing=await env.DB.prepare('SELECT * FROM sim_referral_agents WHERE phone_normalized=? LIMIT 1').bind(phoneNormalized).first();
  if(existing)return {ok:false,error:'Nombor telefon referral ini telah berdaftar.',duplicate:true};
  const code=await uniqueCode(env);
  const t=now();
  try {
    await env.DB.prepare(`INSERT INTO sim_referral_agents (id,name,phone,phone_normalized,bank_name,bank_account,referral_code,status,commission,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'active',?,?,?)`).bind(id(),name,phone,phoneNormalized,bank,account,code,Number(env.PKSK_COMMISSION||DEFAULT_COMMISSION),t,t).run();
  } catch(e) {
    if(String(e?.message||e).toLowerCase().includes('phone')) return {ok:false,error:'Nombor telefon referral ini telah berdaftar.',duplicate:true};
    if(String(e?.message||e).toLowerCase().includes('referral_code')) return {ok:false,error:'Referral Code bertindih. Cuba semula.'};
    throw e;
  }
  return {ok:true,referralCode:code,name,phone,commission:Number(env.PKSK_COMMISSION||DEFAULT_COMMISSION)};
}

async function validateReferral(d,env){
  const code=cleanCode(d.ref||d.code);
  if(!code)return {ok:false,error:'Referral Code diperlukan'};
  const r=await env.DB.prepare("SELECT id,name,referral_code,status,commission FROM sim_referral_agents WHERE referral_code=? AND lower(status)='active' LIMIT 1").bind(code).first();
  return r?{ok:true,referralCode:r.referral_code,name:r.name,commission:Number(r.commission||env.PKSK_COMMISSION||DEFAULT_COMMISSION)}:{ok:false,error:'Referral tidak sah'};
}

async function getReferral(d,env){
  const code=cleanCode(d.ref||d.code);
  if(!code)return {ok:false,error:'Referral Code diperlukan'};
  const r=await env.DB.prepare('SELECT id,name,phone,bank_name,referral_code,status,commission,created_at FROM sim_referral_agents WHERE referral_code=? LIMIT 1').bind(code).first();
  return r?{ok:true,referral:r}:{ok:false,error:'Referral tidak dijumpai'};
}
