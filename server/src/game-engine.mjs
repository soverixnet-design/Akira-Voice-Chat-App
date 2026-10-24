import { randomInt } from 'node:crypto';
import { getPool } from './database.mjs';

const CONFIG={
 'food-wheel':{rounds:'akira_food_rounds',bets:'akira_food_bets',result:'result_id',duration:20,
  weights:{shrimp:10,fish:15,chicken:25,steak:45,cabbage:5,carrot:5,corn:5,tomato:5}},
 'jackpot-fruit':{rounds:'akira_jackpot_rounds',bets:'akira_jackpot_bets',result:'result_item',duration:20,
  weights:{lemon:5,grape:5,kiwi:5,cherry:40,peach:5,watermelon:20,banana:10,strawberry:10}}
};
function outcome(weights){
 const entries=Object.entries(weights), total=entries.reduce((a,[,m])=>a+1/m,0);
 let r=randomInt(0,1000000000)/1000000000*total;
 for(const [id,m] of entries){r-=1/m;if(r<0)return id;}
 return entries.at(-1)[0];
}
export async function advanceGameRound(game){
 const c=CONFIG[game];if(!c)throw Error('unknown_game');
 const client=await getPool().connect();
 try {
  await client.query('BEGIN');
  // Transaction-level advisory lock serializes multiple API replicas.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['akira-game:'+game]);
  const {rows}=await client.query(`SELECT id,betting_ends_at,settled_at FROM ${c.rounds} ORDER BY id DESC LIMIT 1 FOR UPDATE`);
  const latest=rows[0];
  if(latest && !latest.settled_at && new Date(latest.betting_ends_at).getTime()<=Date.now()){
   const result=outcome(c.weights);
   const bets=await client.query(`SELECT id,user_id,amount FROM ${c.bets} WHERE round_id=$1 AND item_id=$2 ORDER BY user_id,id`,[latest.id,result]);
   // Aggregate winnings per user before locking wallets, to avoid lock-order inversions.
   const payouts=new Map();
   for(const bet of bets.rows){
    const amount=Number(bet.amount),win=amount*c.weights[result];
    if(!Number.isSafeInteger(win))throw Error('payout_overflow');
    payouts.set(String(bet.user_id),(payouts.get(String(bet.user_id))||0)+win);
    if(!Number.isSafeInteger(payouts.get(String(bet.user_id))))throw Error('payout_overflow');
    await client.query(`UPDATE ${c.bets} SET payout=$2 WHERE id=$1`,[bet.id,win]);
   }
   for(const [uid,win] of [...payouts].sort((a,b)=>BigInt(a[0])<BigInt(b[0])?-1:1)){
    await client.query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[uid]);
    const w=await client.query('SELECT balance FROM akira_wallets WHERE user_id=$1 FOR UPDATE',[uid]);
    const next=Number(w.rows[0].balance)+win;
    if(!Number.isSafeInteger(next))throw Error('wallet_overflow');
    await client.query('UPDATE akira_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[uid,next]);
    await client.query('INSERT INTO akira_wallet_transactions(user_id,delta,balance_after,reason,reference_key) VALUES($1,$2,$3,$4,$5)',
      [uid,win,next,'game_win',game+':round:'+latest.id+':win']);
   }
   await client.query(`UPDATE ${c.rounds} SET ${c.result}=$2,settled_at=now()${game==='jackpot-fruit'?",bonus='none',jackpot_pool_after=jackpot_pool_before":''} WHERE id=$1`,[latest.id,result]);
  }
  if(!latest || new Date(latest.betting_ends_at).getTime()<=Date.now()){
   await client.query(`INSERT INTO ${c.rounds}(starts_at,betting_ends_at) VALUES(now(),now()+($1::int * interval '1 second'))`,[c.duration]);
  }
  await client.query('COMMIT');
 }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
}
export function startGameEngine(){
 if(process.env.AKIRA_GAME_ENGINE_ENABLED!=='true')return;
 let busy=false;
 const tick=async()=>{
  if(busy)return;busy=true;
  try{for(const game of Object.keys(CONFIG))await advanceGameRound(game);}
  catch(err){console.error('game_engine_tick_failed',err.message);}
  finally{busy=false;}
 };
 void tick();
 const timer=setInterval(tick,1000);
 timer.unref();
}
