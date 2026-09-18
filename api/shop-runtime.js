import { handle as handleShop } from './shop.js';

async function ensureShopSchema(env) {
  if (!env.DB) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS shipping_methods(id TEXT PRIMARY KEY,name TEXT NOT NULL,price_minor INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS promotions(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,type TEXT NOT NULL DEFAULT 'fixed',value INTEGER NOT NULL DEFAULT 0,min_spend INTEGER NOT NULL DEFAULT 0,starts_at TEXT,ends_at TEXT,usage_limit INTEGER,usage_count INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,title TEXT,product_id TEXT,variant TEXT,promo_price_minor INTEGER,slug TEXT)`).run();
  const cols = await env.DB.prepare(`PRAGMA table_info(orders)`).all();
  if (!(cols.results || []).some(x => x.name === 'order_no')) {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN order_no TEXT`).run();
  }

  const now = new Date().toISOString();

  // Keep storefront shipping options consistent across Plaque/Tumbler/Shop.
  await env.DB.prepare(
    `UPDATE shipping_methods
     SET name='Semenanjung Malaysia', price_minor=800, active=1, sort_order=10, updated_at=?
     WHERE lower(name) LIKE 'semenanjung%'`
  ).bind(now).run();

  const peninsular = await env.DB.prepare(
    `SELECT id FROM shipping_methods WHERE lower(name) LIKE 'semenanjung%' LIMIT 1`
  ).first();
  if (!peninsular) {
    await env.DB.prepare(
      `INSERT INTO shipping_methods(id,name,price_minor,active,sort_order,created_at,updated_at)
       VALUES('ship_semenanjung','Semenanjung Malaysia',800,1,10,?,?)`
    ).bind(now, now).run();
  }

  await env.DB.prepare(
    `UPDATE shipping_methods
     SET name='Sabah & Sarawak', price_minor=1200, active=1, sort_order=20, updated_at=?
     WHERE lower(name) LIKE '%sabah%' OR lower(name) LIKE '%sarawak%'`
  ).bind(now).run();

  const eastMalaysia = await env.DB.prepare(
    `SELECT id FROM shipping_methods
     WHERE lower(name) LIKE '%sabah%' OR lower(name) LIKE '%sarawak%'
     LIMIT 1`
  ).first();
  if (!eastMalaysia) {
    await env.DB.prepare(
      `INSERT INTO shipping_methods(id,name,price_minor,active,sort_order,created_at,updated_at)
       VALUES('ship_sabah_sarawak','Sabah & Sarawak',1200,1,20,?,?)`
    ).bind(now, now).run();
  }
}

export async function handle(request, env) {
  await ensureShopSchema(env);
  return handleShop(request, env);
}
