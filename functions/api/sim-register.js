const cors = {
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type',
  'cache-control':'no-store'
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
  if (request.method !== 'POST') return json({ok:false,error:'POST sahaja'},405);

  try {
    const body = await request.json();
    const action = String(body.action || 'register').toLowerCase();

    if (!env.DB) return json({ok:false,error:'Database tidak tersedia'},500);
    if (action === 'check') return json(await checkPhone(body.phone, env));
    if (action === 'register') return json(await register(body, env));

    return json({ok:false,error:'Action tidak dikenali'},400);
  } catch (e) {
    return json({ok:false,error:String(e?.message||e)},500);
  }
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json;charset=UTF-8',...cors}
  });
}

function normPhone(value){
  let p=String(value||'').replace(/\D/g,'');
  if(p.startsWith('00')) p=p.slice(2);
  if(p.startsWith('0')) p='60'+p.slice(1);
  if(p && !p.startsWith('60')) p='60'+p;
  return p;
}

function clean(value,max=200){
  return String(value||'').trim().slice(0,max);
}

function makeId(prefix){
  return `${prefix}_${crypto.randomUUID()}`;
}

function makeReferralCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes=new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out='SIM-';
  for(const b of bytes) out+=chars[b%chars.length];
  return out;
}

async function tableExists(env,name){
  const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(name).first();
  return !!r;
}

async function checkPhone(phoneValue,env){
  const phone=normPhone(phoneValue);
  if(!phone) return {ok:false,error:'Nombor telefon diperlukan'};
  if(!await tableExists(env,'sim_customers')) return {ok:true,phone,exists:false};
  const row=await env.DB.prepare('SELECT id,name,phone,email,status,created_at FROM sim_customers WHERE phone_normalized=? LIMIT 1').bind(phone).first();
  return {ok:true,phone,exists:!!row,customer:row||null};
}

async function register(body,env){
  const name=clean(body.name,120);
  const phone=normPhone(body.phone);
  const email=clean(body.email,160).toLowerCase();
  const referralCode=clean(body.referralCode||body.ref||'',40).toUpperCase();

  if(!name) return {ok:false,error:'Nama diperlukan'};
  if(!phone || phone.length < 10) return {ok:false,error:'Nombor telefon tidak sah'};

  const existing=await env.DB.prepare('SELECT id,name,status FROM sim_customers WHERE phone_normalized=? LIMIT 1').bind(phone).first();
  if(existing) return {ok:false,error:'Nombor telefon ini sudah berdaftar',code:'PHONE_EXISTS',customer:existing};

  let referrer=null;
  if(referralCode){
    referrer=await env.DB.prepare('SELECT id,name,referral_code,status FROM sim_customers WHERE referral_code=? LIMIT 1').bind(referralCode).first();
    if(!referrer) return {ok:false,error:'Kod referral tidak sah',code:'INVALID_REFERRAL'};
    if(String(referrer.status||'active') !== 'active') return {ok:false,error:'Kod referral tidak aktif',code:'REFERRAL_INACTIVE'};
  }

  const customerId=makeId('simc');
  const referralId=referrer ? makeId('refr') : null;
  const eventId=makeId('revt');
  let customerReferralCode='';

  for(let attempt=0;attempt<5;attempt++){
    customerReferralCode=makeReferralCode();
    const exists=await env.DB.prepare('SELECT id FROM sim_customers WHERE referral_code=? LIMIT 1').bind(customerReferralCode).first();
    if(!exists) break;
    customerReferralCode='';
  }
  if(!customerReferralCode) return {ok:false,error:'Gagal menjana kod referral, cuba lagi'};

  const now=new Date().toISOString();
  const statements=[
    env.DB.prepare(`INSERT INTO sim_customers
      (id,name,phone,phone_normalized,email,referral_code,referred_by_code,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(customerId,name,phone,phone,email||null,customerReferralCode,referrer?.referral_code||null,'active',now,now)
  ];

  if(referrer){
    statements.push(
      env.DB.prepare(`INSERT INTO sim_referrals
        (id,referrer_customer_id,referred_customer_id,referral_code,status,created_at)
        VALUES (?,?,?,?,?,?)`)
        .bind(referralId,referrer.id,customerId,referrer.referral_code,'pending',now)
    );
  }

  statements.push(
    env.DB.prepare(`INSERT INTO sim_referral_events
      (id,referral_id,event_type,customer_id,metadata,created_at)
      VALUES (?,?,?,?,?,?)`)
      .bind(eventId,referralId,'registration',customerId,JSON.stringify({source:'sim',referral_code:referrer?.referral_code||null}),now)
  );

  try{
    await env.DB.batch(statements);
  }catch(e){
    const message=String(e?.message||e);
    if(/UNIQUE|unique|phone_normalized|referral_code/i.test(message)){
      const duplicate=await env.DB.prepare('SELECT id,name FROM sim_customers WHERE phone_normalized=? LIMIT 1').bind(phone).first();
      if(duplicate) return {ok:false,error:'Nombor telefon ini sudah berdaftar',code:'PHONE_EXISTS',customer:duplicate};
      return {ok:false,error:'Data pendaftaran bertembung, sila cuba lagi',code:'DUPLICATE'};
    }
    throw e;
  }

  return {
    ok:true,
    customer:{
      id:customerId,
      name,
      phone,
      email:email||null,
      referral_code:customerReferralCode,
      referred_by:referrer?.referral_code||null,
      status:'active'
    }
  };
}
