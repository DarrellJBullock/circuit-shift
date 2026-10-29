import { AppState, type AppStateStatus } from 'react-native';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { tapDistance } from '@/engine';
import { getLevel } from '@/levels/registry';
import * as links from '@/services/links';
import { useGame } from '@/state/gameStore';
import { useProgress } from '@/state/progressStore';
import { useSession } from '@/state/sessionStore';

// Skia needs a native canvas; the board's Skia layer is replaced by a stub.
// The accessible hit grid (real React Native) is what the player taps.
jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual('react-native');
  return { Canvas: View, useClock: () => ({ value: 0 }) };
});
jest.mock('@/render/TileNode', () => ({ TileNode: () => null }));
jest.mock('@/render/CompletionBurst', () => ({ CompletionBurst: () => null }));
// Real persistence, backed by an in-memory node:sqlite database per test file.
// The player has skipped the tutorial, so levels 1-1…1-4 are open (1-5+ stay locked).
jest.mock('@/storage/expoDatabase', () => {
  const { openNodeDatabase } = jest.requireActual('../../../test/sqlite/nodeDatabase');
  const { migrate } = jest.requireActual('@/storage/migrations');
  const { saveSettings } = jest.requireActual('@/storage/repositories');
  const { DEFAULT_SETTINGS } = jest.requireActual('@/state/settingsStore');
  const db = openNodeDatabase();
  let seeded: Promise<void> | null = null;
  return {
    openExpoDatabase: async () => {
      seeded ??= migrate(db).then(() => saveSettings(db, { ...DEFAULT_SETTINGS, tutorial: 'skipped' }));
      await seeded;
      return db;
    },
  };
});

// One AppState spy for the whole file, so unmount cleanup always has a subscription.
const appStateListeners = new Set<(s: AppStateStatus) => void>();
jest.spyOn(AppState, 'addEventListener').mockImplementation((_, fn) => {
  const listener = fn as (s: AppStateStatus) => void;
  appStateListeners.add(listener);
  return { remove: () => appStateListeners.delete(listener) } as unknown as ReturnType<
    typeof AppState.addEventListener
  >;
});

const level = getLevel('ch1-03')!;
const APP_DIR = './src/app';

/** Rotate a tile the way VoiceOver (and these tests) do: the activate action. */
async function tapTile(x: number, y: number) {
  await fireEvent(screen.getByTestId(`tile-${x}-${y}`), 'accessibilityAction', {
    nativeEvent: { actionName: 'activate' },
  });
}

/** Tap every tile the minimum number of times to reach the stored solution. */
async function solveByTapping() {
  for (let i = 0; i < level.tiles.length; i++) {
    const t = level.tiles[i]!;
    if (t.locked || t.baseMask === 0) continue;
    const taps = tapDistance(t.baseMask, t.rotation, level.solutionMetadata.rotations[i]!);
    for (let k = 0; k < taps; k++) {
      await tapTile(i % level.width, Math.floor(i / level.width));
    }
  }
}

/** Open a level and give the board area a phone-sized layout (no layout pass in tests). */
async function openLevel() {
  await renderRouter(APP_DIR, { initialUrl: `/play/${level.id}` });
  await screen.findByText(level.title);
  await fireEvent.layout(screen.getByTestId('board-area'), { width: 390, height: 520 });
  await screen.findByTestId('tile-0-0');
}

beforeEach(() => {
  useProgress.setState({ results: {} });
  useSession.setState({ saved: null });
});

// Offline guarantee: any network request during gameplay fails the test.
const networkCalls: string[] = [];
beforeAll(() => {
  (globalThis as { fetch?: unknown }).fetch = jest.fn((url: unknown) => {
    networkCalls.push(String(url));
    throw new Error('network access attempted');
  });
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = jest.fn(() => {
    networkCalls.push('XMLHttpRequest');
    throw new Error('network access attempted');
  });
});
afterAll(() => {
  expect(networkCalls).toEqual([]);
});

