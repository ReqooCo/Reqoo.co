-- REQOO REBUILD V1 / CORE
-- Migration 0001: foundational schema.
-- All IDs are application-generated opaque strings. Timestamps are ISO-8601 UTC.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  product_type TEXT NOT NULL CHECK(product_type IN ('physical','digital','licensed','play_access','service')),
  fulfillment_type TEXT NOT NULL CHECK(fulfillment_type IN ('physical_shipping','digital_delivery','licensed_access','play_access','service_custom')),
  description TEXT,
  short_description TEXT,
  base_price_minor INTEGER NOT NULL DEFAULT 0,
  sale_price_minor INTEGER,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','hidden','out_of_stock','archived')),
  internal_notes TEXT,
  production_instructions TEXT,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0 CHECK(is_cover IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_variations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  attributes_json TEXT NOT NULL DEFAULT '{}',
  price_minor INTEGER,
  sale_price_minor INTEGER,
  stock_qty INTEGER,
  stock_tracking INTEGER NOT NULL DEFAULT 0 CHECK(stock_tracking IN (0,1)),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden','out_of_stock')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_variations_product ON product_variations(product_id);

CREATE TABLE IF NOT EXISTS product_custom_fields (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK(field_type IN ('text','textarea','number','date','time','dropdown','radio','checkbox','color','image','file')),
  required INTEGER NOT NULL DEFAULT 0 CHECK(required IN (0,1)),
  options_json TEXT NOT NULL DEFAULT '[]',
  conditional_json TEXT,
  price_adjustment_minor INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, field_key)
);

CREATE TABLE IF NOT EXISTS product_addons (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_adjustment_minor INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 0 CHECK(required IN (0,1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  source TEXT NOT NULL DEFAULT 'shop',
  currency TEXT NOT NULL DEFAULT 'MYR',
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  shipping_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','partial','paid','failed','cancelled','refunded')),
  fulfillment_status TEXT NOT NULL DEFAULT 'pending' CHECK(fulfillment_status IN ('pending','processing','fulfilled','cancelled')),
  referral_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  variation_id TEXT REFERENCES product_variations(id),
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT,
  variation_snapshot_json TEXT NOT NULL DEFAULT '{}',
  customization_snapshot_json TEXT NOT NULL DEFAULT '{}',
  addons_snapshot_json TEXT NOT NULL DEFAULT '[]',
  unit_price_minor INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  line_total_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL,
  provider_reference TEXT,
  method TEXT,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','paid','failed','cancelled','refunded')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON payments(provider, provider_reference);

CREATE TABLE IF NOT EXISTS fulfillments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  order_item_id TEXT REFERENCES order_items(id),
  type TEXT NOT NULL CHECK(type IN ('physical_shipping','digital_delivery','licensed_access','play_access','service_custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','fulfilled','cancelled')),
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('quotation','invoice','receipt','credit_note')),
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  status TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  issued_at TEXT,
  due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_order ON documents(order_id);
CREATE INDEX IF NOT EXISTS idx_documents_type_status ON documents(type,status);

CREATE TABLE IF NOT EXISTS document_items (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_minor INTEGER NOT NULL DEFAULT 0,
  line_total_minor INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  amount_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_document ON payment_allocations(document_id);

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  order_id TEXT REFERENCES orders(id),
  access_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','revoked','expired')),
  max_devices INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_licenses_customer ON licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_product ON licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_order ON licenses(order_id);

CREATE TABLE IF NOT EXISTS license_devices (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  device_key_hash TEXT NOT NULL,
  device_label TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  UNIQUE(license_id, device_key_hash)
);
CREATE INDEX IF NOT EXISTS idx_license_devices_license ON license_devices(license_id);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  commission_type TEXT NOT NULL DEFAULT 'fixed' CHECK(commission_type IN ('fixed','percent')),
  default_commission_value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_attributions (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals(id),
  customer_id TEXT REFERENCES customers(id),
  order_id TEXT UNIQUE REFERENCES orders(id),
  code_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_commissions (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','payable','paid','reversed')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referral ON referral_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  product_id TEXT REFERENCES products(id),
  order_id TEXT REFERENCES orders(id),
  license_id TEXT REFERENCES licenses(id),
  event_type TEXT NOT NULL,
  trace_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_customer_time ON activity_events(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_trace ON activity_events(trace_id);

CREATE TABLE IF NOT EXISTS error_events (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  trace_id TEXT,
  endpoint TEXT,
  error_code TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_errors_trace ON error_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_errors_created ON error_events(created_at);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  reason TEXT,
  before_json TEXT,
  after_json TEXT,
  trace_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_events(created_at);

CREATE TABLE IF NOT EXISTS pricing_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL,
  unit_cost_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MYR',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pricing_machines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  machine_type TEXT NOT NULL CHECK(machine_type IN ('laser','3d_print','other')),
  machine_rate_minor_per_hour INTEGER NOT NULL DEFAULT 0,
  electricity_rate_minor_per_hour INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  engine_type TEXT NOT NULL CHECK(engine_type IN ('laser','3d_print')),
  version INTEGER NOT NULL,
  rules_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','retired')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(engine_type, version)
);

CREATE TABLE IF NOT EXISTS pricing_calculations (
  id TEXT PRIMARY KEY,
  engine_type TEXT NOT NULL CHECK(engine_type IN ('laser','3d_print')),
  customer_id TEXT REFERENCES customers(id),
  rule_id TEXT REFERENCES pricing_rules(id),
  input_json TEXT NOT NULL,
  cost_minor INTEGER NOT NULL DEFAULT 0,
  minimum_price_minor INTEGER NOT NULL DEFAULT 0,
  recommended_price_minor INTEGER NOT NULL DEFAULT 0,
  target_price_minor INTEGER NOT NULL DEFAULT 0,
  final_price_minor INTEGER,
  currency TEXT NOT NULL DEFAULT 'MYR',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
