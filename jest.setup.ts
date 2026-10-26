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
