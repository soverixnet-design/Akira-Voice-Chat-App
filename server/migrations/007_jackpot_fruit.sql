-- Jackpot Fruit uses the same akira_wallets and akira_wallet_transactions ledger as Food Wheel.
-- Game-specific rounds and bets are isolated from Food Wheel.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_jackpot_rounds (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  betting_ends_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  result_item VARCHAR(20),
  bonus VARCHAR(8),
  jackpot_pool_before BIGINT NOT NULL DEFAULT 0 CHECK (jackpot_pool_before >= 0),
  jackpot_pool_after BIGINT CHECK (jackpot_pool_after >= 0),
  CONSTRAINT akira_jackpot_result_valid CHECK (result_item IS NULL OR result_item IN ('lemon','grape','kiwi','cherry','peach','watermelon','banana','strawberry')),
  CONSTRAINT akira_jackpot_bonus_valid CHECK (bonus IS NULL OR bonus IN ('none','+1','+2','x2','x3','JP'))
);
CREATE TABLE IF NOT EXISTS akira_jackpot_bets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id BIGINT NOT NULL REFERENCES akira_jackpot_rounds(id),
  user_id BIGINT NOT NULL REFERENCES akira_users(id),
  item_id VARCHAR(20) NOT NULL CHECK (item_id IN ('lemon','grape','kiwi','cherry','peach','watermelon','banana','strawberry')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  request_id UUID NOT NULL,
  payout BIGINT NOT NULL DEFAULT 0 CHECK (payout >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id,request_id)
);
CREATE INDEX IF NOT EXISTS akira_jackpot_bets_round_idx ON akira_jackpot_bets(round_id,user_id);
COMMIT;
