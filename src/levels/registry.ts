import { chapter1Levels } from './data/chapter1';
import { chapter2Levels, chapter3Levels } from './data/chapters2and3';
import { dailyDateOf, dailyLevel, isDailyId } from './daily';
import type { Chapter, ChapterId, Level } from './schema';
import { validateLevel } from './validate';

export const CHAPTERS: readonly Chapter[] = [
  { id: 'ch1', order: 1, title: 'Ignition', subtitle: 'Connections, bends and branches', premium: false },
  { id: 'ch2', order: 2, title: 'Grid Lock', subtitle: 'Multiple receivers, branching paths', premium: false },
  { id: 'ch3', order: 3, title: 'Spectrum', subtitle: 'Coloured signals: never mix them', premium: false },
];

/** Unvalidated shipped data; only scripts and tests should read this directly. */
export const RAW_LEVELS: readonly Level[] = [...chapter1Levels, ...chapter2Levels, ...chapter3Levels];

export interface LevelLoadError {
  readonly id: string;
  readonly errors: readonly string[];
}

/**
 * Validate every shipped level once at startup. Invalid levels are dropped and
 * reported instead of reaching the renderer.
 */
function loadLevels(): { levels: readonly Level[]; errors: readonly LevelLoadError[] } {
  const levels: Level[] = [];
  const errors: LevelLoadError[] = [];
  for (const raw of RAW_LEVELS) {
    const result = validateLevel(raw);
    if (result.ok) levels.push(result.value);
    else errors.push({ id: raw.id, errors: result.errors });
  }
  return { levels, errors };
}

const loaded = loadLevels();
export const LEVELS: readonly Level[] = loaded.levels;
export const LEVEL_LOAD_ERRORS: readonly LevelLoadError[] = loaded.errors;

const byId = new Map(LEVELS.map((l) => [l.id, l] as const));

/** Campaign levels by id; `daily-YYYY-MM-DD` ids are generated (and validated) on demand. */
export function getLevel(id: string): Level | undefined {
  if (isDailyId(id)) return dailyLevel(dailyDateOf(id)) ?? undefined;
  return byId.get(id);
}

export function getChapter(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

export function levelsInChapter(chapterId: ChapterId): readonly Level[] {
  return LEVELS.filter((l) => l.chapterId === chapterId).sort((a, b) => a.order - b.order);
}

export function nextLevel(id: string): Level | undefined {
  const cur = byId.get(id);
  if (!cur) return undefined;
  const chapterLevels = levelsInChapter(cur.chapterId);
  const i = chapterLevels.findIndex((l) => l.id === id);
  const sameChapter = chapterLevels[i + 1];
  if (sameChapter) return sameChapter;
  const ch = CHAPTERS.find((c) => c.id === cur.chapterId);
  const nextCh = ch ? CHAPTERS.find((c) => c.order === ch.order + 1) : undefined;
  return nextCh ? levelsInChapter(nextCh.id)[0] : undefined;
}
