const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const ALLOWED_ORIGINS = new Set([
  'https://admin.reqoo.co',
  'https://shop.reqoo.co',
  'https://reqoo.co',
  'https://www.reqoo.co'
]);

function response(data, status, origin) {
  const h = new Headers(JSON_HEADERS);
  h.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.has(origin) ? origin : 'null');
  h.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  h.set('Vary', 'Origin');
  return new Response(JSON.stringify(data), { status, headers: h });
}

function isAdmin(request, env) {
  const key = request.headers.get('X-Admin-Key');
  return Boolean(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
}

export async function catalog(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return response({}, 204, origin);
  if (request.method !== 'GET') return response({ error: 'Method not allowed' }, 405, origin);
  if (!env.DB) return response({ error: 'D1 binding DB is not configured' }, 500, origin);

  const url = new URL(request.url);
  const publishedOnly = url.searchParams.get('published') === 'true';
  if (!publishedOnly && !isAdmin(request, env)) {
    return response({ error: 'Admin key required' }, 401, origin);
  }

  const where = publishedOnly ? "WHERE p.status='active'" : "WHERE p.status<>'archived'";
  const { results: products } = await env.DB.prepare(`
    SELECT p.id,p.sku,p.name,p.slug,p.product_type,p.fulfillment_type,
      p.description,p.short_description,p.base_price_minor,p.sale_price_minor,
      p.currency,p.status,p.internal_notes,p.production_instructions,
      p.seo_title,p.seo_description,p.created_at,p.updated_at,
      CASE WHEN p.sale_price_minor IS NOT NULL THEN p.sale_price_minor ELSE p.base_price_minor END AS effective_price_minor
    FROM products p
    ${where}
    ORDER BY p.updated_at DESC
  `).all();

  if (!products?.length) return response([], 200, origin);

  const ids = products.map(p => p.id);
  const placeholders = ids.map(() => '?').join(',');
  const { results: images } = await env.DB.prepare(`
    SELECT id,product_id,url,alt_text,sort_order,is_cover
    FROM product_images
    WHERE product_id IN (${placeholders})
    ORDER BY sort_order ASC
  `).bind(...ids).all();

  const byProduct = new Map();
  for (const image of images || []) {
    const list = byProduct.get(image.product_id) || [];
    list.push(image.url);
    byProduct.set(image.product_id, list);
  }

  const output = products.map(p => ({
    ...p,
    price: Number(p.effective_price_minor ?? 0) / 100,
    published: p.status === 'active',
    images: byProduct.get(p.id) || []
  }));

  const h = new Headers(JSON_HEADERS);
  h.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.has(origin) ? origin : 'null');
  h.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  h.set('Vary', 'Origin');
  if (publishedOnly) {
    h.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  } else {
    h.set('Cache-Control', 'no-store');
  }
  return new Response(JSON.stringify(output), { status: 200, headers: h });
}
