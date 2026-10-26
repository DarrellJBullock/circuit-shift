import { Canvas, useClock } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import type { GameState } from '@/engine';

import { TileHitGrid } from './TileHitGrid';
import { TileNode } from './TileNode';
import { useReduceMotion } from './useReduceMotion';

export interface BoardViewProps {
  readonly game: GameState;
  readonly cell: number;
  readonly onTilePress: (index: number) => void;
}

export function BoardView({ game, cell, onTilePress }: BoardViewProps) {
  const clock = useClock();
  const reduceMotion = useReduceMotion();
  const { board, evaluation } = game;
  const { power } = evaluation;
  const width = board.width * cell;
  const height = board.height * cell;
  const satisfied = useMemo(
    () => new Set(evaluation.objectives.filter((o) => o.satisfied).map((o) => o.index)),
    [evaluation.objectives],
  );

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
            clock={clock}
            reduceMotion={reduceMotion}
          />
        ))}
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
