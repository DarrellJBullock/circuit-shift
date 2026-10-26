import type { AdsAdapter } from './types';

/** Used when no rewarded unit is configured. Never reports a reward. */
export function createDisabledAds(reason: string): AdsAdapter {
  return {
    status: () => ({ state: 'disabled', reason }),
    initialize: async () => undefined,
    isRewardedReady: () => false,
    preloadRewarded: () => undefined,
    showRewarded: async () => ({ kind: 'unavailable', reason }),
    privacyOptionsRequired: () => false,
    showPrivacyOptions: async () => undefined,
  };
}
