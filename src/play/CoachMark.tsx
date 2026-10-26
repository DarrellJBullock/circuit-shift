import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH, colors, radius, spacing, type } from '@/ui/theme';

import type { TutorialStep } from './tutorial';

/** Tutorial card shown between the board and the toolbar (never over the board). */
export function CoachMark({ step, onSkip }: { step: TutorialStep; onSkip: () => void }) {
  return (
    <View style={styles.card} testID="coach-mark" accessibilityRole="summary">
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          {step.title}
        </Text>
        <Text style={type.body}>{step.body}</Text>
      </View>
      <Pressable
        testID="skip-tutorial"
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip tutorial"
        accessibilityHint="Hides tips and unlocks the first levels"
        style={styles.skip}
        hitSlop={8}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundRaised,
    borderColor: colors.source,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  text: { flex: 1, gap: spacing.xs },
  title: { color: colors.source, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  skip: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
});
