import { StyleSheet, Text, View } from 'react-native';

import type { Stars } from '@/engine';
import { Button } from '@/ui/Button';
import { colors, spacing, type } from '@/ui/theme';

import { Overlay } from './Overlay';
import { formatTime } from './format';

export interface CompletionOverlayProps {
  readonly stars: Stars;
  readonly moves: number;
  readonly timeMs: number;
  readonly newBest: boolean;
  readonly optimalMoves: number | null;
  readonly parMoves: number;
  readonly hasNext: boolean;
  readonly onNext: () => void;
  readonly onReplay: () => void;
  readonly onLevels: () => void;
}

export function CompletionOverlay(p: CompletionOverlayProps) {
  return (
    <Overlay testID="completion">
      <Text style={styles.kicker} accessibilityRole="header">
        CIRCUIT COMPLETE
      </Text>
      <Text style={styles.stars} accessibilityLabel={`${p.stars} of 3 stars`}>
        <Text style={{ color: colors.source }}>{'★'.repeat(p.stars)}</Text>
        <Text style={{ color: colors.tileEdge }}>{'★'.repeat(3 - p.stars)}</Text>
      </Text>
      {p.newBest ? <Text style={styles.best}>New best</Text> : null}
      <View style={styles.stats}>
        <Stat label="Moves" value={String(p.moves)} />
        <Stat label={p.optimalMoves !== null ? 'Optimal' : 'Target'} value={String(p.optimalMoves ?? p.parMoves)} />
        <Stat label="Time" value={formatTime(p.timeMs)} />
      </View>
      {p.hasNext ? <Button testID="next-level" label="Next level" onPress={p.onNext} /> : null}
      <View style={styles.row}>
        <Button label="Replay" variant="secondary" onPress={p.onReplay} style={styles.flex} />
        <Button label="Levels" variant="secondary" onPress={p.onLevels} style={styles.flex} />
      </View>
    </Overlay>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.electricity, fontSize: 14, letterSpacing: 3, fontWeight: '800', textAlign: 'center' },
  stars: { fontSize: 44, textAlign: 'center', letterSpacing: 6 },
  best: { color: colors.source, textAlign: 'center', fontWeight: '700' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm },
  stat: { alignItems: 'center', minWidth: 72 },
  statValue: { color: colors.text, fontSize: 24, fontWeight: '800' },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
