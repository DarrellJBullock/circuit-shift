import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LEVEL_LOAD_ERRORS } from '@/levels/registry';
import { initAnalyticsBridge } from '@/services/analytics/bridge';
import { initAudio } from '@/services/audio';
import { purchases } from '@/services/purchases';
import { openExpoDatabase } from '@/storage/expoDatabase';
import { type Persistence, initPersistence } from '@/storage/persistence';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

if (__DEV__ && LEVEL_LOAD_ERRORS.length > 0) {
  console.warn('Invalid levels were skipped:', JSON.stringify(LEVEL_LOAD_ERRORS, null, 2));
}

/** Never hold the splash longer than this; the game runs from memory instead. */
const STORAGE_TIMEOUT_MS = 3000;

async function startPersistence(): Promise<Persistence | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), STORAGE_TIMEOUT_MS));
  try {
    return await Promise.race([openExpoDatabase().then((db) => initPersistence(db)), timeout]);
  } catch (e) {
    console.warn('[storage] running without persistence:', e);
    return null;
  }
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let persistence: Persistence | null = null;
    let cancelled = false;
    void initAudio();
    // Store entitlements (no-op when purchases are not configured). Ads are
    // NOT initialized here: consent is requested only when a player first
    // chooses to watch a rewarded ad.
    void purchases.initialize();
    const stopAnalytics = initAnalyticsBridge();
    void startPersistence().then((p) => {
      persistence = p;
      if (cancelled) p?.dispose();
      setReady(true);
      SplashScreen.hideAsync().catch(() => undefined);
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void persistence?.flush();
    });
    return () => {
      cancelled = true;
      stopAnalytics();
      sub.remove();
      persistence?.dispose();
    };
  }, []);

  if (!ready) return null;

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
