import type { GameSnapshot } from '@/engine';

import { openNodeDatabase } from '../../../test/sqlite/nodeDatabase';
import { migrate } from '../migrations';
import {
  clearSession,
  loadProgress,
  loadSession,
  loadSettings,
  saveLevelResult,
  saveSession,
  saveSettings,
} from '../repositories';

async function freshDb() {
  const db = openNodeDatabase();
  await migrate(db);
  return db;
}

const snapshot: GameSnapshot = { rotations: [1, 0], moves: 1, history: [], hintsUsed: 0, elapsedMs: 500 };

describe('progress repository', () => {
  it('round-trips level results and counts completions', async () => {
    const db = await freshDb();
    const r = { levelId: 'ch1-01', completed: true, bestStars: 2 as const, bestMoves: 11, bestTimeMs: 4200.7 };
    await saveLevelResult(db, r, 1);
    await saveLevelResult(db, { ...r, bestStars: 3, bestMoves: 9 }, 2);
    expect(await loadProgress(db)).toEqual({
      'ch1-01': { levelId: 'ch1-01', completed: true, bestStars: 3, bestMoves: 9, bestTimeMs: 4201 },
    });
    expect(await db.first('SELECT completions FROM level_progress')).toEqual({ completions: 2 });
  });

  it('sanitizes corrupt rows instead of throwing', async () => {
    const db = await freshDb();
    await db.run(
      "INSERT INTO level_progress (level_id, completed, best_stars, best_moves, best_time_ms, updated_at) VALUES ('x', 1, 9, -4, 'abc', 0)",
    );
    await db.run("INSERT INTO level_progress (level_id, completed, best_stars, updated_at) VALUES ('', 1, 3, 0)");
    expect(await loadProgress(db)).toEqual({
      x: { levelId: 'x', completed: true, bestStars: 0, bestMoves: null, bestTimeMs: null },
    });
  });
});

describe('settings repository', () => {
  it('returns defaults when empty and round-trips changes', async () => {
    const db = await freshDb();
    expect(await loadSettings(db)).toEqual({ hapticsEnabled: true, soundEnabled: true, motion: 'system', tutorial: 'pending', analyticsEnabled: false });
    await saveSettings(db, { hapticsEnabled: false, soundEnabled: true, motion: 'reduced', tutorial: 'skipped', analyticsEnabled: false });
    expect(await loadSettings(db)).toEqual({ hapticsEnabled: false, soundEnabled: true, motion: 'reduced', tutorial: 'skipped', analyticsEnabled: false });
  });

  it('ignores invalid stored values', async () => {
    const db = await freshDb();
    await db.run("INSERT INTO settings (key, value) VALUES ('motion', 'sideways'), ('hapticsEnabled', 'maybe')");
    expect(await loadSettings(db)).toMatchObject({ motion: 'system', hapticsEnabled: true });
  });
});

describe('session repository', () => {
  it('saves, overwrites and clears the single resume slot', async () => {
    const db = await freshDb();
    expect(await loadSession(db)).toBeNull();
    await saveSession(db, 'ch1-01', 'abc', snapshot, 10);
    await saveSession(db, 'ch1-02', 'def', snapshot, 20);
    expect(await loadSession(db)).toEqual({ levelId: 'ch1-02', fingerprint: 'def', snapshot, updatedAt: 20 });
    await clearSession(db);
    expect(await loadSession(db)).toBeNull();
  });

  it('treats unparseable snapshots as no session', async () => {
    const db = await freshDb();
    await db.run(
      "INSERT INTO sessions (slot, level_id, level_fingerprint, snapshot, updated_at) VALUES ('current', 'ch1-01', 'abc', '{broken', 0)",
    );
    expect(await loadSession(db)).toBeNull();
  });
});
