import { rotateMask } from '@/engine';
import { getLevel } from '@/levels/registry';

import { referenceMoves, useGame } from '../gameStore';
import { mergeResult, useProgress } from '../progressStore';

const level = getLevel('ch1-03')!;

beforeEach(() => {
  useGame.getState().clear();
  useProgress.setState({ results: {} });
});

describe('game store', () => {
  it('refuses unknown levels', () => {
    expect(useGame.getState().start('nope')).toBe(false);
    expect(useGame.getState().game).toBeNull();
  });

  it('records a 3-star completion when solved in optimal moves', () => {
    expect(useGame.getState().start(level.id)).toBe(true);
    const solution = level.solutionMetadata.rotations;
    // Tap each tile until it matches the stored solution.
    for (let i = 0; i < solution.length; i++) {
      for (let k = 0; k < 4; k++) {
        const g = useGame.getState().game!;
        const t = g.board.tiles[i]!;
        if (g.status === 'won' || t.locked || t.type === 'empty' || t.type === 'blocked') break;
        if (rotateMask(t.baseMask, t.rotation) === rotateMask(t.baseMask, solution[i]!)) break;
        useGame.getState().dispatch({ type: 'rotate', index: i });
      }
    }
    const { game, completion } = useGame.getState();
    expect(game!.status).toBe('won');
    expect(game!.moves).toBe(referenceMoves(level));
    expect(completion).toMatchObject({ stars: 3, newBest: true });
    expect(useProgress.getState().results[level.id]).toMatchObject({ completed: true, bestStars: 3 });
  });
});

describe('progress merge', () => {
  it('keeps best stars, moves and time independently', () => {
    const a = mergeResult(undefined, { levelId: 'x', stars: 2, moves: 12, timeMs: 5000 });
    const b = mergeResult(a, { levelId: 'x', stars: 1, moves: 10, timeMs: 9000 });
    expect(b).toEqual({ levelId: 'x', completed: true, bestStars: 2, bestMoves: 10, bestTimeMs: 5000 });
  });
});
