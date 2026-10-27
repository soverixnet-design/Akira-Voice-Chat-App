/* Room content is hidden until the Akira backend validates the parent session. */
(function(){
  'use strict';
  async function verify(){
    document.documentElement.classList.remove('akira-room-authenticated');
    const wall=document.getElementById('akiraRoomLoginWall');
    const ctx=window.AkiraBridge?.getContext?.()||{};
    if(!ctx.voiceAuth||!/^\d{6,18}$/.test(String(ctx.id||''))||!/^\d{6,18}$/.test(String(ctx.userId||''))){
      if(wall)wall.hidden=false;
      return false;
    }
    try{
      const api=(ctx.voiceApi||'https://api.soverixnet.online').replace(/\/$/,'');
      const response=await fetch(api+'/api/v1/auth/me',{headers:{Authorization:'Bearer '+ctx.voiceAuth},cache:'no-store'});
      if(!response.ok)throw Error('Session invalid');
      const data=await response.json();
      const id=String(data.user?.id||data.user?.publicId||data.user?.public_id||'');
      if(id!==String(ctx.userId))throw Error('Room user ID does not match logged-in user');
      document.documentElement.classList.add('akira-room-authenticated');
      if(wall)wall.hidden=true;
      return true;
    }catch(_){
      if(wall)wall.hidden=false;
      return false;
    }
  }
  window.akiraRoomVerify=verify;
  void verify();
})();