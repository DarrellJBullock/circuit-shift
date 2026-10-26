import { create } from 'zustand';

import { type GameAction, type GameState, type Stars, computeStars, createGame, gameReducer } from '@/engine';
import { getLevel } from '@/levels/registry';
import type { Level } from '@/levels/schema';
import { levelToPuzzle } from '@/levels/validate';

import { useProgress } from './progressStore';

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
  /** Starts (or restarts) a level. Returns false for unknown ids. */
  start(levelId: string): boolean;
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

  start: (levelId) => {
    const level = getLevel(levelId);
    if (!level) {
      set({ level: null, game: null, completion: null });
      return false;
    }
    set({ level, game: createGame(levelToPuzzle(level)), completion: null });
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

  clear: () => set({ level: null, game: null, completion: null }),
}));
