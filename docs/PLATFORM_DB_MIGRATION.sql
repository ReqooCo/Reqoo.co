-- REQOO shared commerce/payment foundation.
-- Run only after confirming D1 migration tooling and existing schema.
-- Intentionally additive: does not alter legacy PKSK tables.

CREATE TABLE IF NOT EXISTS platform_orders (
  id TEXT PRIMARY KEY,
  order_ref TEXT NOT NULL UNIQUE,
  product_type TEXT NOT NULL,
  product_id TEXT,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'PENDING',
  referral_code TEXT,
  billplz_id TEXT,
  billplz_url TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_orders_status ON platform_orders(status);
CREATE INDEX IF NOT EXISTS idx_platform_orders_type ON platform_orders(product_type);
CREATE INDEX IF NOT EXISTS idx_platform_orders_billplz ON platform_orders(billplz_id);
CREATE INDEX IF NOT EXISTS idx_platform_orders_referral ON platform_orders(referral_code);
