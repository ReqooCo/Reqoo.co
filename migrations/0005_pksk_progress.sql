PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pksk_progress (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  set_no INTEGER NOT NULL CHECK(set_no BETWEEN 1 AND 50),
  section TEXT NOT NULL DEFAULT 'OVERALL',
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
  score INTEGER NOT NULL DEFAULT 0,
  answered INTEGER NOT NULL DEFAULT 0,
  time_used INTEGER NOT NULL DEFAULT 0,
  score_a INTEGER NOT NULL DEFAULT 0,
  score_b INTEGER NOT NULL DEFAULT 0,
  score_c INTEGER NOT NULL DEFAULT 0,
  essay_words INTEGER NOT NULL DEFAULT 0,
  answers_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(license_id,set_no,section)
);
CREATE INDEX IF NOT EXISTS idx_pksk_progress_license ON pksk_progress(license_id);
CREATE INDEX IF NOT EXISTS idx_pksk_progress_set ON pksk_progress(set_no);
