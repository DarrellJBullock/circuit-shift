import { Platform } from 'react-native';

/**
 * Public, client-side monetization config, inlined at build time from
 * EXPO_PUBLIC_* variables (see app.config.ts / DEVELOPMENT.md). These are not
 * secrets: RevenueCat public SDK keys and AdMob unit IDs ship inside every
 * app binary. Missing values keep the feature disabled.
 */
function pick(ios: string | undefined, android: string | undefined): string | null {
  const v = Platform.OS === 'ios' ? ios : Platform.OS === 'android' ? android : undefined;
  return v && v.trim() ? v.trim() : null;
}

export const monetizationConfig = {
  revenueCatApiKey: pick(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY),
  rewardedAdUnitId: pick(process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS, process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID),
} as const;

/**
 * Store product → entitlement mapping, mirrored in the RevenueCat dashboard.
 * Entitlement identifiers there must be exactly `no_ads` and `premium_content`.
 */
export type ProductKey = 'remove_ads' | 'premium_chapter' | 'founder_bundle';
export type Entitlement = 'no_ads' | 'premium_content';
export const ENTITLEMENTS: readonly Entitlement[] = ['no_ads', 'premium_content'];

/** RevenueCat package identifiers in the "default" offering. */
export const PACKAGE_FOR_PRODUCT: Readonly<Record<ProductKey, string>> = {
  remove_ads: 'remove_ads',
  premium_chapter: 'premium_chapter',
  founder_bundle: 'founder_bundle',
};
