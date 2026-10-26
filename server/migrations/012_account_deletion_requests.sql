-- User account deletion requests (reviewed and processed by authorized staff).
BEGIN;
CREATE TABLE IF NOT EXISTS akira_account_deletion_requests (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 reason TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
 reviewed_at TIMESTAMPTZ,
 UNIQUE(user_id)
);
COMMIT;
