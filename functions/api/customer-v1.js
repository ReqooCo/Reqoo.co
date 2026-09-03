// REQOO V1 Customer API.
// Safe checkout primitive: create or resolve one customer without exposing customer search.

const json = (body, status = 200, traceId = crypto.randomUUID()) =>
  new Response(JSON.stringify({ ok: status < 400, ...body, trace_id: traceId }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-reqoo-trace-id': traceId
    }
  });

const clean = (value, max) => String(value ?? '').trim().slice(0, max);
const normalizeEmail = (value) => clean(value, 254).toLowerCase();

export async function onRequestPost({ request, env }) {
  const traceId = request.headers.get('x-reqoo-trace-id') || crypto.randomUUID();

  if (!env.DB) return json({ error: 'CORE_DB_BINDING_MISSING' }, 503, traceId);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'INVALID_JSON' }, 400, traceId);
  }

  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40) || null;
  const email = normalizeEmail(body.email) || null;

  if (!name) return json({ error: 'CUSTOMER_NAME_REQUIRED' }, 400, traceId);
  if (!phone && !email) return json({ error: 'CUSTOMER_CONTACT_REQUIRED' }, 400, traceId);

  try {
    let existing = null;
    if (email) {
      existing = await env.DB.prepare(
        "SELECT id, name, phone, email, status FROM customers WHERE lower(email)=? AND status='active' LIMIT 1"
      ).bind(email).first();
    }
    if (!existing && phone) {
      existing = await env.DB.prepare(
        "SELECT id, name, phone, email, status FROM customers WHERE phone=? AND status='active' LIMIT 1"
      ).bind(phone).first();
    }

    if (existing) {
      await env.DB.prepare(
        "UPDATE customers SET name=?, phone=COALESCE(?,phone), email=COALESCE(?,email), updated_at=? WHERE id=?"
      ).bind(name, phone, email, new Date().toISOString(), existing.id).run();

      await env.DB.prepare(
        "INSERT INTO activity_events (id,customer_id,event_type,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?)"
      ).bind(crypto.randomUUID(), existing.id, 'customer.resolved', traceId, JSON.stringify({ source: 'core-v1' }), new Date().toISOString()).run();

      return json({ customer: { id: existing.id, name, phone: phone || existing.phone, email: email || existing.email, status: existing.status }, created: false }, 200, traceId);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO customers (id,name,phone,email,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)"
    ).bind(id, name, phone, email, 'active', now, now).run();

    await env.DB.prepare(
      "INSERT INTO activity_events (id,customer_id,event_type,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(), id, 'customer.created', traceId, JSON.stringify({ source: 'core-v1' }), now).run();

    return json({ customer: { id, name, phone, email, status: 'active' }, created: true }, 201, traceId);
  } catch {
    return json({ error: 'CUSTOMER_WRITE_FAILED' }, 500, traceId);
  }
}
