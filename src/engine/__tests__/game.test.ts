import { type GameState, createGame, gameReducer, isAtStart, restoreGame, snapshotGame } from '../game';
import { puzzle } from './helpers';

// Solved by rotating the straight once (I0 -> I1).
const P = puzzle(['S1* I0 R3*']);
const MID = 1;

function play(state: GameState, ...actions: Parameters<typeof gameReducer>[1][]): GameState {
  return actions.reduce(gameReducer, state);
}

describe('game reducer', () => {
  it('starts unsolved with zero counters', () => {
    const g = createGame(P);
    expect(g.status).toBe('playing');
    expect(g.moves).toBe(0);
    expect(g.evaluation.solved).toBe(false);
  });

  it('rotates a tile clockwise, counts a move and detects the win', () => {
    const g = play(createGame(P), { type: 'rotate', index: MID });
    expect(g.board.tiles[MID]!.rotation).toBe(1);
    expect(g.moves).toBe(1);
    expect(g.status).toBe('won');
  });

  it('ignores locked, empty and out-of-range tiles (same object returned)', () => {
    const g = createGame(P);
    expect(gameReducer(g, { type: 'rotate', index: 0 })).toBe(g);
    expect(gameReducer(g, { type: 'rotate', index: 99 })).toBe(g);
    const withEmpty = createGame(puzzle(['S1* . I0 R3*']));
    expect(gameReducer(withEmpty, { type: 'rotate', index: 1 })).toBe(withEmpty);
  });

  it('does not change the original puzzle board (immutability)', () => {
    const g = play(createGame(P), { type: 'rotate', index: MID });
    expect(P.board.tiles[MID]!.rotation).toBe(0);
    expect(g.puzzle.board).toBe(P.board);
  });

  it('undo restores the previous rotation and move count', () => {
    const p = puzzle(['S1* L0 R3*'], { noOpenEnds: false, allTilesPowered: false });
    const g = play(createGame(p), { type: 'rotate', index: 1 }, { type: 'rotate', index: 1 });
    expect(g.board.tiles[1]!.rotation).toBe(2);
    const u = gameReducer(g, { type: 'undo' });
    expect(u.board.tiles[1]!.rotation).toBe(1);
    expect(u.moves).toBe(1);
    const u2 = gameReducer(u, { type: 'undo' });
    expect(u2.board.tiles[1]!.rotation).toBe(0);
    expect(u2.moves).toBe(0);
    expect(gameReducer(u2, { type: 'undo' })).toBe(u2);
  });

  it('reset returns to the start state and is a no-op at the start', () => {
    const p = puzzle(['S1* L0 L0 R3*']);
    const g = play(createGame(p), { type: 'rotate', index: 1 }, { type: 'rotate', index: 2 });
    const r = gameReducer(g, { type: 'reset' });
    expect(r.board).toBe(p.board);
    expect(r.moves).toBe(0);
    expect(isAtStart(r)).toBe(true);
    expect(gameReducer(r, { type: 'reset' })).toBe(r);
    expect(gameReducer(createGame(p), { type: 'reset' }).history).toHaveLength(0);
  });

  it('reset can be undone, restoring board and move count', () => {
    const p = puzzle(['S1* L0 L0 R3*']);
    const g = play(createGame(p), { type: 'rotate', index: 1 }, { type: 'rotate', index: 2 }, { type: 'rotate', index: 2 });
    const undone = play(g, { type: 'reset' }, { type: 'undo' });
    expect(undone.board.tiles.map((t) => t.rotation)).toEqual(g.board.tiles.map((t) => t.rotation));
    expect(undone.moves).toBe(3);
    // Earlier moves remain undoable after undoing the reset.
    const back = play(undone, { type: 'undo' }, { type: 'undo' }, { type: 'undo' });
    expect(isAtStart(back)).toBe(true);
    expect(back.moves).toBe(0);
  });

  it('moves made after a reset undo before the reset does', () => {
    const p = puzzle(['S1* L0 L0 R3*']);
    const g = play(createGame(p), { type: 'rotate', index: 1 }, { type: 'reset' }, { type: 'rotate', index: 2 });
    expect(g.moves).toBe(1);
    const u1 = gameReducer(g, { type: 'undo' });
    expect(isAtStart(u1)).toBe(true);
    const u2 = gameReducer(u1, { type: 'undo' });
    expect(u2.board.tiles[1]!.rotation).toBe(1);
    expect(u2.moves).toBe(1);
  });

  it('freezes input after winning', () => {
    const won = play(createGame(P), { type: 'rotate', index: MID });
    expect(gameReducer(won, { type: 'rotate', index: MID })).toBe(won);
    expect(gameReducer(won, { type: 'undo' })).toBe(won);
    expect(gameReducer(won, { type: 'reset' })).toBe(won);
    expect(gameReducer(won, { type: 'tick', deltaMs: 100 })).toBe(won);
  });

  it('tracks elapsed time only while playing', () => {
    let g = play(createGame(P), { type: 'tick', deltaMs: 250 }, { type: 'tick', deltaMs: 250 });
    expect(g.elapsedMs).toBe(500);
    g = play(g, { type: 'pause' }, { type: 'tick', deltaMs: 1000 }, { type: 'rotate', index: MID });
    expect(g.elapsedMs).toBe(500);
    expect(g.moves).toBe(0);
    g = play(g, { type: 'resume' }, { type: 'tick', deltaMs: -5 }, { type: 'tick', deltaMs: Number.NaN });
    expect(g.elapsedMs).toBe(500);
    expect(g.status).toBe('playing');
  });

  it('applies hints as a move and keeps the hint count after undo', () => {
    const g = play(createGame(P), { type: 'applyHint', index: MID, rotation: 1 });
    expect(g.hintsUsed).toBe(1);
    expect(g.moves).toBe(1);
    expect(g.status).toBe('won');
    const p = puzzle(['S1* L0 L0 R3*']);
    const h = play(createGame(p), { type: 'applyHint', index: 1, rotation: 1 }, { type: 'undo' });
    expect(h.hintsUsed).toBe(1);
    expect(h.board.tiles[1]!.rotation).toBe(0);
  });
});

