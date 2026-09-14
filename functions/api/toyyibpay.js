import { md5Hex } from './toyyibpay-core.js';
const PROD_BASE = 'https://toyyibpay.com/index.php/api';
const SANDBOX_BASE = 'https://dev.toyyibpay.com/index.php/api';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  try {
    const data = await input(request);
    const action = String(data.action || '');
    if (action === 'health') {
      return json({
        ok: true,
        provider: 'ToyyibPay',
        configured: !!env.TOYYIBPAY_USER_SECRET_KEY,
        categoryConfigured: !!env.TOYYIBPAY_CATEGORY_CODE,
        environment: String(env.TOYYIBPAY_ENV || 'production').toLowerCase(),
        duitNowQr: false
      });
    }
    if (action === 'createCategory') {
      const auth = requirePaymentToken(request, env);
      if (auth) return auth;
      return json(await createCategory(data, env));
    }
    if (action === 'createBill') {
      const auth = requirePaymentToken(request, env);
      if (auth) return auth;
      return json(await createBill(data, env));
    }
    if (action === 'verifyCallback') return json(await verifyCallback(data, env));
    return json({ ok: false, error: 'Action tidak dikenali' }, 400);
  } catch (error) {
    return json({ ok: false, error: 'TOYYIBPAY_REQUEST_FAILED', message: String(error?.message || error) }, 500);
  }
}

async function input(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  if (request.method === 'GET') return query;
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) return { ...query, ...await request.json() };
  return { ...query, ...Object.fromEntries(new URLSearchParams(await request.text()).entries()) };
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type,X-Reqoo-Payment-Token',
    'cache-control': 'no-store'
  };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=UTF-8', ...cors() } });
}
function apiBase(env) {
  return String(env.TOYYIBPAY_ENV || 'production').toLowerCase() === 'sandbox' ? SANDBOX_BASE : PROD_BASE;
}
function requireKey(env) {
  if (!env.TOYYIBPAY_USER_SECRET_KEY) return 'TOYYIBPAY_USER_SECRET_KEY belum ditetapkan';
  return '';
}
function requirePaymentToken(request, env) {
  const expected = String(env.REQOO_PAYMENT_TOKEN || '');
  if (!expected) return json({ ok: false, error: 'PAYMENT_AUTH_NOT_CONFIGURED' }, 503);
  if (request.headers.get('X-Reqoo-Payment-Token') !== expected) return json({ ok: false, error: 'PAYMENT_UNAUTHORIZED' }, 401);
  return null;
}
async function postForm(url, params) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return { response, text, parsed };
}
function providerError(result, fallback) {
  const parsed = result.parsed;
  if (parsed && !Array.isArray(parsed) && parsed.status === 'error') return parsed.msg || fallback;
  if (typeof result.text === 'string' && result.text.trim()) return result.text.trim().slice(0, 500);
  return fallback;
}

async function createCategory(data, env) {
  const missing = requireKey(env);
  if (missing) return { ok: false, error: missing, configurationRequired: true };
  const name = String(data.name || data.catname || 'REQOO Payments').trim().slice(0, 100);
  const description = String(data.description || data.catdescription || 'REQOO unified payments').trim().slice(0, 200);
  const params = new URLSearchParams({
    catname: name,
    catdescription: description,
    userSecretKey: String(env.TOYYIBPAY_USER_SECRET_KEY).trim()
  });
  const result = await postForm(`${apiBase(env)}/createCategory`, params);
  const categoryCode = Array.isArray(result.parsed) ? String(result.parsed[0]?.CategoryCode || '') : '';
  if (!categoryCode) return { ok: false, error: providerError(result, 'ToyyibPay gagal mencipta category') };
  return { ok: true, provider: 'toyyibpay', categoryCode, categoryName: name };
}

