PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS access_grants (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  order_id TEXT REFERENCES orders(id),
  access_type TEXT NOT NULL CHECK(access_type IN ('sim','play','digital')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','revoked','expired')),
  access_payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(order_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_access_grants_customer ON access_grants(customer_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_product ON access_grants(product_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_order ON access_grants(order_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_status ON access_grants(status);
