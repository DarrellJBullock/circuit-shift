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
  readonly anyReceivers?: number;
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
      ...(r.anyReceivers ? { anyReceiverRate: r.anyReceivers } : {}),
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

const TWO: readonly SignalColor[] = ['cyan', 'cyan'];
const DUO: readonly SignalColor[] = ['cyan', 'violet'];
const TRIO: readonly SignalColor[] = ['cyan', 'violet', 'cyan'];

/** Chapter 2 "Grid Lock": multiple sources, many receivers, long branching paths. */
export const CHAPTER2_PLAN: readonly LevelPlan[] = plan('ch2', [
  { order: 1, title: 'Twin Feed', size: [5, 5], receivers: [3, 5], moves: [12, 24], seed: 201, difficulty: 4, networks: TWO },
  { order: 2, title: 'Split Rail', size: [5, 5], receivers: [3, 5], moves: [14, 26], seed: 202, difficulty: 4, networks: TWO },
  { order: 3, title: 'Junction Box', size: [5, 6], receivers: [4, 6], moves: [16, 28], seed: 203, difficulty: 4, networks: TWO },
  { order: 4, title: 'Bypass', size: [5, 6], receivers: [4, 6], moves: [16, 30], seed: 204, difficulty: 5, networks: TWO, cross: true },
  { order: 5, title: 'Load Balancer', size: [6, 6], receivers: [4, 7], moves: [18, 32], seed: 205, difficulty: 5, networks: TWO, cross: true },
  { order: 6, title: 'Fan Out', size: [6, 6], receivers: [5, 7], moves: [20, 34], seed: 206, difficulty: 5, networks: TWO, cross: true },
  { order: 7, title: 'Parallel Lines', size: [6, 7], receivers: [5, 8], moves: [22, 36], seed: 207, difficulty: 6, networks: TWO, cross: true },
  { order: 8, title: 'Ring Main', size: [6, 7], receivers: [5, 8], moves: [24, 38], seed: 208, difficulty: 6, networks: TWO, cross: true },
  { order: 9, title: 'Substation', size: [6, 7], receivers: [6, 9], moves: [24, 40], seed: 209, difficulty: 6, networks: ['cyan', 'cyan', 'cyan'], cross: true },
  { order: 10, title: 'Grid Lock', size: [7, 7], receivers: [6, 9], moves: [26, 42], seed: 210, difficulty: 7, networks: TWO, cross: true },
  { order: 11, title: 'Bottleneck', size: [7, 7], receivers: [6, 10], moves: [28, 44], seed: 211, difficulty: 7, networks: TWO, cross: true, obstacles: 0.12 },
  { order: 12, title: 'Tripwire', size: [7, 7], receivers: [6, 10], moves: [28, 46], seed: 212, difficulty: 7, networks: ['cyan', 'cyan', 'cyan'], cross: true },
  { order: 13, title: 'Overpass', size: [7, 8], receivers: [7, 11], moves: [30, 48], seed: 213, difficulty: 7, networks: TWO, cross: true },
  { order: 14, title: 'Service Tunnel', size: [7, 8], receivers: [7, 11], moves: [32, 50], seed: 214, difficulty: 8, networks: TWO, cross: true, obstacles: 0.12 },
  { order: 15, title: 'Cascade', size: [7, 8], receivers: [7, 12], moves: [34, 52], seed: 215, difficulty: 8, networks: ['cyan', 'cyan', 'cyan'], cross: true },
  { order: 16, title: 'Backbone', size: [7, 8], receivers: [8, 12], moves: [34, 54], seed: 216, difficulty: 8, networks: TWO, cross: true },
  { order: 17, title: 'Redundancy', size: [7, 9], receivers: [8, 13], moves: [36, 56], seed: 217, difficulty: 9, networks: TWO, cross: true },
  { order: 18, title: 'Brownout', size: [7, 9], receivers: [8, 13], moves: [38, 58], seed: 218, difficulty: 9, networks: ['cyan', 'cyan', 'cyan'], cross: true, obstacles: 0.1 },
  { order: 19, title: 'Peak Demand', size: [7, 9], receivers: [9, 14], moves: [40, 62], seed: 219, difficulty: 9, networks: TWO, cross: true },
  { order: 20, title: 'Blackstart', size: [7, 9], receivers: [9, 15], moves: [42, 66], seed: 220, difficulty: 10, networks: ['cyan', 'cyan', 'cyan'], cross: true },
]);

