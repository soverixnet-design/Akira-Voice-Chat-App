/* V6 real personal wallet screen; seller balances are never mixed with wallet coins. */
(function(){
 'use strict';
 var token=function(){return typeof window.akiraToken==='function'?window.akiraToken():''};
 var api=function(path,method,data){return window.akiraRequest(path,method||'GET',data,token()||undefined)};
 var safe=function(s){return String(s??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
 var fmt=function(n){return Number(n||0).toLocaleString('en-US')};
 var el=function(id){return document.getElementById(id)};
 var busy=false;
 function reqKey(){return 'wallet-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14)}
 function info(m){if(window.toast)window.toast(m)}
 async function show(){
   if(!token()){info('Log in to open your real wallet');return}
   window.openSheet('<h3>🪙 My Wallet</h3><div class="lbl">Loading real wallet…</div>');
   try{
     var out=await Promise.all([api('/api/v1/wallet'),api('/api/v1/community/balance'),api('/api/v1/wallet/history').catch(function(){return {transactions:[]}})]);
     var coins=Number(out[0].wallet?.balance),diamonds=Number(out[1].diamonds||0);
     if(!Number.isSafeInteger(coins)||coins<0||!Number.isSafeInteger(diamonds)||diamonds<0)throw Error('Wallet data invalid');
     var list=Array.isArray(out[2].transactions)?out[2].transactions.slice(0,12):[];
     var html='<h3>🪙 My Wallet</h3>'+
       '<div class="rwc" style="margin:12px 0;text-align:center"><div class="rwt">My Coin Balance</div>'+
       '<div class="rwb">🪙 '+fmt(coins)+'</div><div>💎 '+fmt(diamonds)+' Diamonds</div></div>'+
       '<div class="row" id="av6WalletSeller"><b>🏪 Verified Coin Sellers</b><span>›</span></div>'+
       '<div class="row" id="av6WalletExchange"><b>🔄 Diamond to Coin Exchange</b><span>›</span></div>'+
       '<div class="row" id="av6WalletReload"><b>🔁 Refresh Balance</b><span>›</span></div>'+
       '<div class="lbl" style="margin-top:14px">Recent Transactions</div>'+
       (list.length?list.map(function(t){
         var delta=Number(t.delta||0);
         return '<div class="row"><div style="min-width:0;flex:1"><b>'+safe(t.reason||'Wallet')+'</b>'+
           '<small>'+safe(t.createdAt?new Date(t.createdAt).toLocaleString():'')+'</small></div>'+
           '<b style="color:'+(delta>=0?'#34d399':'#fb7185')+'">'+(delta>0?'+':'')+fmt(delta)+'</b></div>';
       }).join(''):'<div class="lbl">No wallet transactions yet.</div>');
     window.openSheet(html);
     el('av6WalletSeller').onclick=showSellers;
     el('av6WalletExchange').onclick=showExchange;
     el('av6WalletReload').onclick=show;
     if(window.akiraRefreshWallet)window.akiraRefreshWallet();
   }catch(e){window.openSheet('<h3>🪙 My Wallet</h3><div class="lbl">'+safe(e.message||'Wallet is unavailable')+'</div><button class="big" id="av6TryWallet">Retry</button>');if(el('av6TryWallet'))el('av6TryWallet').onclick=show}
 }
 async function showSellers(){
   window.openSheet('<h3>🏪 Official Coin Sellers</h3><div class="lbl">Loading verified sellers…</div>');
   try{
    var result=await api('/api/v1/community/sellers');
    var items=Array.isArray(result.items)?result.items:[];
    window.openSheet('<h3>🏪 Official Coin Sellers</h3>'+(items.length?items.map(function(u){
      return '<div class="row"><div><b>'+safe(u.name)+'</b><small>Official ID '+safe(u.id)+'</small><small>'+safe(u.contact||'')+'</small></div><button class="scp" data-copies="'+safe(u.id)+'">Copy</button></div>';
    }).join(''):'<div class="lbl">No verified sellers are currently active.</div>')+
    '<button class="big" id="av6WalletBack">Back to Wallet</button>');
    if(el('av6WalletBack'))el('av6WalletBack').onclick=show;
    document.querySelectorAll('#sh [data-copies]').forEach(function(b){b.onclick=function(){navigator.clipboard?.writeText(b.dataset.copies).then(function(){info('Seller ID copied')}).catch(function(){info(b.dataset.copies)})}});
   }catch(e){window.openSheet('<h3>🏪 Official Coin Sellers</h3><div class="lbl">'+safe(e.message||'Seller service is unavailable')+'</div><button class="big" id="av6WalletBack">Back to Wallet</button>');el('av6WalletBack').onclick=show}
 }
 async function showExchange(){
   window.openSheet('<h3>🔄 Exchange Diamonds</h3><div class="lbl">Loading exchange rate…</div>');
   try{
     var rate=await api('/api/v1/community/exchange-rate');
     var gain=Number(rate.coins_per_100)||0;
     if(!Number.isSafeInteger(gain)||gain<1)throw Error('Exchange is not configured');
     window.openSheet('<h3>🔄 Exchange Diamonds</h3>'+
       '<div class="lbl">100 💎 = '+fmt(gain)+' 🪙</div>'+
       '<input class="field" id="av6Diamonds" type="number" inputmode="numeric" min="100" step="100" placeholder="Diamonds (100, 200, 300…)">'+
       '<button class="big" id="av6ExchangeNow">Exchange in Real Wallet</button>'+
       '<button class="big" id="av6WalletBack" style="background:#302154;margin-top:8px">Back to Wallet</button>');
     el('av6WalletBack').onclick=show;
     el('av6ExchangeNow').onclick=async function(){
       var value=Number(el('av6Diamonds').value);
       if(!Number.isSafeInteger(value)||value<100||value%100!==0){info('Enter a multiple of 100 diamonds');return}
       if(busy)return;
       if(!confirm('Exchange '+fmt(value)+' diamonds for '+fmt(value/100*gain)+' coins?'))return;
       busy=true;el('av6ExchangeNow').disabled=true;
       try{
         var res=await api('/api/v1/community/exchange','POST',{diamonds:value,requestId:reqKey()});
         info(res.duplicate?'Exchange already completed':'Exchange credited to your wallet');
         await show();
       }catch(e){info(e.message||'Exchange failed');if(el('av6ExchangeNow'))el('av6ExchangeNow').disabled=false}
       finally{busy=false}
     };
   }catch(e){window.openSheet('<h3>🔄 Exchange Diamonds</h3><div class="lbl">'+safe(e.message||'Exchange unavailable')+'</div><button class="big" id="av6WalletBack">Back to Wallet</button>');el('av6WalletBack').onclick=show}
 }
 window.openAkiraWallet=show;
 window.rechargeSheet=show;
 if(el('qr'))el('qr').onclick=show;
 if(el('hc'))el('hc').onclick=show;
})();
