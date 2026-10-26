import { type ErrorBoundaryProps, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './Button';
import { colors, spacing, type } from './theme';

/**
 * Shared Expo Router error boundary. A rendering failure on any screen shows
 * this recovery card instead of crashing the app.
 */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card} accessibilityRole="alert">
        <Text style={type.heading}>Something short-circuited</Text>
        <Text style={type.body}>This screen hit an unexpected problem. Your progress is safe.</Text>
        {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
        <Button label="Try again" onPress={() => void retry()} />
        <Button label="Home" variant="secondary" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  card: { gap: spacing.md },
  detail: { color: colors.error, fontSize: 13, fontFamily: 'Menlo' },
});