describe('gameplay flow', () => {
  it('goes from Home to a playable level in one tap', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await fireEvent.press(screen.getByTestId('home-play'));
    const first = getLevel('ch1-01')!;
    expect(await screen.findByText(first.title)).toBeTruthy();
    expect(screen.getByText(`Optimal ${first.optimalMoves}`)).toBeTruthy();
  });

  it('counts moves, undoes them, and solves to a 3-star completion', async () => {
    await openLevel();

    await tapTile(1, 0);
    expect(useGame.getState().game!.moves).toBe(1);
    await fireEvent.press(screen.getByTestId('undo'));
    expect(useGame.getState().game!.moves).toBe(0);

    await solveByTapping();
    expect(await screen.findByTestId('completion')).toBeTruthy();
    expect(screen.getByLabelText('3 of 3 stars')).toBeTruthy();
    expect(useProgress.getState().results[level.id]).toMatchObject({ completed: true, bestStars: 3 });
    // The completion modal hides the board from VoiceOver, and board input is frozen.
    expect(screen.queryByTestId('tile-1-0')).toBeNull();
    const hiddenTile = screen.getByTestId('tile-1-0', { includeHiddenElements: true });
    expect(hiddenTile.props.accessibilityState.disabled).toBe(true);
  });

  it('lets the player undo an accidental reset', async () => {
    await openLevel();
    await tapTile(1, 0);
    await tapTile(2, 0);
    await fireEvent.press(screen.getByTestId('reset'));
    expect(useGame.getState().game!.moves).toBe(0);
    await fireEvent.press(screen.getByTestId('undo'));
    expect(useGame.getState().game!.moves).toBe(2);
  });

  it('pauses from the button and resumes', async () => {
    await openLevel();
    await fireEvent.press(screen.getByTestId('pause-button'));
    expect(await screen.findByTestId('pause')).toBeTruthy();
    expect(useGame.getState().game!.status).toBe('paused');
    await fireEvent.press(screen.getByTestId('resume'));
    await waitFor(() => expect(useGame.getState().game!.status).toBe('playing'));
  });

  it('pauses automatically when the app leaves the foreground', async () => {
    await openLevel();
    appStateListeners.forEach((fn) => fn('background'));
    await waitFor(() => expect(useGame.getState().game!.status).toBe('paused'));
  });

  it('offers Continue for an interrupted level and resumes it', async () => {
    await openLevel();
    await tapTile(1, 0);
    await tapTile(2, 0);
    await fireEvent.press(screen.getByTestId('pause-button'));
    await fireEvent.press(await screen.findByText('Quit to levels'));
    await waitFor(() => expect(useSession.getState().saved?.levelId).toBe(level.id));

    await renderRouter(APP_DIR, { initialUrl: '/' });
    const cont = await screen.findByTestId('home-play');
    expect(cont.props.accessibilityLabel).toBe(`Continue · ${level.title}`);
    await fireEvent.press(cont);
    await screen.findByText(level.title);
    expect(useGame.getState().resumed).toBe(true);
    expect(useGame.getState().game!.moves).toBe(2);
  });

  it('offers three free hints, then an ad hint that grants nothing without a reward', async () => {
    await openLevel();
    const hint = () => screen.getByTestId('hint');
    expect(hint().props.accessibilityLabel).toBe('Hint · 3');
    await fireEvent.press(hint());
    expect(useGame.getState().game!.hintsUsed).toBe(1);
    await fireEvent.press(hint());
    await fireEvent.press(hint());
    expect(hint().props.accessibilityLabel).toBe('Hint · Ad');
    // Consent (mocked) does not allow ads: no reward, no hint, button disabled.
    await fireEvent.press(hint());
    expect(await screen.findByText('Ads are not available.')).toBeTruthy();
    expect(useGame.getState().game!.hintsUsed).toBe(3);
    expect(hint().props.accessibilityLabel).toBe('No hints');
    expect(hint().props.accessibilityState.disabled).toBe(true);
  });

  it('blocks a locked level opened by deep link', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/play/ch1-09' });
    expect(await screen.findByText('Level locked')).toBeTruthy();
    expect(useGame.getState().game).toBeNull();
  });

  it('shows a recoverable screen for an unknown level id', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/play/does-not-exist' });
    expect(await screen.findByText('Level not found')).toBeTruthy();
  });
});

describe('settings', () => {
  it('opens the published privacy policy', async () => {
    const open = jest.spyOn(links, 'openExternal').mockResolvedValue();
    await renderRouter(APP_DIR, { initialUrl: '/settings' });
    await fireEvent.press(await screen.findByTestId('settings-privacy-policy'));
    expect(open).toHaveBeenCalledWith(links.PRIVACY_POLICY_URL);
  });
});
