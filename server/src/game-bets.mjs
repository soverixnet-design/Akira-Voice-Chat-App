import { getPool } from './database.mjs';

// Game bets are accepted only by this authenticated server, never by client wallet deltas.
// Each wager and wallet debit commit in one PostgreSQL transaction.
const GAMES = {
  'food-wheel': {rounds:'akira_food_rounds',bets:'akira_food_bets',items:new Set(['shrimp','fish','chicken','steak','cabbage','carrot','corn','tomato'])},
  'jackpot-fruit': {rounds:'akira_jackpot_rounds',bets:'akira_jackpot_bets',items:new Set(['lemon','grape','kiwi','cherry','peach','watermelon','banana','strawberry'])}
};
export async function placeGameBet(userId, game, body) {
  const g=GAMES[game];
  if(!g) return {status:404,body:{error:'unknown_game'}};
  const {roundId,itemId,amount,requestId}=body||{};
  if(!/^\d+$/.test(String(roundId??'')) || !g.items.has(itemId) ||
    !Number.isSafeInteger(amount) || amount<=0 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId||''))
    return {status:400,body:{error:'invalid_bet'}};
  const client=await getPool().connect();
  try {
    await client.query('BEGIN');
    // Check duplicates before round closure; idempotent retries remain safe.
    const prior=await client.query(`SELECT round_id,item_id,amount FROM ${g.bets} WHERE user_id=$1 AND request_id=$2`,[userId,requestId]);
    if(prior.rows.length){
      const e=prior.rows[0];
      const balance=await client.query('SELECT balance FROM akira_wallets WHERE user_id=$1',[userId]);
      await client.query('COMMIT');
      return String(e.round_id)===String(roundId)&&e.item_id===itemId&&Number(e.amount)===amount
        ? {status:200,body:{ok:true,duplicate:true,balance:Number(balance.rows[0].balance)}}
        : {status:409,body:{error:'request_id_conflict'}};
    }
    // Lock round before wallet: same lock order as the settlement engine.
    const round=await client.query(`SELECT id FROM ${g.rounds} WHERE id=$1 AND starts_at<=now() AND betting_ends_at>now() AND settled_at IS NULL FOR UPDATE`,[roundId]);
    if(!round.rows.length){await client.query('ROLLBACK');return {status:409,body:{error:'betting_closed'}};
    }
    await client.query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[userId]);
    const wallet=await client.query('SELECT balance FROM akira_wallets WHERE user_id=$1 FOR UPDATE',[userId]);
    const old=Number(wallet.rows[0].balance);
    const existing=await client.query(`SELECT round_id,item_id,amount FROM ${g.bets} WHERE user_id=$1 AND request_id=$2`,[userId,requestId]);
    if(existing.rows.length){
      const e=existing.rows[0];await client.query('COMMIT');
      return String(e.round_id)===String(roundId)&&e.item_id===itemId&&Number(e.amount)===amount
        ? {status:200,body:{ok:true,duplicate:true,balance:old}}
        : {status:409,body:{error:'request_id_conflict'}};
    }
    if(old<amount){await client.query('ROLLBACK');return {status:409,body:{error:'insufficient_balance',balance:old}};}
    const next=old-amount;
    if(!Number.isSafeInteger(next)) throw Error('invalid_balance');
    await client.query(`INSERT INTO ${g.bets}(round_id,user_id,item_id,amount,request_id) VALUES($1,$2,$3,$4,$5)`,[roundId,userId,itemId,amount,requestId]);
    await client.query('UPDATE akira_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[userId,next]);
    await client.query('INSERT INTO akira_wallet_transactions(user_id,delta,balance_after,reason,reference_key) VALUES($1,$2,$3,$4,$5)',
      [userId,-amount,'game_bet',game+':bet:'+requestId]);
    await client.query('COMMIT');
    return {status:200,body:{ok:true,duplicate:false,balance:next,roundId,itemId,amount}};
  } catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
}
export async function gameRoundState(game) {
  const g=GAMES[game];
  if(!g) return {status:404,body:{error:'unknown_game'}};
  const {rows}=await getPool().query(`SELECT id,starts_at,betting_ends_at,settled_at,result_id AS result FROM akira_food_rounds WHERE 1=0`.replace('akira_food_rounds',g.rounds).replace('result_id AS result',game==='food-wheel'?'result_id AS result':'result_item AS result'));
  return {status:200,body:{rounds:rows}};
}
