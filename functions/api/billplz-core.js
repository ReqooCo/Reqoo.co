// Shared Billplz V4 integration for REQOO Shop and PKSK.
// Never expose provider keys or trust browser redirects as proof of payment.
const MODE = { production: 'https://www.billplz.com', sandbox: 'https://www.billplz-sandbox.com' };
const text = value => String(value ?? '').trim();

function config(env) {
  const mode = text(env.BILLPLZ_ENV).toLowerCase();
  if (!MODE[mode]) throw Error('BILLPLZ_ENV mesti production atau sandbox.');
  for (const key of ['BILLPLZ_API_KEY', 'BILLPLZ_COLLECTION_ID', 'BILLPLZ_X_SIGNATURE_KEY']) {
    if (!text(env[key])) throw Error('Konfigurasi Billplz belum lengkap: ' + key);
  }
  return { mode, host: MODE[mode] };
}

export async function createBillplzBill(data, env) {
  const {host} = config(env);
  const amount = Number(data.amountMinor);
  if (!Number.isSafeInteger(amount) || amount < 100) throw Error('Jumlah bayaran Billplz tidak sah.');
  const name = text(data.name).slice(0,255);
  const email = text(data.email).slice(0,254);
  const phone = text(data.phone).replace(/[^\d+]/g, '').slice(0,25);
  if (!name || (!email && !phone)) throw Error('Nama dan email / telefon diperlukan.');
  const callbackUrl = new URL(data.callbackUrl);
  const redirectUrl = new URL(data.returnUrl);
  if (callbackUrl.protocol !== 'https:' || redirectUrl.protocol !== 'https:' ||
      !callbackUrl.hostname.endsWith('.reqoo.co') || !redirectUrl.hostname.endsWith('.reqoo.co')) {
    throw Error('URL pembayaran mesti menggunakan subdomain HTTPS Reqoo.');
  }
  const params = new URLSearchParams({
    collection_id: text(env.BILLPLZ_COLLECTION_ID),
    description: text(data.description || 'REQOO Order').slice(0,200),
    name,
    amount: String(amount),
    callback_url: callbackUrl.toString(),
    redirect_url: redirectUrl.toString(),
    reference_1_label: 'Order',
    reference_1: text(data.orderRef).slice(0,100)
  });
  if (email) params.set('email',email);
  else params.set('mobile',phone);
  const response = await fetch(host + '/api/v4/bills', {
    method:'POST',
    headers:{'Authorization':'Basic ' + btoa(text(env.BILLPLZ_API_KEY) + ':'),'content-type':'application/x-www-form-urlencoded'},
    body:params.toString()
  });
  const result = await response.json().catch(()=>({}));
  if (!response.ok || !result.id || !result.url) throw Error('Billplz gagal mencipta bil. Semak akaun, collection dan API key.');
  const url = new URL(result.url);
  if (url.protocol !== 'https:' || url.hostname !== new URL(host).hostname) throw Error('URL bil Billplz tidak sepadan dengan environment.');
  return {billId:text(result.id),billUrl:url.toString(),provider:'billplz'};
}

export async function parseBillplzCallback(request) {
  if (request.method !== 'POST') return null;
  if (!text(request.headers.get('content-type')).toLowerCase().includes('application/x-www-form-urlencoded')) return null;
  const form = new URLSearchParams(await request.text());
  const keys = Array.from(form.keys());
  if (new Set(keys).size !== keys.length) return null;
  return Object.fromEntries(form);
}

export async function verifyBillplzCallback(data, env) {
  config(env);
  const signature = text(data?.x_signature).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(signature) || !text(data.id) || !text(data.collection_id)) return {valid:false};
  const fields = Object.entries(data).filter(([k,v]) => k!=='x_signature' && v!=null);
  fields.sort(([a],[b])=> a.toLowerCase().localeCompare(b.toLowerCase()));
  const payload = fields.map(([k,v])=>k+String(v)).join('|');
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(text(env.BILLPLZ_X_SIGNATURE_KEY)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)));
  const expected = Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');
  let mismatch=0;
  for (let i=0;i<64;i++) mismatch |= signature.charCodeAt(i)^expected.charCodeAt(i);
  return {valid:mismatch===0, billId:text(data.id), collectionId:text(data.collection_id),
    paid:text(data.paid).toLowerCase()==='true' && text(data.state).toLowerCase()==='paid',
    amountMinor:Number(data.amount), paidAmountMinor:Number(data.paid_amount)};
}

export function matchesBillplzPayment(verified, payment, env) {
  const expected = Number(payment?.amount_minor);
  return Boolean(verified?.valid && verified.paid && verified.billId &&
    verified.collectionId===text(env.BILLPLZ_COLLECTION_ID) &&
    verified.billId===text(payment?.provider_reference) &&
    Number.isSafeInteger(expected) && expected>=100 &&
    verified.amountMinor===expected && verified.paidAmountMinor>=expected);
}


export async function verifyBillplzRedirect(params, env) {
  config(env);
  const signature = text(params?.['billplz[x_signature]']).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(signature)) return {valid:false};
  const entries = Object.entries(params).filter(([key])=>/^billplz\[[a-z_]+\]$/.test(key) && key!=='billplz[x_signature]');
  if (!entries.length) return {valid:false};
  entries.sort(([a],[b])=>a.toLowerCase().localeCompare(b.toLowerCase()));
  const payload = entries.map(([key,value])=>key.replace(/[\[\]]/g,'')+String(value)).join('|');
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(text(env.BILLPLZ_X_SIGNATURE_KEY)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)));
  const expected = Array.from(hash,v=>v.toString(16).padStart(2,'0')).join('');
  let mismatch=0;
  for (let i=0;i<64;i++) mismatch |= signature.charCodeAt(i)^expected.charCodeAt(i);
  return {valid:mismatch===0,billId:text(params['billplz[id]'])};
}
