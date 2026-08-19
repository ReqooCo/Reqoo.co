const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function allowedOrigin(origin) {
  return origin === 'https://admin.reqoo.co' || origin === 'https://shop.reqoo.co' || origin === 'https://reqoo.co' || origin === 'https://www.reqoo.co';
}

function headers(origin) {
  return {
    ...JSON_HEADERS,
    'Access-Control-Allow-Origin': allowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Vary': 'Origin'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status: status ?? 200, headers: headers(origin) });
}

function admin(request, env) {
  const key = request.headers.get('X-Admin-Key');
  return Boolean(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cleanProduct(input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('Product name is required');
  const slug = slugify(input?.slug || name);
  if (!slug) throw new Error('Product slug is required');

  const priceRM = Number(input?.price ?? 0);
  if (!Number.isFinite(priceRM) || priceRM < 0) throw new Error('Invalid product price');
  const basePriceMinor = Number.isInteger(input?.base_price_minor) ? input.base_price_minor : Math.round(priceRM * 100);
  const salePriceMinor = input?.sale_price_minor == null || input?.sale_price_minor === '' ? null : Number(input.sale_price_minor);
  const status = input?.status || (input?.published ? 'active' : 'draft');
  if (!['draft', 'active', 'hidden', 'out_of_stock', 'archived'].includes(status)) throw new Error('Invalid product status');

  return {
    name, slug,
    description: String(input?.description || '').trim(),
    short_description: String(input?.short_description || '').trim(),
    product_type: input?.product_type || 'physical',
    fulfillment_type: input?.fulfillment_type || 'physical_shipping',
    base_price_minor: basePriceMinor,
    sale_price_minor: salePriceMinor,
    currency: String(input?.currency || 'MYR'),
    status,
    internal_notes: String(input?.internal_notes || '').trim(),
    production_instructions: String(input?.production_instructions || '').trim(),
    seo_title: String(input?.seo_title || '').trim(),
    seo_description: String(input?.seo_description || '').trim(),
    images: Array.isArray(input?.images) ? input.images.map(v => String(v).trim()).filter(Boolean).slice(0, 12) : []
  };
}

async function productRow(env, id) {
  const row = await env.DB.prepare('SELECT id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,internal_notes,production_instructions,seo_title,seo_description,created_at,updated_at FROM products WHERE id=?').bind(id).first();
  if (!row) return null;
  const { results } = await env.DB.prepare('SELECT id,url,alt_text,sort_order,is_cover FROM product_images WHERE product_id=? ORDER BY sort_order ASC').bind(id).all();
  const images = (results || []).map(x => x.url);
  return { ...row, price: Number(row.sale_price_minor ?? row.base_price_minor ?? 0) / 100, published: row.status === 'active', images };
}

async function listProducts(env, publishedOnly) {
  const sql = publishedOnly
    ? "SELECT id FROM products WHERE status='active' ORDER BY updated_at DESC"
    : "SELECT id FROM products WHERE status<>'archived' ORDER BY updated_at DESC";
  const { results } = await env.DB.prepare(sql).all();
  return Promise.all((results || []).map(row => productRow(env, row.id)));
}

async function replaceImages(env, productId, images) {
  await env.DB.prepare('DELETE FROM product_images WHERE product_id=?').bind(productId).run();
  const now = new Date().toISOString();
  for (let i = 0; i < images.length; i++) {
    await env.DB.prepare('INSERT INTO product_images (id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), productId, images[i], '', i, i === 0 ? 1 : 0, now).run();
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'reqoo-api', database: 'reqoo-rebuild' }, 200, origin);
    if (url.pathname !== '/products' && !url.pathname.startsWith('/products/')) return json({ error: 'Not found' }, 404, origin);

    try {
      if (request.method === 'GET') {
        const publishedOnly = url.searchParams.get('published') === 'true';
        if (!publishedOnly && !admin(request, env)) return json({ error: 'Admin key required' }, 401, origin);
        return json(await listProducts(env, publishedOnly), 200, origin);
      }
      if (!admin(request, env)) return json({ error: 'Admin key required' }, 401, origin);

      const id = decodeURIComponent(url.pathname.split('/')[2] || '');
      if (request.method === 'POST') {
        const p = cleanProduct(await request.json());
        const productId = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(`INSERT INTO products (id,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,internal_notes,production_instructions,seo_title,seo_description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(productId,p.name,p.slug,p.product_type,p.fulfillment_type,p.description,p.short_description,p.base_price_minor,p.sale_price_minor,p.currency,p.status,p.internal_notes,p.production_instructions,p.seo_title,p.seo_description,now,now).run();
        await replaceImages(env, productId, p.images);
        return json(await productRow(env, productId), 201, origin);
      }

      if (!id) return json({ error: 'Product id required' }, 400, origin);
      if (request.method === 'DELETE') {
        await env.DB.prepare("UPDATE products SET status='archived', updated_at=? WHERE id=?").bind(new Date().toISOString(), id).run();
        return json({ ok: true, id }, 200, origin);
      }
      if (request.method === 'PUT') {
        const p = cleanProduct(await request.json());
        const now = new Date().toISOString();
        await env.DB.prepare(`UPDATE products SET name=?,slug=?,product_type=?,fulfillment_type=?,description=?,short_description=?,base_price_minor=?,sale_price_minor=?,currency=?,status=?,internal_notes=?,production_instructions=?,seo_title=?,seo_description=?,updated_at=? WHERE id=?`)
          .bind(p.name,p.slug,p.product_type,p.fulfillment_type,p.description,p.short_description,p.base_price_minor,p.sale_price_minor,p.currency,p.status,p.internal_notes,p.production_instructions,p.seo_title,p.seo_description,now,id).run();
        await replaceImages(env, id, p.images);
        return json(await productRow(env, id), 200, origin);
      }
      return json({ error: 'Method not allowed' }, 405, origin);
    } catch (error) {
      return json({ error: error?.message || 'Server error' }, 400, origin);
    }
  }
};
