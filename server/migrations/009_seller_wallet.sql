-- Seller inventory is NOT the user's personal wallet.
CREATE TABLE IF NOT EXISTS akira_seller_wallets (
 user_id bigint PRIMARY KEY REFERENCES akira_users(id),
 balance bigint NOT NULL DEFAULT 0 CHECK(balance>=0),
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS akira_seller_transfers (
 id bigserial PRIMARY KEY,
 seller_id bigint NOT NULL REFERENCES akira_users(id),
 recipient_id bigint NOT NULL REFERENCES akira_users(id),
 amount bigint NOT NULL CHECK(amount>0),
 request_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(seller_id,request_id)
);
CREATE TABLE IF NOT EXISTS akira_seller_allocations (
 id bigserial PRIMARY KEY,
 seller_id bigint NOT NULL REFERENCES akira_users(id),
 admin_id bigint NOT NULL REFERENCES akira_users(id),
 amount bigint NOT NULL CHECK(amount>0),
 request_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(admin_id,request_id)
);
