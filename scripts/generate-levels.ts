/// <reference types="node" />
/**
 * Regenerates planned levels into src/levels/data/<chapter>.generated.json.
 * Deterministic: the same plan always produces byte-identical output.
 * Usage: npm run generate-levels
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generatePuzzle } from '../src/engine';
import { levelFromGenerated } from '../src/levels/fromGenerated';
import { CHAPTER1_PLAN, type LevelPlan } from '../src/levels/plans';
import type { Level } from '../src/levels/schema';

const OUT_DIR = join(__dirname, '..', 'src', 'levels', 'data');

function build(plans: readonly LevelPlan[]): Level[] {
  return plans.map((p) => {
    const t0 = Date.now();
    const r = generatePuzzle(p.spec);
    if (!r.ok) {
      console.error(`✖ ${p.id} ${p.title}: ${r.reason}`, r.rejections);
      process.exit(1);
    }
    const g = r.puzzle;
    console.log(
      `✔ ${p.id} ${p.title.padEnd(14)} ${g.width}x${g.height} receivers=${g.receivers} moves=${g.moves} (${g.optimality}) attempt=${g.attempt} ${Date.now() - t0}ms`,
    );
    return levelFromGenerated(p, g);
  });
}

const chapters: [string, readonly LevelPlan[]][] = [['ch1', CHAPTER1_PLAN]];
for (const [id, plans] of chapters) {
  const levels = build(plans);
  const file = join(OUT_DIR, `${id}.generated.json`);
  writeFileSync(file, `${JSON.stringify(levels, null, 1)}\n`);
  console.log(`→ ${file} (${levels.length} levels)`);
}
