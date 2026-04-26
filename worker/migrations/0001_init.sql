-- MVP schema. See docs/PRD.md §6.4 and docs/MVP.md §4.

CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  google_sub  TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  name        TEXT,
  picture     TEXT,
  is_seed     INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE qrs (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  target_type     TEXT NOT NULL,
  target_payload  TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_qrs_user ON qrs(user_id);
CREATE INDEX idx_qrs_updated ON qrs(user_id, updated_at DESC);

CREATE TABLE scan_counters (
  qr_id        TEXT PRIMARY KEY REFERENCES qrs(id) ON DELETE CASCADE,
  total        INTEGER NOT NULL DEFAULT 0,
  last_scan_at INTEGER
);
