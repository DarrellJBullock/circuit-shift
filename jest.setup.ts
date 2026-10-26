// Global Jest mocks for native modules that have no JS implementation.

// react-native-reanimated is mapped to test/mocks/reanimated.ts (see package.json).

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => ({ volume: 1, play: jest.fn(), seekTo: jest.fn(() => Promise.resolve()), remove: jest.fn() })),
}));

// Native store / ads SDKs: inert JS stand-ins. Monetization stays disabled in
// tests unless a test injects its own adapter.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
    getOfferings: jest.fn(() => Promise.resolve({ current: null })),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  },
}));

jest.mock('react-native-google-mobile-ads', () => {
  const listeners = () => jest.fn(() => () => undefined);
  return {
    __esModule: true,
    default: () => ({ initialize: jest.fn(() => Promise.resolve([])) }),
    TestIds: { REWARDED: 'test-rewarded' },
    AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed', OPENED: 'opened' },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED' },
    AdsConsent: {
      gatherConsent: jest.fn(() => Promise.resolve({ canRequestAds: false, privacyOptionsRequirementStatus: 'NOT_REQUIRED' })),
      getConsentInfo: jest.fn(() => Promise.resolve({ canRequestAds: false, privacyOptionsRequirementStatus: 'NOT_REQUIRED' })),
      showPrivacyOptionsForm: jest.fn(() => Promise.resolve({})),
    },
    RewardedAd: { createForAdRequest: jest.fn(() => ({ addAdEventListener: listeners(), load: jest.fn(), show: jest.fn(() => Promise.resolve()) })) },
  };
});
