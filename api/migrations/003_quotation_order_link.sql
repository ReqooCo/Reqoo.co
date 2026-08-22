-- Make quotation -> order conversion idempotent.
ALTER TABLE orders ADD COLUMN quotation_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_quotation_id ON orders(quotation_id) WHERE quotation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_converted_order ON quotations(converted_order_id);
