import { TestIds } from 'react-native-google-mobile-ads';

import { monetizationConfig } from '../monetization';
import { createDisabledAds } from './disabled';
import { createGoogleAds } from './googleAds';
import type { AdsAdapter } from './types';

export type * from './types';

/**
 * Rewarded unit: the configured one, or Google's test unit in development
 * builds only. Release builds without a configured unit have ads disabled.
 */
function rewardedUnit(): string | null {
  if (monetizationConfig.rewardedAdUnitId) return monetizationConfig.rewardedAdUnitId;
  return __DEV__ ? TestIds.REWARDED : null;
}

const unit = rewardedUnit();
export const ads: AdsAdapter = unit
  ? createGoogleAds(unit, { devBypassMissingConsentConfig: __DEV__ && unit === TestIds.REWARDED })
  : createDisabledAds('Ads not configured in this build (EXPO_PUBLIC_ADMOB_REWARDED_* unset).');
