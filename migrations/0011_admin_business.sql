CREATE TABLE IF NOT EXISTS reqoo_staff (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('sales','production')), password_hash TEXT NOT NULL,
 salt TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reqoo_staff_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reqoo_admin_activity (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, role TEXT NOT NULL,
 action TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', detail_json TEXT NOT NULL DEFAULT '{}',
 outcome TEXT NOT NULL DEFAULT 'started', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_activity_time ON reqoo_admin_activity(created_at,id);
CREATE TABLE IF NOT EXISTS reqoo_workspace_archives (
 order_id TEXT PRIMARY KEY, reference TEXT NOT NULL, reason TEXT NOT NULL,
 actor_name TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reqoo_order_costs (
 order_id TEXT PRIMARY KEY REFERENCES orders(id), materials_minor INTEGER NOT NULL DEFAULT 0,
 labour_minor INTEGER NOT NULL DEFAULT 0, shipping_minor INTEGER NOT NULL DEFAULT 0,
 other_minor INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL
);

-- Same canonical ledger definition used by shop-admin-flow-v18. This only
-- initialises new installations; existing ledger rows and schema are untouched.
CREATE TABLE IF NOT EXISTS reqoo_payments (
 id TEXT PRIMARY KEY,order_id TEXT NOT NULL,invoice_document_id TEXT,
 receipt_number TEXT NOT NULL UNIQUE,amount_minor INTEGER NOT NULL,
 payment_type TEXT NOT NULL CHECK(payment_type IN ('deposit','partial','final','full')),
 method TEXT NOT NULL,reference TEXT,note TEXT,paid_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'confirmed',share_token TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reqoo_payments_order ON reqoo_payments(order_id,paid_at);
CREATE INDEX IF NOT EXISTS idx_reqoo_payments_invoice ON reqoo_payments(invoice_document_id,paid_at);
