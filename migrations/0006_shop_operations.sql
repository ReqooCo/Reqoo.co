PRAGMA foreign_keys = ON;

-- Shop operational tables aligned with the canonical V1 schema.
CREATE TABLE IF NOT EXISTS shipping_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_minor INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_active_order ON shipping_methods(active,sort_order,name);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'fixed' CHECK(type IN ('fixed','percent')),
  value REAL NOT NULL DEFAULT 0,
  min_spend_minor INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  title TEXT DEFAULT '',
  product_id TEXT REFERENCES products(id),
  variant TEXT,
  promo_price_minor INTEGER NOT NULL DEFAULT 0,
  slug TEXT
);
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON promotions(active,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_product_variant ON promotions(product_id,variant);

ALTER TABLE orders ADD COLUMN order_no TEXT;
UPDATE orders SET order_no='LEGACY-'||substr(id,-12) WHERE order_no IS NULL OR order_no='';
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
