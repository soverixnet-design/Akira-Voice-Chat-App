/* Persist only the signed-in account's public profile. */
(function(){
  var saved='',timer;
  function api(){return AKIRA_API_BASE.replace(/\/$/,'').replace(/\/api\/v1$/,'')+'/api/v1';}
  function current(){return{id:String(A.id),name:A.name,pic:A.pic||null,bio:A.bio||''};}
  window.akiraSyncProfile=async function(){
    var token=akiraToken();if(!token)return;
    var p=current(),body=JSON.stringify(p),key=token+body;if(key===saved)return;
    var response=await fetch(api()+'/profile',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body});
    if(!response.ok)throw Error('Profile could not sync ('+response.status+'). Please retry.');
    saved=key;
    AkiraBridge.toRoom({t:'profile-updated',profile:p});
  };
  var originalSave=saveA;
  saveA=function(){originalSave();clearTimeout(timer);timer=setTimeout(function(){akiraSyncProfile().catch(function(e){toast(e.message)})},400)};
  var originalOpen=openRoom;
  openRoom=async function(r){try{await akiraSyncProfile();}catch(e){toast(e.message);return;}return originalOpen(r)};
  // Supply the current user's identity without clearing active bridge listeners.
  var bridge=AkiraBridge;
  window.AkiraBridge=Object.freeze(Object.assign({},bridge,{getContext:function(){var ctx=bridge.getContext();if(ctx)ctx.profile=current();return ctx;}}));
  var originalOther=otherModel;
  otherModel=function(u){if(!u.real)return originalOther(u);return{n:u.n,e:'👤',pic:u.pic||null,id:String(u.id),bio:u.bio||'',country:'',age:null,cover:null,ci:0,wl:1,wp:0,cl:1,cp:0,fl:0,fg:0,sent:0,recv:0,sw:{},rw:{},room:'',streak:0,u:u,mine:false};};
})();
