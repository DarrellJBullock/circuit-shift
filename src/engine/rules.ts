import type { Board } from './board';
import { type PowerState, computePower } from './power';
import { type SignalColor, isConductive } from './tiles';

export interface ReceiverObjective {
  readonly receiverId: string;
  /** Signal colours this receiver accepts. */
  readonly accepts: readonly SignalColor[];
}

export interface LevelConstraints {
  /** Every port of every powered tile must connect to a reciprocal port. */
  readonly noOpenEnds: boolean;
  /** Every conductive tile must be powered. */
  readonly allTilesPowered: boolean;
}

/** Everything needed to decide completion; immutable for a given level. */
export interface Puzzle {
  readonly board: Board;
  readonly objectives: readonly ReceiverObjective[];
  readonly constraints: LevelConstraints;
}

export type Violation = 'objective' | 'short' | 'openEnds' | 'unpowered';

export interface ObjectiveStatus {
  readonly receiverId: string;
  readonly index: number;
  readonly accepts: readonly SignalColor[];
  readonly satisfied: boolean;
  readonly receivedColor: SignalColor | null;
}

export interface Evaluation {
  readonly solved: boolean;
  readonly objectives: readonly ObjectiveStatus[];
  readonly violations: readonly Violation[];
  readonly power: PowerState;
}

export function findTileIndex(board: Board, id: string): number {
  return board.tiles.findIndex((t) => t.id === id);
}

/**
 * Solved ⇔ every receiver objective is met, no network is shorted, and the
 * level's constraints hold. A missing receiver id counts as unsatisfied.
 */
export function evaluate(
  board: Board,
  objectives: readonly ReceiverObjective[],
  constraints: LevelConstraints,
  power: PowerState = computePower(board),
): Evaluation {
  const statuses: ObjectiveStatus[] = objectives.map((o) => {
    const index = findTileIndex(board, o.receiverId);
    const receivedColor = index >= 0 ? power.colorOf[index] ?? null : null;
    return {
      receiverId: o.receiverId,
      index,
      accepts: o.accepts,
      receivedColor,
      satisfied: receivedColor != null && o.accepts.includes(receivedColor),
    };
  });

  const violations: Violation[] = [];
  if (objectives.length === 0 || statuses.some((s) => !s.satisfied)) violations.push('objective');
  if (power.networks.some((n) => n.shorted)) violations.push('short');

  if (constraints.noOpenEnds) {
    const leaking = board.tiles.some(
      (_, i) => power.colorOf[i] != null && (power.openEndsOf[i] ?? 0) !== 0,
    );
    if (leaking) violations.push('openEnds');
  }
  if (constraints.allTilesPowered) {
    const dark = board.tiles.some((t, i) => isConductive(t) && power.colorOf[i] == null);
    if (dark) violations.push('unpowered');
  }

  return { solved: violations.length === 0, objectives: statuses, violations, power };
}

export function evaluatePuzzle(puzzle: Puzzle, board: Board = puzzle.board): Evaluation {
  return evaluate(board, puzzle.objectives, puzzle.constraints);
}
