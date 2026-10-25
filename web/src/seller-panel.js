/* Seller inventory is separate from personal wallet. Server verifies every transfer. */
(()=>{
 const api=(window.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
 const token=()=>{try{return sessionStorage.getItem('akira_server_token_v1')||localStorage.getItem('akira_server_token_v1')||'';}catch{return '';}};
 const style=document.createElement('style');
 style.textContent='#akiraSellerOpen{position:fixed;right:14px;bottom:82px;z-index:8900;border:0;border-radius:20px;background:#8c5af3;color:white;padding:11px 14px;font-weight:700;display:none}#akiraSellerBox{position:fixed;inset:0;z-index:9200;background:#090c1be8;display:none;align-items:center;justify-content:center;padding:16px}#akiraSellerBox.open{display:flex}#akiraSellerBox section{background:#1a2041;color:white;width:min(420px,100%);padding:20px;border-radius:22px;display:grid;gap:12px}#akiraSellerBox input{padding:13px;background:#2c3559;color:white;border:1px solid #6471a0;border-radius:10px;font-size:16px}#akiraSellerBox button{padding:12px;border:0;border-radius:10px;background:#8c5af3;color:white;font-weight:bold}';
 document.head.appendChild(style);
 const open=document.createElement('button');open.id='akiraSellerOpen';open.textContent='🪙 Coin Seller';document.body.appendChild(open);
 const box=document.createElement('div');box.id='akiraSellerBox';
 box.innerHTML='<section><button type="button" id="akiraSellerClose" style="justify-self:end;background:#354067">✕ Close</button><h2>🪙 Coin Seller Panel</h2><div>Seller Balance: <strong id="akiraSellerBalance">—</strong></div><small>Personal Wallet is separate and will never be charged.</small><label>Receiver 6-digit User ID</label><input id="akiraSellerUser" inputmode="numeric" maxlength="6" placeholder="100001"><label>Recharge Coins</label><input id="akiraSellerAmount" type="number" min="1" step="1" placeholder="Amount"><button type="button" id="akiraSellerSend">Send Coins</button><p id="akiraSellerStatus" role="status"></p></section>';
 document.body.appendChild(box);
 const q=id=>document.getElementById(id);
 const request=async(path,method='GET',data)=>{const r=await fetch(api+path,{method,headers:{Authorization:'Bearer '+token(),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j;};
 async function refresh(){if(!token()){open.style.display='none';return;}try{const r=await request('/api/v1/seller/wallet');open.style.display='block';q('akiraSellerBalance').textContent=Number(r.wallet.balance).toLocaleString();}catch{open.style.display='none';}}
 open.onclick=()=>{box.classList.add('open');refresh();};q('akiraSellerClose').onclick=()=>box.classList.remove('open');
 q('akiraSellerSend').onclick=async()=>{const id=q('akiraSellerUser').value.trim(),amount=Number(q('akiraSellerAmount').value),status=q('akiraSellerStatus'),btn=q('akiraSellerSend');
 if(!/^\d{6}$/.test(id)||!Number.isSafeInteger(amount)||amount<=0){status.textContent='Enter valid 6-digit ID and coin amount.';return;}
 if(!confirm('Send '+amount+' coins to user '+id+' from Seller Balance?'))return;
 btn.disabled=true;status.textContent='Sending…';
 try{const result=await request('/api/v1/seller/transfer','POST',{publicId:id,amount,requestId:crypto.randomUUID()});status.textContent='Success! Receiver balance: '+result.recipientBalance;await refresh();window.dispatchEvent(new Event('akira:wallet-updated'));}catch(e){status.textContent='Failed: '+e.message;}finally{btn.disabled=false;}
 };
 setInterval(refresh,30000);setTimeout(refresh,1800);
})();
