import type { Board } from './board';
import type { Rotation } from './ports';
import type { Puzzle } from './rules';
import { solveAuto } from './searchSolver';
import { type SolverLimits, DEFAULT_LIMITS, tapDistance } from './solver';
import { isRotatable } from './tiles';

export interface Hint {
  readonly index: number;
  readonly rotation: Rotation;
}

/**
 * Next hint from the player's *current* board: the first tile (row-major)
 * whose orientation differs from a verified solution reachable from here.
 * Uses a proven-optimal solution when the search completes, or a verified
 * (`feasible`) one when it is cut off. Returns null when already solved or
 * when no solution could be verified within the limits.
 */
export function nextHint(puzzle: Puzzle, board: Board, limits: SolverLimits = DEFAULT_LIMITS): Hint | null {
  const result = solveAuto(puzzle, board, limits);
  if ((result.status !== 'optimal' && result.status !== 'feasible') || result.moves === 0) return null;
  for (let i = 0; i < board.tiles.length; i++) {
    const tile = board.tiles[i]!;
    const target = result.rotations[i]!;
    if (isRotatable(tile) && tapDistance(tile.baseMask, tile.rotation, target) > 0) {
      return { index: i, rotation: target };
    }
  }
  return null;
}
