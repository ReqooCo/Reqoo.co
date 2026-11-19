-- KaloriKu Family D1 schema; all health records scoped to authenticated user_id
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS login_codes (email TEXT PRIMARY KEY,code_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id),name TEXT,height_cm REAL,weight_kg REAL,goal_kg REAL,calorie_target INTEGER,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS logs (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),entry_date TEXT NOT NULL,entry_type TEXT NOT NULL,title TEXT NOT NULL,calories INTEGER NOT NULL,protein_g REAL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS logs_user_date ON logs(user_id,entry_date);
CREATE TABLE IF NOT EXISTS weight_logs (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),weight_kg REAL NOT NULL,recorded_at TEXT DEFAULT CURRENT_TIMESTAMP);
