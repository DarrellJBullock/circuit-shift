import { defineHandcrafted } from '../author';
import type { Level } from '../schema';
import generated from './ch1.generated.json';

/** Hand-built opening levels; they double as the tutorial (Phase 5). */
const handcrafted: readonly Level[] = [
  defineHandcrafted({
    id: 'ch1-01',
    chapterId: 'ch1',
    order: 1,
    title: 'Wake Up',
    difficulty: 1,
    // One straight wire stands between the source and the receiver.
    start: [
      '.  .  .', //
      'S1 I0 R3',
      '.  .  .',
    ],
    solution: [
      '.  .  .', //
      'S1 I1 R3',
      '.  .  .',
    ],
    provenOptimal: true,
  }),
  defineHandcrafted({
    id: 'ch1-02',
    chapterId: 'ch1',
    order: 2,
    title: 'Corner',
    difficulty: 1,
    // Introduces the elbow: route east, then turn south.
    start: [
      'S1 L0 #', //
      '#  I1 .',
      '.  R0 .',
    ],
    solution: [
      'S1 L2 #', //
      '#  I0 .',
      '.  R0 .',
    ],
    provenOptimal: true,
  }),
  defineHandcrafted({
    id: 'ch1-03',
    chapterId: 'ch1',
    order: 3,
    title: 'First Spark',
    difficulty: 2,
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

/**
 * Generated levels are plain JSON; the registry validates every level before
 * it can reach the renderer, so the cast only names the expected shape.
 */
export const chapter1Levels: readonly Level[] = [...handcrafted, ...(generated as unknown as Level[])];
