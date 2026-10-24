import { getPool } from './database.mjs';
import { authenticate } from './auth.mjs';

export async function requireAdmin(header) {
  const user = await authenticate(header);
  if (!user) return { status: 401, error: 'unauthorized' };
  const { rows } = await getPool().query(
    'SELECT role FROM akira_admin_roles WHERE user_id=$1', [user.id]
  );
  if (!rows[0]) return { status: 403, error: 'admin_forbidden' };
  return { user, role: rows[0].role };
}

export async function adminStats() {
  const { rows } = await getPool().query(
    'SELECT (SELECT COUNT(*)::int FROM akira_users) AS users, (SELECT COUNT(*)::int FROM akira_rooms) AS rooms'
  );
  return rows[0];
}
