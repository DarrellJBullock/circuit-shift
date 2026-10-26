import { useProgress } from '@/state/progressStore';
import { useSettings } from '@/state/settingsStore';

import type { ProgressionInput } from './progression';

/** Current progression inputs from the stores (re-renders when they change). */
export function useProgression(): ProgressionInput {
  const results = useProgress((s) => s.results);
  const tutorial = useSettings((s) => s.tutorial);
  return { results, tutorial };
}
