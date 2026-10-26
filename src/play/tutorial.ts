import { type GameState, isRotatable, tapDistance } from '@/engine';
import type { Level } from '@/levels/schema';

export interface TutorialStep {
  readonly title: string;
  readonly body: string;
  /** Ring the tiles that still need rotating (first levels only). */
  readonly guide: boolean;
}

/** Coach marks for the opening levels, shown while the tutorial is pending. */
export const TUTORIAL_STEPS: Readonly<Record<string, TutorialStep>> = {
  'ch1-01': {
    title: 'Route the power',
    body: 'Tap a tile to rotate it. Connect the amber source to the receiver to light it up.',
    guide: true,
  },
  'ch1-02': {
    title: 'Turn the corner',
    body: 'Corner tiles bend the current. Rotate each piece until power reaches the receiver.',
    guide: true,
  },
  'ch1-03': {
    title: 'Split the signal',
    body: 'Junctions send power down several paths. Light every receiver, and leave no wire dangling.',
    guide: false,
  },
};

/** The step to show for this level, or null outside the tutorial. */
export function tutorialStepFor(levelId: string, tutorial: 'pending' | 'done' | 'skipped'): TutorialStep | null {
  return tutorial === 'pending' ? (TUTORIAL_STEPS[levelId] ?? null) : null;
}

/** Tiles still away from the stored solution (the guide rings). */
export function tilesToGuide(level: Level, game: GameState): number[] {
  const solution = level.solutionMetadata.rotations;
  const out: number[] = [];
  game.board.tiles.forEach((t, i) => {
    if (isRotatable(t) && tapDistance(t.baseMask, t.rotation, solution[i]!) > 0) out.push(i);
  });
  return out;
}

/** Finishing the last tutorial level completes the tutorial. */
export const TUTORIAL_FINAL_LEVEL = 'ch1-03';
