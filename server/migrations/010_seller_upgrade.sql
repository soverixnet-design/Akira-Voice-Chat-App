-- Additive seller upgrade for existing Akira databases. Preserve all old balances.
BEGIN;
ALTER TABLE akira_seller_wallets ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS akira_seller_transfers (
 id BIGSERIAL PRIMARY KEY,
 seller_id BIGINT NOT NULL REFERENCES akira_users(id),
 recipient_id BIGINT NOT NULL REFERENCES akira_users(id),
 amount BIGINT NOT NULL CHECK(amount>0),
 request_id UUID NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(seller_id,request_id)
);
CREATE TABLE IF NOT EXISTS akira_seller_allocations (
 id BIGSERIAL PRIMARY KEY,
 seller_id BIGINT NOT NULL REFERENCES akira_users(id),
 admin_id BIGINT NOT NULL REFERENCES akira_users(id),
 amount BIGINT NOT NULL CHECK(amount>0),
 request_id UUID NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(admin_id,request_id)
);
COMMIT;
