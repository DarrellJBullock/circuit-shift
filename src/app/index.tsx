import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { isLevelUnlocked, nextPlayableLevel } from '@/levels/progression';
import { LEVELS, getLevel } from '@/levels/registry';
import { useProgression } from '@/levels/useProgression';
import { useSession } from '@/state/sessionStore';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, fontScale, spacing, type } from '@/ui/theme';

export default function Home() {
  const progression = useProgression();
  const saved = useSession((s) => s.saved);
  // Continue resumes an interrupted level first, otherwise the next playable one.
  const savedLevel = saved ? getLevel(saved.levelId) : undefined;
  const resumable = savedLevel && isLevelUnlocked(progression, savedLevel) ? savedLevel : undefined;
  const next = resumable ?? nextPlayableLevel(progression) ?? LEVELS[0];
  const started = resumable !== undefined || Object.keys(progression.results).length > 0;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>EVERCREST INTERACTIVE</Text>
        <Text style={type.title} accessibilityRole="header" maxFontSizeMultiplier={fontScale.display}>
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
        <Button testID="home-daily" label="Daily Challenge" variant="secondary" onPress={() => router.push('/daily')} />
        <Button label="Chapters" variant="secondary" onPress={() => router.push('/chapters')} />
        <View style={styles.row}>
          <Button label="Shop" variant="secondary" onPress={() => router.push('/shop')} style={styles.flex} />
          <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} style={styles.flex} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'center', gap: spacing.md },
  kicker: { color: colors.source, fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  tagline: { ...type.body, color: colors.textMuted },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
