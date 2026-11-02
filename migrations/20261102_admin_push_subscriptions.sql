-- Apply only after backup and review. No existing tables are modified.
CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
 id TEXT PRIMARY KEY,
 endpoint TEXT NOT NULL UNIQUE,
 p256dh TEXT NOT NULL,
 auth_secret TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 last_success_at TEXT,
 disabled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_push_active ON admin_push_subscriptions(disabled_at);
