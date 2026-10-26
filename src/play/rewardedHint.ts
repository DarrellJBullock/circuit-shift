import { create } from 'zustand';

import { ads } from '@/services/ads';
import type { RewardOutcome } from '@/services/ads/rewardFlow';
import { track } from '@/services/analytics/analytics';
import { useGame } from '@/state/gameStore';

/** Reactive view of whether a rewarded hint can be offered. */
interface AdsUiState {
  /** False once ads are known to be unusable (disabled, declined consent, init error). */
  readonly available: boolean;
  readonly busy: boolean;
  set(patch: Partial<Omit<AdsUiState, 'set'>>): void;
}

export const useAdsUi = create<AdsUiState>((set) => ({
  available: ads.status().state !== 'disabled',
  busy: false,
  set: (patch) => set(patch),
}));

const LOAD_TIMEOUT_MS = 8_000;
let initialized = false;

async function waitUntilReady(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (ads.isRewardedReady()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return ads.isRewardedReady();
}

/**
 * Player-initiated only: gathers consent on first use, loads, pauses the
 * game while the ad is on screen, then resumes. The returned outcome is the
 * ad SDK's verdict; callers pass it to `requestRewardedHint`, which grants
 * nothing unless it is `rewarded`.
 */
export async function watchAdForHint(): Promise<RewardOutcome> {
  const ui = useAdsUi.getState();
  if (ui.busy) return { kind: 'unavailable', reason: 'An ad is already in progress.' };
  ui.set({ busy: true });
  try {
    if (!initialized) {
      initialized = true;
      await ads.initialize();
    }
    if (ads.status().state !== 'ready') {
      if (__DEV__) console.warn('[ads] not ready after initialize:', JSON.stringify(ads.status()));
      useAdsUi.getState().set({ available: false });
      return { kind: 'unavailable', reason: 'Ads are not available.' };
    }
    ads.preloadRewarded();
    if (!(await waitUntilReady(LOAD_TIMEOUT_MS))) {
      return { kind: 'unavailable', reason: 'No ad is available right now. Try again later.' };
    }
    const { dispatch } = useGame.getState();
    dispatch({ type: 'pause' });
    const outcome = await ads.showRewarded();
    useGame.getState().dispatch({ type: 'resume' });
    if (outcome.kind === 'rewarded') track('rewarded_ad_completed', { placement: 'hint' });
    return outcome;
  } finally {
    useAdsUi.getState().set({ busy: false });
  }
}
