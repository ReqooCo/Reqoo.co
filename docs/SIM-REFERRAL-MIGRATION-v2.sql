-- REQOO SIM referral + duplicate-phone protection
-- This is the migration file used by the current SIM Admin build.
-- Apply to the D1 database bound to the SIM API as DB.

CREATE TABLE IF NOT EXISTS sim_customers (id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT, referral_code TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sim_customers_referral ON sim_customers(referral_code);
CREATE TABLE IF NOT EXISTS sim_referrals (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, customer_id TEXT, status TEXT NOT NULL DEFAULT 'active', commission INTEGER NOT NULL DEFAULT 5, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sim_referrals_customer ON sim_referrals(customer_id);
CREATE TABLE IF NOT EXISTS sim_referral_events (id TEXT PRIMARY KEY, referral_code TEXT NOT NULL, phone TEXT NOT NULL, order_id TEXT, amount INTEGER NOT NULL DEFAULT 0, commission INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sim_referral_events_code ON sim_referral_events(referral_code);
CREATE INDEX IF NOT EXISTS idx_sim_referral_events_phone ON sim_referral_events(phone);

CREATE TRIGGER IF NOT EXISTS trg_pksk_duplicate_phone_insert BEFORE INSERT ON orders WHEN NEW.phone IS NOT NULL AND trim(NEW.phone) <> '' BEGIN SELECT RAISE(ABORT, 'Nombor telefon ini telah berdaftar.') WHERE EXISTS (SELECT 1 FROM orders o WHERE replace(replace(replace(replace(trim(o.phone), '+', ''), ' ', ''), '-', ''), '(', '') = replace(replace(replace(replace(trim(NEW.phone), '+', ''), ' ', ''), '-', ''), '(', '')); END;
CREATE TRIGGER IF NOT EXISTS trg_pksk_duplicate_phone_update BEFORE UPDATE OF phone ON orders WHEN NEW.phone IS NOT NULL AND trim(NEW.phone) <> '' BEGIN SELECT RAISE(ABORT, 'Nombor telefon ini telah berdaftar.') WHERE EXISTS (SELECT 1 FROM orders o WHERE o.id <> NEW.id AND replace(replace(replace(replace(trim(o.phone), '+', ''), ' ', ''), '-', ''), '(', '') = replace(replace(replace(replace(trim(NEW.phone), '+', ''), ' ', ''), '-', ''), '(', '')); END;
