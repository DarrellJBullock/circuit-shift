import { type Board, withTiles } from './board';
import { type Rotation, isRotation, normalizeRotation } from './ports';
import { type Evaluation, type Puzzle, evaluatePuzzle } from './rules';
import { isRotatable, withRotation } from './tiles';

export type GameStatus = 'playing' | 'paused' | 'won';

export type HistoryEntry =
  | {
      readonly kind: 'rotate';
      readonly index: number;
      readonly previous: Rotation;
      /** True when this change came from a hint. */
      readonly hint: boolean;
    }
  /** A reset is undoable: it records the full board and move count it replaced. */
  | { readonly kind: 'reset'; readonly rotations: readonly Rotation[]; readonly moves: number };

export interface GameState {
  readonly puzzle: Puzzle;
  readonly board: Board;
  readonly moves: number;
  readonly history: readonly HistoryEntry[];
  readonly hintsUsed: number;
  readonly elapsedMs: number;
  readonly status: GameStatus;
  readonly evaluation: Evaluation;
}

export type GameAction =
  | { readonly type: 'rotate'; readonly index: number }
  | { readonly type: 'undo' }
  | { readonly type: 'reset' }
  | { readonly type: 'tick'; readonly deltaMs: number }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  /** Sets one tile to a solver-provided rotation. Counts as one move and one hint. */
  | { readonly type: 'applyHint'; readonly index: number; readonly rotation: Rotation };

/** JSON-safe snapshot used to persist and resume an interrupted game. */
export interface GameSnapshot {
  readonly rotations: readonly Rotation[];
  readonly moves: number;
  readonly history: readonly HistoryEntry[];
  readonly hintsUsed: number;
  readonly elapsedMs: number;
}

function settle(prev: GameState, board: Board, patch: Partial<GameState>): GameState {
  const evaluation = evaluatePuzzle(prev.puzzle, board);
  return {
    ...prev,
    ...patch,
    board,
    evaluation,
    status: evaluation.solved ? 'won' : patch.status ?? (prev.status === 'won' ? 'playing' : prev.status),
  };
}

function boardWithRotations(board: Board, rotations: readonly Rotation[]): Board {
  return withTiles(
    board,
    board.tiles.map((t, i) => withRotation(t, rotations[i] ?? t.rotation)),
  );
}

/** True when every tile is in its starting orientation. */
export function isAtStart(state: GameState): boolean {
  const start = state.puzzle.board.tiles;
  return state.board.tiles.every((t, i) => t.rotation === start[i]!.rotation);
}

function setRotation(board: Board, index: number, rotation: Rotation): Board {
  const tiles = board.tiles.slice();
  tiles[index] = withRotation(tiles[index]!, rotation);
  return withTiles(board, tiles);
}

export function createGame(puzzle: Puzzle): GameState {
  const evaluation = evaluatePuzzle(puzzle);
  return {
    puzzle,
    board: puzzle.board,
    moves: 0,
    history: [],
    hintsUsed: 0,
    elapsedMs: 0,
    status: evaluation.solved ? 'won' : 'playing',
    evaluation,
  };
}

/** Pure, deterministic transition. Returns the same object when nothing changes. */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'rotate': {
      if (state.status !== 'playing') return state;
      const tile = state.board.tiles[action.index];
      if (!tile || !isRotatable(tile)) return state;
      const next = normalizeRotation(tile.rotation + 1);
      return settle(state, setRotation(state.board, action.index, next), {
        moves: state.moves + 1,
        history: [...state.history, { kind: 'rotate', index: action.index, previous: tile.rotation, hint: false }],
      });
    }
    case 'applyHint': {
      if (state.status !== 'playing') return state;
      const tile = state.board.tiles[action.index];
      if (!tile || !isRotatable(tile) || tile.rotation === action.rotation) return state;
      return settle(state, setRotation(state.board, action.index, action.rotation), {
        moves: state.moves + 1,
        hintsUsed: state.hintsUsed + 1,
        history: [...state.history, { kind: 'rotate', index: action.index, previous: tile.rotation, hint: true }],
      });
    }
    case 'undo': {
      if (state.status !== 'playing') return state;
      const last = state.history[state.history.length - 1];
      if (!last) return state;
      const history = state.history.slice(0, -1);
      if (last.kind === 'reset') {
        return settle(state, boardWithRotations(state.board, last.rotations), { moves: last.moves, history });
      }
      // Hints stay counted after undo; the help was already received.
      return settle(state, setRotation(state.board, last.index, last.previous), {
        moves: Math.max(0, state.moves - 1),
        history,
      });
    }
    case 'reset': {
      if (state.status !== 'playing') return state;
      if (isAtStart(state)) return state;
      return settle(state, state.puzzle.board, {
        moves: 0,
        history: [
          ...state.history,
          { kind: 'reset', rotations: state.board.tiles.map((t) => t.rotation), moves: state.moves },
        ],
      });
    }
    case 'tick': {
      if (state.status !== 'playing' || !(action.deltaMs > 0)) return state;
      return { ...state, elapsedMs: state.elapsedMs + action.deltaMs };
    }
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing' } : state;
  }
}

export function snapshotGame(state: GameState): GameSnapshot {
  return {
    rotations: state.board.tiles.map((t) => t.rotation),
    moves: state.moves,
    history: state.history,
    hintsUsed: state.hintsUsed,
    elapsedMs: state.elapsedMs,
  };
}

/**
 * Rebuild a game from a snapshot. Returns null if the snapshot does not fit
 * the puzzle (e.g. the level was edited since it was saved). Locked tiles
 * always keep the level's rotation.
 */
export function restoreGame(puzzle: Puzzle, snapshot: unknown): GameState | null {
  if (!isSnapshotShape(snapshot)) return null;
  const tiles = puzzle.board.tiles;
  if (snapshot.rotations.length !== tiles.length) return null;
  for (const h of snapshot.history) {
    if (h.kind === 'rotate' && (h.index >= tiles.length || !isRotatable(tiles[h.index]!))) return null;
    if (h.kind === 'reset' && h.rotations.length !== tiles.length) return null;
  }
  const restored = tiles.map((t, i) =>
    isRotatable(t) ? withRotation(t, snapshot.rotations[i]!) : t,
  );
  const base = createGame(puzzle);
  return settle(base, withTiles(puzzle.board, restored), {
    moves: snapshot.moves,
    history: snapshot.history,
    hintsUsed: snapshot.hintsUsed,
    elapsedMs: snapshot.elapsedMs,
    status: 'playing',
  });
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function isSnapshotShape(v: unknown): v is GameSnapshot {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    Array.isArray(s.rotations) &&
    s.rotations.every(isRotation) &&
    isNonNegativeInt(s.moves) &&
    isNonNegativeInt(s.hintsUsed) &&
    typeof s.elapsedMs === 'number' &&
    Number.isFinite(s.elapsedMs) &&
    s.elapsedMs >= 0 &&
    Array.isArray(s.history) &&
    s.history.every(isHistoryEntry)
  );
}

function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (typeof v !== 'object' || v === null) return false;
  const h = v as Record<string, unknown>;
  if (h.kind === 'rotate') {
    return isNonNegativeInt(h.index) && isRotation(h.previous) && typeof h.hint === 'boolean';
  }
  if (h.kind === 'reset') {
    return Array.isArray(h.rotations) && h.rotations.every(isRotation) && isNonNegativeInt(h.moves);
  }
  return false;
}
