CREATE TABLE access_tokens (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 token_hash TEXT NOT NULL UNIQUE,
 prefix TEXT NOT NULL,
 scopes TEXT NOT NULL,
 qr_id TEXT REFERENCES qrs(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 last_used_at INTEGER,
 revoked_at INTEGER
);
CREATE INDEX idx_tokens_user ON access_tokens(user_id, created_at DESC);
CREATE TABLE api_rate_limits (
 token_id TEXT PRIMARY KEY REFERENCES access_tokens(id) ON DELETE CASCADE,
 window INTEGER NOT NULL,
 count INTEGER NOT NULL
);
CREATE TABLE api_audit_events (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_id TEXT REFERENCES access_tokens(id) ON DELETE SET NULL,
 method TEXT NOT NULL,
 path TEXT NOT NULL,
 status INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_user ON api_audit_events(user_id, created_at DESC);
CREATE TABLE api_idempotency (
 token_id TEXT NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
 key TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 response TEXT,
 status INTEGER,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(token_id, key)
);

CREATE INDEX idx_api_audit_retention ON api_audit_events(created_at);
CREATE INDEX idx_api_idempotency_retention ON api_idempotency(created_at);
