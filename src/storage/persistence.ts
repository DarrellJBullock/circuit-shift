import { type GameState, snapshotGame } from '@/engine';
import { levelFingerprint } from '@/levels/fingerprint';
import type { Level } from '@/levels/schema';
import { useGame } from '@/state/gameStore';
import { useProgress } from '@/state/progressStore';
import { useSession } from '@/state/sessionStore';
import { type Settings, useSettings } from '@/state/settingsStore';

import { migrate } from './migrations';
import {
  clearSession,
  loadProgress,
  loadSession,
  loadSettings,
  saveLevelResult,
  saveSession,
  saveSettings,
} from './repositories';
import type { SqlDatabase } from './sql';

export interface PersistenceOptions {
  readonly now?: () => number;
  /** Delay before writing a mid-game session after a move. */
  readonly sessionDebounceMs?: number;
  readonly onError?: (error: unknown) => void;
}

export interface Persistence {
  /** Write the in-progress game immediately (call when the app backgrounds). */
  flush(): Promise<void>;
  /** Resolves when every queued write has finished. */
  idle(): Promise<void>;
  dispose(): void;
}

/**
 * Migrates the database, loads stores from it, then keeps it in sync:
 * - settings and level results are written whenever they change;
 * - the in-progress game is saved (debounced) after moves, immediately on
 *   flush() and when the player leaves a level, and cleared on completion.
 * Writes are serialized through one queue. Failures are reported, never thrown
 * into the UI; the game keeps working from memory.
 */
export async function initPersistence(db: SqlDatabase, options: PersistenceOptions = {}): Promise<Persistence> {
  const now = options.now ?? Date.now;
  const debounceMs = options.sessionDebounceMs ?? 800;
  const onError = options.onError ?? ((e) => console.warn('[persistence]', e));

  await migrate(db);
  const [results, settings, saved] = await Promise.all([loadProgress(db), loadSettings(db), loadSession(db)]);
  useProgress.setState({ results });
  useSettings.setState(settings);
  useSession.getState().setSaved(saved);

  let queue: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    queue = queue.then(task).catch(onError);
    return queue;
  };

  const writeSession = (level: Level, game: GameState) => {
    if (game.status === 'won') return;
    if (game.history.length === 0) {
      // Nothing to resume; drop any stale slot for this level.
      if (useSession.getState().saved?.levelId === level.id) {
        useSession.getState().setSaved(null);
        return enqueue(() => clearSession(db));
      }
      return;
    }
    const fingerprint = levelFingerprint(level);
    const snapshot = snapshotGame(game);
    const at = now();
    useSession.getState().setSaved({ levelId: level.id, fingerprint, snapshot, updatedAt: at });
    return enqueue(() => saveSession(db, level.id, fingerprint, snapshot, at));
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancelTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const unsubscribers = [
    useSettings.subscribe((s, prev) => {
      const pick = (x: Settings): Settings => ({
        hapticsEnabled: x.hapticsEnabled,
        soundEnabled: x.soundEnabled,
        motion: x.motion,
      });
      const a = pick(s);
      const b = pick(prev);
      if (a.hapticsEnabled !== b.hapticsEnabled || a.soundEnabled !== b.soundEnabled || a.motion !== b.motion) {
        void enqueue(() => saveSettings(db, a));
      }
    }),

    useProgress.subscribe((s, prev) => {
      for (const [id, result] of Object.entries(s.results)) {
        if (prev.results[id] !== result) void enqueue(() => saveLevelResult(db, result, now()));
      }
    }),

    useGame.subscribe((s, prev) => {
      const { game, level } = s;
      // Level finished: the interrupted-session slot is no longer needed.
      if (game?.status === 'won' && prev.game?.status !== 'won') {
        cancelTimer();
        useSession.getState().setSaved(null);
        void enqueue(() => clearSession(db));
        return;
      }
      // Player left the level (or switched levels) mid-game: save immediately.
      if (prev.game && prev.level && (game === null || level?.id !== prev.level.id)) {
        cancelTimer();
        void writeSession(prev.level, prev.game);
        return;
      }
      if (game && level && game !== prev.game && game.board !== prev.game?.board) {
        cancelTimer();
        timer = setTimeout(() => {
          timer = null;
          const cur = useGame.getState();
          if (cur.game && cur.level) void writeSession(cur.level, cur.game);
        }, debounceMs);
      }
    }),
  ];

  return {
    flush: async () => {
      cancelTimer();
      const { game, level } = useGame.getState();
      if (game && level) await writeSession(level, game);
      await queue;
    },
    idle: () => queue,
    dispose: () => {
      cancelTimer();
      unsubscribers.forEach((u) => u());
    },
  };
}
