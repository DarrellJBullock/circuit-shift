import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import { type AdEvent, INITIAL_REWARD_FLOW, type RewardOutcome, rewardFlow } from './rewardFlow';
import type { AdsAdapter, AdsStatus } from './types';

/** Upper bound on a single showing; protects against a missing close callback. */
const SHOW_TIMEOUT_MS = 120_000;

/**
 * Google Mobile Ads adapter (rewarded only).
 * - Consent first: UMP `gatherConsent`; nothing loads unless `canRequestAds`.
 * - Non-personalized requests only, so no ATT prompt / tracking.
 * - Rewards are decided by `rewardFlow` from the SDK's EARNED_REWARD event.
 */
export interface GoogleAdsOptions {
  /**
   * Development only: when using Google's test unit and the consent
   * framework is not configured for the app ID (always true for Google's
   * sample app ID), continue with test ads so the reward flow can be
   * exercised. Never set for release builds.
   */
  readonly devBypassMissingConsentConfig?: boolean;
}

export function createGoogleAds(rewardedUnitId: string, options: GoogleAdsOptions = {}): AdsAdapter {
  let status: AdsStatus = { state: 'notAllowed' };
  let privacyRequired = false;
  let ad: RewardedAd | null = null;
  let loaded = false;
  let loading = false;

  const preload = () => {
    if (status.state !== 'ready' || loaded || loading) return;
    loading = true;
    const next = RewardedAd.createForAdRequest(rewardedUnitId, { requestNonPersonalizedAdsOnly: true });
    const offLoaded = next.addAdEventListener(RewardedAdEventType.LOADED, () => {
      loaded = true;
      loading = false;
      offLoaded();
      offError();
    });
    const offError = next.addAdEventListener(AdEventType.ERROR, () => {
      loading = false;
      offLoaded();
      offError();
    });
    ad = next;
    next.load();
  };

  return {
    status: () => status,

    initialize: async () => {
      try {
        let consentError: unknown = null;
        // Google's recommended flow: if gathering fails (e.g. offline), fall
        // back to the consent state stored from a previous session.
        const info = await AdsConsent.gatherConsent().catch(async (e: unknown) => {
          consentError = e;
          return AdsConsent.getConsentInfo().catch(() => null);
        });
        privacyRequired = info?.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
        const bypass = consentError !== null && options.devBypassMissingConsentConfig === true;
        if (bypass && __DEV__) console.warn('[ads] DEV: consent not configured for this app ID; continuing with test ads');
        if (!info?.canRequestAds && !bypass) {
          status = consentError ? { state: 'error', message: String(consentError) } : { state: 'notAllowed' };
          return;
        }
        await mobileAds().initialize();
        status = { state: 'ready' };
        preload();
      } catch (e) {
        status = { state: 'error', message: String(e) };
      }
    },

    isRewardedReady: () => status.state === 'ready' && loaded,
    preloadRewarded: preload,

    showRewarded: () =>
      new Promise<RewardOutcome>((resolve) => {
        const current = ad;
        if (status.state !== 'ready' || !current || !loaded) {
          resolve({ kind: 'unavailable', reason: 'No ad is ready yet.' });
          return;
        }
        loaded = false;
        let state = INITIAL_REWARD_FLOW;
        const unsubscribers: (() => void)[] = [];
        const timer = setTimeout(() => step({ type: 'timeout' }), SHOW_TIMEOUT_MS);
        const step = (event: AdEvent) => {
          state = rewardFlow(state, event);
          if (state.phase === 'settled' && state.outcome) {
            clearTimeout(timer);
            unsubscribers.forEach((u) => u());
            ad = null;
            preload(); // get the next one ready
            resolve(state.outcome);
          }
        };
        unsubscribers.push(
          current.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => step({ type: 'earned' })),
          current.addAdEventListener(AdEventType.CLOSED, () => step({ type: 'closed' })),
          current.addAdEventListener(AdEventType.ERROR, (e) => step({ type: 'error', message: String(e) })),
        );
        current.show().catch((e: unknown) => step({ type: 'error', message: String(e) }));
      }),

    privacyOptionsRequired: () => privacyRequired,
    showPrivacyOptions: async () => {
      try {
        await AdsConsent.showPrivacyOptionsForm();
      } catch {
        // Form unavailable (e.g. offline); nothing to do.
      }
    },
  };
}
