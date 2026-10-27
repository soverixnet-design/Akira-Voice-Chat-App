/* Akira game overlay: keep the voice room iframe mounted while games open. */
(function(){
  const style=document.createElement('style');
  style.textContent=`
  #akiraGameOverlay{position:fixed;inset:0;z-index:9000;display:none;pointer-events:none}
  #akiraGameOverlay.open{display:block}
  #akiraGameOverlay .gameShade{position:absolute;inset:0;background:rgba(3,4,18,.45);pointer-events:auto}
  #akiraGameOverlay .gamePanel{position:absolute;inset:0;background:#100c27;display:flex;flex-direction:column;pointer-events:auto;overflow:hidden}
  #akiraGameOverlay.inRoom .gamePanel{top:auto;bottom:0;height:min(92dvh,calc(100dvh - env(safe-area-inset-top,0px) - 12px));border-radius:18px 18px 0 0;box-shadow:0 -12px 48px #0009}
  #akiraGameOverlay .gameHead{display:flex;align-items:center;justify-content:space-between;min-height:42px;padding:4px 12px;color:#fff;background:#1b1038;font:600 14px system-ui}
  #akiraGameOverlay .gameClose{background:#46306c;color:white;border:0;border-radius:20px;padding:7px 13px;font-size:14px}
  #akiraGameOverlay iframe{width:100%;flex:1;border:0;background:#140a2a}
  @media(max-height:550px){#akiraGameOverlay.inRoom .gamePanel{height:96dvh}}
  `;
  document.head.appendChild(style);
  const root=document.createElement('div');root.id='akiraGameOverlay';
  root.innerHTML='<div class="gameShade"></div><div class="gamePanel" role="dialog" aria-label="Game"><div class="gameHead"><span class="gameTitle">🎮 Game</span><button class="gameClose" type="button">✕ Close</button></div><iframe title="Akira game" allow="autoplay"></iframe></div>';
  document.body.appendChild(root);
  const frame=root.querySelector('iframe');
  function close(){root.classList.remove('open');frame.src='about:blank';}
  function open(game){
    if(!['food-wheel','jackpot-fruit'].includes(game)){if(typeof toast==='function')toast('Game is not yet available');return;}
    const inRoom=!!document.getElementById('rw')?.classList.contains('on');
    root.classList.toggle('inRoom',inRoom);
    root.querySelector('.gameTitle').textContent=game==='food-wheel'?'🎡 Food Wheel':'🎰 Jackpot Fruit';
    frame.src=game==='food-wheel'?'food-wheel/index.html':'jackpot-fruit/index.html';
    root.classList.add('open');
  }
  root.querySelector('.gameClose').addEventListener('click',close);
  root.querySelector('.gameShade').addEventListener('click',close);
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin)return;
    if(e.source===frame.contentWindow && e.data?.type==='akira:game-ready'){
      frame.contentWindow.postMessage({type:'akira:game-auth',token:akiraToken(),apiBase:window.AKIRA_API_BASE},location.origin);
      return;
    }
    if(e.source===frame.contentWindow && e.data?.type==='exit'){close();return;}
    if(e.source===frame.contentWindow && e.data?.type==='akira:wallet-updated'){
      window.dispatchEvent(new Event('akira:wallet-updated'));
      return;
    }
    if(e.source===document.getElementById('rf')?.contentWindow && e.data?.type==='akira:open-game')open(e.data.game);
  });
  document.getElementById('qg')?.addEventListener('click',()=>open('food-wheel'));
  window.AkiraGameOverlay={open,close};
})();
