const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://reqoo.co',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Vary': 'Origin'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cleanProduct(input) {
  const name = String(input?.name || '').trim();
  if (!name) throw new Error('Product name is required');
  const images = Array.isArray(input?.images) ? input.images.map(String).map(s => s.trim()).filter(Boolean) : [];
  return {
    name,
    slug: slugify(input?.slug || name),
    description: String(input?.description || '').trim(),
    price: Number(input?.price || 0),
    images: JSON.stringify(images),
    published: input?.published ? 1 : 0,
    sort: Number(input?.sort || 0)
  };
}

function output(row) {
  if (!row) return null;
  return { ...row, images: (() => { try { return JSON.parse(row.images || '[]'); } catch { return []; } })(), published: Boolean(row.published) };
}

function authorized(request, env) {
  const key = request.headers.get('X-Admin-Key');
  return Boolean(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'reqoo-catalog' });
    if (!url.pathname.startsWith('/products')) return json({ error: 'Not found' }, 404);

    try {
      if (request.method === 'GET') {
        const published = url.searchParams.get('published') === 'true';
        const query = published
          ? 'SELECT * FROM products WHERE published = 1 ORDER BY sort ASC, created_at DESC'
          : 'SELECT * FROM products ORDER BY sort ASC, created_at DESC';
        const { results } = await env.DB.prepare(query).all();
        return json(results.map(output));
      }

      if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);

      if (request.method === 'POST') {
        const p = cleanProduct(await request.json());
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO products (id,name,slug,description,price,images,published,sort,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`)
          .bind(id,p.name,p.slug,p.description,p.price,p.images,p.published,p.sort).run();
        return json(output(await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()), 201);
      }

      const id = decodeURIComponent(url.pathname.slice('/products/'.length));
      if (!id) return json({ error: 'Product id required' }, 400);

      if (request.method === 'PUT') {
        const p = cleanProduct(await request.json());
        await env.DB.prepare(`UPDATE products SET name=?,slug=?,description=?,price=?,images=?,published=?,sort=?,updated_at=datetime('now') WHERE id=?`)
          .bind(p.name,p.slug,p.description,p.price,p.images,p.published,p.sort,id).run();
        return json(output(await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()));
      }

      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
        return json({ ok: true, id });
      }
      return json({ error: 'Method not allowed' }, 405);
    } catch (error) {
      return json({ error: error?.message || 'Server error' }, 400);
    }
  }
};
