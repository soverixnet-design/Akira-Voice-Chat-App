# Prototype audit and handoff

Source: the two supplied Akira HTML attachments are byte-identical. The final handoff (section 12) governs later implementation. The full-screen/native foundation is the current phase; the following remain demo or incomplete.

| Area | Current source | Required replacement |
| --- | --- | --- |
| Authentication | `API`, `hashPw`, `vr_accts_v1`, `vr_sess`; local password hash and session | Server password hashing, expiring sessions, rate limits, Google/Apple verification, OTP, reset/deletion |
| Profiles | `A`, `vr_app_v1`, `myModel`, `otherModel`, `hsh` | Real users, unique 8-digit IDs, uploads, follows and visitor counts |
| Wallet | `RS`, `addCoins`, `addDia`, `vr_state_v2`; seeded 12,450 coins/2,500 diamonds | Transactional server wallet, immutable ledger and authorization |
| Check-in/invites | `DR`, client date, example.com invite URL, local rewards | Server day/streak/idempotency and real referral tracking |
| Recharge | `renderRcp`, request success toast without submission | Requests, evidence upload, admin approval exactly once, store billing decision |
| Sellers | `SELL`, simulated status and chat | Admin-managed sellers and real conversations |
| Configuration | `CFG.banners`, packages, exchange rate | Versioned server config and admin editing |
| Room list | `CFG.rooms`, `myR`, local create | Real room search, membership and one room per user |
| Room participants | `base`, `U`, synthetic 121 listeners, `tick`, fake talk animations | Server seats/presence and SDK speaking events |
| Room chat/DM | `TALK`, timers, local bubbles, automatic replies | Authorized Socket.IO messages, moderation, persistence and push |
| Voice | Mic toggles CSS/booleans only | SDK tokens, audio capture/playback, foreground service/background audio |
| Room roles | Local seat/lock/kick/mute changes, anyone appears as owner | Server ownership/admin checks, bans and audit logs |
| Gifts | `G`, `sendGift`, local deductions and `botGift` | Atomic sender debit/receiver credit/XP/reward/ledger; real event delivery |
| Lucky gifts | `Math.random`, client minor flag | Server secure random rolls, age/country rules, configurable limits/kill switch |
| Room Reward | `S.rr`, `rewardAdd`, client clock | Per-room accruals, current-owner permission, atomic 7-day claim and fraud exclusions |
| Rankings | `CFG.wealth`, multipliers, own rank 128 and 52,000 points | Actual period/category aggregates |
| Shop | Frame/entry/SVIP/store placeholders, static SVIP 1 | Catalog, purchases, entitlements and effects |
| Safety/support | Report/block/success toasts, support placeholder | Real report queue, block enforcement, support conversations |
| Policy | `POLD` static template | Admin-versioned texts, acceptance history and deletion workflow |
| Native services | Layout/Back/orientation only | Real voice lifecycle, permissions, push, uploads and signing |
| Admin panel | Not implemented | Mandatory 2FA, RBAC, audit trail and modules from section 6 |

## Data/logic cautions for the backend phase

The shared bridge is only a UI transport; it provides no permissions or financial trust. Local guest and age checks are not server enforcement. Prototype accounts and balances must not be imported as trusted production balances. Room settings/rewards still share `vr_state_v2`; split them into server records per room. Return wallet values from the API after every transaction. Do not claim a successful recharge, moderation action or message until the server confirms it.

Seed the 30 specified gifts. The supplied Lucky weights sum to 100% and have an expected bonus return of 91%; they are not implemented securely in this phase. Use the specification's 10% room reward, 7-day interval, owner self-gift/fraud exclusions and admin configuration when the transactional backend is built.

## External dependencies pending

Voice provider/account and budget; SMS service; production host/domain; APK-only vs Play/App Store; target countries and recharge channels; initial admins/sellers; final support contact and policy text. The supplied standalone 1024/512 logo files were not attached: native icons currently use the embedded 384px logo (upscaled for iOS).
