PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS fulfillments_v1 (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  order_item_id TEXT REFERENCES order_items(id),
  type TEXT NOT NULL CHECK(type IN ('physical_shipping','digital_delivery','licensed_access','play_access','service_custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','fulfilled','cancelled','failed')),
  provider TEXT,
  tracking_code TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fulfillments_v1_order ON fulfillments_v1(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_v1_status ON fulfillments_v1(status);
