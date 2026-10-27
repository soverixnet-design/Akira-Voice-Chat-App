# Current V8 room repair (review candidate)

The supplied October 27 server has no `/api/v1/rooms/:id/seats`, `/seat`, or `/settings` routes, although its room UI depends on them. This candidate restores authenticated dispatch to the existing room-seats module. It also preserves server avatar URLs in seat snapshots and normalizes voice URLs, notifying room-live when LiveKit connects.

This is a scoped repair candidate, not a deployed release or a claim that all app features work. Preserve the current live code and compare `expected-sha256.json` before applying; abort on differences. The supplied full server is retained under `files/`, not installed over repository production sources. The additive seat migration must exist before restarting the API. Rebuild and test the Android APK after web changes.

Validation: six request-handler tests pass (snapshot, writes, authentication, invalid JSON, method and payload limits); seven existing seat-module tests pass (membership, owner restriction, occupancy, transactions and rollback). JavaScript syntax checks pass. Mock DOM checks of the supplied current UI open both the gift sheet and game selector without JavaScript exceptions. These checks do not validate real audio, Android permission prompts, CSS hit testing, a live gift transfer or game settlement.

Other findings requiring release/device validation:

- Six of eight game menu entries are explicitly Coming soon; Food Wheel and Jackpot Fruit have live HTML assets.
- Game betting requires both `AKIRA_GAME_ENGINE_ENABLED=true` and the game's enabled flag in the database. Do not remove wallet/permission checks to make games appear functional.
- The public web URL `/app/src/native.js` returned 404, but the downloaded public APK contains its bundled native.js. App, room, gift, game-overlay, room-live and game HTML assets match the supplied/current web files. The installed device APK may still differ.
- The public APK manifest contains RECORD_AUDIO, MODIFY_AUDIO_SETTINGS and INTERNET permission strings. Runtime grants and actual audio still require device validation.
- Native HTTPS localhost CORS preflight passed; HTTP localhost was rejected. Verify the installed APK's configured origin before changing the allowlist.
- Gift UI works with mocked authenticated wallet/catalog/recipients. The reported device failure is not yet reproduced.
- New admin archive includes three server modules, but not the HTML pages referenced by its admin-panel module. Full new-panel validation remains incomplete.

Run from repository root:

```sh
node --test repairs/current-room-20261027/test-routes.cjs server/tests/room-seats.test.mjs
```
