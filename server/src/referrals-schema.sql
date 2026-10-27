-- Verified invitation attribution (no currency rewards until policy approved).
CREATE TABLE IF NOT EXISTS akira_referrals (
  referee_id BIGINT PRIMARY KEY REFERENCES akira_users(id) ON DELETE CASCADE,
  inviter_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT akira_referrals_no_self_invite CHECK (inviter_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS akira_referrals_inviter_idx
  ON akira_referrals (inviter_id, created_at DESC);
