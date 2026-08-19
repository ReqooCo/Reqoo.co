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

function now() {
  return new Date().toISOString();
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

function cleanCustomer(input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('Customer name is required');
  return {
    id: crypto.randomUUID(),
    name,
    phone: String(input?.phone || '').trim() || null,
    email: String(input?.email || '').trim().toLowerCase() || null,
    status: input?.status || 'active'
  };
}

function cleanOrder(input) {
  const currency = String(input?.currency || 'MYR').toUpperCase();
  const source = String(input?.source || 'shop');
  const items = Array.isArray(input?.items) ? input.items : [];
  if (!items.length) throw new Error('Order requires at least one item');
  if (!['shop', 'admin', 'sim', 'play', 'other'].includes(source)) throw new Error('Invalid order source');
  if (currency.length !== 3) throw new Error('Invalid currency');
  return { currency, source, customer_id: input?.customer_id || null, items };
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
  const timestamp = now();
  for (let i = 0; i < images.length; i++) {
    await env.DB.prepare('INSERT INTO product_images (id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), productId, images[i], '', i, i === 0 ? 1 : 0, timestamp).run();
  }
}

async function customerRow(env, id) {
  return env.DB.prepare('SELECT id,name,phone,email,status,created_at,updated_at FROM customers WHERE id=?').bind(id).first();
}

async function orderRow(env, id) {
  const order = await env.DB.prepare('SELECT id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,referral_code,created_at,updated_at FROM orders WHERE id=?').bind(id).first();
  if (!order) return null;
  const { results } = await env.DB.prepare('SELECT id,product_id,variation_id,product_name_snapshot,sku_snapshot,variation_snapshot_json,customization_snapshot_json,addons_snapshot_json,unit_price_minor,quantity,line_total_minor,created_at FROM order_items WHERE order_id=? ORDER BY created_at ASC').bind(id).all();
  return { ...order, items: results || [] };
}

async function adminStatus(env) {
  const tables = ['customers','products','orders','payments','fulfillments','licenses','access_grants','referrals','documents','activity_events','error_events'];
  const counts = {};
  for (const table of tables) {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
    counts[table] = Number(row?.count || 0);
  }
  return { ok: true, service: 'reqoo-api', api_version: 'core-foundation-1', database: 'reqoo-rebuild', counts };
}

async function createOrder(env, input) {
  const orderInput = cleanOrder(input);
  if (orderInput.customer_id && !(await customerRow(env, orderInput.customer_id))) throw new Error('Customer not found');

  const normalized = [];
  let subtotal = 0;
  for (const raw of orderInput.items) {
    const productId = String(raw?.product_id || '');
    const quantity = Number(raw?.quantity ?? 1);
    if (!productId || !Number.isInteger(quantity) || quantity < 1) throw new Error('Invalid order item');
    const product = await env.DB.prepare('SELECT id,sku,name,product_type,fulfillment_type,base_price_minor,sale_price_minor,currency,status FROM products WHERE id=?').bind(productId).first();
    if (!product) throw new Error(`Product not found: ${productId}`);
    if (product.status !== 'active') throw new Error(`Product is not active: ${productId}`);
    const unit = Number(product.sale_price_minor ?? product.base_price_minor ?? 0);
    const line = unit * quantity;
    subtotal += line;
    normalized.push({
      id: crypto.randomUUID(), product_id: product.id, variation_id: raw?.variation_id || null,
      product_name_snapshot: product.name, sku_snapshot: product.sku || null,
      variation_snapshot_json: JSON.stringify(raw?.variation_snapshot || {}),
      customization_snapshot_json: JSON.stringify(raw?.customization || {}),
      addons_snapshot_json: JSON.stringify(Array.isArray(raw?.addons) ? raw.addons : []),
      unit_price_minor: unit, quantity, line_total_minor: line
    });
  }

  const orderId = crypto.randomUUID();
  const timestamp = now();
  const statements = [
    env.DB.prepare(`INSERT INTO orders (id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,referral_code,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(orderId, orderInput.customer_id, orderInput.source, orderInput.currency, subtotal, 0, 0, 0, subtotal, 'pending', 'pending', input?.referral_code || null, timestamp, timestamp)
  ];
  for (const item of normalized) {
    statements.push(env.DB.prepare(`INSERT INTO order_items (id,order_id,product_id,variation_id,product_name_snapshot,sku_snapshot,variation_snapshot_json,customization_snapshot_json,addons_snapshot_json,unit_price_minor,quantity,line_total_minor,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(item.id, orderId, item.product_id, item.variation_id, item.product_name_snapshot, item.sku_snapshot, item.variation_snapshot_json, item.customization_snapshot_json, item.addons_snapshot_json, item.unit_price_minor, item.quantity, item.line_total_minor, timestamp));
  }
  await env.DB.batch(statements);
  return orderRow(env, orderId);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
    const url = new URL(request.url);

    if (url.pathname === '/health') return json({ ok: true, service: 'reqoo-api', database: 'reqoo-rebuild', api_version: 'core-foundation-1' }, 200, origin);

    try {
      if (url.pathname === '/admin/status') {
        if (!admin(request, env)) return json({ error: 'Admin key required' }, 401, origin);
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);
        return json(await adminStatus(env), 200, origin);
      }

      if (url.pathname === '/customers') {
        if (!admin(request, env)) return json({ error: 'Admin key required' }, 401, origin);
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT id,name,phone,email,status,created_at,updated_at FROM customers WHERE status<>\'archived\' ORDER BY updated_at DESC LIMIT 200').all();
          return json(results || [], 200, origin);
        }
        if (request.method === 'POST') {
          const customer = cleanCustomer(await request.json());
          if (!['active','blocked','archived'].includes(customer.status)) return json({ error: 'Invalid customer status' }, 400, origin);
          const timestamp = now();
          await env.DB.prepare('INSERT INTO customers (id,name,phone,email,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(customer.id, customer.name, customer.phone, customer.email, customer.status, timestamp, timestamp).run();
          return json(await customerRow(env, customer.id), 201, origin);
        }
        return json({ error: 'Method not allowed' }, 405, origin);
      }

      if (url.pathname === '/orders') {
        if (request.method === 'GET') {
          if (!admin(request, env)) return json({ error: 'Admin key required' }, 401, origin);
          const { results } = await env.DB.prepare('SELECT id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,referral_code,created_at,updated_at FROM orders ORDER BY created_at DESC LIMIT 200').all();
          return json(results || [], 200, origin);
        }
        if (request.method === 'POST') {
          return json(await createOrder(env, await request.json()), 201, origin);
        }
        return json({ error: 'Method not allowed' }, 405, origin);
      }

      if (url.pathname.startsWith('/orders/')) {
        if (request.method !== 'GET' || !admin(request, env)) return json({ error: 'Admin key required' }, 401, origin);
        const id = decodeURIComponent(url.pathname.split('/')[2] || '');
        if (!id) return json({ error: 'Order id required' }, 400, origin);
        const order = await orderRow(env, id);
        return order ? json(order, 200, origin) : json({ error: 'Order not found' }, 404, origin);
      }

      if (url.pathname !== '/products' && !url.pathname.startsWith('/products/')) return json({ error: 'Not found' }, 404, origin);

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
        const timestamp = now();
        await env.DB.prepare(`INSERT INTO products (id,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,internal_notes,production_instructions,seo_title,seo_description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(productId,p.name,p.slug,p.product_type,p.fulfillment_type,p.description,p.short_description,p.base_price_minor,p.sale_price_minor,p.currency,p.status,p.internal_notes,p.production_instructions,p.seo_title,p.seo_description,timestamp,timestamp).run();
        await replaceImages(env, productId, p.images);
        return json(await productRow(env, productId), 201, origin);
      }

      if (!id) return json({ error: 'Product id required' }, 400, origin);
      if (request.method === 'DELETE') {
        await env.DB.prepare("UPDATE products SET status='archived', updated_at=? WHERE id=?").bind(now(), id).run();
        return json({ ok: true, id }, 200, origin);
      }
      if (request.method === 'PUT') {
        const p = cleanProduct(await request.json());
        const timestamp = now();
        await env.DB.prepare(`UPDATE products SET name=?,slug=?,product_type=?,fulfillment_type=?,description=?,short_description=?,base_price_minor=?,sale_price_minor=?,currency=?,status=?,internal_notes=?,production_instructions=?,seo_title=?,seo_description=?,updated_at=? WHERE id=?`)
          .bind(p.name,p.slug,p.product_type,p.fulfillment_type,p.description,p.short_description,p.base_price_minor,p.sale_price_minor,p.currency,p.status,p.internal_notes,p.production_instructions,p.seo_title,p.seo_description,timestamp,id).run();
        await replaceImages(env, id, p.images);
        return json(await productRow(env, id), 200, origin);
      }
      return json({ error: 'Method not allowed' }, 405, origin);
    } catch (error) {
      console.error(error);
      return json({ error: error?.message || 'Server error' }, 400, origin);
    }
  }
};
