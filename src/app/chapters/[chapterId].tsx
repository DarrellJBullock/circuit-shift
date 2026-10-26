import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getChapter, levelsInChapter } from '@/levels/registry';
import { useProgress } from '@/state/progressStore';
import { Screen } from '@/ui/Screen';
import { MIN_TOUCH, colors, fontScale, radius, spacing, type } from '@/ui/theme';

export default function LevelSelect() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const chapter = getChapter(chapterId ?? '');
  const results = useProgress((s) => s.results);

  if (!chapter) {
    return (
      <Screen title="Chapter not found" back>
        <Text style={type.body}>This chapter does not exist.</Text>
      </Screen>
    );
  }

  const levels = levelsInChapter(chapter.id);
  return (
    <Screen title={chapter.title} back scroll>
      <Text style={[type.caption, styles.sub]}>{chapter.subtitle}</Text>
      <View style={styles.grid}>
        {levels.map((level, i) => {
          const result = results[level.id];
          // A level unlocks when it is first or the previous one is complete.
          const prev = levels[i - 1];
          const unlocked = i === 0 || (prev ? results[prev.id]?.completed === true : false);
          const stars = result?.bestStars ?? 0;
          return (
            <Pressable
              key={level.id}
              testID={`level-${level.id}`}
              disabled={!unlocked}
              onPress={() => router.push({ pathname: '/play/[levelId]', params: { levelId: level.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Level ${level.order}, ${level.title}. ${
                unlocked ? (result?.completed ? `${stars} of 3 stars` : 'Not completed') : 'Locked'
              }`}
              accessibilityState={{ disabled: !unlocked }}
              style={({ pressed }) => [styles.cell, !unlocked && styles.locked, pressed && styles.pressed]}
            >
              <Text style={styles.num} maxFontSizeMultiplier={fontScale.dense}>
                {level.order}
              </Text>
              <Text style={styles.stars} maxFontSizeMultiplier={fontScale.dense}>
                <Text style={styles.starOn}>{'★'.repeat(stars)}</Text>
                <Text style={styles.starOff}>{'★'.repeat(3 - stars)}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    width: 72,
    height: 72,
    minWidth: MIN_TOUCH,
    borderRadius: radius.md,
    backgroundColor: colors.tile,
    borderColor: colors.tileEdge,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  locked: { opacity: 0.35 },
  pressed: { opacity: 0.8 },
  num: { color: colors.text, fontSize: 22, fontWeight: '800' },
  stars: { fontSize: 12, letterSpacing: 1 },
  starOn: { color: colors.source },
  starOff: { color: colors.tileEdge },
});
