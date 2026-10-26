import { defineHandcrafted } from '../author';
import type { Level } from '../schema';

export const chapter1Levels: readonly Level[] = [
  defineHandcrafted({
    id: 'ch1-01',
    chapterId: 'ch1',
    order: 1,
    title: 'First Spark',
    difficulty: 1,
    // Source top-left feeds a T-junction that splits to two receivers.
    start: [
      'S1 I0 T3 L0', //
      '#  .  I1 R0',
      'R1 I0 L1 #',
    ],
    solution: [
      'S1 I1 T1 L2', //
      '#  .  I0 R0',
      'R1 I1 L3 #',
    ],
    provenOptimal: true,
  }),
];
