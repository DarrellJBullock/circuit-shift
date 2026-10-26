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
- ✅ SQLite storage behind a small `SqlDatabase` interface (expo-sqlite in the app, `node:sqlite` in tests)
- ✅ Versioned migrations via `PRAGMA user_version`. Each migration runs in one transaction with its version bump; downgrades are refused (`newerSchema`). Schema v1: `level_progress`, `settings`, `sessions`, `daily_challenges`
- ✅ Repositories that sanitize every row read from disk (corrupt rows are skipped, never thrown)
- ✅ Persistence layer: loads stores before the splash hides (3s timeout, then runs from memory); writes settings and results through one serialized queue; saves the in-progress game debounced after moves, immediately on background and on leaving a level; clears it on completion
- ✅ Resume an interrupted game (Continue on Home; automatic when reopening that level). A layout fingerprint discards snapshots from changed levels (seen working on device)
- ✅ Bounded search solver `dfs-bb-1`: row-major DFS with exact port-consistency pruning on strict levels plus branch-and-bound; reports `optimal`, `feasible` (upper bound), `unsolvable` or `unknown`. `solveAuto` picks the solver; hints use it
- ✅ Property test: the DFS agrees with the exhaustive BFS on 60 generated boards (state spaces up to 262,144)
- ✅ Generator `gen-1`: obstacles → round-robin spanning trees → tile types → locked hint wires → seeded scramble → solver validation with move/receiver bounds; deterministic retries
- ✅ Chapter 1 complete: 20 levels (3 hand-built tutorials + 17 generated from `src/levels/plans.ts`), every optimum proven; `npm run generate-levels`; a test regenerates every level and requires an exact match with the committed JSON
- ✅ Simulator: persistence survives force-kill → Continue restores board, moves and timer; 7×8 board renders with ≥ 44pt cells
- ⬜ Gate the play route on unlock state. Deep links currently bypass level-select locking; required before premium chapters (Phase 6)
- ⬜ 1-12 "Crossroads" needed attempt 173/200 to find a cross; give `minCrosses` plans a higher `maxAttempts` if their bounds are retuned
- Note: proving optimality takes only 30–45 search states per level, because tree circuits are almost fully determined by local constraints. That makes the levels logically solvable, but more loops and ambiguity may be wanted for hard tiers (Phase 5/7 balancing)

## Phase 4: Graphics, animation, audio, accessibility
- ✅ Power-flow pulses: dashes travel away from the source along every powered wire. The dash period is half a cell, so all tiles share one phase and pulses stay continuous across tiles (seen on device). Direction comes from `inflowPort` (engine, unit-tested)
- ✅ Completion burst: seeded Skia sparks from the source and every receiver; three animated paths in total, whatever the receiver count; not rendered under reduced motion
- ✅ Original audio: `npm run synthesize-sfx` generates rotate/locked/connect/win/tap WAVs from sine partials and seeded noise (deterministic, Evercrest-owned). `expo-audio` adapter: ambient session (respects the silent switch, mixes with music), a pooled rotate cue, and it disables itself on failure
- ✅ `feedback()` pairs sound and haptics per event. A "connect" chime plays when a move powers a new receiver. Sound effects toggle in Settings
- ✅ Contrast audit as a test (WCAG 1.4.3 / 1.4.11): all text ≥ 6.8:1. Idle wires raised from 1.88:1 to 3.22:1 (`#5675A0`). Tile outlines and the blocked hatch are documented as decorative
- ✅ Non-colour short-circuit cue (broken, dashed wire core); colour signals already use circle/diamond glyphs
- ✅ VoiceOver announcements after each move: receivers powered or lost (with count), new short circuits, completion with stars
- ✅ Dynamic Type: body text scales fully; dense labels capped (`fontScale`); button labels shrink to fit
- ⬜ Listen to the SFX on a device and tune levels/timbre (they're synthesized; adjust `scripts/synthesize-sfx.ts`)
- ⬜ Watch the completion burst on device (the simulator was in use during this phase)
- ⬜ Device check at the largest accessibility text size (`xcrun simctl ui <device> content_size accessibility-extra-extra-extra-large`)
- ⬜ Performance profiling on a midrange iPhone; pause the Skia clock when nothing animates (with reduced motion on it currently still ticks)
- 🔑 Display font: pick an OFL-licensed typeface (system font for now)

## Phase 5: Remaining levels, daily challenge, hints
- ✅ **60 validated levels.** Chapter 2 "Grid Lock" (2–3 same-colour sources, up to 15 receivers, 7×9) and chapter 3 "Spectrum" (cyan/violet networks; up to 4 sources). Every optimum is proven and every level reproduces from its seed in tests
- ✅ Compatible receivers (chapter 3): accept either colour; neutral white ring plus diamond-and-dot glyph; VoiceOver says "Accepts cyan or violet"
- ✅ Generator hardening: rejects layouts where a planned network never grew (a source would silently vanish); a test checks source counts against plans
- ✅ Progression module: sequential levels; chapter k+1 opens at 15/20 of chapter k; skipping the tutorial opens 1-1…1-4. Level select, chapter cards, Home and the **play route** all enforce it (closes the deep-link gap); "Next level" only shows when that level is unlocked
- ✅ Hints: the solver works from the current board, an amber flash ring marks the tile, VoiceOver announces it; **3 free per level** (`play/hintPolicy.ts`, interim until rewarded ads); hinted results cap at ★★
- ✅ Daily challenge: UTC date → `hash("daily:<date>:<version>")`; append-only `DAILY_GENERATOR_SCHEDULE`; weekday difficulty ramp (cyan only); pinned fingerprints for three dates; a full year generates; results stored in `daily_challenges` with generator version and seed; Daily screen with today plus the previous 6 days and a countdown to 00:00 UTC
- ✅ Tutorial: coach cards on 1-1…1-3, guide rings on tiles still to rotate (1-1, 1-2), Skip (persisted), completes on finishing 1-3; a first-launch test confirms a new player reaches a coached level from Home in one tap
- ✅ Fix: "Quit to levels" pushed duplicate list screens; now uses `router.dismissTo`
- ✅ Simulator: daily screen, a daily board ("Optimal 19", matching the pinned test), hint flash and counter, Continue resuming a daily, chapter locks, level select, tutorial card and guide ring
- ⬜ Balancing pass (Phase 7): move curves dip in places (e.g. 1-12, 2-04, 3-06); review with playtesters
- ⬜ Analytics hooks for tutorial_start/complete, hint_used, daily_start/complete (Phase 6 typed interface)

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
