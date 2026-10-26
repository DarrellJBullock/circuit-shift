import type {
  LevelConstraints,
  ReceiverObjective,
  Rotation,
  Tile,
} from '@/engine';

/** Campaign chapters, plus 'daily' for generated daily challenges (not listed as a chapter). */
export type ChapterId = 'ch1' | 'ch2' | 'ch3' | 'daily';

/** Difficulty 1 (introductory) … 10 (hardest in the MVP). */
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface SolutionMetadata {
  /** A verified solved orientation for every tile, reachable from the start. */
  readonly rotations: readonly Rotation[];
  /** Length of that verified solution. Used as the star reference. */
  readonly parMoves: number;
  /** 'proven' only if an exhaustive search established parMoves is minimal. */
  readonly optimality: 'proven' | 'upperBound';
  readonly solverVersion: string;
}

export interface Level {
  readonly id: string;
  readonly chapterId: ChapterId;
  /** 1-based order within the chapter. */
  readonly order: number;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  /** Row-major, length width × height. Rotations are the scrambled start. */
  readonly tiles: readonly Tile[];
  readonly sourceIds: readonly string[];
  readonly receiverObjectives: readonly ReceiverObjective[];
  readonly constraints: LevelConstraints;
  readonly difficulty: Difficulty;
  /** Set only when optimality is proven; otherwise null. */
  readonly optimalMoves: number | null;
  /** 'handcrafted' or a generator version such as 'gen-1'. */
  readonly generatorVersion: string;
  readonly seed: number | null;
  readonly solutionMetadata: SolutionMetadata;
}

export interface Chapter {
  readonly id: ChapterId;
  readonly order: number;
  readonly title: string;
  readonly subtitle: string;
  readonly premium: boolean;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };
