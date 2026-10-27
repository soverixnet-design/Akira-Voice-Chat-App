-- Akira 7-day login rewards. Apply after a database backup, before enabling
-- GET/POST /api/v1/rewards/daily. This migration is idempotent.
CREATE TABLE IF NOT EXISTS akira_daily_reward_claims (
  user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
  reward_date DATE NOT NULL,
  streak SMALLINT NOT NULL CHECK (streak BETWEEN 1 AND 7),
  amount BIGINT NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, reward_date)
);

CREATE INDEX IF NOT EXISTS akira_daily_reward_claims_recent_idx
  ON akira_daily_reward_claims (user_id, reward_date DESC);
