const PROD_API = 'https://www.billplz.com/api';
const SANDBOX_API = 'https://www.billplz-sandbox.com/api';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  try {
    const body = await input(request);
    const action = String(body.action || '');
    if (action === 'health') return json({ ok:true, provider:'Billplz', apiVersion:'v4', configured:!!(env.BILLPLZ_API_KEY && env.BILLPLZ_COLLECTION_ID && env.BILLPLZ_X_SIGNATURE_KEY) });
    if (action === 'createBill') return json(await createBill(body, env));
    if (action === 'verifyCallback') return json(await verifyCallback(body, env));
    return json({ ok:false, error:'Action tidak dikenali' }, 400);
  } catch (e) {
    return json({ ok:false, error:String(e?.message || e) }, 500);
  }
}

async function input(request) {
  if (request.method === 'GET') return Object.fromEntries(new URL(request.url).searchParams.entries());
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return await request.json();
  return Object.fromEntries(new URLSearchParams(await request.text()));
}

function cors(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type','cache-control':'no-store'};}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=UTF-8',...cors()}});}
function apiBase(env){return String(env.BILLPLZ_ENV || 'sandbox').toLowerCase()==='production' ? PROD_API : SANDBOX_API;}
function required(env){if(!env.BILLPLZ_API_KEY)return 'BILLPLZ_API_KEY belum ditetapkan';if(!env.BILLPLZ_COLLECTION_ID)return 'BILLPLZ_COLLECTION_ID belum ditetapkan';if(!env.BILLPLZ_X_SIGNATURE_KEY)return 'BILLPLZ_X_SIGNATURE_KEY belum ditetapkan';return '';}

async function createBill(d, env) {
  const missing=required(env); if(missing)return {ok:false,error:missing,configurationRequired:true};
  const amount=Math.round(Number(d.amount||0)*100);
  const name=String(d.name||'').trim(), email=String(d.email||'').trim();
  if(amount<=0||!name||!email)return {ok:false,error:'amount, name dan email diperlukan'};
  const origin=new URL(d.redirectUrl || 'https://reqoo.co/').origin;
  const callbackUrl=String(d.callbackUrl || `${origin}/api/billplz`);
  const redirectUrl=String(d.redirectUrl || origin);
  const params=new URLSearchParams();
  params.set('collection_id',String(env.BILLPLZ_COLLECTION_ID));
  params.set('description',String(d.description||'REQOO Order'));
  params.set('email',email);
  params.set('name',name);
  params.set('amount',String(amount));
  params.set('callback_url',callbackUrl);
  params.set('redirect_url',redirectUrl);
  if(d.mobile)params.set('mobile',String(d.mobile));
  if(d.dueAt)params.set('due_at',String(d.dueAt));
  const auth=btoa(`${env.BILLPLZ_API_KEY}:`);
  const response=await fetch(`${apiBase(env)}/v4/bills`,{method:'POST',headers:{authorization:`Basic ${auth}`,'content-type':'application/x-www-form-urlencoded'},body:params});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return {ok:false,error:data?.error?.message||data?.error||`Billplz HTTP ${response.status}`,provider:data};
  return {ok:true,provider:'billplz',billId:data.id,billUrl:data.url,collectionId:data.collection_id,state:data.state||'due',amount:Number(data.amount||amount)/100,raw:data};
}

async function verifyCallback(d, env) {
  const signature=String(d.x_signature||'');
  if(!signature)return {ok:false,valid:false,error:'x_signature diperlukan'};
  if(!env.BILLPLZ_X_SIGNATURE_KEY)return {ok:false,valid:false,error:'BILLPLZ_X_SIGNATURE_KEY belum ditetapkan',configurationRequired:true};
  const pairs=[];
  for(const [key,value] of Object.entries(d)){
    if(key==='x_signature')continue;
    if(value===undefined||value===null)continue;
    pairs.push([key,String(value)]);
  }
  pairs.sort((a,b)=>a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
  const source=pairs.map(([k,v])=>`${k}${v}`).join('|');
  const bytes=new TextEncoder().encode(source);
  const secret=new TextEncoder().encode(String(env.BILLPLZ_X_SIGNATURE_KEY));
  const cryptoKey=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,bytes));
  const computed=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
  return {ok:true,valid:computed.toLowerCase()===signature.toLowerCase(),billId:String(d.id||''),paid:String(d.paid).toLowerCase()==='true',state:String(d.state||'')};
}
