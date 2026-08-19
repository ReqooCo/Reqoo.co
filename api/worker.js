const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra }
});

const cors = {
  'Access-Control-Allow-Origin': 'https://admin.reqoo.co, https://shop.reqoo.co',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Vary': 'Origin'
};

function allowedOrigin(origin) {
  return origin === 'https://admin.reqoo.co' || origin === 'https://shop.reqoo.co';
}
function headers(origin) {
  return { ...cors, 'Access-Control-Allow-Origin': allowedOrigin(origin) ? origin : 'null' };
}
function admin(request, env) {
  const key = request.headers.get('X-Admin-Key');
  return Boolean(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
}
function rowToProduct(row) {
  return { ...row, price: Number(row.price), published: Boolean(row.published), images: JSON.parse(row.images_json || '[]') };
}
function clean(input) {
  const name = String(input?.name || '').trim();
  const slug = String(input?.slug || '').trim().toLowerCase();
  const description = String(input?.description || '').trim();
  const price = Number(input?.price || 0);
  const images = Array.isArray(input?.images) ? input.images.map(v => String(v).trim()).filter(Boolean).slice(0, 12) : [];
  const published = Boolean(input?.published);
  const sort = Number.isFinite(Number(input?.sort)) ? Number(input.sort) : 0;
  if (!name || !slug || !Number.isFinite(price) || price < 0) throw new Error('Invalid product');
  return { name, slug, description, price, images, published, sort };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const h = headers(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'reqoo-catalog' }, 200, h);
    if (url.pathname !== '/products' && !url.pathname.startsWith('/products/')) return json({ error: 'Not found' }, 404, h);

    try {
      if (request.method === 'GET') {
        const publishedOnly = url.searchParams.get('published') === 'true';
        if (!publishedOnly && !admin(request, env)) return json({ error: 'Admin key required' }, 401, h);
        const { results } = await env.DB.prepare(
          publishedOnly
            ? 'SELECT id,name,slug,description,price,images_json,published,sort,created_at,updated_at FROM products WHERE published=1 ORDER BY sort ASC, updated_at DESC'
            : 'SELECT id,name,slug,description,price,images_json,published,sort,created_at,updated_at FROM products ORDER BY sort ASC, updated_at DESC'
        ).all();
        return json(results.map(rowToProduct), 200, h);
      }

      if (!admin(request, env)) return json({ error: 'Admin key required' }, 401, h);
      const body = request.method === 'DELETE' ? null : await request.json();
      if (request.method === 'POST') {
        const p = clean(body); const id = crypto.randomUUID(); const now = new Date().toISOString();
        await env.DB.prepare('INSERT INTO products (id,name,slug,description,price,images_json,published,sort,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .bind(id,p.name,p.slug,p.description,p.price,JSON.stringify(p.images),p.published?1:0,p.sort,now,now).run();
        return json({ ok:true, product:{ id, ...p, created_at:now, updated_at:now } }, 201, h);
      }
      const id = decodeURIComponent(url.pathname.split('/')[2] || '');
      if (!id) return json({ error:'Product id required' }, 400, h);
      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
        return json({ ok:true }, 200, h);
      }
      if (request.method === 'PUT') {
        const p = clean(body); const now = new Date().toISOString();
        await env.DB.prepare('UPDATE products SET name=?,slug=?,description=?,price=?,images_json=?,published=?,sort=?,updated_at=? WHERE id=?')
          .bind(p.name,p.slug,p.description,p.price,JSON.stringify(p.images),p.published?1:0,p.sort,now,id).run();
        return json({ ok:true, product:{ id, ...p, updated_at:now } }, 200, h);
      }
      return json({ error:'Method not allowed' }, 405, h);
    } catch (error) {
      const message = error?.message || 'Server error';
      return json({ error: message }, message === 'Invalid product' ? 400 : 500, h);
    }
  }
};
