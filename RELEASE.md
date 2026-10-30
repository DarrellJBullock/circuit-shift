# Release runbook

Status legend: ✅ ready in repo · 🔑 needs Evercrest (account, credential or decision) · ⬜ to do

## 1. One-time setup (🔑, run by an account owner)

These steps create remote resources or need Apple credentials, so they are run by a person, not by
automation in this repo.

Use `npx eas-cli@latest` (the repo doesn't pin a global `eas`). The EAS project is already linked
(`@djb215/circuit-shift`, `extra.eas.projectId` in app.json); signing credentials are created by EAS
on the first production build when you sign in to your Apple Developer account.

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami      # should print the project owner, djb215
```

App Store Connect:
- Create the app record for bundle ID `com.evercrestinteractive.circuitshift`.
- Create **one** non-consumable in-app purchase for 1.0: "Remove Ads". Do not create or submit
  "Premium Chapters" or "Founder Bundle": the app hides them until a premium chapter ships (see
  `store/review-notes.md`; RevenueCat setup in DEVELOPMENT.md).
- ✅ App record created; its **Apple ID** `6828283301` is set as `submit.production.ios.ascAppId` in
  `eas.json`, so `eas submit` uploads to it without asking.

EAS environment variables, **production** environment, for example:

```bash
npx eas-cli@latest env:set --name ADMOB_IOS_APP_ID --value "ca-app-pub-…~…" --environment production --visibility plaintext
npx eas-cli@latest env:list --environment production
```

| Name | Visibility | Notes |
|---|---|---|
| `ADMOB_IOS_APP_ID` | plain text | Required: production builds fail without it |
| `EXPO_PUBLIC_ADMOB_REWARDED_IOS` | plain text | Rewarded unit ID |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | plain text | RevenueCat **public** SDK key, never a secret key |

Leaving any optional value unset ships that feature disabled, not broken.

## 2. TestFlight build

```bash
npm run check                                                   # typecheck, lint, all tests, level validation
npx eas-cli@latest build -p ios --profile production            # remote build; buildNumber auto-increments
npx eas-cli@latest submit -p ios --profile production --latest  # uploads to App Store Connect → TestFlight
```

`eas.json` profiles: `development` (dev client, simulator), `preview` (internal distribution),
`production` (store; `autoIncrement`, `appVersionSource: remote`). Add `--auto-submit` to the build
command to upload as soon as the build finishes.

Before inviting testers: walk through the regression checklist (§4) on the TestFlight build.

## 3. App Store privacy ("nutrition label") draft

Based on what the code does and on Google's and RevenueCat's published disclosures, checked 30 October
2026. **Re-check against the final SDK set and their current disclosures before submitting.**

- **Tracking:** No for every data type. Ads are requested non-personalized only and there is no ATT
  prompt. Google's own privacy manifest has not been inspected, so legal review should confirm this.
- **Data collected by the app itself:** none. Progress lives in on-device SQLite only. The types below
  come from Google Mobile Ads (only when a player chooses a rewarded ad) and RevenueCat.
- **Data types to declare** (Apple counts data tied to a device, and legally defined personal data, as
  linked):

  | Data type | Source | Purposes | Linked to user | Tracking |
  |---|---|---|---|---|
  | Coarse Location | Google | Third-Party Advertising, Analytics | Yes | No |
  | Device ID | Google | Third-Party Advertising, Analytics | Yes | No |
  | Purchases | RevenueCat | App Functionality, Analytics | No | No |
  | Product Interaction | Google | Third-Party Advertising, Analytics | Yes | No |
  | Advertising Data | Google | Third-Party Advertising, Analytics | Yes | No |
  | Crash Data | Google | App Functionality, Analytics, Third-Party Advertising | No | No |
  | Performance Data | Google | Analytics, Third-Party Advertising | Yes | No |

  Do not declare User ID: RevenueCat asks for it only with custom app user IDs, and this app uses its
  anonymous ones. Linked answers are a judgment call for legal review: Google's page does not state
  them, and the Purchases and Crash Data answers follow RevenueCat's and Google's own wording.
- **Analytics:** none unless a vendor is added. Then update this section and the policy.
- **Privacy policy URL:** https://evercrest-interactive.com/apps/circuit-shift/privacy.html (`src/services/links.ts`, linked from Settings). Enter it in App Store Connect,
  and make sure the published page matches the reviewed policy.
- **Support URL:** https://evercrest-interactive.com/apps/circuit-shift/support.html (`src/services/links.ts`, linked from Settings). Enter it in App Store Connect.

## 4. Release regression checklist (manual, on the TestFlight build)

Automated coverage runs in `npm run check` (all 60 levels completed through the real store,
persistence, offline guard, monetization invariants, performance budgets). Also do by hand:

- ⬜ Fresh install: Home → Play reaches a coached level in under 20 s; Skip tutorial works.
- ⬜ First rotation animates immediately (no lag on the first move; seen once in a debug build).
- ⬜ Force-quit mid-level → Continue restores board, moves and timer.
- ⬜ Airplane mode: every screen and level works; Shop shows the store as unavailable.
- ⬜ VoiceOver: navigate tiles, double-tap rotates, announcements for power, completion and hints.
- ⬜ Largest accessibility text size: no clipped controls on Home, Play or Settings.
- ⬜ Reduce Motion (iOS setting): rotations snap, no pulses or burst; gameplay identical.
- ⬜ Silent switch on: no sound effects. Off: sounds play and mix with music.
- ⬜ Rewarded ad (with real config): consent form where required; close early → no hint;
  watch fully → exactly one hint.
- ⬜ Purchases (sandbox account): buy, kill the app, relaunch → still owned; Restore on a second device.
- ⬜ Daily challenge rolls over at 00:00 UTC and previous days stay identical.

## 5. App Store listing (Phase 8)

- ✅ Drafts in `store/`: listing copy (limits checked by `npm run check-listing`), review notes, age
  rating, privacy policy and support page. The policy and support page need review and publishing.
- ✅ Screenshots: `store/screenshots/01–06` (6.9", 1320×2868), real captures from the Release build.
  Upload in that order (gameplay first). Recapture if the UI changes visibly.
- ✅ App icon: original rendered art (`npm run render-brand-assets`); optional designer pass.
- **IAPs for 1.0:** submit "Remove Ads" only. The app hides premium products until premium content exists.
