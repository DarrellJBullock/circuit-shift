import { BlurMask, Group, Path, usePathValue } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { type SignalColor, createRng } from '@/engine';
import { colors, motion, signalColor } from '@/ui/theme';

export interface BurstOrigin {
  readonly x: number;
  readonly y: number;
  /** null = source (amber sparks). */
  readonly color: SignalColor | null;
}

interface Particle {
  readonly ox: number;
  readonly oy: number;
  readonly dx: number;
  readonly dy: number;
  readonly dist: number;
  readonly r: number;
}

const PER_ORIGIN = 12;

function makeParticles(origins: readonly BurstOrigin[], cell: number, seed: number): Record<'amber' | SignalColor, Particle[]> {
  const rng = createRng(seed);
  const out: Record<'amber' | SignalColor, Particle[]> = { amber: [], cyan: [], violet: [] };
  for (const o of origins) {
    const bucket = out[o.color ?? 'amber'];
    for (let i = 0; i < PER_ORIGIN; i++) {
      const a = ((i + rng.next() * 0.6) / PER_ORIGIN) * Math.PI * 2;
      bucket.push({
        ox: o.x,
        oy: o.y,
        dx: Math.cos(a),
        dy: Math.sin(a),
        dist: cell * (0.55 + rng.next() * 0.75),
        r: Math.max(1.2, cell * (0.025 + rng.next() * 0.03)),
      });
    }
  }
  return out;
}

/**
 * Restrained spark burst from the source and every receiver when a level is
 * completed. Three animated paths (one per colour) are rebuilt from a single
 * progress value, so cost stays flat regardless of receiver count. Not
 * rendered at all under reduced motion.
 */
export function CompletionBurst({
  origins,
  cell,
  active,
  seed,
}: {
  origins: readonly BurstOrigin[];
  cell: number;
  active: boolean;
  seed: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: motion.burstMs, easing: Easing.out(Easing.quad) });
  }, [active, progress]);

  const { amber, cyan, violet } = useMemo(() => makeParticles(origins, cell, seed), [origins, cell, seed]);

  const build = (list: Particle[]) => (b: Parameters<Parameters<typeof usePathValue>[0]>[0]) => {
    'worklet';
    const p = progress.value;
    if (p <= 0 || p >= 1) return;
    for (const q of list) {
      const d = q.dist * p;
      b.addCircle(q.ox + q.dx * d, q.oy + q.dy * d, q.r * (1 - p * 0.6));
    }
  };
  const amberPath = usePathValue(build(amber));
  const cyanPath = usePathValue(build(cyan));
  const violetPath = usePathValue(build(violet));
  const opacity = useDerivedValue(() => (progress.value <= 0 ? 0 : (1 - progress.value) ** 1.3));

  return (
    <Group opacity={opacity}>
      <Path path={amberPath} color={colors.source}>
        <BlurMask blur={1.5} style="solid" />
      </Path>
      <Path path={cyanPath} color={signalColor.cyan}>
        <BlurMask blur={1.5} style="solid" />
      </Path>
      <Path path={violetPath} color={signalColor.violet}>
        <BlurMask blur={1.5} style="solid" />
      </Path>
    </Group>
  );
}
