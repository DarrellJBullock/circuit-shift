import { type Board, neighborIndex } from './board';
import { PORTS, type Rotation, distinctRotationCount, normalizeRotation, opposite, rotateMask } from './ports';
import { type Puzzle, evaluate } from './rules';
import { type SolveResult, type SolverLimits, DEFAULT_LIMITS, applyRotations, solve as solveBfs, stateSpaceSize } from './solver';
import { isConductive, isRotatable, tileMask } from './tiles';

export const SEARCH_SOLVER_VERSION = 'dfs-bb-1';

/** Result of the bounded search; `feasible` is a verified solution whose minimality is NOT proven. */
export type SearchResult =
  | SolveResult
  | { status: 'feasible'; moves: number; rotations: Rotation[]; explored: number; elapsedMs: number; reason: 'stateLimit' | 'timeLimit' };

interface Option {
  readonly rotation: Rotation;
  readonly mask: number;
  readonly cost: number;
}

/**
 * Depth-first branch-and-bound over tile orientations (row-major), for boards
 * too large for the exhaustive layered BFS.
 *
 * Strict levels (noOpenEnds + allTilesPowered) require every open port to meet
 * a reciprocal port, so a tile's orientation must agree exactly with each
 * already-placed neighbour and may not face the edge or a dead cell; this
 * pruning is exact. Non-strict levels fall back to cost-bound pruning only.
 *
 * Completing the search proves the optimum. When a limit stops it, a found
 * solution is reported as `feasible` (upper bound), never as optimal.
 */
export function solveSearch(
  puzzle: Puzzle,
  board: Board = puzzle.board,
  limits: SolverLimits = DEFAULT_LIMITS,
): SearchResult {
  const now = limits.now ?? (() => Date.now());
  const t0 = now();
  const strict = puzzle.constraints.noOpenEnds && puzzle.constraints.allTilesPowered;
  const tiles = board.tiles;

  // Assigned mask per tile: fixed tiles start assigned; variables start at -1.
  const masks = tiles.map((t) => (isConductive(t) ? tileMask(t) : 0));
  const conductive = tiles.map(isConductive);
  const vars: { index: number; options: Option[] }[] = [];
  tiles.forEach((t, index) => {
    if (!isRotatable(t)) return;
    const k = distinctRotationCount(t.baseMask);
    if (k === 1) return;
    const options: Option[] = [];
    for (let c = 0; c < k; c++) {
      const rotation = normalizeRotation(t.rotation + c);
      options.push({ rotation, mask: rotateMask(t.baseMask, rotation), cost: c });
    }
    vars.push({ index, options });
    masks[index] = -1;
  });

  const consistent = (index: number, mask: number): boolean => {
    for (const p of PORTS) {
      const open = (mask & p) !== 0;
      const n = neighborIndex(board, index, p);
      if (n < 0 || !conductive[n]) {
        if (open) return false;
        continue;
      }
      const other = masks[n]!;
      if (other === -1) continue;
      if (open !== ((other & opposite(p)) !== 0)) return false;
    }
    return true;
  };

  // Strict mode: fixed tiles must already agree with fixed neighbours.
  if (strict) {
    for (let i = 0; i < tiles.length; i++) {
      if (conductive[i] && masks[i] !== -1 && !consistent(i, masks[i]!)) {
        return { status: 'unsolvable', explored: 0, elapsedMs: now() - t0 };
      }
    }
  }

  const rotations = tiles.map((t) => t.rotation);
  const state = {
    explored: 0,
    best: Number.POSITIVE_INFINITY,
    bestRotations: null as Rotation[] | null,
    stop: null as 'stateLimit' | 'timeLimit' | null,
  };

  const dfs = (j: number, cost: number): void => {
    if (state.stop) return;
    state.explored++;
    if (state.explored > limits.maxStates) {
      state.stop = 'stateLimit';
      return;
    }
    if ((state.explored & 1023) === 0 && now() - t0 > limits.maxMs) {
      state.stop = 'timeLimit';
      return;
    }
    if (j === vars.length) {
      const candidate = applyRotations(board, rotations);
      if (evaluate(candidate, puzzle.objectives, puzzle.constraints).solved) {
        state.best = cost;
        state.bestRotations = rotations.slice();
      }
      return;
    }
    const v = vars[j]!;
    for (const opt of v.options) {
      if (cost + opt.cost >= state.best) break; // options are cost-ordered
      if (strict && !consistent(v.index, opt.mask)) continue;
      masks[v.index] = opt.mask;
      rotations[v.index] = opt.rotation;
      dfs(j + 1, cost + opt.cost);
      if (state.stop) break;
    }
    masks[v.index] = -1;
    rotations[v.index] = tiles[v.index]!.rotation;
  };

  dfs(0, 0);
  const { explored, bestRotations, best, stop } = state;
  const elapsedMs = now() - t0;
  if (stop) {
    return bestRotations
      ? { status: 'feasible', moves: best, rotations: bestRotations, explored, elapsedMs, reason: stop }
      : { status: 'unknown', reason: stop, explored, elapsedMs };
  }
  return bestRotations
    ? { status: 'optimal', moves: best, rotations: bestRotations, explored, elapsedMs }
    : { status: 'unsolvable', explored, elapsedMs };
}

/**
 * Picks a solver: the bounded search for strict levels (exact pruning makes it
 * fastest), the exhaustive BFS when the state space is small, otherwise the
 * bounded search with cost-only pruning.
 */
export function solveAuto(
  puzzle: Puzzle,
  board: Board = puzzle.board,
  limits: SolverLimits = DEFAULT_LIMITS,
): SearchResult {
  const strict = puzzle.constraints.noOpenEnds && puzzle.constraints.allTilesPowered;
  if (!strict && stateSpaceSize(board) <= limits.maxStates) return solveBfs(puzzle, board, limits);
  return solveSearch(puzzle, board, limits);
}
