function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = new Set([
    'https://reqoo.co',
    'https://www.reqoo.co',
    'https://admin.reqoo.co',
    'https://shop.reqoo.co',
    'https://shop.reqoo.co',
    'http://localhost:8787'
  ]);
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'https://reqoo.co',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Vary': 'Origin'
  };
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(request) }
  });
}

function slugify(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function admin(request, env) {
  const key = request.headers.get('X-Admin-Key');
  return Boolean(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
}

function productInput(input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('Product name is required');

  const productType = ['physical', 'digital', 'licensed', 'play_access', 'service'].includes(input?.product_type)
    ? input.product_type : 'physical';
  const fulfillmentType = ['physical_shipping', 'digital_delivery', 'licensed_access', 'play_access', 'service_custom'].includes(input?.fulfillment_type)
    ? input.fulfillment_type : 'physical_shipping';
  const status = ['draft', 'active', 'hidden', 'out_of_stock', 'archived'].includes(input?.status)
    ? input.status : 'draft';

  const basePrice = Number(input?.base_price ?? input?.base_price_minor ?? 0);
  const salePrice = input?.sale_price == null && input?.sale_price_minor == null
    ? null : Number(input?.sale_price ?? input?.sale_price_minor);
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error('Invalid base price');
  if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) throw new Error('Invalid sale price');

  return {
    sku: input?.sku ? String(input.sku).trim() : null,
    name,
    slug: slugify(input?.slug || name),
    product_type: productType,
    fulfillment_type: fulfillmentType,
    description: String(input?.description || '').trim(),
    short_description: String(input?.short_description || '').trim(),
    base_price_minor: Math.round(basePrice),
    sale_price_minor: salePrice === null ? null : Math.round(salePrice),
    currency: String(input?.currency || 'MYR').trim() || 'MYR',
    status,
    internal_notes: input?.internal_notes == null ? null : String(input.internal_notes),
    production_instructions: input?.production_instructions == null ? null : String(input.production_instructions),
    seo_title: input?.seo_title == null ? null : String(input.seo_title),
    seo_description: input?.seo_description == null ? null : String(input.seo_description),
    images: Array.isArray(input?.images) ? input.images.map(String).map(s => s.trim()).filter(Boolean) : [],
    variations: Array.isArray(input?.variations) ? input.variations : [],
    addons: Array.isArray(input?.addons) ? input.addons : [],
    custom_fields: Array.isArray(input?.custom_fields) ? input.custom_fields : []
  };
}

async function getProduct(db, id) {
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  if (!product) return null;
  const [images, variations, addons, customFields] = await Promise.all([
    db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC').bind(id).all(),
    db.prepare('SELECT * FROM product_variations WHERE product_id = ? ORDER BY created_at ASC').bind(id).all(),
    db.prepare('SELECT * FROM product_addons WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC').bind(id).all(),
    db.prepare('SELECT * FROM product_custom_fields WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC').bind(id).all()
  ]);
  return {
    ...product,
    images: images.results || [],
    variations: variations.results || [],
    addons: addons.results || [],
    custom_fields: customFields.results || []
  };
}

async function listProducts(db, publishedOnly) {
  const query = publishedOnly
    ? "SELECT * FROM products WHERE status = 'active' ORDER BY updated_at DESC, created_at DESC"
    : 'SELECT * FROM products ORDER BY updated_at DESC, created_at DESC';
  const { results } = await db.prepare(query).all();
  return Promise.all((results || []).map(row => getProduct(db, row.id)));
}

async function replaceChildren(db, id, p) {
  await db.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id).run();
  await db.prepare('DELETE FROM product_variations WHERE product_id = ?').bind(id).run();
  await db.prepare('DELETE FROM product_addons WHERE product_id = ?').bind(id).run();
  await db.prepare('DELETE FROM product_custom_fields WHERE product_id = ?').bind(id).run();

  const now = new Date().toISOString();
  for (let i = 0; i < p.images.length; i++) {
    await db.prepare('INSERT INTO product_images (id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), id, p.images[i], null, i, i === 0 ? 1 : 0, now).run();
  }
  for (const v of p.variations) {
    await db.prepare(`INSERT INTO product_variations
      (id,product_id,sku,name,attributes_json,price_minor,sale_price_minor,stock_qty,stock_tracking,image_url,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(
        crypto.randomUUID(), id, v.sku ? String(v.sku) : null, String(v.name || 'Variation'),
        JSON.stringify(v.attributes || v.attributes_json || {}),
        v.price_minor == null ? null : Math.round(Number(v.price_minor)),
        v.sale_price_minor == null ? null : Math.round(Number(v.sale_price_minor)),
        v.stock_qty == null ? null : Number(v.stock_qty), v.stock_tracking ? 1 : 0,
        v.image_url ? String(v.image_url) : null,
        ['active','hidden','out_of_stock'].includes(v.status) ? v.status : 'active', now, now
      ).run();
  }
  for (let i = 0; i < p.addons.length; i++) {
    const a = p.addons[i];
    await db.prepare(`INSERT INTO product_addons
      (id,product_id,name,description,price_adjustment_minor,required,status,sort_order,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(), id, String(a.name || ''), a.description ? String(a.description) : null,
        Math.round(Number(a.price_adjustment_minor || 0)), a.required ? 1 : 0,
        a.status === 'hidden' ? 'hidden' : 'active', i, now, now).run();
  }
  for (let i = 0; i < p.custom_fields.length; i++) {
    const f = p.custom_fields[i];
    await db.prepare(`INSERT INTO product_custom_fields
      (id,product_id,field_key,label,field_type,required,options_json,conditional_json,price_adjustment_minor,sort_order,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(), id, String(f.field_key || f.key || `field_${i + 1}`), String(f.label || ''),
        ['text','textarea','number','date','time','dropdown','radio','checkbox','color','image','file'].includes(f.field_type) ? f.field_type : 'text',
        f.required ? 1 : 0, JSON.stringify(f.options || f.options_json || []), f.conditional_json ? JSON.stringify(f.conditional_json) : null,
        Math.round(Number(f.price_adjustment_minor || 0)), i, now, now).run();
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
    const url = new URL(request.url);

    if (url.pathname === '/health') return json({ ok: true, service: 'reqoo-api', schema: 'rebuild-v1' }, 200, request);
    if (!url.pathname.startsWith('/products')) return json({ error: 'Not found' }, 404, request);

    try {
      if (request.method === 'GET') {
        const publishedOnly = url.searchParams.get('published') === 'true';
        if (!publishedOnly && !admin(request, env)) return json({ error: 'Admin key required' }, 401, request);
        if (url.pathname === '/products') return json({ ok: true, products: await listProducts(env.DB, publishedOnly) }, 200, request);
        const id = decodeURIComponent(url.pathname.slice('/products/'.length));
        const product = await getProduct(env.DB, id);
        return product ? json({ ok: true, product }, 200, request) : json({ error: 'Product not found' }, 404, request);
      }

      if (!admin(request, env)) return json({ error: 'Admin key required' }, 401, request);

      if (request.method === 'POST') {
        const p = productInput(await request.json());
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(`INSERT INTO products
          (id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,internal_notes,production_instructions,seo_title,seo_description,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(id,p.sku,p.name,p.slug,p.product_type,p.fulfillment_type,p.description,p.short_description,p.base_price_minor,p.sale_price_minor,p.currency,p.status,p.internal_notes,p.production_instructions,p.seo_title,p.seo_description,now,now).run();
        await replaceChildren(env.DB, id, p);
        return json({ ok: true, product: await getProduct(env.DB, id) }, 201, request);
      }

      const id = decodeURIComponent(url.pathname.slice('/products/'.length));
      if (!id) return json({ error: 'Product id required' }, 400, request);

      if (request.method === 'PUT') {
        const p = productInput(await request.json());
        const now = new Date().toISOString();
        await env.DB.prepare(`UPDATE products SET sku=?,name=?,slug=?,product_type=?,fulfillment_type=?,description=?,short_description=?,base_price_minor=?,sale_price_minor=?,currency=?,status=?,internal_notes=?,production_instructions=?,seo_title=?,seo_description=?,updated_at=? WHERE id=?`)
          .bind(p.sku,p.name,p.slug,p.product_type,p.fulfillment_type,p.description,p.short_description,p.base_price_minor,p.sale_price_minor,p.currency,p.status,p.internal_notes,p.production_instructions,p.seo_title,p.seo_description,now,id).run();
        await replaceChildren(env.DB, id, p);
        return json({ ok: true, product: await getProduct(env.DB, id) }, 200, request);
      }

      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
        return json({ ok: true, id }, 200, request);
      }

      return json({ error: 'Method not allowed' }, 405, request);
    } catch (error) {
      return json({ ok: false, error: error?.message || 'Server error' }, 400, request);
    }
  }
};
