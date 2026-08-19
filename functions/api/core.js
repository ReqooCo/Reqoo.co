const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
  'access-control-allow-headers': 'Content-Type,X-Reqoo-Admin-Token,X-Trace-Id',
  'cache-control': 'no-store'
};

export async function onRequest({ request, env }) {
  const traceId = request.headers.get('X-Trace-Id') || `req_${crypto.randomUUID()}`;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    if (!env.DB) return json({ ok: false, error: 'REQOO Core DB binding belum tersedia', traceId }, 503, traceId);
    const input = await readInput(request);
    const action = String(input.action || '').trim();
    const adminToken = request.headers.get('X-Reqoo-Admin-Token') || '';
    const result = await route(action, input, env, traceId, adminToken);
    return json({ ...result, traceId }, result.statusCode || 200, traceId);
  } catch (error) {
    console.error('REQOO_CORE_ERROR', traceId, error);
    await logError(env, traceId, request, error);
    const unauthorized = error?.code === 'UNAUTHORIZED';
    return json({ ok: false, error: unauthorized ? 'Unauthorized' : 'Internal server error', traceId }, unauthorized ? 401 : 500, traceId);
  }
}

async function route(action, d, env, traceId, adminToken) {
  if (action === 'health') return { ok: true, service: 'REQOO CORE API', version: 'CORE-1', db: true };
  if (action === 'listProducts') return listProducts(env);
  if (action === 'getProduct') return getProduct(d, env);
  if (action === 'createCustomer') return createCustomer(d, env, traceId);
  if (action === 'getCustomer') return getCustomer(d, env);
  requireAdmin(adminToken, env);
  if (action === 'createProduct') return createProduct(d, env, traceId);
  if (action === 'updateProduct') return updateProduct(d, env, traceId);
  if (action === 'listCustomers') return listCustomers(d, env);
  if (action === 'listActivity') return listActivity(d, env);
  if (action === 'listErrors') return listErrors(d, env);
  return { ok: false, error: 'Action tidak dikenali', statusCode: 400 };
}

function requireAdmin(supplied, env) {
  const expected = String(env.REQOO_ADMIN_TOKEN || '');
  if (!expected || supplied !== expected) { const e = new Error('Unauthorized'); e.code = 'UNAUTHORIZED'; throw e; }
}

