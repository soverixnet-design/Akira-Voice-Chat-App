/* Akira Google sign-in: the Android Credential Manager obtains a Google ID token;
 * the Akira server verifies it and issues the normal Akira session. No client-side
 * identity, wallet balance, or user ID is accepted without server verification. */
(function () {
  'use strict';

  var pending = false;
  var googleLogo = '<svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

  function inform(message) {
    var err = document.getElementById('ae');
    if (err) err.textContent = message;
    else if (typeof window.toast === 'function') window.toast(message);
    else window.alert(message);
  }

  async function obtainGoogleToken() {
    var config = await window.akiraRequest('/api/v1/auth/google/config', 'GET');
    if (!config || !config.enabled || !config.clientId) {
      throw new Error('Google sign-in is not configured on the Akira server yet.');
    }
    if (!window.Capacitor || !window.Capacitor.isNativePlatform ||
        !window.Capacitor.isNativePlatform() ||
        !window.Capacitor.Plugins || !window.Capacitor.Plugins.AkiraGoogleLogin) {
      throw new Error('Google sign-in requires the latest Akira Android app.');
    }
    var result = await window.Capacitor.Plugins.AkiraGoogleLogin.signIn({clientId: config.clientId});
    if (!result || typeof result.idToken !== 'string') {
      throw new Error('Google did not return an account credential.');
    }
    return result.idToken;
  }

  function errorMessage(error) {
    var m = String(error && (error.message || error.error) || 'Google sign-in failed.');
    if (m.includes('email_account_link_required')) {
      return 'This email already has an Akira password account. Sign in with your password, then use Settings > Link Google account.';
    }
    if (/cancel/i.test(m)) return 'Google sign-in was cancelled.';
    if (m.includes('invalid_google_credential')) return 'Google verification failed. Please try again.';
    if (m.includes('google_login_not_configured')) return 'Google sign-in must be activated on the server.';
    if (/^Failed to fetch|NetworkError|net::ERR_/i.test(m)) return 'Cannot reach the Akira server. Check your internet connection.';
    return m;
  }

  async function googleAction(link) {
    if (pending) return;
    pending = true;
    var button = document.getElementById(link ? 'akiraGoogleLink' : 'akiraGoogleSignin');
    if (button) button.disabled = true;
    try {
      var idToken = await obtainGoogleToken();
      if (link) {
        var token = window.akiraToken();
        if (!token) throw new Error('Log in with your Akira password before linking Google.');
        await window.akiraRequest('/api/v1/auth/google/link', 'POST', {idToken: idToken}, token);
        inform('Google account linked. You can now sign in with Google.');
      } else {
        var data = await window.akiraRequest('/api/v1/auth/google', 'POST', {idToken: idToken});
        if (!data || !data.token || !data.user || !data.user.id) throw new Error('The Akira server returned an incomplete login.');
        // Save only a token verified and issued by the Akira backend.
        window.localStorage.setItem('akira_server_token_v1', data.token);
        var account = window.akiraAccount(data, 'google:' + data.user.id, {});
        window.enter(account, 'Welcome, ' + account.p.name + '!');
      }
    } catch (err) {
      inform(errorMessage(err));
    } finally {
      pending = false;
      if (button) button.disabled = false;
    }
  }

  function augmentAuth() {
    var welcome = document.getElementById('wg');
    if (welcome) welcome.onclick = function () { googleAction(false); };
    var authCard = document.querySelector('#au .acard');
    if (authCard && !document.getElementById('akiraGoogleSignin')) {
      var button = document.createElement('button');
      button.type = 'button';
      button.id = 'akiraGoogleSignin';
      button.className = 'big';
      button.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:11px;background:#fff;color:#232636;margin-top:12px;border:1px solid #d5d7e0;box-shadow:0 2px 10px #0002';
      button.innerHTML = googleLogo + '<span>Continue with Google</span>';
      button.onclick = function () { googleAction(false); };
      var submit = document.getElementById('ago');
      if (submit && submit.parentNode === authCard) submit.insertAdjacentElement('afterend', button);
      else authCard.appendChild(button);
    }
  }

  var originalAuthRender = window.authRender;
  if (typeof originalAuthRender === 'function') {
    window.authRender = function () {
      var result = originalAuthRender.apply(this, arguments);
      augmentAuth();
      return result;
    };
  }
  var originalSettingsSheet = window.settingsSheet;
  if (typeof originalSettingsSheet === 'function') {
    window.settingsSheet = function () {
      var result = originalSettingsSheet.apply(this, arguments);
      var sheet = document.getElementById('sh');
      if (sheet && window.akiraToken() && !document.getElementById('akiraGoogleLink')) {
        var button = document.createElement('button');
        button.id = 'akiraGoogleLink';
        button.type = 'button';
        button.className = 'big';
        button.style.marginTop = '10px';
        button.textContent = 'Link Google account';
        button.onclick = function () { googleAction(true); };
        sheet.appendChild(button);
      }
      return result;
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', augmentAuth, {once: true});
  else augmentAuth();
})();
