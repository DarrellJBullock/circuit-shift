import { type ComponentRef, memo, useCallback, useRef } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';

import { type Evaluation, type Tile, isRotatable } from '@/engine';

import { describeTile } from './a11y';
import { type TouchPoint, tappedCell } from './hitTest';

export interface TileHitGridProps {
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly cell: number;
  readonly evaluation: Evaluation;
  readonly disabled: boolean;
  readonly onPress: (index: number) => void;
}

const ACTIVATE = [{ name: 'activate' as const }];

/**
 * Input + accessibility layer over the Skia canvas.
 *
 * Touch: raw multi-touch events on the container, tracked per finger. RN's
 * Pressable allows one responder at a time, which dropped overlapping taps
 * (two thumbs, or fast tapping while JS is busy). Raw touch events bypass
 * responder negotiation so every finger's tap counts.
 *
 * Accessibility: each cell is a plain View exposed as a button with an
 * `activate` action, so VoiceOver can navigate and rotate tiles without the
 * cells claiming touches.
 */
function TileHitGridImpl({ tiles, width, cell, evaluation, disabled, onPress }: TileHitGridProps) {
  const containerRef = useRef<ComponentRef<typeof View>>(null);
  const origin = useRef({ x: 0, y: 0 });
  const touches = useRef(new Map<string, TouchPoint>());
  const rows = Math.ceil(tiles.length / width);

  const measure = useCallback(() => {
    containerRef.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
    });
  }, []);

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      measure();
      const t = e.nativeEvent.timestamp;
      for (const touch of e.nativeEvent.changedTouches) {
        touches.current.set(String(touch.identifier), {
          x: touch.pageX - origin.current.x,
          y: touch.pageY - origin.current.y,
          t,
        });
      }
    },
    [measure],
  );

  const onTouchEnd = useCallback(
    (e: GestureResponderEvent) => {
      const t = e.nativeEvent.timestamp;
      for (const touch of e.nativeEvent.changedTouches) {
        const key = String(touch.identifier);
        const start = touches.current.get(key);
        touches.current.delete(key);
        if (!start || disabled) continue;
        const end = { x: touch.pageX - origin.current.x, y: touch.pageY - origin.current.y, t };
        const index = tappedCell(start, end, cell, width, rows);
        if (index >= 0) onPress(index);
      }
    },
    [cell, width, rows, disabled, onPress],
  );

  const onTouchCancel = useCallback((e: GestureResponderEvent) => {
    for (const touch of e.nativeEvent.changedTouches) touches.current.delete(String(touch.identifier));
  }, []);

  const satisfied = new Set(evaluation.objectives.filter((o) => o.satisfied).map((o) => o.index));
  const { power } = evaluation;

  return (
    <View
      ref={containerRef}
      testID="tile-grid"
      style={StyleSheet.absoluteFill}
      onLayout={measure}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {tiles.map((tile, i) => {
        const x = i % width;
        const y = Math.floor(i / width);
        const rotatable = isRotatable(tile);
        const label = describeTile(tile, {
          x,
          y,
          color: power.colorOf[i] ?? null,
          shorted: power.shortedOf[i] ?? false,
          satisfied: satisfied.has(i),
        });
        return (
          <View
            key={tile.id}
            testID={`tile-${x}-${y}`}
            accessible
            accessibilityRole={rotatable ? 'button' : 'image'}
            accessibilityLabel={label}
            accessibilityHint={rotatable ? 'Double tap to rotate clockwise' : undefined}
            accessibilityState={{ disabled: disabled || !rotatable }}
            accessibilityActions={rotatable ? ACTIVATE : undefined}
            onAccessibilityAction={(ev) => {
              if (!disabled && ev.nativeEvent.actionName === 'activate') onPress(i);
            }}
            style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell }}
          />
        );
      })}
    </View>
  );
}

export const TileHitGrid = memo(TileHitGridImpl);
