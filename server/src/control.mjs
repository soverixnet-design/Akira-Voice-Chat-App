import { requireAdmin } from './admin.mjs';
import { authenticate } from './auth.mjs';
import { getPool } from './database.mjs';
// Keep the original server's content and economy panels when present.
async function optionalLiveModule(path) {
  try {return await import(path)}
  catch(err){
    if(err.code==='ERR_MODULE_NOT_FOUND' && String(err.message).includes(path.slice(2)))return {};
    throw err;
  }
}
const {adminContentRoutes: contentRoute}=await optionalLiveModule('./admin-content.mjs');
const {economyRoutes: economyRoute}=await optionalLiveModule('./admin-economy.mjs');
const adminContentRoutes=typeof contentRoute==='function'?contentRoute:async()=>false;
const economyRoutes=typeof economyRoute==='function'?economyRoute:async()=>false;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const kinds=['gift','frame','theme','entry','medal','vip','emoji','banner','notice','event'];
const DAILY_CHECKIN_COINS=100; // Server-owned reward; never use the client's amount.
const ident=v=>/^\d{1,18}$/.test(String(v??''));
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function validAsset(v){
  if(v==='')return true;
  if(typeof v!=='string'||v.length>300000)return false;
  if(/^https?:\/\/[^\s"'<>]+$/.test(v))return true;
  if(/^\/?assets\/[^\s"'<>]+$/.test(v))return true;
  if(/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v))return true;
  if(v.length<=32&&!/[<>"']/.test(v))return true;
  return false;
}
export async function body(req){let raw='';for await(const c of req){raw+=c;if(Buffer.byteLength(raw)>330000)throw fail('payload_too_large',413);}try{const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b;}catch{throw fail('invalid_json');}}
async function transaction(fn){const c=await getPool().connect();try{await c.query('BEGIN');const value=await fn(c);await c.query('COMMIT');return value;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
const audit=(c,a,action,target)=>c.query('INSERT INTO akira_admin_audit(actor_user_id,action,target_type,target_id) VALUES($1,$2,$3,$4)',[a.user.id,action,'control',String(target)]);
async function target(c,id){if(!ident(id))throw fail('invalid_user_id');const {rows}=await c.query('SELECT id,public_id,display_name FROM akira_users WHERE public_id=$1 FOR UPDATE',[id]);if(!rows.length)throw fail('user_not_found',404);return rows[0];}
export async function walletDelta(c,uid,delta,ref,reason){
 if(!Number.isSafeInteger(delta)||delta===0)throw fail('invalid_amount');
 await c.query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[uid]);
 const {rows}=await c.query('SELECT balance FROM akira_wallets WHERE user_id=$1 FOR UPDATE',[uid]);
 const prior=await c.query('SELECT delta,reason,balance_after FROM akira_wallet_transactions WHERE user_id=$1 AND reference_key=$2',[uid,ref]);
 if(prior.rows.length){const p=prior.rows[0];if(Number(p.delta)!==delta||p.reason!==reason)throw fail('request_conflict',409);return {balance:String(p.balance_after),duplicate:true};}
 const balance=Number(rows[0].balance)+delta;if(!Number.isSafeInteger(balance)||balance<0)throw fail('insufficient_balance',409);
 await c.query('UPDATE akira_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[uid,balance]);
 await c.query('INSERT INTO akira_wallet_transactions(user_id,delta,balance_after,reason,reference_key) VALUES($1,$2,$3,$4,$5)',[uid,delta,balance,reason,ref]);return{balance:String(balance),duplicate:false};
}
function requestKey(b){if(!/^[a-zA-Z0-9_-]{16,80}$/.test(b.requestId||''))throw fail('invalid_request_id');return b.requestId;}

async function queryRankings(db, type, period) {
  const p = ['day','week','month'].includes(period) ? period : 'week';
  const t = ['lucky','rich','charm','room','noble','play','recharge'].includes(type) ? type : 'lucky';
  if (t === 'room') {
    const {rows} = await db.query(
      `SELECT r.public_id::text AS id, r.name, r.cover_url AS pic,
              (COALESCE((SELECT count(*)::int FROM akira_room_members m WHERE m.room_id=r.id),1) * 100)::text AS score,
              'Room ID ' || r.public_id::text AS sub
       FROM akira_rooms r
       ORDER BY (SELECT count(*) FROM akira_room_members m WHERE m.room_id=r.id) DESC, r.id DESC
       LIMIT 20`
    );
    return rows;
  }
  let reasonFilter = "t.reason='game_win'";
  if (t === 'rich') reasonFilter = "t.delta < 0";
  else if (t === 'recharge') reasonFilter = "t.delta > 0 AND t.reason IN ('seller_received','admin_adjustment','diamond_exchange')";
  else if (t === 'play') reasonFilter = "t.reason IN ('game_win','game_bet')";
  if (t === 'charm') {
    const {rows} = await db.query(
      `SELECT u.public_id::text AS id, u.display_name AS name, u.avatar_url AS pic,
              COALESCE(d.balance, 0)::text AS score
       FROM akira_users u
       LEFT JOIN akira_control_diamonds d ON d.user_id=u.id
       WHERE u.is_banned=false
       ORDER BY COALESCE(d.balance,0) DESC, u.id ASC
       LIMIT 20`
    );
    return rows;
  }
  if (t === 'noble') {
    const {rows} = await db.query(
      `SELECT u.public_id::text AS id, u.display_name AS name, u.avatar_url AS pic,
              COALESCE(w.balance, 0)::text AS score
       FROM akira_users u
       LEFT JOIN akira_wallets w ON w.user_id=u.id
       WHERE u.is_banned=false
       ORDER BY COALESCE(w.balance,0) DESC, u.id ASC
       LIMIT 20`
    );
    return rows;
  }
  const {rows} = await db.query(
    `SELECT u.public_id::text AS id, u.display_name AS name, u.avatar_url AS pic,
            COALESCE(SUM(ABS(t.delta)), 0)::text AS score
     FROM akira_users u
     LEFT JOIN akira_wallet_transactions t ON t.user_id=u.id AND (${reasonFilter}) AND t.created_at>=date_trunc($1,now())
     LEFT JOIN akira_wallets w ON w.user_id=u.id
     WHERE u.is_banned=false
     GROUP BY u.id, u.public_id, u.display_name, u.avatar_url, w.balance
     ORDER BY COALESCE(SUM(ABS(t.delta)), 0) DESC, COALESCE(w.balance, 0) DESC, u.id ASC
     LIMIT 20`,
    [p]
  );
  return rows;
}

export async function controlRoutes(req,url,send){
 if(await adminContentRoutes(req,url,send))return true;
 if(await economyRoutes(req,url,send))return true;
 const path=url.pathname,publicPath=path.startsWith('/api/v1/community/');
 if(!publicPath&&!path.startsWith('/api/v1/control/'))return false;
 try{
  const db=getPool();let a,user;
  if(publicPath){user=await authenticate(req.headers.authorization);if(!user)throw fail('unauthorized',401);}
  else{a=await requireAdmin(req.headers.authorization);if(a.error)throw fail(a.error,a.status);user=a.user;}
  const section=path.split('/').at(-1);
  if(!publicPath&&section==='gift-policy'){
    if(a.role!=='super_admin')throw fail('super_admin_required',403);
    if(req.method==='GET'){
      const {rows}=await db.query('SELECT allow_self_gifts AS "allowSelfGifts",allow_other_gifts AS "allowOtherGifts" FROM akira_control_gift_policy WHERE id=1');
      send(200,rows[0]||{allowSelfGifts:true,allowOtherGifts:true});return true;
    }
    if(req.method!=='POST')throw fail('method_not_allowed',405);
    const b=await body(req);
    if(typeof b.allowSelfGifts!=='boolean'||typeof b.allowOtherGifts!=='boolean')throw fail('invalid_gift_policy');
    await db.query('INSERT INTO akira_control_gift_policy(id,allow_self_gifts,allow_other_gifts) VALUES(1,$1,$2) ON CONFLICT(id) DO UPDATE SET allow_self_gifts=excluded.allow_self_gifts,allow_other_gifts=excluded.allow_other_gifts',
      [b.allowSelfGifts,b.allowOtherGifts]);
    send(200,{ok:true,allowSelfGifts:b.allowSelfGifts,allowOtherGifts:b.allowOtherGifts});return true;
  }
  if(publicPath){
   if(req.method==='GET'&&section==='gift-policy'){
    const {rows}=await db.query('SELECT allow_self_gifts AS "allowSelfGifts", allow_other_gifts AS "allowOtherGifts" FROM akira_control_gift_policy WHERE id=1');
    send(200,rows[0]||{allowSelfGifts:true,allowOtherGifts:true});return true;
   }
   if(req.method==='GET'&&section==='user-cosmetics'){
    const id=url.searchParams.get('id')||'';
    if(!/^\d{6,18}$/.test(id))throw fail('invalid_user_id');
    const {rows}=await db.query(`SELECT c.kind,c.name,c.asset
      FROM akira_users u JOIN akira_control_inventory i ON i.user_id=u.id
      JOIN akira_control_catalog c ON c.id=i.item_id
      WHERE u.public_id=$1 AND u.is_banned=false AND i.equipped=true
        AND c.enabled=true AND c.kind IN ('frame','entry') LIMIT 5`,[id]);
    send(200,{items:rows});return true;
   }
   if(req.method==='GET'&&section==='catalog'){const {rows}=await db.query('SELECT id,kind,name,description,asset,price FROM akira_control_catalog WHERE enabled=true ORDER BY id DESC LIMIT 500');send(200,{items:rows});return true;}
   if(req.method==='GET'&&section==='sellers'){
    const {rows}=await db.query(`
      SELECT u.public_id::text AS id, u.display_name AS name, u.avatar_url AS pic,
             COALESCE(s.contact, 'Official Akira Seller') AS contact
      FROM akira_users u
      LEFT JOIN akira_control_sellers s ON s.user_id=u.id
      WHERE u.is_banned=false AND (COALESCE(s.enabled,false)=true OR COALESCE(u.is_seller,false)=true)
      ORDER BY u.public_id
    `);
    send(200,{items:rows,sellers:rows});return true;
   }
   if(req.method==='GET'&&section==='inventory'){const {rows}=await db.query('SELECT i.item_id,c.kind,c.name,c.asset,i.equipped FROM akira_control_inventory i JOIN akira_control_catalog c ON c.id=i.item_id WHERE i.user_id=$1',[user.id]);send(200,{items:rows});return true;}
   if(req.method==='POST'&&section==='buy'){
    const b=await body(req),key=requestKey(b);if(!ident(b.itemId))throw fail('invalid_item');
    const result=await transaction(async c=>{await c.query('SELECT id FROM akira_users WHERE id=$1 FOR UPDATE',[user.id]);const {rows}=await c.query('SELECT * FROM akira_control_catalog WHERE id=$1 AND enabled=true FOR SHARE',[b.itemId]);const item=rows[0];if(!item||!['frame','theme','entry','medal','vip'].includes(item.kind))throw fail('item_unavailable');const own=await c.query('SELECT 1 FROM akira_control_inventory WHERE user_id=$1 AND item_id=$2',[user.id,item.id]);if(own.rows.length)return{ok:true,owned:true};if(Number(item.price)>0)await walletDelta(c,user.id,-Number(item.price),'shop:'+item.id+':'+key,'store_purchase');await c.query('INSERT INTO akira_control_inventory(user_id,item_id) VALUES($1,$2)',[user.id,item.id]);return{ok:true};});send(200,result);return true;
   }
   if(req.method==='POST'&&section==='equip'){
    const b=await body(req);if(!ident(b.itemId))throw fail('invalid_item');await transaction(async c=>{await c.query('SELECT id FROM akira_users WHERE id=$1 FOR UPDATE',[user.id]);const {rows}=await c.query('SELECT c.kind FROM akira_control_inventory i JOIN akira_control_catalog c ON c.id=i.item_id WHERE i.user_id=$1 AND i.item_id=$2',[user.id,b.itemId]);if(!rows.length)throw fail('not_owned',403);await c.query('UPDATE akira_control_inventory SET equipped=false WHERE user_id=$1 AND item_id IN (SELECT id FROM akira_control_catalog WHERE kind=$2)',[user.id,rows[0].kind]);await c.query('UPDATE akira_control_inventory SET equipped=true WHERE user_id=$1 AND item_id=$2',[user.id,b.itemId]);});send(200,{ok:true});return true;
   }
   if(req.method==='GET'&&section==='balance'){const {rows}=await db.query('SELECT coalesce(w.balance,0)::text AS coins,coalesce(d.balance,0)::text AS diamonds FROM akira_users u LEFT JOIN akira_wallets w ON w.user_id=u.id LEFT JOIN akira_control_diamonds d ON d.user_id=u.id WHERE u.id=$1',[user.id]);send(200,rows[0]);return true;}
   if(req.method==='GET'&&section==='seller-wallet'){
    const {rows}=await db.query(`
      SELECT (COALESCE(u.is_seller,false) OR COALESCE(cs.enabled,false)) AS enabled,
             COALESCE(cs.contact,'') AS contact,
             COALESCE(sw.balance, w.balance, 0)::text AS balance
      FROM akira_users u
      LEFT JOIN akira_control_sellers cs ON cs.user_id=u.id
      LEFT JOIN akira_seller_wallets sw ON sw.user_id=u.id
      LEFT JOIN akira_wallets w ON w.user_id=u.id
      WHERE u.id=$1
    `,[user.id]);
    const r=rows[0]||{enabled:false,contact:'',balance:'0'};
    const tx=await db.query(`
      SELECT t.id, u.public_id::text AS recipient_id, u.display_name AS recipient_name, t.amount::text, t.created_at
      FROM akira_control_transfers t JOIN akira_users u ON u.id=t.recipient_id
      WHERE t.sender_id=$1 ORDER BY t.id DESC LIMIT 20
    `,[user.id]).catch(()=>({rows:[]}));
    send(200,{enabled:Boolean(r.enabled),contact:r.contact,balance:String(r.balance),transfers:tx.rows});return true;
   }
   if(req.method==='GET'&&section==='seller-recipient'){
    const id=url.searchParams.get('id')||'';if(!ident(id))throw fail('invalid_user_id');
    const {rows}=await db.query('SELECT public_id::text AS id,display_name AS name,avatar_url AS pic FROM akira_users WHERE public_id=$1 AND is_banned=false',[id]);
    if(!rows.length)throw fail('user_not_found',404);
    send(200,{user:rows[0]});return true;
   }
   if(req.method==='POST'&&section==='gift'){
    const b=await body(req),key=requestKey(b);
    const qty=b.quantity===undefined?1:b.quantity;
    if(!Number.isInteger(qty)||qty<1||qty>500)throw fail('invalid_gift_quantity');
    if(!ident(b.recipientId))throw fail('invalid_recipient');
    const result=await transaction(async c=>{
     await c.query('SELECT id FROM akira_users WHERE id=$1 FOR UPDATE',[user.id]);
     const prior=await c.query('SELECT total FROM akira_control_gifts WHERE sender_id=$1 AND request_key=$2',[user.id,key]);
     if(prior.rows.length){
      const w=await c.query('SELECT coalesce(balance,0)::text AS balance FROM akira_wallets WHERE user_id=$1',[user.id]);
      return{ok:true,duplicate:true,total:Number(prior.rows[0].total),balance:w.rows[0]?.balance||'0'};
     }
     let item=null;
     if(b.itemId&&ident(b.itemId)){
      const r=await c.query("SELECT id,name,price,asset FROM akira_control_catalog WHERE id=$1 AND enabled=true AND kind='gift' FOR SHARE",[b.itemId]);
      item=r.rows[0]||null;
     }
     if(!item&&typeof b.giftName==='string'&&b.giftName.trim()){
      const gName=b.giftName.trim().slice(0,100);
      const r=await c.query("SELECT id,name,price,asset FROM akira_control_catalog WHERE lower(name)=lower($1) AND kind='gift' AND enabled=true ORDER BY id LIMIT 1 FOR SHARE",[gName]);
      item=r.rows[0]||null;
     }
     if(!item)throw fail('gift_unavailable');
     const total=Number(item.price)*qty;
     if(!Number.isSafeInteger(total)||total<=0)throw fail('invalid_price');
     // No client-supplied luckyWin/price is authoritative. Luck-based payouts
     // require their own server-controlled draw and settlement ledger.
     const {rows:policyRows}=await c.query('SELECT allow_self_gifts,allow_other_gifts FROM akira_control_gift_policy WHERE id=1 FOR SHARE');
     const p=policyRows[0]||{allow_self_gifts:true,allow_other_gifts:true};
     const self=String(user.public_id)===String(b.recipientId);
     if((self&&!p.allow_self_gifts)||(!self&&!p.allow_other_gifts))throw fail('gift_target_disabled',403);
     const recipient=await c.query('SELECT id,public_id FROM akira_users WHERE public_id=$1 AND is_banned=false',[b.recipientId]);
     if(!recipient.rows.length)throw fail('recipient_not_found',404);
     const wd=await walletDelta(c,user.id,-total,'gift:'+key,'gift_sent');
     const recPublicId=Number(recipient.rows[0].public_id);
     await c.query('INSERT INTO akira_control_diamonds(user_id,balance) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET balance=akira_control_diamonds.balance+excluded.balance',[recipient.rows[0].id,total]);
     await c.query('INSERT INTO akira_control_gifts(sender_id,recipient_id,item_id,quantity,total,request_key) VALUES($1,$2,$3,$4,$5,$6)',[user.id,recPublicId,item.id,qty,total,key]);
     return{ok:true,total,luckyWin:0,balance:wd.balance};
    });send(200,result);return true;
   }
   if(req.method==='POST'&&section==='daily-checkin'){
    await body(req); // Drain and validate the request, but never trust its reward amount.
    const day=new Date().toISOString().slice(0,10);
    const r=await transaction(async c=>{
     await c.query('SELECT id FROM akira_users WHERE id=$1 FOR UPDATE',[user.id]);
     const prior=await c.query('SELECT delta,balance_after FROM akira_wallet_transactions WHERE user_id=$1 AND reference_key=$2 AND reason=$3',[user.id,'daily:'+user.id+':'+day,'daily_checkin']);
     if(prior.rows.length)return {ok:true,balance:String(prior.rows[0].balance_after),duplicate:true,amount:Number(prior.rows[0].delta)};
     const wd=await walletDelta(c,user.id,DAILY_CHECKIN_COINS,'daily:'+user.id+':'+day,'daily_checkin');
     return{ok:true,balance:wd.balance,duplicate:wd.duplicate,amount:DAILY_CHECKIN_COINS};
    });send(200,r);return true;
   }
   if(req.method==='POST'&&section==='room-reward'){
    // A room reward requires verified server participation and admin schedule.
    // Until that exists, reject self-awarded client coin amounts.
    throw fail('room_reward_not_available',403);
   }
   if(req.method==='POST'&&section==='transfer'){
    const b=await body(req),key=requestKey(b);if(!ident(b.recipientId)||!Number.isSafeInteger(b.amount)||b.amount<=0)throw fail('invalid_transfer');
    const r=await transaction(async c=>{
     const seller=await c.query('SELECT (COALESCE(u.is_seller,false) OR COALESCE(s.enabled,false)) AS ok FROM akira_users u LEFT JOIN akira_control_sellers s ON s.user_id=u.id WHERE u.id=$1 FOR SHARE',[user.id]);
     if(!seller.rows[0]?.ok)throw fail('seller_only',403);
     const recipient=await c.query('SELECT id FROM akira_users WHERE public_id=$1 AND is_banned=false',[b.recipientId]);if(!recipient.rows.length||String(recipient.rows[0].id)===String(user.id))throw fail('invalid_recipient');const rid=recipient.rows[0].id;
     await c.query('SELECT id FROM akira_users WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE',[[user.id,rid]]);
     const prior=await c.query('SELECT recipient_id,amount FROM akira_control_transfers WHERE sender_id=$1 AND request_key=$2',[user.id,key]);if(prior.rows.length){if(String(prior.rows[0].recipient_id)!==String(rid)||Number(prior.rows[0].amount)!==b.amount)throw fail('request_conflict',409);return{ok:true,duplicate:true};}
     const sw=await c.query('SELECT balance FROM akira_seller_wallets WHERE user_id=$1 FOR UPDATE',[user.id]).catch(()=>({rows:[]}));
     if(!sw.rows.length||Number(sw.rows[0].balance)<b.amount)throw fail('insufficient_seller_balance',409);
     const upd=await c.query('UPDATE akira_seller_wallets SET balance=balance-$2,updated_at=now() WHERE user_id=$1 RETURNING balance::text',[user.id,b.amount]);
     const sellerBalanceAfter=upd.rows[0].balance;
     await walletDelta(c,rid,b.amount,'transfer-in:'+user.id+':'+key,'seller_received');
     await c.query('INSERT INTO akira_control_transfers(sender_id,recipient_id,amount,request_key) VALUES($1,$2,$3,$4)',[user.id,rid,b.amount,key]);
     return{ok:true,sellerBalance:sellerBalanceAfter};
    });send(200,r);return true;
   }
   if(req.method==='GET'&&section==='exchange-rate'){const {rows}=await db.query('SELECT coins_per_100 FROM akira_control_exchange WHERE id=1');send(200,rows[0]);return true;}
   if(req.method==='POST'&&section==='exchange'){
    const b=await body(req),key=requestKey(b);if(!Number.isSafeInteger(b.diamonds)||b.diamonds<100||b.diamonds%100!==0)throw fail('use_multiples_of_100');
    const r=await transaction(async c=>{await c.query('SELECT id FROM akira_users WHERE id=$1 FOR UPDATE',[user.id]);const prior=await c.query('SELECT diamonds,coins FROM akira_control_exchanges WHERE user_id=$1 AND request_key=$2',[user.id,key]);if(prior.rows.length){if(Number(prior.rows[0].diamonds)!==b.diamonds)throw fail('request_conflict',409);return{ok:true,duplicate:true,coins:prior.rows[0].coins};}
    const rate=await c.query('SELECT coins_per_100 FROM akira_control_exchange WHERE id=1 FOR SHARE');const coins=b.diamonds/100*rate.rows[0].coins_per_100;if(!Number.isSafeInteger(coins))throw fail('amount_too_large');
    const debit=await c.query('UPDATE akira_control_diamonds SET balance=balance-$2 WHERE user_id=$1 AND balance>=$2 RETURNING balance',[user.id,b.diamonds]);if(!debit.rows.length)throw fail('insufficient_diamonds',409);
    await walletDelta(c,user.id,coins,'exchange:'+key,'diamond_exchange');await c.query('INSERT INTO akira_control_exchanges(user_id,request_key,diamonds,coins) VALUES($1,$2,$3,$4)',[user.id,key,b.diamonds,coins]);return{ok:true,coins};});send(200,r);return true;
   }
   if(req.method==='POST'&&section==='report'){const b=await body(req);if(!text(b.message,1000)||!ident(b.targetId))throw fail('invalid_report');await db.query('INSERT INTO akira_control_reports(user_id,target_id,message) VALUES($1,$2,$3)',[user.id,b.targetId,b.message]);send(201,{ok:true});return true;}
   if(req.method==='GET'&&section==='rankings'){
    const period=['day','week','month'].includes(url.searchParams.get('period'))?url.searchParams.get('period'):'week';
    const type=url.searchParams.get('type')||'lucky';
    const rows=await queryRankings(db,type,period);
    send(200,{items:rows,metric:type,period});return true;
   }
   if(req.method==='GET'&&section==='live-feed'){
    const wins=await db.query(`
      SELECT 'win:'||t.id AS eid, 'win' AS kind, u.public_id::text AS user_id, u.display_name AS name, u.avatar_url AS pic,
             t.delta::text AS amount,
             CASE WHEN t.reference_key LIKE '%jackpot%' THEN 'Jackpot Fruit' ELSE 'Food Wheel' END AS game,
             t.created_at
      FROM akira_wallet_transactions t
      JOIN akira_users u ON u.id=t.user_id
      WHERE t.reason='game_win' AND t.delta>0
      ORDER BY t.id DESC LIMIT 10
    `).catch(()=>({rows:[]}));
    const gifts=await db.query(`
      SELECT 'gift:'||g.id AS eid, 'gift' AS kind, s.public_id::text AS user_id, s.display_name AS name, s.avatar_url AS pic,
             g.total::text AS amount, g.quantity,
             COALESCE(c.name,'Gift') AS item_name, COALESCE(c.asset,'🎁') AS item_icon,
             COALESCE(r.display_name,'ID '||g.recipient_id::text) AS recipient_name,
             g.recipient_id::text AS recipient_id, g.created_at
      FROM akira_control_gifts g
      JOIN akira_users s ON s.id=g.sender_id
      LEFT JOIN akira_users r ON r.public_id=g.recipient_id
      LEFT JOIN akira_control_catalog c ON c.id=g.item_id
      ORDER BY g.id DESC LIMIT 10
    `).catch(()=>({rows:[]}));
    const items=[...wins.rows,...gifts.rows].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,12);
    send(200,{items});return true;
   }
   await db.query(`
     CREATE TABLE IF NOT EXISTS akira_follows (
       follower_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
       target_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       PRIMARY KEY (follower_id, target_id)
     );
     CREATE TABLE IF NOT EXISTS akira_messages (
       id BIGSERIAL PRIMARY KEY,
       sender_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
       recipient_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
       body TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS akira_blocks (
       user_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
       blocked_id BIGINT NOT NULL REFERENCES akira_users(id) ON DELETE CASCADE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       PRIMARY KEY (user_id, blocked_id)
     );
   `).catch(()=>{});
   if(req.method==='GET'&&section==='user-profile'){
    const pid=url.searchParams.get('id')||String(user.public_id);
    if(!ident(pid))throw fail('invalid_user_id');
    const {rows}=await db.query(`
      SELECT u.id, u.public_id::text AS public_id, u.display_name AS name, u.avatar_url AS pic,
             COALESCE(u.bio,'') AS bio, COALESCE(u.country_code,'') AS country,
             (SELECT count(*)::int FROM akira_follows WHERE target_id=u.id) AS followers_count,
             (SELECT count(*)::int FROM akira_follows WHERE follower_id=u.id) AS following_count,
             EXISTS(SELECT 1 FROM akira_follows WHERE follower_id=$2 AND target_id=u.id) AS is_following,
             EXISTS(SELECT 1 FROM akira_blocks WHERE user_id=$2 AND blocked_id=u.id) AS is_blocked,
             COALESCE((SELECT sum(total)::bigint FROM akira_control_gifts WHERE sender_id=u.id),0)::text AS sent_coins,
             COALESCE((SELECT balance FROM akira_control_diamonds WHERE user_id=u.id),0)::text AS recv_diamonds,
             (SELECT r.public_id::text FROM akira_rooms r WHERE r.owner_id=u.id ORDER BY r.id DESC LIMIT 1) AS room_id,
             (SELECT r.name FROM akira_rooms r WHERE r.owner_id=u.id ORDER BY r.id DESC LIMIT 1) AS room_name
      FROM akira_users u
      WHERE u.public_id=$1 AND u.is_banned=false
      LIMIT 1
    `,[pid,user.id]);
    if(!rows.length)throw fail('user_not_found',404);
    const r=rows[0];
    send(200,{user:{
      id:r.public_id,name:r.name,pic:r.pic,bio:r.bio,country:r.country,
      followersCount:Number(r.followers_count||0),followingCount:Number(r.following_count||0),
      isFollowing:Boolean(r.is_following),isBlocked:Boolean(r.is_blocked),
      sentCoins:Number(r.sent_coins||0),recvDiamonds:Number(r.recv_diamonds||0),
      roomId:r.room_id||null,roomName:r.room_name||null
    }});return true;
   }
   if(req.method==='POST'&&section==='follow'){
    const b=await body(req);
    const tid=String(b.targetId||'');
    if(!ident(tid))throw fail('invalid_user_id');
    const tRes=await db.query('SELECT id,public_id::text AS id_str,display_name AS name FROM akira_users WHERE public_id=$1 AND is_banned=false',[tid]);
    if(!tRes.rows.length)throw fail('user_not_found',404);
    const targetUser=tRes.rows[0];
    if(String(targetUser.id)===String(user.id))throw fail('cannot_follow_self');
    const ex=await db.query('SELECT 1 FROM akira_follows WHERE follower_id=$1 AND target_id=$2',[user.id,targetUser.id]);
    let following=false;
    if(b.action==='follow'||(!b.action&&!ex.rows.length)){
     await db.query('INSERT INTO akira_follows(follower_id,target_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.id,targetUser.id]);
     following=true;
    }else{
     await db.query('DELETE FROM akira_follows WHERE follower_id=$1 AND target_id=$2',[user.id,targetUser.id]);
     following=false;
    }
    const counts=await db.query(`
      SELECT (SELECT count(*)::int FROM akira_follows WHERE target_id=$1) AS target_followers,
             (SELECT count(*)::int FROM akira_follows WHERE follower_id=$1) AS target_following,
             (SELECT count(*)::int FROM akira_follows WHERE follower_id=$2) AS my_following,
             (SELECT count(*)::int FROM akira_follows WHERE target_id=$2) AS my_followers
    `,[targetUser.id,user.id]);
    const c=counts.rows[0]||{};
    send(200,{ok:true,following,followersCount:Number(c.target_followers||0),followingCount:Number(c.target_following||0),myFollowingCount:Number(c.my_following||0),myFollowersCount:Number(c.my_followers||0)});return true;
   }
   if(req.method==='GET'&&section==='follows'){
    const pid=url.searchParams.get('userId')||String(user.public_id);
    let uid=user.id;
    if(ident(pid)&&pid!==String(user.public_id)){
     const uRes=await db.query('SELECT id FROM akira_users WHERE public_id=$1',[pid]);
     if(uRes.rows[0])uid=uRes.rows[0].id;
    }
    const [flw,flg]=await Promise.all([
     db.query(`SELECT u.public_id::text AS id, u.display_name AS name, u.avatar_url AS pic, COALESCE(u.bio,'') AS bio,
                      EXISTS(SELECT 1 FROM akira_follows f2 WHERE f2.follower_id=$2 AND f2.target_id=u.id) AS is_following
               FROM akira_follows f JOIN akira_users u ON u.id=f.follower_id
               WHERE f.target_id=$1 AND u.is_banned=false ORDER BY f.created_at DESC LIMIT 100`,[uid,user.id]),
     db.query(`SELECT u.public_id::text AS id, u.display_name AS name, u.avatar_url AS pic, COALESCE(u.bio,'') AS bio,
                      EXISTS(SELECT 1 FROM akira_follows f2 WHERE f2.follower_id=$2 AND f2.target_id=u.id) AS is_following
               FROM akira_follows f JOIN akira_users u ON u.id=f.target_id
               WHERE f.follower_id=$1 AND u.is_banned=false ORDER BY f.created_at DESC LIMIT 100`,[uid,user.id])
    ]);
    send(200,{followers:flw.rows,following:flg.rows,followersCount:flw.rows.length,followingCount:flg.rows.length});return true;
   }
   if(req.method==='GET'&&section==='messages'){
    const peerPublicId=url.searchParams.get('peerId')||'';
    if(peerPublicId){
     if(!ident(peerPublicId))throw fail('invalid_user_id');
     const pRes=await db.query('SELECT id,public_id::text AS public_id,display_name AS name,avatar_url AS pic,COALESCE(bio,\'\') AS bio FROM akira_users WHERE public_id=$1',[peerPublicId]);
     if(!pRes.rows.length)throw fail('user_not_found',404);
     const peer=pRes.rows[0];
     const {rows}=await db.query(`
       SELECT m.id, s.public_id::text AS "senderId", r.public_id::text AS "recipientId",
              m.body, m.created_at AS "createdAt", (m.sender_id=$1) AS mine
       FROM akira_messages m
       JOIN akira_users s ON s.id=m.sender_id
       JOIN akira_users r ON r.id=m.recipient_id
       WHERE (m.sender_id=$1 AND m.recipient_id=$2) OR (m.sender_id=$2 AND m.recipient_id=$1)
       ORDER BY m.id ASC LIMIT 120
     `,[user.id,peer.id]);
     send(200,{peer:{id:peer.public_id,name:peer.name,pic:peer.pic,bio:peer.bio},messages:rows});return true;
    }
    const {rows}=await db.query(`
      SELECT DISTINCT ON (peer_uid)
             u.public_id::text AS "peerId", u.display_name AS name, u.avatar_url AS pic,
             m.body AS "lastBody", m.created_at AS "createdAt", (m.sender_id=$1) AS mine
      FROM (
        SELECT id, sender_id, recipient_id, body, created_at,
               CASE WHEN sender_id=$1 THEN recipient_id ELSE sender_id END AS peer_uid
        FROM akira_messages
        WHERE sender_id=$1 OR recipient_id=$1
      ) m
      JOIN akira_users u ON u.id=m.peer_uid
      WHERE u.is_banned=false
        AND NOT EXISTS(SELECT 1 FROM akira_blocks b WHERE b.user_id=$1 AND b.blocked_id=u.id)
      ORDER BY peer_uid, m.id DESC
    `,[user.id]);
    rows.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    send(200,{threads:rows});return true;
   }
   if(req.method==='POST'&&section==='messages'){
    const b=await body(req);
    const rid=String(b.recipientId||'');
    const msgBody=typeof b.body==='string'?b.body.trim():'';
    if(!ident(rid)||!msgBody||msgBody.length>1000)throw fail('invalid_message');
    const rRes=await db.query('SELECT id,public_id::text AS public_id,display_name AS name,avatar_url AS pic FROM akira_users WHERE public_id=$1 AND is_banned=false',[rid]);
    if(!rRes.rows.length)throw fail('user_not_found',404);
    const rec=rRes.rows[0];
    const blk=await db.query('SELECT 1 FROM akira_blocks WHERE (user_id=$1 AND blocked_id=$2) OR (user_id=$2 AND blocked_id=$1)',[user.id,rec.id]);
    if(blk.rows.length)throw fail('user_blocked',403);
    const mutual=await db.query('SELECT count(*)::int AS matches FROM akira_follows WHERE (follower_id=$1 AND target_id=$2) OR (follower_id=$2 AND target_id=$1)',[user.id,rec.id]);
    if(Number(mutual.rows[0]?.matches)!==2)throw fail('mutual_follow_required',403);
    const ins=await db.query('INSERT INTO akira_messages(sender_id,recipient_id,body) VALUES($1,$2,$3) RETURNING id,body,created_at AS "createdAt"',[user.id,rec.id,msgBody]);
    send(201,{ok:true,message:{id:ins.rows[0].id,senderId:String(user.public_id),recipientId:rec.public_id,body:ins.rows[0].body,createdAt:ins.rows[0].createdAt,mine:true}});return true;
   }
   if(req.method==='POST'&&section==='block'){
    const b=await body(req);
    const tid=String(b.targetId||'');
    if(!ident(tid))throw fail('invalid_user_id');
    const tRes=await db.query('SELECT id FROM akira_users WHERE public_id=$1',[tid]);
    if(!tRes.rows.length)throw fail('user_not_found',404);
    const targetUid=tRes.rows[0].id;
    const ex=await db.query('SELECT 1 FROM akira_blocks WHERE user_id=$1 AND blocked_id=$2',[user.id,targetUid]);
    let blocked=false;
    if(!ex.rows.length){
     await db.query('INSERT INTO akira_blocks(user_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.id,targetUid]);
     await db.query('DELETE FROM akira_follows WHERE (follower_id=$1 AND target_id=$2) OR (follower_id=$2 AND target_id=$1)',[user.id,targetUid]);
     blocked=true;
    }else{
     await db.query('DELETE FROM akira_blocks WHERE user_id=$1 AND blocked_id=$2',[user.id,targetUid]);
     blocked=false;
    }
    send(200,{ok:true,blocked});return true;
   }
   throw fail('not_found',404);
  }
  const reads=['me','overview','users','rooms','wallet','sellers','seller-funds','catalog','roles','audit','reports','games','rewards','settings','deletion-requests'];
  if(req.method==='GET'&&reads.includes(section)){
  if(section==='deletion-requests'&&a.role!=='super_admin')throw fail('super_admin_required',403);
   const q=(url.searchParams.get('q')||'').slice(0,100),offset=Math.max(0,Math.min(100000,parseInt(url.searchParams.get('page')||'0')||0))*50;let rows=[];
   if(section==='me'){send(200,{user:{id:String(user.public_id),name:user.display_name},role:a.role});return true;}
   if(section==='overview'){({rows}=await db.query("SELECT (SELECT count(*)::int FROM akira_users) users,(SELECT count(*)::int FROM akira_rooms) rooms,(SELECT count(*)::int FROM akira_control_reports WHERE status='open') reports,(SELECT coalesce(sum(balance),0)::text FROM akira_wallets) coins"));send(200,rows[0]);return true;}
   if(section==='users')({rows}=await db.query('SELECT u.public_id::text AS id,u.display_name AS name,u.bio,u.is_banned,coalesce(w.balance,0)::text AS coins,coalesce(d.balance,0)::text AS diamonds FROM akira_users u LEFT JOIN akira_wallets w ON w.user_id=u.id LEFT JOIN akira_control_diamonds d ON d.user_id=u.id WHERE u.display_name ILIKE $1 OR u.public_id::text ILIKE $1 ORDER BY u.id DESC LIMIT 51 OFFSET $2',['%'+q+'%',offset]));
   if(section==='rooms')({rows}=await db.query('SELECT r.public_id::text AS id,r.name,r.description,r.seat_count,r.is_locked,u.public_id::text AS owner_id FROM akira_rooms r JOIN akira_users u ON u.id=r.owner_id WHERE r.name ILIKE $1 OR r.public_id::text ILIKE $1 ORDER BY r.id DESC LIMIT 51 OFFSET $2',['%'+q+'%',offset]));
   if(section==='wallet')({rows}=await db.query('SELECT t.id,u.public_id::text AS user_id,t.delta::text,t.balance_after::text,t.reason,t.reference_key,t.created_at FROM akira_wallet_transactions t JOIN akira_users u ON u.id=t.user_id WHERE ($1=\'\' OR u.public_id::text=$1) ORDER BY t.id DESC LIMIT 51 OFFSET $2',[q,offset]));
   if(section==='sellers')({rows}=await db.query('SELECT u.public_id::text AS id,u.display_name AS name,COALESCE(s.contact,\'Official Seller\') AS contact,COALESCE(s.enabled,u.is_seller,false) AS enabled,COALESCE(sw.balance,w.balance,0)::text AS balance FROM akira_users u LEFT JOIN akira_control_sellers s ON s.user_id=u.id LEFT JOIN akira_seller_wallets sw ON sw.user_id=u.id LEFT JOIN akira_wallets w ON w.user_id=u.id WHERE s.user_id IS NOT NULL OR COALESCE(u.is_seller,false)=true ORDER BY u.id LIMIT 51 OFFSET $1',[offset]));
   if(section==='seller-funds'){
    ({rows}=await db.query(`
      SELECT f.id, s.public_id::text AS seller_id, s.display_name AS seller_name,
             adm.public_id::text AS admin_id, f.delta::text, f.balance_after::text,
             f.reason, f.reference_key, f.created_at
      FROM akira_seller_funding_audit f
      JOIN akira_users s ON s.id=f.seller_user_id
      LEFT JOIN akira_users adm ON adm.id=f.admin_user_id
      WHERE ($1='' OR s.public_id::text=$1)
      ORDER BY f.id DESC LIMIT 51 OFFSET $2
    `,[q,offset]).catch(()=>({rows:[]})));
   }
   if(section==='catalog')({rows}=await db.query('SELECT * FROM akira_control_catalog WHERE name ILIKE $1 ORDER BY id DESC LIMIT 51 OFFSET $2',['%'+q+'%',offset]));
   if(section==='roles')({rows}=await db.query('SELECT u.public_id::text AS id,u.display_name AS name,r.role FROM akira_admin_roles r JOIN akira_users u ON u.id=r.user_id ORDER BY u.id LIMIT 51 OFFSET $1',[offset]));
   if(section==='audit')({rows}=await db.query('SELECT a.id,u.public_id::text AS actor_id,a.action,a.target_id,a.created_at FROM akira_admin_audit a JOIN akira_users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 51 OFFSET $1',[offset]));
   if(section==='reports')({rows}=await db.query('SELECT r.id,u.public_id::text AS reporter_id,r.target_id,r.message,r.status,r.created_at FROM akira_control_reports r JOIN akira_users u ON u.id=r.user_id ORDER BY r.id DESC LIMIT 51 OFFSET $1',[offset]));
   if(section==='deletion-requests')({rows}=await db.query(
     'SELECT u.public_id::text AS "publicId",u.display_name AS "displayName",d.reason,d.status,d.requested_at AS "requestedAt" FROM akira_account_deletion_requests d JOIN akira_users u ON u.id=d.user_id ORDER BY d.requested_at DESC LIMIT 51 OFFSET $1',[offset]
   ));
   if(section==='settings')({rows}=await db.query('SELECT id,coins_per_100 FROM akira_control_exchange'));
   if(section==='games')({rows}=await db.query('SELECT game,enabled FROM akira_control_games ORDER BY game'));
   if(section==='rewards')({rows}=await db.query('SELECT id,name,starts_at,ends_at,amount::text,winners,status FROM akira_control_rewards ORDER BY id DESC LIMIT 51 OFFSET $1',[offset]));
   send(200,{items:rows.slice(0,50),hasMore:rows.length>50});return true;
  }
  if(req.method!=='POST')throw fail('not_found',404);
  if(!['super_admin','admin'].includes(a.role))throw fail('admin_required',403);
  if(['wallet','roles','sellers','seller-funds','games','rewards','pay-reward','settings'].includes(section)&&a.role!=='super_admin')throw fail('super_admin_required',403);
  const b=await body(req);
  const result=await transaction(async c=>{
   if(section==='users'){
    const u=await target(c,b.id);if(!text(b.name,80)||typeof b.bio!=='string'||b.bio.length>500||typeof b.is_banned!=='boolean')throw fail('invalid_user');
    const roles=await c.query('SELECT role FROM akira_admin_roles WHERE user_id=$1',[u.id]);if(b.is_banned&&(roles.rows.length||String(u.id)===String(user.id)))throw fail('protected_admin',403);
    await c.query('UPDATE akira_users SET display_name=$1,bio=$2,is_banned=$3,updated_at=now() WHERE id=$4',[b.name.trim(),b.bio,b.is_banned,u.id]);if(b.is_banned)await c.query('DELETE FROM akira_sessions WHERE user_id=$1',[u.id]);
   }else if(section==='rooms'){
    if(!ident(b.id)||!text(b.name,100)||typeof b.description!=='string'||b.description.length>500||![5,10,12].includes(b.seat_count)||typeof b.is_locked!=='boolean')throw fail('invalid_room');
    const r=await c.query('UPDATE akira_rooms SET name=$1,description=$2,seat_count=$3,is_locked=$4,updated_at=now() WHERE public_id=$5 RETURNING id',[b.name.trim(),b.description,b.seat_count,b.is_locked,b.id]);if(!r.rows.length)throw fail('room_not_found',404);
   }else if(section==='wallet'){
    const key=requestKey(b);
    // Serialize this admin's requests, even when retries target different IDs.
    await c.query('SELECT id FROM akira_users WHERE id=$1 FOR UPDATE',[user.id]);
    const u=await target(c,b.id);
    const reason=text(b.reason,120)?b.reason.trim():'Admin recharge';
    const coinDelta=Number(b.delta||0);
    const diaDelta=Number(b.diamonds||0);
    if(!Number.isSafeInteger(coinDelta)||!Number.isSafeInteger(diaDelta)||(coinDelta===0&&diaDelta===0))throw fail('invalid_amount');
    const prior=await c.query('SELECT target_user_id,coin_delta,diamond_delta,coin_balance_after,diamond_balance_after FROM akira_control_admin_wallet_requests WHERE admin_user_id=$1 AND request_key=$2',[user.id,key]);
    if(prior.rows.length){
     const p=prior.rows[0];
     if(String(p.target_user_id)!==String(u.id)||Number(p.coin_delta)!==coinDelta||Number(p.diamond_delta)!==diaDelta)throw fail('request_conflict',409);
     return {ok:true,duplicate:true,balance:String(p.coin_balance_after),diamonds:String(p.diamond_balance_after)};
    }
    let coinBalance;
    if(coinDelta!==0){
     coinBalance=(await walletDelta(c,u.id,coinDelta,'admin:'+user.id+':'+key,'admin_adjustment')).balance;
    }else{
     await c.query('INSERT INTO akira_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[u.id]);
     const w=await c.query('SELECT balance::text FROM akira_wallets WHERE user_id=$1 FOR UPDATE',[u.id]);
     coinBalance=w.rows[0].balance;
    }
    await c.query('INSERT INTO akira_control_diamonds(user_id,balance) VALUES($1,0) ON CONFLICT DO NOTHING',[u.id]);
    const d=await c.query('SELECT balance FROM akira_control_diamonds WHERE user_id=$1 FOR UPDATE',[u.id]);
    const diamondBalance=Number(d.rows[0].balance)+diaDelta;
    if(!Number.isSafeInteger(diamondBalance)||diamondBalance<0)throw fail('insufficient_diamonds',409);
    if(diaDelta!==0)await c.query('UPDATE akira_control_diamonds SET balance=$2 WHERE user_id=$1',[u.id,diamondBalance]);
    await c.query('INSERT INTO akira_control_admin_wallet_requests(admin_user_id,request_key,target_user_id,coin_delta,diamond_delta,coin_balance_after,diamond_balance_after) VALUES($1,$2,$3,$4,$5,$6,$7)',[user.id,key,u.id,coinDelta,diaDelta,coinBalance,diamondBalance]);
    await audit(c,a,'wallet:'+coinDelta+':dia:'+diaDelta+':'+reason,b.id);
    return {ok:true,duplicate:false,balance:String(coinBalance),diamonds:String(diamondBalance)};
   }else if(section==='roles'){
    const u=await target(c,b.id),existing=await c.query('SELECT role FROM akira_admin_roles WHERE user_id=$1 FOR UPDATE',[u.id]);if(String(u.id)===String(user.id)||existing.rows[0]?.role==='super_admin')throw fail('protected_super_admin',403);if(!['admin','manager','moderator','remove'].includes(b.role))throw fail('invalid_role');
    if(b.role==='remove')await c.query('DELETE FROM akira_admin_roles WHERE user_id=$1',[u.id]);else await c.query('INSERT INTO akira_admin_roles(user_id,role) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role',[u.id,b.role]);
   }else if(section==='sellers'){
    const u=await target(c,b.id);const contact=text(b.contact,200)?b.contact.trim():'Official Akira Seller';if(typeof b.enabled!=='boolean')throw fail('invalid_seller');
    await c.query('INSERT INTO akira_control_sellers(user_id,contact,enabled) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET contact=excluded.contact,enabled=excluded.enabled',[u.id,contact,b.enabled]);
    await c.query('UPDATE akira_users SET is_seller=$1,updated_at=now() WHERE id=$2',[b.enabled,u.id]).catch(()=>{});
    await c.query('INSERT INTO akira_seller_wallets(user_id,balance,enabled) VALUES($1,0,$2) ON CONFLICT(user_id) DO UPDATE SET enabled=$2,updated_at=now()',[u.id,b.enabled]);
   }else if(section==='seller-funds'){
    const key=requestKey(b);
    await c.query('SELECT id FROM akira_users WHERE id=$1 FOR UPDATE',[user.id]);
    const u=await target(c,b.id);
    const reason=text(b.reason,120)?b.reason.trim():'Admin seller funding';
    if(!Number.isSafeInteger(b.delta)||b.delta===0)throw fail('invalid_seller_funding');
    const prior=await c.query('SELECT target_user_id,delta,balance_after FROM akira_control_admin_seller_funding_requests WHERE admin_user_id=$1 AND request_key=$2',[user.id,key]);
    if(prior.rows.length){
     const p=prior.rows[0];
     if(String(p.target_user_id)!==String(u.id)||Number(p.delta)!==b.delta)throw fail('request_conflict',409);
     return {ok:true,duplicate:true,balance:String(p.balance_after)};
    }
    await c.query('INSERT INTO akira_control_sellers(user_id,contact,enabled) VALUES($1,$2,true) ON CONFLICT(user_id) DO UPDATE SET enabled=true',[u.id,'Official Akira Seller']).catch(()=>{});
    await c.query('UPDATE akira_users SET is_seller=true,updated_at=now() WHERE id=$1',[u.id]).catch(()=>{});
    await c.query('INSERT INTO akira_seller_wallets(user_id,balance,enabled) VALUES($1,0,true) ON CONFLICT(user_id) DO UPDATE SET enabled=true,updated_at=now()',[u.id]);
    const sw=await c.query('SELECT balance FROM akira_seller_wallets WHERE user_id=$1 FOR UPDATE',[u.id]);
    const next=Number(sw.rows[0]?.balance||0)+b.delta;
    if(!Number.isSafeInteger(next)||next<0)throw fail('insufficient_seller_balance',409);
    await c.query('UPDATE akira_seller_wallets SET balance=$2,updated_at=now() WHERE user_id=$1',[u.id,next]);
    await c.query('INSERT INTO akira_control_admin_seller_funding_requests(admin_user_id,request_key,target_user_id,delta,balance_after) VALUES($1,$2,$3,$4,$5)',[user.id,key,u.id,b.delta,next]);
    await c.query('INSERT INTO akira_seller_funding_audit(seller_user_id,admin_user_id,delta,balance_after,reason,reference_key) VALUES($1,$2,$3,$4,$5,$6)',[u.id,user.id,b.delta,next,reason,key]).catch(()=>{});
    await audit(c,a,'seller-funds:'+b.delta+':'+reason,b.id);
    return {ok:true,balance:String(next)};
   }else if(section==='catalog'){
    if(!kinds.includes(b.kind)||!text(b.name,100)||typeof b.description!=='string'||b.description.length>2000||!validAsset(b.asset)||!Number.isSafeInteger(b.price)||b.price<0||typeof b.enabled!=='boolean')throw fail('invalid_catalog_item');
    if(b.id){if(!ident(b.id))throw fail('invalid_item');const old=await c.query('SELECT kind FROM akira_control_catalog WHERE id=$1 FOR UPDATE',[b.id]);if(!old.rows.length)throw fail('item_not_found',404);if(old.rows[0].kind!==b.kind)throw fail('item_kind_cannot_change');await c.query('UPDATE akira_control_catalog SET name=$1,description=$2,asset=$3,price=$4,enabled=$5 WHERE id=$6',[b.name,b.description,b.asset,b.price,b.enabled,b.id]);}
    else{const r=await c.query('INSERT INTO akira_control_catalog(kind,name,description,asset,price,enabled) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[b.kind,b.name,b.description,b.asset,b.price,b.enabled]);b.id=r.rows[0].id;}
   }else if(section==='reports'){
    if(!ident(b.id)||!['open','resolved','dismissed'].includes(b.status))throw fail('invalid_report');await c.query('UPDATE akira_control_reports SET status=$1 WHERE id=$2',[b.status,b.id]);
   }else if(section==='settings'){
    if(!Number.isInteger(b.coins_per_100)||b.coins_per_100<1||b.coins_per_100>100)throw fail('invalid_exchange_rate');await c.query('UPDATE akira_control_exchange SET coins_per_100=$1 WHERE id=1',[b.coins_per_100]);b.id=1;
   }else if(section==='games'){
    if(!['food-wheel','jackpot-fruit'].includes(b.game)||typeof b.enabled!=='boolean')throw fail('invalid_game');await c.query('UPDATE akira_control_games SET enabled=$1 WHERE game=$2',[b.enabled,b.game]);b.id=b.game;
   }else if(section==='rewards'){
    if(!text(b.name,100)||!Number.isSafeInteger(b.amount)||b.amount<=0||!Number.isInteger(b.winners)||b.winners<1||b.winners>10||!Number.isFinite(Date.parse(b.starts_at))||!Number.isFinite(Date.parse(b.ends_at))||Date.parse(b.ends_at)<=Date.parse(b.starts_at))throw fail('invalid_reward');
    const r=await c.query('INSERT INTO akira_control_rewards(name,starts_at,ends_at,amount,winners) VALUES($1,$2,$3,$4,$5) RETURNING id',[b.name,b.starts_at,b.ends_at,b.amount,b.winners]);b.id=r.rows[0].id;
   }else if(section==='pay-reward'){
    if(!ident(b.id))throw fail('invalid_reward');const {rows}=await c.query('SELECT * FROM akira_control_rewards WHERE id=$1 AND ends_at<=now() FOR UPDATE',[b.id]);const reward=rows[0];if(!reward)throw fail('reward_not_ended');if(reward.status==='paid')return{ok:true,duplicate:true};
    const winners=await c.query("SELECT user_id,sum(delta) score FROM akira_wallet_transactions WHERE reason='game_win' AND created_at>=$1 AND created_at<$2 GROUP BY user_id ORDER BY sum(delta) DESC,user_id LIMIT $3",[reward.starts_at,reward.ends_at,reward.winners]);
    if(!winners.rows.length)throw fail('no_eligible_winners');
    for(const w of [...winners.rows].sort((x,y)=>Number(x.user_id)-Number(y.user_id))){await walletDelta(c,w.user_id,Number(reward.amount),'reward:'+reward.id,'ranking_reward');await c.query('INSERT INTO akira_control_reward_winners(reward_id,user_id,score,amount) VALUES($1,$2,$3,$4)',[reward.id,w.user_id,w.score,reward.amount]);}
    await c.query("UPDATE akira_control_rewards SET status='paid' WHERE id=$1",[reward.id]);
   }else throw fail('not_found',404);
   await audit(c,a,section+'.update',b.id||b.game||'');return{ok:true};
  });send(200,result);
 }catch(e){if(!e.status)console.error('control_failed',e.code||e.message);send(e.status||503,{error:e.status?e.message:'service_unavailable'});}return true;
}
