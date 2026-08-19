const HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const PAYMENT_STATUSES = ["pending", "processing", "paid", "failed", "cancelled", "refunded"];
function json(body, status = 200, traceId = crypto.randomUUID()) { return new Response(JSON.stringify({ ...body, trace_id: traceId }), { status, headers: { ...HEADERS, "x-reqoo-trace-id": traceId } }); }
function id(prefix) { return `${prefix}${crypto.randomUUID().replaceAll("-", "")}`; }
function clean(v, max = 500) { if (v == null) return null; const s = String(v).trim(); return s ? s.slice(0, max) : null; }
function amount(v) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; }

async function createPayment(request, env, traceId) {
  const key = clean(request.headers.get("idempotency-key"), 200);
  if (!key) return json({ ok: false, error: "IDEMPOTENCY_KEY_REQUIRED" }, 400, traceId);
  let input; try { input = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400, traceId); }
  if (!input?.order_id) return json({ ok: false, error: "ORDER_ID_REQUIRED" }, 400, traceId);
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(input.order_id).first();
  if (!order) return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404, traceId);
  const value = amount(input.amount_minor ?? order.total_minor);
  if (value === null) return json({ ok: false, error: "INVALID_PAYMENT_AMOUNT" }, 400, traceId);
  const provider = clean(input.provider, 80); if (!provider) return json({ ok: false, error: "PROVIDER_REQUIRED" }, 400, traceId);
  const method = clean(input.method, 80);
  const prior = await env.DB.prepare("SELECT * FROM payments WHERE provider = ? AND provider_reference = ? LIMIT 1").bind(provider, key).first();
  if (prior) return json({ ok: true, idempotent_replay: true, payment: prior }, 200, traceId);
  const paymentId = id("pay_");
  const timestamp = new Date().toISOString();
  try {
    await env.DB.prepare("INSERT INTO payments (id,order_id,provider,provider_reference,method,amount_minor,currency,status,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(paymentId, order.id, provider, key, method, value, order.currency || "MYR", "pending", JSON.stringify(input.metadata || {}), timestamp, timestamp).run();
    await env.DB.prepare("INSERT INTO activity_events (id,customer_id,order_id,event_type,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("evt_"), order.customer_id || null, order.id, "payment.created", traceId, JSON.stringify({ payment_id: paymentId, provider }), timestamp).run();
    return json({ ok: true, payment: { id: paymentId, order_id: order.id, amount_minor: value, currency: order.currency || "MYR", status: "pending" } }, 201, traceId);
  } catch (error) {
    await env.DB.prepare("INSERT INTO error_events (id,customer_id,order_id,trace_id,endpoint,error_code,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id("err_"), order.customer_id || null, order.id, traceId, "/api/payment-v1", "PAYMENT_CREATE_FAILED", String(error?.message || error), JSON.stringify({ provider }), timestamp).run().catch(() => {});
    return json({ ok: false, error: "PAYMENT_CREATE_FAILED" }, 500, traceId);
  }
}

async function updatePayment(request, env, paymentId, traceId) {
  if (!env.ADMIN_API_KEY) return json({ ok: false, error: "PAYMENT_ADMIN_AUTH_NOT_CONFIGURED" }, 503, traceId);
  if (request.headers.get("authorization") !== `Bearer ${env.ADMIN_API_KEY}`) return json({ ok: false, error: "PAYMENT_ADMIN_UNAUTHORIZED" }, 401, traceId);
  let input; try { input = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400, traceId); }
  if (!PAYMENT_STATUSES.includes(input?.status)) return json({ ok: false, error: "INVALID_PAYMENT_STATUS" }, 400, traceId);
  const payment = await env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(paymentId).first();
  if (!payment) return json({ ok: false, error: "PAYMENT_NOT_FOUND" }, 404, traceId);
  const paidAt = input.status === "paid" ? new Date().toISOString() : payment.paid_at;
  try {
    await env.DB.prepare("UPDATE payments SET status = ?, paid_at = ?, metadata_json = ?, updated_at = ? WHERE id = ?").bind(input.status, paidAt, JSON.stringify(input.metadata || {}), new Date().toISOString(), paymentId).run();
    if (["paid", "failed", "cancelled", "refunded"].includes(input.status)) {
      const orderStatus = input.status === "paid" ? "paid" : input.status;
      await env.DB.prepare("UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?").bind(orderStatus, new Date().toISOString(), payment.order_id).run();
    }
    await env.DB.prepare("INSERT INTO activity_events (id,order_id,event_type,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?)").bind(id("evt_"), payment.order_id, "payment.updated", traceId, JSON.stringify({ payment_id: paymentId, status: input.status }), new Date().toISOString()).run();
    return json({ ok: true, payment: await env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(paymentId).first() }, 200, traceId);
  } catch (error) { return json({ ok: false, error: "PAYMENT_UPDATE_FAILED", message: String(error?.message || error) }, 500, traceId); }
}

export async function onRequest(context) {
  const { request, env } = context;
  const traceId = request.headers.get("x-reqoo-trace-id") || crypto.randomUUID();
  if (!env.DB) return json({ ok: false, error: "CORE_DB_BINDING_MISSING" }, 503, traceId);
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  const paymentId = parts.length > 2 ? parts[2] : null;
  if (request.method === "POST" && !paymentId) return createPayment(request, env, traceId);
  if (request.method === "GET" && paymentId) {
    const payment = await env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(paymentId).first();
    return payment ? json({ ok: true, payment }, 200, traceId) : json({ ok: false, error: "PAYMENT_NOT_FOUND" }, 404, traceId);
  }
  if ((request.method === "PUT" || request.method === "PATCH") && paymentId) return updatePayment(request, env, paymentId, traceId);
  return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, traceId);
}
