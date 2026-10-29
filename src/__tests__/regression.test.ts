import { applyRotations, computePower, evaluatePuzzle, nextHint, tapDistance } from '@/engine';
import { addDays, dailyLevel } from '@/levels/daily';
import { LEVELS } from '@/levels/registry';
import { levelToPuzzle } from '@/levels/validate';
import { useGame } from '@/state/gameStore';
import { useProgress } from '@/state/progressStore';

/**
 * Release regression suite: every shipped level must be completable through
 * the real game store at its proven optimum, and core operations must stay
 * within frame-friendly budgets on the largest boards.
 */
describe('every shipped level is playable end to end', () => {
  beforeEach(() => {
    useGame.getState().clear();
    useProgress.setState({ results: {} });
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('%s: tapping the stored solution wins with ★★★', (id, level) => {
    expect(useGame.getState().start(id)).toBe(true);
    const target = level.solutionMetadata.rotations;
    level.tiles.forEach((t, i) => {
      if (t.locked || t.baseMask === 0) return;
      for (let k = tapDistance(t.baseMask, t.rotation, target[i]!); k > 0; k--) {
        useGame.getState().dispatch({ type: 'rotate', index: i });
      }
    });
    const { game, completion } = useGame.getState();
    expect(game!.status).toBe('won');
    expect(game!.moves).toBe(level.optimalMoves ?? level.solutionMetadata.parMoves);
    expect(completion?.stars).toBe(3);
    expect(useProgress.getState().results[id]?.completed).toBe(true);
  });
});

/**
 * Budgets are set for a developer Mac. Shared CI runners are slower and
 * noisier, so CI (GitHub sets CI=true) gets a 4× allowance: the suite still
 * catches order-of-magnitude regressions without flaking on runner speed.
 */
const BUDGET_SCALE = process.env.CI ? 4 : 1;
const budget = (ms: number) => ms * BUDGET_SCALE;

describe('performance budgets (largest boards)', () => {
  const biggest = [...LEVELS].sort((a, b) => b.width * b.height - a.width * a.height || b.receiverObjectives.length - a.receiverObjectives.length)[0]!;
  const puzzle = levelToPuzzle(biggest);
  const avgMs = (n: number, fn: () => void) => {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn();
    return (performance.now() - t0) / n;
  };

  it(`power + completion check on ${biggest.id} (${biggest.width}×${biggest.height}) stays under 2 ms`, () => {
    expect(avgMs(200, () => evaluatePuzzle(puzzle))).toBeLessThan(budget(2));
    expect(avgMs(200, () => computePower(puzzle.board))).toBeLessThan(budget(2));
  });

  it('a move through the store stays under 4 ms (frame budget is 16 ms)', () => {
    useGame.getState().start(biggest.id);
    const rotatable = biggest.tiles.findIndex((t) => !t.locked && t.baseMask !== 0 && t.type !== 'cross');
    expect(avgMs(300, () => useGame.getState().dispatch({ type: 'rotate', index: rotatable }))).toBeLessThan(budget(4));
  });

  it('a hint from a scrambled large board resolves within 100 ms', () => {
    const scrambled = applyRotations(puzzle.board, puzzle.board.tiles.map((t) => t.rotation));
    const t0 = performance.now();
    expect(nextHint(puzzle, scrambled)).not.toBeNull();
    expect(performance.now() - t0).toBeLessThan(budget(100));
  });

  it('generating a daily challenge takes under 150 ms (cold)', () => {
    const t0 = performance.now();
    expect(dailyLevel(addDays('2028-03-01', 0))).not.toBeNull();
    expect(performance.now() - t0).toBeLessThan(budget(150));
  });
});
