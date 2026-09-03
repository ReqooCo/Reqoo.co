import { onRequest } from '../functions/api/shop-admin.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, X-Admin-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Cache-Control': 'no-store'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=UTF-8' }
});
const clean = v => String(v ?? '').trim();

function adminOk(request, env) {
  const expected = clean(env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || env.SHOP_ADMIN_TOKEN || env.PKSK_ADMIN_TOKEN);
  const supplied = clean(request.headers.get('X-Admin-Token') || request.headers.get('X-Admin-Key'));
  return !!expected && supplied === expected;
}

export async function handle(request, env) {
  const url = new URL(request.url);
  const action = clean(url.searchParams.get('action'));

  if (url.pathname === '/api/sim-admin' && action === 'summary') {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!adminOk(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401);
    if (!env.DB) return json({ ok: false, error: 'D1 binding DB tidak dijumpai.' }, 503);
    const [products, customers, orders] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n FROM products WHERE status='active'").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM customers WHERE status='active'").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM orders").first()
    ]);
    return json({ ok: true, products: Number(products?.n || 0), customers: Number(customers?.n || 0), orders: Number(orders?.n || 0) });
  }

  const bridgedEnv = {
    ...env,
    SHOP_DB: env.SHOP_DB || env.DB,
    SHOP_ADMIN_TOKEN: env.SHOP_ADMIN_TOKEN || env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || '',
    PKSK_ADMIN_TOKEN: env.PKSK_ADMIN_TOKEN || env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || ''
  };
  return onRequest({ request, env: bridgedEnv });
}
