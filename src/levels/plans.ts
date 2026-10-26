import type { GeneratorSpec, SignalColor } from '@/engine';

import type { ChapterId, Difficulty } from './schema';

/**
 * Curated generation plans. Each entry is fed to the generator with its seed;
 * `npm run generate-levels` writes the results to `data/<chapter>.generated.json`
 * and a test regenerates them to prove the committed data is reproducible.
 *
 * To rebalance a level: change its seed or bounds, regenerate, review, commit.
 */
export interface LevelPlan {
  readonly id: string;
  readonly chapterId: ChapterId;
  readonly order: number;
  readonly title: string;
  readonly difficulty: Difficulty;
  readonly spec: GeneratorSpec;
}

interface Row {
  readonly order: number;
  readonly title: string;
  readonly size: readonly [number, number];
  readonly receivers: readonly [number, number];
  readonly moves: readonly [number, number];
  readonly seed: number;
  readonly difficulty: Difficulty;
  readonly cross?: boolean;
  readonly minCrosses?: number;
  readonly obstacles?: number;
  readonly locked?: number;
  readonly networks?: readonly SignalColor[];
}

function plan(chapterId: ChapterId, rows: readonly Row[]): LevelPlan[] {
  return rows.map((r) => ({
    id: `${chapterId}-${String(r.order).padStart(2, '0')}`,
    chapterId,
    order: r.order,
    title: r.title,
    difficulty: r.difficulty,
    spec: {
      width: r.size[0],
      height: r.size[1],
      seed: r.seed,
      networks: r.networks ?? ['cyan'],
      coverage: 0.9,
      obstacleRate: r.obstacles ?? 0.08,
      pathiness: 0.55,
      allowCross: r.cross ?? false,
      ...(r.minCrosses ? { minCrosses: r.minCrosses } : {}),
      lockedRate: r.locked ?? 0.06,
      minReceivers: r.receivers[0],
      maxReceivers: r.receivers[1],
      minMoves: r.moves[0],
      maxMoves: r.moves[1],
    },
  }));
}

/** Chapter 1 "Ignition": connections, bends, branches. Levels 1–3 are hand-built. */
export const CHAPTER1_PLAN: readonly LevelPlan[] = plan('ch1', [
  { order: 4, title: 'Live Wire', size: [3, 4], receivers: [1, 2], moves: [4, 8], seed: 104, difficulty: 2 },
  { order: 5, title: 'Fork', size: [4, 4], receivers: [2, 2], moves: [5, 10], seed: 105, difficulty: 2 },
  { order: 6, title: 'Relay', size: [4, 4], receivers: [2, 3], moves: [6, 12], seed: 106, difficulty: 3 },
  { order: 7, title: 'Switchback', size: [4, 5], receivers: [2, 3], moves: [8, 14], seed: 107, difficulty: 3 },
  { order: 8, title: 'Trident', size: [4, 5], receivers: [3, 3], moves: [8, 16], seed: 108, difficulty: 4 },
  { order: 9, title: 'Conduit', size: [5, 5], receivers: [3, 3], moves: [10, 18], seed: 109, difficulty: 4 },
  { order: 10, title: 'Capacitor Row', size: [5, 5], receivers: [3, 4], moves: [12, 20], seed: 110, difficulty: 5 },
  { order: 11, title: 'Undercurrent', size: [5, 6], receivers: [3, 4], moves: [14, 22], seed: 111, difficulty: 5 },
  { order: 12, title: 'Crossroads', size: [5, 6], receivers: [4, 4], moves: [14, 24], seed: 112, difficulty: 5, cross: true, minCrosses: 1 },
  { order: 13, title: 'Feedback', size: [5, 6], receivers: [4, 5], moves: [16, 26], seed: 113, difficulty: 6, cross: true },
  { order: 14, title: 'Lattice', size: [6, 6], receivers: [4, 5], moves: [18, 28], seed: 114, difficulty: 6, cross: true },
  { order: 15, title: 'Overclock', size: [6, 6], receivers: [4, 6], moves: [20, 30], seed: 115, difficulty: 6, cross: true },
  { order: 16, title: 'Busbar', size: [6, 7], receivers: [5, 6], moves: [22, 32], seed: 116, difficulty: 7, cross: true },
  { order: 17, title: 'Ground Loop', size: [6, 7], receivers: [5, 7], moves: [24, 34], seed: 117, difficulty: 7, cross: true },
  { order: 18, title: 'Mainframe', size: [7, 7], receivers: [5, 7], moves: [26, 38], seed: 118, difficulty: 8, cross: true },
  { order: 19, title: 'Arc Flash', size: [7, 8], receivers: [7, 10], moves: [28, 44], seed: 119, difficulty: 8, cross: true },
  { order: 20, title: 'Ignition', size: [7, 8], receivers: [7, 11], moves: [30, 48], seed: 120, difficulty: 9, cross: true },
]);
