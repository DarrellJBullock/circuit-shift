import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CHAPTERS, levelsInChapter } from '@/levels/registry';
import { useProgress } from '@/state/progressStore';
import { Screen } from '@/ui/Screen';
import { MIN_TOUCH, colors, radius, spacing, type } from '@/ui/theme';

export default function Chapters() {
  const results = useProgress((s) => s.results);
  return (
    <Screen title="Chapters" back scroll>
      <View style={styles.list}>
        {CHAPTERS.map((ch) => {
          const levels = levelsInChapter(ch.id);
          const done = levels.filter((l) => results[l.id]?.completed).length;
          const stars = levels.reduce((s, l) => s + (results[l.id]?.bestStars ?? 0), 0);
          const available = levels.length > 0;
          return (
            <Pressable
              key={ch.id}
              disabled={!available}
              onPress={() => router.push({ pathname: '/chapters/[chapterId]', params: { chapterId: ch.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Chapter ${ch.order}, ${ch.title}. ${
                available ? `${done} of ${levels.length} complete, ${stars} stars.` : 'In development.'
              }`}
              accessibilityState={{ disabled: !available }}
              style={({ pressed }) => [styles.card, !available && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.order}>CHAPTER {ch.order}</Text>
              <Text style={type.heading}>{ch.title}</Text>
              <Text style={type.caption}>{ch.subtitle}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${levels.length ? (done / levels.length) * 100 : 0}%` }]}
                />
              </View>
              <Text style={type.caption}>
                {available ? `${done}/${levels.length} complete · ★ ${stars}/${levels.length * 3}` : 'In development'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.tile,
    borderColor: colors.tileEdge,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: MIN_TOUCH * 2,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  order: { color: colors.electricity, fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: colors.background, borderRadius: 3, marginTop: spacing.sm },
  progressFill: { height: 6, backgroundColor: colors.electricity, borderRadius: 3 },
});
