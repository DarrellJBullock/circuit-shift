import { EAST, NORTH, type Port, type Rotation, SOUTH, WEST, opposite, portCount, rotateMask } from './ports';
import { type Rng, createRng, hashSeed } from './rng';
import type { LevelConstraints, Puzzle, ReceiverObjective } from './rules';
import { type SearchResult, solveAuto } from './searchSolver';
import type { SolverLimits } from './solver';
import { CANONICAL_BASE_MASK, type SignalColor, type Tile, type TileType } from './tiles';

/**
 * Generator gen-1. Changing anything that affects output for a given seed
 * requires a new version string, otherwise shipped levels and historical
 * daily challenges would silently change.
 */
export const GENERATOR_VERSION = 'gen-1';

export interface GeneratorSpec {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  /** One entry per network; each network gets its own source of that colour. */
  readonly networks: readonly SignalColor[];
  /** Fraction of non-blocked cells the networks should cover (0..1). */
  readonly coverage: number;
  /** Fraction of cells turned into blocked obstacles before growth. */
  readonly obstacleRate: number;
  /** Probability of growing from the newest cell (long paths) vs. a random cell (branches). */
  readonly pathiness: number;
  readonly allowCross: boolean;
  /** Reject layouts with fewer cross tiles (used to feature a mechanic). Default 0. */
  readonly minCrosses?: number;
  /** Fraction of wire tiles locked in their solved orientation (free hints). */
  readonly lockedRate: number;
  readonly minReceivers: number;
  readonly maxReceivers: number;
  readonly minMoves: number;
  readonly maxMoves: number;
  readonly maxAttempts?: number;
  readonly solverLimits?: SolverLimits;
}

export interface GeneratedPuzzle {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
  readonly objectives: readonly ReceiverObjective[];
  readonly constraints: LevelConstraints;
  readonly solution: readonly Rotation[];
  readonly moves: number;
  readonly optimality: 'proven' | 'upperBound';
  readonly attempt: number;
  readonly receivers: number;
}

export type GenerateResult =
  | { readonly ok: true; readonly puzzle: GeneratedPuzzle }
  | { readonly ok: false; readonly reason: string; readonly rejections: Readonly<Record<string, number>> };

const STRICT: LevelConstraints = { noOpenEnds: true, allTilesPowered: true };
const DIRS: readonly Port[] = [NORTH, EAST, SOUTH, WEST];

/** Rotation that turns `base` into `mask`, or -1 if impossible. Smallest wins. */
export function rotationFor(base: number, mask: number): Rotation | -1 {
  for (let r = 0; r < 4; r++) if (rotateMask(base, r) === mask) return r as Rotation;
  return -1;
}

function neighbor(i: number, p: Port, w: number, h: number): number {
  const x = i % w;
  const y = Math.floor(i / w);
  const nx = x + (p === EAST ? 1 : p === WEST ? -1 : 0);
  const ny = y + (p === SOUTH ? 1 : p === NORTH ? -1 : 0);
  return nx < 0 || ny < 0 || nx >= w || ny >= h ? -1 : ny * w + nx;
}

interface Layout {
  readonly blocked: boolean[];
  /** Solved port mask per cell (0 = not part of any network). */
  readonly masks: number[];
  /** Network index per cell, -1 when unused. */
  readonly owner: number[];
  readonly sources: number[];
}

/** Step 1–2: obstacles plus random spanning trees that partition the board. */
function growLayout(spec: GeneratorSpec, rng: Rng): Layout | string {
  const { width: w, height: h } = spec;
  const n = w * h;
  const blocked = Array.from({ length: n }, () => rng.next() < spec.obstacleRate);
  const masks = new Array<number>(n).fill(0);
  const owner = new Array<number>(n).fill(-1);
  const free = blocked.filter((b) => !b).length;
  const target = Math.max(spec.networks.length * 2, Math.round(free * spec.coverage));

  // Seed each network with a source cell.
  const sources: number[] = [];
  const open = rng.shuffle(blocked.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0));
  for (let k = 0; k < spec.networks.length; k++) {
    const s = open.find((i) => owner[i] === -1);
    if (s === undefined) return 'no room for sources';
    owner[s] = k;
    sources.push(s);
  }
  const members: number[][] = sources.map((s) => [s]);

  let placed = sources.length;
  let stalled = 0;
  while (placed < target && stalled < spec.networks.length) {
    stalled = 0;
    for (let k = 0; k < spec.networks.length && placed < target; k++) {
      const list = members[k]!;
      // Candidate growth edges (from, port, to); sources keep exactly one link.
      const fromOrder = rng.next() < spec.pathiness ? [list[list.length - 1]!, ...rng.shuffle(list)] : rng.shuffle(list);
      let grew = false;
      for (const from of fromOrder) {
        const isSource = from === sources[k];
        const degree = portCount(masks[from]!);
        if (isSource && degree >= 1) continue;
        if (degree >= (spec.allowCross ? 4 : 3)) continue;
        const dirs = rng.shuffle(DIRS).filter((p) => {
          const to = neighbor(from, p, w, h);
          return to >= 0 && !blocked[to] && owner[to] === -1;
        });
        const p = dirs[0];
        if (p === undefined) continue;
        const to = neighbor(from, p, w, h);
        masks[from] = masks[from]! | p;
        masks[to] = masks[to]! | opposite(p);
        owner[to] = k;
        list.push(to);
        placed++;
        grew = true;
        break;
      }
      if (!grew) stalled++;
    }
  }
  if (placed < Math.min(target, spec.networks.length * 3)) return 'networks too small';
  return { blocked, masks, owner, sources };
}

