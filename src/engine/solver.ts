import { type Board, withTiles } from './board';
import { type Rotation, distinctRotationCount, normalizeRotation } from './ports';
import { type Puzzle, evaluate } from './rules';
import { isRotatable, withRotation } from './tiles';

export const SOLVER_VERSION = 'bfs-1';

export interface SolverLimits {
  /** Maximum number of candidate states to evaluate. */
  readonly maxStates: number;
  /** Wall-clock budget in milliseconds. */
  readonly maxMs: number;
  /** Injectable clock for deterministic tests. */
  readonly now?: () => number;
}

export const DEFAULT_LIMITS: SolverLimits = { maxStates: 250_000, maxMs: 1_500 };

interface Stats {
  readonly explored: number;
  readonly elapsedMs: number;
}

export type SolveResult =
  /** Exhaustive layer search proved no shorter solution exists. */
  | (Stats & { status: 'optimal'; moves: number; rotations: Rotation[] })
  /** Every reachable state was checked and none is solved. */
  | (Stats & { status: 'unsolvable' })
  /** Limits hit before an answer was proven. Never treat as solvable or optimal. */
  | (Stats & { status: 'unknown'; reason: 'stateLimit' | 'timeLimit' });

interface Variable {
  readonly index: number;
  readonly start: Rotation;
  /** Distinct orientations after collapsing symmetry: 1, 2 or 4. */
  readonly k: number;
}

export function solverVariables(board: Board): Variable[] {
  const vars: Variable[] = [];
  board.tiles.forEach((t, index) => {
    if (!isRotatable(t)) return;
    const k = distinctRotationCount(t.baseMask);
    if (k > 1) vars.push({ index, start: t.rotation, k });
  });
  return vars;
}

/** Number of distinct board states reachable from `board` (product of k). */
export function stateSpaceSize(board: Board): number {
  return solverVariables(board).reduce((acc, v) => acc * v.k, 1);
}

/**
 * Minimum-move solver from the *current* board state.
 *
 * A move rotates one tile a quarter turn clockwise, and moves on different
 * tiles commute, so the move graph is explored breadth-first by enumerating
 * per-tile tap counts t_j ∈ [0, k_j) in layers of increasing Σt_j. The first
 * layer containing a solved state is the proven optimum.
 */
export function solve(
  puzzle: Puzzle,
  board: Board = puzzle.board,
  limits: SolverLimits = DEFAULT_LIMITS,
): SolveResult {
  const now = limits.now ?? (() => Date.now());
  const t0 = now();
  const vars = solverVariables(board);
  const taps = new Array<number>(vars.length).fill(0);
  // suffixCapacity[j] = max taps still placeable from variable j onward.
  const suffixCapacity = new Array<number>(vars.length + 1).fill(0);
  for (let j = vars.length - 1; j >= 0; j--) suffixCapacity[j] = suffixCapacity[j + 1]! + vars[j]!.k - 1;
  const maxDepth = suffixCapacity[0]!;

  const search: {
    explored: number;
    stop: 'stateLimit' | 'timeLimit' | null;
    found: Rotation[] | null;
  } = { explored: 0, stop: null, found: null };

  const rotationsFor = (): Rotation[] => {
    const rotations = board.tiles.map((t) => t.rotation);
    vars.forEach((v, j) => {
      rotations[v.index] = normalizeRotation(v.start + taps[j]!);
    });
    return rotations;
  };

  const check = (): boolean => {
    search.explored++;
    if (search.explored > limits.maxStates) {
      search.stop = 'stateLimit';
      return false;
    }
    if ((search.explored & 255) === 0 && now() - t0 > limits.maxMs) {
      search.stop = 'timeLimit';
      return false;
    }
    const rotations = rotationsFor();
    const candidate = applyRotations(board, rotations);
    if (evaluate(candidate, puzzle.objectives, puzzle.constraints).solved) {
      search.found = rotations;
    }
    return true;
  };

  // Assign taps to variables j.. so that they sum to exactly `remaining`.
  const layer = (j: number, remaining: number): void => {
    if (search.found || search.stop) return;
    if (j === vars.length) {
      if (remaining === 0) check();
      return;
    }
    const v = vars[j]!;
    const lo = Math.max(0, remaining - suffixCapacity[j + 1]!);
    const hi = Math.min(v.k - 1, remaining);
    for (let t = lo; t <= hi && !search.found && !search.stop; t++) {
      taps[j] = t;
      layer(j + 1, remaining - t);
    }
    taps[j] = 0;
  };

  for (let depth = 0; depth <= maxDepth && !search.found && !search.stop; depth++) {
    layer(0, depth);
    const { found, explored } = search;
    if (found) {
      return { status: 'optimal', moves: depth, rotations: found, explored, elapsedMs: now() - t0 };
    }
  }
  const { stop, explored } = search;
  const elapsedMs = now() - t0;
  if (stop) return { status: 'unknown', reason: stop, explored, elapsedMs };
  return { status: 'unsolvable', explored, elapsedMs };
}

export function applyRotations(board: Board, rotations: readonly Rotation[]): Board {
  return withTiles(
    board,
    board.tiles.map((t, i) => withRotation(t, rotations[i] ?? t.rotation)),
  );
}

/** Quarter turns needed to bring `from` to an orientation equivalent to `to`. */
export function tapDistance(baseMask: number, from: Rotation, to: Rotation): number {
  const k = distinctRotationCount(baseMask);
  return (((to - from) % k) + k) % k;
}
