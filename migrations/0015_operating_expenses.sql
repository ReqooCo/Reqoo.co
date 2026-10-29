-- Additive operating expense ledger. Retain records on rollback; corrections void
-- an entry with a reason, rather than deleting or rewriting its amount.
CREATE TABLE IF NOT EXISTS reqoo_operating_expenses (
 id TEXT PRIMARY KEY,
 expense_date TEXT NOT NULL,
 category TEXT NOT NULL,
 description TEXT NOT NULL,
 amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
 status TEXT NOT NULL DEFAULT 'recorded' CHECK(status IN ('recorded','void')),
 recorded_at TEXT NOT NULL,
 recorded_by TEXT NOT NULL,
 voided_at TEXT,
 voided_by TEXT,
 void_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_reqoo_expenses_month ON reqoo_operating_expenses(expense_date,status);
CREATE TRIGGER IF NOT EXISTS reqoo_expenses_no_delete BEFORE DELETE ON reqoo_operating_expenses
BEGIN SELECT RAISE(ABORT,'Expense records must be retained'); END;
CREATE TRIGGER IF NOT EXISTS reqoo_expenses_no_rewrite BEFORE UPDATE OF id,expense_date,category,description,amount_minor,recorded_at,recorded_by ON reqoo_operating_expenses
BEGIN SELECT RAISE(ABORT,'Void and replace an incorrect expense'); END;
CREATE TRIGGER IF NOT EXISTS reqoo_expenses_no_restore BEFORE UPDATE ON reqoo_operating_expenses WHEN OLD.status='void'
BEGIN SELECT RAISE(ABORT,'Voided expenses are immutable'); END;
