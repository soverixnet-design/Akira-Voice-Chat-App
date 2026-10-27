BEGIN;
ALTER TABLE akira_users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS akira_control_catalog(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,kind TEXT NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',asset TEXT NOT NULL DEFAULT '',price BIGINT NOT NULL DEFAULT 0 CHECK(price>=0),enabled BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS akira_control_inventory(user_id BIGINT REFERENCES akira_users(id),item_id BIGINT REFERENCES akira_control_catalog(id),equipped BOOLEAN NOT NULL DEFAULT false,PRIMARY KEY(user_id,item_id));
CREATE TABLE IF NOT EXISTS akira_control_sellers(user_id BIGINT PRIMARY KEY REFERENCES akira_users(id),contact TEXT NOT NULL,enabled BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS akira_control_reports(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES akira_users(id),target_id TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS akira_control_games(game TEXT PRIMARY KEY,enabled BOOLEAN NOT NULL DEFAULT true);
INSERT INTO akira_control_games(game) VALUES('food-wheel'),('jackpot-fruit') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS akira_control_rewards(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name TEXT NOT NULL,starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL,amount BIGINT NOT NULL CHECK(amount>0),winners INTEGER NOT NULL CHECK(winners BETWEEN 1 AND 10),status TEXT NOT NULL DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS akira_control_reward_winners(reward_id BIGINT REFERENCES akira_control_rewards(id),user_id BIGINT REFERENCES akira_users(id),score NUMERIC NOT NULL,amount BIGINT NOT NULL,PRIMARY KEY(reward_id,user_id));
CREATE TABLE IF NOT EXISTS akira_control_diamonds(user_id BIGINT PRIMARY KEY REFERENCES akira_users(id),balance BIGINT NOT NULL DEFAULT 0 CHECK(balance>=0));
CREATE TABLE IF NOT EXISTS akira_control_gifts(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,sender_id BIGINT NOT NULL REFERENCES akira_users(id),recipient_id BIGINT NOT NULL,item_id BIGINT REFERENCES akira_control_catalog(id),quantity INTEGER NOT NULL,total BIGINT NOT NULL,request_key TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(sender_id,request_key));
CREATE TABLE IF NOT EXISTS akira_control_transfers(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,sender_id BIGINT REFERENCES akira_users(id),recipient_id BIGINT REFERENCES akira_users(id),amount BIGINT NOT NULL,request_key TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(sender_id,request_key));
CREATE TABLE IF NOT EXISTS akira_control_exchange(id INTEGER PRIMARY KEY CHECK(id=1),coins_per_100 INTEGER NOT NULL CHECK(coins_per_100 BETWEEN 1 AND 100));
INSERT INTO akira_control_exchange VALUES(1,70) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS akira_control_exchanges(user_id BIGINT REFERENCES akira_users(id),request_key TEXT,diamonds BIGINT NOT NULL,coins BIGINT NOT NULL,PRIMARY KEY(user_id,request_key));
CREATE TABLE IF NOT EXISTS akira_control_gift_policy (
 id INTEGER PRIMARY KEY CHECK(id=1),
 allow_self_gifts BOOLEAN NOT NULL DEFAULT true,
 allow_other_gifts BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO akira_control_gift_policy(id,allow_self_gifts,allow_other_gifts)
VALUES(1,true,true) ON CONFLICT(id) DO NOTHING;
COMMIT;
