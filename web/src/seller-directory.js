/* Actual Akira seller directory: uses verified records, not sample users. */
(()=>{
 const api=(window.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
 const view=document.getElementById('v-me');
 const button=document.createElement('button');
 button.id='akiraSellerDirectoryButton';button.type='button';button.textContent='🪙 Coin Seller List';
 button.style.cssText='width:100%;margin:10px 0;padding:14px;border:1px solid #bd83ff66;border-radius:16px;background:#251343;color:#fff;font-weight:700;';
 function mount(){
   const wallet=document.querySelector('#v-me #wr');
   if(wallet && button.previousElementSibling!==wallet) wallet.insertAdjacentElement('afterend',button);
 }
 if(view){new MutationObserver(mount).observe(view,{childList:true,subtree:true});mount()}
 function show(){
   if(typeof window.openSheet!=='function')return;
   window.openSheet('<h3>🪙 Coin Seller List</h3><div class="rate">Verified sellers from Akira</div><div id="akiraRealSellerList">Loading...</div>');
   fetch(api+'/api/v1/sellers').then(r=>{if(!r.ok)throw Error('Unable to load seller list');return r.json()}).then(result=>{
     const box=document.getElementById('akiraRealSellerList');if(!box)return;
     box.replaceChildren();
     const sellers=Array.isArray(result.sellers)?result.sellers:[];
     if(!sellers.length){box.textContent='No active Coin Sellers yet.';return}
     sellers.forEach(s=>{
       const row=document.createElement('div');row.className='slr';
       const avatar=document.createElement('div');avatar.className='sa';avatar.textContent='🪙';
       if(typeof s.avatarUrl==='string'){
         try{const uri=new URL(s.avatarUrl,location.href);if(uri.protocol==='https:'||uri.origin===location.origin){const img=document.createElement('img');img.src=uri.href;img.alt='';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';avatar.replaceChildren(img)}}catch{}
       }
       const details=document.createElement('div');details.className='sn';
       const name=document.createElement('b');name.textContent=s.displayName||'Coin Seller';
       const id=document.createElement('small');id.textContent='ID '+String(s.publicId||'');
       details.append(name,id);
       const copy=document.createElement('button');copy.className='scp';copy.type='button';copy.textContent='Copy ID';
       copy.onclick=()=>navigator.clipboard?.writeText(String(s.publicId||'')).then(()=>{if(typeof window.toast==='function')window.toast('ID Copied ✓')}).catch(()=>{copy.textContent='ID '+String(s.publicId||'')});
       row.append(avatar,details,copy);box.appendChild(row);
     });
   }).catch(err=>{const box=document.getElementById('akiraRealSellerList');if(box)box.textContent=err.message});
 }
 window.sellerSheet=show;
 button.addEventListener('click',show);
})();