async function readInput(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  if (request.method === 'GET') return query;
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) return { ...query, ...(await request.json()) };
  return query;
}
function json(data, status = 200, traceId = '') { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=UTF-8', 'X-Trace-Id': traceId, ...CORS } }); }
function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function text(v) { return String(v ?? '').trim(); }
function money(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; }
function yes(v) { return v === true || v === 1 || v === '1' || v === 'true'; }
function list(v) { return Array.isArray(v) ? v : []; }
function map(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
function parse(v, fallback) { try { return v == null || v === '' ? fallback : JSON.parse(v); } catch { return fallback; } }

async function listProducts(env) {
  const rows = await env.DB.prepare(`SELECT * FROM products WHERE status='active' ORDER BY name ASC`).all();
  return { ok: true, products: await hydrate(rows.results || [], env) };
}
async function getProduct(d, env) {
  const key = text(d.id || d.slug || d.sku);
  if (!key) return { ok: false, error: 'Product id, slug atau sku diperlukan', statusCode: 400 };
  const row = await env.DB.prepare(`SELECT * FROM products WHERE id=? OR slug=? OR sku=? LIMIT 1`).bind(key, key, key).first();
  if (!row) return { ok: false, error: 'Produk tidak dijumpai', statusCode: 404 };
  return { ok: true, product: (await hydrate([row], env))[0] };
}
async function hydrate(products, env) {
  const out = [];
  for (const p of products) {
    const [images, variations, fields, addons] = await Promise.all([
      env.DB.prepare(`SELECT id,url,alt_text,sort_order,is_cover FROM product_images WHERE product_id=? ORDER BY sort_order`).bind(p.id).all(),
      env.DB.prepare(`SELECT id,sku,name,attributes_json,price_minor,sale_price_minor,stock_qty,stock_tracking,image_url,status FROM product_variations WHERE product_id=? ORDER BY name`).bind(p.id).all(),
      env.DB.prepare(`SELECT id,field_key,label,field_type,required,options_json,conditional_json,price_adjustment_minor,sort_order FROM product_custom_fields WHERE product_id=? ORDER BY sort_order`).bind(p.id).all(),
      env.DB.prepare(`SELECT id,name,description,price_adjustment_minor,required,sort_order,status FROM product_addons WHERE product_id=? ORDER BY sort_order`).bind(p.id).all()
    ]);
    out.push({ ...p, images: images.results || [], variations: (variations.results || []).map(x => ({ ...x, attributes: parse(x.attributes_json, {}) })), customFields: (fields.results || []).map(x => ({ ...x, required: !!x.required, options: parse(x.options_json, []), conditional: parse(x.conditional_json, null) })), addons: addons.results || [] });
  }
  return out;
}

async function createCustomer(d, env, traceId) {
  const name = text(d.name); if (!name) return { ok: false, error: 'Nama diperlukan', statusCode: 400 };
  const phone = text(d.phone) || null, email = text(d.email) || null;
  const existing = phone || email ? await env.DB.prepare(`SELECT * FROM customers WHERE (? IS NOT NULL AND phone=?) OR (? IS NOT NULL AND email=?) LIMIT 1`).bind(phone, phone, email, email).first() : null;
  if (existing) return { ok: true, customer: existing, created: false };
  const at = now(), customerId = id('cus');
  await env.DB.prepare(`INSERT INTO customers (id,name,phone,email,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`).bind(customerId, name, phone, email, 'active', at, at).run();
  await activity(env, { customerId, eventType: 'CUSTOMER_CREATED', traceId, metadata: { source: text(d.source) || 'core' } });
  return { ok: true, customer: await env.DB.prepare(`SELECT * FROM customers WHERE id=?`).bind(customerId).first(), created: true };
}
async function getCustomer(d, env) {
  const key = text(d.id || d.phone || d.email); if (!key) return { ok: false, error: 'Customer id, phone atau email diperlukan', statusCode: 400 };
  const customer = await env.DB.prepare(`SELECT * FROM customers WHERE id=? OR phone=? OR email=? LIMIT 1`).bind(key, key, key).first();
  if (!customer) return { ok: false, error: 'Customer tidak dijumpai', statusCode: 404 };
  const [orders, licenses] = await Promise.all([
    env.DB.prepare(`SELECT id,source,total_minor,payment_status,fulfillment_status,created_at FROM orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 100`).bind(customer.id).all(),
    env.DB.prepare(`SELECT id,product_id,order_id,access_code,status,max_devices,starts_at,expires_at,created_at,updated_at FROM licenses WHERE customer_id=? ORDER BY created_at DESC`).bind(customer.id).all()
  ]);
  return { ok: true, customer, orders: orders.results || [], licenses: licenses.results || [] };
}

async function createProduct(d, env, traceId) {
  const name = text(d.name), productType = text(d.productType || 'physical'), fulfillment = text(d.fulfillmentType || 'physical_shipping');
  const types = ['physical','digital','licensed','play_access','service'], fulfillments = ['physical_shipping','digital_delivery','licensed_access','play_access','service_custom'];
  if (!name) return { ok: false, error: 'Nama produk diperlukan', statusCode: 400 };
  if (!types.includes(productType) || !fulfillments.includes(fulfillment)) return { ok: false, error: 'Jenis produk/fulfillment tidak sah', statusCode: 400 };
  const productId = id('prd'), at = now();
  await env.DB.prepare(`INSERT INTO products (id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,internal_notes,production_instructions,seo_title,seo_description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(productId, text(d.sku) || null, name, text(d.slug) || null, productType, fulfillment, text(d.description) || null, text(d.shortDescription) || null, money(d.basePriceMinor), d.salePriceMinor == null ? null : money(d.salePriceMinor), text(d.currency || 'MYR'), text(d.status || 'draft'), text(d.internalNotes) || null, text(d.productionInstructions) || null, text(d.seoTitle) || null, text(d.seoDescription) || null, at, at).run();
  await replaceChildren(productId, d, env, at);
  await audit(env, d, traceId, 'PRODUCT_CREATED', 'product', productId, null, { name, status: text(d.status || 'draft') });
  return { ok: true, product: (await getProduct({ id: productId }, env)).product };
}
async function updateProduct(d, env, traceId) {
  const productId = text(d.id); if (!productId) return { ok: false, error: 'Product id diperlukan', statusCode: 400 };
  const before = await env.DB.prepare(`SELECT * FROM products WHERE id=?`).bind(productId).first(); if (!before) return { ok: false, error: 'Produk tidak dijumpai', statusCode: 404 };
  const at = now();
  await env.DB.prepare(`UPDATE products SET sku=?,name=?,slug=?,product_type=?,fulfillment_type=?,description=?,short_description=?,base_price_minor=?,sale_price_minor=?,currency=?,status=?,internal_notes=?,production_instructions=?,seo_title=?,seo_description=?,updated_at=? WHERE id=?`).bind(text(d.sku ?? before.sku) || null, text(d.name ?? before.name), text(d.slug ?? before.slug) || null, text(d.productType ?? before.product_type), text(d.fulfillmentType ?? before.fulfillment_type), text(d.description ?? before.description) || null, text(d.shortDescription ?? before.short_description) || null, d.basePriceMinor == null ? before.base_price_minor : money(d.basePriceMinor), d.salePriceMinor === undefined ? before.sale_price_minor : (d.salePriceMinor === null ? null : money(d.salePriceMinor)), text(d.currency ?? before.currency), text(d.status ?? before.status), text(d.internalNotes ?? before.internal_notes) || null, text(d.productionInstructions ?? before.production_instructions) || null, text(d.seoTitle ?? before.seo_title) || null, text(d.seoDescription ?? before.seo_description) || null, at, productId).run();
  if (d.images || d.variations || d.customFields || d.addons) await replaceChildren(productId, d, env, at);
  const after = await env.DB.prepare(`SELECT * FROM products WHERE id=?`).bind(productId).first();
  await audit(env, d, traceId, 'PRODUCT_UPDATED', 'product', productId, before, after);
  return { ok: true, product: (await getProduct({ id: productId }, env)).product };
}
async function replaceChildren(productId, d, env, at) {
  const q = [];
  if (d.images) { q.push(env.DB.prepare(`DELETE FROM product_images WHERE product_id=?`).bind(productId)); for (const x of list(d.images)) q.push(env.DB.prepare(`INSERT INTO product_images (id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES (?,?,?,?,?,?,?)`).bind(id('img'), productId, text(x.url), text(x.altText) || null, Number(x.sortOrder || 0), yes(x.isCover) ? 1 : 0, at)); }
  if (d.variations) { q.push(env.DB.prepare(`DELETE FROM product_variations WHERE product_id=?`).bind(productId)); for (const x of list(d.variations)) q.push(env.DB.prepare(`INSERT INTO product_variations (id,product_id,sku,name,attributes_json,price_minor,sale_price_minor,stock_qty,stock_tracking,image_url,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id('var'), productId, text(x.sku) || null, text(x.name), JSON.stringify(map(x.attributes)), x.priceMinor == null ? null : money(x.priceMinor), x.salePriceMinor == null ? null : money(x.salePriceMinor), x.stockQty == null ? null : Number(x.stockQty), yes(x.stockTracking) ? 1 : 0, text(x.imageUrl) || null, text(x.status || 'active'), at, at)); }
  if (d.customFields) { q.push(env.DB.prepare(`DELETE FROM product_custom_fields WHERE product_id=?`).bind(productId)); for (const x of list(d.customFields)) q.push(env.DB.prepare(`INSERT INTO product_custom_fields (id,product_id,field_key,label,field_type,required,options_json,conditional_json,price_adjustment_minor,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id('fld'), productId, text(x.fieldKey), text(x.label), text(x.fieldType), yes(x.required) ? 1 : 0, JSON.stringify(list(x.options)), x.conditional == null ? null : JSON.stringify(map(x.conditional)), money(x.priceAdjustmentMinor), Number(x.sortOrder || 0), at, at)); }
  if (d.addons) { q.push(env.DB.prepare(`DELETE FROM product_addons WHERE product_id=?`).bind(productId)); for (const x of list(d.addons)) q.push(env.DB.prepare(`INSERT INTO product_addons (id,product_id,name,description,price_adjustment_minor,required,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id('add'), productId, text(x.name), text(x.description) || null, money(x.priceAdjustmentMinor), yes(x.required) ? 1 : 0, text(x.status || 'active'), Number(x.sortOrder || 0), at, at)); }
  if (q.length) await env.DB.batch(q);
}
async function listCustomers(d, env) { const limit = Math.min(100, Math.max(1, Number(d.limit || 50))); const rows = await env.DB.prepare(`SELECT * FROM customers ORDER BY created_at DESC LIMIT ?`).bind(limit).all(); return { ok: true, customers: rows.results || [] }; }
async function listActivity(d, env) { const limit = Math.min(200, Math.max(1, Number(d.limit || 100))), customerId = text(d.customerId); const rows = customerId ? await env.DB.prepare(`SELECT * FROM activity_events WHERE customer_id=? ORDER BY created_at DESC LIMIT ?`).bind(customerId, limit).all() : await env.DB.prepare(`SELECT * FROM activity_events ORDER BY created_at DESC LIMIT ?`).bind(limit).all(); return { ok: true, events: rows.results || [] }; }
async function listErrors(d, env) { const limit = Math.min(200, Math.max(1, Number(d.limit || 100))), traceId = text(d.traceId); const rows = traceId ? await env.DB.prepare(`SELECT * FROM error_events WHERE trace_id=? ORDER BY created_at DESC LIMIT ?`).bind(traceId, limit).all() : await env.DB.prepare(`SELECT * FROM error_events ORDER BY created_at DESC LIMIT ?`).bind(limit).all(); return { ok: true, errors: rows.results || [] }; }
async function activity(env, { customerId = null, productId = null, orderId = null, licenseId = null, eventType, traceId = null, metadata = {} }) { await env.DB.prepare(`INSERT INTO activity_events (id,customer_id,product_id,order_id,license_id,event_type,trace_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id('evt'), customerId, productId, orderId, licenseId, eventType, traceId, JSON.stringify(metadata), now()).run(); }
async function audit(env, d, traceId, action, targetType, targetId, before, after) { await env.DB.prepare(`INSERT INTO admin_audit_events (id,actor_id,action,target_type,target_id,reason,before_json,after_json,trace_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id('audit'), text(d.actorId) || null, action, targetType, targetId, text(d.reason) || null, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after), traceId, now()).run(); }
async function logError(env, traceId, request, error) { try { await env.DB.prepare(`INSERT INTO error_events (id,trace_id,endpoint,error_code,message,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)`).bind(id('err'), traceId, new URL(request.url).pathname, 'UNHANDLED', String(error?.message || error), '{}', now()).run(); } catch (e) { console.error('REQOO_ERROR_LOG_FAILED', traceId, e); } }
