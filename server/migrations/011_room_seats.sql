-- Authoritative voice-room microphone seats; safe to run after prior Akira migrations.
-- A user's seat is unique within a room; 0 is reserved for the owner.
BEGIN;
CREATE TABLE IF NOT EXISTS akira_room_seats (
 room_id BIGINT NOT NULL REFERENCES akira_rooms(id) ON DELETE CASCADE,
 seat_no SMALLINT NOT NULL CHECK(seat_no BETWEEN 0 AND 11),
 user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
 seated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(room_id,seat_no),
 UNIQUE(room_id,user_id)
);
CREATE INDEX IF NOT EXISTS akira_room_seats_user_id_idx ON akira_room_seats(user_id);
COMMIT;
