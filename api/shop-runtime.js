import { handle as handleShop } from './shop.js';

async function ensureShopSchema(env) {
  if (!env.DB) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS shipping_methods(id TEXT PRIMARY KEY,name TEXT NOT NULL,price_minor INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS promotions(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,type TEXT NOT NULL DEFAULT 'fixed',value INTEGER NOT NULL DEFAULT 0,min_spend INTEGER NOT NULL DEFAULT 0,starts_at TEXT,ends_at TEXT,usage_limit INTEGER,usage_count INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,title TEXT,product_id TEXT,variant TEXT,promo_price_minor INTEGER,slug TEXT)`).run();
  const cols = await env.DB.prepare(`PRAGMA table_info(orders)`).all();
  if (!(cols.results || []).some(x => x.name === 'order_no')) {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN order_no TEXT`).run();
  }
}

export async function handle(request, env) {
  await ensureShopSchema(env);
  return handleShop(request, env);
}
