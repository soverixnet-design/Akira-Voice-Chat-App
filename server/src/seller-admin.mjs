import {getPool} from './database.mjs';

export async function setSellerStatus(adminId, publicId, enabled, pool = getPool()) {
  if (!/^\d{6}$/.test(String(publicId ?? '')) || typeof enabled !== 'boolean')
    return {status:400,error:'invalid_seller_status'};
  const db=await pool.connect();
  try {
    await db.query('BEGIN');
    const found=await db.query('SELECT id FROM akira_users WHERE public_id=$1 AND is_banned=false FOR UPDATE',[publicId]);
    if (!found.rows.length) {
      await db.query('ROLLBACK');
      return {status:404,error:'seller_account_not_found'};
    }
    const sellerId=found.rows[0].id;
    await db.query('INSERT INTO akira_seller_wallets(user_id,balance,enabled) VALUES($1,0,$2) ON CONFLICT(user_id) DO UPDATE SET enabled=$2,updated_at=now()',[sellerId,enabled]);
    await db.query('INSERT INTO akira_admin_audit(actor_user_id,action,target_type,target_id) VALUES($1,$2,$3,$4)',[adminId,enabled?'seller_enabled':'seller_disabled','user',String(publicId)]);
    await db.query('COMMIT');
    return {status:200,ok:true,publicId:String(publicId),enabled};
  } catch(err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {db.release()}
}
