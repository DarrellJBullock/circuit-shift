import { dailyDateOf } from '@/levels/daily';
import { useGame } from '@/state/gameStore';
import { useSettings } from '@/state/settingsStore';

import { track } from './analytics';

const seconds = (ms: number) => Math.round(ms / 1000);

/**
 * Derives gameplay analytics events from store transitions, so game and UI
 * code never call analytics directly. Returns an unsubscribe function.
 */
export function initAnalyticsBridge(): () => void {
  const offGame = useGame.subscribe((s, prev) => {
    const { level, game } = s;

    const started = level && game && (prev.level?.id !== level.id || prev.game === null || game.puzzle !== prev.game.puzzle);
    const abandoned = prev.game && prev.level && prev.game.status !== 'won' && prev.game.moves > 0;
    if ((started || !game) && abandoned && prev.level!.id !== level?.id) {
      track('level_abandon', { level_id: prev.level!.id, moves: prev.game!.moves, duration_s: seconds(prev.game!.elapsedMs) });
    }
    if (!level || !game) return;

    if (started || (prev.game?.status === 'won' && game.status !== 'won')) {
      if (level.chapterId === 'daily') track('daily_start', { date: dailyDateOf(level.id) });
      else {
        track('level_start', { level_id: level.id, chapter_id: level.chapterId, resumed: s.resumed });
        if (level.id === 'ch1-01' && useSettings.getState().tutorial === 'pending') track('tutorial_start', {});
      }
      return;
    }
    if (!prev.game) return;

    if (game.hintsUsed > prev.game.hintsUsed && s.lastHintSource) {
      track('hint_used', { level_id: level.id, source: s.lastHintSource });
    }

    if (game.status === 'won' && prev.game.status !== 'won') {
      const stars = s.completion?.stars ?? 0;
      if (level.chapterId === 'daily') track('daily_complete', { date: dailyDateOf(level.id), stars, moves: game.moves });
      else {
        track('level_complete', {
          level_id: level.id,
          chapter_id: level.chapterId,
          moves: game.moves,
          optimal_moves: level.optimalMoves,
          stars,
          hints_used: game.hintsUsed,
          duration_s: seconds(game.elapsedMs),
        });
      }
    }
  });

  const offSettings = useSettings.subscribe((s, prev) => {
    if (prev.tutorial === 'pending' && s.tutorial !== 'pending') {
      track('tutorial_complete', { skipped: s.tutorial === 'skipped' });
    }
  });

  return () => {
    offGame();
    offSettings();
  };
}
