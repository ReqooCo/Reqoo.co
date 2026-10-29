-- Private Admin estimates, separate from customer-facing document data.
-- Additive only. Keep this table and its records during application rollback.
CREATE TABLE IF NOT EXISTS reqoo_quotation_costs (
 document_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision >= 0),
 cost_json TEXT NOT NULL CHECK(json_valid(cost_json)),
 PRIMARY KEY(document_id, revision)
);
CREATE TRIGGER IF NOT EXISTS reqoo_quotation_costs_immutable_update
BEFORE UPDATE ON reqoo_quotation_costs BEGIN SELECT RAISE(ABORT,'Quotation costs are immutable'); END;
CREATE TRIGGER IF NOT EXISTS reqoo_quotation_costs_immutable_delete
BEFORE DELETE ON reqoo_quotation_costs BEGIN SELECT RAISE(ABORT,'Quotation costs are immutable'); END;

-- Reusable source prices; quotation revisions keep independent cost snapshots.
CREATE TABLE IF NOT EXISTS reqoo_cost_materials (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL COLLATE NOCASE UNIQUE,
 preset_json TEXT NOT NULL CHECK(json_valid(preset_json)),
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL
);
