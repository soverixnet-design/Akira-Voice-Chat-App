import {requireAdmin} from './admin.mjs';
import {getPool} from './database.mjs';
import {walletHistory} from './wallet.mjs';

export async function adminWalletHistory(header,id,deps={requireAdmin,getPool,walletHistory}) {
 const admin=await deps.requireAdmin(header);
 if(admin.error)return {status:admin.status,body:{error:admin.error}};
 if(admin.role!=='super_admin')return {status:403,body:{error:'super_admin_required'}};
 if(typeof id!=='string'||!/^\d{6}$/.test(id))return {status:400,body:{error:'invalid_user_id'}};
 const {rows}=await deps.getPool().query('SELECT id,public_id,display_name FROM akira_users WHERE public_id=$1',[id]);
 if(!rows.length)return {status:404,body:{error:'user_not_found'}};
 const user=rows[0];
 const {rows:wallets}=await deps.getPool().query('SELECT balance FROM akira_wallets WHERE user_id=$1',[user.id]);
 return {status:200,body:{user:{publicId:user.public_id,displayName:user.display_name},balance:String(wallets[0]?.balance??0),transactions:await deps.walletHistory(user.id)}};
}
