-- Account deletion request queue: allows verified users to initiate account deletion.
-- An authorized administrator must fulfil requests and apply disclosed data-retention rules.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_account_deletion_requests (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_review','completed')),
 completed_at TIMESTAMPTZ,
 UNIQUE(user_id)
);
COMMIT;
