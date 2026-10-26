import {
  CANONICAL_BASE_MASK,
  type Puzzle,
  type Rotation,
  SIGNAL_COLORS,
  type SignalColor,
  TILE_TYPES,
  type Tile,
  type TileType,
  applyRotations,
  evaluate,
  isRotatable,
  isRotation,
  tapDistance,
} from '@/engine';

import type { ChapterId, Difficulty, Level, ValidationResult } from './schema';

const CHAPTER_IDS: readonly ChapterId[] = ['ch1', 'ch2', 'ch3', 'daily'];
/** Width ≤ 7 keeps every cell ≥ 44pt on a 375pt-wide phone. */
export const MAX_BOARD_WIDTH = 7;
export const MAX_BOARD_HEIGHT = 9;
export const MIN_BOARD_SIDE = 2;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isColor = (v: unknown): v is SignalColor => SIGNAL_COLORS.includes(v as SignalColor);

export function levelToPuzzle(level: Level): Puzzle {
  return {
    board: { width: level.width, height: level.height, tiles: level.tiles },
    objectives: level.receiverObjectives,
    constraints: level.constraints,
  };
}

/**
 * Validate untrusted level data: structure first, then semantics (the stored
 * solution must be legal, reachable and solved; the start must not be solved).
 * Never throws.
 */
export function validateLevel(input: unknown): ValidationResult<Level> {
  try {
    return validateUnsafe(input);
  } catch (e) {
    return { ok: false, errors: [`validator crashed: ${String(e)}`] };
  }
}

