const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, X-Admin-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Cache-Control': 'no-store'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=UTF-8' } });
const clean = v => String(v ?? '').trim();
const adminOk = (request, env) => {
  const expected = clean(env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY);
  const supplied = clean(request.headers.get('X-Admin-Token') || request.headers.get('X-Admin-Key'));
  return !!expected && supplied === expected;
};

export async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const u = new URL(request.url);
  const action = clean(u.searchParams.get('action'));
  if (!adminOk(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'D1 binding DB tidak dijumpai.' }, 503);

  if (u.pathname === '/api/sim-admin' && action === 'summary') {
    const [products, customers, orders] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n FROM products WHERE status='active'").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM customers WHERE status='active'").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM orders").first()
    ]);
    return json({ ok: true, products: Number(products?.n || 0), customers: Number(customers?.n || 0), orders: Number(orders?.n || 0) });
  }

  if (u.pathname === '/api/shop-admin' && action === 'listOrders') {
    const limit = Math.min(100, Math.max(1, Number(u.searchParams.get('limit') || 50)));
    const rows = await env.DB.prepare(`SELECT o.id,o.customer_id,o.source,o.currency,o.total_minor,o.payment_status,o.fulfillment_status,o.created_at,c.name AS customer_name,c.phone,c.email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT ?`).bind(limit).all();
    return json({ ok: true, orders: (rows.results || []).map(o => ({ ...o, total: Number(o.total_minor || 0) / 100 })) });
  }

  return json({ ok: false, error: 'Action tidak dikenali' }, 400);
}
