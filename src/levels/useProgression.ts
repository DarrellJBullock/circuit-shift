import { useEntitlements } from '@/state/entitlementStore';
import { useProgress } from '@/state/progressStore';
import { useSettings } from '@/state/settingsStore';

import type { ProgressionInput } from './progression';

/** Current progression inputs from the stores (re-renders when they change). */
export function useProgression(): ProgressionInput {
  const results = useProgress((s) => s.results);
  const tutorial = useSettings((s) => s.tutorial);
  const premium = useEntitlements((s) => s.active.has('premium_content'));
  return { results, tutorial, premium };
}
