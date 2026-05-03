-- Per-QR content expiry countdown + in-app notifications.
-- See docs/EXPIRY_REMINDER.md.

ALTER TABLE qrs ADD COLUMN expiry_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE qrs ADD COLUMN expiry_window_seconds INTEGER;
ALTER TABLE qrs ADD COLUMN expiry_anchor_at INTEGER;       -- unix ms; reset on every target swap
ALTER TABLE qrs ADD COLUMN expiry_lead_times TEXT;         -- JSON array of seconds-before-expiry to fire, e.g. [86400, 259200]
ALTER TABLE qrs ADD COLUMN expiry_action TEXT NOT NULL DEFAULT 'keep';   -- keep | pause

CREATE INDEX idx_qrs_expiry_active
  ON qrs(expiry_enabled, status)
  WHERE expiry_enabled = 1;

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_id       TEXT REFERENCES qrs(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                -- expiry_lead | expiry_expired
  kind        TEXT,                         -- e.g. lead_24h, lead_3d, lead_7d, expired (used for dedup)
  anchor_at   INTEGER,                      -- expiry_anchor_at at the time the reminder was scheduled (dedup key)
  title       TEXT NOT NULL,
  body        TEXT,
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_notif_dedup
  ON notifications(qr_id, anchor_at, kind)
  WHERE qr_id IS NOT NULL AND anchor_at IS NOT NULL AND kind IS NOT NULL;
