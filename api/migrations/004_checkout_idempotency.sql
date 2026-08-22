-- Prevent duplicate checkout orders when the browser retries after a timeout.
-- Apply this migration to the reqoo-rebuild D1 database before enabling the key in checkout.

ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idempotency_key
ON orders(idempotency_key)
WHERE idempotency_key IS NOT NULL;
