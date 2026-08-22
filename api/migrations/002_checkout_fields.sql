-- Checkout fields required by the shop order flow.
-- Apply this migration to the reqoo-rebuild D1 database before removing runtime ALTER guards.

ALTER TABLE orders ADD COLUMN shipping_address TEXT;
ALTER TABLE orders ADD COLUMN order_note TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_fulfillment ON orders(payment_status, fulfillment_status);
