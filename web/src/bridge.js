/* Same-origin room context and events. Presentation only; never an auth boundary. */
(function () {
  if (window.parent !== window) {
    try {
      if (window.parent.location.origin === location.origin && window.parent.AkiraBridge) {
        window.AkiraBridge = window.parent.AkiraBridge;
        return;
      }
    } catch (_) { /* A standalone room has its own empty context. */ }
  }
  let context = null;
  const appListeners = new Set();
  const roomListeners = new Set();
  function subscribe(listeners, listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  window.AkiraBridge = Object.freeze({
    getContext: () => context ? structuredClone(context) : null,
    setContext(value) { context = value ? structuredClone(value) : null; roomListeners.clear(); },
    onApp: listener => subscribe(appListeners, listener),
    onRoom: listener => subscribe(roomListeners, listener),
    toApp: event => appListeners.forEach(listener => listener(structuredClone(event))),
    toRoom: event => roomListeners.forEach(listener => listener(structuredClone(event)))
  });
})();
