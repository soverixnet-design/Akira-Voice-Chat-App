/* Akira full-screen real wallet; read-only view until an explicit server action. */
(function () {
  'use strict';
  var root = null, currentTab = 'exchange', state = null, working = false;
  var token = function () { return typeof window.akiraToken === 'function' ? window.akiraToken() : ''; };
  var request = function (path, method, body) {
    return window.akiraRequest(path, method || 'GET', body, token());
  };
  var esc = function (s) { return String(s ?? '').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); };
  function exact(v) {
    var s = String(v ?? '0');
    return /^\d+$/.test(s) ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—';
  }
  function short(v) {
    if (typeof window.akiraCompactCoins === 'function') return window.akiraCompactCoins(v);
    return exact(v);
  }
  function ensure() {
    if (root) return;
    var css = document.createElement('style');
    css.textContent = [
      '#av7wallet{position:fixed;inset:0;z-index:13000;overflow-y:auto;background:#fff;color:#2a1947;font:500 15px system-ui,sans-serif;overscroll-behavior:contain}',
      '#av7wallet[hidden]{display:none!important}',
      '#av7wallet *{box-sizing:border-box}',
      '#av7wallet .av7bar{position:sticky;top:0;z-index:5;background:#fff;padding:max(12px,env(safe-area-inset-top,12px)) 16px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '#av7wallet button{font:inherit;cursor:pointer}',
      '#av7wallet .av7back{border:1px solid #d4befc;border-radius:16px;padding:10px 18px;background:#f6efff;color:#7134d6;font-weight:700}',
      '#av7wallet .av7head{background:linear-gradient(155deg,#6012ff,#a84be8);border-radius:0 0 36px 36px;padding:15px 20px 28px;color:#fff}',
      '#av7wallet .av7tabs{display:flex;gap:18px;justify-content:center;margin:8px 0 0}',
      '#av7wallet .av7tabs button{min-height:52px;min-width:36%;color:#efe0ff;background:transparent;border:0;border-bottom:3px solid transparent;font-size:20px;font-weight:750}',
      '#av7wallet .av7tabs button.active{color:#fff;border-color:#ffd65b}',
      '#av7wallet .av7body{padding:16px 18px max(30px,env(safe-area-inset-bottom,20px));max-width:660px;margin:auto}',
      '#av7wallet .av7gold{background:linear-gradient(130deg,#ffab17,#ffd82c);border-radius:32px;padding:30px 22px;text-align:center;color:#fff;box-shadow:0 12px 0 #c87b07,0 19px 20px #583b1922}',
      '#av7wallet .av7gold .n{font-size:clamp(28px,8vw,54px);font-weight:850;line-height:1.13;overflow-wrap:anywhere;margin:12px 0}',
      '#av7wallet .av7gold .e{font-size:12px;overflow-wrap:anywhere;opacity:.95}',
      '#av7wallet .av7diamond{background:#f0e7ff;border-radius:22px;padding:18px 22px;margin:28px 0 20px;display:flex;justify-content:space-between;gap:10px;color:#743cce;font-weight:850}',
      '#av7wallet .av7card{border:2px solid #e3ccff;background:linear-gradient(145deg,#f5ecff,#fff);border-radius:30px;padding:22px 18px;margin:20px 0;box-shadow:0 10px 0 #d6c1ef}',
      '#av7wallet h3{font-size:23px;margin:10px 0 22px}',
      '#av7wallet .av7btn{width:100%;min-height:55px;padding:13px 16px;border:0;border-radius:22px;background:#ff8f20;color:#301835;font-weight:800;box-shadow:0 8px 0 #ba6421;margin:12px 0}',
      '#av7wallet .av7btn.blue{background:#2c89f7;box-shadow:0 8px 0 #1059c8;color:#fff}',
      '#av7wallet .av7btn:disabled{opacity:.48;cursor:default}',
      '#av7wallet .av7field{width:100%;min-height:49px;border:2px solid #dac2fa;border-radius:22px;padding:10px 14px;font-size:17px;background:#fff;color:#2b1d40}',
      '#av7wallet .av7row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 13px;border-bottom:1px solid #e8def4}',
      '#av7wallet .av7muted{color:#796a90;font-size:13px;line-height:1.65}',
      '#av7wallet .av7section{padding:12px 4px;margin-top:13px}',
      '#av7wallet .av7section summary{font-weight:850;font-size:17px;cursor:pointer;padding:14px}',
      '#av7wallet .av7error{color:#9a2246;font-size:14px;overflow-wrap:anywhere}',
      '@media(max-width:370px){#av7wallet .av7tabs button{font-size:17px;min-width:42%}#av7wallet .av7body{padding-left:12px;padding-right:12px}}'
    ].join('\n');
    document.head.appendChild(css);
    root = document.createElement('section');
    root.id = 'av7wallet'; root.hidden = true;
    document.body.appendChild(root);
    root.addEventListener('click', handle);
  }
  function rowHistory(t) {
    var delta = String(t.delta ?? '0'), positive = !delta.startsWith('-');
    return '<div class="av7row"><div><b>' + esc(t.reason || 'Wallet') + '</b>' +
      '<div class="av7muted">' + esc(t.createdAt || t.created_at || '') + '</div></div>' +
      '<b style="color:' + (positive ? '#15945a' : '#bd3b5f') + '">' +
      (positive ? '+' : '') + esc(delta) + '</b></div>';
  }
  function controls() {
    return '<div class="av7bar"><button class="av7back" data-av7="back">‹ Back</button>' +
      '<span style="font-weight:850">🪙 AKIRA Wallet</span><span>🌐 English</span></div>' +
      '<div class="av7head"><div class="av7tabs">' +
      '<button data-av7="recharge" class="' + (currentTab === 'recharge' ? 'active' : '') + '">Recharge</button>' +
      '<button data-av7="exchange" class="' + (currentTab === 'exchange' ? 'active' : '') + '">Exchange</button>' +
      '</div></div>';
  }
  function sellers() {
    var list = state.sellers && Array.isArray(state.sellers.items) ? state.sellers.items : [];
    return '<details class="av7card av7section"><summary>🏪 Official Coin Seller List</summary>' +
      (list.length ? list.map(function (s) { return '<div class="av7row"><div><b>' + esc(s.name || 'Official Seller') +
      '</b><div class="av7muted">ID ' + esc(s.id || '') + ' · ' + esc(s.contact || '') + '</div></div>' +
      '<button class="av7back" data-av7="copy" data-id="' + esc(s.id || '') + '">Copy ID</button></div>'; }).join('') :
      '<p class="av7muted">No verified sellers are currently online.</p>') + '</details>';
  }
  function commonFoot() {
    var history = state.history && Array.isArray(state.history.transactions) ? state.history.transactions : [];
    var rank = state.ranking && Array.isArray(state.ranking.items) ? state.ranking.items : [];
    return sellers() +
      '<details class="av7card av7section"><summary>🏆 Recharge, sending and receiving rankings</summary>' +
      (rank.length ? rank.slice(0, 10).map(function (r, i) { return '<div class="av7row"><b>#' + (i + 1) + ' ' + esc(r.name || r.display_name || r.id || 'User') +
      '</b><span>' + esc(r.amount || r.value || r.total || '—') + '</span></div>'; }).join('') :
      '<p class="av7muted">No verified ranking results yet.</p>') + '</details>' +
      '<details class="av7card av7section"><summary>📜 Transaction History</summary>' +
      (history.length ? history.slice(0, 20).map(rowHistory).join('') : '<p class="av7muted">No transactions yet.</p>') + '</details>';
  }
  function render() {
    if (!root || !state) return;
    var coins = String(state.wallet.wallet?.balance ?? '0');
    var diamonds = String(state.bal.diamonds ?? '0');
    var userId = typeof window.A === 'object' && window.A ? String(window.A.id || '') : '';
    var gold = '<div class="av7gold"><div>My gold coins</div><div class="n">🪙 ' + esc(short(coins)) + '</div>' +
      '<div class="e">Exact balance: ' + esc(exact(coins)) + '</div><div class="e">ID ' + esc(userId) + '</div></div>';
    var inner;
    if (currentTab === 'exchange') {
      var rate = Number(state.rate.coins_per_100 || 0);
      inner = gold + '<div class="av7diamond"><span>💎 Your diamonds</span><span>' + esc(exact(diamonds)) + '</span></div>' +
        '<div class="av7card"><h3>💎 Your diamonds</h3><b style="color:#7040c5">💎 ' + esc(exact(diamonds)) + '</b>' +
        '<p class="av7muted">100 diamonds → ' + (Number.isSafeInteger(rate) && rate > 0 ? rate : '—') + ' coins. Exchange will update your real wallet.</p>' +
        '<label>Diamonds to exchange</label><input id="av7diamonds" class="av7field" type="number" min="100" step="100" inputmode="numeric" value="100">' +
        '<button class="av7btn" data-av7="exchange-now"' + (rate > 0 ? '' : ' disabled') + '>Exchange diamonds</button></div>';
    } else {
      inner = '<h3>Recharge packages</h3><div class="av7card"><p class="av7muted">Coins are added to the original wallet after approval by an authorized seller or administrator.</p>' +
        '<div class="av7row"><b>🏪 Contact verified coin sellers</b><span>›</span></div>' +
        '<p class="av7muted">Recharge packages and prices will appear here when configured by the administrator.</p></div>' +
        gold + '<button class="av7btn blue" data-av7="seller-wallet">Seller wallet</button>';
    }
    root.innerHTML = controls() + '<div class="av7body">' + inner + commonFoot() + '</div>';
  }
  async function load() {
    if (!token()) { if (window.toast) window.toast('Sign in to view your real wallet'); return; }
    ensure(); root.hidden = false;
    root.innerHTML = controls() + '<div class="av7body av7muted">Loading real wallet…</div>';
    try {
      var responses = await Promise.all([
        request('/api/v1/wallet'), request('/api/v1/community/balance'),
        request('/api/v1/wallet/history').catch(function () { return { transactions: [] }; }),
        request('/api/v1/community/exchange-rate').catch(function () { return { coins_per_100: 0 }; }),
        request('/api/v1/community/sellers').catch(function () { return { items: [] }; }),
        request('/api/v1/community/rankings?type=rich&period=week').catch(function () { return { items: [] }; })
      ]);
      var rawCoins = String(responses[0].wallet?.balance ?? ''), rawDiamonds = String(responses[1].diamonds ?? '');
      if (!/^\d+$/.test(rawCoins) || !/^\d+$/.test(rawDiamonds)) throw Error('Invalid server wallet balance');
      state = { wallet: responses[0], bal: responses[1], history: responses[2], rate: responses[3], sellers: responses[4], ranking: responses[5] };
      render();
    } catch (e) {
      root.innerHTML = controls() + '<div class="av7body"><p class="av7error">' + esc(e.message || 'Wallet unavailable') + '</p>' +
        '<button class="av7btn" data-av7="reload">Retry</button></div>';
    }
  }
  async function exchange() {
    if (working || !state) return;
    var input = root.querySelector('#av7diamonds');
    var amount = Number(input && input.value), rate = Number(state.rate.coins_per_100 || 0);
    if (!Number.isSafeInteger(amount) || amount < 100 || amount % 100 || !Number.isSafeInteger(rate) || rate <= 0) {
      if (window.toast) window.toast('Enter 100, 200, 300… diamonds'); return;
    }
    var gain = amount / 100 * rate;
    if (!Number.isSafeInteger(gain) || !confirm('Exchange ' + amount + ' diamonds for ' + gain + ' coins?')) return;
    working = true;
    try {
      await request('/api/v1/community/exchange', 'POST', {
        diamonds: amount, requestId: 'walletv7-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 13)
      });
      if (window.toast) window.toast('Exchange confirmed by server');
      await load();
    } catch (e) { if (window.toast) window.toast(e.message || 'Exchange failed'); }
    finally { working = false; }
  }
  async function sellerWallet() {
    try {
      var data = await request('/api/v1/community/seller-wallet');
      root.innerHTML = controls() + '<div class="av7body"><div class="av7card"><h3>Official Seller Wallet</h3>' +
        '<p>Balance: 🪙 ' + esc(short(data.balance || 0)) + '</p><p class="av7muted">Exact: ' + esc(exact(data.balance)) + '</p>' +
        (!data.enabled ? '<p class="av7muted">Your account is not an approved coin seller.</p>' : '') +
        '<button class="av7btn" data-av7="reload">Back to Wallet</button></div></div>';
    } catch (e) { if (window.toast) window.toast(e.message || 'Seller service unavailable'); }
  }
  function handle(e) {
    var btn = e.target.closest('[data-av7]'); if (!btn) return;
    var action = btn.dataset.av7;
    if (action === 'back') { root.hidden = true; return; }
    if (action === 'recharge' || action === 'exchange') { currentTab = action; if (state) render(); else load(); return; }
    if (action === 'reload') { load(); return; }
    if (action === 'exchange-now') { exchange(); return; }
    if (action === 'seller-wallet') { sellerWallet(); return; }
    if (action === 'copy') {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(btn.dataset.id || '');
      if (window.toast) window.toast('Seller ID: ' + (btn.dataset.id || ''));
    }
  }
  window.rechargeSheet = load;
  window.openAkiraWallet = load;
  window.openAkiraWalletV7 = load;
  ['qr', 'hc'].forEach(function (id) { var b = document.getElementById(id); if (b) b.onclick = load; });
})();
