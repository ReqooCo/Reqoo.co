-- Reqoo production schema baseline.
-- Safe to apply repeatedly; runtime CREATE/ALTER guards remain during rollout.

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

CREATE INDEX IF NOT EXISTS idx_custom_requests_created_at ON custom_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON custom_requests(status);
CREATE INDEX IF NOT EXISTS idx_order_audit_order_id_created_at ON order_audit_logs(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_share_token ON quotations(share_token);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id_created_at ON quotation_items(quotation_id, created_at);
