import { create } from 'zustand';

import { type Stars, bestStars } from '@/engine';

export interface LevelResult {
  readonly levelId: string;
  readonly completed: boolean;
  readonly bestStars: Stars;
  readonly bestMoves: number | null;
  readonly bestTimeMs: number | null;
}

export interface CompletionRecord {
  readonly levelId: string;
  readonly stars: Stars;
  readonly moves: number;
  readonly timeMs: number;
}

interface ProgressStore {
  readonly results: Readonly<Record<string, LevelResult>>;
  recordCompletion(record: CompletionRecord): LevelResult;
}

export function mergeResult(prev: LevelResult | undefined, r: CompletionRecord): LevelResult {
  return {
    levelId: r.levelId,
    completed: true,
    bestStars: bestStars(prev?.bestStars ?? 0, r.stars),
    bestMoves: prev?.bestMoves == null ? r.moves : Math.min(prev.bestMoves, r.moves),
    bestTimeMs: prev?.bestTimeMs == null ? r.timeMs : Math.min(prev.bestTimeMs, r.timeMs),
  };
}

/**
 * Level progress. In-memory for Phase 1; Phase 3 backs it with SQLite
 * (hydrate on launch, write-through on completion).
 */
export const useProgress = create<ProgressStore>((set, get) => ({
  results: {},
  recordCompletion: (record) => {
    const merged = mergeResult(get().results[record.levelId], record);
    set((s) => ({ results: { ...s.results, [record.levelId]: merged } }));
    return merged;
  },
}));
