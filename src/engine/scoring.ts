export type Stars = 0 | 1 | 2 | 3;

export const THREE_STAR_EFFICIENCY = 0.9;
export const TWO_STAR_EFFICIENCY = 0.65;
/** Balancing rule (tunable): using any hint caps the result at 2 stars. */
export const HINT_STAR_CAP: Stars = 2;

export interface ScoreInput {
  readonly completed: boolean;
  readonly moves: number;
  /**
   * Reference move count. Use the proven optimum when available, otherwise a
   * verified solution length (par). Never display par as "optimal".
   */
  readonly referenceMoves: number;
  readonly hintsUsed: number;
}

/** efficiency = reference / moves, clamped to [0, 1]. Zero moves counts as perfect. */
export function efficiency(moves: number, referenceMoves: number): number {
  if (moves <= 0) return 1;
  if (referenceMoves <= 0) return 1;
  return Math.min(1, referenceMoves / moves);
}

export function computeStars(input: ScoreInput): Stars {
  if (!input.completed) return 0;
  const e = efficiency(input.moves, input.referenceMoves);
  let stars: Stars = e >= THREE_STAR_EFFICIENCY ? 3 : e >= TWO_STAR_EFFICIENCY ? 2 : 1;
  if (input.hintsUsed > 0 && stars > HINT_STAR_CAP) stars = HINT_STAR_CAP;
  return stars;
}

export function bestStars(a: Stars, b: Stars): Stars {
  return (a >= b ? a : b) as Stars;
}
