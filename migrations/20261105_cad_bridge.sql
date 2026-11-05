CREATE TABLE IF NOT EXISTS cad_bridge_sessions (
 id TEXT PRIMARY KEY, producer_hash TEXT NOT NULL UNIQUE, consumer_hash TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL,
 revision TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS cad_bridge_expiry ON cad_bridge_sessions(expires_at);
CREATE TABLE IF NOT EXISTS cad_bridge_commands (
 session_id TEXT NOT NULL REFERENCES cad_bridge_sessions(id) ON DELETE CASCADE,
 id TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
 result TEXT, created_at INTEGER NOT NULL, finished_at INTEGER,
 PRIMARY KEY (session_id,id)
);
CREATE INDEX IF NOT EXISTS cad_bridge_queue ON cad_bridge_commands(session_id,status,created_at);
CREATE TABLE IF NOT EXISTS cad_bridge_rate (bucket TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at INTEGER NOT NULL);
