-- Repair fields used by the current production runtime.
-- This migration is intentionally small and only adds fields that were previously
-- protected by runtime ALTER guards or required for secure public order access.

ALTER TABLE orders ADD COLUMN shipping_finalized INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN public_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_public_token
ON orders(public_token)
WHERE public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_public_token
ON orders(public_token);
