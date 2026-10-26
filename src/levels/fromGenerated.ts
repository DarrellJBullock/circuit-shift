import { GENERATOR_VERSION, type GeneratedPuzzle, SEARCH_SOLVER_VERSION } from '@/engine';

import type { LevelPlan } from './plans';
import type { Level } from './schema';

/** Wraps a generator result in the shipped level schema. */
export function levelFromGenerated(plan: LevelPlan, g: GeneratedPuzzle): Level {
  const proven = g.optimality === 'proven';
  return {
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
    difficulty: plan.difficulty,
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
}
