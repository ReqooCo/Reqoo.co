const DEFAULT_COMMISSION = 5;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  try {
    const data = await readInput(request);
    const result = await route(data, env);
    return json(result);
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
}

async function readInput(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  if (request.method === 'GET') return query;
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return { ...query, ...(await request.json()) };
  return query;
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type,X-Admin-Token',
    'cache-control': 'no-store'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8', ...corsHeaders() }
  });
}

async function route(d, env) {
  const action = String(d.action || '');
  if (action === 'health') return health(env);
  if (action === 'validateReferral') return validateReferral(d, env);
  if (action === 'createReferral') return createReferral(d, env);
  if (action === 'getReferralStats') return getReferralStats(d, env);
  if (!isAdmin(d, env)) return { ok: false, error: 'Unauthorized' };
  if (action === 'listReferrals') return listReferrals(env);
  if (action === 'setReferralStatus') return setReferralStatus(d, env);
  return { ok: false, error: 'Action tidak dikenali' };
}

function isAdmin(d, env) {
  const expected = String(env.PKSK_ADMIN_TOKEN || '');
  return !!expected && String(d.token || '') === expected;
}

function health(env) {
  return {
    ok: true,
    service: 'REQOO Platform API',
    version: 'PLATFORM-1',
    paymentProvider: 'billplz-pending-credentials',
    referralCommission: Number(env.PKSK_COMMISSION || DEFAULT_COMMISSION)
  };
}

function clean(v) { return String(v || '').trim().toUpperCase(); }

async function validateReferral(d, env) {
  const code = clean(d.ref || d.code);
  if (!code) return { ok: false, error: 'Referral diperlukan' };
  const row = await env.DB.prepare("SELECT referral_code,name,status FROM referrals WHERE referral_code=? AND status='ACTIVE'").bind(code).first();
  if (!row) return { ok: false, error: 'Referral tidak sah' };
  return { ok: true, referralCode: row.referral_code, name: row.name, commission: Number(env.PKSK_COMMISSION || DEFAULT_COMMISSION) };
}

async function createReferral(d, env) {
  const code = clean(d.referralCode || d.code);
  const name = String(d.name || '').trim();
  if (!code || !name) return { ok: false, error: 'Kod dan nama diperlukan' };
  const existing = await env.DB.prepare('SELECT id FROM referrals WHERE referral_code=?').bind(code).first();
  if (existing) return { ok: false, error: 'Kod referral sudah digunakan' };
  const id = `ref_${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO referrals (id,referral_code,name,status,created_at) VALUES (?,?,?,'ACTIVE',?)`)
    .bind(id, code, name, new Date().toISOString()).run();
  return { ok: true, referralCode: code, name, status: 'ACTIVE' };
}

async function getReferralStats(d, env) {
  const code = clean(d.ref || d.code);
  const row = await env.DB.prepare('SELECT * FROM referrals WHERE referral_code=?').bind(code).first();
  if (!row) return { ok: false, error: 'Referral tidak dijumpai' };
  return {
    ok: true,
    referral: {
      referralCode: row.referral_code,
      name: row.name,
      status: row.status,
      commission: Number(env.PKSK_COMMISSION || DEFAULT_COMMISSION),
      createdAt: row.created_at
    },
    sales: 0,
    commissionEarned: 0,
    commissionPaid: 0
  };
}

async function listReferrals(env) {
  const r = await env.DB.prepare('SELECT * FROM referrals ORDER BY created_at DESC').all();
  return { ok: true, referrals: r.results || [] };
}

async function setReferralStatus(d, env) {
  const code = clean(d.referralCode || d.code);
  const status = String(d.status || '').toUpperCase();
  if (!['ACTIVE','INACTIVE','SUSPENDED'].includes(status)) return { ok: false, error: 'Status referral tidak sah' };
  const r = await env.DB.prepare('UPDATE referrals SET status=? WHERE referral_code=?').bind(status, code).run();
  return { ok: r.meta.changes > 0, status };
}
