import {getPool} from './database.mjs';

export const DAILY_AMOUNTS = Object.freeze([100,150,200,300,400,600,1000]);
const dayBefore = date => {
  const ms=Date.parse(date+'T00:00:00Z');
  if(!Number.isFinite(ms))throw Error('invalid_database_date');
  return new Date(ms-86400000).toISOString().slice(0,10);
};
const streakFor = (last,today) =>
  last && last.reward_date===dayBefore(today) ? (Number(last.streak)%7)+1 : 1;

async function clock(client){
  const {rows}=await client.query("SELECT (timezone('UTC',now())::date)::text AS today");
  return rows[0].today;
}
async function lastClaim(client,userId){
  const {rows}=await client.query('SELECT reward_date::text AS reward_date,streak,amount FROM akira_daily_reward_claims WHERE user_id=$1 ORDER BY reward_date DESC LIMIT 1',[userId]);
  return rows[0]||null;
}
export async function dailyRewardStatus(userId,pool=getPool()){
 const today=await clock(pool),last=await lastClaim(pool,userId);
 const claimed=last?.reward_date===today;
 const nextDay=claimed?Number(last.streak)%7+1:streakFor(last,today);
 return {status:200,body:{ok:true,today,claimed,streak:claimed?Number(last.streak):nextDay,
   nextReward:DAILY_AMOUNTS[nextDay-1],claimedAmount:claimed?Number(last.amount):0,
   amounts:[...DAILY_AMOUNTS],timezone:'UTC'}};
}
export async function claimDailyReward(userId,pool=getPool()){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  // Original wallet row serializes concurrent taps from all devices.
  await client.query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[userId]);
  const {rows}=await client.query('SELECT balance FROM akira_wallets WHERE user_id=$1 FOR UPDATE',[userId]);
  if(!rows.length)throw Error('wallet_unavailable');
  const original=Number(rows[0].balance);
  const today=await clock(client),last=await lastClaim(client,userId);
  if(last?.reward_date===today){
   await client.query('COMMIT');
   return {status:200,body:{ok:true,claimed:true,alreadyClaimed:true,today,
     streak:Number(last.streak),amount:Number(last.amount),wallet:{balance:original}}};
  }
  const streak=streakFor(last,today),amount=DAILY_AMOUNTS[streak-1],next=original+amount;
  if(!Number.isSafeInteger(next))throw Error('wallet_overflow');
  await client.query('INSERT INTO akira_daily_reward_claims(user_id,reward_date,streak,amount) VALUES($1,$2,$3,$4)',[userId,today,streak,amount]);
  await client.query('UPDATE akira_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[userId,next]);
  await client.query('INSERT INTO akira_wallet_transactions(user_id,delta,balance_after,reason,reference_key) VALUES($1,$2,$3,$4,$5)',[userId,amount,next,'daily_reward','daily:'+today]);
  await client.query('COMMIT');
  return {status:200,body:{ok:true,claimed:true,alreadyClaimed:false,today,streak,amount,wallet:{balance:next}}};
 }catch(err){await client.query('ROLLBACK');throw err}
 finally{client.release()}
}
