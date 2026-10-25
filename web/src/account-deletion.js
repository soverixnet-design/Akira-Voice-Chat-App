/* User-initiated Akira account deletion request; no wallet mutation. */
(()=>{
 const sheet=document.getElementById('sh');
 if(!sheet)return;
 const api=(window.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
 function mount(){
  const logout=sheet.querySelector('#lo');
  if(!logout||sheet.querySelector('#akiraDeletionRequest'))return;
  const button=document.createElement('button');
  button.id='akiraDeletionRequest';button.type='button';
  button.textContent='🗑️ Request account deletion';
  button.className='big';
  button.style.cssText='margin:10px 0;background:#514072;color:#fff';
  button.addEventListener('click',async()=>{
   const token=typeof window.akiraToken==='function'?window.akiraToken():'';
   if(!token){window.toast?.('Log in to request account deletion');return}
   if(!window.confirm('Request deletion of your Akira account and associated data?'))return;
   button.disabled=true;
   button.textContent='Submitting deletion request…';
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
   try{
    const response=await fetch(api+'/api/v1/account/deletion-request',{
     method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
     body:JSON.stringify({confirm:'DELETE'}),signal:controller.signal
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'Request failed');
    button.textContent='✓ Deletion request submitted';
    window.toast?.('Your account deletion request was received.');
   }catch(error){
    button.disabled=false;button.textContent='🗑️ Request account deletion';
    window.toast?.('Deletion request: '+error.message);
   }finally{clearTimeout(timeout)}
  });
  logout.insertAdjacentElement('beforebegin',button);
  const link=document.createElement('a');
  link.href='https://voice.soverixnet.online/delete-account.html';
  link.target='_blank';link.rel='noopener noreferrer';
  link.textContent='Account deletion web page';
  link.style.cssText='display:block;text-align:center;font-size:12px;margin-bottom:10px;color:#e6bfff';
  button.insertAdjacentElement('afterend',link);
 }
 const observer=new MutationObserver(mount);
 observer.observe(sheet,{childList:true});
 mount();
})();
