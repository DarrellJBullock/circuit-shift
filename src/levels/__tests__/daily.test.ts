import { generatePuzzle } from '@/engine';

import {
  DAILY_GENERATOR_SCHEDULE,
  addDays,
  dailyLevel,
  dailyLevelId,
  dailyPlan,
  generatorVersionFor,
  isValidDateKey,
  utcDateKey,
} from '../daily';
import { levelFingerprint } from '../fingerprint';
import { isLevelUnlocked } from '../progression';
import { getLevel } from '../registry';

describe('daily challenge', () => {
  // Historical stability: these were published; they must never change.
  // If this fails, add a new generator version to DAILY_GENERATOR_SCHEDULE
  // instead of altering the existing one.
  it.each([
    ['2026-10-26', '745e82e8', 19],
    ['2026-11-01', 'e5e55d3f', 42],
    ['2027-01-01', '47cb955e', 26],
  ])('%s is stable (fingerprint %s, %i optimal moves)', (date, fp, moves) => {
    const level = dailyLevel(date)!;
    expect(levelFingerprint(level)).toBe(fp);
    expect(level.optimalMoves).toBe(moves);
  });

  it('is deterministic and differs between dates', () => {
    const plan = dailyPlan('2026-10-27')!;
    expect(generatePuzzle(plan.spec)).toEqual(generatePuzzle(plan.spec));
    expect(levelFingerprint(dailyLevel('2026-10-27')!)).not.toBe(levelFingerprint(dailyLevel('2026-10-28')!));
  });

  it('produces a valid, proven puzzle for every day of a year', () => {
    let date = '2027-01-01';
    for (let i = 0; i < 365; i++) {
      const level = dailyLevel(date);
      expect(level).not.toBeNull();
      expect(level!.optimalMoves).not.toBeNull();
      date = addDays(date, 1);
    }
  });

  it('follows the append-only generator schedule', () => {
    expect(DAILY_GENERATOR_SCHEDULE[0]).toEqual({ from: '2026-01-01', version: 'gen-1' });
    expect(generatorVersionFor('2025-12-31')).toBeNull();
    expect(dailyLevel('2025-12-31')).toBeNull();
    expect(generatorVersionFor('2030-06-01')).toBe('gen-1');
  });

  it('uses the UTC calendar date and validates date keys', () => {
    // 23:30 at UTC-10 is already the next day in UTC.
    expect(utcDateKey(new Date('2026-10-26T23:30:00-10:00'))).toBe('2026-10-27');
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('26-10-2026')).toBe(false);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('resolves through the registry and is always unlocked', () => {
    const level = getLevel(dailyLevelId('2026-10-26'))!;
    expect(level.chapterId).toBe('daily');
    expect(level.title).toBe('Daily · Mon 26 Oct');
    expect(isLevelUnlocked({ results: {}, tutorial: 'pending' }, level)).toBe(true);
    expect(getLevel('daily-nonsense')).toBeUndefined();
  });
});
