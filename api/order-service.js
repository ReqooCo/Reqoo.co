// Shared checkout/order service.
// Keeps cart validation and order creation in one place so future routes cannot trust client prices.

function cleanText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanItems(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('Cart kosong');
  if (items.length > 50) throw new Error('Cart terlalu banyak item');
  return items.map((item) => ({
    productId: cleanText(item?.product_id || item?.id, 100),
    quantity: Math.max(1, Math.min(999, Math.floor(Number(item?.quantity || 1)))),
    customization: item?.customization && typeof item.customization === 'object' ? item.customization : {},
    variation: item?.variation && typeof item.variation === 'object' ? item.variation : {},
    addons: Array.isArray(item?.addons) ? item.addons : []
  }));
}

export async function buildOrder(e, input) {
  const name = cleanText(input?.name, 120);
  const phone = cleanText(input?.phone, 40);
  const email = cleanText(input?.email, 160);
  const shippingAddress = cleanText(input?.shipping_address, 1000);
  const orderNote = cleanText(input?.order_note, 1000);
  if (!name || !phone) throw new Error('Nama dan telefon diperlukan');

  const requested = cleanItems(input?.items);
  const ids = [...new Set(requested.map(x => x.productId).filter(Boolean))];
  if (ids.length !== requested.length) throw new Error('Product ID tidak sah');

  const placeholders = ids.map(() => '?').join(',');
  const { results } = await e.DB.prepare(`
    SELECT id,sku,name,base_price_minor,sale_price_minor,status
    FROM products WHERE id IN (${placeholders})
  `).bind(...ids).all();
  const products = new Map((results || []).map(p => [p.id, p]));

  let subtotal = 0;
  const lines = requested.map((item) => {
    const p = products.get(item.productId);
    if (!p || p.status !== 'active') throw new Error(`Product tidak tersedia: ${item.productId}`);
    const unit = Number(p.sale_price_minor ?? p.base_price_minor ?? 0);
    if (!Number.isInteger(unit) || unit < 0) throw new Error(`Harga product tidak sah: ${p.id}`);
    const line = unit * item.quantity;
    subtotal += line;
    return {
      id: crypto.randomUUID(), productId: p.id, productName: p.name, sku: p.sku,
      unit, qty: item.quantity, line,
      customization: item.customization, variation: item.variation, addons: item.addons
    };
  });

  const customerId = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements = [
    e.DB.prepare(`INSERT INTO customers (id,name,phone,email,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(customerId, name, phone, email || null, 'active', now, now),
    e.DB.prepare(`INSERT INTO orders (id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,shipping_address,order_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(orderId, customerId, 'shop', 'MYR', subtotal, 0, 0, 0, subtotal, 'pending', 'pending', shippingAddress || null, orderNote || null, now, now),
    ...lines.map(l => e.DB.prepare(`INSERT INTO order_items (id,order_id,product_id,product_name_snapshot,sku_snapshot,variation_snapshot_json,customization_snapshot_json,addons_snapshot_json,unit_price_minor,quantity,line_total_minor,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(l.id, orderId, l.productId, l.productName, l.sku || null, JSON.stringify(l.variation), JSON.stringify(l.customization), JSON.stringify(l.addons), l.unit, l.qty, l.line, now))
  ];

  await e.DB.batch(statements);
  return { id: orderId, customer_id: customerId, total_minor: subtotal, payment_status: 'pending', fulfillment_status: 'pending' };
}