function safeText(value, max) {
  return String(value || '').replace(/[^a-zA-Z0-9 _-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function digitsPhone(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '6' + phone;
  return phone;
}
async function createBill(data, env) {
  const missing = requireKey(env);
  if (missing) return { ok: false, error: missing, configurationRequired: true };
  const categoryCode = String(data.categoryCode || env.TOYYIBPAY_CATEGORY_CODE || '').trim();
  if (!categoryCode) return { ok: false, error: 'TOYYIBPAY_CATEGORY_CODE belum ditetapkan', configurationRequired: true };
  const amountMinor = Math.round(Number(data.amountMinor ?? (Number(data.amount || 0) * 100)));
  const orderRef = String(data.orderRef || data.order_id || '').trim();
  const name = String(data.name || data.billTo || '').trim();
  const email = String(data.email || data.billEmail || '').trim();
  const phone = digitsPhone(data.phone || data.billPhone);
  if (!Number.isInteger(amountMinor) || amountMinor < 100) return { ok: false, error: 'Jumlah minimum ToyyibPay ialah RM1.00' };
  if (!name || !email || !phone) return { ok: false, error: 'Nama, email dan telefon diperlukan' };
  const publicOrigin = String(env.REQOO_PUBLIC_ORIGIN || 'https://reqoo.co').replace(/\/$/, '');
  let origin;
  try { origin = new URL(publicOrigin).origin; } catch { return { ok: false, error: 'REQOO_PUBLIC_ORIGIN tidak sah' }; }
  const returnUrl = String(data.returnUrl || `${origin}/payment/return`);
  const callbackUrl = String(data.callbackUrl || `${origin}/api/toyyibpay?action=callback`);
  try { new URL(returnUrl); new URL(callbackUrl); } catch { return { ok: false, error: 'Return/callback URL tidak sah' }; }

  // ToyyibPay is used for online banking/FPX only. REQOO keeps the existing
  // AB Art static QR + proof/verification flow, so ToyyibPay DuitNow QR is
  // deliberately disabled to avoid routing QR transactions through ToyyibPay.
  const params = new URLSearchParams({
    userSecretKey: String(env.TOYYIBPAY_USER_SECRET_KEY).trim(),
    categoryCode,
    billName: safeText(data.billName || `REQOO ${orderRef || 'Order'}`, 30),
    billDescription: safeText(data.description || `REQOO Order ${orderRef || ''}`, 100),
    billPriceSetting: '1',
    billPayorInfo: '1',
    billAmount: String(amountMinor),
    billReturnUrl: returnUrl,
    billCallbackUrl: callbackUrl,
    billExternalReferenceNo: orderRef,
    billTo: name.slice(0, 255),
    billEmail: email.slice(0, 255),
    billPhone: phone,
    billSplitPayment: '0',
    billSplitPaymentArgs: '',
    billPaymentChannel: String(data.billPaymentChannel ?? '0'),
    billContentEmail: safeText(data.billContentEmail || 'Terima kasih kerana membuat pembayaran kepada REQOO.', 200),
    billChargeToCustomer: String(data.billChargeToCustomer ?? '0'),
    enableDuitNowQR: '0',
    chargeDuitNowQR: '0'
  });
  const result = await postForm(`${apiBase(env)}/createBill`, params);
  const billCode = Array.isArray(result.parsed) ? String(result.parsed[0]?.BillCode || '') : '';
  if (!billCode) return { ok: false, error: providerError(result, 'ToyyibPay gagal mencipta bill'), providerRaw: result.parsed || undefined };
  const host = apiBase(env).startsWith(SANDBOX_BASE) ? 'https://dev.toyyibpay.com' : 'https://toyyibpay.com';
  return { ok: true, provider: 'toyyibpay', billCode, billUrl: `${host}/${billCode}`, amount: amountMinor / 100, amountMinor, categoryCode };
}


async function verifyCallback(data, env) {
  const missing = requireKey(env);
  if (missing) return { ok: false, valid: false, error: missing, configurationRequired: true };
  const status = String(data.status || data.status_id || '');
  const orderId = String(data.order_id || '');
  const refno = String(data.refno || '');
  const received = String(data.hash || '').toLowerCase();
  if (!received) return { ok: false, valid: false, error: 'hash diperlukan' };
  const expected = await md5Hex(`${String(env.TOYYIBPAY_USER_SECRET_KEY).trim()}${status}${orderId}${refno}ok`);
  let valid = false;
  try {
    const a = new TextEncoder().encode(expected);
    const b = new TextEncoder().encode(received);
    valid = a.length === b.length && crypto.subtle.timingSafeEqual(a, b);
  } catch { valid = expected === received; }
  return {
    ok: true,
    valid,
    paid: status === '1',
    status,
    orderId,
    refno,
    billCode: String(data.billcode || ''),
    amount: Number(data.amount || 0),
    transactionId: String(data.transaction_id || data.fpx_transaction_id || '')
  };
}
