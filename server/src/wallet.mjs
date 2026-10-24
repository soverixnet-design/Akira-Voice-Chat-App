import { getPool } from './database.mjs';

// Only server-side trusted flows may call applyWalletDelta.
// Never accept a coin delta directly from an untrusted game client.
export async function getWallet(userId) {
  await getPool().query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[userId]);
  const {rows} = await getPool().query('SELECT balance,updated_at FROM akira_wallets WHERE user_id=$1',[userId]);
  return {balance:Number(rows[0].balance),updatedAt:rows[0].updated_at};
}
export async function walletHistory(userId) {
  const {rows} = await getPool().query('SELECT id,delta,balance_after AS "balanceAfter",reason,reference_key AS "referenceKey",created_at AS "createdAt" FROM akira_wallet_transactions WHERE user_id=$1 ORDER BY id DESC LIMIT 50',[userId]);
  return rows;
}
export async function applyWalletDelta(userId,delta,reason,referenceKey) {
  if (!Number.isSafeInteger(delta) || delta===0 || !/^[a-z_]{3,40}$/.test(reason) || typeof referenceKey!=='string' || referenceKey.length<1 || referenceKey.length>160)
    throw new Error('invalid_wallet_transaction');
  const client=await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[userId]);
    const {rows}=await client.query('SELECT balance FROM akira_wallets WHERE user_id=$1 FOR UPDATE',[userId]);
    const old=Number(rows[0].balance);
    const prior=await client.query('SELECT delta,balance_after,reason FROM akira_wallet_transactions WHERE user_id=$1 AND reference_key=$2',[userId,referenceKey]);
    if(prior.rows.length){
      const p=prior.rows[0];
      if(Number(p.delta)!==delta || p.reason!==reason) throw new Error('wallet_reference_conflict');
      await client.query('COMMIT');
      return {balance:Number(p.balance_after),duplicate:true};
    }
    const next=old+delta;
    if(!Number.isSafeInteger(next) || next<0) {await client.query('ROLLBACK');return {error:'insufficient_balance'};}
    await client.query('UPDATE akira_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[userId,next]);
    await client.query('INSERT INTO akira_wallet_transactions(user_id,delta,balance_after,reason,reference_key) VALUES($1,$2,$3,$4,$5)',[userId,delta,next,reason,referenceKey]);
    await client.query('COMMIT');
    return {balance:next,duplicate:false};
  } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
}
