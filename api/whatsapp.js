function textResponse(body, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function ensureSchema(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS whatsapp_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
}

async function recordEvent(env, payload) {
  if (!env.DB) return;
  await ensureSchema(env);
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const field = change?.field || 'unknown';
  await env.DB.prepare(
    'INSERT INTO whatsapp_events (id,event_type,payload_json,created_at) VALUES (?,?,?,?)'
  ).bind(crypto.randomUUID(), field, JSON.stringify(payload), new Date().toISOString()).run();
}

export async function webhook(request, env) {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token && env.WHATSAPP_VERIFY_TOKEN && safeEqual(token, env.WHATSAPP_VERIFY_TOKEN)) {
      return textResponse(challenge || '', 200);
    }
    return textResponse('Forbidden', 403);
  }

  if (request.method !== 'POST') return textResponse('Method Not Allowed', 405);

  const raw = await request.text();
  if (env.WHATSAPP_APP_SECRET) {
    const signature = request.headers.get('X-Hub-Signature-256') || '';
    const expected = `sha256=${await hmacHex(env.WHATSAPP_APP_SECRET, raw)}`;
    if (!safeEqual(signature, expected)) return textResponse('Invalid signature', 401);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return textResponse('Invalid JSON', 400);
  }

  if (payload?.object !== 'whatsapp_business_account') return textResponse('Ignored', 200);

  try {
    await recordEvent(env, payload);
  } catch (error) {
    console.error('WhatsApp event recording failed', error);
  }

  return textResponse('EVENT_RECEIVED', 200);
}
