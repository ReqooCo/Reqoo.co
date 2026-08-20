import {
  cleanProduct,
  isAdmin,
  json,
  options,
  productRow,
  replaceImages
} from '../../_catalog.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = request.headers.get('Origin') || '';
  const id = decodeURIComponent(params.id || '');

  if (request.method === 'OPTIONS') return options(origin);
  if (!env.DB) return json({ error: 'D1 binding DB is not configured' }, 500, origin);
  if (!id) return json({ error: 'Product id required' }, 400, origin);
  if (!isAdmin(request, env)) return json({ error: 'Admin key required' }, 401, origin);

  try {
    if (request.method === 'DELETE') {
      await env.DB.prepare(
        "UPDATE products SET status='archived', updated_at=? WHERE id=?"
      ).bind(new Date().toISOString(), id).run();
      return json({ ok: true, id }, 200, origin);
    }

    if (request.method !== 'PUT') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    const p = cleanProduct(await request.json());
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE products SET name=?,slug=?,product_type=?,fulfillment_type=?,description=?,short_description=?,base_price_minor=?,sale_price_minor=?,currency=?,status=?,internal_notes=?,production_instructions=?,seo_title=?,seo_description=?,updated_at=? WHERE id=?`
    ).bind(
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
      id
    ).run();

    await replaceImages(env, id, p.images);
    const product = await productRow(env, id);
    if (!product) return json({ error: 'Product not found' }, 404, origin);
    return json(product, 200, origin);
  } catch (error) {
    return json({ error: error?.message || 'Server error' }, 400, origin);
  }
}
