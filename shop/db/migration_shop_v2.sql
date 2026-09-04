-- REQOO SHOP v2 migration
-- Run ONLY against reqoo-shop-db, after migration_billplz.sql.
PRAGMA foreign_keys = ON;

ALTER TABLE promotions ADD COLUMN slug TEXT;
ALTER TABLE promotions ADD COLUMN title TEXT;
ALTER TABLE promotions ADD COLUMN product_id TEXT;
ALTER TABLE promotions ADD COLUMN variant TEXT;
ALTER TABLE promotions ADD COLUMN promo_price REAL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug);
CREATE INDEX IF NOT EXISTS idx_promotions_product ON promotions(product_id,variant);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
