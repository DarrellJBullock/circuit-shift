import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useReduceMotion } from '@/render/useReduceMotion';
import { colors, radius, spacing } from '@/ui/theme';

/**
 * Modal card over the board. Traps accessibility focus while open.
 *
 * Fades in but dismisses instantly: an `exiting` animation keeps the
 * full-screen scrim mounted after Resume and swallowed the player's next taps
 * (reproduced on the iOS simulator).
 */
export function Overlay({ children, testID }: { children: ReactNode; testID?: string }) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      testID={testID}
      entering={reduceMotion ? undefined : FadeIn.duration(200)}
      style={styles.scrim}
      accessibilityViewIsModal
    >
      <View style={styles.card}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 9, 18, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.backgroundRaised,
    borderColor: colors.tileEdge,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
