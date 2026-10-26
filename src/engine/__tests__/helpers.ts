import type { Board } from '../board';
import { CANONICAL_BASE_MASK, type SignalColor, type Tile, type TileType } from '../tiles';
import { NORTH, normalizeRotation } from '../ports';
import type { LevelConstraints, Puzzle, ReceiverObjective } from '../rules';

const LETTERS: Record<string, TileType> = {
  '.': 'empty',
  '#': 'blocked',
  S: 'source',
  R: 'receiver',
  I: 'straight',
  L: 'elbow',
  T: 'tee',
  X: 'cross',
};

/**
 * Test board notation: one token per cell, e.g. "S1 I1 R3".
 * Suffix `*` locks the tile, `v` makes it violet. Sources/receivers use a
 * single NORTH port and are unlocked unless `*` is given.
 */
export function board(rows: string[]): Board {
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const height = grid.length;
  const width = grid[0]!.length;
  const tiles: Tile[] = [];
  grid.forEach((row, y) =>
    row.forEach((tok, x) => {
      const m = /^([.#SRILTX])([0-3])?(\*)?(v)?$/.exec(tok);
      if (!m) throw new Error(`bad token ${tok}`);
      const type = LETTERS[m[1]!]!;
      const endpoint = type === 'source' || type === 'receiver';
      tiles.push({
        id: `${type}-${x}-${y}`,
        type,
        baseMask: endpoint ? NORTH : CANONICAL_BASE_MASK[type]!,
        rotation: normalizeRotation(Number(m[2] ?? 0)),
        locked: m[3] === '*',
        ...(m[4] ? { meta: { color: 'violet' as SignalColor } } : {}),
      });
    }),
  );
  return { width, height, tiles };
}

export const STRICT: LevelConstraints = { noOpenEnds: true, allTilesPowered: true };
export const LOOSE: LevelConstraints = { noOpenEnds: false, allTilesPowered: false };

/** Puzzle whose objectives are every receiver, accepting its own colour (cyan default). */
export function puzzle(rows: string[], constraints: LevelConstraints = STRICT): Puzzle {
  const b = board(rows);
  const objectives: ReceiverObjective[] = b.tiles
    .filter((t) => t.type === 'receiver')
    .map((t) => ({ receiverId: t.id, accepts: [t.meta?.color ?? 'cyan'] }));
  return { board: b, objectives, constraints };
}

export function at(b: Board, x: number, y: number): number {
  return y * b.width + x;
}
