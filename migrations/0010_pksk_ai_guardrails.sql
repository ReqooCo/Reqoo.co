-- PKSK AI guardrails: shared question cache, per-license writing cache/usage,
-- and global minute windows to protect the OpenAI API from traffic bursts.
CREATE TABLE IF NOT EXISTS pksk_ai_cache (
  cache_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  license_id TEXT,
  state TEXT NOT NULL DEFAULT 'pending',
  review_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pksk_ai_cache_kind_state
  ON pksk_ai_cache(kind, state, updated_at);

CREATE INDEX IF NOT EXISTS idx_pksk_ai_cache_license_kind
  ON pksk_ai_cache(license_id, kind, created_at);

CREATE TABLE IF NOT EXISTS pksk_ai_usage (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  cache_key TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pksk_ai_usage_license_kind
  ON pksk_ai_usage(license_id, kind, created_at);

CREATE TABLE IF NOT EXISTS pksk_ai_rate_windows (
  window_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
