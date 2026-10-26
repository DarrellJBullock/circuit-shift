import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { getLevel } from '@/levels/registry';
import { tilesToGuide, tutorialStepFor } from '@/play/tutorial';
import { useGame } from '@/state/gameStore';
import { useSettings } from '@/state/settingsStore';

jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual('react-native');
  return { Canvas: View, useClock: () => ({ value: 0 }) };
});
jest.mock('@/render/TileNode', () => ({ TileNode: () => null }));
jest.mock('@/render/CompletionBurst', () => ({ CompletionBurst: () => null }));
// A brand-new player: empty database, tutorial pending.
jest.mock('@/storage/expoDatabase', () => {
  const { openNodeDatabase } = jest.requireActual('../../../test/sqlite/nodeDatabase');
  const db = openNodeDatabase();
  return { openExpoDatabase: async () => db };
});

const APP_DIR = './src/app';

async function tap(x: number, y: number) {
  await fireEvent(screen.getByTestId(`tile-${x}-${y}`), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
}

async function openFromHome() {
  await renderRouter(APP_DIR, { initialUrl: '/' });
  await fireEvent.press(await screen.findByTestId('home-play'));
  await screen.findByText('Wake Up');
  await fireEvent.layout(screen.getByTestId('board-area'), { width: 390, height: 520 });
  await screen.findByTestId('tile-0-0');
}

describe('tutorial logic', () => {
  it('shows steps only while pending, for the tutorial levels', () => {
    expect(tutorialStepFor('ch1-01', 'pending')?.title).toBe('Route the power');
    expect(tutorialStepFor('ch1-01', 'skipped')).toBeNull();
    expect(tutorialStepFor('ch1-04', 'pending')).toBeNull();
  });

  it('guides exactly the tiles that still need rotating', () => {
    useGame.getState().start('ch1-02');
    const level = getLevel('ch1-02')!;
    expect(tilesToGuide(level, useGame.getState().game!).sort()).toEqual([1, 4]);
    useGame.getState().clear();
  });
});

describe('first launch', () => {
  it('a new player reaches a playable, coached level from Home in one tap', async () => {
    const t0 = Date.now();
    await openFromHome();
    expect(screen.getByTestId('coach-mark')).toBeTruthy();
    expect(screen.getByText('Route the power')).toBeTruthy();
    expect(Date.now() - t0).toBeLessThan(20_000); // acceptance: start a level in < 20 s
  });

  it('can skip the tutorial, which hides tips and persists', async () => {
    await openFromHome();
    await fireEvent.press(screen.getByTestId('skip-tutorial'));
    await waitFor(() => expect(screen.queryByTestId('coach-mark')).toBeNull());
    expect(useSettings.getState().tutorial).toBe('skipped');
    // Gameplay continues normally after skipping.
    await tap(1, 1);
    expect(useGame.getState().game!.status).toBe('won');
  });
});
