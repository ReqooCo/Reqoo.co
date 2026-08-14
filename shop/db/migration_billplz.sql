-- REQOO SHOP Billplz migration
-- Run ONLY against reqoo-shop-db.
PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN customer_address TEXT;
ALTER TABLE orders ADD COLUMN billplz_url TEXT;
ALTER TABLE orders ADD COLUMN billplz_state TEXT;
ALTER TABLE orders ADD COLUMN billplz_transaction_id TEXT;
ALTER TABLE orders ADD COLUMN billplz_transaction_status TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_billplz ON orders(billplz_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_ref ON orders(order_ref);
