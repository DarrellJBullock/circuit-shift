import { create } from 'zustand';

import {
  type GameAction,
  type GameState,
  type Stars,
  computeStars,
  createGame,
  gameReducer,
  nextHint,
  restoreGame,
} from '@/engine';
import { levelFingerprint } from '@/levels/fingerprint';
import { getLevel } from '@/levels/registry';
import type { Level } from '@/levels/schema';
import { levelToPuzzle } from '@/levels/validate';
import { HINT_SOLVER_LIMITS, hintsRemaining } from '@/play/hintPolicy';
import type { RewardOutcome } from '@/services/ads/rewardFlow';
import type { HintSource } from '@/services/analytics/events';

import { hasEntitlement } from './entitlementStore';

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
  /** Last hinted tile; `nonce` changes on every hint so the board can flash it. */
  readonly lastHint: { readonly index: number; readonly nonce: number } | null;
  readonly lastHintSource: HintSource | null;
  /**
   * Starts a level, resuming its interrupted session when one matches (same
   * level id and layout fingerprint). `fresh` forces a clean start.
   * Returns false for unknown ids.
   */
  start(levelId: string, options?: { fresh?: boolean }): boolean;
  dispatch(action: GameAction): void;
  /**
   * Applies the next solver step from the current board. Returns the hinted
   * tile index, or null when no hint is available (none left, not playing,
   * or the solver could not verify a solution in budget).
   */
  requestHint(): number | null;
  /**
   * Applies a hint paid for with a rewarded ad. Grants nothing unless the ad
   * SDK confirmed the reward (`outcome.kind === 'rewarded'`).
   */
  requestRewardedHint(outcome: RewardOutcome): number | null;
  clear(): void;
}

export function referenceMoves(level: Level): number {
  return level.optimalMoves ?? level.solutionMetadata.parMoves;
}

export const useGame = create<GameStore>((set, get) => {
  const applyHintStep = (source: HintSource): number | null => {
    const { game } = get();
    if (!game || game.status !== 'playing') return null;
    const hint = nextHint(game.puzzle, game.board, HINT_SOLVER_LIMITS);
    if (!hint) return null;
    // Source and highlight are set first so subscribers see them with the move.
    set({ lastHintSource: source, lastHint: { index: hint.index, nonce: (get().lastHint?.nonce ?? 0) + 1 } });
    get().dispatch({ type: 'applyHint', index: hint.index, rotation: hint.rotation });
    return hint.index;
  };

  return {
    level: null,
    game: null,
    completion: null,
    resumed: false,
    lastHint: null,
    lastHintSource: null,

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
      set({ level, game, completion: null, resumed: game === restored, lastHint: null, lastHintSource: null });
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

    requestHint: () => {
      const { game } = get();
      if (!game) return null;
      if (hintsRemaining(game.hintsUsed) > 0) return applyHintStep('free');
      if (hasEntitlement('no_ads')) return applyHintStep('entitlement');
      return null;
    },

    requestRewardedHint: (outcome) => {
      if (outcome.kind !== 'rewarded') return null;
      return applyHintStep('rewarded');
    },

    clear: () => set({ level: null, game: null, completion: null, resumed: false, lastHint: null, lastHintSource: null }),
  };
});
