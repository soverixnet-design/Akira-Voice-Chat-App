/* Akira Admin V4 -> live app bridge. UI additions keep the original Akira screens intact. */
(function(){
  "use strict";
  if(!document.getElementById('v-home') || typeof window.akiraRequest!=='function')return;
  var busy=false;
  var $id=function(x){return document.getElementById(x)};
  var safe=function(x){return String(x===null||x===undefined?'':x).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  })};
  var token=function(){return typeof window.akiraToken==='function'?window.akiraToken():''};
  var request=function(path,method,body){
    return window.akiraRequest(path,method||'GET',body,token()||undefined);
  };
  var signed=function(){if(token())return true;window.toast('Sign in to use this feature');return false};
  var amount=function(n){return Number(n||0).toLocaleString('en-US')};
  var refreshWallet=function(){
    if(typeof window.akiraRefreshWallet==='function')window.akiraRefreshWallet();
    if(typeof window.akiraSyncWallet==='function')window.akiraSyncWallet();
  };
  var uuid=function(prefix){
    var rand='';
    try{if(window.crypto&&window.crypto.getRandomValues){var x=new Uint32Array(2);window.crypto.getRandomValues(x);rand=x[0].toString(36)+x[1].toString(36)}}catch(_){}
    if(!rand)rand=Math.random().toString(36).slice(2,14);
    return prefix+'-'+Date.now().toString(36)+'-'+rand;
  };
  function errorOf(e){return e&&e.message?e.message:'Server unavailable'}
  function renderList(items,empty){
    if(!items.length)return '<div class="lbl" style="padding:12px 0">'+safe(empty)+'</div>';
    return items.map(function(x){return '<div class="row" style="display:block;white-space:normal">'+
      '<b style="font-size:14px">'+safe(x.title)+'</b>'+
      '<small style="display:block;white-space:pre-wrap;line-height:1.5;margin-top:6px">'+safe(x.body||'')+'</small></div>'}).join('');
  }
  async function openNotices(){
    window.openSheet('<h3>📢 Official Notice</h3><div class="lbl">Loading announcements…</div>');
    try{
      var r=await request('/api/v1/community/content?kind=notice');
      window.openSheet('<h3>📢 Official Notice</h3>'+renderList(Array.isArray(r.items)?r.items:[],'No official announcements currently.'));
    }catch(e){window.openSheet('<h3>📢 Official Notice</h3><div class="lbl">'+safe(errorOf(e))+'</div>')}
  }
  async function openLegal(){
    window.openSheet('<h3>📜 Legal & Help</h3><div class="lbl">Loading…</div>');
    try{
      var r=await request('/api/v1/community/content?kind=legal');
      window.openSheet('<h3>📜 Legal & Help</h3>'+renderList(Array.isArray(r.items)?r.items:[],'No updated legal documents are published.'));
    }catch(e){window.openSheet('<h3>📜 Legal & Help</h3><div class="lbl">'+safe(errorOf(e))+'</div>')}
  }
  async function openTasks(){
    if(!signed())return;
    window.openSheet('<h3>🎁 Daily Rewards & Tasks</h3><div class="lbl">Checking real rewards…</div>');
    var tasks=[],err='';
    try{var r=await request('/api/v1/community/tasks');tasks=Array.isArray(r.items)?r.items:[]}catch(e){err=errorOf(e)}
    var html='<h3>🎁 Daily Rewards & Tasks</h3>'+
      '<div class="row"><div><b>🪙 Daily Check-in</b><small>One verified server reward per UTC day</small></div><button class="scp" id="av4Checkin">Claim</button></div>'+
      '<div class="lbl" style="margin-top:14px">🎯 Admin Rewards</div>';
    if(err)html+='<div class="lbl">'+safe(err)+'</div>';
    html+=tasks.length?tasks.map(function(t){
      return '<div class="row" style="gap:10px"><div style="flex:1"><b>'+safe(t.title)+'</b>'+
        '<small>'+safe(t.action==='send_paid_gift'?'Send a real paid gift today':'Complete today’s check-in')+
        ' · +🪙 '+safe(amount(t.coins))+'</small></div><button class="scp" data-av4-task="'+safe(t.id)+'"'+
        (t.claimed?' disabled style="opacity:.5"':'')+'>'+(t.claimed?'Claimed ✓':'Claim')+'</button></div>';
    }).join(''):'<div class="lbl">No tasks enabled by Admin right now.</div>';
    html+='<button class="big" id="av4Promo" style="margin-top:14px">🎟️ Redeem Promo Code</button>';
    window.openSheet(html);
    var check=$id('av4Checkin');
    if(check)check.onclick=async function(){
      check.disabled=true;
      try{
        var r=await request('/api/v1/community/daily-checkin','POST',{});
        refreshWallet();window.toast(r.duplicate?'Daily check-in already claimed':'Daily reward credited to your wallet');
        openTasks();
      }catch(e){window.toast(errorOf(e));check.disabled=false}
    };
    document.querySelectorAll('#sh [data-av4-task]').forEach(function(b){
      b.onclick=async function(){
        b.disabled=true;
        try{
          var res=await request('/api/v1/community/tasks/claim','POST',{taskId:b.dataset.av4Task});
          refreshWallet();window.toast(res.duplicate?'Task already claimed':'Task reward credited to your wallet');
          openTasks();
        }catch(e){window.toast(errorOf(e));b.disabled=false}
      };
    });
    if($id('av4Promo'))$id('av4Promo').onclick=openPromo;
  }
  function openPromo(){
    if(!signed())return;
    window.openSheet('<h3>🎟️ Promo Code</h3><div class="lbl">Enter the code provided by Akira Admin.</div>'+
      '<input class="field" id="av4Code" maxlength="24" autocomplete="off" autocapitalize="characters" placeholder="PROMO-CODE">'+
      '<button class="big" id="av4Redeem" style="margin-top:12px">Redeem to My Wallet</button>');
    $id('av4Redeem').onclick=async function(){
      var code=($id('av4Code').value||'').trim().toUpperCase();
      if(!/^[A-Z0-9-]{8,24}$/.test(code)){window.toast('Enter a valid promo code');return}
      var btn=$id('av4Redeem');btn.disabled=true;
      try{
        var r=await request('/api/v1/community/promos/redeem','POST',{code:code});
        refreshWallet();
        window.toast(r.duplicate?'This promo was already redeemed':'+'+amount(r.amount)+' coins credited to your real wallet');
        window.closeSheet();
      }catch(e){window.toast(errorOf(e));btn.disabled=false}
    };
  }
  async function openSupport(){
    if(!signed())return;
    window.openSheet('<h3>🎧 Support Inbox</h3><div class="lbl">Loading real support messages…</div>');
    var tickets=[],err='';
    try{var r=await request('/api/v1/community/support');tickets=Array.isArray(r.items)?r.items:[]}catch(e){err=errorOf(e)}
    var html='<h3>🎧 Support Inbox</h3>'+
      '<div class="lbl">Subject</div><input class="field" id="av4Sub" maxlength="120" placeholder="How can we help?">'+
      '<div class="lbl" style="margin-top:10px">Message</div><textarea class="field" id="av4Body" maxlength="5000" rows="4" placeholder="Describe your issue"></textarea>'+
      '<button class="big" id="av4Send" style="margin-top:12px">Send to Support</button>'+
      '<div class="lbl" style="margin-top:16px">Your tickets</div>';
    if(err)html+='<div class="lbl">'+safe(err)+'</div>';
    html+=tickets.length?tickets.map(function(t){return '<div class="row" style="display:block;white-space:normal">'+
      '<b>'+safe(t.subject)+'</b><small style="float:right">'+safe(t.status)+'</small>'+
      '<small style="display:block;white-space:pre-wrap;line-height:1.5">'+safe(t.message)+'</small>'+
      (t.reply?'<small style="display:block;color:#34d399;white-space:pre-wrap;margin-top:8px">Admin: '+safe(t.reply)+'</small>':'')+
      '</div>'}).join(''):'<div class="lbl">You have no support tickets.</div>';
    window.openSheet(html);
    $id('av4Send').onclick=async function(){
      var subject=($id('av4Sub').value||'').trim(),body=($id('av4Body').value||'').trim();
      if(!subject||!body){window.toast('Write a subject and message');return}
      if(busy)return;busy=true;$id('av4Send').disabled=true;
      try{
        await request('/api/v1/community/support','POST',{subject:subject,message:body,requestId:uuid('support')});
        window.toast('Support ticket sent to Admin');openSupport();
      }catch(e){window.toast(errorOf(e));if($id('av4Send'))$id('av4Send').disabled=false}
      finally{busy=false}
    };
  }
  async function updateBanners(){
    try{
      var result=await request('/api/v1/community/content?kind=banner');
      if(!Array.isArray(result.items))return;
      var items=result.items.slice(0,12);
      var banner=$id('ban'),dots=$id('dots');
      if(!banner||!dots)return;
      banner.textContent='';dots.textContent='';
      var source=items.length?items:[{title:'Welcome to Akira',body:'Connect with your friends in voice rooms.'}];
      window.CFG.banners=source.map(function(x){return {t:x.title,s:x.body||'',a:'admin',asset:x.asset||''}});
      source.forEach(function(x,i){
        var slide=document.createElement('div');slide.className='slide';slide.dataset.i=String(i);
        slide.style.background='linear-gradient(135deg,#7c3aed,#db2777)';
        if(x.asset&&(/^(https:\/\/|data:image\/(png|jpeg|jpg|webp|gif);base64,)/).test(x.asset)){
          slide.style.backgroundImage='linear-gradient(135deg,rgba(40,10,82,.6),rgba(102,18,92,.7)),url('+JSON.stringify(x.asset)+')';
          slide.style.backgroundSize='cover';slide.style.backgroundPosition='center';
        }
        var title=document.createElement('b');title.textContent=x.title;
        var small=document.createElement('small');small.textContent=x.body||'';
        var icon=document.createElement('i');icon.textContent='📣';
        slide.append(title,small,icon);banner.appendChild(slide);
        var dot=document.createElement('u');if(i===0)dot.className='on';dots.appendChild(dot);
      });
      window.bi=0;banner.scrollLeft=0;
      banner.onclick=function(e){
        var slide=e.target.closest('.slide');
        if(!slide)return;
        var item=source[Number(slide.dataset.i)];if(!item)return;
        window.openSheet('<h3>📣 '+safe(item.title)+'</h3><div class="lbl" style="white-space:pre-wrap;line-height:1.6">'+safe(item.body||'')+'</div>');
      };
    }catch(e){console.warn('Admin banner sync unavailable:',errorOf(e))}
  }
  function addActions(){
    if($id('av4HomeActions'))return;
    var row=document.createElement('div');row.id='av4HomeActions';row.className='qa';
    row.style.cssText='margin:5px 0 12px;gap:6px';
    [['📢','Official'],['🎯','Tasks'],['🎟️','Promo'],['📜','Help']].forEach(function(a,i){
      var b=document.createElement('button');b.style.cssText='font-size:11px;min-width:0;padding:8px 3px';
      b.textContent=a[0]+' '+a[1];b.onclick=[openNotices,openTasks,openPromo,openLegal][i];row.appendChild(b);
    });
    var qa=document.querySelector('#v-home .qa');if(qa)qa.insertAdjacentElement('afterend',row);
  }
  function addMessageActions(){
    var ml=$id('ml');if(!ml||$id('av4MessageActions'))return;
    var top=document.createElement('div');top.id='av4MessageActions';
    top.innerHTML='<div class="chatrow" id="av4Official"><div class="av">📢</div><div><b>Official Notices</b><small>Messages from Akira Admin</small></div></div>'+
      '<div class="chatrow" id="av4Support"><div class="av">🎧</div><div><b>Official Support</b><small>Send tickets and see Admin replies</small></div></div>';
    ml.insertBefore(top,ml.firstChild);
    $id('av4Official').onclick=openNotices;
    $id('av4Support').onclick=openSupport;
  }
  var originalMsg=window.renderMsg;
  if(typeof originalMsg==='function'){
    window.renderMsg=function(){var value=originalMsg.apply(this,arguments);addMessageActions();return value};
    if($id('v-msg').classList.contains('on'))addMessageActions();
  }
  // Legacy daily rewards used localStorage amounts. Replace claims with server-only checks.
  window.dailySheet=openTasks;
  if($id('qd'))$id('qd').onclick=openTasks;
  addActions();updateBanners();
  document.addEventListener('visibilitychange',function(){if(!document.hidden)updateBanners()});
  window.AkiraAdminV4App={notices:openNotices,support:openSupport,tasks:openTasks,promo:openPromo,legal:openLegal,refreshBanners:updateBanners};
})();
