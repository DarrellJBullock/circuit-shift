import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MIN_TOUCH, colors, spacing, type } from './theme';

export interface ScreenProps {
  readonly title?: string;
  readonly back?: boolean;
  readonly scroll?: boolean;
  readonly children: ReactNode;
}

export function Screen({ title, back = false, scroll = false, children }: ScreenProps) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      {title || back ? (
        <View style={styles.header}>
          {back ? (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.back}
              hitSlop={8}
            >
              <Text style={styles.backGlyph}>‹</Text>
            </Pressable>
          ) : null}
          {title ? (
            <Text style={type.heading} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
        </View>
      ) : null}
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH + 8,
    gap: spacing.sm,
  },
  back: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: colors.text, fontSize: 36, lineHeight: 38, marginTop: -4 },
  body: { flex: 1, paddingHorizontal: spacing.md },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
});
