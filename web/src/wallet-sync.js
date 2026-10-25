/* Read-only display of authoritative Akira coin balance. Never mint coins on the client. */
(()=>{
 const api=(window.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
 const getToken=()=>typeof window.akiraToken==='function' ? window.akiraToken() : '';
 let currentToken='',balance=null,inflightToken='';
 const reset=token=>{if(token!==currentToken){currentToken=token;balance=null;return true}return false};
 const originalCoins=window.coins;
 window.coins=function(){
  const t=getToken();
  if(reset(t))queueMicrotask(load);
  // An authenticated user must never be shown invented local demo coins.
  if(t)return balance===null?0:balance;
  return 0;
 };
 async function load(){
  const t=getToken();
  reset(t);
  if(!t||inflightToken===t)return;
  inflightToken=t;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(api+'/api/v1/wallet',{headers:{Authorization:'Bearer '+t},cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('wallet_http_'+response.status);
   const data=await response.json();
   const amount=Number(data?.wallet?.balance);
   if(!Number.isSafeInteger(amount)||amount<0)throw Error('invalid_wallet_balance');
   if(t!==getToken())return;
   currentToken=t;balance=amount;
   if(typeof window.refresh==='function')window.refresh();
  }catch(e){
   if(t===getToken())console.warn('Akira wallet refresh unavailable:',e.message);
  }finally{
   clearTimeout(timeout);
   if(inflightToken===t)inflightToken='';
  }
 }
 window.akiraRefreshWallet=load;
 window.addEventListener('akira:wallet-updated',load);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
 setInterval(load,20000);
 setTimeout(load,250);
})();
