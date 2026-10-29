# Circuit Shift

![Expo SDK 58](https://img.shields.io/badge/Expo-SDK_58-000020?logo=expo&logoColor=white)
![React Native 0.88](https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Platform iOS](https://img.shields.io/badge/platform-iOS-lightgrey?logo=apple)
![Offline first](https://img.shields.io/badge/offline-first-37DDF7)

A premium, offline-first sci-fi puzzle game by **Evercrest Interactive**. Rotate circuit tiles to route
power from sources to receivers. iOS first; the architecture is Android-compatible.

> Status: **1.0.0 release candidate**: all eight phases are implemented, and App Store screenshots and listing drafts are ready. Store submission is waiting on Evercrest accounts and the privacy/support URLs; see [RELEASE.md](RELEASE.md), [store/](store/) and [TASKS.md](TASKS.md).

## Quick start

```bash
npm install
npm run check          # typecheck + lint + tests + level validation
npm run ios            # native dev build on the iOS simulator (needs Xcode + CocoaPods)
npm start              # Metro for an already-installed dev build
```

The app uses native modules (Skia, Reanimated, SQLite, Haptics, Audio), so it runs in a
**development build**, not Expo Go. See [DEVELOPMENT.md](DEVELOPMENT.md) for setup and
environment notes.

## Gameplay rules (MVP)

- Tiles expose ports on a 4-bit mask: `NORTH=1, EAST=2, SOUTH=4, WEST=8`. Tapping a tile rotates it
  a quarter turn clockwise. Locked tiles (sources, receivers, and anything marked locked) never rotate.
- Two neighbouring tiles connect only when **both** open ports face each other.
- Power floods from every source through connected tiles (BFS).
- **Colour rule:** a connected network carries one signal colour. If sources of different colours
  join one network, it **shorts**: nothing in it is powered, and it is drawn in the error colour.
- A level is complete when every receiver gets a colour it accepts, nothing is shorted, and the
  level constraints hold (`noOpenEnds`: no dangling ports on powered tiles; `allTilesPowered`).
- Stars: efficiency = reference ÷ moves. ≥ 0.90 earns ★★★, ≥ 0.65 earns ★★, otherwise ★. Using a hint caps the
  result at ★★. The reference is called **Optimal** only when the solver has proved it minimal;
  otherwise the UI says **Target**.

## Project layout

```
src/app/        Expo Router screens (thin)
src/engine/     Pure, deterministic game logic (no React/RN imports) + tests
src/levels/     Level schema, validator, authoring notation, data, registry
src/render/     Skia board renderer, tile geometry, accessibility layer
src/play/       Gameplay overlays (pause, completion)
src/state/      Zustand stores (game session, progress, settings)
src/services/   Device adapters (haptics, audio, feedback; later analytics, purchases, ads)
src/storage/    SQLite interface, migrations, repositories, persistence wiring
src/ui/         Theme tokens and shared components
scripts/        Node scripts (level validation and generation, SFX synthesis)
assets/audio/   Original synthesized sound effects
test/           Jest support: in-memory SQLite adapter, Reanimated mock
```

## Required configuration before release

These are **not configured** and must be supplied by Evercrest Interactive:

| Item | Where | Status |
|---|---|---|
| Privacy policy URL | Settings screen, App Store Connect | **NOT SET** |
| Support URL | Settings screen, App Store Connect | **NOT SET** |
| Bundle identifier | `app.json` → `com.evercrestinteractive.circuitshift` | confirmed |
| Apple Team / EAS project | `eas init`, `eas.json` | not set up |
| RevenueCat public SDK key & products | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` + dashboard (DEVELOPMENT.md) | **not set**: store disabled |
| AdMob app ID & rewarded unit | `ADMOB_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_IOS` + consent message | **not set**: dev uses Google test IDs; production builds refuse to build |
| Analytics vendor | `setAnalyticsSink()` | **none**: nothing is sent |

Purchases and ads ship **disabled** until configured. The app never simulates a purchase or an ad reward.
