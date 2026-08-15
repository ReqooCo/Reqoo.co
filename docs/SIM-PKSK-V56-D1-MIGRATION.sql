-- REQOO PKSK V56 — D1 compatibility migration
-- Target database: reqoo-pksk-db
-- SAFE: no DROP TABLE and no deletion of existing customer/progress data.
-- Apply this file only after taking a D1 backup.

ALTER TABLE progress ADD COLUMN answered INTEGER DEFAULT 0;
ALTER TABLE progress ADD COLUMN time_used INTEGER DEFAULT 0;
ALTER TABLE progress ADD COLUMN score_a INTEGER DEFAULT 0;
ALTER TABLE progress ADD COLUMN score_b INTEGER DEFAULT 0;
ALTER TABLE progress ADD COLUMN score_c INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS pksk_question_keys (
  set_no INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  section TEXT NOT NULL,
  category TEXT,
  answer INTEGER,
  weights_json TEXT,
  PRIMARY KEY (set_no, question_id)
);

CREATE INDEX IF NOT EXISTS idx_pksk_question_keys_set
ON pksk_question_keys(set_no);

UPDATE licenses SET max_devices = 3
WHERE max_devices IS NULL OR max_devices < 3;

-- QUESTION KEY DATA IS INTENTIONALLY NOT INCLUDED IN THIS INITIAL REPO COMMIT.
-- It must be generated from the audited question bank and imported as a separate
-- server-only data load so answer/weights are never exposed to the public client.
