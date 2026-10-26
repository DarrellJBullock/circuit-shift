/// <reference types="node" />
/**
 * Balancing report: per-level metrics and a difficulty score, flagging dips
 * in each chapter's curve. Usage: npm run level-report
 */
import { difficultyScore, levelMetrics } from '../src/levels/balance';
import { CHAPTERS, LEVELS, levelsInChapter } from '../src/levels/registry';

const pad = (v: unknown, n: number) => String(v).padStart(n);
console.log('id      size  moves  rot4  rot2  recv  nets  colors  score  flag');
for (const ch of CHAPTERS) {
  let prev = -Infinity;
  for (const level of levelsInChapter(ch.id)) {
    const m = levelMetrics(level);
    const score = difficultyScore(m);
    const dip = score < prev * 0.85 ? '↓ dip' : '';
    console.log(
      `${level.id}  ${pad(`${level.width}x${level.height}`, 4)}  ${pad(m.moves, 5)}  ${pad(m.fourWay, 4)}  ${pad(m.twoWay, 4)}  ${pad(m.receivers, 4)}  ${pad(m.networks, 4)}  ${pad(m.colors, 6)}  ${pad(score.toFixed(1), 5)}  ${dip}`,
    );
    prev = Math.max(prev, score);
  }
  console.log('');
}
console.log(`${LEVELS.length} levels`);
