import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Keyboard } from '@capacitor/keyboard';

const AkiraRoomState = registerPlugin('AkiraRoomState');
function syncRoomWakeLock() {
  if (Capacitor.getPlatform() !== 'android') return;
  const frame = document.getElementById('rf');
  const roomActive = Boolean(frame?.getAttribute('src')?.includes('room.html'));
  AkiraRoomState.setActive({active: roomActive})
    .catch(error => console.warn('Room screen-awake state:',error.message));
}
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
    window.addEventListener('akira:room-change',syncRoomWakeLock);
    await App.addListener('appStateChange',state=>{
      if(state.isActive) syncRoomWakeLock();
    });
    syncRoomWakeLock();
    await App.addListener('backButton', async () => {
      if (!window.AkiraNavigation.back()) await App.minimizeApp();
    });
  }
}
initializeNative().catch(error => console.warn('Native initialization:', error.message));
