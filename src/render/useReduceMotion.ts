import { useReducedMotion } from 'react-native-reanimated';

import { useSettings } from '@/state/settingsStore';

/** Combines the OS "Reduce Motion" setting with the in-game override. */
export function useReduceMotion(): boolean {
  const system = useReducedMotion();
  const pref = useSettings((s) => s.motion);
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return system;
}
