-- REQOO Documents V2
-- Persisted business documents with sequential numbering and secure public share tokens.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS reqoo_document_sequences (
  seq_key TEXT PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reqoo_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('quotation','invoice','receipt','delivery_order')),
  number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  shipping_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  issued_at TEXT NOT NULL,
  due_at TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  company_json TEXT NOT NULL DEFAULT '{}',
  payment_status TEXT,
  share_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(order_id, type)
);
CREATE INDEX IF NOT EXISTS idx_reqoo_documents_order ON reqoo_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_reqoo_documents_type_time ON reqoo_documents(type, created_at);

CREATE TABLE IF NOT EXISTS reqoo_document_items (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES reqoo_documents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  variation TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_minor INTEGER NOT NULL DEFAULT 0,
  line_total_minor INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reqoo_document_items_doc ON reqoo_document_items(document_id);
