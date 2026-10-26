import { getLevel } from '@/levels/registry';
import { levelFingerprint } from '@/levels/fingerprint';
import { useGame } from '@/state/gameStore';
import { useProgress } from '@/state/progressStore';
import { useSession } from '@/state/sessionStore';
import { DEFAULT_SETTINGS, useSettings } from '@/state/settingsStore';

import { openNodeDatabase } from '../../../test/sqlite/nodeDatabase';
import { type Persistence, initPersistence } from '../persistence';
import { loadProgress, loadSession, loadSettings, saveSession } from '../repositories';

const level = getLevel('ch1-03')!;

function resetStores() {
  useGame.getState().clear();
  useProgress.setState({ results: {} });
  useSession.setState({ saved: null });
  useSettings.setState(DEFAULT_SETTINGS);
}

let active: Persistence | null = null;
async function boot(db: ReturnType<typeof openNodeDatabase>) {
  active?.dispose();
  resetStores();
  active = await initPersistence(db, { sessionDebounceMs: 0, onError: (e) => { throw e; } });
  return active;
}

/** Wait for the debounce timer and the write queue. */
async function settle(p: Persistence) {
  await new Promise((r) => setTimeout(r, 5));
  await p.idle();
}

afterEach(() => {
  active?.dispose();
  active = null;
  resetStores();
});

describe('persistence', () => {
  it('hydrates stores from the database on boot', async () => {
    const db = openNodeDatabase();
    const p1 = await boot(db);
    useSettings.getState().update({ hapticsEnabled: false });
    useProgress.getState().recordCompletion({ levelId: level.id, stars: 2, moves: 12, timeMs: 3000 });
    await p1.idle();

    await boot(db); // simulated app restart
    expect(useSettings.getState().hapticsEnabled).toBe(false);
    expect(useProgress.getState().results[level.id]).toMatchObject({ completed: true, bestStars: 2 });
  });

  it('resumes an interrupted game after a restart', async () => {
    const db = openNodeDatabase();
    const p = await boot(db);
    useGame.getState().start(level.id);
    useGame.getState().dispatch({ type: 'rotate', index: 1 });
    useGame.getState().dispatch({ type: 'rotate', index: 2 });
    useGame.getState().dispatch({ type: 'tick', deltaMs: 4000 });
    await p.flush(); // app goes to background
    const before = useGame.getState().game!;

    await boot(db); // app killed and relaunched
    expect(useSession.getState().saved?.levelId).toBe(level.id);
    useGame.getState().start(level.id);
    const after = useGame.getState();
    expect(after.resumed).toBe(true);
    expect(after.game!.moves).toBe(2);
    expect(after.game!.elapsedMs).toBe(4000);
    expect(after.game!.board.tiles.map((t) => t.rotation)).toEqual(before.board.tiles.map((t) => t.rotation));
    // Undo history survives too.
    useGame.getState().dispatch({ type: 'undo' });
    expect(useGame.getState().game!.moves).toBe(1);
  });

  it('saves the session when the player leaves a level mid-game', async () => {
    const db = openNodeDatabase();
    const p = await boot(db);
    useGame.getState().start(level.id);
    useGame.getState().dispatch({ type: 'rotate', index: 1 });
    useGame.getState().clear(); // play screen unmounted
    await p.idle();
    expect((await loadSession(db))?.levelId).toBe(level.id);
  });

  it('writes a debounced session after moves', async () => {
    const db = openNodeDatabase();
    const p = await boot(db);
    useGame.getState().start(level.id);
    useGame.getState().dispatch({ type: 'rotate', index: 1 });
    await settle(p);
    expect(await loadSession(db)).toMatchObject({ levelId: level.id, fingerprint: levelFingerprint(level) });
  });

  it('records the result and clears the session on completion', async () => {
    const db = openNodeDatabase();
    const p = await boot(db);
    useGame.getState().start(level.id);
    useGame.getState().dispatch({ type: 'rotate', index: 1 });
    await settle(p);
    const sol = level.solutionMetadata.rotations;
    // Jump straight to the solution with hints (deterministic, small).
    level.tiles.forEach((t, i) => {
      if (!t.locked && t.baseMask !== 0) useGame.getState().dispatch({ type: 'applyHint', index: i, rotation: sol[i]! });
    });
    expect(useGame.getState().game!.status).toBe('won');
    await settle(p);
    expect(await loadSession(db)).toBeNull();
    expect(useSession.getState().saved).toBeNull();
    expect((await loadProgress(db))[level.id]).toMatchObject({ completed: true });
  });

  it('starts fresh when asked, and the empty game clears the slot', async () => {
    const db = openNodeDatabase();
    const p = await boot(db);
    useGame.getState().start(level.id);
    useGame.getState().dispatch({ type: 'rotate', index: 1 });
    await p.flush();
    useGame.getState().start(level.id, { fresh: true });
    expect(useGame.getState().resumed).toBe(false);
    expect(useGame.getState().game!.moves).toBe(0);
    await settle(p);
    expect(await loadSession(db)).toBeNull();
  });

  it('discards a session whose level layout changed (fingerprint mismatch)', async () => {
    const db = openNodeDatabase();
    await boot(db);
    await saveSession(db, level.id, 'stale-fingerprint', { rotations: level.tiles.map(() => 0), moves: 3, history: [], hintsUsed: 0, elapsedMs: 0 }, 0);
    await boot(db);
    useGame.getState().start(level.id);
    expect(useGame.getState().resumed).toBe(false);
    expect(useGame.getState().game!.moves).toBe(0);
  });

  it('persists settings changes', async () => {
    const db = openNodeDatabase();
    const p = await boot(db);
    useSettings.getState().update({ motion: 'reduced' });
    await p.idle();
    expect((await loadSettings(db)).motion).toBe('reduced');
  });
});
