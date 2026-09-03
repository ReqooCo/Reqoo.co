PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS reqoo_app_settings_v3 (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
