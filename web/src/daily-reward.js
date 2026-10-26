/* Akira daily rewards: only server credits coins; never modify browser-stored coins. */
(()=>{
 const api=(window.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
 let busy=false;
 const token=()=>typeof window.akiraToken==='function'?window.akiraToken():'';
 const request=async(method)=>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(api+'/api/v1/rewards/daily',{
    method,headers:{Authorization:'Bearer '+token()},cache:'no-store',signal:controller.signal
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'Reward unavailable ('+response.status+')');
   return result;
  }finally{clearTimeout(timeout)}
 };
 const notify=message=>{if(typeof window.toast==='function')window.toast(message)};
 async function show(){
  if(!token()){
   notify('Please log in to claim real daily coins');
   if(typeof window.showAuth==='function')window.showAuth('login');
   return;
  }
  if(typeof window.openSheet!=='function')return;
  window.openSheet('<h3>🎁 Daily Check-in</h3><p id="akiraDailyStatus">Loading reward…</p><div id="akiraDailyDays" class="g4"></div><button class="big" id="akiraDailyClaim" disabled>Checking your reward…</button><p class="rate">Rewards reset at 00:00 UTC. Coins go to your real Akira Wallet.</p>');
  const label=document.getElementById('akiraDailyStatus');
  const grid=document.getElementById('akiraDailyDays');
  const button=document.getElementById('akiraDailyClaim');
  try{
   const status=await request('GET');
   if(!label?.isConnected||!button?.isConnected)return;
   const amounts=Array.isArray(status.amounts)?status.amounts:[100,150,200,300,400,600,1000];
   grid.replaceChildren();
   amounts.forEach((amount,i)=>{
    const item=document.createElement('div');
    item.className=i+1===status.streak?'sel':'';
    item.style.cssText='padding:9px 3px;text-align:center;border-radius:10px;background:#ffffff0c;font-size:12px';
    item.textContent='Day '+(i+1)+' • 🪙 '+Number(amount).toLocaleString('en-US');
    grid.appendChild(item);
   });
   label.textContent=status.claimed?
     'You already received today\'s '+status.claimedAmount+' coins.':
     'Your Day '+status.streak+' reward is ready.';
   button.textContent=status.claimed?'✓ Today already claimed':'🪙 Claim '+Number(status.nextReward).toLocaleString('en-US')+' coins';
   button.disabled=Boolean(status.claimed);
   button.onclick=async()=>{
    if(busy)return;
    busy=true;button.disabled=true;button.textContent='Claiming real coins…';
    try{
     const data=await request('POST');
     if(!label.isConnected)return;
     button.textContent='✓ Today already claimed';
     label.textContent=data.alreadyClaimed?'Already claimed today.':'+'+data.amount+' coins added to your real Wallet!';
     if(!data.alreadyClaimed)notify('🎉 '+data.amount+' coins credited to your Akira Wallet');
     window.dispatchEvent(new Event('akira:wallet-updated'));
     if(typeof window.akiraRefreshWallet==='function')window.akiraRefreshWallet();
    }catch(err){if(label.isConnected){button.disabled=false;button.textContent='Retry Daily Check-in';label.textContent='Could not confirm reward: '+err.message}}
    finally{busy=false}
   };
  }catch(err){if(label?.isConnected)label.textContent='Daily reward unavailable: '+err.message}
 }
 window.dailySheet=show;
 const dailyShortcut=document.getElementById('qd');
 if(dailyShortcut)dailyShortcut.onclick=show;
})();
