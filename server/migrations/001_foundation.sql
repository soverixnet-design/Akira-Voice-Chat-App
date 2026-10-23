-- Akira foundation schema v1. Apply only to the dedicated akira_db database.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 100001) UNIQUE,
  auth_subject TEXT UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  avatar_url TEXT,
  country_code VARCHAR(2),
  bio VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT akira_users_name_nonempty CHECK (length(btrim(display_name)) > 0),
  CONSTRAINT akira_users_country_format CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);
CREATE TABLE IF NOT EXISTS akira_rooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 100001) UNIQUE,
  owner_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  cover_url TEXT,
  theme_key VARCHAR(100),
  seat_count SMALLINT NOT NULL DEFAULT 10 CHECK (seat_count IN (5,10,12)),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT akira_rooms_name_nonempty CHECK (length(btrim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS akira_rooms_owner_id_idx ON akira_rooms(owner_id);
CREATE TABLE IF NOT EXISTS akira_room_members (
  room_id BIGINT NOT NULL REFERENCES akira_rooms(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member','host','admin','cohost')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS akira_room_members_user_id_idx ON akira_room_members(user_id);
COMMIT;
