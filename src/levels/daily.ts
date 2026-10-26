import { GENERATOR_VERSION, type GeneratorSpec, generatePuzzle, hashSeed } from '@/engine';

import { levelFromGenerated } from './fromGenerated';
import type { LevelPlan } from './plans';
import type { Difficulty, Level } from './schema';
import { validateLevel } from './validate';

export const DAILY_PREFIX = 'daily-';

/**
 * Which generator version produces the puzzle for a date. APPEND ONLY: when a
 * new generator ships, add `{ from: '<first UTC date>', version }`. Existing
 * dates keep the version they were published with, so historical daily
 * challenges never change.
 */
export const DAILY_GENERATOR_SCHEDULE: readonly { readonly from: string; readonly version: string }[] = [
  { from: '2026-01-01', version: 'gen-1' },
];
const IMPLEMENTED_VERSIONS = new Set([GENERATOR_VERSION]);

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** UTC calendar date, YYYY-MM-DD. The daily rolls over at 00:00 UTC. */
export function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function isValidDateKey(date: string): boolean {
  const m = DATE_RE.exec(date);
  if (!m) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && utcDateKey(d) === date;
}

export function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return utcDateKey(d);
}

export const dailyLevelId = (date: string) => `${DAILY_PREFIX}${date}`;
export const isDailyId = (id: string) => id.startsWith(DAILY_PREFIX);
export const dailyDateOf = (id: string) => id.slice(DAILY_PREFIX.length);

export function generatorVersionFor(date: string): string | null {
  let version: string | null = null;
  for (const entry of DAILY_GENERATOR_SCHEDULE) if (date >= entry.from) version = entry.version;
  return version;
}

/** Weekday ramp (UTC): Monday smallest, weekend largest. Cyan only, so no chapter-3 knowledge is needed. */
const WEEKDAY: Readonly<Record<number, { size: [number, number]; receivers: [number, number]; moves: [number, number]; networks: 1 | 2; difficulty: Difficulty }>> = {
  1: { size: [5, 5], receivers: [3, 6], moves: [12, 28], networks: 1, difficulty: 4 },
  2: { size: [5, 6], receivers: [3, 7], moves: [14, 30], networks: 1, difficulty: 5 },
  3: { size: [6, 6], receivers: [4, 8], moves: [16, 34], networks: 1, difficulty: 5 },
  4: { size: [6, 7], receivers: [4, 9], moves: [18, 38], networks: 1, difficulty: 6 },
  5: { size: [6, 7], receivers: [5, 10], moves: [20, 42], networks: 2, difficulty: 6 },
  6: { size: [7, 8], receivers: [6, 12], moves: [24, 50], networks: 2, difficulty: 7 },
  0: { size: [7, 9], receivers: [7, 14], moves: [28, 60], networks: 2, difficulty: 8 },
};

export function dailyPlan(date: string): LevelPlan | null {
  if (!isValidDateKey(date)) return null;
  const version = generatorVersionFor(date);
  if (!version || !IMPLEMENTED_VERSIONS.has(version)) return null;
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const w = WEEKDAY[day]!;
  const spec: GeneratorSpec = {
    width: w.size[0],
    height: w.size[1],
    seed: hashSeed(`daily:${date}:${version}`),
    networks: w.networks === 2 ? ['cyan', 'cyan'] : ['cyan'],
    coverage: 0.9,
    obstacleRate: 0.08,
    pathiness: 0.55,
    allowCross: true,
    lockedRate: 0.05,
    minReceivers: w.receivers[0],
    maxReceivers: w.receivers[1],
    minMoves: w.moves[0],
    maxMoves: w.moves[1],
    maxAttempts: 400,
  };
  // Formatted by hand: Intl output can differ between Hermes and Node.
  const d = new Date(`${date}T00:00:00Z`);
  const label = `${WEEKDAY_NAMES[day]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
  return { id: dailyLevelId(date), chapterId: 'daily', order: 1, title: `Daily · ${label}`, difficulty: w.difficulty, spec };
}

const cache = new Map<string, Level | null>();

/** The validated daily level for a UTC date, or null if it cannot be produced. */
export function dailyLevel(date: string): Level | null {
  const hit = cache.get(date);
  if (hit !== undefined) return hit;
  const plan = dailyPlan(date);
  let level: Level | null = null;
  if (plan) {
    const r = generatePuzzle(plan.spec);
    if (r.ok) {
      const v = validateLevel(levelFromGenerated(plan, r.puzzle));
      level = v.ok ? v.value : null;
    }
  }
  cache.set(date, level);
  return level;
}
