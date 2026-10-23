import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getPool } from './database.mjs';
const scrypt = promisify(scryptCallback);
const digest = token => createHash('sha256').update(token).digest('hex');
const emailValid = email => typeof email === 'string' && email.length <= 254 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
const profile = row => ({ id: String(row.public_id), displayName: row.display_name, avatarUrl: row.avatar_url, countryCode: row.country_code });
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return 'scrypt:' + salt + ':' + key.toString('hex');
}
async function verifyPassword(password, stored) {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const expected = Buffer.from(parts[2], 'hex');
  if (expected.length !== 64) return false;
  const actual = await scrypt(password, parts[1], 64);
  return timingSafeEqual(actual, expected);
}
async function newSession(client, userId) {
  const token = randomBytes(32).toString('base64url');
  await client.query("INSERT INTO akira_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now() + interval '30 days')", [digest(token), userId]);
  return token;
}
export async function register({email, password, displayName}) {
  if (!emailValid(email) || typeof password !== 'string' || password.length < 12 || password.length > 128 ||
      typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 80) {
    return { status: 400, body: { error: 'invalid_registration' } };
  }
  const normalized = email.trim().toLowerCase();
  const hashed = await hashPassword(password);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const {rows} = await client.query('INSERT INTO akira_users(display_name) VALUES($1) RETURNING id,public_id,display_name,avatar_url,country_code', [displayName.trim()]);
    await client.query('INSERT INTO akira_credentials(user_id,email,password_hash) VALUES($1,$2,$3)', [rows[0].id,normalized,hashed]);
    const token = await newSession(client, rows[0].id);
    await client.query('COMMIT');
    return {status: 201,body: {app:'akira',token,user:profile(rows[0])}};
  } catch(err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return {status:409,body:{error:'email_already_registered'}};
    throw err;
  } finally {client.release();}
}
export async function login({email,password}) {
  if (!emailValid(email) || typeof password !== 'string') return {status:401,body:{error:'invalid_credentials'}};
  const {rows} = await getPool().query('SELECT u.id,u.public_id,u.display_name,u.avatar_url,u.country_code,c.password_hash FROM akira_credentials c JOIN akira_users u ON u.id=c.user_id WHERE c.email=$1', [email.trim().toLowerCase()]);
  if (!rows[0] || !(await verifyPassword(password,rows[0].password_hash))) return {status:401,body:{error:'invalid_credentials'}};
  const token = await newSession(getPool(),rows[0].id);
  return {status:200,body:{app:'akira',token,user:profile(rows[0])}};
}
export async function authenticate(header) {
  if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9_-]{43}$/.test(header)) return null;
  const token = header.slice(7);
  const {rows} = await getPool().query('SELECT u.id,u.public_id,u.display_name,u.avatar_url,u.country_code FROM akira_sessions s JOIN akira_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [digest(token)]);
  return rows[0] || null;
}
export async function logout(header) {
  if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9_-]{43}$/.test(header)) return;
  await getPool().query('DELETE FROM akira_sessions WHERE token_hash=$1',[digest(header.slice(7))]);
}
export { profile };
