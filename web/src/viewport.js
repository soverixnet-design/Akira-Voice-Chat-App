(function () {
  const root = document.documentElement;
  const embedded = window.parent !== window;
  const probe = document.createElement('div');
  probe.id = 'safe-area-probe';
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.append(probe);
  let maxHeight = window.innerHeight;
  function update() {
    const vv = window.visualViewport;
    // Ignore pinch-zoom; shrinking the layout while zooming makes content jump.
    if (vv && vv.scale !== 1) return;
    const height = embedded ? window.innerHeight : (vv ? vv.height : window.innerHeight);
    if (height <= 0) return; // A minimized iframe must not retain a zero-height layout.
    maxHeight = Math.max(maxHeight, height);
    root.style.setProperty('--app-height', Math.round(height) + 'px');
    root.classList.toggle('keyboard-open', maxHeight - height > 120);
    let insetProbe = probe;
    try { if (embedded) insetProbe = parent.document.getElementById('safe-area-probe') || probe; } catch (_) {}
    const insets = insetProbe.ownerDocument.defaultView.getComputedStyle(insetProbe);
    for (const edge of ['top','right','bottom','left']) {
      root.style.setProperty('--safe-' + edge, edge === 'bottom' && maxHeight-height > 120 ? '0px' : insets.getPropertyValue('padding-' + edge));
    }
    const active = document.activeElement;
    if (active && active.matches('input,textarea,[contenteditable]')) {
      requestAnimationFrame(() => active.scrollIntoView({block:'nearest', inline:'nearest'}));
    }
  }
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', () => { maxHeight = 0; update(); });
  window.visualViewport?.addEventListener('resize', update);
  document.addEventListener('focusin', update);
  update();
})();
