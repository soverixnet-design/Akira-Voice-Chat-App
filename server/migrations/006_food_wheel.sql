-- Server-authoritative Food Wheel round and wager storage.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_food_rounds (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 betting_ends_at TIMESTAMPTZ NOT NULL,
 settled_at TIMESTAMPTZ,
 result_id VARCHAR(20),
 CONSTRAINT akira_food_result_valid CHECK (result_id IS NULL OR result_id IN ('shrimp','fish','chicken','steak','cabbage','carrot','corn','tomato','salad','pizza'))
);
CREATE TABLE IF NOT EXISTS akira_food_bets (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 round_id BIGINT NOT NULL REFERENCES akira_food_rounds(id),
 user_id BIGINT NOT NULL REFERENCES akira_users(id),
 item_id VARCHAR(20) NOT NULL CHECK(item_id IN ('shrimp','fish','chicken','steak','cabbage','carrot','corn','tomato')),
 amount BIGINT NOT NULL CHECK(amount > 0),
 request_id UUID NOT NULL,
 payout BIGINT NOT NULL DEFAULT 0 CHECK(payout >= 0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS akira_food_bets_round_idx ON akira_food_bets(round_id,user_id);
COMMIT;
