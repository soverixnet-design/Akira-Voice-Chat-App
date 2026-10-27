import { requireAdmin } from './admin.mjs';
import { authenticate } from './auth.mjs';
import { getPool } from './database.mjs';

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const validId=v=>/^\d{1,18}$/.test(String(v??''));
const validCode=v=>typeof v==='string'&&/^[A-Z0-9-]{8,24}$/.test(v);
async function body(req){
 let raw='';
 for await(const c of req){raw+=c;if(Buffer.byteLength(raw)>8192)throw fail('payload_too_large',413)}
 try{const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b}
 catch{throw fail('invalid_json')}
}
function safeInt(v,min,max){return Number.isSafeInteger(v)&&v>=min&&v<=max}
async function auth(req,isAdmin){
 if(isAdmin){
  const a=await requireAdmin(req.headers.authorization);
  if(a.error)throw fail(a.error,a.status);
  return a;
 }
 const user=await authenticate(req.headers.authorization);
 if(!user)throw fail('unauthorized',401);
 return{user};
}
async function transaction(work){
 const c=await getPool().connect();
 try{await c.query('BEGIN');const result=await work(c);await c.query('COMMIT');return result}
 catch(e){await c.query('ROLLBACK');throw e}
 finally{c.release()}
}
async function giveCoins(c,userId,amount,reference,reason){
 if(!safeInt(amount,1,10000))throw fail('invalid_reward');
 await c.query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[userId]);
 const {rows}=await c.query('SELECT balance FROM akira_wallets WHERE user_id=$1 FOR UPDATE',[userId]);
 if(!rows.length)throw fail('wallet_unavailable',503);
 const prior=await c.query('SELECT delta,reason,balance_after FROM akira_wallet_transactions WHERE user_id=$1 AND reference_key=$2',[userId,reference]);
 if(prior.rows.length){
  const old=prior.rows[0];
  if(Number(old.delta)!==amount||old.reason!==reason)throw fail('reward_conflict',409);
  return{balance:String(old.balance_after),duplicate:true}
 }
 const next=Number(rows[0].balance)+amount;
 if(!Number.isSafeInteger(next))throw fail('balance_overflow',409);
 await c.query('UPDATE akira_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[userId,next]);
 await c.query('INSERT INTO akira_wallet_transactions(user_id,delta,balance_after,reason,reference_key) VALUES($1,$2,$3,$4,$5)',[userId,amount,next,reason,reference]);
 return{balance:String(next),duplicate:false}
}
async function audit(c,admin,action,target){
 await c.query('INSERT INTO akira_admin_audit(actor_user_id,action,target_type,target_id) VALUES($1,$2,$3,$4)',
 [admin.user.id,action,'economy',String(target)])
}
function ensureAdminWrite(admin){if(admin.role!=='super_admin')throw fail('super_admin_required',403)}
const taskTypes=['daily_checkin','send_paid_gift'];
export async function economyRoutes(req,url,send){
 const p=url.pathname;
 const adminPromos=p==='/api/v1/admin/promos';
 const adminTasks=p==='/api/v1/admin/tasks';
 const redeem=p==='/api/v1/community/promos/redeem';
 const tasks=p==='/api/v1/community/tasks';
 const claim=p==='/api/v1/community/tasks/claim';
 if(!adminPromos&&!adminTasks&&!redeem&&!tasks&&!claim)return false;
 try{
  const adm=adminPromos||adminTasks,account=await auth(req,adm);
  const db=getPool();
  if(req.method==='GET'){
   if(adminPromos){
    const {rows}=await db.query('SELECT id::text,code,coins::text,max_uses,redeemed_count,enabled,expires_at AS "expiresAt",created_at AS "createdAt" FROM akira_admin_promos ORDER BY id DESC LIMIT 100');
    send(200,{items:rows});return true;
   }
   if(adminTasks){
    const {rows}=await db.query('SELECT id::text,action,title,coins::text,enabled,created_at AS "createdAt" FROM akira_admin_tasks ORDER BY id DESC LIMIT 100');
    send(200,{items:rows});return true;
   }
   if(tasks){
    const {rows}=await db.query(
     'SELECT t.id::text,t.action,t.title,t.coins::text,t.enabled,EXISTS(SELECT 1 FROM akira_task_claims c WHERE c.task_id=t.id AND c.user_id=$1 AND c.claim_day=(now() AT TIME ZONE \'UTC\')::date) AS claimed FROM akira_admin_tasks t WHERE t.enabled=true ORDER BY t.id DESC LIMIT 50',
     [account.user.id]
    );send(200,{items:rows,serverTime:new Date().toISOString()});return true;
   }
   throw fail('method_not_allowed',405);
  }
  if(req.method!=='POST')throw fail('method_not_allowed',405);
  const b=await body(req);
  if(adminPromos){
   ensureAdminWrite(account);
   if(b.action==='set_enabled'){
    if(!validId(b.id)||typeof b.enabled!=='boolean')throw fail('invalid_promo');
    const result=await transaction(async c=>{
      const {rows}=await c.query('UPDATE akira_admin_promos SET enabled=$1 WHERE id=$2 RETURNING id::text',[b.enabled,b.id]);
      if(!rows.length)throw fail('promo_not_found',404);
      await audit(c,account,b.enabled?'promo_enabled':'promo_disabled',b.id);return{ok:true,id:rows[0].id}
    });send(200,result);return true;
   }
   const code=typeof b.code==='string'?b.code.trim().toUpperCase():'';
   if(!validCode(code)||!safeInt(b.coins,1,10000)||!safeInt(b.maxUses,1,500)||b.enabled!==false)
    throw fail('invalid_promo_configuration');
   const expires=b.expiresAt===null||b.expiresAt===undefined?null:b.expiresAt;
   if(expires!==null && (typeof expires!=='string'||!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now()))
     throw fail('invalid_expiry');
   const result=await transaction(async c=>{
    const {rows}=await c.query(
      'INSERT INTO akira_admin_promos(code,coins,max_uses,enabled,expires_at,created_by) VALUES($1,$2,$3,false,$4,$5) ON CONFLICT(code) DO NOTHING RETURNING id::text',
      [code,b.coins,b.maxUses,expires,account.user.id]
    );
    if(!rows.length){const old=await c.query('SELECT id::text,coins,max_uses FROM akira_admin_promos WHERE code=$1',[code]);if(old.rows.length && Number(old.rows[0].coins)===b.coins && Number(old.rows[0].max_uses)===b.maxUses)return {ok:true,id:old.rows[0].id,duplicate:true};throw fail('promo_code_already_exists',409)}
    await audit(c,account,'promo_created',rows[0].id);
    return{ok:true,id:rows[0].id,enabled:false}
   });send(200,result);return true;
  }
  if(adminTasks){
   ensureAdminWrite(account);
   if(b.action==='set_enabled'){
    if(!validId(b.id)||typeof b.enabled!=='boolean')throw fail('invalid_task');
    const result=await transaction(async c=>{
     const {rows}=await c.query('UPDATE akira_admin_tasks SET enabled=$1 WHERE id=$2 RETURNING id::text',[b.enabled,b.id]);
     if(!rows.length)throw fail('task_not_found',404);
     await audit(c,account,b.enabled?'task_enabled':'task_disabled',b.id);return{ok:true,id:rows[0].id}
    });send(200,result);return true;
   }
   if(!taskTypes.includes(b.action)||typeof b.title!=='string'||!b.title.trim()||b.title.length>100||
      !safeInt(b.coins,1,10000)||b.enabled!==false||!/^[a-zA-Z0-9_-]{16,80}$/.test(b.requestId||''))throw fail('invalid_task_configuration');
   const result=await transaction(async c=>{
    const {rows}=await c.query(
      'INSERT INTO akira_admin_tasks(action,title,coins,enabled,created_by,request_key) VALUES($1,$2,$3,false,$4,$5) ON CONFLICT(request_key) DO NOTHING RETURNING id::text',
      [b.action,b.title.trim(),b.coins,account.user.id,b.requestId]
    );
    if(!rows.length){const old=await c.query('SELECT id::text,action,title,coins FROM akira_admin_tasks WHERE request_key=$1',[b.requestId]);if(old.rows.length&&old.rows[0].action===b.action&&old.rows[0].title===b.title.trim()&&Number(old.rows[0].coins)===b.coins)return{ok:true,id:old.rows[0].id,duplicate:true};throw fail('request_conflict',409)}
    await audit(c,account,'task_created',rows[0].id);
    return{ok:true,id:rows[0].id,enabled:false}
   });send(200,result);return true;
  }
  if(redeem){
   const code=typeof b.code==='string'?b.code.trim().toUpperCase():'';
   if(!validCode(code))throw fail('invalid_promo_code');
   const result=await transaction(async c=>{
    const u=await c.query('SELECT id,is_banned FROM akira_users WHERE id=$1 FOR UPDATE',[account.user.id]);
    if(!u.rows.length||u.rows[0].is_banned)throw fail('account_ineligible',403);
    const {rows}=await c.query('SELECT * FROM akira_admin_promos WHERE code=$1 FOR UPDATE',[code]);
    const promo=rows[0];if(!promo)throw fail('promo_not_found',404);
    const prior=await c.query('SELECT coins FROM akira_promo_redemptions WHERE promo_id=$1 AND user_id=$2',[promo.id,account.user.id]);
    if(prior.rows.length){
     const balance=await c.query('SELECT balance::text FROM akira_wallets WHERE user_id=$1',[account.user.id]);
     return{ok:true,duplicate:true,amount:String(prior.rows[0].coins),balance:balance.rows[0]?.balance||'0'}
    }
    if(!promo.enabled||promo.expires_at&&new Date(promo.expires_at)<=new Date()||promo.redeemed_count>=promo.max_uses)
       throw fail('promo_not_available',403);
    const reward=await giveCoins(c,account.user.id,Number(promo.coins),'promo:'+promo.id,'promo_redeem');
    await c.query('INSERT INTO akira_promo_redemptions(promo_id,user_id,coins) VALUES($1,$2,$3)',[promo.id,account.user.id,promo.coins]);
    await c.query('UPDATE akira_admin_promos SET redeemed_count=redeemed_count+1 WHERE id=$1',[promo.id]);
    return{ok:true,duplicate:reward.duplicate,amount:String(promo.coins),balance:reward.balance}
   });send(200,result);return true;
  }
  if(claim){
   if(!validId(b.taskId))throw fail('invalid_task_id');
   const result=await transaction(async c=>{
    const u=await c.query('SELECT id,is_banned FROM akira_users WHERE id=$1 FOR UPDATE',[account.user.id]);
    if(!u.rows.length||u.rows[0].is_banned)throw fail('account_ineligible',403);
    const t=await c.query('SELECT * FROM akira_admin_tasks WHERE id=$1 FOR SHARE',[b.taskId]);
    const task=t.rows[0];if(!task||!task.enabled)throw fail('task_unavailable',403);
    const today=await c.query("SELECT (now() AT TIME ZONE 'UTC')::date::text AS day");
    const day=today.rows[0].day;
    const prior=await c.query('SELECT coins FROM akira_task_claims WHERE task_id=$1 AND user_id=$2 AND claim_day=$3',[task.id,account.user.id,day]);
    if(prior.rows.length){
     const balance=await c.query('SELECT balance::text FROM akira_wallets WHERE user_id=$1',[account.user.id]);
     return{ok:true,duplicate:true,amount:String(prior.rows[0].coins),balance:balance.rows[0]?.balance||'0'}
    }
    let verified=false;
    if(task.action==='daily_checkin'){
     // Both the current 7-day reward endpoint and the older daily check-in
     // are server-verified ways to complete this task; no client proof accepted.
     const proof=await c.query(
       "SELECT EXISTS(SELECT 1 FROM akira_daily_reward_claims WHERE user_id=$1 AND reward_date=$2::date) OR EXISTS(SELECT 1 FROM akira_wallet_transactions WHERE user_id=$1 AND reason='daily_checkin' AND reference_key=$3) AS completed",
       [account.user.id,day,'daily:'+account.user.id+':'+day]);
     verified=proof.rows[0]?.completed===true;
    }else if(task.action==='send_paid_gift'){
     const proof=await c.query("SELECT 1 FROM akira_control_gifts WHERE sender_id=$1 AND total>0 AND (created_at AT TIME ZONE 'UTC')::date=$2::date LIMIT 1",[account.user.id,day]);
     verified=Boolean(proof.rows.length);
    }else throw fail('task_configuration_invalid',503);
    if(!verified)throw fail('task_requirements_not_met',403);
    const reward=await giveCoins(c,account.user.id,Number(task.coins),'task:'+task.id+':'+day,'task_reward');
    await c.query('INSERT INTO akira_task_claims(task_id,user_id,claim_day,coins) VALUES($1,$2,$3,$4)',
      [task.id,account.user.id,day,task.coins]);
    return{ok:true,duplicate:reward.duplicate,amount:String(task.coins),balance:reward.balance}
   });send(200,result);return true;
  }
 }catch(error){
  if(!error.status)console.error('admin_economy_error',error.code||error.message);
  send(error.status||503,{error:error.status?error.message:'economy_unavailable'});
 }
 return true;
}
