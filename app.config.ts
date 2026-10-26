/**
 * Dynamic Expo config layered on app.json. Supplies monetization settings
 * from the environment so nothing deployment-specific is committed.
 *
 * Required for production builds (EAS profile "production"):
 *   ADMOB_IOS_APP_ID, ADMOB_ANDROID_APP_ID
 * Optional (features stay disabled when absent):
 *   EXPO_PUBLIC_REVENUECAT_IOS_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
 *   EXPO_PUBLIC_ADMOB_REWARDED_IOS, EXPO_PUBLIC_ADMOB_REWARDED_ANDROID
 *
 * In development the AdMob app IDs fall back to Google's published sample
 * app IDs, which only ever serve test ads.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_SAMPLE_APP_ID = {
  ios: 'ca-app-pub-3940256099942544~1458507309',
  android: 'ca-app-pub-3940256099942544~3347511713',
} as const;

const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

function admobAppId(platform: 'ios' | 'android'): string {
  const name = platform === 'ios' ? 'ADMOB_IOS_APP_ID' : 'ADMOB_ANDROID_APP_ID';
  const value = platform === 'ios' ? process.env.ADMOB_IOS_APP_ID : process.env.ADMOB_ANDROID_APP_ID;
  if (value) return value;
  if (isProductionBuild) {
    throw new Error(`${name} must be set for production builds (see DEVELOPMENT.md → Monetization).`);
  }
  return GOOGLE_SAMPLE_APP_ID[platform];
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: admobAppId('ios'),
        androidAppId: admobAppId('android'),
        // Nothing initializes until the player opts into a rewarded ad after consent.
        delayAppMeasurementInit: true,
      },
    ],
  ],
});
