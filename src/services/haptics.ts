import * as Haptics from 'expo-haptics';

import { useSettings } from '@/state/settingsStore';

/**
 * Haptic feedback adapter. Respects the user's toggle and never throws
 * (devices without a Taptic Engine, simulators, Android variance).
 */
export type HapticCue = 'rotate' | 'locked' | 'connect' | 'win';

export function haptic(cue: HapticCue): void {
  if (!useSettings.getState().hapticsEnabled) return;
  const run = (): Promise<void> => {
    switch (cue) {
      case 'rotate':
        return Haptics.selectionAsync();
      case 'locked':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'connect':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'win':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  run().catch(() => undefined);
}
