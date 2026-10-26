# Tasks

Legend: ✅ done · 🔄 in progress · ⬜ todo · 🔑 needs an external decision or credential

## Phase 1: Environment, architecture, engine, one playable puzzle
- ✅ Verify toolchain; scaffold Expo SDK 58 TypeScript app; install the stack via `expo install`
- ✅ expo-router entry, `src/app` routes, dark theme, splash colour, typed routes
- ✅ Engine: ports and rotation, immutable tiles, board, BFS power, colour shorts, completion rules
- ✅ Game reducer: rotate, undo, reset, tick, pause/resume, hint; snapshot/restore
- ✅ Scoring (0.90 / 0.65 thresholds; hint cap), seeded PRNG
- ✅ Exact layered-BFS solver with state/time limits, symmetry collapse, hints from the current state
- ✅ Level schema, non-throwing validator, authoring notation, registry with load-time validation
- ✅ Level 1-1 "First Spark" (proven optimal: 9 moves)
- ✅ Skia board: animated rotation, depth-staggered power, pulse glow, reduced motion, accessible hit grid
- ✅ Screens: Home, Chapters, Level select, Gameplay (with pause and completion overlays), Settings and privacy
- ✅ Haptics adapter respecting the settings toggle
- ✅ 86 tests; `scripts/validate-levels.ts`
- ✅ Native dev build verified on the iOS simulator

## Phase 2: Complete rules, tests, undo/reset polish
- ✅ ESLint 9 (`eslint-config-expo` 58) + type-aware `no-floating-promises` / `no-misused-promises`; engine import-purity rule; `lint` in `npm run check`
- ✅ Undoable reset (history entries are `rotate` | `reset`); Reset disabled only when the board is at its start
- ✅ Route error boundaries (`RouteError`) on the root layout and the gameplay route
- ✅ Gameplay integration tests through the real `src/app` router (Skia stubbed): Home→Play, moves/undo, solve→3★, undo of reset, pause/resume, background auto-pause, unknown level
- ✅ Fuzz tests: 2,000 corrupted levels never reach the validator's crash fallback; random action sequences keep reducer invariants; same-seed replay identical
- ✅ **Bug fix (found on simulator):** overlapping taps were dropped by `Pressable` (single responder). The board now uses raw multi-touch events per finger; cells are accessibility-only Views with an `activate` action
- ✅ **Bug fix (found on simulator):** the pause overlay's exit animation swallowed taps right after Resume; overlays now dismiss instantly
- ✅ Simulator walkthrough: Play → taps → Undo → Reset → Undo-reset → Pause/Resume → solve in 9 → 3★ "Optimal 9" "New best"
- ⬜ Manual check on a device with VoiceOver on: double-tap a tile rotates it (the `activate` action path is unit-tested but not device-verified)
- ⬜ Check the first-rotation render lag seen once in the debug build, using a Release build (`expo run:ios --configuration Release`)
- Decision: **no counter-clockwise rotation.** It would change the move model and invalidate proven optimal counts and star thresholds. VoiceOver rotates with the standard activate gesture.

## Phase 3: Solver, level schema, progression, 20 levels
- ⬜ SQLite: `db.ts`, versioned migrations (`schema_version` table), progress repo, settings repo, session repo
- ⬜ Hydrate stores before hiding the splash; persist on background and on completion
- ⬜ Resume an interrupted game from `snapshotGame` (Continue button)
- ⬜ Migration tests (fresh install, v1→v2 upgrade, corrupt row handling)
- ⬜ Bounded heuristic solver for large boards (constraint DFS with edge-consistency pruning + branch-and-bound; reports `upperBound` when cut off)
- ⬜ Generator `gen-1`: solved spanning circuit → branches/obstacles → seeded scramble → reject trivial/unsolvable/too-complex → save metadata
- ⬜ Chapter 1 complete (20 levels), each with proven optimum where feasible

## Phase 4: Graphics, animation, audio, accessibility
- ⬜ Completion particle burst (restrained; disabled under reduced motion)
- ⬜ Power-flow pulses travelling along wires
- ⬜ Audio adapter (expo-audio) + original SFX 🔑 source or commission licensed sounds
- ⬜ Sound toggle in Settings (hidden until audio exists)
- ⬜ Display font 🔑 choose an OFL-licensed font
- ⬜ Dynamic Type check; VoiceOver pass on every screen
- ⬜ Performance profiling on a midrange iPhone (60 fps target; pause the Skia clock when idle)

## Phase 5: Remaining levels, daily challenge, hints
- ⬜ Chapters 2 and 3 (40 levels; violet signals in chapter 3)
- ⬜ Daily challenge: `hashSeed("daily:YYYY-MM-DD:gen-1")` (UTC), stored history, stability test across versions
- ⬜ Hint UI and economy 🔑 free hints per level vs rewarded ad (balancing decision)
- ⬜ Tutorial (playable, skippable) using levels 1-1..1-3 with callouts

## Phase 6: Purchases, ads, analytics, privacy
- ⬜ Verify SDK-58 compatibility of `react-native-purchases` and `react-native-google-mobile-ads`
- ⬜ `PurchasesAdapter` (disabled state when no key) with restore purchases; entitlements kept separate from progress 🔑 RevenueCat key, product IDs
- ⬜ `AdsAdapter`: rewarded only, test units in dev, ATT/UMP consent; grants only on a verified reward callback 🔑 AdMob IDs
- ⬜ Shop screen (remove ads, premium chapter, founder bundle)
- ⬜ `Analytics` typed interface with a no-op/disabled implementation, plus event catalogue 🔑 analytics provider
- ⬜ Tests: purchases cannot unlock from local flags; reward requires the callback

## Phase 7–8: TestFlight, balancing, release
- ⬜ EAS project, `eas.json` profiles 🔑 Apple Developer team
- ⬜ App Store assets from real screenshots; privacy nutrition label
- 🔑 Privacy policy URL and support URL (placeholders are clearly marked in Settings)

## Open decisions
- 🔑 Bundle ID: proposed `com.evercrestinteractive.circuitshift`
- 🔑 iPad support: currently `supportsTablet: false` (portrait phone only), which avoids iPad screenshot requirements for MVP
- Template `LICENSE` (Expo's MIT boilerplate) was removed with `git rm`. Add Evercrest's own license or terms if wanted.
