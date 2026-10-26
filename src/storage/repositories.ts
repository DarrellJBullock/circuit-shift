import type { GameSnapshot, Stars } from '@/engine';
import type { LevelResult } from '@/state/progressStore';
import { DEFAULT_SETTINGS, type MotionPreference, type Settings, type TutorialState } from '@/state/settingsStore';

import type { SqlDatabase } from './sql';

/*
 * Repositories translate between rows and app types. Everything read from
 * disk is treated as untrusted: invalid rows are skipped, never thrown.
 */

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const asStars = (v: unknown): Stars => (isInt(v) && v >= 0 && v <= 3 ? (v as Stars) : 0);
const asNullableInt = (v: unknown): number | null => (isInt(v) && v >= 0 ? v : null);

// ---------------------------------------------------------------- progress

interface ProgressRow {
  level_id: unknown;
  completed: unknown;
  best_stars: unknown;
  best_moves: unknown;
  best_time_ms: unknown;
}

export async function loadProgress(db: SqlDatabase): Promise<Record<string, LevelResult>> {
  const rows = await db.all<ProgressRow>(
    'SELECT level_id, completed, best_stars, best_moves, best_time_ms FROM level_progress',
  );
  const out: Record<string, LevelResult> = {};
  for (const r of rows) {
    if (typeof r.level_id !== 'string' || !r.level_id) continue;
    out[r.level_id] = {
      levelId: r.level_id,
      completed: r.completed === 1,
      bestStars: asStars(r.best_stars),
      bestMoves: asNullableInt(r.best_moves),
      bestTimeMs: asNullableInt(r.best_time_ms),
    };
  }
  return out;
}

export async function saveLevelResult(db: SqlDatabase, result: LevelResult, now: number): Promise<void> {
  await db.run(
    `INSERT INTO level_progress (level_id, completed, best_stars, best_moves, best_time_ms, completions, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(level_id) DO UPDATE SET
       completed    = excluded.completed,
       best_stars   = excluded.best_stars,
       best_moves   = excluded.best_moves,
       best_time_ms = excluded.best_time_ms,
       completions  = level_progress.completions + 1,
       updated_at   = excluded.updated_at`,
    [
      result.levelId,
      result.completed ? 1 : 0,
      result.bestStars,
      result.bestMoves,
      result.bestTimeMs === null ? null : Math.round(result.bestTimeMs),
      now,
    ],
  );
}

// ---------------------------------------------------------------- daily challenges

interface DailyRow {
  date: unknown;
  completed: unknown;
  best_stars: unknown;
  best_moves: unknown;
  best_time_ms: unknown;
}

/** Daily results keyed by level id (`daily-YYYY-MM-DD`), same shape as campaign results. */
export async function loadDailyResults(db: SqlDatabase): Promise<Record<string, LevelResult>> {
  const rows = await db.all<DailyRow>('SELECT date, completed, best_stars, best_moves, best_time_ms FROM daily_challenges');
  const out: Record<string, LevelResult> = {};
  for (const r of rows) {
    if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    const levelId = `daily-${r.date}`;
    out[levelId] = {
      levelId,
      completed: r.completed === 1,
      bestStars: asStars(r.best_stars),
      bestMoves: asNullableInt(r.best_moves),
      bestTimeMs: asNullableInt(r.best_time_ms),
    };
  }
  return out;
}

/** Records the generator version and seed with the result, so history stays auditable. */
export async function saveDailyResult(
  db: SqlDatabase,
  date: string,
  generatorVersion: string,
  seed: number,
  result: LevelResult,
  now: number,
): Promise<void> {
  await db.run(
    `INSERT INTO daily_challenges (date, generator_version, seed, completed, best_stars, best_moves, best_time_ms, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET completed = excluded.completed, best_stars = excluded.best_stars,
       best_moves = excluded.best_moves, best_time_ms = excluded.best_time_ms, updated_at = excluded.updated_at`,
    [
      date,
      generatorVersion,
      seed,
      result.completed ? 1 : 0,
      result.bestStars,
      result.bestMoves,
      result.bestTimeMs === null ? null : Math.round(result.bestTimeMs),
      now,
    ],
  );
}

// ---------------------------------------------------------------- settings

const MOTION: readonly MotionPreference[] = ['system', 'reduced', 'full'];
const TUTORIAL: readonly TutorialState[] = ['pending', 'done', 'skipped'];

export async function loadSettings(db: SqlDatabase): Promise<Settings> {
  const rows = await db.all<{ key: unknown; value: unknown }>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const bool = (key: keyof Settings, fallback: boolean): boolean => {
    const v = map.get(key);
    return v === 'true' ? true : v === 'false' ? false : fallback;
  };
  const pick = <T extends string>(key: keyof Settings, allowed: readonly T[], fallback: T): T => {
    const v = map.get(key);
    return allowed.includes(v as T) ? (v as T) : fallback;
  };
  return {
    hapticsEnabled: bool('hapticsEnabled', DEFAULT_SETTINGS.hapticsEnabled),
    soundEnabled: bool('soundEnabled', DEFAULT_SETTINGS.soundEnabled),
    motion: pick('motion', MOTION, DEFAULT_SETTINGS.motion),
    tutorial: pick('tutorial', TUTORIAL, DEFAULT_SETTINGS.tutorial),
    analyticsEnabled: bool('analyticsEnabled', DEFAULT_SETTINGS.analyticsEnabled),
  };
}

export async function saveSettings(db: SqlDatabase, settings: Settings): Promise<void> {
  await db.transaction(async () => {
    for (const [key, value] of Object.entries(settings)) {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, String(value)],
      );
    }
  });
}

// ---------------------------------------------------------------- sessions

/** A single "resume where I left off" slot. */
export const SESSION_SLOT = 'current';

export interface SavedSession {
  readonly levelId: string;
  readonly fingerprint: string;
  /** Parsed JSON; validated by `restoreGame` before use. */
  readonly snapshot: unknown;
  readonly updatedAt: number;
}

export async function loadSession(db: SqlDatabase): Promise<SavedSession | null> {
  const row = await db.first<{ level_id: unknown; level_fingerprint: unknown; snapshot: unknown; updated_at: unknown }>(
    'SELECT level_id, level_fingerprint, snapshot, updated_at FROM sessions WHERE slot = ?',
    [SESSION_SLOT],
  );
  if (!row || typeof row.level_id !== 'string' || typeof row.level_fingerprint !== 'string') return null;
  if (typeof row.snapshot !== 'string') return null;
  let snapshot: unknown;
  try {
    snapshot = JSON.parse(row.snapshot);
  } catch {
    return null;
  }
  return {
    levelId: row.level_id,
    fingerprint: row.level_fingerprint,
    snapshot,
    updatedAt: isInt(row.updated_at) ? row.updated_at : 0,
  };
}

export async function saveSession(
  db: SqlDatabase,
  levelId: string,
  fingerprint: string,
  snapshot: GameSnapshot,
  now: number,
): Promise<void> {
  await db.run(
    `INSERT INTO sessions (slot, level_id, level_fingerprint, snapshot, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(slot) DO UPDATE SET level_id = excluded.level_id, level_fingerprint = excluded.level_fingerprint,
       snapshot = excluded.snapshot, updated_at = excluded.updated_at`,
    [SESSION_SLOT, levelId, fingerprint, JSON.stringify(snapshot), now],
  );
}

export async function clearSession(db: SqlDatabase): Promise<void> {
  await db.run('DELETE FROM sessions WHERE slot = ?', [SESSION_SLOT]);
}
