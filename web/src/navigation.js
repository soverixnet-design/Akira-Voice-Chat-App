(function () {
  const on = id => document.getElementById(id)?.classList.contains('on');
  const hide = id => document.getElementById(id)?.classList.remove('on');
  window.AkiraNavigation = {
    back() {
      if (on('shb')) { closeSheet(); return true; }
      if (on('au')) {
        if (amode !== 'welcome') { showAuth('welcome'); return true; }
        return false;
      }
      if (on('th')) { hide('th'); return true; }
      if (on('pfo')) { hide('pfo'); return true; }
      if (on('rcp')) { hide('rcp'); return true; }
      if (on('rw')) {
        const room = document.getElementById('rf').contentWindow;
        if (!room?.AkiraRoom?.closeTopLayer()) minimizeRoom();
        return true;
      }
      if (!on('v-home')) { go('home'); return true; }
      return false;
    }
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && window.AkiraNavigation.back()) event.preventDefault();
  });
})();
