import { BlurMask, Circle, Group, Path, RoundedRect, vec } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Easing,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { type SignalColor, type Tile, normalizeRotation, portCount } from '@/engine';
import { colors, motion, signalColor } from '@/ui/theme';

import { diamondPath, hatchPath, wirePath } from './geometry';

export interface TileNodeProps {
  readonly tile: Tile;
  readonly x: number;
  readonly y: number;
  readonly cell: number;
  readonly color: SignalColor | null;
  readonly shorted: boolean;
  readonly depth: number;
  readonly satisfied: boolean;
  readonly clock: SharedValue<number>;
  readonly reduceMotion: boolean;
}

const QUARTER = Math.PI / 2;

function TileNodeImpl(props: TileNodeProps) {
  const { tile, x, y, cell, color, shorted, depth, satisfied, clock, reduceMotion } = props;
  const inset = Math.max(2, cell * 0.04);
  const wireW = Math.max(4, cell * 0.13);
  const center = cell / 2;
  const endpoint = tile.type === 'source' || tile.type === 'receiver';
  const bodyR = cell * 0.22;

  // Rotation: accumulate quarter turns so 3→0 animates forward, undo backward.
  const turns = useRef<number>(tile.rotation);
  const angle = useSharedValue(tile.rotation * QUARTER);
  useEffect(() => {
    let delta = (tile.rotation - normalizeRotation(turns.current) + 4) % 4;
    if (delta === 3) delta = -1;
    if (delta === 0) return;
    turns.current += delta;
    const target = turns.current * QUARTER;
    angle.value = reduceMotion
      ? target
      : withTiming(target, { duration: motion.rotateMs, easing: Easing.out(Easing.cubic) });
  }, [tile.rotation, reduceMotion, angle]);

  // Power: fade in staggered by BFS depth from the source.
  const energized = color != null || shorted;
  const glow = useSharedValue(energized ? 1 : 0);
  useEffect(() => {
    const to = energized ? 1 : 0;
    glow.value = reduceMotion
      ? to
      : withDelay(
          energized ? Math.max(0, depth) * motion.propagateStepMs : 0,
          withTiming(to, { duration: motion.fadeMs }),
        );
  }, [energized, depth, reduceMotion, glow]);

  // Keep the last live colour while power fades out, so a violet wire does
  // not flash cyan on disconnect. (Adjusting state during render is the
  // React-documented pattern for deriving from previous props.)
  const liveHue = shorted ? colors.error : color ? signalColor[color] : null;
  const [hue, setHue] = useState<string>(liveHue ?? colors.electricity);
  if (liveHue !== null && liveHue !== hue) setHue(liveHue);

  const rotate = useDerivedValue(() => [{ rotate: angle.value }]);
  const coreOpacity = useDerivedValue(() => glow.value);
  const glowOpacity = useDerivedValue(() => {
    const pulse = reduceMotion ? 1 : 0.78 + 0.22 * Math.sin(clock.value / 420 - depth * 0.7);
    return glow.value * pulse * 0.85;
  });

  const wire = useMemo(
    () => wirePath(tile.baseMask, cell, endpoint ? bodyR * 0.8 : 0),
    [tile.baseMask, cell, endpoint, bodyR],
  );
  const hatch = useMemo(() => hatchPath(cell, cell / 6, inset * 3), [cell, inset]);
  const origin = useMemo(() => vec(center, center), [center]);
  const translate = useMemo(() => [{ translateX: x * cell }, { translateY: y * cell }], [x, y, cell]);

  if (tile.type === 'empty') {
    return (
      <Group transform={translate}>
        <Circle cx={center} cy={center} r={Math.max(1.5, cell * 0.025)} color={colors.tileEdge} />
      </Group>
    );
  }

  if (tile.type === 'blocked') {
    return (
      <Group transform={translate}>
        <RoundedRect
          x={inset}
          y={inset}
          width={cell - inset * 2}
          height={cell - inset * 2}
          r={cell * 0.14}
          color={colors.blocked}
        />
        <Path path={hatch} style="stroke" strokeWidth={1.5} color={colors.blockedHatch} />
      </Group>
    );
  }

  const tileFill = tile.locked ? colors.tileLocked : colors.tile;
  const glyphColor = (c: SignalColor) => signalColor[c];
  const sigColor: SignalColor = tile.meta?.color ?? 'cyan';
  const isHub = !endpoint && portCount(tile.baseMask) >= 3;

  return (
    <Group transform={translate}>
      <RoundedRect
        x={inset}
        y={inset}
        width={cell - inset * 2}
        height={cell - inset * 2}
        r={cell * 0.16}
        color={tileFill}
      />
      <RoundedRect
        x={inset}
        y={inset}
        width={cell - inset * 2}
        height={cell - inset * 2}
        r={cell * 0.16}
        color={colors.tileEdge}
        style="stroke"
        strokeWidth={tile.locked ? 1 : 1.5}
      />

      {/* Wires (rotate as a unit). */}
      <Group transform={rotate} origin={origin}>
        <Path path={wire} style="stroke" strokeWidth={wireW} strokeCap="round" color={colors.wireIdle} />
        <Group opacity={glowOpacity}>
          <Path path={wire} style="stroke" strokeWidth={wireW * 2.4} strokeCap="round" color={hue}>
            <BlurMask blur={wireW * 1.1} style="normal" />
          </Path>
        </Group>
        <Group opacity={coreOpacity}>
          <Path path={wire} style="stroke" strokeWidth={wireW} strokeCap="round" color={hue} />
          <Path
            path={wire}
            style="stroke"
            strokeWidth={Math.max(1.5, wireW * 0.3)}
            strokeCap="round"
            color={colors.text}
            opacity={0.55}
          />
        </Group>
        {isHub ? <Circle cx={center} cy={center} r={wireW * 0.85} color={colors.wireIdle} /> : null}
        {isHub ? (
          <Group opacity={coreOpacity}>
            <Circle cx={center} cy={center} r={wireW * 0.85} color={hue} />
          </Group>
        ) : null}
      </Group>

      {tile.type === 'source' ? (
        <Group>
          <Circle cx={center} cy={center} r={bodyR * 1.25} color={colors.source} opacity={0.35}>
            <BlurMask blur={bodyR * 0.6} style="normal" />
          </Circle>
          <Circle cx={center} cy={center} r={bodyR} color={colors.source} />
          <SignalGlyph color={sigColor} cx={center} cy={center} r={bodyR * 0.45} fill={colors.background} />
        </Group>
      ) : null}

      {tile.type === 'receiver' ? (
        <Group>
          <Group opacity={satisfied ? glowOpacity : 0}>
            <Circle cx={center} cy={center} r={bodyR * 1.3} color={glyphColor(sigColor)}>
              <BlurMask blur={bodyR * 0.7} style="normal" />
            </Circle>
          </Group>
          <Circle cx={center} cy={center} r={bodyR} color={satisfied ? glyphColor(sigColor) : colors.background} />
          <Circle
            cx={center}
            cy={center}
            r={bodyR}
            style="stroke"
            strokeWidth={Math.max(2, cell * 0.04)}
            color={glyphColor(sigColor)}
            opacity={satisfied ? 1 : 0.7}
          />
          <SignalGlyph
            color={sigColor}
            cx={center}
            cy={center}
            r={bodyR * 0.42}
            fill={satisfied ? colors.background : glyphColor(sigColor)}
          />
        </Group>
      ) : null}

      {tile.locked && !endpoint ? (
        <Group opacity={0.6}>
          {[
            [inset * 3.2, inset * 3.2],
            [cell - inset * 3.2, inset * 3.2],
            [inset * 3.2, cell - inset * 3.2],
            [cell - inset * 3.2, cell - inset * 3.2],
          ].map(([cx, cy]) => (
            <Circle key={`${cx}-${cy}`} cx={cx!} cy={cy!} r={Math.max(1.5, cell * 0.022)} color={colors.textMuted} />
          ))}
        </Group>
      ) : null}
    </Group>
  );
}

/** Shape-coded signal marker: circle = cyan, diamond = violet. */
function SignalGlyph(props: { color: SignalColor; cx: number; cy: number; r: number; fill: string }) {
  const { color, cx, cy, r, fill } = props;
  const diamond = useMemo(() => diamondPath(cx, cy, r * 1.15), [cx, cy, r]);
  return color === 'violet' ? <Path path={diamond} color={fill} /> : <Circle cx={cx} cy={cy} r={r * 0.8} color={fill} />;
}

export const TileNode = memo(TileNodeImpl);
