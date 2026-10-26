import { monetizationConfig } from '../monetization';
import { createDisabledPurchases } from './disabled';
import { createRevenueCatPurchases } from './revenueCat';
import type { PurchasesAdapter } from './types';

export type * from './types';

/** The app's purchases adapter: RevenueCat when a public key is configured, otherwise disabled. */
export const purchases: PurchasesAdapter = monetizationConfig.revenueCatApiKey
  ? createRevenueCatPurchases(monetizationConfig.revenueCatApiKey)
  : createDisabledPurchases('Store not configured in this build (EXPO_PUBLIC_REVENUECAT_*_KEY unset).');
