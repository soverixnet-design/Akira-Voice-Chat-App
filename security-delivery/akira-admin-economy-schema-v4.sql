BEGIN;
CREATE TABLE IF NOT EXISTS akira_admin_promos(
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 code TEXT NOT NULL UNIQUE CHECK(code ~ '^[A-Z0-9-]{8,24}$'),
 coins BIGINT NOT NULL CHECK(coins BETWEEN 1 AND 10000),
 max_uses INTEGER NOT NULL CHECK(max_uses BETWEEN 1 AND 500),
 redeemed_count INTEGER NOT NULL DEFAULT 0 CHECK(redeemed_count>=0 AND redeemed_count<=max_uses),
 enabled BOOLEAN NOT NULL DEFAULT false,
 expires_at TIMESTAMPTZ,
 created_by BIGINT REFERENCES akira_users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS akira_promo_redemptions(
 promo_id BIGINT NOT NULL REFERENCES akira_admin_promos(id),
 user_id BIGINT NOT NULL REFERENCES akira_users(id),
 coins BIGINT NOT NULL CHECK(coins>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(promo_id,user_id)
);
CREATE INDEX IF NOT EXISTS akira_promo_redemptions_user ON akira_promo_redemptions(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS akira_admin_tasks(
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 action TEXT NOT NULL CHECK(action IN ('daily_checkin','send_paid_gift')),
 title TEXT NOT NULL,
 coins BIGINT NOT NULL CHECK(coins BETWEEN 1 AND 10000),
 enabled BOOLEAN NOT NULL DEFAULT false,
 created_by BIGINT REFERENCES akira_users(id),
 request_key TEXT NOT NULL UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS akira_task_claims(
 task_id BIGINT NOT NULL REFERENCES akira_admin_tasks(id),
 user_id BIGINT NOT NULL REFERENCES akira_users(id),
 claim_day DATE NOT NULL,
 coins BIGINT NOT NULL CHECK(coins>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(task_id,user_id,claim_day)
);
CREATE INDEX IF NOT EXISTS akira_task_claims_user ON akira_task_claims(user_id,claim_day DESC);
COMMIT;
