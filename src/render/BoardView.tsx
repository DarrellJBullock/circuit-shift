import { Canvas } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import { type GameState, hashSeed, inflowPort } from '@/engine';

import { type BurstOrigin, CompletionBurst } from './CompletionBurst';

import { TileHitGrid } from './TileHitGrid';
import { TileNode } from './TileNode';
import { useAnimationClock } from './useAnimationClock';
import { useReduceMotion } from './useReduceMotion';

export interface BoardViewProps {
  readonly game: GameState;
  readonly cell: number;
  readonly onTilePress: (index: number) => void;
  readonly hint?: { readonly index: number; readonly nonce: number } | null;
  /** Tutorial: tiles to ring. */
  readonly guide?: readonly number[];
}

export function BoardView({ game, cell, onTilePress, hint, guide }: BoardViewProps) {
  const reduceMotion = useReduceMotion();
  // Ambient animation only while actually playing with motion enabled.
  const clock = useAnimationClock(!reduceMotion && game.status === 'playing');
  const { board, evaluation } = game;
  const { power } = evaluation;
  const width = board.width * cell;
  const height = board.height * cell;
  const satisfied = useMemo(
    () => new Set(evaluation.objectives.filter((o) => o.satisfied).map((o) => o.index)),
    [evaluation.objectives],
  );
  const acceptsOf = useMemo(
    () => new Map(evaluation.objectives.map((o) => [o.index, o.accepts] as const)),
    [evaluation.objectives],
  );
  const won = game.status === 'won';
  const burstOrigins = useMemo<BurstOrigin[]>(() => {
    if (!won) return [];
    return board.tiles.flatMap((t, i) => {
      const isSource = t.type === 'source';
      if (!isSource && !(t.type === 'receiver' && satisfied.has(i))) return [];
      const x = (i % board.width) * cell + cell / 2;
      const y = Math.floor(i / board.width) * cell + cell / 2;
      return [{ x, y, color: isSource ? null : (t.meta?.color ?? 'cyan') }];
    });
  }, [won, board, satisfied, cell]);
  const burstSeed = useMemo(() => hashSeed(board.tiles.map((t) => t.id).join(',')), [board.tiles]);

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }} accessible={false}>
        {board.tiles.map((tile, i) => (
          <TileNode
            key={tile.id}
            tile={tile}
            x={i % board.width}
            y={Math.floor(i / board.width)}
            cell={cell}
            color={power.colorOf[i] ?? null}
            shorted={power.shortedOf[i] ?? false}
            depth={power.depthOf[i] ?? 0}
            satisfied={satisfied.has(i)}
            accepts={acceptsOf.get(i)}
            inPort={inflowPort(board, power, i)}
            hintNonce={hint?.index === i ? hint.nonce : 0}
            guided={guide?.includes(i) ?? false}
            clock={clock}
            reduceMotion={reduceMotion}
          />
        ))}
        {reduceMotion ? null : <CompletionBurst origins={burstOrigins} cell={cell} active={won} seed={burstSeed} />}
      </Canvas>
      <TileHitGrid
        tiles={board.tiles}
        width={board.width}
        cell={cell}
        evaluation={evaluation}
        disabled={game.status !== 'playing'}
        onPress={onTilePress}
      />
    </View>
  );
}
