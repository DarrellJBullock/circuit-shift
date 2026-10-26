import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ads } from '@/services/ads';
import { analyticsProviderName } from '@/services/analytics/analytics';
import { purchases } from '@/services/purchases';
import { type MotionPreference, useSettings } from '@/state/settingsStore';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { MIN_TOUCH, colors, radius, spacing, type } from '@/ui/theme';

const MOTION_OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'full', label: 'Full' },
];

export default function Settings() {
  const { hapticsEnabled, soundEnabled, motion, analyticsEnabled, update } = useSettings();
  const provider = analyticsProviderName();
  const storeReady = purchases.status().state === 'ready';
  const adsConfigured = ads.status().state !== 'disabled';
  const version = Constants.expoConfig?.version ?? 'unknown';

  return (
    <Screen title="Settings" back scroll>
      <Section title="Feedback">
        <Row label="Sound effects">
          <Switch
            value={soundEnabled}
            onValueChange={(v) => update({ soundEnabled: v })}
            accessibilityLabel="Sound effects"
            trackColor={{ true: colors.electricity, false: colors.tileEdge }}
          />
        </Row>
        <Row label="Haptics">
          <Switch
            value={hapticsEnabled}
            onValueChange={(v) => update({ hapticsEnabled: v })}
            accessibilityLabel="Haptics"
            trackColor={{ true: colors.electricity, false: colors.tileEdge }}
          />
        </Row>
        <Text style={type.caption}>Sound follows the silent switch and mixes with your own music.</Text>
      </Section>

      <Section title="Motion">
        <View style={styles.segment} accessibilityRole="radiogroup">
          {MOTION_OPTIONS.map((o) => {
            const selected = motion === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => update({ motion: o.value })}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${o.label} motion`}
                style={[styles.segmentItem, selected && styles.segmentOn]}
              >
                <Text style={[type.label, selected && { color: colors.background }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={type.caption}>
          Reduced motion turns off rotation tweens, power-flow staggering and pulsing glow. Gameplay is unchanged.
        </Text>
      </Section>

      <Section title="Privacy">
        <Text style={type.body}>
          Circuit Shift works fully offline and needs no account. Your progress, settings and daily results are stored
          only on this device.
        </Text>
        <Row label="Share anonymous usage data">
          <Switch
            value={analyticsEnabled}
            onValueChange={(v) => update({ analyticsEnabled: v })}
            accessibilityLabel="Share anonymous usage data"
            trackColor={{ true: colors.electricity, false: colors.tileEdge }}
          />
        </Row>
        <Text style={type.caption}>
          Off by default. When on, gameplay events (levels started and finished, hints used) are recorded without personal
          data. {provider === 'none' ? 'No analytics provider is configured in this build, so nothing is sent.' : `Provider: ${provider}.`}
        </Text>
        <Text style={type.body}>
          {adsConfigured
            ? 'Ads appear only if you choose to watch one for a hint. They are never shown automatically, and they are not personalized. Where required, you are asked for consent before the first ad.'
            : 'This build shows no ads.'}
        </Text>
        {ads.privacyOptionsRequired() ? (
          <Button label="Ad privacy choices" variant="secondary" compact onPress={() => void ads.showPrivacyOptions()} />
        ) : null}
        <Text style={type.body}>
          {storeReady
            ? 'Purchases are processed by Apple. Our purchase service (RevenueCat) receives an anonymous app user ID and your purchase receipts in order to verify them.'
            : 'Purchases are not configured in this build.'}
        </Text>
        <Button label="Restore purchases" variant="secondary" compact onPress={() => router.push('/shop')} />
        <View style={styles.config}>
          <Text style={styles.configTitle}>REQUIRED CONFIGURATION · NOT YET SET</Text>
          <Text style={type.caption}>Privacy policy URL — must be published before App Store submission.</Text>
          <Text style={type.caption}>Support URL — must be published before App Store submission.</Text>
        </View>
      </Section>

      <Section title="About">
        <Text style={type.caption}>Circuit Shift {version} · © Evercrest Interactive</Text>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={type.body}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { color: colors.electricity, fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  row: {
    minHeight: MIN_TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tile,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  segment: { flexDirection: 'row', backgroundColor: colors.tile, borderRadius: radius.md, padding: 4, gap: 4 },
  segmentItem: {
    flex: 1,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentOn: { backgroundColor: colors.electricity },
  config: {
    borderColor: colors.source,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  configTitle: { color: colors.source, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
});
