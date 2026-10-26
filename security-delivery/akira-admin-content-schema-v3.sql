BEGIN;
CREATE TABLE IF NOT EXISTS akira_admin_content(
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('banner','notice','legal')),
 title TEXT NOT NULL,
 body TEXT NOT NULL DEFAULT '',
 asset TEXT NOT NULL DEFAULT '',
 enabled BOOLEAN NOT NULL DEFAULT false,
 starts_at TIMESTAMPTZ,
 ends_at TIMESTAMPTZ,
 created_by BIGINT REFERENCES akira_users(id),
 request_key TEXT UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT akira_admin_content_dates CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at<ends_at)
);
CREATE INDEX IF NOT EXISTS akira_admin_content_active ON akira_admin_content(kind,enabled,updated_at DESC);
CREATE TABLE IF NOT EXISTS akira_support_tickets(
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES akira_users(id),
 subject TEXT NOT NULL,
 message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','answered','closed')),
 admin_reply TEXT NOT NULL DEFAULT '',
 replied_by BIGINT REFERENCES akira_users(id),
 request_key TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_key)
);
CREATE INDEX IF NOT EXISTS akira_support_tickets_recent ON akira_support_tickets(updated_at DESC);
COMMIT;