/** Step 3: map each cell's solved mask to a tile type and orientation. */
function buildTiles(spec: GeneratorSpec, layout: Layout, rng: Rng): { tiles: Tile[]; solution: Rotation[] } | string {
  const tiles: Tile[] = [];
  const solution: Rotation[] = [];
  const { width: w } = spec;
  for (let i = 0; i < layout.masks.length; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    const mask = layout.masks[i]!;
    const k = layout.owner[i]!;
    let type: TileType;
    if (layout.blocked[i]) type = 'blocked';
    else if (mask === 0) type = 'empty';
    else if (layout.sources.includes(i)) type = 'source';
    else {
      const ports = portCount(mask);
      if (ports === 1) type = 'receiver';
      else if (ports === 2) type = mask === (NORTH | SOUTH) || mask === (EAST | WEST) ? 'straight' : 'elbow';
      else if (ports === 3) type = 'tee';
      else type = 'cross';
    }
    const endpoint = type === 'source' || type === 'receiver';
    const base = endpoint ? NORTH : CANONICAL_BASE_MASK[type]!;
    const rot = mask === 0 ? 0 : rotationFor(base, mask);
    if (rot === -1) return `no orientation for ${type} at ${x},${y}`;
    const color = k >= 0 ? spec.networks[k]! : undefined;
    const lockWire = !endpoint && mask !== 0 && rng.next() < spec.lockedRate;
    tiles.push({
      id: `${type}-${x}-${y}`,
      type,
      baseMask: base,
      rotation: rot,
      locked: endpoint || lockWire,
      ...(endpoint && color && color !== 'cyan' ? { meta: { color } } : {}),
    });
    solution.push(rot);
  }
  return { tiles, solution };
}

/** Step 4: scramble every rotatable tile with the seeded PRNG. */
function scramble(tiles: readonly Tile[], rng: Rng): Tile[] {
  return tiles.map((t) => {
    if (t.locked || t.baseMask === 0 || t.type === 'cross') return t;
    return { ...t, rotation: rng.int(4) as Rotation };
  });
}

/**
 * Generate a validated puzzle. Deterministic for a given spec: attempt `a`
 * uses seed hash("<seed>:<a>"). Rejected candidates are counted by reason.
 */
export function generatePuzzle(spec: GeneratorSpec): GenerateResult {
  const rejections: Record<string, number> = {};
  const reject = (reason: string) => {
    rejections[reason] = (rejections[reason] ?? 0) + 1;
  };
  const limits = spec.solverLimits ?? { maxStates: 400_000, maxMs: 4_000 };
  const maxAttempts = spec.maxAttempts ?? 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(hashSeed(`${GENERATOR_VERSION}:${spec.seed}:${attempt}`));
    const layout = growLayout(spec, rng);
    if (typeof layout === 'string') {
      reject(layout);
      continue;
    }
    const built = buildTiles(spec, layout, rng);
    if (typeof built === 'string') {
      reject(built);
      continue;
    }
    if (built.tiles.filter((t) => t.type === 'cross').length < (spec.minCrosses ?? 0)) {
      reject('too few crosses');
      continue;
    }
    const receivers = built.tiles.filter((t) => t.type === 'receiver').length;
    if (receivers < spec.minReceivers || receivers > spec.maxReceivers) {
      reject('receiver count');
      continue;
    }
    const tiles = scramble(built.tiles, rng);
    const objectives: ReceiverObjective[] = tiles
      .filter((t) => t.type === 'receiver')
      .map((t) => ({ receiverId: t.id, accepts: [t.meta?.color ?? 'cyan'] }));
    const puzzle: Puzzle = { board: { width: spec.width, height: spec.height, tiles }, objectives, constraints: STRICT };

    const result: SearchResult = solveAuto(puzzle, puzzle.board, limits);
    if (result.status === 'unknown' || result.status === 'unsolvable') {
      reject(`solver ${result.status}`);
      continue;
    }
    if (result.moves === 0) {
      reject('already solved');
      continue;
    }
    if (result.moves < spec.minMoves) {
      reject('too few moves');
      continue;
    }
    if (result.moves > spec.maxMoves) {
      reject('too many moves');
      continue;
    }
    return {
      ok: true,
      puzzle: {
        width: spec.width,
        height: spec.height,
        tiles,
        objectives,
        constraints: STRICT,
        solution: result.rotations,
        moves: result.moves,
        optimality: result.status === 'optimal' ? 'proven' : 'upperBound',
        attempt,
        receivers,
      },
    };
  }
  return { ok: false, reason: `no valid puzzle in ${maxAttempts} attempts`, rejections };
}
