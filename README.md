# Akira Voice Chat App

First implementation phase of the supplied Akira prototype. The original purple/gold UI, room seats, login artwork, rankings, profile and wallet screens are retained.

**Status: local prototype, not a production service.** Accounts, balances, rankings, room participants, chat and gifts still use the supplied demo logic. There is no live voice SDK, backend, payment processing or admin panel yet. Do not use real passwords or accept payments in this build.

## Completed in this phase

- Extracted the embedded room into `web/room.html`; extracted original artwork, styles and JavaScript.
- Removed the 440px screen limit from both app and room. Added dynamic viewport sizing, keyboard-aware layout and safe-area handling.
- Replaced `iframe.srcdoc`, `window.name` and wildcard messages with a shared, same-origin room context/event bridge.
- Minimize/resume keeps the existing room document, chat and mute state; reopening the same room also resumes it.
- Android Back closes sheets, threads, profiles and recharge before minimizing the room, navigating home and minimizing the app. Room sheets and image viewer close before the room minimizes.
- Generated Capacitor Android and iOS projects with app ID `com.akira.voice`, portrait settings and the supplied embedded logo.
- Added automated browser checks and an Android debug APK workflow.

## Run the preview

Node.js 22 or later:

```sh
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4173`. This project must be served over HTTP(S), not opened as a `file://` document. No API keys are required for this prototype.

## Verify

```sh
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

Set `CHROME_PATH` to a compatible installed Chromium executable if browser downloads are unavailable. Browser checks cover five viewport sizes, room navigation, state preservation, text input, overlay Back order and simulated safe areas. They do not replace physical Android/iPhone testing.

## Android

Requires JDK 21 and Android SDK 36:

```sh
npm ci
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions uploads it as `Akira-Android-Prototype-APK` after a successful build. It is a **prototype APK**, not a live voice service or signed store release. Release signing credentials must stay outside Git.

## iPhone

Requires macOS, a compatible Xcode version and Apple signing for installation on physical devices:

```sh
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

Select a signing team in Xcode, run on a device, or archive for TestFlight. The iOS project uses Swift Package Manager. iOS compilation and physical device verification have not been performed in this Linux workspace.

## Project layout

- `web/index.html`, `web/room.html`: app and room documents
- `web/styles/`: preserved design and shared viewport rules
- `web/src/app.js`, `room.js`: extracted prototype behavior
- `web/src/bridge.js`: ephemeral room context and events (not an authorization mechanism)
- `web/src/navigation.js`, `viewport.js`, `native.mjs`: navigation and mobile integration
- `web/assets/`: original embedded artwork extracted without redesign
- `android/`, `ios/`: generated native projects
- `docs/`: audit, outstanding integrations and test report

## Next phase

Follow the supplied handoff order: PostgreSQL/Redis + server authentication → profile/config → transactional wallet/recharge/exchange/check-in/sellers → rooms and realtime moderation → voice SDK → gifts/rewards/rankings → messages/store and admin controls. Replace local demo balance mutations with server results before accepting real users or payments.

Provider choices still needed: voice SDK/account, SMS provider, hosting/domain, APK vs store distribution, supported countries/payment methods, initial admins/sellers and final support/policy text. No existing Sovera deployment or Firebase configuration has been changed.
