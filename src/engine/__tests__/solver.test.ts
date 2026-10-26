import { createGame, gameReducer } from '../game';
import { evaluate } from '../rules';
import { applyRotations, nextHint, solve, stateSpaceSize, tapDistance } from '../solver';
import { CANONICAL_BASE_MASK } from '../tiles';
import { LOOSE, puzzle } from './helpers';

const BRANCH = puzzle([
  'S1* I0 T3 L0', //
  '#   .  I1 R0*',
  'R1* I0 L1 #',
]);

describe('solver', () => {
  it('finds a proven-optimal solution and the solution is actually solved', () => {
    const r = solve(BRANCH);
    expect(r.status).toBe('optimal');
    if (r.status !== 'optimal') return;
    expect(r.moves).toBe(9);
    const solved = applyRotations(BRANCH.board, r.rotations);
    expect(evaluate(solved, BRANCH.objectives, BRANCH.constraints).solved).toBe(true);
  });

  it('returns 0 moves for an already-solved board', () => {
    const r = solve(puzzle(['S1* I1 R3*']));
    expect(r).toMatchObject({ status: 'optimal', moves: 0 });
  });

  it('collapses symmetric rotations (straight = 2 states, cross = 1)', () => {
    expect(stateSpaceSize(puzzle(['S1* I0 R3*']).board)).toBe(2);
    expect(stateSpaceSize(puzzle(['S1* X I0 R3*']).board)).toBe(2);
    expect(stateSpaceSize(puzzle(['S1* L0 T0 R3*']).board)).toBe(16);
    // Straight at rotation 3 needs one tap to reach rotation 0's mask, not one.
    expect(tapDistance(CANONICAL_BASE_MASK.straight!, 3, 0)).toBe(1);
    expect(tapDistance(CANONICAL_BASE_MASK.elbow!, 3, 0)).toBe(1);
    expect(tapDistance(CANONICAL_BASE_MASK.elbow!, 0, 3)).toBe(3);
  });

  it('proves a board unsolvable after exhausting the space', () => {
    // A lone elbow can never join two endpoints facing along a straight line.
    const r = solve(puzzle(['S1* L0 R3*']));
    expect(r.status).toBe('unsolvable');
  });

  it('reports unknown (not optimal, not unsolvable) when the state limit is hit', () => {
    const r = solve(BRANCH, BRANCH.board, { maxStates: 5, maxMs: 10_000 });
    expect(r).toMatchObject({ status: 'unknown', reason: 'stateLimit' });
  });

  it('reports unknown when the time limit is hit', () => {
    let t = 0;
    const clock = () => (t += 1000); // every call advances one second
    const r = solve(BRANCH, BRANCH.board, { maxStates: 1e9, maxMs: 10, now: clock });
    expect(r).toMatchObject({ status: 'unknown', reason: 'timeLimit' });
  });

  it('respects locked tiles', () => {
    // Only solution would require rotating the locked straight.
    expect(solve(puzzle(['S1* I0* R3*'])).status).toBe('unsolvable');
  });
});

describe('hints from the current state', () => {
  it('hints from a modified mid-game board, not the original', () => {
    let g = createGame(BRANCH);
    // Player makes a wrong move first: rotate the already-correct-ish elbow off course.
    g = gameReducer(g, { type: 'rotate', index: 10 });
    const fromStart = solve(BRANCH).status === 'optimal' ? solve(BRANCH) : null;
    const fromHere = solve(BRANCH, g.board);
    expect(fromHere.status).toBe('optimal');
    if (fromHere.status !== 'optimal' || fromStart?.status !== 'optimal') return;
    expect(fromHere.moves).not.toBe(fromStart.moves);
  });

  it('repeatedly applying hints solves the puzzle', () => {
    let g = createGame(BRANCH);
    for (let i = 0; i < 20 && g.status !== 'won'; i++) {
      const hint = nextHint(BRANCH, g.board);
      expect(hint).not.toBeNull();
      g = gameReducer(g, { type: 'applyHint', index: hint!.index, rotation: hint!.rotation });
    }
    expect(g.status).toBe('won');
    expect(g.hintsUsed).toBeGreaterThan(0);
  });

  it('returns null for a solved board or when the solver cannot prove a solution', () => {
    const solved = puzzle(['S1* I1 R3*']);
    expect(nextHint(solved, solved.board)).toBeNull();
    expect(nextHint(BRANCH, BRANCH.board, { maxStates: 1, maxMs: 1000 })).toBeNull();
    expect(nextHint(puzzle(['S1* L0 R3*'], LOOSE), puzzle(['S1* L0 R3*']).board)).toBeNull();
  });
});
