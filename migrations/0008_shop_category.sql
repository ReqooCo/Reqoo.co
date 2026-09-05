-- REQOO SHOP
-- Migration 0008: optional customer-facing product category.
-- Kept separate from product_type so Shop can show useful categories such as
-- Plaque, Brooch, Trophy or 3D Print without changing the core product type.

ALTER TABLE products ADD COLUMN category TEXT;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
