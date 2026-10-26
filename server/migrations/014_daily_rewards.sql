-- Real Akira Daily Check-in rewards. UTC calendar day; one wallet credit per user/day.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_daily_reward_claims (
  user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
  reward_date DATE NOT NULL,
  streak INTEGER NOT NULL CHECK(streak BETWEEN 1 AND 7),
  amount BIGINT NOT NULL CHECK(amount>0),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,reward_date)
);
CREATE INDEX IF NOT EXISTS akira_daily_reward_claims_recent ON akira_daily_reward_claims(user_id,reward_date DESC);
COMMIT;
