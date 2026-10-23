# Phase 1 verification — 2026-10-23

| Check | Result |
| --- | --- |
| Web build (`npm run build`) | Passed |
| JavaScript syntax, app and room | Passed |
| Bridge unit tests | 3 passed |
| Browser viewport 320×568 | Passed |
| Browser viewport 360×800 | Passed |
| Browser viewport 390×844 | Passed |
| Browser viewport 430×932 | Passed |
| Browser viewport 768×1024 | Passed |
| Navigation to Home, Rank, Messages, Profile | Passed at all five sizes |
| Separate room load, title/context, text message | Passed |
| Room overlay Back → minimize → resume | Passed, chat and mute state preserved |
| Keyboard-sized viewport input visibility | Passed at all five sizes |
| Simulated 47px notch and 34px home indicator | Passed |
| Leave clears room context and floating control | Passed |
| Sheet/thread/profile/recharge Back order | Passed |
| Browser script errors/failed asset requests | None in tested flows |
| Android and iOS Capacitor project generation | Passed |
| Native build and physical devices | See CI; no physical devices tested |

Browser tests ran with a locally extracted Chromium 153 binary because the default Playwright browser download returned invalid ZIPs in this workspace. The screenshots were inspected for layout; this container's emoji font coverage is incomplete. Android/iOS device font rendering still needs real-device verification.

The viewport tests simulate keyboard resizing and safe insets. They do not verify actual iOS keyboard animation, Android system bars, rotation restrictions, background audio, real microphone capture or native plugin execution. No live voice, wallet, reward, permission or backend claims are made: those production components are pending and must receive separate tests.
