-- Required moderation controls for user-generated Akira voice/social rooms.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_user_reports (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 reporter_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 reported_user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 reason VARCHAR(30) NOT NULL CHECK(reason IN ('harassment','spam','fraud','inappropriate','other')),
 details VARCHAR(500) NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed','closed')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT akira_report_not_self CHECK(reporter_id<>reported_user_id)
);
CREATE INDEX IF NOT EXISTS akira_reports_pending_idx ON akira_user_reports(status,created_at DESC);
CREATE TABLE IF NOT EXISTS akira_user_blocks (
 blocker_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 blocked_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(blocker_id,blocked_id),
 CONSTRAINT akira_block_not_self CHECK(blocker_id<>blocked_id)
);
COMMIT;
