import { type GameAction, type GameState, createGame, gameReducer, isAtStart } from '../game';
import { isRotation } from '../ports';
import { createRng } from '../rng';
import { evaluatePuzzle } from '../rules';
import { puzzle } from './helpers';

const P = puzzle([
  'S1* I0 T3 L0', //
  '#   .  I1 R0*',
  'R1* I0 L1 #',
]);

function randomAction(r: ReturnType<typeof createRng>, size: number): GameAction {
  const roll = r.int(100);
  if (roll < 70) return { type: 'rotate', index: r.int(size + 2) - 1 }; // includes out-of-range
  if (roll < 82) return { type: 'undo' };
  if (roll < 88) return { type: 'reset' };
  if (roll < 93) return { type: 'tick', deltaMs: r.int(500) - 50 };
  if (roll < 96) return { type: 'pause' };
  return { type: 'resume' };
}

function run(seed: number, steps: number): GameState {
  const r = createRng(seed);
  let g = createGame(P);
  for (let i = 0; i < steps; i++) g = gameReducer(g, randomAction(r, P.board.tiles.length));
  return g;
}

describe('reducer invariants under random play', () => {
  it.each([1, 2, 3, 42, 1337])('seed %i keeps the state consistent', (seed) => {
    const r = createRng(seed);
    let g = createGame(P);
    for (let i = 0; i < 400; i++) {
      const prev = g;
      g = gameReducer(g, randomAction(r, P.board.tiles.length));
      expect(g.moves).toBeGreaterThanOrEqual(0);
      expect(g.elapsedMs).toBeGreaterThanOrEqual(prev.elapsedMs);
      expect(g.board.tiles.every((t) => isRotation(t.rotation))).toBe(true);
      // Locked and fixed tiles never move.
      g.board.tiles.forEach((t, k) => {
        if (t.locked || t.baseMask === 0) expect(t.rotation).toBe(P.board.tiles[k]!.rotation);
      });
      // The cached evaluation always matches the board.
      expect(g.evaluation.solved).toBe(evaluatePuzzle(P, g.board).solved);
      expect(g.status === 'won').toBe(g.evaluation.solved);
      if (g.status === 'won') break;
    }
    // Undoing everything returns to the start (unless the game was won and frozen).
    if (g.status !== 'won') {
      let u = gameReducer(g, { type: 'resume' });
      for (let i = 0; i < 1000 && u.history.length > 0; i++) u = gameReducer(u, { type: 'undo' });
      expect(isAtStart(u)).toBe(true);
      expect(u.moves).toBe(0);
    }
  });

  it('replays identically for the same seed (determinism)', () => {
    expect(run(99, 300)).toEqual(run(99, 300));
  });
});
