import Constants from 'expo-constants';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { type MotionPreference, useSettings } from '@/state/settingsStore';
import { Screen } from '@/ui/Screen';
import { MIN_TOUCH, colors, radius, spacing, type } from '@/ui/theme';

const MOTION_OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'full', label: 'Full' },
];

export default function Settings() {
  const { hapticsEnabled, soundEnabled, motion, update } = useSettings();
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
          Circuit Shift works fully offline and needs no account. Progress is stored only on this device.
        </Text>
        <Text style={type.body}>This build collects no analytics and shows no ads.</Text>
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
