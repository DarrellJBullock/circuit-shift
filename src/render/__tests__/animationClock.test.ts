import { type ClockState, clockStep } from '../useAnimationClock';

const run = (s: ClockState, frames: number[]) => frames.reduce(clockStep, s);

describe('pausable animation clock', () => {
  it('advances with frames and continues smoothly after a pause (never freezes)', () => {
    let s: ClockState = { clock: 0, offset: 0, reanchor: true };
    s = run(s, [1000, 1016, 1032]);
    expect(s.clock).toBe(32);
    // Paused for 10 s (no frames), then resumed: re-anchor.
    s = run({ ...s, reanchor: true }, [11_032, 11_048, 11_064]);
    expect(s.clock).toBe(64); // continues from 32, no jump, no freeze
    expect(s.offset).toBeLessThan(0); // a negative offset is valid
    s = run(s, [11_080]);
    expect(s.clock).toBe(80);
  });

  it('survives many pause/resume cycles', () => {
    let s: ClockState = { clock: 0, offset: 0, reanchor: true };
    let t = 500;
    for (let cycle = 0; cycle < 5; cycle++) {
      s = { ...s, reanchor: true };
      for (let f = 0; f < 3; f++) s = clockStep(s, (t += 16));
      t += 5_000; // paused
    }
    // Each resume adds 0 on its first frame, then 16 ms per frame: 5 × 32 ms.
    expect(s.clock).toBe(160);
  });
});
