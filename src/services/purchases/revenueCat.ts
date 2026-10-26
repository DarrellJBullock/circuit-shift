import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { useEntitlements } from '@/state/entitlementStore';

import { PACKAGE_FOR_PRODUCT, type ProductKey } from '../monetization';
import type { PurchasesAdapter, PurchasesStatus, StoreProduct } from './types';

const KEYS = Object.keys(PACKAGE_FOR_PRODUCT) as ProductKey[];

/** Entitlements come only from RevenueCat's verified customer info. */
function applyCustomerInfo(info: CustomerInfo): number {
  const active = Object.keys(info.entitlements.active);
  useEntitlements.getState().applyVerified(active);
  return useEntitlements.getState().active.size;
}

export function createRevenueCatPurchases(apiKey: string): PurchasesAdapter {
  let status: PurchasesStatus = { state: 'disabled', reason: 'not initialized' };
  let packages = new Map<ProductKey, PurchasesPackage>();

  const loadPackages = async () => {
    const offerings = await Purchases.getOfferings();
    const available = offerings.current?.availablePackages ?? [];
    packages = new Map();
    for (const key of KEYS) {
      const pkg = available.find((p) => p.identifier === PACKAGE_FOR_PRODUCT[key]);
      if (pkg) packages.set(key, pkg);
    }
  };

  return {
    status: () => status,

    initialize: async () => {
      try {
        Purchases.configure({ apiKey });
        Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
        applyCustomerInfo(await Purchases.getCustomerInfo());
        status = { state: 'ready' };
      } catch (e) {
        status = { state: 'error', message: String(e) };
      }
    },

    getProducts: async () => {
      if (status.state !== 'ready') return [];
      try {
        await loadPackages();
      } catch {
        return [];
      }
      const out: StoreProduct[] = [];
      for (const [key, pkg] of packages) out.push({ key, title: pkg.product.title, price: pkg.product.priceString });
      return out;
    },

    purchase: async (key) => {
      if (status.state !== 'ready') return { kind: 'disabled' };
      const pkg = packages.get(key);
      if (!pkg) return { kind: 'failed', message: 'Product is not available right now.' };
      try {
        const result = await Purchases.purchasePackage(pkg);
        applyCustomerInfo(result.customerInfo);
        return { kind: 'purchased' };
      } catch (e) {
        if ((e as { userCancelled?: boolean | null }).userCancelled) return { kind: 'cancelled' };
        return { kind: 'failed', message: (e as { message?: string }).message ?? 'Purchase failed.' };
      }
    },

    restore: async () => {
      if (status.state !== 'ready') return { kind: 'disabled' };
      try {
        const entitlements = applyCustomerInfo(await Purchases.restorePurchases());
        return { kind: 'restored', entitlements };
      } catch (e) {
        return { kind: 'failed', message: (e as { message?: string }).message ?? 'Restore failed.' };
      }
    },
  };
}
