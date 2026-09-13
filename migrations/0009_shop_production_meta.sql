CREATE TABLE IF NOT EXISTS shop_production_meta (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','high','urgent')),
  assigned_to TEXT NOT NULL DEFAULT '',
  internal_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shop_production_due ON shop_production_meta(due_date);
CREATE INDEX IF NOT EXISTS idx_shop_production_priority ON shop_production_meta(priority);
