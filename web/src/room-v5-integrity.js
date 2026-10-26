/* Real wallet gifting and fail-closed room rewards; no client-generated payouts. */
(function(){
  "use strict";
  var ctx=window.AkiraBridge&&window.AkiraBridge.getContext?window.AkiraBridge.getContext()||{}:{};
  var root=(ctx.voiceApi||'https://api.soverixnet.online').replace(/\/$/,'').replace(/\/api\/v1$/,'')+'/api/v1';
  var auth=String(ctx.voiceAuth||'');
  var sending=false;
  function notify(m){if(typeof window.toast==='function')window.toast(m)}
  function ident(x){return /^\d{6,18}$/.test(String(x||''))}
  function key(){return 'gift-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12)}
  async function api(path,data){
    if(!auth)throw Error('Sign in to use your real wallet');
    var response=await fetch(root+path,{
      method:data?'POST':'GET',cache:'no-store',headers:{
        'Authorization':'Bearer '+auth,'Accept':'application/json',
        ...(data?{'Content-Type':'application/json'}:{})
      },...(data?{body:JSON.stringify(data)}:{})
    });
    var result=await response.json().catch(function(){return {}});
    if(!response.ok)throw Error(result.error||'Server request failed');
    return result;
  }
  function updateWallet(balance){
    var n=Number(balance);
    if(!Number.isSafeInteger(n)||n<0)return;
    S.coins=n;save();lockUI();
    try{
      window.parent.postMessage({type:'akira:wallet-updated',balance:n},location.origin);
      window.parent.akiraRefreshWallet&&window.parent.akiraRefreshWallet();
    }catch(_){}
  }
  async function syncWallet(){
    var data=await api('/wallet');
    if(data&&data.wallet)updateWallet(data.wallet.balance);
    return Number(data&&data.wallet&&data.wallet.balance||0);
  }
  async function safeGift(){
    if(sending)return;
    if(!auth){notify('Log in to send a real gift');return}
    var selected=G[gsel];
    if(!selected){notify('Choose a gift');return}
    if(selected[3]===2){notify('Lucky gift payouts are not available until server verification is enabled');return}
    var count=Number(qty);
    if(![1,5,10].includes(count)){notify('Invalid gift quantity');return}
    var indices=Array.from(new Set(rec)).map(Number);
    var recipients=indices.map(function(i){return seats[i]});
    if(!recipients.length||recipients.some(function(s){return !s||s.empty||!s.real||!ident(s.id)})){
      notify('Select a verified user in a microphone seat');return;
    }
    sending=true;
    var button=document.getElementById('snd');
    if(button)button.disabled=true;
    var completed=0,spent=0;
    try{
      var catalog=await api('/community/catalog');
      var item=(catalog.items||[]).find(function(i){
        return i.kind==='gift'&&String(i.name).toLowerCase()===String(selected[2]).toLowerCase()&&Number(i.price)>0;
      });
      if(!item){notify('This gift is not enabled in Admin catalog');return}
      var price=Number(item.price);
      if(!Number.isSafeInteger(price)||price<=0)throw Error('Invalid gift price');
      var balance=await syncWallet();
      if(price*count*recipients.length>balance){notify('Not enough coins in real wallet');return}
      for(var i=0;i<recipients.length;i++){
        var person=recipients[i];
        var answer=await api('/community/gift',{
          itemId:String(item.id),recipientId:String(person.id),quantity:count,requestId:key()
        });
        if(answer.duplicate)throw Error('Duplicate gift request, check wallet history');
        if(!Number.isSafeInteger(Number(answer.total))||Number(answer.total)!==price*count)throw Error('Gift total does not match server catalog');
        completed++;spent+=Number(answer.total);
        if(answer.balance!==undefined)updateWallet(answer.balance);
        for(var k=0;k<count;k++){
          try{window.fly(selected[0],indices[i],i*150+k*90,price)}catch(_){}
        }
        try{
          var mp=window.__myProfile||ctx.profile||{};
          window.msg(mp.name||'You','🎁','→ '+person.n+'  '+selected[0]+' '+selected[2]+' x'+count,{me:1,gf:1});
        }catch(_){}
      }
      close();notify('Sent '+completed+' real gift'+(completed===1?'':'s')+' · '+spent+' coins');
    }catch(e){
      notify(completed?('Sent '+completed+' gift(s); remaining failed: '+(e.message||'error')):(e.message||'Gift failed'));
    }finally{
      try{await syncWallet()}catch(_){}
      sending=false;if(document.getElementById('snd'))document.getElementById('snd').disabled=false;
    }
  }
  window.__akiraSafeGiftHandler=safeGift;
  // Original Lucky tab used Math.random() on the phone and could show phantom wins.
  var oldGiftSheet=window.giftSheet;
  if(typeof oldGiftSheet==='function'){
    window.giftSheet=function(){
      if(typeof gtab!=='undefined'&&gtab===2)gtab=0;
      oldGiftSheet.apply(this,arguments);
      var tabs=document.querySelectorAll('#sheet .gtabs button');
      if(tabs[2])tabs[2].style.display='none';
    };
    var mainGift=document.getElementById('bGift');
    if(mainGift)mainGift.onclick=window.giftSheet;
  }
  window.rewardSheet=function(){
    open('<h3>💰 Room Reward</h3>'+
      '<div class="rwc"><div class="rwt">Room rewards need verified server gift totals and an Admin payout schedule.</div>'+
      '<div class="rwb">🪙 0</div><div class="rws">Not yet enabled</div></div>'+
      '<div class="lbl" style="padding:12px 0;text-align:center">No coins are added until a server-confirmed reward is available. The old phone-only claim is disabled.</div>'+
      '<button class="send" id="av5RewardClose">Close</button>');
    var b=document.getElementById('av5RewardClose');if(b)b.onclick=close;
  };
  var reward=document.getElementById('rrpill');
  if(reward)reward.onclick=window.rewardSheet;
  // Guests do not have real wallets, including if the server seat overlay is unavailable.
  if(!auth)document.addEventListener('click',function(e){
    if(!e.target.closest('#sheet #snd'))return;
    e.preventDefault();e.stopImmediatePropagation();notify('Sign in to send a real gift');
  },true);
})();
