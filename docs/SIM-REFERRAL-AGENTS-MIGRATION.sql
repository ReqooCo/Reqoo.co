-- REQOO SIM referral agents v4
-- Run this on D1: reqoo-pksk-db
-- Keeps existing SIM customer/referral tables untouched.
-- Safe against the current sim_referral_events schema.

CREATE TABLE IF NOT EXISTS sim_referral_agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_normalized TEXT NOT NULL UNIQUE,
    bank_name TEXT,
    bank_account TEXT,
    referral_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    commission INTEGER NOT NULL DEFAULT 5,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sim_referral_agents_code
ON sim_referral_agents(referral_code);

CREATE INDEX IF NOT EXISTS idx_sim_referral_agents_status
ON sim_referral_agents(status);

CREATE INDEX IF NOT EXISTS idx_sim_referral_agents_phone
ON sim_referral_agents(phone_normalized);

CREATE TRIGGER IF NOT EXISTS trg_sim_referral_agent_phone_insert
BEFORE INSERT ON sim_referral_agents
WHEN NEW.phone_normalized IS NOT NULL AND trim(NEW.phone_normalized) <> ''
BEGIN
    SELECT RAISE(ABORT, 'Nombor telefon referral ini telah berdaftar.')
    WHERE EXISTS (
        SELECT 1 FROM sim_referral_agents a
        WHERE a.phone_normalized = NEW.phone_normalized
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_sim_referral_agent_phone_update
BEFORE UPDATE OF phone_normalized ON sim_referral_agents
WHEN NEW.phone_normalized IS NOT NULL AND trim(NEW.phone_normalized) <> ''
BEGIN
    SELECT RAISE(ABORT, 'Nombor telefon referral ini telah berdaftar.')
    WHERE EXISTS (
        SELECT 1 FROM sim_referral_agents a
        WHERE a.id <> NEW.id
          AND a.phone_normalized = NEW.phone_normalized
    );
END;
