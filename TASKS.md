# Tasks

Legend: ✅ done · ⬜ todo · 🔑 needs Evercrest (account, credential or decision)

**Status (2026-10-28):** all eight phases are implemented. 470 tests pass, all 60 levels validate,
and App Store screenshots and listing drafts are in `store/`. What remains is account setup,
decisions and on-device checks, listed below. The phase history further down records what was built.

## Remaining work

### 1. Blocking App Store submission (🔑)
- 🔑 Publish the privacy policy and support pages (drafts: `store/privacy-policy-draft.md`,
  `store/support-page-draft.md`; the policy needs legal review). Then put the URLs in Settings
  (`src/app/settings.tsx`), `store/listing.md` and App Store Connect
- 🔑 App Store Connect: app record, the "Remove Ads" IAP (only this one for 1.0), listing, age rating,
  privacy labels (drafts in `store/` and RELEASE.md §3)
- 🔑 Set `ADMOB_IOS_APP_ID` in EAS (production builds fail without it). Optional:
  `EXPO_PUBLIC_ADMOB_REWARDED_IOS`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`; features ship disabled without them
- 🔑 `eas build -p ios --profile production`, then `eas submit` (Apple credentials); TestFlight pass (§3 below);
  Submit for Review

### 2. Decisions (🔑)
- 🔑 "Remove Ads" price, and confirm it means unlimited hints without videos (there are no other ads)
- 🔑 Analytics vendor, or none. The privacy policy must match the choice
- 🔑 To enable monetization: RevenueCat project and public SDK key; AdMob app, rewarded unit and a published
  consent message (DEVELOPMENT.md → Setting up RevenueCat / AdMob)
- 🔑 Optional: designer pass on the generated icon; an OFL-licensed display font (system font for now)
- 🔑 iPad: currently `supportsTablet: false` (portrait phone only), which avoids iPad screenshots for 1.0

### 3. On-device verification (TestFlight; full checklist in RELEASE.md §4)
- ⬜ First rotation animates immediately (lag seen once in a debug build; not yet checked on device)
- ⬜ Frame rate and battery on a midrange iPhone (performance profiling)
- ⬜ VoiceOver: double-tap rotates a tile, and power/completion/hint announcements are spoken
- ⬜ Largest accessibility text size: no clipped controls (Home, Play, Settings)
- ⬜ Reduce Motion (iOS setting): rotations snap, no pulses or burst
- ⬜ Sound effects: listen and tune (`scripts/synthesize-sfx.ts`); silent switch respected
- ⬜ Completion spark burst looks right on device
- ⬜ Rewarded ad (with real config): consent form where required; close early → no hint
- ⬜ Sandbox purchase, relaunch → still owned; Restore on a second device
- ⬜ Fresh install, force-quit → Continue, airplane mode, daily rollover at 00:00 UTC

### 4. Optional / later
- ⬜ Playtester balancing pass (the curve is smoothed by `npm run level-report`; real players may disagree)
- ⬜ 1-12 "Crossroads" needed attempt 173/200 to find a cross; raise `maxAttempts` for `minCrosses`
  plans if their bounds are retuned
- ⬜ Server-side verification of rewarded ads (needs a backend; client-side callback check is in place)
- Post-launch features from the brief (not MVP): capacitors, timing puzzles, logic gates, overloads,
  multiplayer, cloud saves, level editor, seasonal passes; premium chapters (the products stay hidden
  until one ships)

---

## Phase history

### Phase 1: Environment, architecture, engine, one playable puzzle
- ✅ Verify toolchain; scaffold Expo SDK 58 TypeScript app; install the stack via `expo install`
- ✅ expo-router entry, `src/app` routes, dark theme, splash colour, typed routes
- ✅ Engine: ports and rotation, immutable tiles, board, BFS power, colour shorts, completion rules
- ✅ Game reducer: rotate, undo, reset, tick, pause/resume, hint; snapshot/restore
- ✅ Scoring (0.90 / 0.65 thresholds; hint cap), seeded PRNG
- ✅ Exact layered-BFS solver with state/time limits, symmetry collapse, hints from the current state
- ✅ Level schema, non-throwing validator, authoring notation, registry with load-time validation
- ✅ First level "First Spark" (proven optimal: 9 moves; now level 1-3)
- ✅ Skia board: animated rotation, depth-staggered power, pulse glow, reduced motion, accessible hit grid
- ✅ Screens: Home, Chapters, Level select, Gameplay (with pause and completion overlays), Settings and privacy
- ✅ Haptics adapter respecting the settings toggle
- ✅ 86 tests at the time; `scripts/validate-levels.ts`
- ✅ Native dev build verified on the iOS simulator

### Phase 2: Complete rules, tests, undo/reset polish
- ✅ ESLint 9 (`eslint-config-expo` 58) + type-aware `no-floating-promises` / `no-misused-promises`; engine import-purity rule; `lint` in `npm run check`
- ✅ Undoable reset (history entries are `rotate` | `reset`); Reset disabled only when the board is at its start
- ✅ Route error boundaries (`RouteError`) on the root layout and the gameplay route
- ✅ Gameplay integration tests through the real `src/app` router (Skia stubbed)
- ✅ Fuzz tests: 2,000 corrupted levels never reach the validator's crash fallback; random action sequences keep reducer invariants
- ✅ **Bug fix (found on simulator):** overlapping taps were dropped by `Pressable`; the board now uses raw multi-touch events per finger
- ✅ **Bug fix (found on simulator):** the pause overlay's exit animation swallowed taps after Resume; overlays now dismiss instantly
- ✅ Simulator walkthrough: Play → taps → Undo → Reset → Undo-reset → Pause/Resume → solve → 3★
- Decision: **no counter-clockwise rotation.** It would change the move model and invalidate proven optimal counts and star thresholds. VoiceOver rotates with the standard activate gesture.
- → VoiceOver and first-move checks moved to **Remaining work §3**

### Phase 3: Solver, level schema, progression, 20 levels
- ✅ SQLite storage behind a small `SqlDatabase` interface (expo-sqlite in the app, `node:sqlite` in tests)
- ✅ Versioned transactional migrations via `PRAGMA user_version`; downgrades refused
- ✅ Repositories that sanitize every row read from disk
- ✅ Persistence: load before the splash hides; serialized write queue; session saved after moves, on background and on leaving a level
- ✅ Resume an interrupted game; a layout fingerprint discards stale snapshots (seen working on device)
- ✅ Bounded search solver `dfs-bb-1` (optimal / feasible / unsolvable / unknown); `solveAuto`; hints use it
- ✅ Property test: DFS agrees with exhaustive BFS on 60 generated boards
- ✅ Generator `gen-1` with deterministic retries and rejection filters
- ✅ Chapter 1 complete (20 levels); `npm run generate-levels`; reproducibility test
- ✅ Simulator: persistence survives force-kill; 7×8 board renders with ≥ 44pt cells
- ✅ Play route gated on unlock state, closing the deep-link gap (done in Phase 5)
- Note: proving optimality takes 30–45 search states per level because tree circuits are almost fully determined by local constraints, so the levels can be solved by logic

### Phase 4: Graphics, animation, audio, accessibility
- ✅ Power-flow pulses directed away from the source, phase-continuous across tiles (seen on device)
- ✅ Seeded completion spark burst (off under reduced motion)
- ✅ Original synthesized SFX (`npm run synthesize-sfx`) and an ambient `expo-audio` adapter
- ✅ `feedback()` pairs sound and haptics; "connect" chime; Sound effects toggle
- ✅ Contrast audit as a test; idle wires raised to 3.22:1
- ✅ Non-colour short-circuit cue; circle/diamond signal glyphs
- ✅ VoiceOver announcements after each move
- ✅ Dynamic Type caps on dense labels; buttons shrink to fit
- ✅ Board stops animating when idle (pausable clock, done in Phase 7)
- → Sound, burst, text-size and profiling checks moved to **Remaining work §3**; display font to **§2**

### Phase 5: Remaining levels, daily challenge, hints
- ✅ 60 validated levels across three chapters, every optimum proven, every level reproducible from its seed
- ✅ Compatible receivers (chapter 3) with neutral rendering and VoiceOver text
- ✅ Generator rejects layouts where a planned network never grew
- ✅ Progression rules enforced by every screen and the play route
- ✅ Solver-driven hints from the current board; 3 free per level; hinted results cap at ★★
- ✅ Deterministic UTC daily challenge with an append-only generator schedule and pinned historical fingerprints
- ✅ Skippable tutorial with coach cards and guide rings
- ✅ Fix: returning to lists no longer stacks duplicate screens
- ✅ Balancing pass with tooling (done in Phase 7)
- ✅ Analytics events for tutorial, hints and daily (done in Phase 6)

### Phase 6: Purchases, ads, analytics, privacy
- ✅ Compatibility verified (`react-native-purchases` 10.15.1, `react-native-google-mobile-ads` 17.4.0); native build launches
- ✅ `app.config.ts`: AdMob IDs from env; production builds fail without them; no microphone or tracking strings
- ✅ Purchases adapter (RevenueCat + disabled state); entitlements in memory only, from verified customer info
- ✅ Rewarded-ads adapter (Google + disabled state); consent on first use; reward decided by a pure state machine
- ✅ Hint economy: free → Remove Ads unlimited → "Hint · Ad"; no forced ads
- ✅ Premium chapter entitlement gate; Shop with restore
- ✅ Typed opt-in analytics (11 events) with a store-driven bridge
- ✅ Privacy section in Settings; tests for every monetization invariant
- ✅ Simulator: a real Google test rewarded ad granted exactly one hint
- → Early-dismiss device check moved to **Remaining work §3**; accounts and decisions to **§2**

### Phase 7: TestFlight, balancing, regression tests
- ✅ Balancing tooling (`npm run level-report`, `minScore` re-seeding); curve dips at 2-04, 2-06, 3-06 fixed; difficulty labels computed
- ✅ Regression suite: all 60 levels completed through the real store at optimum; performance budgets; offline guard
- ✅ Pausable animation clock (no idle 60 fps redraws), with a regression test for a freeze-after-resume bug
- ✅ `eas.json` profiles; Release build compiled and launched on the simulator
- ✅ Privacy manifest checked; original rendered icon/splash replace Expo placeholders
- ✅ `RELEASE.md` runbook
- ✅ `eas init`: project `@djb215/circuit-shift` linked
- → First TestFlight build moved to **Remaining work §1**

### Phase 8: Release preparation and App Store submission
- ✅ Version 1.0.0 (build number managed by EAS)
- ✅ `store/`: listing (limits checked by `npm run check-listing`), review notes, age rating, privacy policy and support drafts
- ✅ Review-risk fix: premium products hidden until premium content exists
- ✅ Six App Store screenshots from the Release build (`store/screenshots/`)
- ✅ Bundle ID `com.evercrestinteractive.circuitshift` confirmed