/** Chapter 3 "Spectrum": coloured signals; mixing colours shorts a network. */
export const CHAPTER3_PLAN: readonly LevelPlan[] = plan('ch3', [
  { order: 1, title: 'Two Tones', size: [4, 4], receivers: [2, 4], moves: [5, 14], seed: 301, difficulty: 3, networks: DUO },
  { order: 2, title: 'Keep Apart', size: [4, 5], receivers: [2, 4], moves: [6, 16], seed: 302, difficulty: 4, networks: DUO },
  { order: 3, title: 'Violet Hour', size: [5, 5], receivers: [3, 5], moves: [10, 20], seed: 303, difficulty: 4, networks: DUO },
  { order: 4, title: 'Insulation', size: [5, 5], receivers: [3, 5], moves: [12, 22], seed: 304, difficulty: 5, networks: DUO },
  { order: 5, title: 'Neutral Ground', size: [5, 6], receivers: [3, 6], moves: [14, 26], seed: 305, difficulty: 5, networks: DUO, anyReceivers: 0.3 },
  { order: 6, title: 'Interleave', size: [5, 6], receivers: [4, 6], moves: [14, 28], seed: 306, difficulty: 5, networks: DUO, anyReceivers: 0.2 },
  { order: 7, title: 'Crosstalk', size: [6, 6], receivers: [4, 7], moves: [16, 30], seed: 307, difficulty: 6, networks: DUO, cross: true },
  { order: 8, title: 'Prism', size: [6, 6], receivers: [4, 7], moves: [18, 32], seed: 308, difficulty: 6, networks: DUO, cross: true, anyReceivers: 0.2 },
  { order: 9, title: 'Phase Shift', size: [6, 7], receivers: [5, 8], moves: [20, 36], seed: 309, difficulty: 6, networks: DUO, cross: true },
  { order: 10, title: 'Spectrum', size: [6, 7], receivers: [5, 8], moves: [22, 38], seed: 310, difficulty: 7, networks: TRIO, cross: true, anyReceivers: 0.15 },
  { order: 11, title: 'Polarity', size: [6, 7], receivers: [5, 9], moves: [24, 40], seed: 311, difficulty: 7, networks: DUO, cross: true },
  { order: 12, title: 'Dual Rail', size: [7, 7], receivers: [6, 9], moves: [26, 42], seed: 312, difficulty: 7, networks: DUO, cross: true, anyReceivers: 0.2 },
  { order: 13, title: 'Chromatic', size: [7, 7], receivers: [6, 10], moves: [28, 44], seed: 313, difficulty: 8, networks: TRIO, cross: true },
  { order: 14, title: 'Shielding', size: [7, 8], receivers: [6, 10], moves: [28, 46], seed: 314, difficulty: 8, networks: DUO, cross: true, obstacles: 0.12 },
  { order: 15, title: 'Wavelength', size: [7, 8], receivers: [7, 11], moves: [30, 48], seed: 315, difficulty: 8, networks: TRIO, cross: true, anyReceivers: 0.15 },
  { order: 16, title: 'Interference', size: [7, 8], receivers: [7, 12], moves: [32, 52], seed: 316, difficulty: 8, networks: ['cyan', 'violet', 'violet'], cross: true },
  { order: 17, title: 'Refraction', size: [7, 9], receivers: [8, 12], moves: [34, 54], seed: 317, difficulty: 9, networks: TRIO, cross: true, anyReceivers: 0.2 },
  { order: 18, title: 'Full Spectrum', size: [7, 9], receivers: [8, 13], moves: [36, 58], seed: 318, difficulty: 9, networks: ['cyan', 'violet', 'cyan', 'violet'], cross: true },
  { order: 19, title: 'Dark Matter', size: [7, 9], receivers: [8, 14], moves: [38, 62], seed: 319, difficulty: 9, networks: ['cyan', 'violet', 'cyan', 'violet'], cross: true, anyReceivers: 0.15 },
  { order: 20, title: 'Singularity', size: [7, 9], receivers: [9, 15], moves: [40, 66], seed: 320, difficulty: 10, networks: ['cyan', 'violet', 'cyan', 'violet'], cross: true, anyReceivers: 0.2 },
]);
