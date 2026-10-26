import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LEVELS, getLevel } from '@/levels/registry';
import { useProgress } from '@/state/progressStore';
import { useSession } from '@/state/sessionStore';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, spacing, type } from '@/ui/theme';

export default function Home() {
  const results = useProgress((s) => s.results);
  const saved = useSession((s) => s.saved);
  // Continue resumes an interrupted level first, otherwise the next unsolved one.
  const resumable = saved ? getLevel(saved.levelId) : undefined;
  const next = resumable ?? LEVELS.find((l) => !results[l.id]?.completed) ?? LEVELS[0];
  const started = resumable !== undefined || Object.keys(results).length > 0;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>EVERCREST INTERACTIVE</Text>
        <Text style={type.title} accessibilityRole="header">
          CIRCUIT{'\n'}SHIFT
        </Text>
        <Text style={styles.tagline}>Rotate the tiles. Route the power.</Text>
      </View>
      <View style={styles.actions}>
        {next ? (
          <Button
            testID="home-play"
            label={started ? `Continue · ${next.title}` : 'Play'}
            onPress={() => router.push({ pathname: '/play/[levelId]', params: { levelId: next.id } })}
          />
        ) : null}
        <Button label="Chapters" variant="secondary" onPress={() => router.push('/chapters')} />
        <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'center', gap: spacing.md },
  kicker: { color: colors.source, fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  tagline: { ...type.body, color: colors.textMuted },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
});
