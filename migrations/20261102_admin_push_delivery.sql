CREATE TABLE IF NOT EXISTS admin_push_events (
 id TEXT PRIMARY KEY, payload TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS admin_push_deliveries (
 event_id TEXT NOT NULL, subscription_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL DEFAULT 0, last_status INTEGER,
 PRIMARY KEY(event_id,subscription_id)
);
CREATE INDEX IF NOT EXISTS idx_admin_push_pending ON admin_push_deliveries(status,next_attempt_at);
