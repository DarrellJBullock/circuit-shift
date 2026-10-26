/// <reference types="node" />
/**
 * Batch-validate every shipped level:
 *   1. schema + semantic validation (stored solution solved, start unsolved)
 *   2. solver run from the start state
 *   3. optimality claims re-proven; par must not exceed the proven optimum
 *   4. unique ids and contiguous ordering per chapter
 *
 * Exits non-zero on any error. Usage: npm run validate-levels
 */
import { solve, type SolverLimits } from '../src/engine';
import { RAW_LEVELS, CHAPTERS } from '../src/levels/registry';
import { levelToPuzzle, validateLevel } from '../src/levels/validate';

const LIMITS: SolverLimits = { maxStates: 2_000_000, maxMs: 20_000 };

let errorCount = 0;
let warnCount = 0;
const error = (msg: string) => {
  errorCount++;
  console.error(`  ✖ ${msg}`);
};
const warn = (msg: string) => {
  warnCount++;
  console.warn(`  ⚠ ${msg}`);
};

const ids = new Set<string>();
for (const raw of RAW_LEVELS) {
  console.log(`${raw.id}`);
  if (ids.has(raw.id)) error(`duplicate level id`);
  ids.add(raw.id);

  const result = validateLevel(raw);
  if (!result.ok) {
    result.errors.forEach(error);
    continue;
  }
  const level = result.value;
  const r = solve(levelToPuzzle(level), undefined, LIMITS);
  const par = level.solutionMetadata.parMoves;
  const claim = level.solutionMetadata.optimality;

  switch (r.status) {
    case 'optimal':
      console.log(`  ✔ optimal ${r.moves} moves (par ${par}, ${claim}) · ${r.explored} states · ${r.elapsedMs}ms`);
      if (r.moves !== par) {
        if (claim === 'proven') error(`claims proven optimum ${par} but solver proved ${r.moves}`);
        else warn(`par ${par} could be tightened to proven optimum ${r.moves}`);
      }
      if (claim !== 'proven') warn('optimality is provable; mark the level provenOptimal');
      break;
    case 'unsolvable':
      error(`solver proved the level unsolvable from its start state`);
      break;
    case 'unknown':
      if (claim === 'proven') error(`claims proven optimum but solver hit ${r.reason} after ${r.explored} states`);
      else console.log(`  · solver ${r.reason} (${r.explored} states); par ${par} remains an upper bound`);
      break;
  }
}

for (const ch of CHAPTERS) {
  const orders = RAW_LEVELS.filter((l) => l.chapterId === ch.id).map((l) => l.order).sort((a, b) => a - b);
  orders.forEach((o, i) => {
    if (o !== i + 1) error(`${ch.id}: level order should be contiguous from 1, found ${orders.join(',')}`);
  });
}

console.log(`\n${RAW_LEVELS.length} levels · ${errorCount} errors · ${warnCount} warnings`);
process.exit(errorCount > 0 ? 1 : 0);
