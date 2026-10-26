/**
 * Interim hint economy (Phase 5): a few free hints per level, no ads yet.
 * Phase 6 adds rewarded-ad hints on top of this; using any hint still caps
 * the result at two stars (engine/scoring.ts).
 */
export const FREE_HINTS_PER_LEVEL = 3;

/** Solver budget for a hint; generated levels resolve in a few milliseconds. */
export const HINT_SOLVER_LIMITS = { maxStates: 200_000, maxMs: 400 } as const;

export function hintsRemaining(hintsUsed: number): number {
  return Math.max(0, FREE_HINTS_PER_LEVEL - hintsUsed);
}
