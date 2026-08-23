-- Repair fields used by the current production runtime.
-- Adds the shipping finalization flag and a bearer token for customer order access.

ALTER TABLE orders ADD COLUMN shipping_finalized INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN public_token TEXT;

-- Backfill existing orders so old idempotency keys still have a usable customer link.
UPDATE orders
SET public_token = lower(hex(randomblob(32)))
WHERE public_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_public_token
ON orders(public_token)
WHERE public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_public_token
ON orders(public_token);
