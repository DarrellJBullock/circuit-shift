// Entry for `react-native-reanimated` in Jest. The implementation lives in a
// separate file because expo-router/testing-library's factory requires
// `react-native-reanimated/mock`, which must not resolve to this mocked path.
export * from './reanimated.impl';
export { default } from './reanimated.impl';
