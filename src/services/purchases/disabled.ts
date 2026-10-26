import type { PurchasesAdapter } from './types';

/** Used when no store key is configured. Never grants anything. */
export function createDisabledPurchases(reason: string): PurchasesAdapter {
  return {
    status: () => ({ state: 'disabled', reason }),
    initialize: async () => undefined,
    getProducts: async () => [],
    purchase: async () => ({ kind: 'disabled' }),
    restore: async () => ({ kind: 'disabled' }),
  };
}
