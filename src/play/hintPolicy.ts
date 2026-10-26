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

export type HintAccess =
  | { readonly kind: 'free'; readonly remaining: number }
  /** "Remove ads" owners: hints without ads. */
  | { readonly kind: 'unlimited' }
  /** Free hints used up; a rewarded ad can unlock one more. */
  | { readonly kind: 'watchAd' }
  | { readonly kind: 'none' };

export function hintAccess(hintsUsed: number, opts: { noAds: boolean; adsAvailable: boolean }): HintAccess {
  const remaining = hintsRemaining(hintsUsed);
  if (remaining > 0) return { kind: 'free', remaining };
  if (opts.noAds) return { kind: 'unlimited' };
  return opts.adsAvailable ? { kind: 'watchAd' } : { kind: 'none' };
}
