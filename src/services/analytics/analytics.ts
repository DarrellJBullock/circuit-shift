import { useSettings } from '@/state/settingsStore';

import type { AnalyticsEventName, AnalyticsEvents } from './events';

/** A destination for events (a vendor SDK, a debug logger, a test recorder). */
export interface AnalyticsSink {
  readonly name: string;
  track<K extends AnalyticsEventName>(event: K, props: AnalyticsEvents[K]): void;
}

/** Default: no provider is configured, so nothing is ever sent anywhere. */
export const noopSink: AnalyticsSink = { name: 'none', track: () => undefined };

/** Prints events to the dev console; never used in release builds. */
export const consoleSink: AnalyticsSink = {
  name: 'console',
  track: (event, props) => console.log('[analytics]', event, props),
};

let sink: AnalyticsSink = __DEV__ && process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === '1' ? consoleSink : noopSink;

/** Install a provider sink (Phase 7/8, once a vendor is chosen and disclosed). */
export function setAnalyticsSink(next: AnalyticsSink): void {
  sink = next;
}

export function analyticsProviderName(): string {
  return sink.name;
}

/**
 * Typed entry point for every event. Opt-in: nothing is forwarded unless the
 * player enabled "Share anonymous usage data" in Settings.
 */
export function track<K extends AnalyticsEventName>(event: K, props: AnalyticsEvents[K]): void {
  if (!useSettings.getState().analyticsEnabled) return;
  try {
    sink.track(event, props);
  } catch {
    // Analytics must never affect gameplay.
  }
}
