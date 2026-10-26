import type { ProductKey } from '../monetization';

export interface StoreProduct {
  readonly key: ProductKey;
  readonly title: string;
  readonly price: string;
}

export type PurchasesStatus =
  | { readonly state: 'disabled'; readonly reason: string }
  | { readonly state: 'ready' }
  | { readonly state: 'error'; readonly message: string };

export type PurchaseOutcome =
  /** The store confirmed the transaction; entitlements were refreshed from it. */
  | { readonly kind: 'purchased' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'disabled' };

export type RestoreOutcome =
  | { readonly kind: 'restored'; readonly entitlements: number }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'disabled' };

/**
 * Store adapter. Implementations must only report `purchased` after the store
 * confirms a transaction, and must only feed entitlements from verified
 * customer info into `useEntitlements.applyVerified`.
 */
export interface PurchasesAdapter {
  status(): PurchasesStatus;
  initialize(): Promise<void>;
  getProducts(): Promise<readonly StoreProduct[]>;
  purchase(key: ProductKey): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
}
