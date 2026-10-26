import * as Sdk from 'react-native-google-mobile-ads';

import { createGoogleAds } from '../ads/googleAds';

type Listener = (payload?: unknown) => void;

/** A controllable fake rewarded ad: tests fire SDK events by name. */
function fakeRewarded() {
  const listeners = new Map<string, Set<Listener>>();
  const ad = {
    addAdEventListener: jest.fn((type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
      return () => listeners.get(type)!.delete(fn);
    }),
    load: jest.fn(),
    show: jest.fn(() => Promise.resolve()),
    emit: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
  };
  return ad;
}

const consent = Sdk.AdsConsent as unknown as { gatherConsent: jest.Mock; getConsentInfo: jest.Mock };
const rewardedFactory = Sdk.RewardedAd.createForAdRequest as unknown as jest.Mock;

let ad: ReturnType<typeof fakeRewarded>;
beforeEach(() => {
  ad = fakeRewarded();
  rewardedFactory.mockReset().mockReturnValue(ad);
  consent.gatherConsent.mockReset().mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' });
  consent.getConsentInfo.mockReset().mockResolvedValue({ canRequestAds: false, privacyOptionsRequirementStatus: 'NOT_REQUIRED' });
});

async function readyAdapter() {
  const ads = createGoogleAds('unit');
  await ads.initialize();
  ad.emit('rewarded_loaded');
  expect(ads.isRewardedReady()).toBe(true);
  return ads;
}

describe('Google rewarded ads adapter', () => {
  it('requests non-personalized ads only', async () => {
    await readyAdapter();
    expect(rewardedFactory).toHaveBeenCalledWith('unit', { requestNonPersonalizedAdsOnly: true });
  });

  it('resolves rewarded only after EARNED_REWARD, then close', async () => {
    const ads = await readyAdapter();
    const shown = ads.showRewarded();
    ad.emit('rewarded_earned_reward');
    ad.emit('closed');
    await expect(shown).resolves.toEqual({ kind: 'rewarded' });
  });

  it('closing without the reward callback grants nothing', async () => {
    const ads = await readyAdapter();
    const shown = ads.showRewarded();
    ad.emit('closed');
    await expect(shown).resolves.toEqual({ kind: 'dismissed' });
  });

  it('does not load ads when consent disallows them', async () => {
    consent.gatherConsent.mockResolvedValue({ canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' });
    const ads = createGoogleAds('unit');
    await ads.initialize();
    expect(ads.status()).toEqual({ state: 'notAllowed' });
    expect(ads.privacyOptionsRequired()).toBe(true);
    expect(rewardedFactory).not.toHaveBeenCalled();
    await expect(ads.showRewarded()).resolves.toMatchObject({ kind: 'unavailable' });
  });

  it('falls back to stored consent when gathering fails', async () => {
    consent.gatherConsent.mockRejectedValue(new Error('offline'));
    consent.getConsentInfo.mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' });
    const ads = createGoogleAds('unit');
    await ads.initialize();
    expect(ads.status()).toEqual({ state: 'ready' });
  });

  it('a consent configuration error disables ads unless the dev bypass is explicitly set', async () => {
    consent.gatherConsent.mockRejectedValue(new Error('no form(s) configured'));
    const strict = createGoogleAds('unit');
    await strict.initialize();
    expect(strict.status()).toMatchObject({ state: 'error' });

    const dev = createGoogleAds('unit', { devBypassMissingConsentConfig: true });
    await dev.initialize();
    expect(dev.status()).toEqual({ state: 'ready' });
  });
});
