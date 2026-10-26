/* Akira account deletion request entry point, available from signed-in Settings. */
(()=>{
 const sheet=document.getElementById('sh');
 if(!sheet)return;
 const api=(window.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
 function insert(){
  const logout=sheet.querySelector('#lo');
  if(!logout||sheet.querySelector('#akiraDeleteRequest'))return;
  const deleteBtn=document.createElement('button');
  deleteBtn.type='button';deleteBtn.id='akiraDeleteRequest';deleteBtn.className='big';
  deleteBtn.textContent='Request account deletion';
  deleteBtn.style.cssText='margin:12px 0;background:#612d6f;';
  deleteBtn.onclick=async()=>{
   if(!confirm('Request deletion of your Akira account and associated data?'))return;
   const token=typeof window.akiraToken==='function'?window.akiraToken():'';
   if(!token){if(typeof toast==='function')toast('Sign in to request deletion');return}
   deleteBtn.disabled=true;
   try{
    const r=await fetch(api+'/api/v1/account/deletion-request',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({confirm:'DELETE'})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||'Request failed');
    deleteBtn.textContent='Deletion request received';
    if(typeof toast==='function')toast('Account deletion request received');
   }catch(err){if(typeof toast==='function')toast('Deletion request: '+err.message);deleteBtn.disabled=false}
  };
  logout.insertAdjacentElement('beforebegin',deleteBtn);
  const web=document.createElement('a');web.textContent='Account deletion web page';
  web.href='https://api.soverixnet.online/app/delete-account.html';
  web.target='_blank';web.rel='noopener noreferrer';
  web.style.cssText='display:block;margin:8px 0;color:#cfb9ff;text-align:center';
  logout.insertAdjacentElement('beforebegin',web);
 }
 new MutationObserver(insert).observe(sheet,{childList:true,subtree:false});
 insert();
})();
