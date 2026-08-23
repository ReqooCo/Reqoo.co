const COOKIE = 'reqoo_admin_session';
const TTL_SECONDS = 60 * 60 * 8;
const COOKIE_BASE = `${COOKIE}=; Path=/; Domain=.reqoo.co; HttpOnly; Secure; SameSite=Lax`;

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function parseB64url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function adminSecret(env) {
  return String(env.ADMIN_KEY || '').trim();
}
async function key(env) {
  const secret = adminSecret(env);
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function sign(env, payload) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await key(env), new TextEncoder().encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}
async function verify(env, token) {
  try {
    const [body, signature] = String(token || '').split('.');
    if (!body || !signature || !adminSecret(env)) return false;
    const ok = await crypto.subtle.verify('HMAC', await key(env), parseB64url(signature), new TextEncoder().encode(body));
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(parseB64url(body)));
    return payload.sub === 'admin' && payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export async function adminLogin(request, env) {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  let supplied = request.headers.get('X-Admin-Key') || '';
  if (!supplied) {
    try {
      const type = request.headers.get('Content-Type') || '';
      if (type.includes('application/x-www-form-urlencoded')) {
        supplied = String((await request.formData()).get('key') || '');
      } else if (type.includes('application/json')) {
        supplied = String((await request.json())?.key || '');
      }
    } catch {}
  }
  const expected = adminSecret(env);
  supplied = String(supplied).trim();
  if (!expected || !supplied || supplied !== expected) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const token = await sign(env, { sub: 'admin', exp: Math.floor(Date.now() / 1000) + TTL_SECONDS });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE_BASE}; Max-Age=${TTL_SECONDS}`
        .replace(`${COOKIE}=;`, `${COOKIE}=${token};`)
    }
  });
}

export async function adminLogout() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE_BASE}; Max-Age=0`
    }
  });
}

export async function hasAdminSession(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? verify(env, match[1]) : false;
}
