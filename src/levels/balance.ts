import { distinctRotationCount, isRotatable } from '@/engine';

import type { Difficulty, Level } from './schema';

export interface LevelMetrics {
  /** Proven optimum (or verified par). */
  readonly moves: number;
  /** Rotatable tiles with four distinct orientations (elbows, tees, endpoints). */
  readonly fourWay: number;
  /** Rotatable straights (two orientations). */
  readonly twoWay: number;
  readonly receivers: number;
  readonly networks: number;
  readonly colors: number;
}

export function levelMetrics(level: Level): LevelMetrics {
  let fourWay = 0;
  let twoWay = 0;
  for (const t of level.tiles) {
    if (!isRotatable(t)) continue;
    const k = distinctRotationCount(t.baseMask);
    if (k === 4) fourWay++;
    else if (k === 2) twoWay++;
  }
  const colors = new Set(level.tiles.filter((t) => t.type === 'source').map((t) => t.meta?.color ?? 'cyan')).size;
  return {
    moves: level.optimalMoves ?? level.solutionMetadata.parMoves,
    fourWay,
    twoWay,
    receivers: level.receiverObjectives.length,
    networks: level.sourceIds.length,
    colors,
  };
}

/**
 * Heuristic difficulty (not shown to players): taps needed, plus how many
 * tiles have several plausible orientations, plus structural load (extra
 * networks, colour mixing risk). Used to keep each chapter's curve rising
 * and to derive the 1–10 difficulty label.
 */
export function difficultyScore(m: LevelMetrics): number {
  return m.moves + 0.6 * m.fourWay + 0.25 * m.twoWay + 0.5 * m.receivers + 3 * (m.networks - 1) + 4 * (m.colors - 1);
}

/** 1–10 label shown to players, derived from the score (≈9 points per step). */
export function difficultyLabel(score: number): Difficulty {
  return Math.min(10, Math.max(1, Math.ceil(score / 9))) as Difficulty;
}
