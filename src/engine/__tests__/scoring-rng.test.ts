import { createRng, hashSeed } from '../rng';
import { bestStars, computeStars, efficiency } from '../scoring';

describe('scoring', () => {
  const base = { completed: true, referenceMoves: 9, hintsUsed: 0 };

  it('awards stars at the 0.90 / 0.65 efficiency thresholds', () => {
    expect(computeStars({ ...base, moves: 9 })).toBe(3);
    expect(computeStars({ ...base, moves: 10 })).toBe(3); // 0.90
    expect(computeStars({ ...base, moves: 11 })).toBe(2); // 0.818
    expect(computeStars({ ...base, moves: 13 })).toBe(2); // 0.692
    expect(computeStars({ ...base, moves: 14 })).toBe(1); // 0.643
    expect(computeStars({ ...base, moves: 100 })).toBe(1);
  });

  it('awards nothing for an incomplete level', () => {
    expect(computeStars({ ...base, completed: false, moves: 9 })).toBe(0);
  });

  it('caps hinted results at 2 stars', () => {
    expect(computeStars({ ...base, moves: 9, hintsUsed: 1 })).toBe(2);
    expect(computeStars({ ...base, moves: 50, hintsUsed: 3 })).toBe(1);
  });

  it('clamps efficiency to [0, 1]', () => {
    expect(efficiency(5, 9)).toBe(1);
    expect(efficiency(0, 9)).toBe(1);
    expect(efficiency(18, 9)).toBe(0.5);
  });

  it('keeps the best star result', () => {
    expect(bestStars(2, 3)).toBe(3);
    expect(bestStars(3, 1)).toBe(3);
  });
});

describe('seeded rng', () => {
  it('is reproducible for a seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('differs between seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  // Locks the algorithm: changing these values changes every generated level
  // and historical daily challenge. Bump the generator version instead.
  it('matches pinned reference values', () => {
    const r = createRng(12345);
    expect([r.int(1000), r.int(1000), r.int(1000)]).toEqual([979, 306, 484]);
    expect(hashSeed('daily:2026-10-26:gen-1')).toBe(1584711237);
  });

  it('shuffles deterministically without losing items', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const s = createRng(7).shuffle(items);
    expect([...s].sort()).toEqual(items);
    expect(createRng(7).shuffle(items)).toEqual(s);
    expect(() => createRng(1).pick([])).toThrow();
  });
});
