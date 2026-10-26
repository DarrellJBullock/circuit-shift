import {
  CANONICAL_BASE_MASK,
  NORTH,
  type Rotation,
  type SignalColor,
  type Tile,
  type TileType,
  isRotatable,
  normalizeRotation,
  tapDistance,
} from '@/engine';

import type { ChapterId, Difficulty, Level } from './schema';

/**
 * Compact authoring notation for hand-built levels. One token per cell:
 *
 *   .  empty            #  blocked
 *   S<r> source         R<r> receiver      (single port, NORTH at rotation 0; locked by default)
 *   I<r> straight       L<r> elbow         T<r> tee        X  cross
 *
 * Modifiers after the rotation digit:  `*` locks a wire / unlocks a source or
 * receiver, `v` makes a source emit (or a receiver require) violet.
 */
const LETTER_TO_TYPE: Readonly<Record<string, TileType>> = {
  '.': 'empty',
  '#': 'blocked',
  S: 'source',
  R: 'receiver',
  I: 'straight',
  L: 'elbow',
  T: 'tee',
  X: 'cross',
};

interface ParsedCell {
  readonly type: TileType;
  readonly rotation: Rotation;
  readonly toggleLock: boolean;
  readonly color: SignalColor | undefined;
}

function parseCell(token: string): ParsedCell {
  const m = /^([.#SRILTX])([0-3])?(\*)?(v)?$/.exec(token);
  if (!m) throw new Error(`bad cell token "${token}"`);
  const type = LETTER_TO_TYPE[m[1]!]!;
  return {
    type,
    rotation: normalizeRotation(Number(m[2] ?? 0)),
    toggleLock: m[3] === '*',
    color: m[4] === 'v' ? 'violet' : undefined,
  };
}

function parseGrid(rows: readonly string[]): ParsedCell[][] {
  return rows.map((r) => r.trim().split(/\s+/).map(parseCell));
}

export interface HandcraftedSpec {
  readonly id: string;
  readonly chapterId: ChapterId;
  readonly order: number;
  readonly title: string;
  readonly difficulty: Difficulty;
  /** Scrambled start state. */
  readonly start: readonly string[];
  /** Solved state; must use the same tile types cell by cell. */
  readonly solution: readonly string[];
  readonly noOpenEnds?: boolean;
  readonly allTilesPowered?: boolean;
  /**
   * Set to true only after `npm run validate-levels` has proven the solution
   * length minimal; the validator re-checks this claim on every run.
   */
  readonly provenOptimal: boolean;
}

export function defineHandcrafted(spec: HandcraftedSpec): Level {
  const start = parseGrid(spec.start);
  const solved = parseGrid(spec.solution);
  const height = start.length;
  const width = start[0]?.length ?? 0;
  if (solved.length !== height || start.some((r) => r.length !== width) || solved.some((r) => r.length !== width)) {
    throw new Error(`${spec.id}: start and solution grids must be the same rectangular size`);
  }

  const tiles: Tile[] = [];
  const rotations: Rotation[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = start[y]![x]!;
      const target = solved[y]![x]!;
      if (cell.type !== target.type) throw new Error(`${spec.id}: cell ${x},${y} type differs between grids`);
      const endpoint = cell.type === 'source' || cell.type === 'receiver';
      const tile: Tile = {
        id: `${cell.type}-${x}-${y}`,
        type: cell.type,
        baseMask: endpoint ? NORTH : CANONICAL_BASE_MASK[cell.type]!,
        rotation: cell.rotation,
        locked: endpoint ? !cell.toggleLock : cell.toggleLock,
        ...(cell.color ? { meta: { color: cell.color } } : {}),
      };
      tiles.push(tile);
      rotations.push(target.rotation);
    }
  }

  const parMoves = tiles.reduce(
    (sum, t, i) => sum + (isRotatable(t) ? tapDistance(t.baseMask, t.rotation, rotations[i]!) : 0),
    0,
  );

  return {
    id: spec.id,
    chapterId: spec.chapterId,
    order: spec.order,
    title: spec.title,
    width,
    height,
    tiles,
    sourceIds: tiles.filter((t) => t.type === 'source').map((t) => t.id),
    receiverObjectives: tiles
      .filter((t) => t.type === 'receiver')
      .map((t) => ({ receiverId: t.id, accepts: [t.meta?.color ?? 'cyan'] })),
    constraints: {
      noOpenEnds: spec.noOpenEnds ?? true,
      allTilesPowered: spec.allTilesPowered ?? true,
    },
    difficulty: spec.difficulty,
    optimalMoves: spec.provenOptimal ? parMoves : null,
    generatorVersion: 'handcrafted',
    seed: null,
    solutionMetadata: {
      rotations,
      parMoves,
      optimality: spec.provenOptimal ? 'proven' : 'upperBound',
      solverVersion: spec.provenOptimal ? 'bfs-1' : 'none',
    },
  };
}
