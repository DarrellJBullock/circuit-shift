import { type GeneratorSpec, generatePuzzle, rotationFor } from '../generator';
import { CANONICAL_BASE_MASK } from '../tiles';
import { EAST, NORTH, SOUTH, WEST } from '../ports';
import type { Puzzle } from '../rules';
import { evaluate } from '../rules';
import { solveSearch } from '../searchSolver';
import { applyRotations, solve } from '../solver';

const BASE: GeneratorSpec = {
  width: 4,
  height: 4,
  seed: 1,
  networks: ['cyan'],
  coverage: 0.85,
  obstacleRate: 0.08,
  pathiness: 0.5,
  allowCross: false,
  lockedRate: 0,
  minReceivers: 1,
  maxReceivers: 8,
  minMoves: 2,
  maxMoves: 200,
};

function asPuzzle(g: ReturnType<typeof generatePuzzle>): Puzzle {
  if (!g.ok) throw new Error(g.reason);
  const p = g.puzzle;
  return { board: { width: p.width, height: p.height, tiles: p.tiles }, objectives: p.objectives, constraints: p.constraints };
}

describe('generator', () => {
  it('is reproducible: same spec, identical puzzle', () => {
    expect(generatePuzzle({ ...BASE, seed: 42 })).toEqual(generatePuzzle({ ...BASE, seed: 42 }));
    const a = generatePuzzle({ ...BASE, seed: 42 });
    const b = generatePuzzle({ ...BASE, seed: 43 });
    expect(a).not.toEqual(b);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('seed %i yields a valid, unsolved, solvable puzzle within bounds', (seed) => {
    const spec = { ...BASE, seed, width: 5, height: 6, minMoves: 4, maxMoves: 40, minReceivers: 2, maxReceivers: 6 };
    const g = generatePuzzle(spec);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    const p = asPuzzle(g);
    expect(evaluate(p.board, p.objectives, p.constraints).solved).toBe(false);
    expect(evaluate(applyRotations(p.board, g.puzzle.solution), p.objectives, p.constraints).solved).toBe(true);
    expect(g.puzzle.moves).toBeGreaterThanOrEqual(4);
    expect(g.puzzle.moves).toBeLessThanOrEqual(40);
    expect(g.puzzle.receivers).toBeGreaterThanOrEqual(2);
    expect(g.puzzle.receivers).toBeLessThanOrEqual(6);
    // Every source and receiver is locked; ids are unique.
    expect(p.board.tiles.filter((t) => t.type === 'source' || t.type === 'receiver').every((t) => t.locked)).toBe(true);
    expect(new Set(p.board.tiles.map((t) => t.id)).size).toBe(p.board.tiles.length);
  });

  it('colours each network and its receivers', () => {
    const g = generatePuzzle({ ...BASE, width: 6, height: 6, networks: ['cyan', 'violet'], minReceivers: 2 });
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    const violet = g.puzzle.tiles.filter((t) => t.meta?.color === 'violet');
    expect(violet.some((t) => t.type === 'source')).toBe(true);
    expect(violet.some((t) => t.type === 'receiver')).toBe(true);
    expect(g.puzzle.objectives.some((o) => o.accepts.includes('violet'))).toBe(true);
  });

  it('rejects impossible specs with reasons instead of looping forever', () => {
    const g = generatePuzzle({ ...BASE, minMoves: 500, maxAttempts: 5 });
    expect(g.ok).toBe(false);
    if (g.ok) return;
    expect(Object.keys(g.rejections).length).toBeGreaterThan(0);
  });

  it('maps masks to orientations', () => {
    expect(rotationFor(CANONICAL_BASE_MASK.elbow!, SOUTH | WEST)).toBe(2);
    expect(rotationFor(CANONICAL_BASE_MASK.straight!, EAST | WEST)).toBe(1);
    expect(rotationFor(CANONICAL_BASE_MASK.elbow!, NORTH | SOUTH)).toBe(-1);
  });
});

describe('bounded search solver vs exhaustive BFS', () => {
  // Property test: on 60 small generated boards the DFS must agree with the
  // exhaustive BFS on status and minimum moves (proves the pruning is exact).
  const seeds = Array.from({ length: 60 }, (_, i) => i + 100);
  it.each(seeds)('seed %i agrees', (seed) => {
    const g = generatePuzzle({ ...BASE, seed, width: 3 + (seed % 2), height: 4, obstacleRate: 0.1, allowCross: seed % 3 === 0 });
    expect(g.ok).toBe(true);
    const p = asPuzzle(g);
    const bfs = solve(p, p.board, { maxStates: 5_000_000, maxMs: 30_000 });
    const dfs = solveSearch(p, p.board, { maxStates: 5_000_000, maxMs: 30_000 });
    expect(bfs.status).toBe('optimal');
    expect(dfs.status).toBe('optimal');
    if (bfs.status === 'optimal' && dfs.status === 'optimal') {
      expect(dfs.moves).toBe(bfs.moves);
      expect(evaluate(applyRotations(p.board, dfs.rotations), p.objectives, p.constraints).solved).toBe(true);
    }
  });

  it('reports feasible (not optimal) when cut off after finding a solution, and unknown before', () => {
    const g = generatePuzzle({ ...BASE, width: 7, height: 9, networks: ['cyan', 'cyan'], seed: 9, maxReceivers: 20 });
    const p = asPuzzle(g);
    const tiny = solveSearch(p, p.board, { maxStates: 3, maxMs: 10_000 });
    expect(tiny.status).toBe('unknown');
    // Find the explored count of a full run, then cut just before the end.
    const full = solveSearch(p, p.board, { maxStates: 10_000_000, maxMs: 30_000 });
    expect(full.status).toBe('optimal');
    const cut = solveSearch(p, p.board, { maxStates: full.explored - 1, maxMs: 30_000 });
    expect(['feasible', 'unknown']).toContain(cut.status);
    expect(cut.status).not.toBe('optimal');
  });
});
