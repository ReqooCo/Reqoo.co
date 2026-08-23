const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const ORIGINS = new Set(['https://admin.reqoo.co','https://shop.reqoo.co','https://reqoo.co','https://www.reqoo.co']);

function json(data, status, origin) {
  const h = new Headers(JSON_HEADERS);
  h.set('Access-Control-Allow-Origin', ORIGINS.has(origin) ? origin : 'null');
  h.set('Access-Control-Allow-Credentials', 'true');
  h.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  h.set('Vary', 'Origin');
  h.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: h });
}

function isAdmin(request, env) {
  const key = request.headers.get('X-Admin-Key');
  return Boolean(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
}

export async function orderPublic(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return json({}, 204, origin);
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);
  if (!env.DB) return json({ error: 'D1 binding DB is not configured' }, 500, origin);

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/orders\/([^/]+)$/);
  if (!match) return json({ error: 'Not found' }, 404, origin);
  const id = decodeURIComponent(match[1]);
  const token = String(url.searchParams.get('token') || '').trim();

  if (!isAdmin(request, env)) {
    if (!token || token.length < 32) return json({ error: 'Order access token diperlukan' }, 401, origin);
  }

  const order = await env.DB.prepare(`
    SELECT id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,
           payment_status,fulfillment_status,shipping_address,order_note,created_at,updated_at,public_token
    FROM orders WHERE id=? LIMIT 1
  `).bind(id).first();
  if (!order) return json({ error: 'Order not found' }, 404, origin);
  if (!isAdmin(request, env) && order.public_token !== token) return json({ error: 'Order access denied' }, 403, origin);

  const customer = await env.DB.prepare('SELECT name,phone,email FROM customers WHERE id=?').bind(order.customer_id).first();
  const { results: items } = await env.DB.prepare(`
    SELECT id,product_id,product_name_snapshot,sku_snapshot,variation_snapshot_json,
           customization_snapshot_json,addons_snapshot_json,unit_price_minor,quantity,line_total_minor
    FROM order_items WHERE order_id=? ORDER BY created_at ASC
  `).bind(id).all();
  const payment = await env.DB.prepare(`
    SELECT id,provider,provider_reference,method,amount_minor,currency,status,paid_at,created_at,updated_at
    FROM payments WHERE order_id=? ORDER BY created_at DESC LIMIT 1
  `).bind(id).first();

  delete order.public_token;
  return json({ order, customer, items: items || [], payment: payment || null }, 200, origin);
}
