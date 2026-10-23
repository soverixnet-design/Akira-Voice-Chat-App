import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Keyboard } from '@capacitor/keyboard';

async function initializeNative() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add('native');
  await Promise.allSettled([
    StatusBar.setStyle({ style: Style.Dark }),
    ScreenOrientation.lock({ orientation: 'portrait' }),
    Keyboard.addListener('keyboardDidShow', () => window.dispatchEvent(new Event('resize'))),
    Keyboard.addListener('keyboardDidHide', () => window.dispatchEvent(new Event('resize')))
  ]);
  if (Capacitor.getPlatform() === 'android') {
    await App.addListener('backButton', async () => {
      if (!window.AkiraNavigation.back()) await App.minimizeApp();
    });
  }
}
initializeNative().catch(error => console.warn('Native initialization:', error.message));
