import {getPool} from './database.mjs';
const validId = x => /^\d{6}$/.test(String(x??''));
const validReq = x => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x||'');
export async function sellerBalance(userId) {
 const {rows}=await getPool().query('SELECT balance,enabled FROM akira_seller_wallets WHERE user_id=$1',[userId]);
 return rows[0]?{balance:Number(rows[0].balance),enabled:rows[0].enabled}:null;
}
export async function sellerCredit(adminId,publicId,amount,requestId,pool=null) {
 if(!validId(publicId)||!Number.isSafeInteger(amount)||amount<=0||!validReq(requestId))return {status:400,error:'invalid_allocation'};
 const db=await (pool||getPool()).connect();
 try{
  await db.query('BEGIN');
  const u=await db.query('SELECT id FROM akira_users WHERE public_id=$1 AND is_banned=false',[publicId]);
  if(!u.rows.length){await db.query('ROLLBACK');return {status:404,error:'seller_not_found'};}
  const sellerId=u.rows[0].id;
  await db.query('INSERT INTO akira_seller_wallets(user_id,enabled) VALUES($1,false) ON CONFLICT DO NOTHING',[sellerId]);
  const lock=await db.query('SELECT balance FROM akira_seller_wallets WHERE user_id=$1 FOR UPDATE',[sellerId]);
  const prior=await db.query('SELECT seller_id,amount FROM akira_seller_allocations WHERE admin_id=$1 AND request_id=$2',[adminId,requestId]);
  if(prior.rows.length){await db.query('COMMIT');return String(prior.rows[0].seller_id)===String(sellerId)&&Number(prior.rows[0].amount)===amount?{status:200,balance:Number(lock.rows[0].balance),duplicate:true}:{status:409,error:'request_id_conflict'};}
  const next=Number(lock.rows[0].balance)+amount;
  if(!Number.isSafeInteger(next))throw Error('balance_overflow');
  await db.query('UPDATE akira_seller_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[sellerId,next]);
  await db.query('INSERT INTO akira_seller_allocations(seller_id,admin_id,amount,request_id) VALUES($1,$2,$3,$4)',[sellerId,adminId,amount,requestId]);
  await db.query('COMMIT');return {status:200,balance:next,duplicate:false};
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
export async function sellerSend(sellerId,publicId,amount,requestId,pool=null){
 if(!validId(publicId)||!Number.isSafeInteger(amount)||amount<=0||!validReq(requestId))return {status:400,error:'invalid_transfer'};
 const db=await (pool||getPool()).connect();
 try{
  await db.query('BEGIN');
  const seller=await db.query('SELECT balance,enabled FROM akira_seller_wallets WHERE user_id=$1 FOR UPDATE',[sellerId]);
  if(!seller.rows.length||!seller.rows[0].enabled){await db.query('ROLLBACK');return {status:403,error:'seller_not_enabled'};}
  const prior=await db.query('SELECT recipient_id,amount FROM akira_seller_transfers WHERE seller_id=$1 AND request_id=$2',[sellerId,requestId]);
  const recipient=await db.query('SELECT id FROM akira_users WHERE public_id=$1 AND is_banned=false',[publicId]);
  if(!recipient.rows.length){await db.query('ROLLBACK');return {status:404,error:'recipient_not_found'};}
  const recipientId=recipient.rows[0].id;
  if(prior.rows.length){await db.query('COMMIT');return String(prior.rows[0].recipient_id)===String(recipientId)&&Number(prior.rows[0].amount)===amount?{status:200,duplicate:true,balance:Number(seller.rows[0].balance)}:{status:409,error:'request_id_conflict'};}
  const next=Number(seller.rows[0].balance)-amount;
  if(next<0){await db.query('ROLLBACK');return {status:409,error:'insufficient_seller_balance'};}
  await db.query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[recipientId]);
  const wallet=await db.query('SELECT balance FROM akira_wallets WHERE user_id=$1 FOR UPDATE',[recipientId]);
  const recipientNext=Number(wallet.rows[0].balance)+amount;
  if(!Number.isSafeInteger(recipientNext))throw Error('balance_overflow');
  await db.query('UPDATE akira_seller_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[sellerId,next]);
  await db.query('UPDATE akira_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[recipientId,recipientNext]);
  await db.query('INSERT INTO akira_wallet_transactions(user_id,delta,balance_after,reason,reference_key) VALUES($1,$2,$3,$4,$5)',[recipientId,amount,recipientNext,'seller_recharge','seller:'+sellerId+':'+requestId]);
  await db.query('INSERT INTO akira_seller_transfers(seller_id,recipient_id,amount,request_id) VALUES($1,$2,$3,$4)',[sellerId,recipientId,amount,requestId]);
  await db.query('COMMIT');return {status:200,balance:next,recipientBalance:recipientNext,duplicate:false};
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
