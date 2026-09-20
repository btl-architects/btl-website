CREATE TABLE IF NOT EXISTS enquiry_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS enquiry_limits_expiry ON enquiry_limits(expires);
CREATE TABLE IF NOT EXISTS enquiry_receipts (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent')),
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS enquiry_receipts_expiry ON enquiry_receipts(expires);
