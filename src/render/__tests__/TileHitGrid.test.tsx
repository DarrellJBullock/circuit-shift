import { fireEvent, render, screen } from '@testing-library/react-native';

import { createGame, evaluatePuzzle, gameReducer } from '@/engine';
import { puzzle } from '@/engine/__tests__/helpers';

import { TileHitGrid } from '../TileHitGrid';
import { describeTile } from '../a11y';

const P = puzzle(['S1* I0 R3*']);
const CELL = 48;

function touch(identifier: number, x: number, y: number) {
  return { identifier, pageX: x, pageY: y };
}
function touchEvent(timestamp: number, ...changedTouches: ReturnType<typeof touch>[]) {
  return { nativeEvent: { timestamp, changedTouches } };
}

async function renderGrid(onPress = jest.fn(), disabled = false, game = createGame(P)) {
  await render(
    <TileHitGrid tiles={game.board.tiles} width={3} cell={CELL} evaluation={game.evaluation} disabled={disabled} onPress={onPress} />,
  );
  return onPress;
}

describe('TileHitGrid accessibility', () => {
  it('exposes one labelled button per rotatable cell with ≥44pt targets', async () => {
    await renderGrid();
    const mid = screen.getByTestId('tile-1-0');
    expect(mid.props.accessibilityRole).toBe('button');
    expect(mid.props.accessibilityLabel).toContain('Straight wire, open north and south');
    expect(mid.props.accessibilityHint).toBe('Double tap to rotate clockwise');
    expect(mid.props.accessibilityActions).toEqual([{ name: 'activate' }]);
    expect(mid.props.style).toMatchObject({ width: CELL, height: CELL });
    expect(screen.getByTestId('tile-0-0').props.accessibilityLabel).toContain('Locked');
  });

  it('rotates via the VoiceOver activate action', async () => {
    const onPress = await renderGrid();
    await fireEvent(screen.getByTestId('tile-1-0'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onPress).toHaveBeenCalledWith(1);
  });

  it('describes powered and satisfied state after solving', async () => {
    const solved = gameReducer(createGame(P), { type: 'rotate', index: 1 });
    await renderGrid(jest.fn(), true, solved);
    expect(screen.getByTestId('tile-1-0').props.accessibilityLabel).toContain('Powered cyan');
    expect(screen.getByTestId('tile-2-0').props.accessibilityLabel).toContain('Satisfied.');
  });
});

describe('TileHitGrid multi-touch input', () => {
  it('registers a simple tap on the touched cell', async () => {
    const onPress = await renderGrid();
    const grid = screen.getByTestId('tile-grid');
    await fireEvent(grid, 'touchStart', touchEvent(0, touch(1, 70, 20)));
    await fireEvent(grid, 'touchEnd', touchEvent(80, touch(1, 71, 21)));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(1);
  });

  it('registers two overlapping fingers as two taps (Pressable dropped the second)', async () => {
    const onPress = await renderGrid();
    const grid = screen.getByTestId('tile-grid');
    await fireEvent(grid, 'touchStart', touchEvent(0, touch(1, 70, 20)));
    await fireEvent(grid, 'touchStart', touchEvent(10, touch(2, 120, 20)));
    await fireEvent(grid, 'touchEnd', touchEvent(60, touch(1, 70, 20)));
    await fireEvent(grid, 'touchEnd', touchEvent(70, touch(2, 120, 20)));
    expect(onPress.mock.calls).toEqual([[1], [2]]);
  });

  it('ignores drags, cancelled touches and input while disabled', async () => {
    const onPress = await renderGrid();
    const grid = screen.getByTestId('tile-grid');
    await fireEvent(grid, 'touchStart', touchEvent(0, touch(1, 10, 20)));
    await fireEvent(grid, 'touchEnd', touchEvent(80, touch(1, 100, 20)));
    await fireEvent(grid, 'touchStart', touchEvent(100, touch(2, 70, 20)));
    await fireEvent(grid, 'touchCancel', touchEvent(120, touch(2, 70, 20)));
    await fireEvent(grid, 'touchEnd', touchEvent(130, touch(2, 70, 20)));
    expect(onPress).not.toHaveBeenCalled();

    const disabledPress = jest.fn();
    await renderGrid(disabledPress, true);
    const g2 = screen.getByTestId('tile-grid');
    await fireEvent(g2, 'touchStart', touchEvent(0, touch(1, 70, 20)));
    await fireEvent(g2, 'touchEnd', touchEvent(50, touch(1, 70, 20)));
    expect(disabledPress).not.toHaveBeenCalled();
  });
});

describe('describeTile', () => {
  it('mentions short circuits and colour requirements', () => {
    const b = puzzle(['S1 T1 S3v', '.  R0v .']).board;
    expect(describeTile(b.tiles[1]!, { x: 1, y: 0, color: null, shorted: true })).toContain('Short circuit');
    expect(describeTile(b.tiles[4]!, { x: 1, y: 1, color: null, shorted: false })).toContain('Needs violet');
  });
});

describe('describeChange', () => {
  const { describeChange } = jest.requireActual('../a11y') as typeof import('../a11y');

  it('announces completion, receivers gaining and losing power', () => {
    const p = puzzle(['R1* T0 R3*', '.   S0* .']);
    const ev = (rows: string[]) => evaluatePuzzle({ ...p, board: puzzle(rows).board });
    const one = ev(['R1* T0 R3*', '.   S0* .']); // N,E,S: only the east receiver
    const both = ev(['R1* T1 R3*', '.   S0* .']); // E,S,W: both receivers
    const none = ev(['R1* T3 R3*', '.   S0* .']); // W,N,E: source not linked
    expect(describeChange(one, both, 3)).toBe('Circuit complete. 3 of 3 stars.');
    expect(describeChange(none, one)).toBe('Receiver powered. 1 of 2.');
    expect(describeChange(one, none)).toBe('Receiver lost power. 0 of 2.');
  });

  it('announces a new short circuit and stays quiet otherwise', () => {
    const p = puzzle(['S1 T0 S3v', '.  R0 .'], { noOpenEnds: false, allTilesPowered: false });
    const g0 = createGame(p);
    const g1 = gameReducer(g0, { type: 'rotate', index: 1 });
    expect(describeChange(g0.evaluation, g1.evaluation)).toContain('Short circuit');
    expect(describeChange(g0.evaluation, g0.evaluation)).toBeNull();
  });
});
