/// <reference types="node" />
/**
 * Regenerates planned levels into src/levels/data/<chapter>.generated.json.
 * Deterministic: the same plan always produces byte-identical output.
 * Usage: npm run generate-levels
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generatePlannedLevel } from '../src/levels/fromGenerated';
import { CHAPTER1_PLAN, CHAPTER2_PLAN, CHAPTER3_PLAN, type LevelPlan } from '../src/levels/plans';
import type { Level } from '../src/levels/schema';

const OUT_DIR = join(__dirname, '..', 'src', 'levels', 'data');

function build(plans: readonly LevelPlan[]): Level[] {
  return plans.map((p) => {
    const t0 = Date.now();
    const r = generatePlannedLevel(p);
    if (!r.ok) {
      console.error(`✖ ${p.id} ${p.title}: ${r.reason}`);
      process.exit(1);
    }
    const l = r.level;
    console.log(
      `✔ ${p.id} ${p.title.padEnd(14)} ${l.width}x${l.height} moves=${l.optimalMoves ?? l.solutionMetadata.parMoves} difficulty=${l.difficulty} seeds=${r.attempts} ${Date.now() - t0}ms`,
    );
    return l;
  });
}

const chapters: [string, readonly LevelPlan[]][] = [
  ['ch1', CHAPTER1_PLAN],
  ['ch2', CHAPTER2_PLAN],
  ['ch3', CHAPTER3_PLAN],
];
for (const [id, plans] of chapters) {
  const levels = build(plans);
  const file = join(OUT_DIR, `${id}.generated.json`);
  writeFileSync(file, `${JSON.stringify(levels, null, 1)}\n`);
  console.log(`→ ${file} (${levels.length} levels)`);
}
