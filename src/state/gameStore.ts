import { create } from 'zustand';

import {
  type GameAction,
  type GameState,
  type Stars,
  computeStars,
  createGame,
  gameReducer,
  restoreGame,
} from '@/engine';
import { levelFingerprint } from '@/levels/fingerprint';
import { getLevel } from '@/levels/registry';
import type { Level } from '@/levels/schema';
import { levelToPuzzle } from '@/levels/validate';

import { useProgress } from './progressStore';
import { useSession } from './sessionStore';

export interface CompletionSummary {
  readonly stars: Stars;
  readonly moves: number;
  readonly timeMs: number;
  readonly newBest: boolean;
}

interface GameStore {
  readonly level: Level | null;
  readonly game: GameState | null;
  readonly completion: CompletionSummary | null;
  /** True when the current game was restored from an interrupted session. */
  readonly resumed: boolean;
  /**
   * Starts a level, resuming its interrupted session when one matches (same
   * level id and layout fingerprint). `fresh` forces a clean start.
   * Returns false for unknown ids.
   */
  start(levelId: string, options?: { fresh?: boolean }): boolean;
  dispatch(action: GameAction): void;
  clear(): void;
}

export function referenceMoves(level: Level): number {
  return level.optimalMoves ?? level.solutionMetadata.parMoves;
}

export const useGame = create<GameStore>((set, get) => ({
  level: null,
  game: null,
  completion: null,
  resumed: false,

  start: (levelId, options) => {
    const level = getLevel(levelId);
    if (!level) {
      set({ level: null, game: null, completion: null, resumed: false });
      return false;
    }
    const puzzle = levelToPuzzle(level);
    const saved = useSession.getState().saved;
    const restored =
      !options?.fresh && saved?.levelId === level.id && saved.fingerprint === levelFingerprint(level)
        ? restoreGame(puzzle, saved.snapshot)
        : null;
    // A restored game is never already won (snapshots are only kept mid-play).
    const game = restored && restored.status !== 'won' ? restored : createGame(puzzle);
    set({ level, game, completion: null, resumed: game === restored });
    return true;
  },

  dispatch: (action) => {
    const { game, level } = get();
    if (!game || !level) return;
    const next = gameReducer(game, action);
    if (next === game) return;

    if (next.status === 'won' && game.status !== 'won') {
      const stars = computeStars({
        completed: true,
        moves: next.moves,
        referenceMoves: referenceMoves(level),
        hintsUsed: next.hintsUsed,
      });
      const before = useProgress.getState().results[level.id]?.bestStars ?? 0;
      useProgress.getState().recordCompletion({
        levelId: level.id,
        stars,
        moves: next.moves,
        timeMs: next.elapsedMs,
      });
      set({
        game: next,
        completion: { stars, moves: next.moves, timeMs: next.elapsedMs, newBest: stars > before },
      });
      return;
    }
    set({ game: next });
  },

  clear: () => set({ level: null, game: null, completion: null, resumed: false }),
}));
