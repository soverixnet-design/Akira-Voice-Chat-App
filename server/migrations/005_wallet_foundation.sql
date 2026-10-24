-- Akira-only wallet foundation. No demo credit is minted on account creation.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_wallets (
 user_id BIGINT PRIMARY KEY REFERENCES akira_users(id) ON DELETE CASCADE,
 balance BIGINT NOT NULL DEFAULT 0 CHECK(balance >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS akira_wallet_transactions (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 delta BIGINT NOT NULL CHECK(delta <> 0),
 balance_after BIGINT NOT NULL CHECK(balance_after >= 0),
 reason VARCHAR(40) NOT NULL,
 reference_key VARCHAR(160) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id, reference_key)
);
CREATE INDEX IF NOT EXISTS akira_wallet_transactions_user_idx ON akira_wallet_transactions(user_id, created_at DESC);
INSERT INTO akira_wallets(user_id)
 SELECT id FROM akira_users ON CONFLICT(user_id) DO NOTHING;
COMMIT;
