-- Reqoo production schema baseline.
-- Safe to apply repeatedly for a fresh database. Existing databases are repaired by 005_core_schema_repair.sql.

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  product_type TEXT NOT NULL DEFAULT 'physical',
  fulfillment_type TEXT NOT NULL DEFAULT 'physical_shipping',
  description TEXT,
  short_description TEXT,
  base_price_minor INTEGER NOT NULL DEFAULT 0,
  sale_price_minor INTEGER,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'draft',
  internal_notes TEXT,
  production_instructions TEXT,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_status_updated ON products(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON product_images(product_id, sort_order);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'shop',
  currency TEXT NOT NULL DEFAULT 'MYR',
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  shipping_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_fulfillment ON orders(payment_status, fulfillment_status);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT,
  variation_snapshot_json TEXT NOT NULL DEFAULT '{}',
  customization_snapshot_json TEXT NOT NULL DEFAULT '{}',
  addons_snapshot_json TEXT NOT NULL DEFAULT '[]',
  unit_price_minor INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total_minor INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_created ON order_items(order_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  method TEXT NOT NULL,
  amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_order_created ON payments(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON payments(provider, provider_reference);

CREATE TABLE IF NOT EXISTS custom_requests (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  request_type TEXT,
  material TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  needed_date TEXT,
  budget TEXT,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  file_key TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custom_requests_created_at ON custom_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON custom_requests(status);

CREATE TABLE IF NOT EXISTS order_audit_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_audit_order_id_created_at ON order_audit_logs(order_id, created_at);

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'MYR',
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  share_token TEXT NOT NULL UNIQUE,
  accepted_at TEXT,
  converted_order_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_share_token ON quotations(share_token);

CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT NOT NULL,
  material TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_minor INTEGER NOT NULL DEFAULT 0,
  line_total_minor INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id_created_at ON quotation_items(quotation_id, created_at);

-- PKSK operational tables used by the Admin control panel.
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  product_id TEXT,
  order_id TEXT,
  access_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  max_devices INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_licenses_order ON licenses(order_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

CREATE TABLE IF NOT EXISTS license_devices (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  first_seen_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_license_devices_license ON license_devices(license_id);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  event_type TEXT,
  actor TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON activity_events(created_at DESC);

CREATE TABLE IF NOT EXISTS error_events (
  id TEXT PRIMARY KEY,
  event_type TEXT,
  message TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_error_events_created ON error_events(created_at DESC);
