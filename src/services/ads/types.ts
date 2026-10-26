import type { RewardOutcome } from './rewardFlow';

export type { RewardOutcome };

export type AdsStatus =
  | { readonly state: 'disabled'; readonly reason: string }
  /** Consent not yet gathered or ads not allowed for this user (e.g. declined in the consent form). */
  | { readonly state: 'notAllowed' }
  | { readonly state: 'ready' }
  | { readonly state: 'error'; readonly message: string };

/**
 * Rewarded ads only: no banners, interstitials or app-open ads, ever.
 * Ads are shown only when the player explicitly asks (e.g. for a hint), never
 * automatically, and the game is paused while one is on screen.
 */
export interface AdsAdapter {
  status(): AdsStatus;
  /** Gathers consent (UMP), then initializes the SDK if ads may be requested. */
  initialize(): Promise<void>;
  isRewardedReady(): boolean;
  /** Begins loading a rewarded ad in the background (no-op if loading or loaded). */
  preloadRewarded(): void;
  /** Shows a loaded rewarded ad; resolves `rewarded` only on the SDK's reward callback. */
  showRewarded(): Promise<RewardOutcome>;
  /** Whether the consent form offers a "privacy options" entry point (Settings). */
  privacyOptionsRequired(): boolean;
  showPrivacyOptions(): Promise<void>;
}
