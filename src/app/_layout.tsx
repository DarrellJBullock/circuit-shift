import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LEVEL_LOAD_ERRORS } from '@/levels/registry';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

if (__DEV__ && LEVEL_LOAD_ERRORS.length > 0) {
  console.warn('Invalid levels were skipped:', JSON.stringify(LEVEL_LOAD_ERRORS, null, 2));
}

export default function RootLayout() {
  useEffect(() => {
    // Nothing async to load yet; Phase 3 waits for the SQLite hydrate here.
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="play/[levelId]" options={{ gestureEnabled: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

export { RouteError as ErrorBoundary } from '@/ui/RouteError';
