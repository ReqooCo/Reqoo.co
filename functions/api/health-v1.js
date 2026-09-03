// REQOO V1 Core health endpoint.
// Read-only: verifies the rebuild D1 binding without creating or mutating data.

function json(body, status = 200, traceId = crypto.randomUUID()) {
  return new Response(JSON.stringify({ ok: status < 400, ...body, trace_id: traceId }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-reqoo-trace-id': traceId
    }
  });
}

export async function onRequestGet({ request, env }) {
  const traceId = request.headers.get('x-reqoo-trace-id') || crypto.randomUUID();

  if (!env.DB) {
    return json({
      service: 'reqoo-core-v1',
      status: 'degraded',
      db: 'missing',
      error: 'CORE_DB_BINDING_MISSING'
    }, 503, traceId);
  }

  try {
    const row = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='customers' LIMIT 1"
    ).first();

    if (!row) {
      return json({
        service: 'reqoo-core-v1',
        status: 'degraded',
        db: 'connected',
        schema: 'invalid',
        error: 'CORE_SCHEMA_NOT_READY'
      }, 503, traceId);
    }

    return json({
      service: 'reqoo-core-v1',
      status: 'ok',
      db: 'connected',
      schema: 'ready'
    }, 200, traceId);
  } catch (error) {
    return json({
      service: 'reqoo-core-v1',
      status: 'degraded',
      db: 'error',
      error: 'CORE_DB_QUERY_FAILED'
    }, 503, traceId);
  }
}
