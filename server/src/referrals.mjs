import {getPool} from './database.mjs';

const validId = value => /^\d{6,18}$/.test(String(value??''));

/** Counts only verified, one-time referrals, not taps on a share link. */
export async function referralStatus(user,pool=getPool()){
  const [count,inviter,eligibility]=await Promise.all([
    pool.query('SELECT count(*)::text AS count FROM akira_referrals WHERE inviter_id=$1',[user.id]),
    pool.query('SELECT u.public_id::text AS id FROM akira_referrals r JOIN akira_users u ON u.id=r.inviter_id WHERE r.referee_id=$1',[user.id]),
    pool.query("SELECT (created_at >= NOW()-INTERVAL '7 days') AS eligible FROM akira_users WHERE id=$1",[user.id])
  ]);
  return {status:200,body:{ok:true,verifiedInvites:Number(count.rows[0]?.count||0),
    invitedBy:inviter.rows[0]?.id||null,
    canEnterCode:!!eligibility.rows[0]?.eligible&&!inviter.rows.length,
    rewardCoins:0,tracking:'verified_signups_only'}};
}

/** A new account may apply a friend's ID once, within seven days. Never mint coins here. */
export async function claimReferral(user,code,pool=getPool()){
 if(!validId(code))return {status:400,body:{error:'invalid_invite_code'}};
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  const {rows:accounts}=await db.query("SELECT id,(created_at >= NOW()-INTERVAL '7 days') AS eligible FROM akira_users WHERE id=$1 FOR UPDATE",[user.id]);
  if(!accounts.length||!accounts[0].eligible){await db.query('ROLLBACK');return {status:403,body:{error:'invite_code_window_expired'}}}
  const existing=await db.query('SELECT 1 FROM akira_referrals WHERE referee_id=$1',[user.id]);
  if(existing.rows.length){await db.query('COMMIT');return {status:409,body:{error:'invite_code_already_used'}}}
  const {rows:referrers}=await db.query('SELECT id FROM akira_users WHERE public_id=$1 AND is_banned=FALSE LIMIT 1',[String(code)]);
  const ref=referrers[0];
  if(!ref||String(ref.id)===String(user.id)){await db.query('ROLLBACK');return {status:400,body:{error:'invalid_invite_code'}}}
  await db.query('INSERT INTO akira_referrals(referee_id,inviter_id) VALUES($1,$2)',[user.id,ref.id]);
  await db.query('COMMIT');
  return {status:201,body:{ok:true,accepted:true,invitedBy:String(code),rewardCoins:0}};
 }catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}
}
