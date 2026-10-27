import { requireAdmin } from './admin.mjs';
import { authenticate } from './auth.mjs';
import { getPool } from './database.mjs';

const kinds = new Set(['banner','notice','legal']);
const fail = (message,status=400)=>Object.assign(new Error(message),{status});
const goodAsset = v => typeof v==='string' && v.length<=280000 &&
  (v==='' || /^https:\/\/[^\s"'<>]+$/.test(v) ||
   /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v));
const validTime = x => x===null || (typeof x==='string' && Number.isFinite(Date.parse(x)));
async function getBody(req){
  let raw='';
  for await(const chunk of req){
    raw+=chunk;
    if(Buffer.byteLength(raw)>330000)throw fail('payload_too_large',413);
  }
  try{
    const value=JSON.parse(raw);
    if(!value || typeof value!=='object' || Array.isArray(value))throw Error();
    return value;
  }catch{throw fail('invalid_json',400)}
}
function clean(item){
  if(!kinds.has(item.kind))throw fail('invalid_content_kind');
  if(typeof item.title!=='string'||!item.title.trim()||item.title.length>100)throw fail('invalid_title');
  if(typeof item.body!=='string'||item.body.length>10000)throw fail('invalid_content_body');
  if(!goodAsset(item.asset||''))throw fail('invalid_content_asset');
  if(typeof item.enabled!=='boolean')throw fail('invalid_enabled');
  const from=item.startsAt??null,to=item.endsAt??null;
  if(!validTime(from)||!validTime(to))throw fail('invalid_schedule');
  if(from&&to&&Date.parse(to)<=Date.parse(from))throw fail('invalid_schedule');
  return {
    kind:item.kind,title:item.title.trim(),body:item.body,
    asset:item.asset||'',enabled:item.enabled,
    from:from?new Date(from).toISOString():null,
    to:to?new Date(to).toISOString():null
  };
}


const supportPath = p => p==='/api/v1/admin/support'||p==='/api/v1/community/support';
async function supportRoutes(req,url,send){
 if(!supportPath(url.pathname))return false;
 const isAdmin=url.pathname==='/api/v1/admin/support';
 try{
  let account;
  if(isAdmin){
   account=await requireAdmin(req.headers.authorization);
   if(account.error)throw fail(account.error,account.status);
   if(account.role!=='super_admin')throw fail('super_admin_required',403);
  }else{
   const user=await authenticate(req.headers.authorization);
   if(!user)throw fail('unauthorized',401);
   account={user};
  }
  const db=getPool();
  if(req.method==='GET'){
   const {rows}=isAdmin?await db.query(
    "SELECT t.id::text,u.public_id::text AS \"userId\",u.display_name AS \"userName\",t.subject,t.message,t.status,t.admin_reply AS \"reply\",t.created_at AS \"createdAt\",t.updated_at AS \"updatedAt\" FROM akira_support_tickets t JOIN akira_users u ON u.id=t.user_id ORDER BY t.updated_at DESC LIMIT 100"
   ):await db.query(
    "SELECT id::text,subject,message,status,admin_reply AS \"reply\",created_at AS \"createdAt\",updated_at AS \"updatedAt\" FROM akira_support_tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
    [account.user.id]
   );
   send(200,{items:rows});return true;
  }
  if(req.method!=='POST')throw fail('method_not_allowed',405);
  const input=await getBody(req);
  if(isAdmin){
   const id=String(input.id??'');
   if(!/^\d{1,18}$/.test(id))throw fail('invalid_ticket_id');
   if(!['open','answered','closed'].includes(input.status))throw fail('invalid_ticket_status');
   if(typeof input.reply!=='string'||input.reply.length>5000)throw fail('invalid_reply');
   const client=await db.connect();
   try{
    await client.query('BEGIN');
    const {rows}=await client.query(
      "UPDATE akira_support_tickets SET status=$1,admin_reply=$2,replied_by=$3,updated_at=now() WHERE id=$4 RETURNING id::text",
      [input.status,input.reply,account.user.id,id]
    );
    if(!rows.length)throw fail('ticket_not_found',404);
    await client.query(
      "INSERT INTO akira_admin_audit(actor_user_id,action,target_type,target_id) VALUES($1,'support_ticket_updated','support',$2)",
      [account.user.id,id]
    );
    await client.query('COMMIT');send(200,{ok:true,id});
   }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
   return true;
  }
  const subject=typeof input.subject==='string'?input.subject.trim():'';
  const message=typeof input.message==='string'?input.message.trim():'';
  if(!subject||subject.length>120)throw fail('invalid_subject');
  if(!message||message.length>5000)throw fail('invalid_message');
  if(!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId||''))throw fail('invalid_request_id');
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    const {rows}=await client.query(
     'INSERT INTO akira_support_tickets(user_id,subject,message,request_key) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,request_key) DO NOTHING RETURNING id::text',
     [account.user.id,subject,message,input.requestId]
    );
    let id,duplicate=false;
    if(rows.length)id=rows[0].id;
    else{
     const {rows:prior}=await client.query(
      'SELECT id::text,subject,message FROM akira_support_tickets WHERE user_id=$1 AND request_key=$2',
      [account.user.id,input.requestId]
     );
     if(!prior[0]||prior[0].subject!==subject||prior[0].message!==message)throw fail('request_conflict',409);
     id=prior[0].id;duplicate=true;
    }
    await client.query('COMMIT');send(200,{ok:true,id,duplicate});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  return true;
 }catch(e){if(!e.status)console.error('support_api_error',e.code||e.message);
  send(e.status||503,{error:e.status?e.message:'support_unavailable'});return true}
}

