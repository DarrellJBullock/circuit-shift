import type { LevelResult } from '@/state/progressStore';

import {
  CHAPTER_UNLOCK_THRESHOLD,
  type ProgressionInput,
  isChapterUnlocked,
  isLevelUnlocked,
  nextPlayableLevel,
} from '../progression';
import { getLevel, levelsInChapter } from '../registry';

const done = (...ids: string[]): Record<string, LevelResult> =>
  Object.fromEntries(
    ids.map((id) => [id, { levelId: id, completed: true, bestStars: 3, bestMoves: 1, bestTimeMs: 1 }] as const),
  );
const ids = (chapter: 'ch1' | 'ch2' | 'ch3', n: number) => levelsInChapter(chapter).slice(0, n).map((l) => l.id);
const fresh: ProgressionInput = { results: {}, tutorial: 'pending' };
const lvl = (id: string) => getLevel(id)!;

describe('level unlocking', () => {
  it('opens only the first level for a new player', () => {
    expect(isLevelUnlocked(fresh, lvl('ch1-01'))).toBe(true);
    expect(isLevelUnlocked(fresh, lvl('ch1-02'))).toBe(false);
    expect(nextPlayableLevel(fresh)?.id).toBe('ch1-01');
  });

  it('opens the next level after completing the previous one', () => {
    const p = { ...fresh, results: done('ch1-01') };
    expect(isLevelUnlocked(p, lvl('ch1-02'))).toBe(true);
    expect(isLevelUnlocked(p, lvl('ch1-03'))).toBe(false);
    expect(nextPlayableLevel(p)?.id).toBe('ch1-02');
  });

  it('skipping the tutorial opens the tutorial levels and the first real level', () => {
    const p: ProgressionInput = { results: {}, tutorial: 'skipped' };
    expect(isLevelUnlocked(p, lvl('ch1-04'))).toBe(true);
    expect(isLevelUnlocked(p, lvl('ch1-05'))).toBe(false);
    expect(nextPlayableLevel(p)?.id).toBe('ch1-01');
  });
});

describe('chapter unlocking', () => {
  it(`opens chapter 2 after ${CHAPTER_UNLOCK_THRESHOLD} chapter-1 levels`, () => {
    const almost = { ...fresh, results: done(...ids('ch1', CHAPTER_UNLOCK_THRESHOLD - 1)) };
    expect(isChapterUnlocked(almost, 'ch2')).toBe(false);
    expect(isLevelUnlocked(almost, lvl('ch2-01'))).toBe(false);
    const enough = { ...fresh, results: done(...ids('ch1', CHAPTER_UNLOCK_THRESHOLD)) };
    expect(isChapterUnlocked(enough, 'ch2')).toBe(true);
    expect(isLevelUnlocked(enough, lvl('ch2-01'))).toBe(true);
    expect(isLevelUnlocked(enough, lvl('ch2-02'))).toBe(false);
  });

  it('requires the chain: chapter 3 needs chapter 2 open as well', () => {
    const onlyCh2 = { ...fresh, results: done(...ids('ch2', 20)) };
    expect(isChapterUnlocked(onlyCh2, 'ch3')).toBe(false);
    const both = { ...fresh, results: done(...ids('ch1', 15), ...ids('ch2', 15)) };
    expect(isChapterUnlocked(both, 'ch3')).toBe(true);
  });
});
