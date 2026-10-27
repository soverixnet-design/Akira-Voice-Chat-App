/* V6 Gift Box — real recipients + original server wallet. No sample users or fake credits. */
(function(){
  'use strict';
  var ctx=window.AkiraBridge?.getContext?.()||{};
  var apiRoot=(ctx.voiceApi||'https://api.soverixnet.online').replace(/\/$/,'').replace(/\/api\/v1$/,'')+'/api/v1';
  var selected=new Set(),quantity=1,selectedGift='',sending=false;
  var escrow=function(x){return String(x===undefined||x===null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var dom=function(s){return document.getElementById(s)};
  // Keep the displayed balance exact. Coins may be much larger than 1M.
  var coinNumber=function(v){
    if(typeof v==='number'&&!Number.isSafeInteger(v))throw Error('Wallet balance needs an exact integer from server');
    var s=String(v===undefined||v===null?'':v);
    if(!/^[0-9]+$/.test(s))throw Error('Invalid wallet balance');
    return BigInt(s);
  };
  var money=function(v){
    try{return coinNumber(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',')}
    catch(_){return '—'}
  };
  var say=function(t){if(window.toast)window.toast(t)};
  var uuid=function(){return 'gift-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,13)};
  async function call(path,payload){
    if(!ctx.voiceAuth)throw Error('Sign in to send gifts');
    var res=await fetch(apiRoot+path,{method:payload?'POST':'GET',headers:{
      Authorization:'Bearer '+ctx.voiceAuth,Accept:'application/json',
      ...(payload?{'Content-Type':'application/json'}:{})
    },...(payload?{body:JSON.stringify(payload)}:{}),cache:'no-store'});
    var data=await res.json().catch(function(){return {}});
    if(!res.ok)throw Error(data.error||'Server unavailable');
    return data;
  }
  // Read authoritative membership from the room API, including audience who
  // are not on a microphone seat. Never use local demo/placeholder avatars.
  async function people(){
    if(!/^\d{6,18}$/.test(String(ctx.id||'')))throw Error('Room ID unavailable');
    var snapshot=await call('/rooms/'+encodeURIComponent(String(ctx.id))+'/seats');
    if(!Array.isArray(snapshot.members)||!Array.isArray(snapshot.seats))throw Error('Room users unavailable');
    var own=String(ctx.userId||''),seatById=new Map(),known=new Set();
    snapshot.seats.forEach(function(s){
      if(/^\d{6,18}$/.test(String(s.publicId||''))&&Number.isInteger(Number(s.seatNo))){
        seatById.set(String(s.publicId),Number(s.seatNo));
      }
    });
    return snapshot.members.reduce(function(result,u){
      var id=String(u.publicId||'');
      if(!/^\d{6,18}$/.test(id)||id===own||known.has(id))return result;
      known.add(id);
      result.push({id:id,name:String(u.displayName||'User'),seat:seatById.has(id)?seatById.get(id):null});
      return result;
    },[]).sort(function(a,b){return (a.seat===null?99:a.seat)-(b.seat===null?99:b.seat)});
  }
  function ui(items,balance,users){
    var gifts=items.filter(function(it){return it&&it.kind==='gift'&&Number.isSafeInteger(Number(it.price))&&Number(it.price)>0&&
      !/lucky|jackpot|lottery/i.test(String(it.name||''));});
    var max=users.length;
    if(!max)selected.clear();
    if(!selectedGift||!gifts.some(function(g){return String(g.id)===selectedGift}))selectedGift=gifts.length?String(gifts[0].id):'';
    var recipients=users.map(function(u){
      return '<button type="button" class="chip'+(selected.has(u.id)?' sel':'')+'" data-guser="'+escrow(u.id)+'" style="max-width:122px">'+
       '<div class="c" style="background:linear-gradient(145deg,#8b5cf6,#db2777)">👤</div>'+escrow(u.name)+'<small> ID '+escrow(u.id)+(u.seat===null?' · Audience':' · Seat '+(u.seat+1))+'</small></button>';
    }).join('');
    var h='<h3>🎁 Gift Box <small style="margin-left:auto;color:#fde68a">🪙 '+money(balance)+'</small></h3>'+
      '<div class="lbl">Send to real room users</div>'+
      '<div class="chips" style="display:flex;gap:6px;overflow-x:auto;max-width:100%">'+(recipients||'<div class="lbl">No other users are in this room yet. Invite a friend to send a gift.</div>')+'</div>'+
      '<div class="lbl">Available Gifts from Admin</div>'+
      '<div class="gifts" style="max-height:230px;overflow-y:auto">'+gifts.map(function(g){
       return '<button type="button" class="gf'+(String(g.id)===selectedGift?' sel':'')+'" data-giftid="'+escrow(g.id)+'">'+
        '<span>'+( /^https:\/\/[^\\s<>\"']+$/.test(String(g.asset||''))?'<img alt="" loading="lazy" style="width:42px;height:42px;object-fit:contain" src="'+escrow(g.asset)+'">':/^(?!https?:|data:).{1,8}$/.test(String(g.asset||''))?escrow(g.asset):'🎁')+'</span>'+
        '<b>'+escrow(g.name)+'</b><small>🪙 '+money(g.price)+'</small></button>';
      }).join('')+'</div>'+
      (gifts.length?'':'<div class="lbl">Admin has not enabled any paid gifts.</div>')+
      '<div class="gbar"><div class="qty">'+[1,5,10].map(function(n){
        return '<button type="button" data-gqty="'+n+'" class="'+(n===quantity?'sel':'')+'">x'+n+'</button>';
      }).join('')+'</div><button type="button" class="send" id="av6GiftSend"'+(max&&gifts.length?'':' disabled')+'>Send Gift 🚀</button></div>'+
      '<div class="lbl" style="font-size:11px">Lucky Gift payouts are unavailable until server verification is enabled.</div>';
    window.open(h);
    document.querySelectorAll('#sheet [data-guser]').forEach(function(b){b.onclick=function(){
      var id=b.dataset.guser;if(selected.has(id))selected.delete(id);else selected.add(id);
      document.querySelectorAll('#sheet [data-guser]').forEach(function(x){x.classList.toggle('sel',selected.has(x.dataset.guser))});
    }});
    document.querySelectorAll('#sheet [data-giftid]').forEach(function(b){b.onclick=function(){
      selectedGift=b.dataset.giftid;
      document.querySelectorAll('#sheet [data-giftid]').forEach(function(x){x.classList.toggle('sel',x.dataset.giftid===selectedGift)});
    }});
    document.querySelectorAll('#sheet [data-gqty]').forEach(function(b){b.onclick=function(){
      quantity=Number(b.dataset.gqty);
      document.querySelectorAll('#sheet [data-gqty]').forEach(function(x){x.classList.toggle('sel',Number(x.dataset.gqty)===quantity)});
    }});
    if(dom('av6GiftSend'))dom('av6GiftSend').onclick=function(){void send(items,users)};
  }
  async function loadBox(){
    if(!ctx.voiceAuth){say('Log in before sending real gifts');return}
    window.open('<h3>🎁 Gift Box</h3><div class="lbl">Loading real wallet and active gifts…</div>');
    try{
      var result=await Promise.all([call('/community/catalog'),call('/wallet')]);
      var all=Array.isArray(result[0].items)?result[0].items:[];
      var balance=coinNumber(result[1].wallet?.balance).toString();
      selected.clear();
      var users=await people();
      ui(all,balance,users);
    }catch(e){window.open('<h3>🎁 Gift Box</h3><div class="lbl">'+escrow(e.message||'Gift catalog unavailable')+'</div>')}
  }
  async function send(items,users){
    if(sending)return;
    var chosen=items.find(function(x){return String(x.id)===selectedGift&&x.kind==='gift'});
    var targets=users.filter(function(u){return selected.has(u.id)});
    if(!chosen||!targets.length){say('Select a gift and a real recipient');return}
    var price=Number(chosen.price),count=quantity;
    if(!Number.isSafeInteger(price)||price<=0||!Number.isSafeInteger(count)||count<1||count>10)return;
    var expected=BigInt(price)*BigInt(count)*BigInt(targets.length);
    if(!confirm('Send '+money(expected.toString())+' coins in gifts to '+targets.length+' user(s)?'))return;
    sending=true;
    var button=dom('av6GiftSend');if(button)button.disabled=true;
    var completed=0,charged=0n;
    try{
      var state=await call('/wallet'),before=coinNumber(state.wallet?.balance);
      if(expected>before)throw Error('Insufficient real wallet coins');
      for(var i=0;i<targets.length;i++){
        var target=targets[i];
        var result=await call('/community/gift',{itemId:String(chosen.id),recipientId:target.id,quantity:count,requestId:uuid()});
        if(!result.ok)throw Error('Gift not confirmed by server');
        completed++;charged+=coinNumber(result.total||0);
        if(Number.isSafeInteger(Number(result.balance))){
          window.S.coins=Number(result.balance);
          if(window.lockUI)window.lockUI();
          try{window.parent.akiraRefreshWallet?.()}catch(_){}
        }
        if(target.seat!==null&&target.seat!==undefined)for(var n=0;n<Math.min(count,6);n++){
          try{window.fly('🎁',target.seat,n*85,price)}catch(_){}
        }
      }
      window.close();say('Sent '+completed+' gift(s), charged '+money(charged.toString())+' real coins');
    }catch(e){
      say(completed?('Sent '+completed+' gift(s); remaining stopped: '+(e.message||'error')):(e.message||'Gift failed'));
    }finally{
      sending=false;
      try{var x=await call('/wallet');if(x.wallet&&Number.isSafeInteger(Number(x.wallet.balance))){
        window.S.coins=Number(x.wallet.balance);window.save();window.lockUI();
        window.parent.akiraRefreshWallet?.();
      }}catch(_){}
      if(dom('av6GiftSend'))dom('av6GiftSend').disabled=false;
    }
  }
  window.giftSheet=loadBox;
  var btn=dom('bGift');if(btn)btn.onclick=loadBox;
})();
