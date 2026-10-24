BEGIN;
CREATE TABLE IF NOT EXISTS akira_admin_roles (
  user_id BIGINT PRIMARY KEY REFERENCES akira_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','moderator')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS akira_admin_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id BIGINT NOT NULL REFERENCES akira_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
