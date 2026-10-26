import { evaluate, evaluatePuzzle } from '../rules';
import { LOOSE, STRICT, board, puzzle } from './helpers';

describe('completion', () => {
  it('is solved when every receiver gets an accepted colour', () => {
    expect(evaluatePuzzle(puzzle(['S1 I1 R3'])).solved).toBe(true);
  });

  it('is not solved when a receiver is unpowered', () => {
    const e = evaluatePuzzle(puzzle(['S1 I0 R3']));
    expect(e.solved).toBe(false);
    expect(e.violations).toContain('objective');
  });

  it('requires all receivers, not just one', () => {
    // Left receiver connected, right one faces away.
    const e = evaluatePuzzle(puzzle(['R1 T1 R0', '.  S0 .'], LOOSE));
    expect(e.objectives.map((o) => o.satisfied)).toEqual([true, false]);
    expect(e.solved).toBe(false);
  });

  it('rejects a receiver that gets the wrong colour', () => {
    const p = puzzle(['S1 I1 R3v']);
    const e = evaluatePuzzle({ ...p, board: board(['S1 I1 R3v']) });
    expect(e.objectives[0]!.receivedColor).toBe('cyan');
    expect(e.solved).toBe(false);
  });

  it('accepts any colour listed by the objective', () => {
    const b = board(['S1v I1 R3']);
    const e = evaluate(b, [{ receiverId: 'receiver-2-0', accepts: ['cyan', 'violet'] }], STRICT);
    expect(e.solved).toBe(true);
  });

  it('fails on a shorted network anywhere on the board', () => {
    const b = board(['S1 R3 .', 'S1 T1 S3v', '.  R0 .']);
    const e = evaluate(b, [{ receiverId: 'receiver-1-0', accepts: ['cyan'] }], LOOSE);
    expect(e.objectives[0]!.satisfied).toBe(true);
    expect(e.violations).toContain('short');
    expect(e.solved).toBe(false);
  });

  it('enforces noOpenEnds only when the constraint is on', () => {
    // Tee leaks south.
    const rows = ['R1 T1 R3'];
    const withSource = ['R1 T1 R3', '.  S0 .'];
    expect(evaluatePuzzle(puzzle(withSource)).solved).toBe(true);
    const leaky = board(['S1 T1 R3']);
    const objectives = [{ receiverId: 'receiver-2-0', accepts: ['cyan' as const] }];
    expect(evaluate(leaky, objectives, LOOSE).solved).toBe(true);
    const strict = evaluate(leaky, objectives, { noOpenEnds: true, allTilesPowered: false });
    expect(strict.violations).toEqual(['openEnds']);
    expect(rows).toHaveLength(1);
  });

  it('enforces allTilesPowered only when the constraint is on', () => {
    const b = board(['S1 R3', 'I0 I0']);
    const objectives = [{ receiverId: 'receiver-1-0', accepts: ['cyan' as const] }];
    expect(evaluate(b, objectives, { noOpenEnds: true, allTilesPowered: false }).solved).toBe(true);
    expect(evaluate(b, objectives, { noOpenEnds: false, allTilesPowered: true }).violations).toEqual([
      'unpowered',
    ]);
  });

  it('treats a missing receiver id or empty objectives as unsolved', () => {
    const b = board(['S1 I1 R3']);
    expect(evaluate(b, [{ receiverId: 'nope', accepts: ['cyan'] }], LOOSE).solved).toBe(false);
    expect(evaluate(b, [], LOOSE).solved).toBe(false);
  });
});
