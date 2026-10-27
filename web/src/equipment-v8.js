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
  const bundledUrl=a=>{
    const raw=String(a||'');
    const m=raw.match(/^https:\/\/raw\.githubusercontent\.com\/soverixnet-design\/sovera-voice-app\/[0-9a-f]{40}\/assets\/effects\/([a-z0-9-]+\.(?:webp|png))$/i);
    return m?'assets/sovera/effects/'+m[1]:raw;
  };
  const assetHTML=(a,cl)=>{
    const url=imageUrl(a);
    return url?'<img class="'+cl+'" src="'+esc(bundledUrl(url))+'" data-sovera-fallback="'+esc(url)+'" alt="" loading="lazy">':
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
  // Artwork portrait cutouts, read from Sovera's original Flutter EffectPack geometry.
  const soveraPortrait={
    'phoenix.png':[.43,.53], 'ice.png':[.43,.53], 'dragon.png':[.43,.53],
    'vip7.webp':[.43,.53], 'royal-gold.webp':[.61,.52],
    'violet-love.webp':[.59,.53], 'ice-admin.webp':[.59,.53],
    'dragon-gold.webp':[.59,.51], 'ice-dragon.webp':[.58,.52],
    'violet-phoenix.webp':[.59,.53]
  };
  function frameBox(frame,host,url){
    const file=url.split('/').pop().split('?')[0];
    const g=soveraPortrait[file]||[.59,.53],size=host.matches('.mav')?.92:1;
    const zoom=size/g[0];
    frame.style.width=(zoom*100)+'%';
    frame.style.height=(zoom*100)+'%';
    frame.style.left=(50-50*zoom)+'%';
    frame.style.top=(50-g[1]*zoom*100)+'%';
  }
  function apply(){
    const item=selected('frame');
    for(const host of document.querySelectorAll('#v-me .mav, #pfc .pavw')){
      host.querySelectorAll('.akira-v8-frame').forEach(x=>x.remove());
      if(!item)continue;
      const url=imageUrl(item.asset);
      if(!url)continue;
      host.classList.add('akira-v8-frame-host');
      const frame=document.createElement('img');
      frame.className='akira-v8-frame';frame.src=bundledUrl(url);frame.alt='Equipped avatar frame';
      frame.onerror=()=>{if(frame.src!==url)frame.src=url};
      frameBox(frame,host,url);
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
    sh.querySelectorAll('img[data-sovera-fallback]').forEach(img=>{img.onerror=()=>{if(img.getAttribute('src')!==img.dataset.soveraFallback)img.src=img.dataset.soveraFallback}});
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
  const entryDurations={
    'phoenix-entry.webp':3200,'dragon-queen-entry.webp':3200,
    'ice-king-entry.webp':3200,'castle-entry.webp':7000,
    'lion-queen-entry.webp':10600,'phoenix-queen-entry.webp':13800,
    'tiger-queen-entry.webp':12000
  };
  function showEntry(preview=false){
    if(window.__akiraAuthVerified!==true||!loaded)return;
    const equipped=selected('entry');
    if(!equipped)return;
    const url=imageUrl(equipped.asset);if(!url)return;
    document.getElementById('akira-v8-room-entry')?.remove();
    const file=url.split('/').pop().split('?')[0],duration=entryDurations[file]||3200;
    const entry=document.createElement('div');
    entry.id='akira-v8-room-entry';
    entry.setAttribute('role','status');
    entry.setAttribute('aria-label','Voice room entrance animation');
    const visual=document.createElement('img');
    visual.src=bundledUrl(url);visual.onerror=()=>{if(visual.src!==url)visual.src=url};visual.alt=equipped.name||'Room entrance';
    visual.className='akira-v8-entry-art';
    visual.style.animationDuration=duration+'ms';
    entry.appendChild(visual);
    const close=document.createElement('button');close.type='button';
    close.className='akira-v8-entry-close';close.textContent='✕';close.title='Close entry';
    close.onclick=()=>entry.remove();entry.appendChild(close);
    document.body.appendChild(entry);
    const removal=setTimeout(()=>entry.remove(),duration);
    close.addEventListener('click',()=>clearTimeout(removal),{once:true});
  }
  window.akiraEquipment={open,refresh,showEntry,decorate:()=>{if(loaded)apply()}};

  const style=document.createElement('style');
  style.textContent='.akira-v8-categories{display:flex;gap:8px;margin:8px 0 14px}.akira-v8-categories button{flex:1;padding:11px;border:1px solid #6d4ae5;border-radius:12px;color:white;background:#241747}.akira-v8-categories .on{background:linear-gradient(135deg,#7c3aed,#d946ef)}.akira-v8-items{display:grid;gap:9px;max-height:45vh;overflow:auto}.akira-v8-item{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #ffffff30;border-radius:14px;background:#ffffff13}.akira-v8-icon{width:54px;height:54px;object-fit:contain;display:grid;place-items:center;font-size:34px}.akira-v8-item-text{flex:1;min-width:0}.akira-v8-item-text b,.akira-v8-item-text small{display:block}.akira-v8-item-text small{opacity:.7}.akira-v8-item button{border:0;border-radius:9px;padding:10px;background:#a855f7;color:white}.akira-v8-item button:disabled{opacity:.6}.akira-v8-frame-host{position:relative!important}.akira-v8-frame{position:absolute!important;object-fit:contain!important;pointer-events:none!important;z-index:6!important;animation:akira-v8-appear 3s ease-in-out 1}.akira-v8-frame-host .lvbadge{z-index:7}@keyframes akira-v8-appear{0%{filter:brightness(1)}50%{filter:brightness(1.55)}100%{filter:brightness(1)}}#akira-v8-room-entry{position:fixed;inset:0;display:grid;place-items:center;z-index:10003;pointer-events:none;background:linear-gradient(0deg,transparent,#0003)}.akira-v8-entry-art{width:min(100vw,500px);height:100dvh;object-fit:contain;animation:akira-v8-arrive 3.2s ease-out forwards}.akira-v8-entry-close{position:absolute;right:20px;top:42px;border:1px solid #fff8;color:white;border-radius:50%;width:36px;height:36px;background:#0008;pointer-events:auto}@keyframes akira-v8-arrive{0%{opacity:0;transform:translateY(24px) scale(.95);filter:brightness(1.8)}18%{opacity:1;transform:translateY(0) scale(1)}77%{opacity:1;filter:brightness(1)}100%{opacity:0}}@media(prefers-reduced-motion:reduce){.akira-v8-entry-art{animation:none!important;opacity:1}}';
  document.head.appendChild(style);
})();