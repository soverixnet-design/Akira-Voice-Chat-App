/* Real Akira room occupancy; no sample users, no local-only seat permissions. */
(()=>{
 const ctx=window.AkiraBridge?.getContext?.()||{};
 if(!ctx.id||!ctx.voiceAuth||!/^\d{6,18}$/.test(String(ctx.id)))return;
 const api=(ctx.voiceApi||'https://api.soverixnet.online').replace(/\/$/,'');
 let localSeat=null,lastSnapshot=null,updating=false,stopped=false,first=true;
 window.__akiraVoiceSeatActive=false;
 window.__akiraBlockedIds=new Set();
 fetch(api+'/api/v1/users/blocks',{headers:{Authorization:'Bearer '+ctx.voiceAuth}})
  .then(r=>r.ok?r.json():Promise.reject(Error('blocks_unavailable')))
  .then(data=>{window.__akiraBlockedIds=new Set((data.blockedIds||[]).map(String));
   document.querySelectorAll('[data-akira-voice-user]').forEach(el=>{
    if(window.__akiraBlockedIds.has(el.dataset.akiraVoiceUser)){el.pause?.();el.remove()}
   });
  }).catch(err=>console.warn('Block list unavailable:',err.message));
 const mic=document.getElementById('mic');
 const notify=(message)=>{if(typeof window.toast==='function')window.toast(message)};
 const currentId=String(ctx.userId||'');
 const request=async(method,path,payload)=>{
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),10000);
  try{
   const response=await fetch(api+'/api/v1/rooms/'+encodeURIComponent(ctx.id)+'/'+path,{
    method,headers:{Authorization:'Bearer '+ctx.voiceAuth,...(payload?{'Content-Type':'application/json'}:{})},
    body:payload?JSON.stringify(payload):undefined,signal:abort.signal,cache:'no-store'});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Room API '+response.status);
   return data;
  }finally{clearTimeout(timeout)}
 };
 const oldTick=window.tick;
 window.tick=function(){
  document.querySelectorAll('.seat').forEach(el=>el.classList.remove('talk'));
 };
 function draw(data){
  if(!Array.isArray(data.seats)||![5,10,12].includes(Number(data.seatCount)))return;
  lastSnapshot=data;
  const incoming=Number(data.seatCount);
  window.__akiraLiveRoomSeats=true;
  const occupied=new Map(data.seats.map(s=>[Number(s.seatNo),s]));
  localSeat=null;
  const next=Array.from({length:incoming},(_,i)=>{
   const u=occupied.get(i);
   if(!u)return {empty:1,i,talk:false,muted:true};
   if(String(u.publicId)===currentId)localSeat=i;
   return {n:u.displayName||'User',e:'👤',id:String(u.publicId),i,muted:String(u.publicId)!==currentId||myMute,talk:false,real:true};
  });
  seats.splice(0,seats.length,...next);
  // All names/IDs are returned by the room server, never invented placeholder users.
  if(Array.isArray(data.members)&&typeof U!=='undefined'){
   const seatedIds=new Set(data.seats.map(s=>String(s.publicId)));
   const audience=data.members.filter(u=>!seatedIds.has(String(u.publicId))).map(u=>({
     n:u.displayName||'User',e:'👤',id:String(u.publicId),lv:1
   }));
   U.splice(0,U.length,...audience);
  }
  S.n=incoming;
  if(typeof data.name==='string')S.name=data.name;
  if(data.themeKey&&TH.some(x=>x.id===data.themeKey))S.theme=data.themeKey;
  window.__akiraVoiceSeatActive=localSeat!==null;
  if(localSeat===null){myMute=true;}
  mic.textContent=myMute?'🔇':'🎤';
  mic.classList.toggle('off',myMute);
  render();
  applyTheme();
  syncMic();
 }
 async function syncMic(){
  if(!akiraVoiceRoom)return;
  const allowed=window.__akiraVoiceSeatActive&&!myMute;
  try{await akiraVoiceRoom.localParticipant.setMicrophoneEnabled(allowed)}
  catch(e){myMute=true;mic.textContent='🔇';mic.classList.add('off');notify('Microphone permission needed')}
 }
 async function refresh(){
  if(stopped||updating)return;
  updating=true;
  try{draw(await request('GET','seats'));first=false}
  catch(e){if(first){first=false;notify('Room seats are not connected: '+e.message)}}
  finally{updating=false}
 }
 async function actSeat(body){
  try{
   const state=await request('POST','seat',body);
   myMute=body.leave===true;
   draw(state);
   if(!myMute){
    if(!akiraVoiceRoom){akiraStartVoice();}
    else await syncMic();
   }
   notify(body.leave===true?'Left microphone seat':'Seat joined — microphone on');
  }catch(e){notify('Seat: '+e.message);await refresh()}
 }
 const sheet=window.seatSheet;
 window.seatSheet=function(i){
  if(!lastSnapshot){notify('Connecting real room seats');return}
  const s=seats[i];
  if(!s)return;
  if(s.empty){
   const ownerSeat=i===0;
   if(ownerSeat!==!!window.__akiraIsOwner){notify('Only the room owner may use the owner seat');return}
   open('<h3>Join microphone seat '+(i+1)+'</h3><div class="acts"><button class="act" id="akiraTakeSeat"><span>🎙️</span>Join and talk</button></div>');
   document.getElementById('akiraTakeSeat').onclick=()=>{close();actSeat({seatNo:i})};
  }else if(s.id===currentId){
   open('<h3>Your microphone seat</h3><div class="acts"><button class="act" id="akiraLeaveSeat"><span>⬇️</span>Leave microphone</button></div>');
   document.getElementById('akiraLeaveSeat').onclick=()=>{close();actSeat({leave:true})};
  }else{
   open('<h3>Occupied seat</h3><div class="who"><b>'+esc(s.n)+'</b><small> · ID '+esc(s.id)+'</small></div>');
  }
 };
 mic.onclick=async()=>{
  if(localSeat===null){notify('Tap an empty seat to talk');return}
  myMute=!myMute;
  mic.textContent=myMute?'🔇':'🎤';
  mic.classList.toggle('off',myMute);
  if(seats[localSeat])seats[localSeat].muted=myMute;
  render();await syncMic();
 };
 // Server settings preserve the old theme interface but only owner can write it.
 const oldSettings=window.settings;
 document.getElementById('roomBtn').onclick=function(){
  if(!window.__akiraIsOwner){
   open('<h3>'+esc(lastSnapshot?.name||ctx.name||'Room')+'</h3><div class="lbl">Room settings are managed by the owner.</div>');
   return;
  }
  oldSettings();
  const seatSettings=document.getElementById('rSe');
  if(seatSettings)seatSettings.onclick=()=>{
   open('<h3>🪑 Microphone seats</h3><div class="lbl">Select a server-backed seat count</div><div class="acts">'+[5,10,12].map(n=>'<button class="act" data-seat-count="'+n+'">'+n+' seats</button>').join('')+'</div>');
   document.querySelectorAll('#sheet [data-seat-count]').forEach(btn=>btn.onclick=async()=>{
    try{const updated=await request('POST','settings',{seatCount:Number(btn.dataset.seatCount)});
      draw(updated);close();notify('Seat count saved')}
    catch(err){notify('Seats: '+err.message)}
   });
  };
  const save=document.getElementById('save');
  if(save)save.onclick=async()=>{
   save.disabled=true;
   try{
    const name=document.getElementById('nm')?.value?.trim()||S.name;
    const updated=await request('POST','settings',{name,seatCount:seats.length,themeKey:S.theme});
    draw(updated);close();notify('Room settings saved');
   }catch(e){notify('Settings: '+e.message)}
   finally{save.disabled=false}
  };
 };
 // Reject deceptive local-only sends until gifts are backed by a server ledger.
 document.addEventListener('click',e=>{
  if(!e.target?.closest?.('#sheet #snd'))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(typeof window.__akiraSafeGiftHandler==='function'){
    void window.__akiraSafeGiftHandler();
  }else{
    notify('Gifts are unavailable until real wallet gifting is enabled.');
  }
 },true);
 // Until an authenticated message service exists, do not misrepresent local chat as global.
 document.getElementById('sendTxt')?.addEventListener('click',e=>{
  e.preventDefault();e.stopImmediatePropagation();
  notify('Live text chat is not yet connected.');
 },true);
 document.getElementById('txt')?.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  e.preventDefault();e.stopImmediatePropagation();
  notify('Live text chat is not yet connected.');
 },true);
 document.addEventListener('click',e=>{
  const target=e.target?.closest?.('#sheet .act[data-a]');
  if(!target||!['fo','iv','dn','kk','kick','lock','unlock','mute','take','down'].includes(target.dataset.a))return;
  e.preventDefault();e.stopImmediatePropagation();
  notify('This room action needs server permissions and is not enabled yet.');
 },true);
 // Moderation uses signed-in server requests, not local-only room flags.
 const oldUserSheet=window.userSheet;
 window.userSheet=function(u,q){
  oldUserSheet(u,q);
  if(!u?.id||String(u.id)===currentId)return;
  const back=document.getElementById('ubk');
  if(!back)return;
  const buttons=document.createElement('div');buttons.className='acts';
  const block=document.createElement('button');block.className='act';
  block.textContent='🚫 Block user';
  const report=document.createElement('button');report.className='act';
  report.textContent='🛡️ Report user';
  async function moderate(action,payload){
   const response=await fetch(api+'/api/v1/users/'+action,{method:'POST',
    headers:{Authorization:'Bearer '+ctx.voiceAuth,'Content-Type':'application/json'},
    body:JSON.stringify({publicId:String(u.id),...payload})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Moderation unavailable');
   return data;
  }
  block.onclick=async()=>{
   if(!confirm('Block ID '+u.id+'?'))return;
   block.disabled=true;
   try{await moderate('block',{blocked:true});
     window.__akiraBlockedIds.add(String(u.id));
     document.querySelectorAll('[data-akira-voice-user]').forEach(el=>{
      if(el.dataset.akiraVoiceUser===String(u.id)){el.pause?.();el.remove()}
     });
     notify('User blocked and audio muted');close()}
   catch(e){notify('Block: '+e.message);block.disabled=false}
  };
  report.onclick=()=>{
   open('<h3>Report ID '+esc(String(u.id))+'</h3><div class="lbl">Reason</div><select class="field" id="akiraReportReason">'+
    ['harassment','spam','fraud','inappropriate','other'].map(x=>'<option value="'+x+'">'+x+'</option>').join('')+
    '</select><textarea class="field" id="akiraReportDetails" maxlength="500" placeholder="What happened?"></textarea>'+
    '<button class="send" id="akiraReportSubmit">Submit report</button>');
   document.getElementById('akiraReportSubmit').onclick=async()=>{
    const send=document.getElementById('akiraReportSubmit');send.disabled=true;
    try{await moderate('report',{reason:document.getElementById('akiraReportReason').value,details:document.getElementById('akiraReportDetails').value});
     close();notify('Report submitted for admin review')}
    catch(e){notify('Report: '+e.message);send.disabled=false}
   };
  };
  buttons.append(block,report);back.insertAdjacentElement('beforebegin',buttons);
 };
 window.addEventListener('akira:voice-connected',syncMic);
 const syncWallet=()=>{
  try{
   const coins=Number(window.parent.coins?.());
   if(Number.isSafeInteger(coins)&&coins>=0&&S.coins!==coins){
    S.coins=coins;lockUI();
   }
  }catch{}
 };
 window.addEventListener('akira:wallet-updated',syncWallet);
 setInterval(syncWallet,7000);
 syncWallet();
 window.addEventListener('pagehide',()=>{stopped=true});
 myMute=true;mic.classList.add('off');mic.textContent='🔇';
 seats.splice(0,seats.length,...Array.from({length:10},(_,i)=>({empty:1,i,muted:true,talk:false})));
 render();
 refresh();
 setInterval(refresh,4500);
})();
