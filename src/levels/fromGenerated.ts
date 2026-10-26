import { GENERATOR_VERSION, type GeneratedPuzzle, SEARCH_SOLVER_VERSION, generatePuzzle } from '@/engine';

import { difficultyLabel, difficultyScore, levelMetrics } from './balance';
import type { LevelPlan } from './plans';
import type { Level } from './schema';

/** Wraps a generator result in the shipped level schema; difficulty is computed, not hand-set. */
export function levelFromGenerated(plan: LevelPlan, g: GeneratedPuzzle): Level {
  const proven = g.optimality === 'proven';
  const level: Level = {
    id: plan.id,
    chapterId: plan.chapterId,
    order: plan.order,
    title: plan.title,
    width: g.width,
    height: g.height,
    tiles: g.tiles,
    sourceIds: g.tiles.filter((t) => t.type === 'source').map((t) => t.id),
    receiverObjectives: g.objectives,
    constraints: g.constraints,
    difficulty: 1,
    optimalMoves: proven ? g.moves : null,
    generatorVersion: GENERATOR_VERSION,
    seed: plan.spec.seed,
    solutionMetadata: {
      rotations: g.solution,
      parMoves: g.moves,
      optimality: g.optimality,
      solverVersion: SEARCH_SOLVER_VERSION,
    },
  };
  return { ...level, difficulty: difficultyLabel(difficultyScore(levelMetrics(level))) };
}

/** Deterministic re-seed stride used when a plan sets `minScore`. */
export const RESEED_STRIDE = 104_729;
const MAX_RESEEDS = 40;

/**
 * Generates a planned level. With `minScore`, tries seed, seed+stride, …
 * until the level meets the balancing floor; the seed actually used is
 * recorded in the level, so the result stays reproducible.
 */
export function generatePlannedLevel(plan: LevelPlan): { ok: true; level: Level; attempts: number } | { ok: false; reason: string } {
  for (let k = 0; k < MAX_RESEEDS; k++) {
    const seed = plan.spec.seed + k * RESEED_STRIDE;
    const effective: LevelPlan = { ...plan, spec: { ...plan.spec, seed } };
    const r = generatePuzzle(effective.spec);
    if (!r.ok) continue;
    const level = levelFromGenerated(effective, r.puzzle);
    if (plan.minScore !== undefined && difficultyScore(levelMetrics(level)) < plan.minScore) continue;
    return { ok: true, level, attempts: k + 1 };
  }
  return { ok: false, reason: `no seed met the plan within ${MAX_RESEEDS} tries` };
}
