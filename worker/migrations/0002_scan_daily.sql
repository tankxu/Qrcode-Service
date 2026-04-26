CREATE TABLE scan_daily (
  qr_id  TEXT NOT NULL REFERENCES qrs(id) ON DELETE CASCADE,
  day    TEXT NOT NULL,           -- ISO date (YYYY-MM-DD, UTC)
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (qr_id, day)
);
CREATE INDEX idx_scan_daily_day ON scan_daily(day);
