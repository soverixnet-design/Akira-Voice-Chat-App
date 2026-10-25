/* Seller inventory is separate from personal wallet. Server verifies every transfer. */
(()=>{
 const api=(window.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
 const token=()=>{try{return sessionStorage.getItem('akira_server_token_v1')||localStorage.getItem('akira_server_token_v1')||'';}catch{return '';}};
 const style=document.createElement('style');
 style.textContent='#akiraSellerOpen{position:static;width:100%;margin:10px 0;border:0;border-radius:20px;background:#8c5af3;color:white;padding:11px 14px;font-weight:700;display:none}#akiraSellerBox{position:fixed;inset:0;z-index:9200;background:#090c1be8;display:none;align-items:center;justify-content:center;padding:16px}#akiraSellerBox.open{display:flex}#akiraSellerBox section{background:#1a2041;color:white;width:min(420px,100%);padding:20px;border-radius:22px;display:grid;gap:12px}#akiraSellerBox input{padding:13px;background:#2c3559;color:white;border:1px solid #6471a0;border-radius:10px;font-size:16px}#akiraSellerBox button{padding:12px;border:0;border-radius:10px;background:#8c5af3;color:white;font-weight:bold}';
 document.head.appendChild(style);
 const open=document.createElement('button');open.id='akiraSellerOpen';open.textContent='🪙 Coin Seller';document.body.appendChild(open);
 function mountSellerAction(){
   const wallet=document.querySelector('#v-me #wr');
   if(wallet){
     const directory=document.querySelector('#v-me #akiraSellerDirectoryButton');
     const anchor=directory||wallet;
     if(anchor.nextElementSibling!==open){
       anchor.insertAdjacentElement('afterend',open);
       queueMicrotask(refresh);
     }
   }
   if(!wallet && open.parentElement!==document.body){
     open.style.display='none';
     document.body.appendChild(open);
   }
 }
 const profileView=document.getElementById('v-me');
 if(profileView){
   const observer=new MutationObserver(mountSellerAction);
   observer.observe(profileView,{childList:true,subtree:true});
   mountSellerAction();
 }
 const box=document.createElement('div');box.id='akiraSellerBox';
 box.innerHTML='<section><button type="button" id="akiraSellerClose" style="justify-self:end;background:#354067">✕ Close</button><h2>🪙 Coin Seller Panel</h2><div>Seller Balance: <strong id="akiraSellerBalance">—</strong></div><small>Personal Wallet is separate and will never be charged.</small><label>Receiver 6-digit User ID</label><input id="akiraSellerUser" inputmode="numeric" maxlength="6" placeholder="100001"><label>Recharge Coins</label><input id="akiraSellerAmount" type="number" min="1" step="1" placeholder="Amount"><button type="button" id="akiraSellerSend">Send Coins</button><p id="akiraSellerStatus" role="status"></p></section>';
 document.body.appendChild(box);
 const q=id=>document.getElementById(id);
 const request=async(path,method='GET',data)=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const r=await fetch(api+path,{method,signal:controller.signal,headers:{Authorization:'Bearer '+token(),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
   const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j;
  }finally{clearTimeout(timer)}
 };
 const newRequestId=()=>{
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const a=crypto.getRandomValues(new Uint8Array(16));
  a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;
  const h=Array.from(a,x=>x.toString(16).padStart(2,'0'));
  return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+'-'+h.slice(8,10).join('')+'-'+h.slice(10).join('');
 };
 let pendingTransfer=null;
 async function refresh(){if(!token()){open.style.display='none';return;}try{const r=await request('/api/v1/seller/wallet');open.style.display=document.querySelector('#v-me #wr')?.parentElement===open.parentElement?'block':'none';q('akiraSellerBalance').textContent=Number(r.wallet.balance).toLocaleString();}catch{open.style.display='none';}}
 open.onclick=()=>{box.classList.add('open');refresh();};q('akiraSellerClose').onclick=()=>box.classList.remove('open');
 q('akiraSellerSend').onclick=async()=>{const id=q('akiraSellerUser').value.trim(),amount=Number(q('akiraSellerAmount').value),status=q('akiraSellerStatus'),btn=q('akiraSellerSend');
 if(!/^\d{6}$/.test(id)||!Number.isSafeInteger(amount)||amount<=0){status.textContent='Enter valid 6-digit ID and coin amount.';return;}
 if(!confirm('Send '+amount+' coins to user '+id+' from Seller Balance?'))return;
 btn.disabled=true;status.textContent='Sending…';
 try{
  const key=id+':'+amount;
  if(!pendingTransfer||pendingTransfer.key!==key)pendingTransfer={key,id:newRequestId()};
  const result=await request('/api/v1/seller/transfer','POST',{publicId:id,amount,requestId:pendingTransfer.id});
  pendingTransfer=null;
  status.textContent=result.duplicate?'Already sent — no duplicate charge.':'Success! Receiver balance: '+result.recipientBalance;
  await refresh();window.dispatchEvent(new Event('akira:wallet-updated'));
 }catch(e){status.textContent='Not confirmed: '+e.message+'. Check history before retrying.';}finally{btn.disabled=false;}
 };
 setInterval(refresh,30000);setTimeout(refresh,1800);
})();