describe('snapshot / restore', () => {
  it('round-trips through JSON', () => {
    const p = puzzle(['S1* L0 L0 R3*']);
    const g = play(createGame(p), { type: 'rotate', index: 1 }, { type: 'tick', deltaMs: 1234 });
    const json = JSON.stringify(snapshotGame(g));
    const r = restoreGame(p, JSON.parse(json));
    expect(r).not.toBeNull();
    expect(r!.board.tiles.map((t) => t.rotation)).toEqual(g.board.tiles.map((t) => t.rotation));
    expect(r!.moves).toBe(1);
    expect(r!.elapsedMs).toBe(1234);
    expect(gameReducer(r!, { type: 'undo' }).board.tiles[1]!.rotation).toBe(0);
  });

  it('rejects malformed or mismatched snapshots instead of crashing', () => {
    const p = puzzle(['S1* L0 L0 R3*']);
    expect(restoreGame(p, null)).toBeNull();
    expect(restoreGame(p, 'garbage')).toBeNull();
    expect(restoreGame(p, { rotations: [0, 0], moves: 0, history: [], hintsUsed: 0, elapsedMs: 0 })).toBeNull();
    expect(
      restoreGame(p, { rotations: [0, 0, 0, 7], moves: 0, history: [], hintsUsed: 0, elapsedMs: 0 }),
    ).toBeNull();
    expect(
      restoreGame(p, {
        rotations: [0, 0, 0, 0],
        moves: 1,
        history: [{ kind: 'rotate', index: 0, previous: 0, hint: false }], // locked source
        hintsUsed: 0,
        elapsedMs: 0,
      }),
    ).toBeNull();
  });

  it('round-trips a history containing a reset', () => {
    const p = puzzle(['S1* L0 L0 R3*']);
    const g = play(createGame(p), { type: 'rotate', index: 1 }, { type: 'reset' });
    const r = restoreGame(p, JSON.parse(JSON.stringify(snapshotGame(g))));
    expect(r).not.toBeNull();
    expect(gameReducer(r!, { type: 'undo' }).board.tiles[1]!.rotation).toBe(1);
  });

  it('rejects history entries without a known kind or with wrong-length resets', () => {
    const p = puzzle(['S1* L0 L0 R3*']);
    const base = { rotations: [1, 0, 0, 3], moves: 0, hintsUsed: 0, elapsedMs: 0 };
    expect(restoreGame(p, { ...base, history: [{ index: 1, previous: 0, hint: false }] })).toBeNull();
    expect(restoreGame(p, { ...base, history: [{ kind: 'reset', rotations: [0], moves: 0 }] })).toBeNull();
  });

  it('never rotates locked tiles when restoring', () => {
    const p = puzzle(['S1* L0 L0 R3*']);
    const r = restoreGame(p, { rotations: [2, 1, 0, 0], moves: 1, history: [], hintsUsed: 0, elapsedMs: 0 });
    expect(r!.board.tiles[0]!.rotation).toBe(1);
    expect(r!.board.tiles[3]!.rotation).toBe(3);
  });
});
