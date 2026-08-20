const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif']
]);

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type,X-Reqoo-Admin-Token,X-Trace-Id',
  'cache-control': 'no-store'
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    if (!env.MEDIA) return json({ ok: false, error: 'MEDIA R2 binding belum tersedia' }, 503);
    const adminToken = request.headers.get('X-Reqoo-Admin-Token') || '';
    if (request.method !== 'GET') requireAdmin(adminToken, env);

    if (request.method === 'POST') return await upload(request, env);
    if (request.method === 'GET') return await serve(request, env);
    if (request.method === 'DELETE') return await remove(request, env);
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, POST, DELETE', ...CORS } });
  } catch (error) {
    const status = error?.code === 'UNAUTHORIZED' ? 401 : 500;
    return json({ ok: false, error: status === 401 ? 'Unauthorized' : String(error?.message || error) }, status);
  }
}

function requireAdmin(supplied, env) {
  const expected = String(env.REQOO_ADMIN_TOKEN || '');
  if (!expected || supplied !== expected) {
    const e = new Error('Unauthorized');
    e.code = 'UNAUTHORIZED';
    throw e;
  }
}

async function upload(request, env) {
  const form = await request.formData();
  const file = form.get('file');
  const productId = String(form.get('productId') || '').trim();
  if (!(file instanceof File)) return json({ ok: false, error: 'Fail gambar diperlukan' }, 400);
  if (!productId) return json({ ok: false, error: 'Product id diperlukan' }, 400);
  if (!ALLOWED.has(file.type)) return json({ ok: false, error: 'Format gambar mesti JPG, PNG, WEBP atau GIF' }, 415);
  if (file.size > MAX_BYTES) return json({ ok: false, error: 'Saiz gambar maksimum 10 MB' }, 413);

  const ext = ALLOWED.get(file.type);
  const key = `products/${safe(productId)}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, file, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      productId,
      originalName: file.name || 'image'
    }
  });

  const url = `/api/product-image?key=${encodeURIComponent(key)}`;
  return json({ ok: true, key, url, name: file.name || key, size: file.size, type: file.type });
}

async function serve(request, env) {
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!key || key.includes('..') || !key.startsWith('products/')) return new Response('Not Found', { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not Found', { status: 404 });
  const headers = new Headers(CORS);
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', object.httpMetadata?.cacheControl || 'public, max-age=31536000, immutable');
  return new Response(object.body, { status: 200, headers });
}

async function remove(request, env) {
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!key || key.includes('..') || !key.startsWith('products/')) return json({ ok: false, error: 'Key tidak sah' }, 400);
  await env.MEDIA.delete(key);
  return json({ ok: true });
}

function safe(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'product';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=UTF-8', ...CORS }
  });
}
