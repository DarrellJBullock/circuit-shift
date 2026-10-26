import { create } from 'zustand';

import { ENTITLEMENTS, type Entitlement } from '@/services/monetization';

/**
 * Purchase entitlements. Deliberately separate from progress and NOT stored
 * in the app's SQLite database: the only writer is the purchases adapter,
 * which copies the store SDK's verified customer info (RevenueCat caches that
 * itself, including offline). No local flag can grant an entitlement.
 */
interface EntitlementStore {
  readonly active: ReadonlySet<Entitlement>;
  /** Called only by the purchases adapter with entitlements from the store SDK. */
  applyVerified(ids: Iterable<string>): void;
}

export const useEntitlements = create<EntitlementStore>((set) => ({
  active: new Set(),
  applyVerified: (ids) => {
    // Unknown identifiers are ignored rather than trusted.
    const next = new Set<Entitlement>();
    for (const id of ids) if (ENTITLEMENTS.includes(id as Entitlement)) next.add(id as Entitlement);
    set({ active: next });
  },
}));

export function hasEntitlement(e: Entitlement): boolean {
  return useEntitlements.getState().active.has(e);
}
