import {getPool} from './database.mjs';
export async function deletionRequestStatus(userId,pool=getPool()){
 const {rows}=await pool.query('SELECT status,requested_at AS "requestedAt" FROM akira_account_deletion_requests WHERE user_id=$1',[userId]);
 return {status:200,body:{request:rows[0]||null}};
}
export async function submitDeletionRequest(userId,body,pool=getPool()){
 if(!body||typeof body!=='object'||Array.isArray(body)||body.confirm!=='DELETE'||
    (body.reason!==undefined&&(typeof body.reason!=='string'||body.reason.length>500)))
  return {status:400,body:{error:'confirm_account_deletion_request'}};
 const {rows}=await pool.query(`INSERT INTO akira_account_deletion_requests(user_id,reason)
   VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET
   reason=EXCLUDED.reason,
   requested_at=CASE WHEN akira_account_deletion_requests.status='completed' THEN akira_account_deletion_requests.requested_at ELSE now() END,
   status=CASE WHEN akira_account_deletion_requests.status='completed' THEN 'completed' ELSE 'pending' END
   RETURNING status,requested_at AS "requestedAt"`,[userId,body.reason||'']);
 return {status:200,body:{ok:true,request:rows[0]}};
}
