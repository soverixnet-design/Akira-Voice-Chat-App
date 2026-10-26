import {OAuth2Client} from 'google-auth-library';
import {randomBytes,createHash} from 'node:crypto';
import {getPool} from './database.mjs';

const sha = t => createHash('sha256').update(t).digest('hex');
const validEmail = s => typeof s==='string' && s.length<=254 && /^[^ @]+@[^ @]+[.][^ @]+$/.test(s);
const publicUser = row => ({id:String(row.public_id),displayName:row.display_name,
 avatarUrl:row.avatar_url||null,countryCode:row.country_code||null});
export const googleClientId = () => (process.env.AKIRA_GOOGLE_WEB_CLIENT_ID||'').trim();
export async function verifyGoogleCredential(idToken,clientId=googleClientId()){
 if(!clientId)throw new Error('google_login_not_configured');
 if(typeof idToken!=='string'||idToken.length<200||idToken.length>8192)throw new Error('invalid_google_credential');
 const ticket=await new OAuth2Client(clientId).verifyIdToken({idToken,audience:clientId});
 const payload=ticket.getPayload();
 if(!payload||!['accounts.google.com','https://accounts.google.com'].includes(payload.iss) ||
   typeof payload.sub!=='string'||!/^[\w.-]{10,200}$/.test(payload.sub) ||
   payload.email_verified!==true || !validEmail(payload.email))
   throw new Error('invalid_google_identity');
 return {sub:payload.sub,email:payload.email.trim().toLowerCase(),
  name:typeof payload.name==='string'?payload.name.slice(0,80):'Google User',
  picture:typeof payload.picture==='string'&&payload.picture.startsWith('https://')&&payload.picture.length<2048?payload.picture:null};
}
async function identity(idToken,verifier){
 const value=await verifier(idToken);
 if(!value || typeof value.sub!=='string' || !/^[\w.-]{10,200}$/.test(value.sub) ||
    !validEmail(value.email) || !value.name)throw new Error('invalid_google_identity');
 return value;
}
export async function googleSignIn(idToken,options={}){
 const clientId=options.clientId??googleClientId();
 if(!clientId)return {status:503,body:{error:'google_login_not_configured'}};
 let g;
 try{g=await identity(idToken,options.verifier||verifyGoogleCredential)}catch(e){
  return {status:401,body:{error:'invalid_google_credential'}};
 }
 const pool=options.pool||getPool(),db=await pool.connect();
 try{
  await db.query('BEGIN');
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['akira-google:'+g.sub]);
  const existing=await db.query('SELECT id,public_id,display_name,avatar_url,country_code,is_banned FROM akira_users WHERE auth_subject=$1 FOR UPDATE',['google:'+g.sub]);
  let user=existing.rows[0];
  if(user?.is_banned){await db.query('ROLLBACK');return {status:403,body:{error:'account_banned'}};}
  if(!user){
   // Never silently merge an email/password account merely because an email matches.
   // User can safely link Google after authenticating to their existing Akira account.
   const used=await db.query('SELECT 1 FROM akira_credentials WHERE email=$1',[g.email]);
   if(used.rows.length){await db.query('ROLLBACK');return {status:409,body:{error:'email_account_link_required'}};}
   const created=await db.query('INSERT INTO akira_users(auth_subject,display_name,avatar_url) VALUES($1,$2,$3) RETURNING id,public_id,display_name,avatar_url,country_code',
     ['google:'+g.sub,(g.name||'Google User').trim().slice(0,80)||'Google User',g.picture]);
   user=created.rows[0];
  }
  const token=randomBytes(32).toString('base64url');
  await db.query("INSERT INTO akira_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[sha(token),user.id]);
  await db.query('COMMIT');
  return {status:200,body:{app:'akira',token,user:publicUser(user)}};
 }catch(err){await db.query('ROLLBACK');throw err}finally{db.release()}
}
export async function linkGoogleAccount(user,idToken,options={}){
 const clientId=options.clientId??googleClientId();
 if(!clientId)return {status:503,body:{error:'google_login_not_configured'}};
 let g;
 try{g=await identity(idToken,options.verifier||verifyGoogleCredential)}
 catch{return {status:401,body:{error:'invalid_google_credential'}};}
 const pool=options.pool||getPool(),db=await pool.connect();
 try{
  await db.query('BEGIN');
  const matching=await db.query('SELECT 1 FROM akira_credentials WHERE user_id=$1 AND email=$2',[user.id,g.email]);
  if(!matching.rows.length){await db.query('ROLLBACK');return {status:403,body:{error:'google_email_must_match_existing_account'}};}
  const collision=await db.query('SELECT id FROM akira_users WHERE auth_subject=$1',['google:'+g.sub]);
  if(collision.rows.length && String(collision.rows[0].id)!==String(user.id)){
   await db.query('ROLLBACK');return {status:409,body:{error:'google_account_already_linked'}};
  }
  await db.query("UPDATE akira_users SET auth_subject=$2,updated_at=now() WHERE id=$1 AND (auth_subject IS NULL OR auth_subject=$2)",[user.id,'google:'+g.sub]);
  await db.query('COMMIT');
  return {status:200,body:{ok:true,linked:true}};
 }catch(err){await db.query('ROLLBACK');throw err}finally{db.release()}
}
