import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, dailyLevel, dailyLevelId, utcDateKey } from '@/levels/daily';
import { useProgress } from '@/state/progressStore';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { MIN_TOUCH, colors, radius, spacing, type } from '@/ui/theme';

const HISTORY_DAYS = 6;

function untilMidnightUtc(now: Date): string {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const mins = Math.max(0, Math.floor((next - now.getTime()) / 60_000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

export default function Daily() {
  const results = useProgress((s) => s.results);
  const now = new Date();
  const today = utcDateKey(now);
  const level = dailyLevel(today);
  const result = results[dailyLevelId(today)];
  const play = (date: string) =>
    router.push({ pathname: '/play/[levelId]', params: { levelId: dailyLevelId(date) } });

  return (
    <Screen title="Daily Challenge" back scroll>
      <View style={styles.card}>
        <Text style={styles.kicker}>TODAY</Text>
        {level ? (
          <>
            <Text style={type.heading}>{level.title.replace('Daily · ', '')}</Text>
            <Text style={type.caption}>
              {level.width}×{level.height} board · difficulty {level.difficulty}/10
            </Text>
            <Text style={styles.status} accessibilityLabel={result?.completed ? `${result.bestStars} of 3 stars` : 'Not played yet'}>
              {result?.completed ? `${starText(result.bestStars)}  ·  best ${result.bestMoves} moves` : 'Not played yet'}
            </Text>
            <Button testID="daily-play" label={result?.completed ? 'Play again' : 'Play'} onPress={() => play(today)} />
          </>
        ) : (
          <Text style={type.body}>Today’s challenge could not be generated. Please try again later.</Text>
        )}
        <Text style={type.caption}>New puzzle in {untilMidnightUtc(now)} (00:00 UTC). Same puzzle for everyone.</Text>
      </View>

      <Text style={styles.section} accessibilityRole="header">
        PREVIOUS DAYS
      </Text>
      <View style={styles.list}>
        {Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(today, -(i + 1))).map((date) => {
          const past = dailyLevel(date);
          if (!past) return null;
          const r = results[dailyLevelId(date)];
          return (
            <Pressable
              key={date}
              onPress={() => play(date)}
              accessibilityRole="button"
              accessibilityLabel={`${past.title}. ${r?.completed ? `${r.bestStars} of 3 stars` : 'Not played'}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={type.body}>{past.title.replace('Daily · ', '')}</Text>
              <Text style={[styles.rowStars, !r?.completed && styles.muted]}>
                {r?.completed ? starText(r.bestStars) : 'Play'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.tile,
    borderColor: colors.tileEdge,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  kicker: { color: colors.source, fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  status: { color: colors.text, fontSize: 16, fontWeight: '600', marginVertical: spacing.xs },
  section: { color: colors.electricity, fontSize: 12, letterSpacing: 2, fontWeight: '700', marginTop: spacing.lg },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  row: {
    minHeight: MIN_TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tile,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  rowStars: { color: colors.source, fontSize: 16, letterSpacing: 2 },
  muted: { color: colors.electricity, letterSpacing: 0, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
