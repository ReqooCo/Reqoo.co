// REQOO V1 Order API contract scaffold.
// This endpoint intentionally refuses to create an order until a real D1 binding
// and the migration runner are wired in. It prevents accidental production writes
// while the rebuild foundation is being tested.

function json(body, status = 200, traceId = crypto.randomUUID()) {
  return new Response(JSON.stringify({ ok: status < 400, ...body, trace_id: traceId }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-reqoo-trace-id': traceId }
  });
}

export async function onRequestPost({ request, env }) {
  const traceId = request.headers.get('x-reqoo-trace-id') || crypto.randomUUID();
  const idempotencyKey = request.headers.get('idempotency-key');

  if (!idempotencyKey) {
    return json({ error: 'IDEMPOTENCY_KEY_REQUIRED' }, 400, traceId);
  }

  // Deliberate rebuild guard: do not write to legacy or production storage.
  // The real implementation will be enabled only after D1 is explicitly bound
  // to the rebuild environment and migration 0001 has been verified.
  return json({
    error: 'ORDER_CORE_NOT_ENABLED',
    message: 'Reqoo V1 Order Core is scaffolded but not enabled for writes yet.'
  }, 503, traceId);
}

export async function onRequestGet({ request }) {
  const traceId = request.headers.get('x-reqoo-trace-id') || crypto.randomUUID();
  return json({ error: 'ORDER_READ_NOT_ENABLED' }, 503, traceId);
}
