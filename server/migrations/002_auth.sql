-- Akira email/password accounts and opaque sessions. Run once on akira_db.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_credentials (
 user_id BIGINT PRIMARY KEY REFERENCES akira_users(id) ON DELETE CASCADE,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT akira_credentials_email_lower CHECK (email = lower(email))
);
CREATE TABLE IF NOT EXISTS akira_sessions (
 token_hash CHAR(64) PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS akira_sessions_user_idx ON akira_sessions(user_id);
COMMIT;
