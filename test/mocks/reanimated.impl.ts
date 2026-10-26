/*
 * Jest stand-in for react-native-reanimated, wired through moduleNameMapper.
 *
 * Why: Reanimated 4.7 cannot load under jest-expo's iOS preset (its native
 * initializer calls setCSSEventHandler, which the JS fallback lacks), and the
 * official `react-native-reanimated/mock` imports the real entry point too.
 * expo-router/testing-library also re-mocks Reanimated via `/mock`; mapping
 * both specifiers here keeps every path on this implementation.
 *
 * Covers only the API surface the app uses. Extend it when adopting new APIs.
 */
import { View } from 'react-native';

const identity = <T>(v: T): T => v;
const layoutAnim: { duration: () => unknown; delay: () => unknown } = {
  duration: () => layoutAnim,
  delay: () => layoutAnim,
};

export const useReducedMotion = (): boolean => false;
export const useSharedValue = <T>(v: T): { value: T } => ({ value: v });
export const useDerivedValue = <T>(fn: () => T): { value: T } => ({ value: fn() });
export const withTiming = identity;
export const withDelay = (_ms: number, v: unknown): unknown => v;
export const withSequence = (...steps: unknown[]): unknown => steps[steps.length - 1];
export const Easing = { out: identity, cubic: identity, linear: identity };
export const FadeIn = layoutAnim;
export const FadeOut = layoutAnim;
export { View };

export const createAnimatedComponent = identity;
// react-native-gesture-handler reads default.createAnimatedComponent.
const Animated = { View, call: () => undefined, createAnimatedComponent };
export default Animated;
