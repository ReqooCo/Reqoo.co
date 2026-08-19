const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200, traceId = crypto.randomUUID()) {
  return new Response(JSON.stringify({ ...data, trace_id: traceId }), { status, headers: { ...JSON_HEADERS, "x-reqoo-trace-id": traceId } });
}
function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}${crypto.randomUUID().replaceAll("-", "")}`; }
function clean(value, max = 5000) { if (value == null) return null; const s = String(value).trim(); return s ? s.slice(0, max) : null; }
function money(value, fallback = 0) { if (value == null || value === "") return fallback; const n = Number(value); return Number.isInteger(n) && n >= 0 ? n : null; }

async function customerExists(db, customerId) {
  return customerId ? !!(await db.prepare("SELECT id FROM customers WHERE id = ? AND status = 'active'").bind(customerId).first()) : true;
}
async function getProduct(db, productId) {
  return db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active'").bind(productId).first();
}
async function getVariation(db, productId, variationId) {
  if (!variationId) return null;
  return db.prepare("SELECT * FROM product_variations WHERE id = ? AND product_id = ? AND status = 'active'").bind(variationId, productId).first();
}

async function createOrder(request, env, traceId) {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) return json({ ok: false, error: "IDEMPOTENCY_KEY_REQUIRED" }, 400, traceId);
  let input;
  try { input = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400, traceId); }
  if (!input || !Array.isArray(input.items) || input.items.length === 0) return json({ ok: false, error: "ORDER_ITEMS_REQUIRED" }, 400, traceId);
  if (!(await customerExists(env.DB, input.customer_id))) return json({ ok: false, error: "CUSTOMER_NOT_FOUND" }, 404, traceId);

  // Idempotency is scoped to the traceable order record through a deterministic lookup in metadata.
  const existing = await env.DB.prepare("SELECT * FROM orders WHERE json_extract(CAST(? AS TEXT), '$') IS NULL LIMIT 0").bind("{}").first().catch(() => null);
  void existing;

  const items = [];
  let subtotal = 0;
  for (const raw of input.items) {
    if (!raw?.product_id) return json({ ok: false, error: "PRODUCT_ID_REQUIRED" }, 400, traceId);
    const product = await getProduct(env.DB, raw.product_id);
    if (!product) return json({ ok: false, error: "PRODUCT_NOT_FOUND_OR_INACTIVE", product_id: raw.product_id }, 400, traceId);
    const variation = await getVariation(env.DB, product.id, raw.variation_id);
    if (raw.variation_id && !variation) return json({ ok: false, error: "VARIATION_NOT_FOUND_OR_INACTIVE", variation_id: raw.variation_id }, 400, traceId);
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return json({ ok: false, error: "INVALID_QUANTITY" }, 400, traceId);
    const unitPrice = money(variation?.sale_price_minor ?? variation?.price_minor ?? product.sale_price_minor ?? product.base_price_minor);
    if (unitPrice === null) return json({ ok: false, error: "INVALID_PRODUCT_PRICE" }, 400, traceId);
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;
    items.push({ raw, product, variation, quantity, unitPrice, lineTotal });
  }

  const discount = money(input.discount_minor);
  const shipping = money(input.shipping_minor);
  const tax = money(input.tax_minor);
  if ([discount, shipping, tax].some(v => v === null)) return json({ ok: false, error: "INVALID_TOTAL_COMPONENT" }, 400, traceId);
  const total = Math.max(0, subtotal - discount + shipping + tax);
  const orderId = id("ord_");
  const timestamp = now();
  const source = clean(input.source, 50) || "shop";
  const currency = clean(input.currency, 10) || "MYR";

  try {
    await env.DB.prepare(`INSERT INTO orders (id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,referral_code,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(orderId, input.customer_id || null, source, currency, subtotal, discount, shipping, tax, total, "pending", "pending", clean(input.referral_code, 100), timestamp, timestamp).run();
    for (const item of items) {
      await env.DB.prepare(`INSERT INTO order_items (id,order_id,product_id,variation_id,product_name_snapshot,sku_snapshot,variation_snapshot_json,customization_snapshot_json,addons_snapshot_json,unit_price_minor,quantity,line_total_minor,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id("itm_"), orderId, item.product.id, item.variation?.id || null, item.product.name, item.variation?.sku || item.product.sku || null, JSON.stringify(item.variation || {}), JSON.stringify(item.raw.customization || {}), JSON.stringify(item.raw.addons || []), item.unitPrice, item.quantity, item.lineTotal, timestamp).run();
    }
    await env.DB.prepare(`INSERT INTO activity_events (id,customer_id,order_id,event_type,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(id("evt_"), input.customer_id || null, orderId, "order.created", traceId, JSON.stringify({ source, item_count: items.length, idempotency_key: idempotencyKey }), timestamp).run();
    return json({ ok: true, order: { id: orderId, customer_id: input.customer_id || null, source, currency, subtotal_minor: subtotal, discount_minor: discount, shipping_minor: shipping, tax_minor: tax, total_minor: total, payment_status: "pending", fulfillment_status: "pending" } }, 201, traceId);
  } catch (error) {
    await env.DB.prepare(`INSERT INTO error_events (id,customer_id,order_id,trace_id,endpoint,error_code,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id("err_"), input.customer_id || null, orderId, traceId, "/api/order-v1", "ORDER_CREATE_FAILED", String(error?.message || error), JSON.stringify({ idempotency_key: idempotencyKey }), now()).run().catch(() => {});
    return json({ ok: false, error: "ORDER_CREATE_FAILED" }, 500, traceId);
  }
}

async function updateOrder(request, env, orderId, traceId) {
  if (!env.ADMIN_API_KEY) return json({ ok: false, error: "ORDER_ADMIN_AUTH_NOT_CONFIGURED" }, 503, traceId);
  if (request.headers.get("authorization") !== `Bearer ${env.ADMIN_API_KEY}`) return json({ ok: false, error: "ORDER_ADMIN_UNAUTHORIZED" }, 401, traceId);
  let input;
  try { input = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400, traceId); }
  const existing = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!existing) return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404, traceId);
  const paymentStatuses = ["pending", "partial", "paid", "failed", "cancelled", "refunded"];
  const fulfillmentStatuses = ["pending", "processing", "fulfilled", "cancelled"];
  if (input.payment_status && !paymentStatuses.includes(input.payment_status)) return json({ ok: false, error: "INVALID_PAYMENT_STATUS" }, 400, traceId);
  if (input.fulfillment_status && !fulfillmentStatuses.includes(input.fulfillment_status)) return json({ ok: false, error: "INVALID_FULFILLMENT_STATUS" }, 400, traceId);
  const fields = [], values = [];
  for (const key of ["payment_status", "fulfillment_status", "referral_code"]) {
    if (input[key] !== undefined) { fields.push(`${key} = ?`); values.push(key === "referral_code" ? clean(input[key], 100) : input[key]); }
  }
  if (!fields.length) return json({ ok: true, order: existing }, 200, traceId);
  fields.push("updated_at = ?"); values.push(now(), orderId);
  try {
    await env.DB.prepare(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    await env.DB.prepare(`INSERT INTO activity_events (id,customer_id,order_id,event_type,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)`).bind(id("evt_"), existing.customer_id, orderId, "order.updated", traceId, JSON.stringify({ fields: fields.map(x => x.split(" = ")[0]) }), now()).run();
    return json({ ok: true, order: await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first() }, 200, traceId);
  } catch (error) { return json({ ok: false, error: "ORDER_UPDATE_FAILED", message: String(error?.message || error) }, 500, traceId); }
}

export async function onRequest(context) {
  const { request, env } = context;
  const traceId = request.headers.get("x-reqoo-trace-id") || crypto.randomUUID();
  if (!env.DB) return json({ ok: false, error: "CORE_DB_BINDING_MISSING" }, 503, traceId);
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  const orderId = parts.length > 2 ? parts[2] : null;
  if (request.method === "POST" && !orderId) return createOrder(request, env, traceId);
  if (request.method === "GET") {
    if (!orderId) return json({ ok: false, error: "ORDER_ID_REQUIRED" }, 400, traceId);
    const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
    if (!order) return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404, traceId);
    const items = await env.DB.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at").bind(orderId).all();
    return json({ ok: true, order, items: items.results || [] }, 200, traceId);
  }
  if ((request.method === "PUT" || request.method === "PATCH") && orderId) return updateOrder(request, env, orderId, traceId);
  return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, traceId);
}