export async function adminContentRoutes(req,url,send){
  if(await supportRoutes(req,url,send))return true;
  const adminPath=url.pathname==='/api/v1/admin/content';
  const publicPath=url.pathname==='/api/v1/community/content';
  if(!adminPath&&!publicPath)return false;
  try{
    if(publicPath){
      if(req.method!=='GET')throw fail('method_not_allowed',405);
      const kind=url.searchParams.get('kind')||'';
      if(kind&&!kinds.has(kind))throw fail('invalid_content_kind');
      const {rows}=await getPool().query(
        'SELECT id::text,kind,title,body,asset,starts_at AS "startsAt",ends_at AS "endsAt",updated_at AS "updatedAt" FROM akira_admin_content WHERE enabled=true AND ($1::text=\'\' OR kind=$1) AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()) ORDER BY updated_at DESC,id DESC LIMIT 50',
        [kind]
      );
      send(200,{items:rows});return true;
    }
    const admin=await requireAdmin(req.headers.authorization);
    if(admin.error)throw fail(admin.error,admin.status);
    if(req.method==='GET'){
      const kind=url.searchParams.get('kind')||'';
      if(kind&&!kinds.has(kind))throw fail('invalid_content_kind');
      const {rows}=await getPool().query(
        'SELECT id::text,kind,title,body,asset,enabled,starts_at AS "startsAt",ends_at AS "endsAt",created_at AS "createdAt",updated_at AS "updatedAt" FROM akira_admin_content WHERE ($1::text=\'\' OR kind=$1) ORDER BY updated_at DESC,id DESC LIMIT 100',
        [kind]
      );
      send(200,{items:rows});return true;
    }
    if(req.method!=='POST')throw fail('method_not_allowed',405);
    if(admin.role!=='super_admin')throw fail('super_admin_required',403);
    const input=await getBody(req),v=clean(input);
    const id=input.id===undefined?null:String(input.id);
    if(id!==null&&!/^\d{1,18}$/.test(id))throw fail('invalid_content_id');
    if(id===null&&!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId||''))throw fail('invalid_request_id');

    const db=await getPool().connect();
    try{
      await db.query('BEGIN');
      let result;
      if(id!==null){
        const {rows}=await db.query(
          'UPDATE akira_admin_content SET title=$1,body=$2,asset=$3,enabled=$4,starts_at=$5,ends_at=$6,updated_at=now() WHERE id=$7 AND kind=$8 RETURNING id::text',
          [v.title,v.body,v.asset,v.enabled,v.from,v.to,id,v.kind]
        );
        if(!rows.length)throw fail('content_not_found',404);
        result={ok:true,id:rows[0].id};
      }else{
        const {rows}=await db.query(
          'INSERT INTO akira_admin_content(kind,title,body,asset,enabled,starts_at,ends_at,created_by,request_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(request_key) DO NOTHING RETURNING id::text',
          [v.kind,v.title,v.body,v.asset,v.enabled,v.from,v.to,admin.user.id,input.requestId]
        );
        if(rows.length)result={ok:true,id:rows[0].id};
        else{
          const prior=await db.query(
            'SELECT id::text,kind,title,body,asset,enabled,starts_at AS "startsAt",ends_at AS "endsAt" FROM akira_admin_content WHERE request_key=$1',
            [input.requestId]
          );
          const p=prior.rows[0];
          if(!p||p.kind!==v.kind||p.title!==v.title||p.body!==v.body||p.asset!==v.asset||p.enabled!==v.enabled||
            (p.startsAt?.toISOString?.()||null)!==v.from||(p.endsAt?.toISOString?.()||null)!==v.to)throw fail('request_conflict',409);
          result={ok:true,id:p.id,duplicate:true};
        }
      }
      await db.query('INSERT INTO akira_admin_audit(actor_user_id,action,target_type,target_id) VALUES($1,$2,$3,$4)',
        [admin.user.id,id===null?'content_created':'content_updated',v.kind,result.id]);
      await db.query('COMMIT');
      send(200,result);
    }catch(error){
      await db.query('ROLLBACK');throw error;
    }finally{db.release()}
    return true;
  }catch(error){
    if(!error.status)console.error('admin_content_error',error.code||error.message);
    send(error.status||503,{error:error.status?error.message:'content_unavailable'});
    return true;
  }
}
