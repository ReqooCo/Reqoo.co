function cleanText(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('Cart kosong');
  if (items.length > 50) throw new Error('Cart terlalu banyak item');
  return items.map((item) => ({
    productId: cleanText(item?.product_id || item?.id, 100),
    qty: Math.max(1, Math.min(999, Math.floor(Number(item?.quantity || 1)))),
    customization: item?.customization && typeof item.customization === 'object' ? item.customization : {},
    variation: item?.variation && typeof item.variation === 'object' ? item.variation : {},
    addons: Array.isArray(item?.addons) ? item.addons : []
  }));
}

async function getExistingOrder(db, key) {
  if (!key) return null;
  return db.prepare(`
    SELECT id, customer_id, total_minor, payment_status, fulfillment_status
    FROM orders WHERE idempotency_key=? LIMIT 1
  `).bind(key).first();
}

export async function checkout(request, env) {
  if (request.method !== 'POST') return new Response(JSON.stringify({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }), { status: 405, headers: { 'Content-Type': 'application/json' } });

  const key = String(request.headers.get('Idempotency-Key') || '').trim();
  if (!key || key.length < 16 || key.length > 200) {
    return new Response(JSON.stringify({ ok: false, error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key diperlukan.' } }), { status: 400, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  const existing = await getExistingOrder(env.DB, key);
  if (existing) return new Response(JSON.stringify({ ok: true, order: existing, idempotent: true }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Idempotency-Key': key } });

  let input;
  try { input = await request.json(); } catch { return new Response(JSON.stringify({ ok: false, error: { code: 'INVALID_JSON', message: 'Data pesanan tidak sah.' } }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const name = cleanText(input?.name, 120);
  const phone = cleanText(input?.phone, 40);
  const email = cleanText(input?.email, 160);
  const shippingAddress = cleanText(input?.shipping_address, 1000);
  const orderNote = cleanText(input?.order_note, 1000);
  if (!name || !phone || !shippingAddress) throw new Error('Nama, telefon dan alamat diperlukan');

  const requested = normalizeItems(input?.items);
  const ids = [...new Set(requested.map(x => x.productId).filter(Boolean))];
  if (ids.length !== requested.length) throw new Error('Product ID tidak sah');

  const placeholders = ids.map(() => '?').join(',');
  const { results } = await env.DB.prepare(`SELECT id,sku,name,base_price_minor,sale_price_minor,status FROM products WHERE id IN (${placeholders})`).bind(...ids).all();
  const products = new Map((results || []).map(p => [p.id, p]));
  let subtotal = 0;
  const lines = requested.map(item => {
    const p = products.get(item.productId);
    if (!p || p.status !== 'active') throw new Error(`Product tidak tersedia: ${item.productId}`);
    const unit = Number(p.sale_price_minor ?? p.base_price_minor ?? 0);
    if (!Number.isInteger(unit) || unit < 0) throw new Error(`Harga product tidak sah: ${p.id}`);
    const line = unit * item.qty;
    subtotal += line;
    return { ...item, product: p, unit, line };
  });

  const customerId = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements = [
    env.DB.prepare(`INSERT INTO customers (id,name,phone,email,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`).bind(customerId, name, phone, email || null, 'active', now, now),
    env.DB.prepare(`INSERT INTO orders (id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,shipping_address,order_note,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderId, customerId, 'shop', 'MYR', subtotal, 0, 0, 0, subtotal, 'pending', 'pending', shippingAddress, orderNote || null, key, now, now),
    ...lines.map(l => env.DB.prepare(`INSERT INTO order_items (id,order_id,product_id,product_name_snapshot,sku_snapshot,variation_snapshot_json,customization_snapshot_json,addons_snapshot_json,unit_price_minor,quantity,line_total_minor,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), orderId, l.product.id, l.product.name, l.product.sku || null, JSON.stringify(l.variation), JSON.stringify(l.customization), JSON.stringify(l.addons), l.unit, l.qty, l.line, now))
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    // A concurrent request with the same key may have won the unique constraint.
    const winner = await getExistingOrder(env.DB, key);
    if (winner) return new Response(JSON.stringify({ ok: true, order: winner, idempotent: true }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Idempotency-Key': key } });
    throw error;
  }

  const order = { id: orderId, customer_id: customerId, total_minor: subtotal, payment_status: 'pending', fulfillment_status: 'pending' };
  return new Response(JSON.stringify({ ok: true, order, idempotent: false }), { status: 201, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Idempotency-Key': key } });
}
