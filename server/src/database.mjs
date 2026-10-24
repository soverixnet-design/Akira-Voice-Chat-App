import pg from 'pg';
import { readFileSync } from 'node:fs';
const { Pool } = pg;
let pool;
export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL && !process.env.PGHOST) throw new Error('database_not_configured');
    pool = new Pool({ connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.DATABASE_URL ? undefined : process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.DATABASE_URL ? undefined : process.env.PGUSER,
      database: process.env.DATABASE_URL ? undefined : process.env.PGDATABASE,
      password: process.env.DATABASE_URL ? undefined : (process.env.PGPASSWORD_FILE ? readFileSync(process.env.PGPASSWORD_FILE, 'utf8').trim() : process.env.PGPASSWORD),
      max: 3, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000 });
  }
  return pool;
}
export async function listRooms() {
  const { rows } = await getPool().query(
    'SELECT r.public_id::text AS id, r.name, r.description, r.cover_url AS "coverUrl", r.seat_count AS "seatCount", r.is_locked AS "isLocked", u.public_id::text AS "ownerId" FROM akira_rooms r JOIN akira_users u ON u.id=r.owner_id ORDER BY r.created_at DESC LIMIT 50'
  );
  return rows;
}
export async function getRoom(publicId) {
  const { rows } = await getPool().query(
    'SELECT r.public_id::text AS id, r.name, r.description, r.cover_url AS "coverUrl", r.seat_count AS "seatCount", r.is_locked AS "isLocked", u.public_id::text AS "ownerId" FROM akira_rooms r JOIN akira_users u ON u.id=r.owner_id WHERE r.public_id=$1 LIMIT 1', [publicId]
  );
  return rows[0] || null;
}
