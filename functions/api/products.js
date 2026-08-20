import {
  cleanProduct,
  isAdmin,
  json,
  listProducts,
  options,
  productRow,
  replaceImages
} from '../../_catalog.js';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return options(origin);
  if (!env.DB) return json({ error: 'D1 binding DB is not configured' }, 500, origin);

  try {
    if (request.method === 'GET') {
      const publishedOnly = new URL(request.url).searchParams.get('published') === 'true';
      if (!publishedOnly && !isAdmin(request, env)) {
        return json({ error: 'Admin key required' }, 401, origin);
      }
      return json(await listProducts(env, publishedOnly), 200, origin);
    }

    if (!isAdmin(request, env)) {
      return json({ error: 'Admin key required' }, 401, origin);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    const p = cleanProduct(await request.json());
    const productId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO products (id,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,internal_notes,production_instructions,seo_title,seo_description,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      productId,
      p.name,
      p.slug,
      p.product_type,
      p.fulfillment_type,
      p.description,
      p.short_description,
      p.base_price_minor,
      p.sale_price_minor,
      p.currency,
      p.status,
      p.internal_notes,
      p.production_instructions,
      p.seo_title,
      p.seo_description,
      now,
      now
    ).run();

    await replaceImages(env, productId, p.images);
    return json(await productRow(env, productId), 201, origin);
  } catch (error) {
    return json({ error: error?.message || 'Server error' }, 400, origin);
  }
}
