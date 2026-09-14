import { md5Hex } from './toyyibpay-core.js';
const PRICE = 35;
const MAX_DEVICES = 3;
const ACCESS_URL = 'https://pksk.sim.reqoo.co/access/';
const PROD_BASE = 'https://toyyibpay.com/index.php/api';
const SANDBOX_BASE = 'https://dev.toyyibpay.com/index.php/api';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  try {
    const d = await input(request);
    const a = String(d.action || '');
    if (a === 'create') return json(await createBill(d, env));
    if (a === 'status') return json(await status(d, env));
    if (a === 'callback') return callback(d, env);
    if (a === 'redirect') return redirect(d, env);
    return json({ ok: false, error: 'Action tidak dikenali' }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}

async function input(r) {
  const u = new URL(r.url);
  const q = Object.fromEntries(u.searchParams.entries());
  if (r.method === 'GET') return q;
  const t = (r.headers.get('content-type') || '').toLowerCase();
  if (t.includes('application/json')) return { ...q, ...await r.json() };
  const b = await r.text();
  if (b) {
    try { return { ...q, ...JSON.parse(b) }; } catch {}
    try { return { ...q, ...Object.fromEntries(new URLSearchParams(b).entries()) }; } catch {}
  }
  return q;
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    'cache-control': 'no-store'
  };
}
function json(x, s = 200) {
  return new Response(JSON.stringify(x), { status: s, headers: { 'content-type': 'application/json;charset=UTF-8', ...cors() } });
}
function apiBase(env) {
  return String(env.TOYYIBPAY_ENV || 'production').toLowerCase() === 'sandbox' ? SANDBOX_BASE : PROD_BASE;
}
function payHost(env) {
  return apiBase(env) === SANDBOX_BASE ? 'https://dev.toyyibpay.com' : 'https://toyyibpay.com';
}
function cents(n) { return Math.round(Number(n || 0) * 100); }
function phone(v) {
  let p = String(v || '').replace(/\D/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = '60' + p.slice(1);
  if (p && !p.startsWith('60')) p = '60' + p;
  return p;
}
function safeText(v, max) {
  return String(v || '').replace(/[^a-zA-Z0-9 _-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function cleanCode(v) { return String(v || '').trim().toUpperCase(); }
function makeOrder() { return 'PKSK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  let x = '';
  for (const n of a) x += c[n % c.length];
  return `PKSK-${x.slice(0, 5)}-${x.slice(5)}`;
}
async function uniqueCode(env) {
  for (let i = 0; i < 10; i++) {
    const c = genCode();
    const r = await env.DB.prepare('SELECT id FROM licenses WHERE access_code=?').bind(c).first();
    if (!r) return c;
  }
  throw Error('Gagal menjana Access Code unik');
}
async function referralInfo(code, env) {
  const ref = cleanCode(code);
  if (!ref) return null;
  if (!(await tableExists(env, 'sim_referral_agents'))) return null;
  const r = await env.DB.prepare("SELECT referral_code,commission,status FROM sim_referral_agents WHERE referral_code=? AND lower(status)='active' LIMIT 1").bind(ref).first();
  if (!r) throw Error('Referral Code tidak sah atau tidak aktif.');
  return { code: String(r.referral_code), commission: Number(r.commission || 5) };
}
async function tableExists(env, name) {
  const r = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(name).first();
  return !!r;
}
async function ensureReferralEvents(env) {
  if (await tableExists(env, 'sim_referral_events')) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sim_referral_events (id TEXT PRIMARY KEY, referral_code TEXT NOT NULL, phone TEXT NOT NULL, order_id TEXT, amount INTEGER NOT NULL DEFAULT 0, commission INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL)`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sim_referral_events_code ON sim_referral_events(referral_code)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sim_referral_events_order ON sim_referral_events(order_id)').run();
}
async function attachReferral(orderNo, p, ref, env) {
  if (!ref) return;
  await ensureReferralEvents(env);
  const existing = await env.DB.prepare('SELECT id FROM sim_referral_events WHERE order_id=? LIMIT 1').bind(orderNo).first();
  if (existing) return;
  await env.DB.prepare('INSERT INTO sim_referral_events (id,referral_code,phone,order_id,amount,commission,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(`evt_${crypto.randomUUID()}`, ref.code, p, orderNo, PRICE, ref.commission, 'pending', new Date().toISOString()).run();
}
async function settleReferral(orderId, env) {
  if (!(await tableExists(env, 'sim_referral_events'))) return;
  await env.DB.prepare("UPDATE sim_referral_events SET status='paid' WHERE order_id=? AND lower(status)='pending'").bind(orderId).run();
}

async function createBill(d, env) {
  if (!env.DB) return { ok: false, error: 'DB binding belum tersedia' };
  if (!env.TOYYIBPAY_USER_SECRET_KEY || !env.TOYYIBPAY_CATEGORY_CODE) {
    return { ok: false, error: 'ToyyibPay belum dikonfigurasi dalam Cloudflare Secrets/Variables' };
  }
  const name = String(d.name || '').trim();
  const p = phone(d.phone);
  const email = String(d.email || '').trim();
  const orderNo = String(d.orderNo || makeOrder()).trim();
  if (!name || !p) return { ok: false, error: 'Nama dan WhatsApp diperlukan' };
  const ref = await referralInfo(d.referralCode || d.ref, env);
  const old = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderNo).first();
  if (old?.payment_status === 'paid') {
    await settleReferral(orderNo, env);
    return { ok: true, orderNo, status: 'paid', accessCode: await issueLicense(old, env) };
  }
  if (old?.payment_ref?.startsWith('toyyibpay:')) {
    if (ref) await attachReferral(orderNo, p, ref, env);
    const billCode = old.payment_ref.slice(10);
    return { ok: true, orderNo, status: old.payment_status || 'pending', billCode, billUrl: `${payHost(env)}/${billCode}` };
  }
  const now = new Date().toISOString();
  if (!old) {
    await env.DB.prepare(`INSERT INTO orders (id,customer_name,phone,email,amount,payment_status,payment_ref,created_at,paid_at) VALUES (?,?,?,?,?,'pending',NULL,?,NULL)`).bind(orderNo, name, p, email, PRICE, now).run();
  }
  if (ref) await attachReferral(orderNo, p, ref, env);
  const q = new URLSearchParams({
    userSecretKey: String(env.TOYYIBPAY_USER_SECRET_KEY).trim(),
    categoryCode: String(env.TOYYIBPAY_CATEGORY_CODE).trim(),
    billName: safeText(`REQOO PKSK ${orderNo}`, 30),
    billDescription: safeText(`REQOO SIM PKSK ${orderNo}`, 100),
    billPriceSetting: '1',
    billPayorInfo: '1',
    billAmount: String(cents(PRICE)),
    billReturnUrl: 'https://pksk.sim.reqoo.co/api/sim-payment?action=redirect',
    billCallbackUrl: 'https://pksk.sim.reqoo.co/api/sim-payment?action=callback',
    billExternalReferenceNo: orderNo,
    billTo: name.slice(0, 255),
    billEmail: email || 'payment@reqoo.co',
    billPhone: p,
    billSplitPayment: '0',
    billSplitPaymentArgs: '',
    billPaymentChannel: '0',
    billContentEmail: 'Terima kasih kerana membeli REQOO SIM PKSK.',
    billChargeToCustomer: String(env.TOYYIBPAY_CHARGE_TO_CUSTOMER || '0'),
    enableDuitNowQR: '0',
    chargeDuitNowQR: '0'
  });
  const r = await fetch(`${apiBase(env)}/createBill`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: q.toString()
  });
  const txt = await r.text();
  let tp;
  try { tp = JSON.parse(txt); } catch { tp = null; }
  const billCode = Array.isArray(tp) ? String(tp[0]?.BillCode || '') : '';
  if (!billCode) {
    const detail = tp?.msg || txt || `HTTP ${r.status}`;
    return { ok: false, error: 'ToyyibPay gagal mencipta bill', detail: String(detail).slice(0, 500) };
  }
  await env.DB.prepare("UPDATE orders SET payment_ref=?,payment_status='pending' WHERE id=?").bind(`toyyibpay:${billCode}`, orderNo).run();
  return { ok: true, provider: 'toyyibpay', orderNo, status: 'pending', amount: PRICE, billCode, billUrl: `${payHost(env)}/${billCode}` };
}

async function status(d, env) {
  const o = String(d.orderNo || '').trim();
  if (!o) return { ok: false, error: 'Order diperlukan' };
  const r = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(o).first();
  if (!r) return { ok: true, found: false };
  const l = await env.DB.prepare('SELECT * FROM licenses WHERE order_id=?').bind(o).first();
  return { ok: true, found: true, orderNo: o, status: r.payment_status || 'pending', accessCode: l?.access_code || '', accessUrl: l?.access_code ? ACCESS_URL : '' };
}


async function validCallback(d, env) {
  const received = String(d.hash || '').toLowerCase();
  if (!received || !env.TOYYIBPAY_USER_SECRET_KEY) return false;
  const source = `${String(env.TOYYIBPAY_USER_SECRET_KEY).trim()}${String(d.status || '')}${String(d.order_id || '')}${String(d.refno || '')}ok`;
  const expected = await md5Hex(source);
  try {
    const a = new TextEncoder().encode(expected);
    const b = new TextEncoder().encode(received);
    return a.length === b.length && crypto.subtle.timingSafeEqual(a, b);
  } catch { return expected === received; }
}
async function callback(d, env) {
  if (!env.DB || !env.TOYYIBPAY_USER_SECRET_KEY) return new Response('Configuration missing', { status: 500 });
  if (!await validCallback(d, env)) return new Response('Invalid hash', { status: 401 });
  const orderId = String(d.order_id || '').trim();
  if (!orderId) return new Response('Missing order id', { status: 400 });
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(orderId).first();
  if (!o) return new Response('OK');
  if (String(d.status || '') !== '1') return new Response('OK');
  const billCode = String(d.billcode || '').trim();
  if (billCode && o.payment_ref && o.payment_ref !== `toyyibpay:${billCode}`) return new Response('Bill mismatch', { status: 400 });
  if (String(o.payment_status || '').toLowerCase() === 'paid') {
    await issueLicense(o, env);
    await settleReferral(o.id, env);
    return new Response('OK');
  }
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE orders SET payment_status='paid',paid_at=? WHERE id=? AND LOWER(TRIM(payment_status))!='paid'").bind(now, o.id).run();
  await issueLicense({ ...o, payment_status: 'paid' }, env);
  await settleReferral(o.id, env);
  return new Response('OK');
}

async function issueLicense(o, env) {
  const e = await env.DB.prepare('SELECT * FROM licenses WHERE order_id=?').bind(o.id).first();
  if (e?.access_code) {
    if (Number(e.max_devices || 0) !== MAX_DEVICES) await env.DB.prepare('UPDATE licenses SET max_devices=? WHERE id=?').bind(MAX_DEVICES, e.id).run();
    return e.access_code;
  }
  const code = await uniqueCode(env);
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO licenses (id,order_id,access_code,status,max_devices,created_at,activated_at,expires_at) VALUES (?,?,?,?,?,?,?,NULL)`).bind('lic_' + crypto.randomUUID(), o.id, code, 'active', MAX_DEVICES, now, now).run();
  return code;
}

async function redirect(d, env) {
  const orderId = String(d.order_id || '').trim();
  let o = null;
  if (env.DB && orderId) o = await env.DB.prepare('SELECT id,payment_status FROM orders WHERE id=? LIMIT 1').bind(orderId).first();
  const u = new URL('https://pksk.sim.reqoo.co/payment/');
  const statusId = String(d.status_id || '');
  const paid = o?.payment_status === 'paid';
  u.searchParams.set('payment', paid ? 'success' : statusId === '3' ? 'failed' : 'pending');
  if (o?.id || orderId) u.searchParams.set('order', o?.id || orderId);
  return new Response(null, { status: 302, headers: { Location: u.toString(), 'cache-control': 'no-store' } });
}
