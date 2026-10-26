/* V6 game overlay: accessible tabs, expand control and Android safe areas. */
(function(){
  'use strict';
  var roots=document.querySelectorAll('#akiraGameOverlay');
  if(!roots.length)return;
  var root=roots[roots.length-1];
  // The old live index loaded game-overlay.js twice. Keep only its active instance.
  for(var i=0;i<roots.length-1;i++)roots[i].remove();
  var style=document.createElement('style');
  style.textContent=[
    '#akiraGameOverlay .gamePanel{padding-top:max(8px,env(safe-area-inset-top,0px));padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}',
    '#akiraGameOverlay .gameHead{flex:none;min-height:54px;position:relative;z-index:3;align-items:center;overflow:visible;padding:8px 8px}',
    '#akiraGameOverlay .gameTabs{flex:1;min-width:0;scrollbar-width:none}',
    '#akiraGameOverlay .gameTab{font-size:12px;min-height:37px}',
    '#akiraGameOverlay .gameExpand{flex:none;min-width:44px;min-height:38px;border:1px solid #9f7aea;background:#4c2488;color:#fff;border-radius:13px;font-size:19px}',
    '#akiraGameOverlay .gameClose{min-width:57px;min-height:38px}',
    '#akiraGameOverlay.inRoom .gamePanel{top:auto;bottom:0;height:76dvh;border-radius:20px 20px 0 0}',
    '#akiraGameOverlay.akiraFull .gamePanel{top:0;bottom:0;height:100dvh;border-radius:0}',
    '#akiraGameOverlay iframe{min-height:0;min-width:0;display:block}',
    '@media(max-height:630px){#akiraGameOverlay.inRoom .gamePanel{height:90dvh}#akiraGameOverlay .gameHead{min-height:46px}}'
  ].join('\n');
  document.head.appendChild(style);
  var head=root.querySelector('.gameHead');
  if(!head)return;
  var expand=document.createElement('button');
  expand.type='button';expand.className='gameExpand';
  expand.textContent='⤢';expand.title='Expand or minimize game';
  expand.setAttribute('aria-label','Expand or minimize game');
  var close=head.querySelector('.gameClose');
  head.insertBefore(expand,close);
  function state(){
    var full=root.classList.contains('akiraFull')||!root.classList.contains('inRoom');
    expand.textContent=full?'⤡':'⤢';
    expand.title=full?'Minimize game':'Expand game';
  }
  expand.onclick=function(){
    root.classList.toggle('akiraFull');state();
    window.dispatchEvent(new Event('resize'));
  };
  var api=window.AkiraGameOverlay;
  if(api&&typeof api.open==='function'){
    var original=api.open;
    api.open=function(game){
      root.classList.remove('akiraFull');
      original(game);
      state();
    };
    window.openGameOverlay=api.open;
    window.openFoodWheel=function(){api.open('food-wheel')};
    window.openJackpotFruit=function(){api.open('jackpot-fruit')};
    var qg=document.getElementById('qg');if(qg)qg.onclick=function(){api.open('food-wheel')};
  }
  state();
})();
