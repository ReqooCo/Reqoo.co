const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

const ALLOWED_ORIGINS = new Set([
  'https://admin.reqoo.co',
  'https://shop.reqoo.co',
  'https://reqoo.co',
  'https://www.reqoo.co'
]);

export function responseHeaders(origin = '') {
  return {
    ...JSON_HEADERS,
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Vary': 'Origin'
  };
}

export function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(origin)
  });
}

export function options(origin = '') {
  return new Response(null, { status: 204, headers: responseHeaders(origin) });
}

export function isAdmin(request, env) {
  const key = request.headers.get('X-Admin-Key');
  return Boolean(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function cleanProduct(input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('Product name is required');

  const slug = slugify(input?.slug || name);
  if (!slug) throw new Error('Product slug is required');

  const priceRM = Number(input?.price ?? 0);
  if (!Number.isFinite(priceRM) || priceRM < 0) throw new Error('Invalid product price');

  const basePriceMinor = Number.isInteger(input?.base_price_minor)
    ? input.base_price_minor
    : Math.round(priceRM * 100);

  const salePriceMinor = input?.sale_price_minor == null || input?.sale_price_minor === ''
    ? null
    : Number(input.sale_price_minor);

  const status = input?.status || (input?.published ? 'active' : 'draft');
  if (!['draft', 'active', 'hidden', 'out_of_stock', 'archived'].includes(status)) {
    throw new Error('Invalid product status');
  }

  return {
    name,
    slug,
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
    images: Array.isArray(input?.images)
      ? input.images.map(v => String(v).trim()).filter(Boolean).slice(0, 12)
      : []
  };
}

export async function productRow(env, id) {
  const row = await env.DB.prepare(
    'SELECT id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,internal_notes,production_instructions,seo_title,seo_description,created_at,updated_at FROM products WHERE id=?'
  ).bind(id).first();

  if (!row) return null;

  const { results } = await env.DB.prepare(
    'SELECT id,url,alt_text,sort_order,is_cover FROM product_images WHERE product_id=? ORDER BY sort_order ASC'
  ).bind(id).all();

  const images = (results || []).map(x => x.url);
  return {
    ...row,
    price: Number(row.sale_price_minor ?? row.base_price_minor ?? 0) / 100,
    published: row.status === 'active',
    images
  };
}

export async function listProducts(env, publishedOnly) {
  const sql = publishedOnly
    ? "SELECT id FROM products WHERE status='active' ORDER BY updated_at DESC"
    : "SELECT id FROM products WHERE status<>'archived' ORDER BY updated_at DESC";

  const { results } = await env.DB.prepare(sql).all();
  return Promise.all((results || []).map(row => productRow(env, row.id)));
}

export async function replaceImages(env, productId, images) {
  await env.DB.prepare('DELETE FROM product_images WHERE product_id=?').bind(productId).run();
  const now = new Date().toISOString();

  for (let i = 0; i < images.length; i += 1) {
    await env.DB.prepare(
      'INSERT INTO product_images (id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES (?,?,?,?,?,?,?)'
    ).bind(
      crypto.randomUUID(),
      productId,
      images[i],
      '',
      i,
      i === 0 ? 1 : 0,
      now
    ).run();
  }
}
