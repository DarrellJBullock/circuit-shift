import { createRng, solve } from '@/engine';

import { defineHandcrafted } from '../author';
import { LEVELS, LEVEL_LOAD_ERRORS, RAW_LEVELS, getLevel, nextLevel } from '../registry';
import { levelToPuzzle, validateLevel } from '../validate';

const sample = RAW_LEVELS[0]!;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('shipped levels', () => {
  it('all pass validation at load time', () => {
    expect(LEVEL_LOAD_ERRORS).toEqual([]);
    expect(LEVELS).toHaveLength(RAW_LEVELS.length);
  });

  it.each(RAW_LEVELS.map((l) => [l.id, l] as const))('%s is solvable with its stored optimum', (_, level) => {
    const r = solve(levelToPuzzle(level), undefined, { maxStates: 2_000_000, maxMs: 20_000 });
    expect(r.status).toBe('optimal');
    if (r.status === 'optimal' && level.optimalMoves !== null) {
      expect(r.moves).toBe(level.optimalMoves);
    }
  });

  it('survives a JSON round trip (serialization)', () => {
    const r = validateLevel(clone(sample));
    expect(r.ok).toBe(true);
  });

  it('looks up levels and chapter order', () => {
    expect(getLevel('ch1-01')?.title).toBe('First Spark');
    expect(getLevel('missing')).toBeUndefined();
    expect(nextLevel('missing')).toBeUndefined();
  });
});

describe('validateLevel on invalid data', () => {
  const bad: [string, unknown][] = [
    ['null', null],
    ['string', 'level'],
    ['array', []],
    ['empty object', {}],
  ];
  it.each(bad)('rejects %s without throwing', (_, input) => {
    const r = validateLevel(input);
    expect(r.ok).toBe(false);
  });

  const mutate = (fn: (l: Record<string, any>) => void) => {
    const l = clone(sample) as Record<string, any>;
    fn(l);
    return validateLevel(l);
  };

  it('rejects a wrong tile count', () => {
    expect(mutate((l) => l.tiles.pop()).ok).toBe(false);
  });
  it('rejects a non-canonical base mask', () => {
    expect(mutate((l) => (l.tiles[1].baseMask = 3)).ok).toBe(false);
  });
  it('rejects an invalid rotation and unknown type', () => {
    expect(mutate((l) => (l.tiles[1].rotation = 4)).ok).toBe(false);
    expect(mutate((l) => (l.tiles[1].type = 'laser')).ok).toBe(false);
  });
  it('rejects duplicate tile ids', () => {
    expect(mutate((l) => (l.tiles[2].id = l.tiles[1].id)).ok).toBe(false);
  });
  it('rejects objectives that do not reference receivers', () => {
    expect(mutate((l) => (l.receiverObjectives[0].receiverId = l.tiles[1].id)).ok).toBe(false);
  });
  it('rejects a stored solution that is not solved', () => {
    expect(mutate((l) => (l.solutionMetadata.rotations[1] = 0)).ok).toBe(false);
  });
  it('rejects a mismatched par or an unproven optimal claim', () => {
    expect(mutate((l) => (l.solutionMetadata.parMoves = 3)).ok).toBe(false);
    expect(mutate((l) => (l.solutionMetadata.optimality = 'upperBound')).ok).toBe(false);
  });
  it('rejects a start state that is already solved', () => {
    expect(mutate((l) => (l.tiles = l.tiles.map((t: any, i: number) => ({ ...t, rotation: l.solutionMetadata.rotations[i] })))).ok).toBe(false);
  });

  it('authoring helper rejects mismatched grids', () => {
    expect(() =>
      defineHandcrafted({
        id: 'x',
        chapterId: 'ch1',
        order: 1,
        title: 'x',
        difficulty: 1,
        start: ['S1 I0 R3'],
        solution: ['S1 L1 R3'],
        provenOptimal: false,
      }),
    ).toThrow();
  });
});

describe('validateLevel fuzzing', () => {
  // Randomly corrupt one field of a valid level; the validator must never throw.
  const junk: unknown[] = [null, undefined, -1, 0, 1, 3.5, 99, '', 'x', [], {}, [0], { a: 1 }, true, NaN];
  const paths: string[][] = [
    ['id'], ['chapterId'], ['order'], ['width'], ['height'], ['tiles'], ['sourceIds'],
    ['receiverObjectives'], ['constraints'], ['constraints', 'noOpenEnds'], ['difficulty'],
    ['optimalMoves'], ['seed'], ['generatorVersion'], ['solutionMetadata'],
    ['solutionMetadata', 'rotations'], ['solutionMetadata', 'parMoves'],
    ['tiles', '0'], ['tiles', '1', 'type'], ['tiles', '1', 'baseMask'], ['tiles', '1', 'rotation'],
    ['tiles', '1', 'locked'], ['tiles', '1', 'meta'], ['receiverObjectives', '0', 'accepts'],
  ];

  it('handles 2,000 random single-field corruptions without hitting its crash fallback', () => {
    const r = createRng(2026);
    for (let i = 0; i < 2000; i++) {
      const l = clone(sample) as unknown as Record<string, unknown>;
      const path = r.pick(paths);
      let target = l as Record<string, unknown>;
      for (const key of path.slice(0, -1)) target = target[key] as Record<string, unknown>;
      target[path[path.length - 1]!] = r.pick(junk);
      const result = validateLevel(l);
      if (!result.ok) expect(result.errors.join(' ')).not.toContain('validator crashed');
    }
  });
});
