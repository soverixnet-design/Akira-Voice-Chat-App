/* Akira V8: catalogue-backed frames and entry effects; real purchases/equipment only. */
(function(){
  'use strict';
  const BASE=(window.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
  let installed=[],current=[],lastKind='frame',busy=false,loaded=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=s=>/^\d{1,16}$/.test(String(s??''))?String(s):'';
  const token=()=>{try{return window.akiraToken?.()||localStorage.getItem('akira_server_token_v1')||''}catch(_){return''}};
  const imageUrl=a=>{
    a=String(a||'');
    return (/^https:\/\/[^\s"'<>]+$/i.test(a)||/^\/?assets\/[a-zA-Z0-9_./-]+$/.test(a))?a:null;
  };
  const assetHTML=(a,cl)=>{
    const url=imageUrl(a);
    return url?'<img class="'+cl+'" src="'+esc(url)+'" alt="" loading="lazy">':
      '<span class="'+cl+'">'+(String(a||'').length<=8?esc(a):'✨')+'</span>';
  };
  async function api(path,data){
    if(!token()||window.__akiraAuthVerified!==true)throw Error('Please sign in first');
    const res=await fetch(BASE+path,{method:data?'POST':'GET',
      headers:{Authorization:'Bearer '+token(),...(data?{'Content-Type':'application/json'}:{})},
      body:data?JSON.stringify(data):undefined,cache:'no-store'});
    const obj=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(obj.error||'Akira server is unavailable');
    return obj;
  }
  async function refresh(){
    const [catalog,inventory]=await Promise.all([api('/api/v1/community/catalog'),api('/api/v1/community/inventory')]);
    current=(Array.isArray(catalog.items)?catalog.items:[]).filter(x=>['frame','entry'].includes(x.kind));
    installed=Array.isArray(inventory.items)?inventory.items:[];
    loaded=true;
    apply();
  }
  function selected(kind){return installed.find(x=>x.kind===kind&&x.equipped);}
  function apply(){
    const item=selected('frame');
    for(const host of document.querySelectorAll('#v-me .mav, #pfc .pavw')){
      host.querySelectorAll('.akira-v8-frame').forEach(x=>x.remove());
      if(!item)continue;
      const url=imageUrl(item.asset);
      if(!url)continue;
      host.classList.add('akira-v8-frame-host');
      const frame=document.createElement('img');
      frame.className='akira-v8-frame';frame.src=url;frame.alt='Equipped avatar frame';
      host.appendChild(frame);
    }
  }
  function render(){
    const sh=document.getElementById('sh');
    if(!sh)return;
    const owned=new Set(installed.map(x=>String(x.item_id??x.itemId)));
    const items=current.filter(x=>x.kind===lastKind);
    sh.innerHTML='<h3>✨ '+(lastKind==='frame'?'Avatar Frames':'Entry Effects')+'</h3>'+
      '<div class="akira-v8-categories"><button data-kind="frame" class="'+(lastKind==='frame'?'on':'')+'">🖼️ Frames</button><button data-kind="entry" class="'+(lastKind==='entry'?'on':'')+'">✨ Entries</button></div>'+
      '<div class="akira-v8-items">'+(items.length?items.map(item=>{
        const id=number(item.id),mine=owned.has(id),equip=installed.some(x=>String(x.item_id??x.itemId)===id&&x.equipped);
        const price=String(item.price??'0');
        return '<div class="akira-v8-item">'+assetHTML(item.asset,'akira-v8-icon')+
          '<div class="akira-v8-item-text"><b>'+esc(item.name)+'</b><small>🪙 '+esc(price)+' coins</small></div>'+
          '<button data-item="'+esc(id)+'" '+(!id||equip?'disabled':'')+'>'+(!mine?'Buy':equip?'Equipped':'Equip')+'</button></div>';
      }).join(''):'<p class="lbl">No '+(lastKind==='frame'?'frames':'entry effects')+' published by admin yet.</p>')+'</div>'+
      '<p class="lbl">Frames and entry effects come from the real Akira admin catalogue and wallet.</p>';
    sh.querySelectorAll('[data-kind]').forEach(el=>el.addEventListener('click',()=>{lastKind=el.dataset.kind;render()}));
    sh.querySelectorAll('[data-item]').forEach(el=>el.addEventListener('click',()=>{void transact(el.dataset.item)}));
  }
  async function transact(id){
    if(busy||!number(id))return;
    const item=current.find(x=>String(x.id)===id);
    if(!item)return;
    const mine=installed.some(x=>String(x.item_id??x.itemId)===id);
    if(!mine&&!confirm('Purchase '+item.name+' for '+item.price+' real coins?'))return;
    busy=true;
    try{
      if(!mine)await api('/api/v1/community/buy',{itemId:id,requestId:'item-'+Date.now().toString(36)+'-'+crypto.randomUUID().replaceAll('-','')});
      await api('/api/v1/community/equip',{itemId:id});
      await refresh();render();
      window.akiraRefreshWallet?.();
      window.toast?.((mine?'Equipped ':'Purchased and equipped ')+item.name);
    }catch(e){window.toast?.(e.message||'Action failed')}finally{busy=false}
  }
  async function open(kind){
    if(window.__akiraAuthVerified!==true)return window.showAuth?.('login');
    lastKind=kind==='entry'?'entry':'frame';
    window.openSheet?.('<h3>✨ '+(lastKind==='frame'?'Avatar Frames':'Entry Effects')+'</h3><p>Loading admin catalogue…</p>');
    try{await refresh();render()}catch(e){
      const sh=document.getElementById('sh');if(sh)sh.innerHTML='<h3>Avatar Items</h3><p class="lbl">'+esc(e.message||'Service unavailable')+'</p>';
    }
  }
  window.akiraEquipment={open,refresh,decorate:()=>{if(loaded)apply()}};
  const style=document.createElement('style');
  style.textContent='.akira-v8-categories{display:flex;gap:8px;margin:8px 0 14px}.akira-v8-categories button{flex:1;padding:11px;border:1px solid #6d4ae5;border-radius:12px;color:white;background:#241747}.akira-v8-categories .on{background:linear-gradient(135deg,#7c3aed,#d946ef)}.akira-v8-items{display:grid;gap:9px;max-height:45vh;overflow:auto}.akira-v8-item{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #ffffff30;border-radius:14px;background:#ffffff13}.akira-v8-icon{width:54px;height:54px;object-fit:contain;display:grid;place-items:center;font-size:34px}.akira-v8-item-text{flex:1;min-width:0}.akira-v8-item-text b,.akira-v8-item-text small{display:block}.akira-v8-item-text small{opacity:.7}.akira-v8-item button{border:0;border-radius:9px;padding:10px;background:#a855f7;color:white}.akira-v8-item button:disabled{opacity:.6}.akira-v8-frame-host{position:relative!important}.akira-v8-frame{position:absolute!important;inset:-12%!important;width:124%!important;height:124%!important;object-fit:contain!important;pointer-events:none!important;z-index:6!important;animation:akira-v8-appear 3s ease-in-out 1}.akira-v8-frame-host .lvbadge{z-index:7}@keyframes akira-v8-appear{0%{filter:brightness(1)}50%{filter:brightness(1.55)}100%{filter:brightness(1)}}';
  document.head.appendChild(style);
})();