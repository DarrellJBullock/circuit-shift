import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { CHAPTERS } from '@/levels/registry';
import { track } from '@/services/analytics/analytics';
import type { Entitlement, ProductKey } from '@/services/monetization';
import { type StoreProduct, purchases } from '@/services/purchases';
import { useEntitlements } from '@/state/entitlementStore';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { colors, radius, spacing, type } from '@/ui/theme';

/** What each product grants; mirrors the RevenueCat dashboard configuration. */
const COPY: Readonly<Record<ProductKey, { title: string; body: string; grants: readonly Entitlement[] }>> = {
  remove_ads: {
    title: 'Remove Ads',
    body: 'Hints never require a video. Circuit Shift never shows forced ads either way.',
    grants: ['no_ads'],
  },
  premium_chapter: {
    title: 'Premium Chapters',
    body: 'Unlocks premium chapters as they are released.',
    grants: ['premium_content'],
  },
  founder_bundle: {
    title: 'Founder Bundle',
    body: 'Remove Ads and Premium Chapters together, and support an independent studio.',
    grants: ['no_ads', 'premium_content'],
  },
};

/**
 * Products that promise premium chapters are only offered once a premium
 * chapter actually ships. Selling content that does not exist yet would
 * mislead buyers and fail App Review (Guidelines 2.3 / 3.1.1).
 */
export const PREMIUM_CONTENT_AVAILABLE = CHAPTERS.some((c) => c.premium);

export function isOffered(key: ProductKey): boolean {
  return PREMIUM_CONTENT_AVAILABLE || !COPY[key].grants.includes('premium_content');
}

export default function Shop() {
  const status = purchases.status();
  const active = useEntitlements((s) => s.active);
  const [products, setProducts] = useState<readonly StoreProduct[] | null>(null);
  const [busy, setBusy] = useState<ProductKey | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void purchases.getProducts().then((p) => alive && setProducts(p));
    return () => {
      alive = false;
    };
  }, []);

  const say = (text: string) => {
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
  };

  const buy = async (key: ProductKey) => {
    setBusy(key);
    track('purchase_started', { product: key });
    const outcome = await purchases.purchase(key);
    setBusy(null);
    switch (outcome.kind) {
      case 'purchased':
        track('purchase_completed', { product: key });
        return say('Thank you! Your purchase is active.');
      case 'cancelled':
        return say('Purchase cancelled.');
      case 'failed':
        return say(outcome.message);
      case 'disabled':
        return say('The store is not available in this build.');
    }
  };

  const restore = async () => {
    setBusy('restore');
    const outcome = await purchases.restore();
    setBusy(null);
    if (outcome.kind === 'restored') say(outcome.entitlements > 0 ? 'Purchases restored.' : 'No previous purchases found.');
    else if (outcome.kind === 'failed') say(outcome.message);
    else say('The store is not available in this build.');
  };

  return (
    <Screen title="Shop" back scroll>
      {status.state !== 'ready' ? (
        <View style={styles.notice} testID="shop-unavailable">
          <Text style={styles.noticeTitle}>STORE UNAVAILABLE</Text>
          <Text style={type.body}>
            {status.state === 'disabled'
              ? 'Purchases are not configured in this build. Nothing can be bought, and nothing is unlocked without a confirmed store purchase.'
              : 'The store could not be reached. Check your connection and try again.'}
          </Text>
        </View>
      ) : null}

      {status.state === 'ready' && products === null ? <Text style={type.caption}>Loading products…</Text> : null}
      {status.state === 'ready' && products?.length === 0 ? (
        <Text style={type.body}>No products are available right now.</Text>
      ) : null}

      <View style={styles.list}>
        {(products ?? []).filter((p) => isOffered(p.key)).map((p) => {
          const copy = COPY[p.key];
          const owned = copy.grants.every((g) => active.has(g));
          return (
            <View key={p.key} style={styles.card}>
              <Text style={type.heading}>{copy.title}</Text>
              <Text style={type.body}>{copy.body}</Text>
              <Button
                label={owned ? 'Owned' : busy === p.key ? 'Purchasing…' : `Buy · ${p.price}`}
                disabled={owned || busy !== null}
                onPress={() => void buy(p.key)}
              />
            </View>
          );
        })}
      </View>

      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}

      <Button
        testID="restore"
        label={busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
        variant="secondary"
        disabled={busy !== null}
        onPress={() => void restore()}
        style={styles.restore}
      />
      <Text style={type.caption}>
        Purchases are one-time and tied to your App Store account. Your puzzle progress is stored separately on this
        device.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderColor: colors.source,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  noticeTitle: { color: colors.source, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  list: { gap: spacing.md, marginTop: spacing.md },
  card: {
    backgroundColor: colors.tile,
    borderColor: colors.tileEdge,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  message: { ...type.body, textAlign: 'center', marginTop: spacing.md },
  restore: { marginTop: spacing.lg, marginBottom: spacing.sm },
});
