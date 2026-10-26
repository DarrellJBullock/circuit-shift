# Circuit Shift

A premium, offline-first sci-fi puzzle game by **Evercrest Interactive**. Rotate circuit tiles to route
power from sources to receivers. iOS first; the architecture is Android-compatible.

> Status: **Phase 5 complete**: 60 validated levels in 3 chapters, a daily challenge, hints and a skippable tutorial, all offline. See [TASKS.md](TASKS.md).

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
| Bundle identifier | `app.json` → `com.evercrestinteractive.circuitshift` (proposed; confirm) | needs confirmation |
| Apple Team / EAS project | `eas init`, `eas.json` | not set up |
| RevenueCat public SDK key & products | Phase 6 | not set up |
| AdMob app ID & ad unit IDs | Phase 6 | not set up |

Purchases and ads ship **disabled** until configured. The app never simulates a purchase or an ad reward.
