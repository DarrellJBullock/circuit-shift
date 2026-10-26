import type { LevelResult } from '@/state/progressStore';
import type { TutorialState } from '@/state/settingsStore';

import { CHAPTERS, LEVELS, getChapter, levelsInChapter } from './registry';
import type { Chapter, ChapterId, Level } from './schema';

/** Completed levels needed in chapter k to open chapter k+1 (balancing knob). */
export const CHAPTER_UNLOCK_THRESHOLD = 15;
/** Chapter 1 levels that form the tutorial. */
export const TUTORIAL_LEVEL_COUNT = 3;

export type { TutorialState };

export interface ProgressionInput {
  readonly results: Readonly<Record<string, LevelResult>>;
  readonly tutorial: TutorialState;
  /** Store-verified `premium_content` entitlement (never a local flag). */
  readonly premium?: boolean;
}

/** Premium chapters additionally require the verified entitlement. */
export function premiumGate(chapter: Pick<Chapter, 'premium'>, input: ProgressionInput): boolean {
  return !chapter.premium || input.premium === true;
}

const completed = (input: ProgressionInput, id: string) => input.results[id]?.completed === true;

export function completedInChapter(input: ProgressionInput, chapterId: ChapterId): number {
  return levelsInChapter(chapterId).filter((l) => completed(input, l.id)).length;
}

export function isChapterUnlocked(input: ProgressionInput, chapterId: ChapterId): boolean {
  const chapter = getChapter(chapterId);
  if (!chapter) return false;
  if (!premiumGate(chapter, input)) return false;
  if (chapter.order === 1) return true;
  const previous = CHAPTERS.find((c) => c.order === chapter.order - 1);
  if (!previous) return false;
  const needed = Math.min(CHAPTER_UNLOCK_THRESHOLD, levelsInChapter(previous.id).length);
  return isChapterUnlocked(input, previous.id) && completedInChapter(input, previous.id) >= needed;
}

/**
 * A level is playable when its chapter is open and either it is the first
 * level, the previous level is complete, or (after skipping the tutorial)
 * it is within the tutorial or the first level after it.
 */
export function isLevelUnlocked(input: ProgressionInput, level: Level): boolean {
  if (level.chapterId === 'daily') return true;
  if (!isChapterUnlocked(input, level.chapterId)) return false;
  if (level.order === 1) return true;
  if (level.chapterId === 'ch1' && input.tutorial === 'skipped' && level.order <= TUTORIAL_LEVEL_COUNT + 1) return true;
  const previous = levelsInChapter(level.chapterId).find((l) => l.order === level.order - 1);
  return previous ? completed(input, previous.id) : false;
}

/** The first unlocked, uncompleted level in campaign order (for "Play"). */
export function nextPlayableLevel(input: ProgressionInput): Level | undefined {
  return LEVELS.find((l) => !completed(input, l.id) && isLevelUnlocked(input, l));
}