function validateUnsafe(input: unknown): ValidationResult<Level> {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(msg);
  if (!isObj(input)) return { ok: false, errors: ['level is not an object'] };
  const L = input;
  const id = typeof L.id === 'string' && L.id.length > 0 ? L.id : null;
  if (!id) fail('id must be a non-empty string');
  const where = (m: string) => `${id ?? '?'}: ${m}`;

  if (!CHAPTER_IDS.includes(L.chapterId as ChapterId)) fail(where('invalid chapterId'));
  if (!isInt(L.order) || L.order < 1) fail(where('order must be a positive integer'));
  if (typeof L.title !== 'string') fail(where('title must be a string'));
  const w = L.width;
  const h = L.height;
  if (!isInt(w) || w < MIN_BOARD_SIDE || w > MAX_BOARD_WIDTH) fail(where('width out of range'));
  if (!isInt(h) || h < MIN_BOARD_SIDE || h > MAX_BOARD_HEIGHT) fail(where('height out of range'));
  if (!Array.isArray(L.tiles)) fail(where('tiles must be an array'));
  if (errors.length) return { ok: false, errors };

  const rawTiles = L.tiles as unknown[];
  if (rawTiles.length !== (w as number) * (h as number)) {
    return { ok: false, errors: [where(`expected ${(w as number) * (h as number)} tiles, got ${rawTiles.length}`)] };
  }

  const ids = new Set<string>();
  rawTiles.forEach((t, i) => {
    const at = where(`tile[${i}]`);
    if (!isObj(t)) return fail(`${at} is not an object`);
    if (typeof t.id !== 'string' || !t.id) fail(`${at} id must be a non-empty string`);
    else if (ids.has(t.id)) fail(`${at} duplicate id "${t.id}"`);
    else ids.add(t.id);
    if (!TILE_TYPES.includes(t.type as TileType)) return fail(`${at} invalid type`);
    const type = t.type as TileType;
    if (!isInt(t.baseMask) || t.baseMask < 0 || t.baseMask > 15) fail(`${at} baseMask must be 0..15`);
    const canonical = CANONICAL_BASE_MASK[type];
    if (canonical !== undefined && t.baseMask !== canonical) fail(`${at} ${type} baseMask must be ${canonical}`);
    if ((type === 'source' || type === 'receiver') && t.baseMask === 0) fail(`${at} ${type} needs a port`);
    if (!isRotation(t.rotation)) fail(`${at} rotation must be 0..3`);
    if (typeof t.locked !== 'boolean') fail(`${at} locked must be boolean`);
    if (t.meta !== undefined) {
      if (!isObj(t.meta)) fail(`${at} meta must be an object`);
      else if (t.meta.color !== undefined && !isColor(t.meta.color)) fail(`${at} invalid meta.color`);
    }
  });
  if (errors.length) return { ok: false, errors };
  const tiles = rawTiles as Tile[];
  const byId = new Map(tiles.map((t) => [t.id, t] as const));

  // Sources
  if (!Array.isArray(L.sourceIds) || L.sourceIds.length === 0) fail(where('sourceIds must be non-empty'));
  else {
    for (const s of L.sourceIds) {
      if (byId.get(s as string)?.type !== 'source') fail(where(`sourceId "${String(s)}" is not a source tile`));
    }
    for (const t of tiles) {
      if (t.type === 'source' && !L.sourceIds.includes(t.id)) fail(where(`source "${t.id}" missing from sourceIds`));
    }
  }

  // Objectives
  if (!Array.isArray(L.receiverObjectives) || L.receiverObjectives.length === 0) {
    fail(where('receiverObjectives must be non-empty'));
  } else {
    const seen = new Set<string>();
    for (const o of L.receiverObjectives as unknown[]) {
      if (!isObj(o) || typeof o.receiverId !== 'string') {
        fail(where('objective malformed'));
        continue;
      }
      if (byId.get(o.receiverId)?.type !== 'receiver') fail(where(`objective "${o.receiverId}" is not a receiver`));
      if (seen.has(o.receiverId)) fail(where(`duplicate objective "${o.receiverId}"`));
      seen.add(o.receiverId);
      if (!Array.isArray(o.accepts) || o.accepts.length === 0 || !o.accepts.every(isColor)) {
        fail(where(`objective "${o.receiverId}" accepts must be non-empty colours`));
      }
    }
    for (const t of tiles) {
      if (t.type === 'receiver' && !seen.has(t.id)) fail(where(`receiver "${t.id}" has no objective`));
    }
  }

  const c = L.constraints;
  if (!isObj(c) || typeof c.noOpenEnds !== 'boolean' || typeof c.allTilesPowered !== 'boolean') {
    fail(where('constraints must have boolean noOpenEnds and allTilesPowered'));
  }
  if (!isInt(L.difficulty) || L.difficulty < 1 || L.difficulty > 10) fail(where('difficulty must be 1..10'));
  if (typeof L.generatorVersion !== 'string' || !L.generatorVersion) fail(where('generatorVersion required'));
  if (L.seed !== null && !isInt(L.seed)) fail(where('seed must be an integer or null'));

  const sm = L.solutionMetadata;
  if (!isObj(sm)) fail(where('solutionMetadata missing'));
  else {
    if (!Array.isArray(sm.rotations) || sm.rotations.length !== tiles.length || !sm.rotations.every(isRotation)) {
      fail(where('solutionMetadata.rotations must be one rotation per tile'));
    }
    if (!isInt(sm.parMoves) || sm.parMoves < 1) fail(where('solutionMetadata.parMoves must be ≥ 1'));
    if (sm.optimality !== 'proven' && sm.optimality !== 'upperBound') fail(where('invalid optimality'));
    if (typeof sm.solverVersion !== 'string') fail(where('solverVersion required'));
  }
  if (L.optimalMoves !== null) {
    if (!isInt(L.optimalMoves)) fail(where('optimalMoves must be an integer or null'));
    else if (isObj(sm) && (sm.optimality !== 'proven' || sm.parMoves !== L.optimalMoves)) {
      fail(where('optimalMoves may only be set when proven and equal to parMoves'));
    }
  }
  if (errors.length) return { ok: false, errors };

  // Semantic checks.
  const level = input as unknown as Level;
  const puzzle = levelToPuzzle(level);
  const solution = level.solutionMetadata.rotations as Rotation[];
  let par = 0;
  tiles.forEach((t, i) => {
    const target = solution[i]!;
    if (!isRotatable(t)) {
      if (t.rotation !== target) fail(where(`tile "${t.id}" is fixed but solution rotates it`));
    } else {
      par += tapDistance(t.baseMask, t.rotation, target);
    }
  });
  if (par !== level.solutionMetadata.parMoves) {
    fail(where(`parMoves ${level.solutionMetadata.parMoves} ≠ solution distance ${par}`));
  }
  const solvedBoard = applyRotations(puzzle.board, solution);
  const solvedEval = evaluate(solvedBoard, puzzle.objectives, puzzle.constraints);
  if (!solvedEval.solved) fail(where(`stored solution is not solved (${solvedEval.violations.join(', ')})`));
  if (evaluate(puzzle.board, puzzle.objectives, puzzle.constraints).solved) fail(where('start state is already solved'));

  return errors.length ? { ok: false, errors } : { ok: true, value: level };
}

export function isDifficulty(v: unknown): v is Difficulty {
  return isInt(v) && v >= 1 && v <= 10;
}
