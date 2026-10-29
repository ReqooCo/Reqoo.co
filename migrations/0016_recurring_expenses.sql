-- Templates are planning data. Recording a month explicitly creates an immutable
-- expense entry; changing or pausing a template never rewrites that history.
CREATE TABLE IF NOT EXISTS reqoo_recurring_expenses (
 id TEXT PRIMARY KEY,
 description TEXT NOT NULL,
 category TEXT NOT NULL,
 amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
 day_of_month INTEGER NOT NULL CHECK(day_of_month BETWEEN 1 AND 31),
 start_month TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL,
 updated_by TEXT NOT NULL
);
