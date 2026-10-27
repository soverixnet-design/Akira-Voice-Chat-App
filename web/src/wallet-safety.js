/* Do not claim that local demo rewards or purchases credit the real Akira wallet. */
(()=>{
 const originalAddCoins=window.addCoins;
 if(typeof originalAddCoins==='function'){
  window.addCoins=function(amount){
   if(typeof window.akiraToken==='function'&&window.akiraToken()){
    console.warn('Akira: blocked local-only coin credit; only the server controls wallet balance');
    return;
   }
   return originalAddCoins(amount);
  };
 }
 document.addEventListener('click',event=>{
  const target=event.target?.closest?.('#rcp [data-p],#rcp [data-e],#sh #pc,#sh #ec');
  if(!target)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(typeof window.toast==='function')
   window.toast('This option is not connected to the real wallet yet. Use the verified Coin Seller List.');
 },true);
})();
